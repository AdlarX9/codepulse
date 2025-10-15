package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment string
	Port        string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBURL      string

	// Redis
	RedisURL      string
	RedisPassword string

	// JWT
	JWTSecret string

	// CORS
	AllowedOrigins []string
}

func Load() (*Config, error) {
	// Load .env file if it exists (for development)
	if env := os.Getenv("ENV"); env != "production" {
		_ = godotenv.Load()
	}

	config := &Config{
		Environment: getEnv("ENV", "development"),
		Port:        getEnv("PORT", "8080"),

		// Database
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "codepulse"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "codepulse_dev"),

		// Redis
		RedisURL:      getEnv("REDIS_URL", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),

		// JWT
		JWTSecret: getEnv("JWT_SECRET", "your-secret-key"),
	}

	// Build database URL
	config.DBURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		config.DBUser, config.DBPassword, config.DBHost, config.DBPort, config.DBName)

	// Set allowed origins based on environment
	if config.Environment == "production" {
		config.AllowedOrigins = []string{
			"https://" + getEnv("DOMAIN", "localhost"),
		}
	} else {
		config.AllowedOrigins = []string{
			"*",
		}
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
