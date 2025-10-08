-- CodePulse Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Downloads table
CREATE TABLE IF NOT EXISTS downloads (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	-- Privacy-first: IP is hashed, never stored raw
	ip_hash TEXT NOT NULL,

	-- Geographic data (from CDN headers)
	country TEXT,
	region TEXT,
	city TEXT,

	-- Request metadata
	user_agent TEXT,
	referrer TEXT,

	-- Download info
	platform TEXT NOT NULL CHECK (platform IN ('mac', 'win', 'linux')),
	version TEXT NOT NULL,
	release_channel TEXT DEFAULT 'stable',
	source TEXT DEFAULT 'landing',

	-- Extra metadata (JSON for flexibility)
	extra JSONB DEFAULT '{}'::JSONB
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON downloads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_platform ON downloads(platform);
CREATE INDEX IF NOT EXISTS idx_downloads_version ON downloads(version);
CREATE INDEX IF NOT EXISTS idx_downloads_country ON downloads(country);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role can do anything" ON downloads
	FOR ALL
	USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE downloads IS 'Privacy-first download tracking for CodePulse';
COMMENT ON COLUMN downloads.ip_hash IS 'SHA-256 hash of IP + salt, never raw IP';
COMMENT ON COLUMN downloads.extra IS 'Flexible JSON field for future metadata';
