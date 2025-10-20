package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"

	"codepulse-api/internal/database"
	"codepulse-api/internal/middleware"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
)

type ScanHandler struct {
	db *database.Database
}

func NewScanHandler(db *database.Database) *ScanHandler {
	return &ScanHandler{db: db}
}

type SyncPayload struct {
	ProjectKeyHash string      `json:"project_key_hash" binding:"required"`
	PerLanguage    []LangStats `json:"per_language" binding:"required"`
	DeviceID       string      `json:"device_id" binding:"required"`
	AppVersion     *string     `json:"app_version"`
	ScannedAt      string      `json:"scanned_at" binding:"required"`
	MedianLines    *float64    `json:"median_lines"`
	GapLines       *float64    `json:"gap_lines"`
	// Legacy support: totals field is optional (stats computed from per_language)
	Totals *ScanTotals `json:"totals"`
}

type ScanTotals struct {
	Total         int `json:"total"`
	Code          int `json:"code"`
	Comment       int `json:"comment"`
	Blank         int `json:"blank"`
	CoreCodeLines int `json:"core_code_lines"`
	InfoLines     int `json:"info_lines"`
}

type LangStats struct {
	Language    string   `json:"language" binding:"required"`
	Files       int      `json:"files" binding:"required"`
	Total       int      `json:"total" binding:"required"`
	Comment     int      `json:"comment" binding:"required"`
	Blank       int      `json:"blank" binding:"required"`
	MedianLines *float64 `json:"median_lines"`
	GapLines    *float64 `json:"gap_lines"`
	// Code field is optional (calculated as Total - Comment - Blank)
	Code *int `json:"code"`
}

// SyncScan handles POST /sync/scan
func (h *ScanHandler) SyncScan(c *gin.Context) {
	// Get current user
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Parse request body
	var payload SyncPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	// Parse scanned_at timestamp
	scannedAtInt, err := strconv.ParseInt(payload.ScannedAt, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scanned_at timestamp"})
		return
	}
	scannedAtTime := time.Unix(scannedAtInt, 0)

	// Start transaction
	tx := h.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Upsert project
	project := models.Project{
		UserID:         user.ID,
		ProjectKeyHash: &payload.ProjectKeyHash,
	}

	if err := tx.Where("user_id = ? AND project_key_hash = ?", user.ID, payload.ProjectKeyHash).
		FirstOrCreate(&project).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create/find project"})
		return
	}

	// Create scan (stats are now computed from ScanLangs)
	medianLines := float64(0)
	if payload.MedianLines != nil {
		medianLines = *payload.MedianLines
	}
	gapLines := float64(0)
	if payload.GapLines != nil {
		gapLines = *payload.GapLines
	}

	scan := models.Scan{
		ProjectID:   project.ID,
		DeviceID:    &payload.DeviceID,
		VersionTag:  payload.AppVersion,
		MedianLines: medianLines,
		GapLines:    gapLines,
		CreatedAt:   scannedAtTime,
		UpdatedAt:   scannedAtTime,
	}

	if err := tx.Create(&scan).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan"})
		return
	}

	// Create scan languages
	for _, lang := range payload.PerLanguage {
		median := float64(0)
		if lang.MedianLines != nil {
			median = *lang.MedianLines
		}
		gap := float64(0)
		if lang.GapLines != nil {
			gap = *lang.GapLines
		}

		scanLang := models.ScanLang{
			ScanID:      scan.ID,
			Language:    lang.Language,
			Files:       lang.Files,
			Total:       lang.Total,
			Comment:     lang.Comment,
			Blank:       lang.Blank,
			MedianLines: median,
			GapLines:    gap,
		}

		if err := tx.Create(&scanLang).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan language"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Scan synced successfully",
		"scan_id": scan.ID,
	})
}

// CreateSnapshot handles POST /projects/:id/snapshot
func (h *ScanHandler) CreateSnapshot(c *gin.Context) {
	projectID := c.Param("id")
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	// Parse request body
	var payload SyncPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload", "details": err.Error()})
		return
	}

	// Parse scanned_at timestamp
	scannedAtInt, err := strconv.ParseInt(payload.ScannedAt, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scanned_at timestamp"})
		return
	}
	scannedAtTime := time.Unix(scannedAtInt, 0)

	// 1) Charger le dernier scan et ses langues
	var lastScan models.Scan
	err = h.db.DB.
		Where("project_id = ?", project.ID).
		Order("created_at DESC, id DESC").
		First(&lastScan).Error

	var lastScanLangs []models.ScanLang
	if err == nil {
		_ = h.db.DB.Where("scan_id = ?", lastScan.ID).Find(&lastScanLangs).Error
	}

	// 2) Évaluer la significativité des changements
	if err == nil {
		if !isSignificantChange(lastScan, lastScanLangs, &payload) {
			// Pas de changement significatif: ne pas créer de snapshot
			c.JSON(http.StatusOK, gin.H{
				"success":        false,
				"message":        "No significant changes detected, snapshot skipped",
				"last_scan_id":   lastScan.ID,
				"last_scan_time": lastScan.CreatedAt,
			})
			return
		}
	}
	// Si record not found (aucun snapshot), on créera un premier snapshot

	// 3) Créer un nouveau snapshot (transaction)
	tx := h.db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			_ = tx.Rollback()
		}
	}()

	medianLines := float64(0)
	if payload.MedianLines != nil {
		medianLines = *payload.MedianLines
	}
	gapLines := float64(0)
	if payload.GapLines != nil {
		gapLines = *payload.GapLines
	}

	scan := models.Scan{
		ProjectID:   project.ID,
		DeviceID:    &payload.DeviceID,
		VersionTag:  payload.AppVersion,
		MedianLines: medianLines,
		GapLines:    gapLines,
		CreatedAt:   scannedAtTime,
		UpdatedAt:   scannedAtTime,
	}

	if err := tx.Create(&scan).Error; err != nil {
		_ = tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan"})
		return
	}

	// Create scan languages
	for _, lang := range payload.PerLanguage {
		median := float64(0)
		if lang.MedianLines != nil {
			median = *lang.MedianLines
		}
		gap := float64(0)
		if lang.GapLines != nil {
			gap = *lang.GapLines
		}

		scanLang := models.ScanLang{
			ScanID:      scan.ID,
			Language:    lang.Language,
			Files:       lang.Files,
			Total:       lang.Total,
			Comment:     lang.Comment,
			Blank:       lang.Blank,
			MedianLines: median,
			GapLines:    gap,
		}

		if err := tx.Create(&scanLang).Error; err != nil {
			_ = tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create scan language"})
			return
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Snapshot created successfully",
		"scan_id": scan.ID,
	})
}

