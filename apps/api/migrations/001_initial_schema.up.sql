-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- needed for gen_random_uuid()

-- =========================
-- Core (users, profiles, projects, scans, etc.)
-- =========================

-- Create users table (with gamification fields)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    premium_until TIMESTAMP WITH TIME ZONE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    total_commit_scans INT DEFAULT 0,
    badges JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create profiles table
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    handle VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    links JSONB,
    visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table (with Git integration fields)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
    git_repo_url TEXT,
    git_provider VARCHAR(20),
    last_commit_sha VARCHAR(255),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, project_key_hash)
);

-- Create scans table
-- Aggregate stats are computed from scan_langs
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    version_tag VARCHAR(50),
    median_lines FLOAT DEFAULT 0,
    gap_lines FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scan_langs table
-- Code is computed as: total - comment - blank
CREATE TABLE scan_langs (
    scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    language VARCHAR(50) NOT NULL,
    files INTEGER NOT NULL,
    total INTEGER NOT NULL,
    comment INTEGER NOT NULL,
    blank INTEGER NOT NULL,
    median_lines FLOAT DEFAULT 0,
    gap_lines FLOAT DEFAULT 0,
    PRIMARY KEY (scan_id, language)
);

-- Create github_links table
CREATE TABLE github_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repo_full_name VARCHAR(255) NOT NULL,
    installation_id INTEGER,
    repo_data JSONB,
    latest_release JSONB,
    last_commit JSONB,
    stars_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id)
);

-- Create downloads table
CREATE TABLE downloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(50) NOT NULL,
    version VARCHAR(50) NOT NULL,
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    referrer TEXT,
    user_agent TEXT,
    ip_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table for JWT token management
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================
-- Git & Gamification Tables
-- =========================

-- Create commit_scans table (Git-based scans)
CREATE TABLE commit_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    commit_sha VARCHAR(255) NOT NULL,
    branch VARCHAR(255),
    commit_message TEXT,
    commit_author VARCHAR(255),
    commit_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Scan metadata
    device_id VARCHAR(255),
    version_tag VARCHAR(50),
    median_lines FLOAT DEFAULT 0,
    gap_lines FLOAT DEFAULT 0,
    
    -- Git diff metrics
    files_changed INT DEFAULT 0,
    lines_added INT DEFAULT 0,
    lines_deleted INT DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create commit_scan_langs table
CREATE TABLE commit_scan_langs (
    commit_scan_id UUID NOT NULL REFERENCES commit_scans(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    files INT NOT NULL,
    total INT NOT NULL,
    comment INT NOT NULL,
    blank INT NOT NULL,
    median_lines FLOAT DEFAULT 0,
    gap_lines FLOAT DEFAULT 0,
    
    -- Git diff metrics per language
    lines_added INT DEFAULT 0,
    lines_deleted INT DEFAULT 0,
    
    PRIMARY KEY (commit_scan_id, language)
);

-- Create collaborators table
CREATE TABLE collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    git_username VARCHAR(255) NOT NULL,
    git_email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'contributor' CHECK (role IN ('owner', 'contributor')),
    commits_count INT DEFAULT 0,
    lines_added INT DEFAULT 0,
    lines_deleted INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create challenges table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target JSONB NOT NULL,
    progress JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    reward VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =========================
-- Indexes
-- =========================

-- users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- profiles
CREATE INDEX idx_profiles_handle ON profiles(handle);
CREATE INDEX idx_profiles_visibility ON profiles(visibility);

-- projects
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_project_key_hash ON projects(project_key_hash);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- scans
CREATE INDEX idx_scans_project_id ON scans(project_id);
CREATE INDEX idx_scans_created_at ON scans(created_at);

-- scan_langs
CREATE INDEX idx_scan_langs_scan_id ON scan_langs(scan_id);
CREATE INDEX idx_scan_langs_language ON scan_langs(language);

-- github_links
CREATE INDEX idx_github_links_user_id ON github_links(user_id);
CREATE INDEX idx_github_links_project_id ON github_links(project_id);
CREATE INDEX idx_github_links_repo_full_name ON github_links(repo_full_name);

-- downloads
CREATE INDEX idx_downloads_platform ON downloads(platform);
CREATE INDEX idx_downloads_version ON downloads(version);
CREATE INDEX idx_downloads_created_at ON downloads(created_at);

-- sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- commit_scans
CREATE INDEX idx_commit_scans_project ON commit_scans(project_id);
CREATE INDEX idx_commit_scans_sha ON commit_scans(commit_sha);
CREATE INDEX idx_commit_scans_date ON commit_scans(commit_date);

-- collaborators
CREATE INDEX idx_collaborators_project ON collaborators(project_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);

-- challenges
CREATE INDEX idx_challenges_user ON challenges(user_id);
CREATE INDEX idx_challenges_project ON challenges(project_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_ends_at ON challenges(ends_at);

-- =========================
-- updated_at trigger function + triggers
-- =========================

-- Update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (core tables)
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scans_updated_at BEFORE UPDATE ON scans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_github_links_updated_at BEFORE UPDATE ON github_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();