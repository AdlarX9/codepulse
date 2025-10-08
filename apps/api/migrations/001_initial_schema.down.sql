-- Drop triggers
DROP TRIGGER IF EXISTS update_github_links_updated_at ON github_links;
DROP TRIGGER IF EXISTS update_scans_updated_at ON scans;
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_token;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP INDEX IF EXISTS idx_downloads_created_at;
DROP INDEX IF EXISTS idx_downloads_version;
DROP INDEX IF EXISTS idx_downloads_platform;
DROP INDEX IF EXISTS idx_github_links_repo_full_name;
DROP INDEX IF EXISTS idx_github_links_project_id;
DROP INDEX IF EXISTS idx_github_links_user_id;
DROP INDEX IF EXISTS idx_scan_langs_language;
DROP INDEX IF EXISTS idx_scan_langs_scan_id;
DROP INDEX IF EXISTS idx_scans_created_at;
DROP INDEX IF EXISTS idx_scans_project_id;
DROP INDEX IF EXISTS idx_scans_user_id;
DROP INDEX IF EXISTS idx_projects_deleted_at;
DROP INDEX IF EXISTS idx_projects_visibility;
DROP INDEX IF EXISTS idx_projects_project_key_hash;
DROP INDEX IF EXISTS idx_projects_user_id;
DROP INDEX IF EXISTS idx_profiles_visibility;
DROP INDEX IF EXISTS idx_profiles_handle;
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_users_email;

-- Drop tables in correct order (reverse of creation)
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS downloads;
DROP TABLE IF EXISTS github_links;
DROP TABLE IF EXISTS scan_langs;
DROP TABLE IF EXISTS scans;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
