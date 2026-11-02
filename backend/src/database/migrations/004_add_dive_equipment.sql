ALTER TABLE dives
  ADD COLUMN ballast_kg NUMERIC(5, 2),
  ADD COLUMN equipment_ownership VARCHAR(10),
  ADD CONSTRAINT dives_ballast_valid
    CHECK (ballast_kg IS NULL OR ballast_kg BETWEEN 0 AND 20),
  ADD CONSTRAINT dives_equipment_ownership_valid
    CHECK (
      equipment_ownership IS NULL
      OR equipment_ownership IN ('owned', 'rented')
    );
