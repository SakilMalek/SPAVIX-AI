-- Migration: Add sessions table for refresh token management
-- This enables server-side session tracking and token revocation

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  access_token_hash VARCHAR(255),
  device_info JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);

-- Composite index for active session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_active) WHERE is_active = true;

-- Function to clean up expired sessions automatically
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON TABLE sessions IS 'Stores user sessions with refresh tokens for secure authentication';
COMMENT ON COLUMN sessions.refresh_token_hash IS 'SHA-256 hash of the refresh token for security';
COMMENT ON COLUMN sessions.access_token_hash IS 'SHA-256 hash of the current access token';
COMMENT ON COLUMN sessions.device_info IS 'JSON object with device information (browser, OS, etc)';
COMMENT ON COLUMN sessions.is_active IS 'Flag to mark session as revoked without deleting';
