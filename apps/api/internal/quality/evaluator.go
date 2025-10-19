package quality

import (
	"codepulse-api/internal/models"
	"fmt"
	"math"
)

// EvaluationResult represents the result of a policy evaluation
type EvaluationResult struct {
	Passed   bool                   `json:"passed"`
	Mode     string                 `json:"mode"`
	Failures []FailureDetail        `json:"failures,omitempty"`
	Summary  string                 `json:"summary"`
	Metrics  map[string]interface{} `json:"metrics"`
}

// FailureDetail represents a single threshold failure
type FailureDetail struct {
	Metric    string  `json:"metric"`
	Expected  float64 `json:"expected"`
	Actual    float64 `json:"actual"`
	Message   string  `json:"message"`
	Condition string  `json:"condition"` // "min" or "max"
}

// ScanMetrics represents computed metrics from a scan
type ScanMetrics struct {
	TotalLines       int     `json:"total_lines"`
	CodeLines        int     `json:"code_lines"`
	CommentLines     int     `json:"comment_lines"`
	BlankLines       int     `json:"blank_lines"`
	CoreCodeLines    int     `json:"core_code_lines"`
	InfoLines        int     `json:"info_lines"`
	CommentRatio     float64 `json:"comment_ratio"`
	BloatRatio       float64 `json:"bloat_ratio"`
	DocCoverage      float64 `json:"doc_coverage"`
	CoreToInfoRatio  float64 `json:"core_to_info_ratio"`
}

// ComputeMetrics calculates quality metrics from a scan
func ComputeMetrics(scan *models.Scan) *ScanMetrics {
	total := scan.GetTotal()
	code := scan.GetCode()
	comment := scan.GetComment()
	blank := scan.GetBlank()
	core := scan.GetCoreCodeLines()
	info := scan.GetInfoLines()

	metrics := &ScanMetrics{
		TotalLines:    total,
		CodeLines:     code,
		CommentLines:  comment,
		BlankLines:    blank,
		CoreCodeLines: core,
		InfoLines:     info,
	}

	// Comment ratio
	if code > 0 {
		metrics.CommentRatio = float64(comment) / float64(code)
	}

	// Bloat ratio (info lines / total code)
	if code > 0 {
		metrics.BloatRatio = float64(info) / float64(code)
	}

	// Doc coverage (comment / core code)
	if core > 0 {
		metrics.DocCoverage = float64(comment) / float64(core)
	}

	// Core to info ratio
	if info > 0 {
		metrics.CoreToInfoRatio = float64(core) / float64(info)
	}

	return metrics
}

// EvaluatePolicy evaluates a scan against a quality budget
func EvaluatePolicy(policy *models.QualityBudget, scan *models.Scan) *EvaluationResult {
	metrics := ComputeMetrics(scan)
	
	result := &EvaluationResult{
		Passed:   true,
		Mode:     policy.Mode,
		Failures: []FailureDetail{},
		Metrics:  make(map[string]interface{}),
	}

	// Store metrics for reference
	result.Metrics["comment_ratio"] = roundFloat(metrics.CommentRatio, 3)
	result.Metrics["bloat_ratio"] = roundFloat(metrics.BloatRatio, 3)
	result.Metrics["doc_coverage"] = roundFloat(metrics.DocCoverage, 3)
	result.Metrics["core_to_info_ratio"] = roundFloat(metrics.CoreToInfoRatio, 2)
	result.Metrics["total_lines"] = metrics.TotalLines
	result.Metrics["code_lines"] = metrics.CodeLines

	if policy.Thresholds == nil {
		result.Summary = "No thresholds defined"
		return result
	}

	thresholds := *policy.Thresholds

	// Check comment_ratio_min
	if minVal, ok := thresholds["comment_ratio_min"].(float64); ok {
		if metrics.CommentRatio < minVal {
			result.Passed = false
			result.Failures = append(result.Failures, FailureDetail{
				Metric:    "comment_ratio",
				Expected:  minVal,
				Actual:    roundFloat(metrics.CommentRatio, 3),
				Condition: "min",
				Message:   fmt.Sprintf("Comment ratio %.3f is below minimum %.3f", metrics.CommentRatio, minVal),
			})
		}
	}

	// Check bloat_max
	if maxVal, ok := thresholds["bloat_max"].(float64); ok {
		if metrics.BloatRatio > maxVal {
			result.Passed = false
			result.Failures = append(result.Failures, FailureDetail{
				Metric:    "bloat_ratio",
				Expected:  maxVal,
				Actual:    roundFloat(metrics.BloatRatio, 3),
				Condition: "max",
				Message:   fmt.Sprintf("Bloat ratio %.3f exceeds maximum %.3f", metrics.BloatRatio, maxVal),
			})
		}
	}

	// Check doc_coverage_min
	if minVal, ok := thresholds["doc_coverage_min"].(float64); ok {
		if metrics.DocCoverage < minVal {
			result.Passed = false
			result.Failures = append(result.Failures, FailureDetail{
				Metric:    "doc_coverage",
				Expected:  minVal,
				Actual:    roundFloat(metrics.DocCoverage, 3),
				Condition: "min",
				Message:   fmt.Sprintf("Doc coverage %.3f is below minimum %.3f", metrics.DocCoverage, minVal),
			})
		}
	}

	// Check core_to_info_ratio_min
	if minVal, ok := thresholds["core_to_info_ratio_min"].(float64); ok {
		if metrics.CoreToInfoRatio < minVal {
			result.Passed = false
			result.Failures = append(result.Failures, FailureDetail{
				Metric:    "core_to_info_ratio",
				Expected:  minVal,
				Actual:    roundFloat(metrics.CoreToInfoRatio, 2),
				Condition: "min",
				Message:   fmt.Sprintf("Core/info ratio %.2f is below minimum %.2f", metrics.CoreToInfoRatio, minVal),
			})
		}
	}

	// Generate summary
	if result.Passed {
		result.Summary = fmt.Sprintf("✓ All quality thresholds passed (%d checks)", len(result.Metrics))
	} else {
		if policy.Mode == "hard" {
			result.Summary = fmt.Sprintf("✗ Quality check failed: %d threshold(s) not met (blocking)", len(result.Failures))
		} else {
			result.Summary = fmt.Sprintf("⚠ Quality warning: %d threshold(s) not met (non-blocking)", len(result.Failures))
		}
	}

	return result
}

// roundFloat rounds a float to the specified precision
func roundFloat(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}

// FormatCheckRunOutput formats the evaluation result for GitHub Check Run
func FormatCheckRunOutput(result *EvaluationResult, policyName string) (title, summary string) {
	if result.Passed {
		title = fmt.Sprintf("✓ Quality check passed: %s", policyName)
		summary = result.Summary + "\n\n**Metrics:**\n"
	} else {
		if result.Mode == "hard" {
			title = fmt.Sprintf("✗ Quality check failed: %s", policyName)
		} else {
			title = fmt.Sprintf("⚠ Quality warning: %s", policyName)
		}
		summary = result.Summary + "\n\n**Failures:**\n"
		for _, f := range result.Failures {
			summary += fmt.Sprintf("- %s\n", f.Message)
		}
		summary += "\n**Metrics:**\n"
	}

	// Add metrics
	for k, v := range result.Metrics {
		summary += fmt.Sprintf("- %s: %v\n", k, v)
	}

	return title, summary
}
