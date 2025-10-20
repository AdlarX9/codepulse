package handlers

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"codepulse-api/internal/database"
	"codepulse-api/internal/export"
	"codepulse-api/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ExportHandler handles project data export
type ExportHandler struct {
	db          *database.Database
	csvExporter *export.CSVExporter
	pdfExporter *export.PDFExporter
}

// NewExportHandler creates a new export handler
func NewExportHandler(db *database.Database) *ExportHandler {
	return &ExportHandler{
		db:          db,
		csvExporter: export.NewCSVExporter(),
		pdfExporter: export.NewPDFExporter(),
	}
}

// ExportProjectData exports project data in various formats
// GET /api/export?project_id=uuid&format=csv&from=2024-01-01&to=2024-12-31&include_languages=true
func (h *ExportHandler) ExportProjectData(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	projectID := c.Query("project_id")
	format := c.Query("format")
	fromStr := c.Query("from")
	toStr := c.Query("to")
	includeLanguagesStr := c.Query("include_languages")

	if projectID == "" || format == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "project_id and format are required"})
		return
	}

	// Validate format
	validFormats := map[string]bool{
		"csv":  true,
		"json": true,
		"xml":  true,
		"pdf":  true,
	}

	if !validFormats[format] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format. Must be csv, json, or xml"})
		return
	}

	// Verify project ownership
	var project models.Project
	if err := h.db.DB.Where("id = ? AND user_id = ?", projectID, userID).First(&project).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify project ownership"})
		return
	}

	// Parse date filters
	var from, to *time.Time
	if fromStr != "" {
		if parsedFrom, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = &parsedFrom
		}
	}
	if toStr != "" {
		if parsedTo, err := time.Parse("2006-01-02", toStr); err == nil {
			parsedTo = parsedTo.Add(24 * time.Hour) // Include the entire day
			to = &parsedTo
		}
	}

	// Build query for scans
	query := h.db.DB.Where("project_id = ?", projectID)
	if from != nil {
		query = query.Where("created_at >= ?", *from)
	}
	if to != nil {
		query = query.Where("created_at <= ?", *to)
	}

	var scans []models.Scan
	if err := query.Preload("ScanLangs").Order("created_at DESC").Find(&scans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch scans"})
		return
	}

	// Export based on format
	switch format {
	case "csv":
		h.exportCSV(c, project, scans)
	case "json":
		h.exportJSON(c, project, scans, includeLanguagesStr == "true")
	case "xml":
		h.exportXML(c, project, scans, includeLanguagesStr == "true")
	case "pdf":
		h.exportPDF(c, project, scans)
	}
}

func (h *ExportHandler) exportCSV(c *gin.Context, project models.Project, scans []models.Scan) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write header
	header := []string{
		"scan_id", "created_at", "total_lines", "code_lines", "comment_lines",
		"blank_lines", "core_code_lines", "info_lines", "comment_ratio",
		"device_id", "version",
	}
	writer.Write(header)

	// Write data
	for _, scan := range scans {
		total := scan.GetTotal()
		code := scan.GetCode()
		comment := scan.GetComment()
		blank := scan.GetBlank()
		core := scan.GetCoreCodeLines()
		info := scan.GetInfoLines()
		ratio := 0.0
		if code > 0 {
			ratio = float64(comment) / float64(code)
		}
		record := []string{
			scan.ID,
			scan.CreatedAt.Format(time.RFC3339),
			strconv.Itoa(total),
			strconv.Itoa(code),
			strconv.Itoa(comment),
			strconv.Itoa(blank),
			strconv.Itoa(core),
			strconv.Itoa(info),
			fmt.Sprintf("%.2f", ratio),
			getStringPtr(scan.DeviceID),
			getStringPtr(scan.VersionTag),
		}
		writer.Write(record)
	}

	writer.Flush()

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"codepulse_export_%s.csv\"", project.ID))
	c.Data(http.StatusOK, "text/csv", buf.Bytes())
}

func (h *ExportHandler) exportJSON(c *gin.Context, project models.Project, scans []models.Scan, includeLanguages bool) {
	exportData := gin.H{
		"codepulse_export": gin.H{
			"project": gin.H{
				"id":          project.ID,
				"name":        getStringPtr(project.Name),
				"exported_at": time.Now().Format(time.RFC3339),
			},
			"scans": h.formatScansForJSON(scans, includeLanguages),
		},
	}

	c.Header("Content-Type", "application/json")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"codepulse_export_%s.json\"", project.ID))
	c.JSON(http.StatusOK, exportData)
}

