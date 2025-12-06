// Quality dashboard module

pub mod quality_metrics;

// Re-export main types and functions
pub use quality_metrics::{
	compute_branch_quality_deltas, compute_quality_metrics,
	BranchQualityDelta, QualityMetrics,
};
