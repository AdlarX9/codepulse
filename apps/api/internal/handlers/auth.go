package handlers

import (
	"net/http"
	"time"

	"codepulse-api/internal/config"
	"codepulse-api/internal/database"
	"codepulse-api/internal/middleware"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db     *database.Database
	config *config.Config
}

// GetProfile handles GET /me/profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var profile models.Profile
	if err := h.db.DB.Where("user_id = ?", user.ID).First(&profile).Error; err != nil {
		// Create default profile if missing
		profile = models.Profile{
			UserID:     user.ID,
			Visibility: "private",
		}
		_ = h.db.DB.Create(&profile).Error
	}

	c.JSON(http.StatusOK, gin.H{"profile": profile})
}

// CheckHandleAvailability handles GET /me/profile/check-handle
func (h *AuthHandler) CheckHandleAvailability(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	handle := c.Query("handle")
	if handle == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Handle parameter is required"})
		return
	}

	// Validate handle format (alphanumeric, underscore, hyphen, 3-50 chars)
	if len(handle) < 3 || len(handle) > 50 {
		c.JSON(http.StatusOK, gin.H{
			"available": false,
			"reason":    "Handle must be between 3 and 50 characters",
		})
		return
	}

	// Check if handle is already taken by another user
	var existingProfile models.Profile
	err := h.db.DB.Where("handle = ?", handle).First(&existingProfile).Error
	if err == nil {
		// Handle exists
		if existingProfile.UserID == user.ID {
			// It's the current user's handle
			c.JSON(http.StatusOK, gin.H{
				"available": true,
				"reason":    "This is your current handle",
			})
		} else {
			// Handle taken by another user
			c.JSON(http.StatusOK, gin.H{
				"available": false,
				"reason":    "Handle already taken",
			})
		}
		return
	}

	// Handle is available
	c.JSON(http.StatusOK, gin.H{
		"available": true,
		"reason":    "Handle is available",
	})
}

// UpdateProfile handles PATCH /me/profile
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userCtx, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		Handle          *string         `json:"handle"`
		DisplayName     *string         `json:"display_name"`
		AvatarURL       *string         `json:"avatar_url"`
		Bio             *string         `json:"bio"`
		Links           *models.JSONMap `json:"links"`
		Visibility      *string         `json:"visibility"`
		Email           *string         `json:"email"`
		Password        *string         `json:"password"`
		CurrentPassword *string         `json:"current_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate profile visibility if provided
	if req.Visibility != nil && *req.Visibility != "private" && *req.Visibility != "public" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Visibility must be 'private' or 'public'"})
		return
	}

	// Start transaction
	tx := h.db.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer func() {
		if r := recover(); r != nil {
			_ = tx.Rollback()
		}
	}()

	// Recharger l'utilisateur depuis la DB (avec mot de passe haché)
	var dbUser models.User
	if err := tx.Where("id = ?", userCtx.ID).First(&dbUser).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	// Update profile fields (si fournis)
	profileUpdates := map[string]interface{}{}
	
	// Handle handle change (requires checking uniqueness)
	if req.Handle != nil && *req.Handle != "" {
		// Check if handle is already taken by another user
		var existingProfile models.Profile
		err := tx.Where("handle = ? AND user_id != ?", *req.Handle, dbUser.ID).First(&existingProfile).Error
		if err == nil {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Handle already taken"})
			return
		}
		profileUpdates["handle"] = *req.Handle
	}
	
	if req.DisplayName != nil {
		profileUpdates["display_name"] = *req.DisplayName
	}
	if req.AvatarURL != nil {
		profileUpdates["avatar_url"] = *req.AvatarURL
	}
	if req.Bio != nil {
		profileUpdates["bio"] = *req.Bio
	}
	if req.Links != nil {
		profileUpdates["links"] = *req.Links
	}
	if req.Visibility != nil {
		profileUpdates["visibility"] = *req.Visibility
	}

	if len(profileUpdates) > 0 {
		if err := tx.Model(&models.Profile{}).
			Where("user_id = ?", dbUser.ID).
			Updates(profileUpdates).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
			return
		}
	}

	// Update email si fourni et différent
	if req.Email != nil && *req.Email != "" && *req.Email != dbUser.Email {
		// Vérifier le mot de passe courant
		if req.CurrentPassword == nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Current password required to update email"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(dbUser.Password), []byte(*req.CurrentPassword)); err != nil {
			tx.Rollback()
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current password"})
			return
		}

		// Unicité de l'email
		var count int64
		if err := tx.Model(&models.User{}).Where("email = ?", *req.Email).Count(&count).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify email uniqueness"})
			return
		}
		if count > 0 {
			tx.Rollback()
			c.JSON(http.StatusConflict, gin.H{"error": "Email already in use"})
			return
		}

		// Mise à jour email
		if err := tx.Model(&models.User{}).
			Where("id = ?", dbUser.ID).
			Update("email", *req.Email).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email"})
			return
		}
	}

	// Update password si fourni
	if req.Password != nil && *req.Password != "" {
		// Vérifier le mot de passe courant
		if req.CurrentPassword == nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Current password required to update password"})
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(dbUser.Password), []byte(*req.CurrentPassword)); err != nil {
			tx.Rollback()
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current password"})
			return
		}

		// Hash du nouveau mot de passe
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(*req.Password), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
			return
		}

		// Mise à jour mot de passe
		if err := tx.Model(&models.User{}).
			Where("id = ?", dbUser.ID).
			Update("password", string(hashedPassword)).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Reload updated user and profile
	var updatedUser models.User
	if err := h.db.DB.Preload("Profile").Where("id = ?", userCtx.ID).First(&updatedUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reload user data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile": updatedUser.Profile,
		"user": gin.H{
			"id":    updatedUser.ID,
			"email": updatedUser.Email,
		},
	})
}

func NewAuthHandler(db *database.Database, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		db:     db,
		config: cfg,
	}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Handle   string `json:"handle" binding:"required,min=3,max=50"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

