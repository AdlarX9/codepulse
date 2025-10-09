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
	downloadHandler := handlers.NewDownloadHandler(db)
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

	// API v1 routes
	v1 := router.Group("/v1")
	{
		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
		}

		// Public project routes
		public := v1.Group("/u")
		{
			public.GET("/:handle/:project_id", projectHandler.GetPublicProject)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(authMiddleware.RequireAuth())
		{
			// Auth routes (protected)
			protected.GET("/auth/me", authHandler.Me)

			// Project routes
			projects := protected.Group("/me/projects")
			{
				projects.GET("", projectHandler.GetProjects)
				projects.GET("/:id", projectHandler.GetProject)
				projects.PATCH("/:id", projectHandler.UpdateProject)
				projects.DELETE("/:id", projectHandler.DeleteProject)
				projects.GET("/:id/stats", projectHandler.GetProjectStats)
				projects.GET("/:id/scans", scanHandler.GetScans)
			}

			// Sync routes
			sync := protected.Group("/sync")
			{
				sync.POST("/scan", scanHandler.SyncScan)
			}
		}
	}

	// Backward compatibility routes (mirror Next.js API structure)
	api := router.Group("/api")
	{
		// Map old Next.js routes to new handlers
		api.POST("/sync/scan", authMiddleware.RequireAuth(), scanHandler.SyncScan)

		// Download routes
		api.GET("/download", downloadHandler.DownloadAsset)

		// Export routes
		api.GET("/export", authMiddleware.RequireAuth(), exportHandler.ExportProjectData)

		// Admin routes
		admin := api.Group("/admin")
		// admin.Use(authMiddleware.RequireBasicAuth()) // TODO: Implement basic auth middleware
		admin.GET("/stats", downloadHandler.GetDownloadStats)

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

		me := api.Group("/me")
		me.Use(authMiddleware.RequireAuth())
		{
			me.GET("/projects", projectHandler.GetProjects)

			meProjects := me.Group("/projects")
			{
				meProjects.GET("/:id", projectHandler.GetProject)
				meProjects.PATCH("/:id", projectHandler.UpdateProject)
				meProjects.GET("/:id/scans", scanHandler.GetScans)
			}
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
