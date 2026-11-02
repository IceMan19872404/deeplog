CREATE TABLE user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio VARCHAR(500),
    certification_level VARCHAR(24),
    diving_since SMALLINT,
    share_name_by_default BOOLEAN NOT NULL DEFAULT FALSE,
    photo_storage_key VARCHAR(255),
    photo_mime_type VARCHAR(32),
    photo_size_bytes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_profiles_certification_check CHECK (
      certification_level IS NULL OR certification_level IN (
        'beginner', 'open_water', 'advanced', 'rescue', 'divemaster', 'instructor'
      )
    ),
    CONSTRAINT user_profiles_diving_since_check CHECK (
      diving_since IS NULL OR diving_since BETWEEN 1950 AND 2100
    ),
    CONSTRAINT user_profiles_photo_metadata_check CHECK (
      (photo_storage_key IS NULL AND photo_mime_type IS NULL AND photo_size_bytes IS NULL)
      OR
      (photo_storage_key IS NOT NULL AND photo_mime_type IS NOT NULL AND photo_size_bytes > 0)
    )
);
