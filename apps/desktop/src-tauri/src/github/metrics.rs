use chrono::{DateTime, Duration, Utc, Datelike, Weekday, TimeZone};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeekBucket {
    pub start_iso: String,
    pub end_iso: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyMetrics {
    pub week: WeekBucket,
    pub throughput: u32,
    pub lead_time_days_avg: f64,
    pub cycle_time_days_avg: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubMetrics {
    pub repo: String,
    pub generated_at: String,
    pub weeks: Vec<WeeklyMetrics>,
}

#[derive(Debug, Deserialize)]
struct PullRequest {
    number: u64,
    created_at: String,
    merged_at: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CommitObj {
    commit: CommitInner,
}

#[derive(Debug, Deserialize)]
struct CommitInner {
    author: CommitAuthor,
}

#[derive(Debug, Deserialize)]
struct CommitAuthor {
    date: String,
}

fn monday_start(dt: DateTime<Utc>) -> DateTime<Utc> {
    // ISO week Monday = 1
    let weekday = dt.weekday();
    let diff_days = match weekday {
        Weekday::Mon => 0,
        Weekday::Tue => 1,
        Weekday::Wed => 2,
        Weekday::Thu => 3,
        Weekday::Fri => 4,
        Weekday::Sat => 5,
        Weekday::Sun => 6,
    };
    let start = (dt.date_naive() - chrono::Days::new(diff_days)).and_hms_opt(0, 0, 0).unwrap();
    Utc.from_utc_datetime(&start)
}

fn build_week_buckets(n: usize) -> Vec<WeekBucket> {
    let now = Utc::now();
    let this_monday = monday_start(now);
    let mut weeks = Vec::with_capacity(n);
    for i in (0..n).rev() { // oldest first
        let start = this_monday - Duration::weeks(i as i64);
        let end = start + Duration::days(7) - Duration::milliseconds(1);
        weeks.push(WeekBucket { start_iso: start.to_rfc3339(), end_iso: end.to_rfc3339() });
    }
    weeks
}

fn bucket_index_for(ts: &DateTime<Utc>, buckets: &Vec<WeekBucket>) -> Option<usize> {
    for (i, w) in buckets.iter().enumerate() {
        let start = DateTime::parse_from_rfc3339(&w.start_iso).ok()?.with_timezone(&Utc);
        let end = DateTime::parse_from_rfc3339(&w.end_iso).ok()?.with_timezone(&Utc);
        if *ts >= start && *ts <= end { return Some(i); }
    }
    None
}

async fn list_prs(client: &Client, slug: &str, token: Option<&str>, since: DateTime<Utc>) -> Result<Vec<PullRequest>, String> {
    let mut page = 1u32;
    let mut acc: Vec<PullRequest> = Vec::new();

    loop {
        let url = format!("https://api.github.com/repos/{}/pulls?state=closed&sort=updated&direction=desc&per_page=100&page={}", slug, page);
        let mut req = client.get(&url).header("User-Agent", "CodePulse");
        if let Some(t) = token { req = req.header("Authorization", format!("Bearer {}", t)); }
        let res = req.send().await.map_err(|e| e.to_string())?;
        if !res.status().is_success() { return Err(format!("GitHub API error: {}", res.status())); }
        let mut items: Vec<serde_json::Value> = res.json().await.map_err(|e| e.to_string())?;
        if items.is_empty() { break; }

        for it in items.drain(..) {
            let pr: PullRequest = serde_json::from_value(it).map_err(|e| e.to_string())?;
            acc.push(pr);
        }
        page += 1;
        if page > 10 { break; } // safety cap
    }

    // Filter merged and by time window (merged_at >= since)
    let filtered = acc.into_iter().filter(|pr| match &pr.merged_at { Some(m) => {
        if let Ok(ts) = DateTime::parse_from_rfc3339(m) { ts.with_timezone(&Utc) >= since } else { false }
    }, None => false }).collect::<Vec<_>>();

    Ok(filtered)
}

async fn first_commit_time_for_pr(client: &Client, slug: &str, pr_number: u64, token: Option<&str>) -> Result<Option<DateTime<Utc>>, String> {
    let url = format!("https://api.github.com/repos/{}/pulls/{}/commits?per_page=100", slug, pr_number);
    let mut req = client.get(&url).header("User-Agent", "CodePulse");
    if let Some(t) = token { req = req.header("Authorization", format!("Bearer {}", t)); }
    let res = req.send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() { return Err(format!("GitHub API error: {}", res.status())); }
    let commits: Vec<CommitObj> = res.json().await.map_err(|e| e.to_string())?;
    let min = commits.iter().filter_map(|c| DateTime::parse_from_rfc3339(&c.commit.author.date).ok()).map(|d| d.with_timezone(&Utc)).min();
    Ok(min)
}

pub async fn compute_metrics_for_repo(slug: &str, weeks: usize, token: Option<&str>) -> Result<GitHubMetrics, String> {
    let client = Client::new();
    let buckets = build_week_buckets(weeks);
    let since = chrono::DateTime::parse_from_rfc3339(&buckets.first().unwrap().start_iso).unwrap().with_timezone(&Utc);

    let prs = list_prs(&client, slug, token, since).await?;

    // Initialize metrics per bucket
    let mut throughput = vec![0u32; buckets.len()];
    let mut lead_sum = vec![0f64; buckets.len()];
    let mut lead_cnt = vec![0u32; buckets.len()];
    let mut cycle_sum = vec![0f64; buckets.len()];
    let mut cycle_cnt = vec![0u32; buckets.len()];

    for pr in prs {
        let merged_at = match pr.merged_at { Some(m) => DateTime::parse_from_rfc3339(&m).ok().map(|d| d.with_timezone(&Utc)), None => None };
        let created_at = DateTime::parse_from_rfc3339(&pr.created_at).ok().map(|d| d.with_timezone(&Utc));
        if let (Some(m), Some(c)) = (merged_at, created_at) {
            if let Some(idx) = bucket_index_for(&m, &buckets) {
                throughput[idx] += 1;
                let lead_days = (m - c).num_seconds() as f64 / 86_400.0;
                lead_sum[idx] += lead_days;
                lead_cnt[idx] += 1;

                // cycle time from earliest commit to merge
                if let Ok(Some(first_commit)) = first_commit_time_for_pr(&client, slug, pr.number, token).await {
                    let cycle_days = (m - first_commit).num_seconds() as f64 / 86_400.0;
                    cycle_sum[idx] += cycle_days;
                    cycle_cnt[idx] += 1;
                }
            }
        }
    }

    let weeks_vec = buckets
        .into_iter()
        .enumerate()
        .map(|(i, w)| WeeklyMetrics {
            week: w,
            throughput: throughput[i],
            lead_time_days_avg: if lead_cnt[i] > 0 { lead_sum[i] / lead_cnt[i] as f64 } else { 0.0 },
            cycle_time_days_avg: if cycle_cnt[i] > 0 { cycle_sum[i] / cycle_cnt[i] as f64 } else { 0.0 },
        })
        .collect::<Vec<_>>();

    Ok(GitHubMetrics {
        repo: slug.to_string(),
        generated_at: Utc::now().to_rfc3339(),
        weeks: weeks_vec,
    })
}
