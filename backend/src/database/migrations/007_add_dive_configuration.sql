ALTER TABLE dives
  ADD COLUMN suit_type VARCHAR(12),
  ADD COLUMN suit_thickness_mm NUMERIC(4, 1),
  ADD COLUMN cylinder_material VARCHAR(10),
  ADD COLUMN cylinder_volume_liters NUMERIC(4, 1),
  ADD COLUMN water_type VARCHAR(10),
  ADD CONSTRAINT dives_suit_type_valid CHECK (
    suit_type IS NULL OR suit_type IN ('wetsuit', 'drysuit', 'shorty', 'none')
  ),
  ADD CONSTRAINT dives_suit_thickness_valid CHECK (
    suit_thickness_mm IS NULL OR suit_thickness_mm BETWEEN 0 AND 15
  ),
  ADD CONSTRAINT dives_cylinder_material_valid CHECK (
    cylinder_material IS NULL OR cylinder_material IN ('steel', 'aluminum')
  ),
  ADD CONSTRAINT dives_cylinder_volume_valid CHECK (
    cylinder_volume_liters IS NULL OR cylinder_volume_liters BETWEEN 3 AND 20
  ),
  ADD CONSTRAINT dives_water_type_valid CHECK (
    water_type IS NULL OR water_type IN ('salt', 'fresh')
  );

CREATE INDEX dives_user_configuration_idx ON dives (
  user_id, water_type, suit_type, cylinder_material, dive_date DESC
);
