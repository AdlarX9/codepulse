use crate::models::scan_settings::ScanSettings;
use crate::overview::{count_files, count_lines, detect_language};
use encoding_rs;
use git2::{DiffOptions, ObjectType, Oid, Repository, Tree};
use rayon::prelude::*;
use serde::Serialize;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

#[derive(Debug, Clone, Serialize)]
pub struct QualityMetrics {
	pub total_files: u32,
	pub total_lines: u32,
	pub total_code: u32,
	pub total_comments: u32,
	pub total_blank: u32,
	pub comment_percentage: f64,
	pub code_percentage: f64,
	pub avg_file_lines: f64,
	pub median_file_lines: f64,
	pub stddev_file_lines: f64,
	// Placeholders for future integrations (dead code, coverage)
	pub dead_code_findings: u32,
	pub test_coverage: Option<f64>,
	pub doc_coverage: Option<f64>,
}

pub async fn compute_quality_metrics(
	path: &str,
	settings: &ScanSettings,
) -> Result<QualityMetrics, String> {
	let root = Path::new(path);
	if !root.exists() {
		return Err("Path does not exist".into());
	}

	// Collect files using the same inclusion logic as the scanner
	let mut file_paths: Vec<String> = Vec::new();
	for entry in WalkDir::new(root).follow_links(settings.follow_symlinks).into_iter() {
		let entry = match entry {
			Ok(e) => e,
			Err(_) => continue,
		};
		if entry.path().is_file() {
			if count_files(&entry, settings.clone()) {
				if let Some(s) = entry.path().to_str() {
					file_paths.push(s.to_string());
				}
			}
		}
	}

	// Read and count in parallel
	let file_totals: Vec<u32> = file_paths
		.par_iter()
		.filter_map(|p| {
			let path = Path::new(p);
			let filename = path.file_name()?.to_str()?;
			let language = detect_language(filename);
			let content = std::fs::read_to_string(path).ok()?;
			let (total, _blank, _comment, _code) = count_lines(&content, &language);
			Some(total)
		})
		.collect();

	// Recompute totals with details (single-thread to minimize IO contention)
	let mut total_lines = 0u32;
	let mut total_code = 0u32;
	let mut total_comments = 0u32;
	let mut total_blank = 0u32;
	for p in &file_paths {
		let path = Path::new(p);
		if let (Some(filename), Ok(content)) =
			(path.file_name().and_then(|s| s.to_str()), std::fs::read_to_string(path))
		{
			let language = detect_language(filename);
			let (t, b, c, code) = count_lines(&content, &language);
			total_lines += t;
			total_blank += b;
			total_comments += c;
			total_code += code;
		}
	}

	let comment_percentage =
		if total_lines > 0 { (total_comments as f64 / total_lines as f64) * 100.0 } else { 0.0 };
	let code_percentage =
		if total_lines > 0 { (total_code as f64 / total_lines as f64) * 100.0 } else { 0.0 };

	// Stats
	let mut totals_sorted = file_totals.clone();
	totals_sorted.sort_unstable();
	let avg = if totals_sorted.is_empty() {
		0.0
	} else {
		totals_sorted.iter().sum::<u32>() as f64 / totals_sorted.len() as f64
	};
	let median = if totals_sorted.is_empty() {
		0.0
	} else if totals_sorted.len() % 2 == 0 {
		let m = totals_sorted.len() / 2;
		(totals_sorted[m - 1] + totals_sorted[m]) as f64 / 2.0
	} else {
		totals_sorted[totals_sorted.len() / 2] as f64
	};
	let var = if totals_sorted.is_empty() {
		0.0
	} else {
		totals_sorted
			.iter()
			.map(|&x| {
				let d = x as f64 - avg;
				d * d
			})
			.sum::<f64>()
			/ totals_sorted.len() as f64
	};
	let stddev = var.sqrt();

	Ok(QualityMetrics {
		total_files: file_paths.len() as u32,
		total_lines,
		total_code,
		total_comments,
		total_blank,
		comment_percentage,
		code_percentage,
		avg_file_lines: avg,
		median_file_lines: median,
		stddev_file_lines: stddev,
		dead_code_findings: 0,
		test_coverage: compute_test_coverage(path),
		doc_coverage: compute_doc_coverage_estimate(path),
	})
}

