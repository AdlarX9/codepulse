package handlers

import (
	"net/http"
	"time"

	"codepulse-api/internal/database"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	db      *database.Database
	version string
}

func NewHealthHandler(db *database.Database, version string) *HealthHandler {
	return &HealthHandler{db: db, version: version}
}

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Services  map[string]string `json:"services"`
	Version   string            `json:"version"`
}

func (h *HealthHandler) HealthCheck(c *gin.Context) {
	response := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  make(map[string]string),
		Version:   h.version,
	}

	// Check PostgreSQL
	sqlDB, err := h.db.DB.DB()
	if err != nil || sqlDB.Ping() != nil {
		response.Services["postgres"] = "unhealthy"
		response.Status = "degraded"
	} else {
		response.Services["postgres"] = "healthy"
	}

	// Check Redis
	if err := h.db.Redis.Ping(c.Request.Context()).Err(); err != nil {
		response.Services["redis"] = "unhealthy"
		if response.Status != "degraded" {
			response.Status = "degraded"
		}
	} else {
		response.Services["redis"] = "healthy"
	}

	// Set HTTP status based on overall health
	statusCode := http.StatusOK
	if response.Status == "degraded" {
		statusCode = http.StatusServiceUnavailable
	}

	c.JSON(statusCode, response)
}
