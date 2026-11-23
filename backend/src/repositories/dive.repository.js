const database = require("../config/database");

const diveColumns = `
  id, user_id, name, dive_date, duration_minutes, max_depth_meters,
  ballast_kg, equipment_ownership, suit_type, suit_thickness_mm,
  cylinder_material, cylinder_volume_liters, water_type,
  dive_center, latitude, longitude, location_precision,
  comments, created_at, updated_at
`;

function locationValues(dive) {
  if (dive.latitude === undefined) return [null, null, null];
  const decimals = dive.locationPrecision === "approximate" ? 2 : 5;
  return [
    Number(dive.latitude.toFixed(decimals)),
    Number(dive.longitude.toFixed(decimals)),
    dive.locationPrecision
  ];
}

async function create(userId, dive) {
  const result = await database.query(
    `INSERT INTO dives (
       user_id, name, dive_date, duration_minutes, max_depth_meters,
       ballast_kg, equipment_ownership, suit_type, suit_thickness_mm,
       cylinder_material, cylinder_volume_liters, water_type, dive_center,
       latitude, longitude, location_precision, comments
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING ${diveColumns}`,
    (() => {
      const [latitude, longitude, precision] = locationValues(dive);
      return [
      userId,
      dive.name,
      dive.date,
      dive.durationMinutes,
      dive.maxDepthMeters,
      dive.ballastKg ?? null,
      dive.equipmentOwnership || null,
      dive.suitType || null,
      dive.suitThicknessMm ?? null,
      dive.cylinderMaterial || null,
      dive.cylinderVolumeLiters ?? null,
      dive.waterType || null,
      dive.diveCenter || null,
      latitude,
      longitude,
      precision,
      dive.comments || null
      ];
    })()
  );

  return result.rows[0];
}

// A dive's number in the diver's logbook: 1 is the oldest. Ties on the same
// day follow the order in which they were logged. It is always counted over
// every dive of the user, so filters and pagination never renumber anything.
const numberedDives = `
  (SELECT ${diveColumns},
          ROW_NUMBER() OVER (ORDER BY dive_date, id)::INTEGER AS dive_number
     FROM dives
    WHERE user_id = $1) AS numbered`;

async function findByIdAndUserId(diveId, userId) {
  const result = await database.query(
    `SELECT *
       FROM ${numberedDives}
      WHERE id = $2`,
    [userId, diveId]
  );

  return result.rows[0] || null;
}

function buildListQuery(userId, filters) {
  const conditions = ["user_id = $1"];
  const values = [userId];

  function addCondition(sql, value) {
    values.push(value);
    conditions.push(sql.replace("?", `$${values.length}`));
  }

  if (filters.dateFrom) addCondition("dive_date >= ?", filters.dateFrom);
  if (filters.dateTo) addCondition("dive_date <= ?", filters.dateTo);
  if (filters.diveCenter) {
    addCondition("dive_center ILIKE ?", `%${filters.diveCenter}%`);
  }
  if (filters.minDepth !== undefined) {
    addCondition("max_depth_meters >= ?", filters.minDepth);
  }
  if (filters.maxDepth !== undefined) {
    addCondition("max_depth_meters <= ?", filters.maxDepth);
  }

  return {
    whereClause: conditions.join(" AND "),
    values
  };
}

async function findAllByUserId(userId, filters) {
  const { whereClause, values } = buildListQuery(userId, filters);
  const countResult = await database.query(
    `SELECT COUNT(*)::INTEGER AS total
       FROM dives
      WHERE ${whereClause}`,
    values
  );

  const offset = (filters.page - 1) * filters.limit;
  const paginatedValues = [...values, filters.limit, offset];

  const result = await database.query(
    `SELECT *
       FROM ${numberedDives}
      WHERE ${whereClause}
      ORDER BY dive_date DESC, id DESC
      LIMIT $${paginatedValues.length - 1} OFFSET $${paginatedValues.length}`,
    paginatedValues
  );

  return {
    dives: result.rows,
    total: countResult.rows[0].total
  };
}