#[derive(Debug, Clone, Serialize)]
pub struct BranchQualityDelta {
	pub branch: String,
	pub changed_files: u32,
	pub delta_total: i64,
	pub delta_code: i64,
	pub delta_comments: i64,
	pub delta_blank: i64,
}

fn path_allowed_by_settings(path: &str, filename: &str, settings: &ScanSettings) -> bool {
	// Directory exclusion by segment name
	let p = Path::new(path);
	for comp in p.components() {
		if let std::path::Component::Normal(s) = comp {
			if let Some(seg) = s.to_str() {
				if settings.excluded_dirs.iter().any(|d| d == seg) {
					return false;
				}
			}
		}
	}
	// Extension-based exclusion
	if let Some(ext) = Path::new(filename).extension().and_then(|s| s.to_str()) {
		if settings.excluded_extensions.iter().any(|e| e.eq_ignore_ascii_case(ext)) {
			return false;
		}
	}
	// Language-based include/exclude
	let lang = detect_language(filename);
	if lang == "Unknown" {
		return false;
	}
	if !settings.allowed_languages.is_empty()
		&& !settings.allowed_languages.iter().any(|l| l == &lang)
	{
		return false;
	}
	if settings.excluded_languages.iter().any(|l| l == &lang) {
		return false;
	}
	true
}

fn read_blob_text(repo: &Repository, oid: Oid) -> Option<String> {
	let blob = repo.find_blob(oid).ok()?;
	let bytes = blob.content();
	match std::str::from_utf8(bytes) {
		Ok(s) => Some(s.to_string()),
		Err(_) => {
			let (decoded, _, _) = encoding_rs::WINDOWS_1252.decode(bytes);
			Some(decoded.to_string())
		}
	}
}

fn traverse_tree_collect(
	repo: &Repository,
	tree: &Tree,
	base: &Path,
	settings: &ScanSettings,
	file_totals: &mut Vec<u32>,
	totals: &mut (u32, u32, u32, u32),
) {
	for entry in tree.iter() {
		let name = match entry.name() {
			Some(n) => n,
			None => continue,
		};
		let full_path: PathBuf = base.join(name);
		match entry.kind() {
			Some(ObjectType::Tree) => {
				if settings.excluded_dirs.iter().any(|d| d == name) {
					continue;
				}
				if let Ok(next) = entry.to_object(repo).and_then(|o| o.peel_to_tree()) {
					traverse_tree_collect(repo, &next, &full_path, settings, file_totals, totals);
				}
			}
			Some(ObjectType::Blob) => {
				let filename = name;
				if !path_allowed_by_settings(
					full_path.to_string_lossy().as_ref(),
					filename,
					settings,
				) {
					continue;
				}
				if let Some(text) = read_blob_text(repo, entry.id()) {
					let lang = detect_language(filename);
					let (total, blank, comment, code) = count_lines(&text, &lang);
					file_totals.push(total);
					totals.0 += total; // total lines
					totals.1 += code;
					totals.2 += comment;
					totals.3 += blank;
				}
			}
			_ => {}
		}
	}
}

