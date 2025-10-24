pub mod metrics;

use regex::Regex;

pub fn parse_repo_slug(remote: &str) -> Option<String> {
    // SSH: git@github.com:user/repo.git
    if let Some(caps) = Regex::new(r"^git@[^:]+:([^\s]+?)(?:\.git)?$").ok()?.captures(remote) {
        return caps.get(1).map(|m| m.as_str().to_string());
    }
    // HTTP(S): https://github.com/user/repo(.git)?
    if let Some(caps) = Regex::new(r"^https?://[^/]+/([^/]+/[^/]+?)(?:\.git)?/?$")
        .ok()?
        .captures(remote)
    {
        return caps.get(1).map(|m| m.as_str().to_string());
    }
    None
}
