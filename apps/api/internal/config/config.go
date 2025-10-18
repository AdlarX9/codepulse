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

	// App
	AppVersion    string
	EncryptionKey string

	// GitHub App
	GitHubAppID         string
	GitHubPrivateKey    []byte
	GitHubWebhookSecret string

	// Stripe
	StripeSecretKey       string
	StripeWebhookSecret   string
	StripePricePro        string
	StripePriceTeam       string
	StripePriceEnterprise string

	// Slack
	SlackClientID      string
	SlackClientSecret  string
	SlackSigningSecret string
	SlackRedirectURI   string

	// Email
	PostmarkToken string
	EmailFromAddr string
}

func Load() (*Config, error) {
	// Load .env file if it exists (for development)
	if env := os.Getenv("ENV"); env != "production" {
		_ = godotenv.Load()
	}

	config := &Config{
		Environment:   getEnv("ENV", "development"),
		Port:          getEnv("PORT", "8080"),
		AppVersion:    getEnv("APP_VERSION", "dev"),
		EncryptionKey: getEnv("ENCRYPTION_KEY", ""),

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

		// GitHub App
		GitHubAppID:         getEnv("GITHUB_APP_ID", ""),
		GitHubPrivateKey:    []byte(getEnv("GITHUB_PRIVATE_KEY", "")),
		GitHubWebhookSecret: getEnv("GITHUB_WEBHOOK_SECRET", ""),

		// Stripe
		StripeSecretKey:       getEnv("STRIPE_SECRET_KEY", ""),
		StripeWebhookSecret:   getEnv("STRIPE_WEBHOOK_SECRET", ""),
		StripePricePro:        getEnv("STRIPE_PRICE_PRO", ""),
		StripePriceTeam:       getEnv("STRIPE_PRICE_TEAM", ""),
		StripePriceEnterprise: getEnv("STRIPE_PRICE_ENTERPRISE", ""),

		// Slack
		SlackClientID:      getEnv("SLACK_CLIENT_ID", ""),
		SlackClientSecret:  getEnv("SLACK_CLIENT_SECRET", ""),
		SlackSigningSecret: getEnv("SLACK_SIGNING_SECRET", ""),
		SlackRedirectURI:   getEnv("SLACK_REDIRECT_URI", "http://localhost:8080/api/integrations/slack/callback"),

		// Email
		PostmarkToken: getEnv("POSTMARK_TOKEN", ""),
		EmailFromAddr: getEnv("EMAIL_FROM_ADDR", "noreply@codepulse.dev"),
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
