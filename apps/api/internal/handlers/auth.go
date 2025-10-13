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
	h.db.DB.Preload("Profile").First(user, user.ID)

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

// UpdateEmail handles PUT /auth/email
func (h *AuthHandler) UpdateEmail(c *gin.Context) {
	var req UpdateEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current password"})
		return
	}

	// Check if new email is already taken
	var existingUser models.User
	if err := h.db.DB.Where("email = ?", req.NewEmail).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email already in use"})
		return
	}

	// Update email
	if err := h.db.DB.Model(user).Update("email", req.NewEmail).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update email"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

// UpdatePassword handles PUT /auth/password
func (h *AuthHandler) UpdatePassword(c *gin.Context) {
	var req UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid current password"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update password
	if err := h.db.DB.Model(user).Update("password", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

// DeleteAccount handles DELETE /auth/account
func (h *AuthHandler) DeleteAccount(c *gin.Context) {
	var req struct {
		Password string `json:"password" binding:"required,min=8"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// Start transaction for soft delete
	tx := h.db.DB.Begin()

	// Soft delete user (this will cascade to related records if configured)
	if err := tx.Delete(user).Error; err != nil {
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
