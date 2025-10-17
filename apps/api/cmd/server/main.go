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
	"codepulse-api/internal/email"
	"codepulse-api/internal/handlers"
	"codepulse-api/internal/middleware"
	"codepulse-api/internal/models"
	"codepulse-api/internal/websocket"
	"codepulse-api/internal/worker"

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
			&models.DeviceLoginSession{},
			&models.Organization{},
			&models.Membership{},
			&models.Subscription{},
			&models.Repository{},
			&models.QualityBudget{},
			&models.Integration{},
			&models.AuditLog{},
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
	ogHandler := handlers.NewOGHandler(db)
	orgHandler := handlers.NewOrgHandler(db)
	policyHandler := handlers.NewPolicyHandler(db)
	githubHandler := handlers.NewGitHubHandler(db, cfg.GitHubAppID, cfg.GitHubPrivateKey, cfg.GitHubWebhookSecret)
	ciHandler := handlers.NewCIHandler(db)
	statsHandler := handlers.NewStatsHandler(db)
	billingHandler := handlers.NewBillingHandler(db, cfg.StripeSecretKey, cfg.StripeWebhookSecret)
	integrationsHandler := handlers.NewIntegrationsHandler(db, cfg.SlackClientID, cfg.SlackClientSecret, cfg.SlackRedirectURI)

	// Initialize WebSocket hub
	wsHub := websocket.NewHub()
	go wsHub.Run()
	wsHandler := handlers.NewWebSocketHandler(wsHub)

	// Initialize email service
	emailService := email.NewService(cfg.PostmarkToken, db)

	// Start background workers
	worker.StartDigestWorker(db.DB, emailService)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(db.DB, cfg)
	orgMiddleware := middleware.NewOrgContextMiddleware(db.DB)

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

	// Start background workers
	// worker.StartDigestWorker(db.DB) // Uncomment to enable weekly digests

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
			me.DELETE("/projects/:id", projectHandler.DeleteProject)

			// Project Details
			me.GET("/projects/:id/details", projectHandler.GetProjectDetails)

			// Project Scans (snapshot)
			me.POST("/projects/:id/snapshot", scanHandler.CreateSnapshot)

			// Read/Update Profile
			me.GET("/profile", authHandler.GetProfile)
			me.PATCH("/profile", authHandler.UpdateProfile)
		}

		// Public routes
		auth := api.Group("/auth")
		{
			// Auth
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/me", authMiddleware.RequireAuth(), authHandler.Me)

			// Account Management
			auth.DELETE("/account", authMiddleware.RequireAuth(), authHandler.DeleteAccount)
		}

		// Public project routes
		public := api.Group("/u")
		{
			public.GET("/:handle/:project_id", projectHandler.GetPublicProject)
		}

		// Organization routes (protected)
		orgs := api.Group("/orgs")
		orgs.Use(authMiddleware.RequireAuth())
		{
			orgs.POST("", orgHandler.CreateOrg)
			orgs.GET("/me", orgHandler.GetUserOrgs)
			orgs.GET("/:id", orgHandler.GetOrg)
			orgs.PATCH("/:id", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), orgHandler.UpdateOrg)

			// Members
			orgs.GET("/:id/members", orgHandler.GetMembers)
			orgs.POST("/:id/invite", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), orgHandler.InviteMember)
			orgs.PATCH("/:id/members/:user_id", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), orgHandler.UpdateMemberRole)
			orgs.DELETE("/:id/members/:user_id", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), orgHandler.RemoveMember)

			// Policies
			orgs.GET("/:id/policies", orgMiddleware.ResolveOrg(), policyHandler.GetPolicies)
			orgs.POST("/:id/policies", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), policyHandler.CreatePolicy)
			orgs.GET("/:id/policies/:policy_id", orgMiddleware.ResolveOrg(), policyHandler.GetPolicy)
			orgs.PATCH("/:id/policies/:policy_id", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), policyHandler.UpdatePolicy)
			orgs.DELETE("/:id/policies/:policy_id", orgMiddleware.ResolveOrg(), orgMiddleware.RequireAdmin(), policyHandler.DeletePolicy)

			// Stats
			orgs.GET("/:id/stats", orgMiddleware.ResolveOrg(), statsHandler.GetOrgStats)
		}

		// GitHub routes
		github := api.Group("/github")
		{
			github.POST("/webhook", githubHandler.HandleWebhook) // Public, HMAC verified
			github.GET("/install/callback", githubHandler.InstallCallback)
		}

		// CI routes
		ci := api.Group("/ci")
		{
			ci.POST("/snapshots", ciHandler.CreateSnapshot) // Bearer token auth
			ci.GET("/snapshots/:id", authMiddleware.RequireAuth(), ciHandler.GetSnapshot)
		}

		// Stats routes
		stats := api.Group("/stats")
		stats.Use(authMiddleware.RequireAuth())
		{
			stats.GET("/repos/:id", orgMiddleware.ResolveOrg(), statsHandler.GetRepoStats)
			stats.GET("/projects/:id", statsHandler.GetProjectStats)
		}

		// Billing routes
		billing := api.Group("/billing")
		{
			billing.POST("/webhook", billingHandler.HandleWebhook) // Public, Stripe signature verified
			billing.POST("/checkout", authMiddleware.RequireAuth(), orgMiddleware.ResolveOrg(), billingHandler.CreateCheckoutSession)
			billing.POST("/portal", authMiddleware.RequireAuth(), orgMiddleware.ResolveOrg(), billingHandler.CreatePortalSession)
			billing.GET("/subscription", authMiddleware.RequireAuth(), orgMiddleware.ResolveOrg(), billingHandler.GetSubscription)
		}

		// Integrations routes
		integrations := api.Group("/integrations")
		integrations.Use(authMiddleware.RequireAuth(), orgMiddleware.ResolveOrg())
		{
			integrations.GET("", integrationsHandler.GetIntegrations)

			// Slack
			integrations.POST("/slack/connect", orgMiddleware.RequireAdmin(), integrationsHandler.ConnectSlack)
			integrations.GET("/slack/callback", integrationsHandler.SlackCallback) // No auth, handled by state
			integrations.DELETE("/slack/disconnect", orgMiddleware.RequireAdmin(), integrationsHandler.DisconnectSlack)
			integrations.PATCH("/slack/channel", orgMiddleware.RequireAdmin(), integrationsHandler.UpdateSlackChannel)
		}

		// WebSocket routes
		ws := api.Group("/ws")
		ws.Use(authMiddleware.RequireAuth(), orgMiddleware.ResolveOrg())
		{
			ws.GET("/connect", wsHandler.HandleWebSocket)
			ws.GET("/stats", wsHandler.GetStats)
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
