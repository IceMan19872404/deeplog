CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    csrf_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    replaced_by UUID REFERENCES auth_sessions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX auth_sessions_user_idx
  ON auth_sessions (user_id, created_at DESC);
CREATE INDEX auth_sessions_family_idx
  ON auth_sessions (family_id);
CREATE INDEX auth_sessions_active_expiry_idx
  ON auth_sessions (expires_at)
  WHERE revoked_at IS NULL;