fn compute_quality_metrics_for_tree(
	repo: &Repository,
	tree: &Tree,
	settings: &ScanSettings,
) -> Result<QualityMetrics, String> {
	let mut file_totals: Vec<u32> = Vec::new();
	let mut totals: (u32, u32, u32, u32) = (0, 0, 0, 0);
	traverse_tree_collect(repo, tree, Path::new(""), settings, &mut file_totals, &mut totals);

	let total_lines = totals.0;
	let total_code = totals.1;
	let total_comments = totals.2;
	let total_blank = totals.3;

	let mut sorted = file_totals.clone();
	sorted.sort_unstable();
	let avg = if sorted.is_empty() {
		0.0
	} else {
		sorted.iter().sum::<u32>() as f64 / sorted.len() as f64
	};
	let median = if sorted.is_empty() {
		0.0
	} else if sorted.len() % 2 == 0 {
		let m = sorted.len() / 2;
		(sorted[m - 1] + sorted[m]) as f64 / 2.0
	} else {
		sorted[sorted.len() / 2] as f64
	};
	let var = if sorted.is_empty() {
		0.0
	} else {
		sorted
			.iter()
			.map(|&x| {
				let d = x as f64 - avg;
				d * d
			})
			.sum::<f64>()
			/ sorted.len() as f64
	};
	let stddev = var.sqrt();

	Ok(QualityMetrics {
		total_files: file_totals.len() as u32,
		total_lines,
		total_code,
		total_comments,
		total_blank,
		comment_percentage: if total_lines > 0 {
			(total_comments as f64 / total_lines as f64) * 100.0
		} else {
			0.0
		},
		code_percentage: if total_lines > 0 {
			(total_code as f64 / total_lines as f64) * 100.0
		} else {
			0.0
		},
		avg_file_lines: avg,
		median_file_lines: median,
		stddev_file_lines: stddev,
		dead_code_findings: 0,
		test_coverage: None,
		doc_coverage: None,
	})
}

pub async fn compute_quality_metrics_for_branch(
	path: &str,
	branch: &str,
	settings: &ScanSettings,
) -> Result<QualityMetrics, String> {
	let repo = Repository::open(path).map_err(|e| format!("Git open failed: {}", e))?;
	let reference = repo
		.find_reference(&format!("refs/heads/{}", branch))
		.or_else(|_| -> Result<git2::Reference, git2::Error> {
			let commit = repo.revparse_single(branch)?.peel_to_commit()?;
			repo.find_reference(&commit.id().to_string())
		})
		.map_err(|_| "Branch not found".to_string())?;
	let obj = reference
		.peel(git2::ObjectType::Commit)
		.map_err(|e| format!("Peel commit failed: {}", e))?;
	let commit = obj.into_commit().map_err(|_| "Not a commit".to_string())?;
	let tree = commit.tree().map_err(|e| format!("Tree failed: {}", e))?;
	compute_quality_metrics_for_tree(&repo, &tree, settings)
}

pub async fn compute_branch_quality_deltas(
	path: &str,
	base_branch: &str,
	branches: &[String],
	settings: &ScanSettings,
) -> Result<Vec<BranchQualityDelta>, String> {
	let repo = Repository::open(path).map_err(|e| format!("Git open failed: {}", e))?;
	let base_ref = repo
		.find_reference(&format!("refs/heads/{}", base_branch))
		.or_else(|_| -> Result<git2::Reference, git2::Error> {
			let commit = repo.revparse_single(base_branch)?.peel_to_commit()?;
			repo.find_reference(&commit.id().to_string())
		})
		.map_err(|_| "Base branch not found".to_string())?;
	let base_commit =
		base_ref.peel_to_commit().map_err(|e| format!("Peel base commit failed: {}", e))?;
	let base_tree = base_commit.tree().map_err(|e| format!("Base tree failed: {}", e))?;

	let mut results: Vec<BranchQualityDelta> = Vec::new();

	for b in branches {
		if b == base_branch {
			continue;
		}
		let br_ref = match repo.find_reference(&format!("refs/heads/{}", b)) {
			Ok(r) => r,
			Err(_) => {
				continue;
			}
		};
		let br_commit = match br_ref.peel_to_commit() {
			Ok(c) => c,
			Err(_) => continue,
		};
		let br_tree = match br_commit.tree() {
			Ok(t) => t,
			Err(_) => continue,
		};

		let mut diff_opts = DiffOptions::new();
		let diff = repo
			.diff_tree_to_tree(Some(&base_tree), Some(&br_tree), Some(&mut diff_opts))
			.map_err(|e| format!("Diff failed: {}", e))?;

		let mut changed_files: u32 = 0;
		let mut delta_total: i64 = 0;
		let mut delta_code: i64 = 0;
		let mut delta_comments: i64 = 0;
		let mut delta_blank: i64 = 0;

		for d in diff.deltas() {
			let new = d.new_file();
			let old = d.old_file();
			let filename = new
				.path()
				.or_else(|| old.path())
				.and_then(|p| p.file_name())
				.and_then(|s| s.to_str());
			let path_str = new.path().or_else(|| old.path()).and_then(|p| p.to_str());
			let filename = match (filename, path_str) {
				(Some(f), Some(p)) => {
					if !path_allowed_by_settings(p, f, settings) {
						continue;
					};
					f
				}
				_ => continue,
			};

			let old_text = read_blob_text(&repo, old.id());
			let new_text = read_blob_text(&repo, new.id());

			let lang = detect_language(filename);
			let (ot, ob, oc, oo) = match old_text {
				Some(t) => count_lines(&t, &lang),
				None => (0, 0, 0, 0),
			};
			let (nt, nb, nc, no) = match new_text {
				Some(t) => count_lines(&t, &lang),
				None => (0, 0, 0, 0),
			};

			if ot != nt || ob != nb || oc != nc || oo != no {
				changed_files += 1;
			}

			delta_total += nt as i64 - ot as i64;
			delta_code += no as i64 - oo as i64;
			delta_comments += nc as i64 - oc as i64;
			delta_blank += nb as i64 - ob as i64;
		}

		results.push(BranchQualityDelta {
			branch: b.clone(),
			changed_files,
			delta_total,
			delta_code,
			delta_comments,
			delta_blank,
		});
	}

	Ok(results)
}

