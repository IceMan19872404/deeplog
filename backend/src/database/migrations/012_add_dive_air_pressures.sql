-- Cylinder pressure at the start and end of the dive, in bar. Both are
-- optional but go together: with them DeepLog estimates air consumption.
ALTER TABLE dives
  ADD COLUMN start_pressure_bar SMALLINT,
  ADD COLUMN end_pressure_bar SMALLINT,
  ADD CONSTRAINT dives_air_pressures_together CHECK (
    (start_pressure_bar IS NULL) = (end_pressure_bar IS NULL)
  ),
  ADD CONSTRAINT dives_air_pressures_valid CHECK (
    start_pressure_bar IS NULL OR (
      start_pressure_bar BETWEEN 50 AND 300
      AND end_pressure_bar BETWEEN 0 AND 300
      AND end_pressure_bar < start_pressure_bar
    )
  );
