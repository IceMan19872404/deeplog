CREATE TABLE dive_reflections (
    dive_id BIGINT PRIMARY KEY REFERENCES dives(id) ON DELETE CASCADE,
    went_well TEXT,
    improve_next TEXT,
    practiced_skill VARCHAR(120),
    comfort VARCHAR(16),
    incidents TEXT,
    next_goal VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dive_reflections_comfort_valid CHECK (
      comfort IS NULL OR comfort IN ('comfortable', 'mixed', 'challenging')
    ),
    CONSTRAINT dive_reflections_has_content CHECK (
      went_well IS NOT NULL OR improve_next IS NOT NULL
      OR practiced_skill IS NOT NULL OR comfort IS NOT NULL
      OR incidents IS NOT NULL OR next_goal IS NOT NULL
    )
);

CREATE INDEX dive_reflections_updated_idx ON dive_reflections (updated_at DESC);
