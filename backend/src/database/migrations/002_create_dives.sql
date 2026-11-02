CREATE TABLE dives (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    dive_date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    max_depth_meters NUMERIC(5, 2) NOT NULL,
    dive_center VARCHAR(120),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dives_duration_valid
      CHECK (duration_minutes BETWEEN 1 AND 300),
    CONSTRAINT dives_depth_valid
      CHECK (max_depth_meters > 0 AND max_depth_meters <= 150),
    CONSTRAINT dives_date_not_future
      CHECK (dive_date <= CURRENT_DATE)
);

CREATE INDEX dives_user_date_idx ON dives (user_id, dive_date DESC, id DESC);