// Coverage helpers — best-effort parsing of common formats
fn compute_test_coverage(path: &str) -> Option<f64> {
	// Try lcov
	let lcov = Path::new(path).join("coverage").join("lcov.info");
	if lcov.exists() {
		if let Ok(text) = std::fs::read_to_string(&lcov) {
			let mut total = 0u64;
			let mut hit = 0u64;
			for line in text.lines() {
				if let Some(rest) = line.strip_prefix("LF:") {
					if let Ok(v) = rest.trim().parse::<u64>() {
						total += v;
					}
				}
				if let Some(rest) = line.strip_prefix("LH:") {
					if let Ok(v) = rest.trim().parse::<u64>() {
						hit += v;
					}
				}
			}
			if total > 0 {
				return Some((hit as f64 / total as f64) * 100.0);
			}
		}
	}
	// Try coverage-summary.json (Jest/Vitest)
	let cov_sum = Path::new(path).join("coverage").join("coverage-summary.json");
	if cov_sum.exists() {
		if let Ok(text) = std::fs::read_to_string(&cov_sum) {
			if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
				if let Some(pct) = json
					.get("total")
					.and_then(|t| t.get("lines"))
					.and_then(|l| l.get("pct"))
					.and_then(|v| v.as_f64())
				{
					return Some(pct);
				}
			}
		}
	}
	// Try Cobertura-like coverage.xml (line-rate on <coverage>)
	let cobertura = Path::new(path).join("coverage").join("coverage.xml");
	if cobertura.exists() {
		if let Ok(text) = std::fs::read_to_string(&cobertura) {
			// naive attribute parse: line-rate="0.xyz"
			if let Some(idx) = text.find("line-rate=\"") {
				let rest = &text[idx + 11..];
				if let Some(end) = rest.find('\"') {
					if let Ok(rate) = rest[..end].parse::<f64>() {
						return Some(rate * 100.0);
					}
				}
			}
		}
	}
	// Fallback none
	None
}

fn compute_doc_coverage_estimate(path: &str) -> Option<f64> {
	// Simple heuristic: percentage of Markdown files relative to total files as doc proxy
	let mut md = 0u64;
	let mut files = 0u64;
	for entry in WalkDir::new(path).into_iter().flatten() {
		if entry.path().is_file() {
			files += 1;
			if let Some(ext) = entry.path().extension().and_then(|s| s.to_str()) {
				if ext.eq_ignore_ascii_case("md") || ext.eq_ignore_ascii_case("mdx") {
					md += 1;
				}
			}
		}
		if files > 10_000 {
			break;
		}
	}
	if files == 0 {
		None
	} else {
		Some((md as f64 / files as f64) * 100.0)
	}
}
