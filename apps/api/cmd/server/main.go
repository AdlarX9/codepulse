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
			&models.CommitScan{},
			&models.CommitScanLang{},
			&models.Collaborator{},
			&models.Challenge{},
			&models.GitHubLink{},
			&models.Download{},
			&models.Session{},
			&models.DeviceLoginSession{},
			&models.Invite{},
		); err != nil {
			log.Printf("Auto-migration failed: %v", err)
		}
	}

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler(db, cfg.AppVersion)
	authHandler := handlers.NewAuthHandler(db, cfg)
	projectHandler := handlers.NewProjectHandler(db)
	scanHandler := handlers.NewScanHandler(db)
	exportHandler := handlers.NewExportHandler(db)
	ogHandler := handlers.NewOGHandler(db)
	githubHandler := handlers.NewGitHubHandler(db, cfg.GitHubAppID, cfg.GitHubPrivateKey, cfg.GitHubWebhookSecret)
	statsHandler := handlers.NewStatsHandler(db)
	gitHandler := handlers.NewGitHandler(db)
	gamificationHandler := handlers.NewGamificationHandler(db)
	inviteHandler := handlers.NewInviteHandler(db)
	userHandler := handlers.NewUserHandler(db)

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

			// CRUD Projects
			me.POST("/projects", projectHandler.CreateProject)
			me.GET("/projects/:id", projectHandler.GetProject)
			me.PATCH("/projects/:id", projectHandler.UpdateProject)
			me.POST("/projects/:id/transfer", projectHandler.TransferOwnership)
			me.DELETE("/projects/:id", projectHandler.DeleteProject)

			// Project Details
			me.GET("/projects/:id/details", projectHandler.GetProjectDetails)

			// Project Scans (snapshot)
			me.POST("/projects/:id/snapshot", scanHandler.CreateSnapshot)

			// Git Integration
			me.PATCH("/projects/:id/git", gitHandler.LinkGitRepo)
			me.DELETE("/projects/:id/git", gitHandler.UnlinkGitRepo)
			me.GET("/projects/:id/commits", gitHandler.GetCommitScans)
			me.POST("/projects/:id/commits/sync", gitHandler.SyncCommit)
			me.GET("/projects/:id/collaborators", gitHandler.GetCollaborators)
			me.POST("/projects/:id/collaborators", gitHandler.AddCollaborator)
			me.PATCH("/projects/:id/collaborators/:collab_id", gitHandler.UpdateCollaborator)
			me.DELETE("/projects/:id/collaborators/:collab_id", gitHandler.RemoveCollaborator)

			// Invites
			me.GET("/projects/:id/invites", inviteHandler.ListInvites)
			me.POST("/projects/:id/invites", inviteHandler.CreateInvite)
			me.DELETE("/projects/:id/invites/:invite_id", inviteHandler.RevokeInvite)

			// Read/Update Profile
			me.GET("/profile", authHandler.GetProfile)
			me.GET("/profile/check-handle", authHandler.CheckHandleAvailability)
			me.PATCH("/profile", authHandler.UpdateProfile)

			// Account Management
			me.DELETE("/account", authHandler.DeleteAccount)

			// Gamification routes
			me.GET("/streaks", gamificationHandler.GetUserStreaks)
			me.GET("/badges", gamificationHandler.GetUserBadges)
			me.GET("/challenges", gamificationHandler.GetChallenges)
			me.POST("/challenges", gamificationHandler.CreateChallenge)
			me.PATCH("/challenges/:id/progress", gamificationHandler.UpdateChallengeProgress)
			me.POST("/challenges/:id/complete", gamificationHandler.CompleteChallenge)

			// User summary
			me.GET("/summary", userHandler.GetUserSummary)
		}

		// Public routes
		auth := api.Group("/auth")
		{
			// Auth
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

		// Invite public routes
		inv := api.Group("/invites")
		{
			inv.GET("/:token", inviteHandler.GetInvitePublic)
			inv.POST("/:token/accept", authMiddleware.RequireAuth(), inviteHandler.AcceptInvite)
		}

		// GitHub routes
		github := api.Group("/github")
		{
			github.POST("/webhook", githubHandler.HandleWebhook) // Public, HMAC verified
			github.GET("/install/callback", githubHandler.InstallCallback)
		}

		// Stats routes
		stats := api.Group("/stats")
		stats.Use(authMiddleware.RequireAuth())
		{
			stats.GET("/projects/:id", statsHandler.GetProjectStats)
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