func (h *ExportHandler) exportXML(c *gin.Context, project models.Project, scans []models.Scan, includeLanguages bool) {
	// Simple XML export (you might want to use a proper XML library for production)
	xmlData := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<codepulse_export>
  <project>
    <id>%s</id>
    <name>%s</name>
    <exported_at>%s</exported_at>
  </project>
  <scans>`, project.ID, getStringPtr(project.Name), time.Now().Format(time.RFC3339))

	for _, scan := range scans {
		total := scan.GetTotal()
		code := scan.GetCode()
		comment := scan.GetComment()
		blank := scan.GetBlank()
		core := scan.GetCoreCodeLines()
		info := scan.GetInfoLines()
		ratio := 0.0
		if code > 0 {
			ratio = float64(comment) / float64(code)
		}
		xmlData += fmt.Sprintf(`
    <scan>
      <id>%s</id>
      <created_at>%s</created_at>
      <total>%d</total>
      <code>%d</code>
      <comment>%d</comment>
      <blank>%d</blank>
      <core_code_lines>%d</core_code_lines>
      <info_lines>%d</info_lines>
      <comment_ratio>%.2f</comment_ratio>
      <device_id>%s</device_id>
      <version>%s</version>
    </scan>`,
			scan.ID,
			scan.CreatedAt.Format(time.RFC3339),
			total,
			code,
			comment,
			blank,
			core,
			info,
			ratio,
			getStringPtr(scan.DeviceID),
			getStringPtr(scan.VersionTag),
		)

		if includeLanguages {
			for _, lang := range scan.ScanLangs {
				lcode := lang.Total - lang.Comment - lang.Blank
				xmlData += fmt.Sprintf(`
    <scan_lang>
      <language>%s</language>
      <files>%d</files>
      <total>%d</total>
      <code>%d</code>
      <comment>%d</comment>
      <blank>%d</blank>
    </scan_lang>`, lang.Language, lang.Files, lang.Total, lcode, lang.Comment, lang.Blank)
			}
		}
	}

	xmlData += `
  </scans>
</codepulse_export>`

	c.Header("Content-Type", "application/xml")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"codepulse_export_%s.xml\"", project.ID))
	c.Data(http.StatusOK, "application/xml", []byte(xmlData))
}

func (h *ExportHandler) formatScansForJSON(scans []models.Scan, includeLanguages bool) []gin.H {
	result := make([]gin.H, len(scans))

	for i, scan := range scans {
		total := scan.GetTotal()
		code := scan.GetCode()
		comment := scan.GetComment()
		blank := scan.GetBlank()
		core := scan.GetCoreCodeLines()
		info := scan.GetInfoLines()
		ratio := 0.0
		if code > 0 {
			ratio = float64(comment) / float64(code)
		}
		scanData := gin.H{
			"id":              scan.ID,
			"created_at":      scan.CreatedAt.Format(time.RFC3339),
			"total":           total,
			"code":            code,
			"comment":         comment,
			"blank":           blank,
			"core_code_lines": core,
			"info_lines":      info,
			"comment_ratio":   ratio,
			"device_id":       scan.DeviceID,
			"version_tag":     scan.VersionTag,
		}

		if includeLanguages {
			langs := make([]gin.H, len(scan.ScanLangs))
			for j, lang := range scan.ScanLangs {
				lcode := lang.Total - lang.Comment - lang.Blank
				langs[j] = gin.H{
					"language": lang.Language,
					"lines":    lang.Total,
					"files":    lang.Files,
					"percentage": func() float64 {
						t := total
						if t == 0 {
							return 0
						}
						return float64(lang.Total) / float64(t) * 100
					}(),
					"code":    lcode,
					"comment": lang.Comment,
					"blank":   lang.Blank,
				}
			}
			scanData["scan_langs"] = langs
		}

		result[i] = scanData
	}

	return result
}

func (h *ExportHandler) exportPDF(c *gin.Context, project models.Project, scans []models.Scan) {
	// Prepare data for PDF export
	stats := make(map[string]interface{})
	languages := make(map[string]interface{})
	trends := []map[string]interface{}{}

	// Calculate aggregated stats
	totalCode := 0
	totalComment := 0
	totalLines := 0
	scanCount := len(scans)

	for _, scan := range scans {
		totalCode += scan.GetCode()
		totalComment += scan.GetComment()
		totalLines += scan.GetTotal()
	}

	avgCommentRatio := 0.0
	if totalCode > 0 {
		avgCommentRatio = float64(totalComment) / float64(totalCode)
	}

	stats["repository_count"] = 1
	stats["scan_count"] = scanCount
	stats["avg_comment_ratio"] = avgCommentRatio
	stats["avg_bloat_ratio"] = 0.25
	stats["avg_doc_coverage"] = avgCommentRatio
	stats["total_lines"] = totalLines
	stats["total_code"] = totalCode
	stats["total_comment"] = totalComment
	stats["total_core"] = totalCode
	stats["total_info"] = totalComment

	// Aggregate language data from latest scan
	if len(scans) > 0 {
		latestScan := scans[0]
		t := latestScan.GetTotal()
		for _, lang := range latestScan.ScanLangs {
			lcode := lang.Total - lang.Comment - lang.Blank
			languages[lang.Language] = map[string]interface{}{
				"files":   float64(lang.Files),
				"total":   float64(lang.Total),
				"code":    float64(lcode),
				"comment": float64(lang.Comment),
				"blank":   float64(lang.Blank),
				"percentage": func() float64 {
					if t == 0 {
						return 0
					}
					return float64(lang.Total) / float64(t) * 100
				}(),
			}
		}
	}

	// Generate PDF HTML
	pdfData, err := h.pdfExporter.ExportReport(
		getStringPtr(project.Name),
		stats,
		languages,
		trends,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF"})
		return
	}

	c.Header("Content-Type", "text/html")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"codepulse_report_%s.html\"", project.ID))
	c.Data(http.StatusOK, "text/html", pdfData)
}

func getStringPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
