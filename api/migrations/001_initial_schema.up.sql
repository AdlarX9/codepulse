-- Enable required extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Users
-- =========================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    premium_until TIMESTAMP WITH TIME ZONE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date TIMESTAMP WITH TIME ZONE,
    total_commit_scans INTEGER DEFAULT 0,
    badges JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- =========================
-- Profiles
-- =========================
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    handle VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    links JSONB,
    visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('private','public')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- Projects
-- =========================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_key_hash VARCHAR(255),
    name VARCHAR(255),
    description TEXT,
    visibility VARCHAR(10) DEFAULT 'private' CHECK (visibility IN ('private','public')),
    git_repo_url TEXT,
    git_provider VARCHAR(20),
    last_commit_sha VARCHAR(255),
    last_synced_at TIMESTAMP WITH TIME ZONE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, project_key_hash)
);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- Optionally constrain git_provider values (comment out if not desired)
-- ALTER TABLE projects ADD CONSTRAINT chk_projects_git_provider CHECK (git_provider IN ('github','gitlab','local'));

-- =========================
-- Challenges
-- =========================
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    type VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target JSONB NOT NULL,
    progress JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','completed','failed','expired')),
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    reward VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_challenges_user_id ON challenges(user_id);
CREATE INDEX idx_challenges_project_id ON challenges(project_id);
CREATE INDEX idx_challenges_status ON challenges(status);

-- =========================
-- GitHub Links
-- =========================
CREATE TABLE github_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    repo_full_name VARCHAR(255) NOT NULL,
    installation_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_github_links_user_id ON github_links(user_id);
CREATE INDEX idx_github_links_project_id ON github_links(project_id);
CREATE INDEX idx_github_links_repo_full_name ON github_links(repo_full_name);

-- =========================
-- Invites
-- =========================
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    git_username VARCHAR(255),
    role VARCHAR(20) DEFAULT 'collaborator' CHECK (role IN ('admin','collaborator')),
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX idx_invites_project_id ON invites(project_id);
CREATE INDEX idx_invites_inviter_user_id ON invites(inviter_user_id);
CREATE INDEX idx_invites_invitee_user_id ON invites(invitee_user_id);
CREATE INDEX idx_invites_status ON invites(status);
CREATE INDEX idx_invites_deleted_at ON invites(deleted_at);

-- =========================
-- Sessions
-- =========================
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- =========================
-- Device Login Sessions
-- =========================
CREATE TABLE device_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    token VARCHAR(500),
    completed BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_device_login_sessions_user_id ON device_login_sessions(user_id);

-- =========================
-- updated_at trigger function + triggers
-- =========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_challenges_updated_at BEFORE UPDATE ON challenges
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_github_links_updated_at BEFORE UPDATE ON github_links
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_invites_updated_at BEFORE UPDATE ON invites
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_device_login_sessions_updated_at BEFORE UPDATE ON device_login_sessions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();