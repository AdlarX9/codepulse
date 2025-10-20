package export

import (
	"fmt"
	"time"
)

// PDFExporter handles PDF export functionality
type PDFExporter struct{}

func NewPDFExporter() *PDFExporter {
	return &PDFExporter{}
}

// ExportReport generates a PDF report
// Note: This is a simplified HTML-based PDF generator
// For production, consider using a proper PDF library like gopdf or gofpdf
func (e *PDFExporter) ExportReport(orgName string, stats map[string]interface{}, languages map[string]interface{}, trends []map[string]interface{}) ([]byte, error) {
	html := e.generateHTML(orgName, stats, languages, trends)

	// For now, we return HTML that can be converted to PDF by the frontend
	// In a production environment, use a library like wkhtmltopdf or chromedp
	return []byte(html), nil
}

func (e *PDFExporter) generateHTML(orgName string, stats map[string]interface{}, languages map[string]interface{}, trends []map[string]interface{}) string {
	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>CodePulse Quality Report - %s</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #3B82F6 0%%, #2563EB 100%%);
            color: white;
            padding: 40px;
            text-align: center;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
        }
        .header .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-top: 10px;
        }
        .section {
            margin: 30px 0;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 24px;
            font-weight: bold;
            color: #1F2937;
            border-bottom: 3px solid #3B82F6;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin: 20px 0;
        }
        .metric-card {
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 20px;
        }
        .metric-label {
            font-size: 14px;
            color: #6B7280;
            margin-bottom: 5px;
        }
        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #111827;
        }
        table {
            width: 100%%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        th {
            background: #F3F4F6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #E5E7EB;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #E5E7EB;
        }
        tr:hover {
            background: #F9FAFB;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .badge-success {
            background: #D1FAE5;
            color: #065F46;
        }
        .badge-warning {
            background: #FEF3C7;
            color: #92400E;
        }
        .footer {
            text-align: center;
            color: #6B7280;
            font-size: 12px;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Code Quality Report</h1>
        <div class="subtitle">%s</div>
        <div class="subtitle" style="font-size: 14px; margin-top: 10px;">Generated on %s</div>
    </div>

    <div class="section">
        <h2 class="section-title">Executive Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-label">Total Code Lines</div>
                <div class="metric-value">%s</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Comment Ratio</div>
                <div class="metric-value">%.1f%%</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Repositories</div>
                <div class="metric-value">%v</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Scans Performed</div>
                <div class="metric-value">%v</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2 class="section-title">Quality Metrics</h2>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Comment Ratio</td>
                    <td>%.2f%%</td>
                    <td><span class="badge %s">%s</span></td>
                </tr>
                <tr>
                    <td>Bloat Ratio</td>
                    <td>%.2f%%</td>
                    <td><span class="badge %s">%s</span></td>
                </tr>
                <tr>
                    <td>Documentation Coverage</td>
                    <td>%.2f%%</td>
                    <td><span class="badge %s">%s</span></td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2 class="section-title">Language Breakdown</h2>
        <table>
            <thead>
                <tr>
                    <th>Language</th>
                    <th>Files</th>
                    <th>Code Lines</th>
                    <th>Comment Lines</th>
                    <th>Comment Ratio</th>
                </tr>
            </thead>
            <tbody>
`,
		orgName,
		orgName,
		time.Now().Format("January 2, 2006 at 3:04 PM"),
		formatNumber(stats["total_code"]),
		stats["avg_comment_ratio"].(float64)*100,
		stats["repository_count"],
		stats["scan_count"],
		stats["avg_comment_ratio"].(float64)*100,
		getStatusClass(stats["avg_comment_ratio"].(float64), 0.15),
		getStatusLabel(stats["avg_comment_ratio"].(float64), 0.15),
		stats["avg_bloat_ratio"].(float64)*100,
		getStatusClass(stats["avg_bloat_ratio"].(float64), 0.30),
		getStatusLabel(stats["avg_bloat_ratio"].(float64), 0.30),
		stats["avg_doc_coverage"].(float64)*100,
		getStatusClass(stats["avg_doc_coverage"].(float64), 0.20),
		getStatusLabel(stats["avg_doc_coverage"].(float64), 0.20),
	)

	// Add language rows
	for lang, data := range languages {
		langData := data.(map[string]interface{})
		commentRatio := 0.0
		code := langData["code"].(float64)
		comment := langData["comment"].(float64)
		if code > 0 {
			commentRatio = (comment / code) * 100
		}

		html += fmt.Sprintf(`
                <tr>
                    <td><strong>%s</strong></td>
                    <td>%.0f</td>
                    <td>%s</td>
                    <td>%s</td>
                    <td>%.2f%%</td>
                </tr>
`, lang, langData["files"], formatNumber(code), formatNumber(comment), commentRatio)
	}

	html += `
            </tbody>
        </table>
    </div>

    <div class="footer">
        <p><strong>CodePulse</strong> - Code Quality Monitoring</p>
        <p>https://codepulse.dev</p>
    </div>
</body>
</html>
`

	return html
}

func formatNumber(val interface{}) string {
	switch v := val.(type) {
	case int:
		return fmt.Sprintf("%d", v)
	case float64:
		return fmt.Sprintf("%.0f", v)
	default:
		return fmt.Sprintf("%v", v)
	}
}

func getStatusClass(value float64, threshold float64) string {
	if value >= threshold {
		return "badge-success"
	}
	return "badge-warning"
}

func getStatusLabel(value float64, threshold float64) string {
	if value >= threshold {
		return "Good"
	}
	return "Needs Improvement"
}