// Register handles POST /auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := h.db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists"})
		return
	}

	// Check if handle is already taken
	var existingProfile models.Profile
	if err := h.db.DB.Where("handle = ?", req.Handle).First(&existingProfile).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Handle already taken"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Start transaction
	tx := h.db.DB.Begin()

	// Create user
	user := models.User{
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create profile
	profile := models.Profile{
		UserID:     user.ID,
		Handle:     req.Handle,
		Visibility: "private",
	}

	if err := tx.Create(&profile).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Load user with profile
	h.db.DB.Preload("Profile").First(&user, user.ID)

	// Generate JWT token
	token, err := h.generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, AuthResponse{
		Token: token,
		User:  &user,
	})
}

// Login handles POST /auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// For now, we'll implement a simple auth mechanism
	// In a real app, you'd verify against hashed passwords
	var user models.User
	if err := h.db.DB.Where("email = ?", req.Email).Preload("Profile").First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Verify password against hash
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT token
	token, err := h.generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		Token: token,
		User:  &user,
	})
}

// Me handles GET /auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Load user with profile
	if err := h.db.DB.Preload("Profile").Where("id = ?", user.ID).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// Logout handles POST /auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// For JWT, we don't need to do anything server-side for logout
	// The client should remove the token
	// In a more sophisticated setup, you'd blacklist the token
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

type UpdateEmailRequest struct {
	NewEmail string `json:"new_email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type UpdatePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required,min=8"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// UpdateEmail handles PUT /auth/email (deprecated - use PATCH /me/profile)
func (h *AuthHandler) UpdateEmail(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{"error": "This endpoint is deprecated. Use PATCH /me/profile instead."})
}

// UpdatePassword handles PUT /auth/password (deprecated - use PATCH /me/profile)
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	c.JSON(http.StatusGone, gin.H{"error": "This endpoint is deprecated. Use PATCH /me/profile instead."})
}

// DeleteAccount handles DELETE /me/account
func (h *AuthHandler) DeleteAccount(c *gin.Context) {
	var req struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required"})
		return
	}

	userCtx, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Reload user from DB to get password hash
	var user models.User
	if err := h.db.DB.Where("id = ?", userCtx.ID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// Start transaction for soft delete
	tx := h.db.DB.Begin()
	if tx.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Soft delete user (this will cascade to related records if configured)
	if err := tx.Delete(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

// ForgotPassword handles POST /auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Check if user exists
	var user models.User
	if err := h.db.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		// For security, don't reveal if email exists or not
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
		return
	}

	// In a real application, you would:
	// 1. Generate a secure reset token
	// 2. Store it in the database with expiration
	// 3. Send an email with the reset link
	// For now, we'll just return a success message

	c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
}
func (h *AuthHandler) generateToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.config.JWTSecret))
}
