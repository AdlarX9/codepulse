package database

import (
	"context"
	"fmt"
	"log"
	"time"

	"codepulse-api/internal/config"

	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	DB    *gorm.DB
	Redis *redis.Client
}

func NewConnection(cfg *config.Config) (*Database, error) {
	// Configure GORM logger
	var gormLogger logger.Interface
	if cfg.Environment == "development" {
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		gormLogger = logger.Default.LogMode(logger.Error)
	}

	// Connect to PostgreSQL
	db, err := gorm.Open(postgres.Open(cfg.DBURL), &gorm.Config{
		Logger: gormLogger,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Test database connection
	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Connect to Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisURL,
		Password: cfg.RedisPassword,
		DB:       0,
	})

	// Test Redis connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("Warning: Redis connection failed: %v", err)
		// Don't fail completely if Redis is not available
	}

	log.Println("Database connections established successfully")

	return &Database{
		DB:    db,
		Redis: rdb,
	}, nil
}

func (d *Database) Close() error {
	// Close Redis connection
	if err := d.Redis.Close(); err != nil {
		log.Printf("Error closing Redis connection: %v", err)
	}

	// Close PostgreSQL connection
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	
	return sqlDB.Close()
}