// agg represents aggregated language statistics
type agg struct {
	files   int
	total   int
	comment int
	blank   int
	code    int
}

// isSignificantChange compare le dernier snapshot avec le payload courant.
func isSignificantChange(last models.Scan, lastLangs []models.ScanLang, payload *SyncPayload) bool {
	// Seuils (adapter au besoin)
	const (
		codeAbsThreshold    = 200 // lignes
		totalAbsThreshold   = 200
		commentAbsThreshold = 100
		blankAbsThreshold   = 100
		codeRelThreshold    = 0.02 // 2%
		totalRelThreshold   = 0.02
		commentRelThreshold = 0.05 // 5%
		blankRelThreshold   = 0.05
		medianAbsThreshold  = 10.0
		medianRelThreshold  = 0.05 // 5%
		gapAbsThreshold     = 10.0
		gapRelThreshold     = 0.05
	)
	lastMap := map[string]agg{}
	for _, l := range lastLangs {
		code := l.Total - l.Comment - l.Blank
		if code < 0 {
			code = 0
		}
		lastMap[l.Language] = agg{
			files:   l.Files,
			total:   l.Total,
			comment: l.Comment,
			blank:   l.Blank,
			code:    code,
		}
	}

	newMap := map[string]agg{}
	for _, l := range payload.PerLanguage {
		code := l.Total - l.Comment - l.Blank
		if code < 0 {
			code = 0
		}
		newMap[l.Language] = agg{
			files:   l.Files,
			total:   l.Total,
			comment: l.Comment,
			blank:   l.Blank,
			code:    code,
		}
	}

	// 1) Langues ajoutées/supprimées => significatif
	if !sameKeySet(lastMap, newMap) {
		return true
	}

	// 2) Agrégats globaux
	lastTotals := agg{}
	for _, v := range lastMap {
		lastTotals.files += v.files
		lastTotals.total += v.total
		lastTotals.comment += v.comment
		lastTotals.blank += v.blank
		lastTotals.code += v.code
	}
	newTotals := agg{}
	for _, v := range newMap {
		newTotals.files += v.files
		newTotals.total += v.total
		newTotals.comment += v.comment
		newTotals.blank += v.blank
		newTotals.code += v.code
	}

	// Différences absolues
	dCode := absInt(newTotals.code - lastTotals.code)
	dTotal := absInt(newTotals.total - lastTotals.total)
	dComment := absInt(newTotals.comment - lastTotals.comment)
	dBlank := absInt(newTotals.blank - lastTotals.blank)

	// Relatives (protégées)
	codeRel := relDiff(dCode, lastTotals.code)
	totalRel := relDiff(dTotal, lastTotals.total)
	commentRel := relDiff(dComment, lastTotals.comment)
	blankRel := relDiff(dBlank, lastTotals.blank)

	if dCode >= codeAbsThreshold || codeRel >= codeRelThreshold {
		return true
	}
	if dTotal >= totalAbsThreshold || totalRel >= totalRelThreshold {
		return true
	}
	if dComment >= commentAbsThreshold || commentRel >= commentRelThreshold {
		return true
	}
	if dBlank >= blankAbsThreshold || blankRel >= blankRelThreshold {
		return true
	}

	// 3) Métriques median/gap
	newMedian := 0.0
	if payload.MedianLines != nil {
		newMedian = *payload.MedianLines
	}
	newGap := 0.0
	if payload.GapLines != nil {
		newGap = *payload.GapLines
	}
	medianDiff := math.Abs(newMedian - last.MedianLines)
	gapDiff := math.Abs(newGap - last.GapLines)

	medianRel := relDiffFloat(medianDiff, last.MedianLines)
	gapRel := relDiffFloat(gapDiff, last.GapLines)

	if medianDiff >= medianAbsThreshold || medianRel >= medianRelThreshold {
		return true
	}
	if gapDiff >= gapAbsThreshold || gapRel >= gapRelThreshold {
		return true
	}

	// 4) Si tout est sous les seuils, pas significatif
	return false
}

func sameKeySet(a, b map[string]agg) bool {
	if len(a) != len(b) {
		return false
	}
	for k := range a {
		if _, ok := b[k]; !ok {
			return false
		}
	}
	return true
}

func absInt(x int) int {
	if x < 0 {
		return -x
	}
	return x
}

func relDiff(absDelta int, base int) float64 {
	if base <= 0 {
		if absDelta == 0 {
			return 0
		}
		// Si base 0 et delta > 0, considérer comme 100% diff
		return 1.0
	}
	return float64(absDelta) / float64(base)
}

func relDiffFloat(absDelta float64, base float64) float64 {
	if base == 0 {
		if absDelta == 0 {
			return 0
		}
		return 1.0
	}
	return absDelta / math.Abs(base)
}
