-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- needed for gen_random_uuid()

-- =========================
-- Core (users, profiles, projects, scans, etc.)
-- =========================

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
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

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_key_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    description TEXT,
    visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
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
-- Multi-tenant (organizations, memberships, subscriptions, repos, policies, integrations, audit)
-- =========================

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(org_id, user_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'team', 'enterprise')),
    seats INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_end TIMESTAMP WITH TIME ZONE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(20) DEFAULT 'github' CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
    external_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'internal')),
    default_branch VARCHAR(255),
    repo_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Quality Budgets (Policies) table
CREATE TABLE IF NOT EXISTS quality_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('org', 'repo', 'project')),
    ref_id UUID,
    name VARCHAR(255) NOT NULL,
    thresholds JSONB NOT NULL,
    mode VARCHAR(10) DEFAULT 'soft' CHECK (mode IN ('soft', 'hard')),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('slack', 'github', 'email')),
    config JSONB,
    encrypted_data TEXT,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: scans table no longer has repository_id, commit_sha, pull_request
-- These were removed to simplify the model

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

-- organizations
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- memberships
CREATE INDEX idx_memberships_org_id ON memberships(org_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_deleted_at ON memberships(deleted_at);

-- subscriptions
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_deleted_at ON subscriptions(deleted_at);

-- repositories
CREATE INDEX idx_repositories_org_id ON repositories(org_id);
CREATE INDEX idx_repositories_external_id ON repositories(external_id);
CREATE INDEX idx_repositories_deleted_at ON repositories(deleted_at);

-- quality_budgets
CREATE INDEX idx_quality_budgets_org_id ON quality_budgets(org_id);
CREATE INDEX idx_quality_budgets_ref_id ON quality_budgets(ref_id);
CREATE INDEX idx_quality_budgets_deleted_at ON quality_budgets(deleted_at);

-- integrations
CREATE INDEX idx_integrations_org_id ON integrations(org_id);
CREATE INDEX idx_integrations_deleted_at ON integrations(deleted_at);

-- audit_logs
CREATE INDEX idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

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