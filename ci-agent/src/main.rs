mod scanner;
mod language;
mod categories;

use clap::Parser;
use std::path::Path;
use std::fs;
use serde_json;

#[derive(Parser, Debug)]
#[command(name = "ci-agent")]
#[command(about = "CodePulse CI Agent - Privacy-first code scanner for CI/CD", long_about = None)]
struct Args {
    /// Base path to scan
    #[arg(short, long)]
    path: String,

    /// Base commit SHA (for diff scanning - optional)
    #[arg(short, long)]
    base_sha: Option<String>,

    /// Head commit SHA
    #[arg(short = 'H', long)]
    head_sha: Option<String>,

    /// Include patterns (glob)
    #[arg(short, long, default_value = "**/*")]
    include: String,

    /// Exclude patterns (glob, comma separated)
    #[arg(short, long, default_value = "node_modules/**,target/**,.git/**")]
    exclude: String,

    /// Output file path
    #[arg(short, long)]
    out: Option<String>,

    /// Pretty print JSON
    #[arg(long)]
    pretty: bool,
}

fn main() {
    let args = Args::parse();

    let path = Path::new(&args.path);
    if !path.exists() {
        eprintln!("Error: Path does not exist: {}", args.path);
        std::process::exit(1);
    }

    println!("🔍 CodePulse CI Agent");
    println!("📂 Scanning: {}", args.path);
    
    // Parse exclude patterns
    let exclude_patterns: Vec<String> = args.exclude
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    println!("🚫 Excluding: {:?}", exclude_patterns);

    // Run scan
    match scanner::scan_directory(&args.path, exclude_patterns) {
        Ok(result) => {
            let snapshot = scanner::to_snapshot(&result);
            
            // Create output payload
            let output = serde_json::json!({
                "totals": {
                    "total": snapshot.total,
                    "code": snapshot.code,
                    "comment": snapshot.comment,
                    "blank": snapshot.blank,
                    "core_code_lines": snapshot.core_code_lines,
                    "info_lines": snapshot.info_lines,
                },
                "per_language": snapshot.per_language,
                "scanned_at": chrono::Utc::now().timestamp().to_string(),
                "head_sha": args.head_sha.unwrap_or_else(|| "unknown".to_string()),
                "base_sha": args.base_sha,
            });

            // Output results
            let json_str = if args.pretty {
                serde_json::to_string_pretty(&output).unwrap()
            } else {
                serde_json::to_string(&output).unwrap()
            };

            if let Some(out_path) = args.out {
                fs::write(&out_path, &json_str).expect("Failed to write output file");
                println!("✅ Results written to: {}", out_path);
            } else {
                println!("{}", json_str);
            }

            println!("\n📊 Summary:");
            println!("  Total lines: {}", snapshot.total);
            println!("  Code lines: {}", snapshot.code);
            println!("  Comment lines: {}", snapshot.comment);
            println!("  Comment ratio: {:.2}%", snapshot.comment_ratio * 100.0);
            println!("  Core code: {}", snapshot.core_code_lines);
            println!("  Info lines: {}", snapshot.info_lines);
            println!("  Duration: {}ms", result.duration_ms);
        },
        Err(e) => {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    }
}
