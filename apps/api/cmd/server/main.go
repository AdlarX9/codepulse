package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"codepulse-api/internal/config"
	"codepulse-api/internal/database"
	"codepulse-api/internal/handlers"
	"codepulse-api/internal/middleware"
	"codepulse-api/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to databases
	db, err := database.NewConnection(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// Auto-migrate models (for development)
	if cfg.Environment == "development" {
		if err := db.DB.AutoMigrate(
			&models.User{},
			&models.Profile{},
			&models.Project{},
			&models.Scan{},
			&models.ScanLang{},
			&models.GitHubLink{},
			&models.Download{},
			&models.Session{},
		); err != nil {
			log.Printf("Auto-migration failed: %v", err)
		}
	}

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db)
	authHandler := handlers.NewAuthHandler(db, cfg)
	projectHandler := handlers.NewProjectHandler(db)
	scanHandler := handlers.NewScanHandler(db)
	exportHandler := handlers.NewExportHandler(db)
	githubHandler := handlers.NewGitHubHandler(db)
	ogHandler := handlers.NewOGHandler(db)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(db.DB, cfg)

	// Create Gin router
	router := gin.New()

	// Global middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.AllowedOrigins
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	// Health check endpoint
	router.GET("/health", healthHandler.HealthCheck)

	// Backward compatibility routes (mirror Next.js API structure)
api := router.Group("/api")
{
	// Map old Next.js routes to new handlers
	api.POST("/sync/scan", authMiddleware.RequireAuth(), scanHandler.SyncScan)

	// Export routes
	api.GET("/export", authMiddleware.RequireAuth(), exportHandler.ExportProjectData)

	// GitHub integration routes
	github := api.Group("/github")
	{
		github.POST("/webhook", githubHandler.Webhook)
		github.POST("/link", authMiddleware.RequireAuth(), githubHandler.LinkRepository)
	}

	// Open Graph routes
	og := api.Group("/og")
	{
		og.GET("/project/:id", ogHandler.GenerateProjectOG)
	}

	// Protected user routes
	me := api.Group("/me")
	me.Use(authMiddleware.RequireAuth())
	{
		me.GET("/projects", projectHandler.GetProjects)
		me.GET("/projects/:id", projectHandler.GetProject)
		me.PATCH("/projects/:id", projectHandler.UpdateProject)
		me.GET("/projects/:id/scans", scanHandler.GetScans)
		me.DELETE("/projects/:id", projectHandler.DeleteProject)
		me.GET("/projects/:id/stats", projectHandler.GetProjectStats)
	}

	// Public routes
	auth := api.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)
		auth.GET("/me", authMiddleware.RequireAuth(), authHandler.Me)
	}

	// Public project routes
	public := api.Group("/u")
	{
		public.GET("/:handle/:project_id", projectHandler.GetPublicProject)
	}
}

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 Server starting on port %s (environment: %s)", cfg.Port, cfg.Environment)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server:", err)
		}
	}()

	// Wait for interrupt signal to gracefully shut down the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("🛑 Shutting down server...")

	// The context is used to inform the server it has 5 seconds to finish
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("✅ Server exited")
}
