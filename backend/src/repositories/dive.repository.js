const database = require("../config/database");

const diveColumns = `
  id, user_id, name, dive_date, duration_minutes, max_depth_meters,
  ballast_kg, equipment_ownership, suit_type, suit_thickness_mm,
  cylinder_material, cylinder_volume_liters, water_type,
  dive_center, latitude, longitude, location_precision,
  comments, created_at, updated_at
`;

// Columns a client writes on create and on a full PUT update, in the order of
// writableValues().
const writableColumns = [
  "name", "dive_date", "duration_minutes", "max_depth_meters",
  "ballast_kg", "equipment_ownership", "suit_type", "suit_thickness_mm",
  "cylinder_material", "cylinder_volume_liters", "water_type", "dive_center",
  "latitude", "longitude", "location_precision", "comments"
];

function locationValues(dive) {
  if (dive.latitude === undefined) return [null, null, null];
  const decimals = dive.locationPrecision === "approximate" ? 2 : 5;
  return [
    Number(dive.latitude.toFixed(decimals)),
    Number(dive.longitude.toFixed(decimals)),
    dive.locationPrecision
  ];
}

function writableValues(dive) {
  return [
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
    ...locationValues(dive),
    dive.comments || null
  ];
}

async function create(userId, dive, db = database) {
  const values = [userId, ...writableValues(dive)];
  const placeholders = values.map((_value, index) => `$${index + 1}`);
  const result = await db.query(
    `INSERT INTO dives (user_id, ${writableColumns.join(", ")})
     VALUES (${placeholders.join(", ")})
     RETURNING ${diveColumns}`,
    values
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

// Collects "column op $n" conditions for one user's dives; `add` takes SQL with
// a single "?" that becomes the next numbered parameter.
function userConditions(userId) {
  const conditions = ["user_id = $1"];
  const values = [userId];
  return {
    conditions,
    values,
    add(sql, value) {
      values.push(value);
      conditions.push(sql.replace("?", `$${values.length}`));
    },
    get whereClause() {
      return conditions.join(" AND ");
    }
  };
}

// Ownership check for sub-resources (photos, shares, reflection) that do not
// need the dive itself.
async function existsForUser(diveId, userId) {
  const result = await database.query(
    "SELECT 1 FROM dives WHERE id = $1 AND user_id = $2",
    [diveId, userId]
  );
  return result.rowCount > 0;
}

// Locks the user's dive row until the transaction ends. New photos (and any
// other row referencing the dive) wait for the lock, so counts and storage
// keys read afterwards stay true until COMMIT. Returns false if not owned.
async function lockForUser(diveId, userId, client) {
  const result = await client.query(
    "SELECT 1 FROM dives WHERE id = $1 AND user_id = $2 FOR UPDATE",
    [diveId, userId]
  );
  return result.rowCount > 0;
}

function buildListQuery(userId, filters) {
  const where = userConditions(userId);

  if (filters.dateFrom) where.add("dive_date >= ?", filters.dateFrom);
  if (filters.dateTo) where.add("dive_date <= ?", filters.dateTo);
  if (filters.diveCenter) {
    where.add("dive_center ILIKE ?", `%${filters.diveCenter}%`);
  }
  if (filters.minDepth !== undefined) {
    where.add("max_depth_meters >= ?", filters.minDepth);
  }
  if (filters.maxDepth !== undefined) {
    where.add("max_depth_meters <= ?", filters.maxDepth);
  }

  return {
    whereClause: where.whereClause,
    values: where.values
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

function rangeCounts(column, ranges, aliasPrefix) {
  return ranges
    .map((range, index) => `COUNT(*) FILTER (WHERE ${column} >= ${range.min}${range.max === null ? "" : ` AND ${column} < ${range.max}`})::INTEGER AS ${aliasPrefix}${index}`)
    .join(",\n              ");
}

// The centres the user dived with most; ties go to the most recently visited.
function findTopCenters(userId, limit) {
  return database.query(
    `SELECT dive_center AS name, COUNT(*)::INTEGER AS total
       FROM dives
      WHERE user_id = $1 AND dive_center IS NOT NULL
      GROUP BY dive_center
      ORDER BY total DESC, MAX(dive_date) DESC, dive_center
      LIMIT $2`,
    [userId, limit]
  );
}

// One row per calendar month from `firstMonth` (an SQL date expression) up to
// the current month, with the user's dives of that month joined in so that
// `columns` can aggregate them. Months without dives are kept.
function findMonthlySeries(userId, firstMonth, columns) {
  return database.query(
    `WITH months AS (
       SELECT generate_series(
         ${firstMonth},
         date_trunc('month', CURRENT_DATE),
         INTERVAL '1 month'
       )::date AS month
     )
     SELECT TO_CHAR(months.month, 'YYYY-MM') AS month,
            ${columns}
       FROM months
       LEFT JOIN dives
         ON dives.user_id = $1
        AND dives.dive_date >= months.month
        AND dives.dive_date < months.month + INTERVAL '1 month'
      GROUP BY months.month
      ORDER BY months.month`,
    [userId]
  );
}

const statsQueries = {
  summary: (userId) => database.query(
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
  favoriteCenter: (userId) => findTopCenters(userId, 1),
  // The last six months, the current one included.
  recentMonths: (userId) => findMonthlySeries(
    userId,
    "date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'",
    `COUNT(dives.id)::INTEGER AS total,
            COALESCE(SUM(dives.duration_minutes), 0)::INTEGER AS minutes`
  ),
  // The record dives (deepest and longest); ties go to the most recent.
  records: (userId) => database.query(
    `(SELECT 'deepest' AS record, id, name, dive_date, dive_center, max_depth_meters, duration_minutes
        FROM dives WHERE user_id = $1
       ORDER BY max_depth_meters DESC, dive_date DESC, id DESC LIMIT 1)
     UNION ALL
     (SELECT 'longest' AS record, id, name, dive_date, dive_center, max_depth_meters, duration_minutes
        FROM dives WHERE user_id = $1
       ORDER BY duration_minutes DESC, dive_date DESC, id DESC LIMIT 1)`,
    [userId]
  ),
  ranges: (userId) => database.query(
    `SELECT ${rangeCounts("max_depth_meters", DEPTH_RANGES, "r")},
            ${rangeCounts("duration_minutes", DURATION_RANGES, "d")},
            ROUND(AVG(duration_minutes))::INTEGER AS average_duration_minutes
       FROM dives
      WHERE user_id = $1`,
    [userId]
  ),
  // This year month by month (January to the current month) and the same
  // stretch of last year, for comparison.
  yearMonths: (userId) => findMonthlySeries(
    userId,
    "date_trunc('year', CURRENT_DATE)",
    `COUNT(dives.id)::INTEGER AS total,
            (SELECT COUNT(*)::INTEGER FROM dives
              WHERE user_id = $1
                AND dive_date >= date_trunc('year', CURRENT_DATE) - INTERVAL '1 year'
                AND dive_date <= CURRENT_DATE - INTERVAL '1 year') AS previous_year_total`
  )
};

async function getStatsByUserId(userId) {
  const [summary, favoriteCenter, recentMonths, records, ranges, yearMonths] =
    await Promise.all([
      statsQueries.summary(userId),
      statsQueries.favoriteCenter(userId),
      statsQueries.recentMonths(userId),
      statsQueries.records(userId),
      statsQueries.ranges(userId),
      statsQueries.yearMonths(userId)
    ]);

  const rangeTotals = ranges.rows[0];
  const record = (name) => records.rows.find((row) => row.record === name) || null;
  return {
    ...summary.rows[0],
    favorite_center: favoriteCenter.rows[0] || null,
    monthly_activity: recentMonths.rows,
    deepest_dive: record("deepest"),
    longest_dive: record("longest"),
    average_duration_minutes: rangeTotals.average_duration_minutes,
    depth_ranges: DEPTH_RANGES.map((range, index) => ({ label: range.label, total: rangeTotals[`r${index}`] })),
    duration_ranges: DURATION_RANGES.map((range, index) => ({ label: range.label, total: rangeTotals[`d${index}`] })),
    year_activity: {
      months: yearMonths.rows.map(({ month, total }) => ({ month, total })),
      previous_year_total: yearMonths.rows[0]?.previous_year_total ?? 0
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

const insightsQueries = {
  // Ballast patterns per equipment configuration (TD-022).
  ballastConfigurations: (userId) => database.query(
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
  equipmentOwnership: (userId) => database.query(
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
  frequentCenters: (userId) => findTopCenters(userId, 3),
  frequentBuddies: (userId) => database.query(
    `SELECT b.name, COUNT(*)::INTEGER AS total
       FROM dive_buddies b
       JOIN dives d ON d.id = b.dive_id
      WHERE d.user_id = $1
      GROUP BY b.name
      ORDER BY total DESC, MAX(d.dive_date) DESC, b.name
      LIMIT 3`,
    [userId]
  ),
  // The 12 most recent dives, oldest first.
  evolution: (userId) => database.query(
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
  // The 8 most recent reflections, newest first (reversed by the caller).
  reflections: (userId) => database.query(
    `SELECT d.dive_date, d.name, r.practiced_skill, r.comfort, r.next_goal
       FROM dive_reflections r
       JOIN dives d ON d.id = r.dive_id
      WHERE d.user_id = $1
      ORDER BY d.dive_date DESC, d.id DESC
      LIMIT 8`,
    [userId]
  )
};

async function getInsightsByUserId(userId) {
  const [ballast, ownership, centers, buddies, evolution, reflections] =
    await Promise.all([
      insightsQueries.ballastConfigurations(userId),
      insightsQueries.equipmentOwnership(userId),
      insightsQueries.frequentCenters(userId),
      insightsQueries.frequentBuddies(userId),
      insightsQueries.evolution(userId),
      insightsQueries.reflections(userId)
    ]);

  return {
    ballast_configurations: ballast.rows,
    equipment_ownership: ownership.rows,
    frequent_centers: centers.rows,
    frequent_buddies: buddies.rows,
    evolution: evolution.rows,
    reflection_evolution: reflections.rows.reverse()
  };
}

const configurationColumns = {
  waterType: "water_type",
  suitType: "suit_type",
  suitThicknessMm: "suit_thickness_mm",
  cylinderMaterial: "cylinder_material",
  cylinderVolumeLiters: "cylinder_volume_liters"
};

// Up to five past dives with recorded ballast and the same value in every
// configuration field the caller gave (TD-021).
async function findConfigurationMemory(userId, filters) {
  const where = userConditions(userId);
  where.conditions.push("ballast_kg IS NOT NULL");
  Object.entries(configurationColumns).forEach(([key, column]) => {
    if (filters[key] !== undefined) where.add(`${column} = ?`, filters[key]);
  });
  if (filters.excludeDiveId) where.add("id <> ?", filters.excludeDiveId);

  const result = await database.query(
    `SELECT ${diveColumns} FROM dives
      WHERE ${where.whereClause}
      ORDER BY dive_date DESC, id DESC LIMIT 5`,
    where.values
  );
  return result.rows;
}

async function update(diveId, userId, dive, db = database) {
  const values = writableValues(dive);
  const assignments = writableColumns.map((column, index) => `${column} = $${index + 1}`);
  const result = await db.query(
    `UPDATE dives
        SET ${assignments.join(", ")},
            updated_at = NOW()
      WHERE id = $${values.length + 1} AND user_id = $${values.length + 2}
      RETURNING ${diveColumns}`,
    [...values, diveId, userId]
  );

  return result.rows[0] || null;
}

async function remove(diveId, userId, db = database) {
  const result = await db.query(
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
  existsForUser,
  lockForUser,
  findAllByUserId,
  getStatsByUserId,
  findMapByUserId,
  getInsightsByUserId,
  findConfigurationMemory,
  update,
  remove
};
