// Quality dashboard module

pub mod github_metrics;
pub mod quality_metrics;

use regex::Regex;

// Re-export main types and functions
pub use quality_metrics::{
	compute_branch_quality_deltas, compute_quality_metrics, compute_quality_metrics_for_branch,
	BranchQualityDelta, QualityMetrics,
};

/// Parse GitHub repository slug from a remote URL
pub fn parse_repo_slug(remote: &str) -> Option<String> {
	// SSH: git@github.com:user/repo.git
	if let Some(caps) = Regex::new(r"^git@[^:]+:([^\s]+?)(?:\.git)?$").ok()?.captures(remote) {
		return caps.get(1).map(|m| m.as_str().to_string());
	}
	// HTTP(S): https://github.com/user/repo(.git)?
	if let Some(caps) =
		Regex::new(r"^https?://[^/]+/([^/]+/[^/]+?)(?:\.git)?/?$").ok()?.captures(remote)
	{
		return caps.get(1).map(|m| m.as_str().to_string());
	}
	None
}
