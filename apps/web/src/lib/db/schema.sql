-- CodePulse Database Schema
-- Postgres with UUIDs, timestamptz, JSONB

-- Users and profiles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  links JSONB DEFAULT '{}'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public'))
);

-- Projects (identifiant local hashé, pas de chemins)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_key_hash TEXT NOT NULL, -- hash stable depuis l'app (ex: sha256(base_path + salt local))
  name TEXT,                      -- nom local facultatif (ne contient pas de chemins complets)
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_key_hash)
);

-- Scans et agrégats
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total INT NOT NULL,
  code INT NOT NULL,
  comment INT NOT NULL,
  blank INT NOT NULL,
  comment_ratio NUMERIC NOT NULL,
  core_code_lines INT NOT NULL DEFAULT 0,
  info_lines INT NOT NULL DEFAULT 0,
  device_id TEXT,                 -- identifiant de la machine (non PII direct)
  version_tag TEXT                -- version de l'app ou tag utilisateur
);

CREATE TABLE scan_langs (
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  files INT NOT NULL,
  total INT NOT NULL,
  code INT NOT NULL,
  comment INT NOT NULL,
  blank INT NOT NULL,
  PRIMARY KEY (scan_id, language)
);

-- Liens GitHub (optionnels)
CREATE TABLE github_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repo_full_name TEXT NOT NULL,   -- owner/repo
  installation_id BIGINT,         -- app github si besoin
  repo_data JSONB DEFAULT '{}'::jsonb, -- cached repository metadata
  latest_release JSONB,           -- latest release info from webhook
  last_commit JSONB,              -- last commit info from webhook  
  stars_count INTEGER DEFAULT 0,  -- cached star count
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id) -- one repo per project
);

-- Metadata téléchargements (déjà évoqué)
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  platform TEXT NOT NULL,         -- mac/win/linux
  version TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT
);

-- Index pour performance
CREATE INDEX idx_scans_project_created ON scans(project_id, created_at DESC);
CREATE INDEX idx_scan_langs_scan_id ON scan_langs(scan_id);
CREATE INDEX idx_projects_user_hash ON projects(user_id, project_key_hash);
CREATE INDEX idx_downloads_platform_version ON downloads(platform, version, created_at DESC);
