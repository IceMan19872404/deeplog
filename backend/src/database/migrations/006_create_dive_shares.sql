CREATE TABLE dive_shares (
    id BIGSERIAL PRIMARY KEY,
    public_id UUID NOT NULL UNIQUE,
    dive_id BIGINT NOT NULL REFERENCES dives(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(100),
    visibility JSONB NOT NULL,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dive_shares_visibility_object
      CHECK (jsonb_typeof(visibility) = 'object')
);

CREATE INDEX dive_shares_dive_idx ON dive_shares (dive_id, created_at DESC);
CREATE INDEX dive_shares_token_idx ON dive_shares (token_hash);
