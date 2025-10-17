package export

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"time"
)

// CSVExporter handles CSV export functionality
type CSVExporter struct{}

func NewCSVExporter() *CSVExporter {
	return &CSVExporter{}
}

// ExportStats exports statistics to CSV format
func (e *CSVExporter) ExportStats(stats map[string]interface{}) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write headers
	headers := []string{"Metric", "Value"}
	if err := writer.Write(headers); err != nil {
		return nil, fmt.Errorf("failed to write headers: %w", err)
	}

	// Write rows
	rows := [][]string{
		{"Repository Count", fmt.Sprintf("%v", stats["repository_count"])},
		{"Scan Count", fmt.Sprintf("%v", stats["scan_count"])},
		{"Average Comment Ratio", fmt.Sprintf("%.2f%%", stats["avg_comment_ratio"].(float64)*100)},
		{"Average Bloat Ratio", fmt.Sprintf("%.2f%%", stats["avg_bloat_ratio"].(float64)*100)},
		{"Average Doc Coverage", fmt.Sprintf("%.2f%%", stats["avg_doc_coverage"].(float64)*100)},
		{"Total Lines", fmt.Sprintf("%v", stats["total_lines"])},
		{"Total Code", fmt.Sprintf("%v", stats["total_code"])},
		{"Total Comments", fmt.Sprintf("%v", stats["total_comment"])},
		{"Total Core", fmt.Sprintf("%v", stats["total_core"])},
		{"Total Info", fmt.Sprintf("%v", stats["total_info"])},
	}

	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			return nil, fmt.Errorf("failed to write row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("csv writer error: %w", err)
	}

	return buf.Bytes(), nil
}

// ExportLanguages exports language breakdown to CSV
func (e *CSVExporter) ExportLanguages(languages map[string]interface{}) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write headers
	headers := []string{"Language", "Files", "Total Lines", "Code Lines", "Comment Lines", "Blank Lines", "Comment Ratio"}
	if err := writer.Write(headers); err != nil {
		return nil, fmt.Errorf("failed to write headers: %w", err)
	}

	// Write rows
	for lang, data := range languages {
		langData := data.(map[string]interface{})
		commentRatio := 0.0
		code := langData["code"].(float64)
		comment := langData["comment"].(float64)
		if code > 0 {
			commentRatio = (comment / code) * 100
		}

		row := []string{
			lang,
			fmt.Sprintf("%.0f", langData["files"]),
			fmt.Sprintf("%.0f", langData["total"]),
			fmt.Sprintf("%.0f", code),
			fmt.Sprintf("%.0f", comment),
			fmt.Sprintf("%.0f", langData["blank"]),
			fmt.Sprintf("%.2f%%", commentRatio),
		}

		if err := writer.Write(row); err != nil {
			return nil, fmt.Errorf("failed to write row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("csv writer error: %w", err)
	}

	return buf.Bytes(), nil
}

// ExportTrends exports trend data to CSV
func (e *CSVExporter) ExportTrends(trends []map[string]interface{}) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Write headers
	headers := []string{"Date", "Code Lines", "Comment Lines", "Comment Ratio", "Bloat Ratio", "Doc Coverage"}
	if err := writer.Write(headers); err != nil {
		return nil, fmt.Errorf("failed to write headers: %w", err)
	}

	// Write rows
	for _, trend := range trends {
		row := []string{
			trend["date"].(string),
			fmt.Sprintf("%.0f", trend["code"]),
			fmt.Sprintf("%.0f", trend["comment"]),
			fmt.Sprintf("%.2f%%", trend["comment_ratio"].(float64)*100),
			fmt.Sprintf("%.2f%%", trend["bloat_ratio"].(float64)*100),
			fmt.Sprintf("%.2f%%", trend["doc_coverage"].(float64)*100),
		}

		if err := writer.Write(row); err != nil {
			return nil, fmt.Errorf("failed to write row: %w", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, fmt.Errorf("csv writer error: %w", err)
	}

	return buf.Bytes(), nil
}

// ExportFullReport exports a complete report with all data
func (e *CSVExporter) ExportFullReport(orgName string, stats map[string]interface{}, languages map[string]interface{}, trends []map[string]interface{}) ([]byte, error) {
	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header
	writer.Write([]string{"CodePulse Quality Report"})
	writer.Write([]string{"Organization", orgName})
	writer.Write([]string{"Generated", time.Now().Format("2006-01-02 15:04:05")})
	writer.Write([]string{})

	// Statistics
	writer.Write([]string{"STATISTICS"})
	writer.Write([]string{"Metric", "Value"})
	writer.Write([]string{"Repository Count", fmt.Sprintf("%v", stats["repository_count"])})
	writer.Write([]string{"Scan Count", fmt.Sprintf("%v", stats["scan_count"])})
	writer.Write([]string{"Avg Comment Ratio", fmt.Sprintf("%.2f%%", stats["avg_comment_ratio"].(float64)*100)})
	writer.Write([]string{"Avg Bloat Ratio", fmt.Sprintf("%.2f%%", stats["avg_bloat_ratio"].(float64)*100)})
	writer.Write([]string{"Total Code Lines", fmt.Sprintf("%v", stats["total_code"])})
	writer.Write([]string{})

	// Languages
	writer.Write([]string{"LANGUAGE BREAKDOWN"})
	writer.Write([]string{"Language", "Files", "Code Lines", "Comment Lines", "Comment Ratio"})
	for lang, data := range languages {
		langData := data.(map[string]interface{})
		commentRatio := 0.0
		code := langData["code"].(float64)
		comment := langData["comment"].(float64)
		if code > 0 {
			commentRatio = (comment / code) * 100
		}

		writer.Write([]string{
			lang,
			fmt.Sprintf("%.0f", langData["files"]),
			fmt.Sprintf("%.0f", code),
			fmt.Sprintf("%.0f", comment),
			fmt.Sprintf("%.2f%%", commentRatio),
		})
	}
	writer.Write([]string{})

	// Trends
	writer.Write([]string{"TRENDS"})
	writer.Write([]string{"Date", "Code Lines", "Comment Ratio"})
	for _, trend := range trends {
		writer.Write([]string{
			trend["date"].(string),
			fmt.Sprintf("%.0f", trend["code"]),
			fmt.Sprintf("%.2f%%", trend["comment_ratio"].(float64)*100),
		})
	}

	writer.Flush()
	return buf.Bytes(), writer.Error()
}
