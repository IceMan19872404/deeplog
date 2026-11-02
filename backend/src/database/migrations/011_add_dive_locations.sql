ALTER TABLE dives
  ADD COLUMN latitude NUMERIC(8, 5),
  ADD COLUMN longitude NUMERIC(8, 5),
  ADD COLUMN location_precision VARCHAR(12);

ALTER TABLE dives
  ADD CONSTRAINT dives_location_pair_valid CHECK (
    (latitude IS NULL AND longitude IS NULL AND location_precision IS NULL)
    OR
    (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
      AND location_precision IN ('exact', 'approximate'))
  );

CREATE INDEX dives_user_location_idx ON dives (user_id)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