// Depth bands follow common recreational certification limits (Open Water 18 m,
// Advanced 30 m, Deep 40 m); duration bands are plain time slots.
const DEPTH_RANGES = [
  { label: "0–12 m", min: 0, max: 12 },
  { label: "12–18 m", min: 12, max: 18 },
  { label: "18–30 m", min: 18, max: 30 },
  { label: "30–40 m", min: 30, max: 40 },
  { label: "Más de 40 m", min: 40, max: null }
];
const DURATION_RANGES = [
  { label: "Menos de 30 min", min: 0, max: 30 },
  { label: "30–45 min", min: 30, max: 45 },
  { label: "45–60 min", min: 45, max: 60 },
  { label: "Más de 60 min", min: 60, max: null }
];

function rangeCounts(column, ranges) {
  return ranges
    .map((range, index) => `COUNT(*) FILTER (WHERE ${column} >= ${range.min}${range.max === null ? "" : ` AND ${column} < ${range.max}`})::INTEGER AS r${index}`)
    .join(",\n              ");
}

async function getStatsByUserId(userId) {
  const [summaryResult, centerResult, activityResult, recordsResult, rangesResult, yearResult] = await Promise.all([
    database.query(
      `SELECT COUNT(*)::INTEGER AS total_dives,
              COALESCE(SUM(duration_minutes), 0)::INTEGER AS total_minutes,
              MAX(max_depth_meters) AS max_depth_meters,
              ROUND(AVG(max_depth_meters), 1) AS average_depth_meters,
              MAX(duration_minutes)::INTEGER AS longest_duration_minutes,
              COUNT(*) FILTER (
                WHERE EXTRACT(YEAR FROM dive_date) = EXTRACT(YEAR FROM CURRENT_DATE)
              )::INTEGER AS dives_this_year
         FROM dives
        WHERE user_id = $1`,
      [userId]
    ),
    database.query(
      `SELECT dive_center AS name, COUNT(*)::INTEGER AS total
         FROM dives
        WHERE user_id = $1 AND dive_center IS NOT NULL
        GROUP BY dive_center
        ORDER BY total DESC, MAX(dive_date) DESC, dive_center
        LIMIT 1`,
      [userId]
    ),
    database.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         )::date AS month
       )
       SELECT TO_CHAR(months.month, 'YYYY-MM') AS month,
              COUNT(dives.id)::INTEGER AS total,
              COALESCE(SUM(dives.duration_minutes), 0)::INTEGER AS minutes
         FROM months
         LEFT JOIN dives
           ON dives.user_id = $1
          AND dives.dive_date >= months.month
          AND dives.dive_date < months.month + INTERVAL '1 month'
        GROUP BY months.month
        ORDER BY months.month`,
      [userId]
    ),
    // The record dives (deepest and longest); ties go to the most recent.
    database.query(
      `(SELECT 'deepest' AS record, id, name, dive_date, dive_center, max_depth_meters, duration_minutes
          FROM dives WHERE user_id = $1
         ORDER BY max_depth_meters DESC, dive_date DESC, id DESC LIMIT 1)
       UNION ALL
       (SELECT 'longest' AS record, id, name, dive_date, dive_center, max_depth_meters, duration_minutes
          FROM dives WHERE user_id = $1
         ORDER BY duration_minutes DESC, dive_date DESC, id DESC LIMIT 1)`,
      [userId]
    ),
    database.query(
      `SELECT ${rangeCounts("max_depth_meters", DEPTH_RANGES)},
              ${rangeCounts("duration_minutes", DURATION_RANGES).replace(/AS r(\d)/g, "AS d$1")},
              ROUND(AVG(duration_minutes))::INTEGER AS average_duration_minutes
         FROM dives
        WHERE user_id = $1`,
      [userId]
    ),
    // This year month by month (January to the current month) and the same
    // stretch of last year, for comparison.
    database.query(
      `WITH months AS (
         SELECT generate_series(
           date_trunc('year', CURRENT_DATE),
           date_trunc('month', CURRENT_DATE),
           INTERVAL '1 month'
         )::date AS month
       )
       SELECT TO_CHAR(months.month, 'YYYY-MM') AS month,
              COUNT(dives.id)::INTEGER AS total,
              (SELECT COUNT(*)::INTEGER FROM dives
                WHERE user_id = $1
                  AND dive_date >= date_trunc('year', CURRENT_DATE) - INTERVAL '1 year'
                  AND dive_date <= CURRENT_DATE - INTERVAL '1 year') AS previous_year_total
         FROM months
         LEFT JOIN dives
           ON dives.user_id = $1
          AND dives.dive_date >= months.month
          AND dives.dive_date < months.month + INTERVAL '1 month'
        GROUP BY months.month
        ORDER BY months.month`,
      [userId]
    )
  ]);

  const ranges = rangesResult.rows[0];
  const record = (name) => recordsResult.rows.find((row) => row.record === name) || null;
  return {
    ...summaryResult.rows[0],
    favorite_center: centerResult.rows[0] || null,
    monthly_activity: activityResult.rows,
    deepest_dive: record("deepest"),
    longest_dive: record("longest"),
    average_duration_minutes: ranges.average_duration_minutes,
    depth_ranges: DEPTH_RANGES.map((range, index) => ({ label: range.label, total: ranges[`r${index}`] })),
    duration_ranges: DURATION_RANGES.map((range, index) => ({ label: range.label, total: ranges[`d${index}`] })),
    year_activity: {
      months: yearResult.rows.map(({ month, total }) => ({ month, total })),
      previous_year_total: yearResult.rows[0]?.previous_year_total ?? 0
    }
  };
}

async function findMapByUserId(userId) {
  const result = await database.query(
    `SELECT id, name, dive_date, latitude, longitude, location_precision
       FROM dives
      WHERE user_id = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY dive_date DESC, id DESC`,
    [userId]
  );
  return result.rows;
}

async function getInsightsByUserId(userId) {
  const [ballastResult, ownershipResult, centersResult, buddiesResult, evolutionResult, reflectionsResult] =
    await Promise.all([
      database.query(
        `SELECT suit_type, suit_thickness_mm, cylinder_material,
                cylinder_volume_liters, water_type,
                COUNT(*)::INTEGER AS sample_size,
                ROUND(AVG(ballast_kg), 1) AS average_ballast_kg,
                MIN(ballast_kg) AS minimum_ballast_kg,
                MAX(ballast_kg) AS maximum_ballast_kg
           FROM dives
          WHERE user_id = $1 AND ballast_kg IS NOT NULL
            AND (suit_type IS NOT NULL OR cylinder_material IS NOT NULL
                 OR water_type IS NOT NULL)
          GROUP BY suit_type, suit_thickness_mm, cylinder_material,
                   cylinder_volume_liters, water_type
          ORDER BY sample_size DESC, MAX(dive_date) DESC
          LIMIT 6`,
        [userId]
      ),
      database.query(
        `SELECT equipment_ownership,
                COUNT(*)::INTEGER AS sample_size,
                ROUND(AVG(duration_minutes), 1) AS average_duration_minutes,
                ROUND(AVG(max_depth_meters), 1) AS average_depth_meters
           FROM dives
          WHERE user_id = $1 AND equipment_ownership IS NOT NULL
          GROUP BY equipment_ownership
          ORDER BY equipment_ownership`,
        [userId]
      ),
      database.query(
        `SELECT dive_center AS name, COUNT(*)::INTEGER AS total
           FROM dives
          WHERE user_id = $1 AND dive_center IS NOT NULL
          GROUP BY dive_center
          ORDER BY total DESC, MAX(dive_date) DESC, dive_center
          LIMIT 3`,
        [userId]
      ),
      database.query(
        `SELECT b.name, COUNT(*)::INTEGER AS total
           FROM dive_buddies b
           JOIN dives d ON d.id = b.dive_id
          WHERE d.user_id = $1
          GROUP BY b.name
          ORDER BY total DESC, MAX(d.dive_date) DESC, b.name
          LIMIT 3`,
        [userId]
      ),
      database.query(
        `SELECT dive_date, max_depth_meters, duration_minutes
           FROM (
             SELECT id, dive_date, max_depth_meters, duration_minutes
               FROM dives
              WHERE user_id = $1
              ORDER BY dive_date DESC, id DESC
              LIMIT 12
           ) recent
          ORDER BY dive_date, id`,
        [userId]
      ),
      database.query(
        `SELECT d.dive_date, d.name, r.practiced_skill, r.comfort, r.next_goal
           FROM dive_reflections r
           JOIN dives d ON d.id = r.dive_id
          WHERE d.user_id = $1
          ORDER BY d.dive_date DESC, d.id DESC
          LIMIT 8`,
        [userId]
      )
    ]);

  return {
    ballast_configurations: ballastResult.rows,
    equipment_ownership: ownershipResult.rows,
    frequent_centers: centersResult.rows,
    frequent_buddies: buddiesResult.rows,
    evolution: evolutionResult.rows,
    reflection_evolution: reflectionsResult.rows.reverse()
  };
}

async function findConfigurationMemory(userId, filters) {
  const conditions = ["user_id = $1", "ballast_kg IS NOT NULL"];
  const values = [userId];
  const fields = {
    waterType: "water_type", suitType: "suit_type",
    suitThicknessMm: "suit_thickness_mm", cylinderMaterial: "cylinder_material",
    cylinderVolumeLiters: "cylinder_volume_liters"
  };
  Object.entries(fields).forEach(([key, column]) => {
    if (filters[key] === undefined) return;
    values.push(filters[key]);
    conditions.push(`${column} = $${values.length}`);
  });
  if (filters.excludeDiveId) {
    values.push(filters.excludeDiveId);
    conditions.push(`id <> $${values.length}`);
  }
  const result = await database.query(
    `SELECT ${diveColumns} FROM dives
      WHERE ${conditions.join(" AND ")}
      ORDER BY dive_date DESC, id DESC LIMIT 5`, values
  );
  return result.rows;
}

async function update(diveId, userId, dive) {
  const [latitude, longitude, precision] = locationValues(dive);
  const result = await database.query(
    `UPDATE dives
        SET name = $1,
            dive_date = $2,
            duration_minutes = $3,
            max_depth_meters = $4,
            ballast_kg = $5,
            equipment_ownership = $6,
            suit_type = $7,
            suit_thickness_mm = $8,
            cylinder_material = $9,
            cylinder_volume_liters = $10,
            water_type = $11,
            dive_center = $12,
            latitude = $13,
            longitude = $14,
            location_precision = $15,
            comments = $16,
            updated_at = NOW()
      WHERE id = $17 AND user_id = $18
      RETURNING ${diveColumns}`,
    [
      dive.name,
      dive.date,
      dive.durationMinutes,
      dive.maxDepthMeters,
      dive.ballastKg ?? null,
      dive.equipmentOwnership || null,
      dive.suitType || null,
      dive.suitThicknessMm ?? null,
      dive.cylinderMaterial || null,
      dive.cylinderVolumeLiters ?? null,
      dive.waterType || null,
      dive.diveCenter || null,
      latitude,
      longitude,
      precision,
      dive.comments || null,
      diveId,
      userId
    ]
  );

  return result.rows[0] || null;
}

async function remove(diveId, userId) {
  const result = await database.query(
    `DELETE FROM dives
      WHERE id = $1 AND user_id = $2
      RETURNING id`,
    [diveId, userId]
  );

  return Boolean(result.rows[0]);
}

module.exports = {
  create,
  findByIdAndUserId,
  findAllByUserId,
  getStatsByUserId,
  findMapByUserId,
  getInsightsByUserId,
  findConfigurationMemory,
  update,
  remove
};
