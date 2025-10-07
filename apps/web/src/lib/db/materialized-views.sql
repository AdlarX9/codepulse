-- Materialized Views for Performance Optimization
-- Run these after the main schema to create pre-computed aggregations

-- Daily scan rollups for timeline charts
CREATE MATERIALIZED VIEW daily_scan_rollups AS
SELECT 
  DATE(created_at) as scan_date,
  user_id,
  project_id,
  COUNT(*) as scans_count,
  AVG(total) as avg_total_lines,
  AVG(code) as avg_code_lines,
  AVG(comment) as avg_comment_lines,
  AVG(blank) as avg_blank_lines,
  AVG(core_code_lines) as avg_core_code_lines,
  AVG(info_lines) as avg_info_lines,
  AVG(comment_ratio) as avg_comment_ratio,
  MAX(total) as max_total_lines,
  MIN(total) as min_total_lines,
  STDDEV(total) as stddev_total_lines
FROM scans
GROUP BY DATE(created_at), user_id, project_id
ORDER BY scan_date DESC;

-- Create unique index for fast refreshes
CREATE UNIQUE INDEX idx_daily_scan_rollups_unique 
ON daily_scan_rollups (scan_date, user_id, project_id);

-- Language popularity rollups
CREATE MATERIALIZED VIEW language_popularity AS
SELECT 
  language,
  COUNT(DISTINCT scan_id) as total_scans,
  COUNT(DISTINCT (SELECT user_id FROM scans WHERE scans.id = scan_langs.scan_id)) as unique_users,
  SUM(total) as total_lines,
  SUM(code) as total_code_lines,
  AVG(total::float / NULLIF((SELECT s.total FROM scans s WHERE s.id = scan_langs.scan_id), 0)) as avg_percentage_of_project,
  DATE_TRUNC('month', (SELECT created_at FROM scans WHERE scans.id = scan_langs.scan_id)) as month
FROM scan_langs
GROUP BY language, DATE_TRUNC('month', (SELECT created_at FROM scans WHERE scans.id = scan_langs.scan_id))
ORDER BY total_lines DESC;

-- Create index for language popularity
CREATE INDEX idx_language_popularity_lang_month ON language_popularity (language, month);

-- Project analytics summary (latest state per project)
CREATE MATERIALIZED VIEW project_analytics AS
WITH latest_scans AS (
  SELECT DISTINCT ON (project_id) 
    project_id,
    id as scan_id,
    created_at,
    total,
    code,
    comment,
    blank,
    core_code_lines,
    info_lines,
    comment_ratio
  FROM scans
  ORDER BY project_id, created_at DESC
),
project_totals AS (
  SELECT 
    p.id as project_id,
    p.user_id,
    p.name,
    p.visibility,
    p.created_at as project_created_at,
    ls.total as current_total_lines,
    ls.code as current_code_lines,
    ls.comment as current_comment_lines,
    ls.blank as current_blank_lines,
    ls.core_code_lines as current_core_code_lines,
    ls.info_lines as current_info_lines,
    ls.comment_ratio as current_comment_ratio,
    ls.created_at as last_scan_at,
    (SELECT COUNT(*) FROM scans WHERE project_id = p.id) as total_scans,
    (SELECT COUNT(DISTINCT language) FROM scan_langs sl JOIN scans s ON sl.scan_id = s.id WHERE s.project_id = p.id) as unique_languages,
    COALESCE(gl.stars_count, 0) as github_stars
  FROM projects p
  LEFT JOIN latest_scans ls ON p.id = ls.project_id  
  LEFT JOIN github_links gl ON p.id = gl.project_id
)
SELECT * FROM project_totals;

-- Index for project analytics
CREATE INDEX idx_project_analytics_user_visibility ON project_analytics (user_id, visibility);
CREATE INDEX idx_project_analytics_github_stars ON project_analytics (github_stars DESC) WHERE github_stars > 0;

-- User activity summary
CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  p.handle,
  p.display_name,
  p.visibility as profile_visibility,
  COUNT(DISTINCT pr.id) as total_projects,
  COUNT(DISTINCT CASE WHEN pr.visibility = 'public' THEN pr.id END) as public_projects,
  COUNT(DISTINCT s.id) as total_scans,
  COALESCE(SUM(s.total), 0) as total_lines_analyzed,
  COALESCE(SUM(s.core_code_lines), 0) as total_core_code_lines,
  MAX(s.created_at) as last_scan_at,
  COALESCE(SUM(gl.stars_count), 0) as total_github_stars,
  COUNT(DISTINCT s.created_at::date) as active_days
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
LEFT JOIN projects pr ON u.id = pr.user_id  
LEFT JOIN scans s ON pr.id = s.project_id
LEFT JOIN github_links gl ON pr.id = gl.project_id
GROUP BY u.id, u.email, u.created_at, p.handle, p.display_name, p.visibility;

-- Index for user activity
CREATE INDEX idx_user_activity_handle ON user_activity_summary (handle) WHERE handle IS NOT NULL;
CREATE INDEX idx_user_activity_public_profile ON user_activity_summary (profile_visibility, total_github_stars DESC) WHERE profile_visibility = 'public';

-- Refresh functions (call these periodically via cron or API)
CREATE OR REPLACE FUNCTION refresh_daily_rollups() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_scan_rollups;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_language_popularity() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY language_popularity;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_project_analytics() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_analytics;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_user_activity() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
END;
$$ LANGUAGE plpgsql;

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics() RETURNS void AS $$
BEGIN
  PERFORM refresh_daily_rollups();
  PERFORM refresh_language_popularity();
  PERFORM refresh_project_analytics();
  PERFORM refresh_user_activity();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-refresh on new scans (debounced)
CREATE OR REPLACE FUNCTION trigger_analytics_refresh() RETURNS trigger AS $$
BEGIN
  -- Use pg_notify to trigger async refresh (handled by background job)
  PERFORM pg_notify('analytics_refresh', NEW.project_id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scan_analytics_refresh_trigger
  AFTER INSERT ON scans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_analytics_refresh();
