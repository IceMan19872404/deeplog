CREATE TABLE dive_buddies (
    id BIGSERIAL PRIMARY KEY,
    dive_id BIGINT NOT NULL REFERENCES dives(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    position SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dive_buddies_position_valid CHECK (position BETWEEN 0 AND 9)
);

CREATE UNIQUE INDEX dive_buddies_position_unique
  ON dive_buddies (dive_id, position);

CREATE TABLE dive_photos (
    id BIGSERIAL PRIMARY KEY,
    dive_id BIGINT NOT NULL REFERENCES dives(id) ON DELETE CASCADE,
    storage_key VARCHAR(100) NOT NULL UNIQUE,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(30) NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dive_photos_mime_valid
      CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT dive_photos_size_valid
      CHECK (size_bytes BETWEEN 1 AND 8388608)
);

CREATE INDEX dive_buddies_dive_idx ON dive_buddies (dive_id, position);
CREATE INDEX dive_photos_dive_idx ON dive_photos (dive_id, created_at, id);
