// Maps database rows (snake_case, NUMERIC as strings) to the JSON shapes of the
// dive endpoints. Every dive-related response goes through these helpers so a
// field is converted the same way wherever it appears.

function toDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

// PostgreSQL NUMERIC columns arrive as strings; NULL stays null.
function toNumberOrNull(value) {
  return value === null ? null : Number(value);
}

function toPhotoResponse(diveId, photo) {
  return {
    id: photo.id,
    originalName: photo.original_name,
    mimeType: photo.mime_type,
    sizeBytes: photo.size_bytes,
    url: `/api/v1/dives/${diveId}/photos/${photo.id}/content`,
    createdAt: photo.created_at
  };
}

// Ballast and equipment fields, shared by the owner's dive and public shares.
function toEquipmentResponse(dive) {
  return {
    ballastKg: toNumberOrNull(dive.ballast_kg),
    equipmentOwnership: dive.equipment_ownership,
    suitType: dive.suit_type,
    suitThicknessMm: toNumberOrNull(dive.suit_thickness_mm),
    cylinderMaterial: dive.cylinder_material,
    cylinderVolumeLiters: toNumberOrNull(dive.cylinder_volume_liters),
    waterType: dive.water_type
  };
}

function toReflectionResponse(reflection) {
  if (!reflection) return null;
  return {
    wentWell: reflection.went_well,
    improveNext: reflection.improve_next,
    practicedSkill: reflection.practiced_skill,
    comfort: reflection.comfort,
    incidents: reflection.incidents,
    nextGoal: reflection.next_goal,
    createdAt: reflection.created_at,
    updatedAt: reflection.updated_at
  };
}

function toDiveResponse(dive) {
  return {
    id: dive.id,
    // Position in the logbook (1 = first dive). Only on reads that number dives.
    ...(dive.dive_number ? { diveNumber: dive.dive_number } : {}),
    name: dive.name,
    date: toDateOnly(dive.dive_date),
    durationMinutes: dive.duration_minutes,
    maxDepthMeters: Number(dive.max_depth_meters),
    ...toEquipmentResponse(dive),
    buddies: dive.buddies || [],
    photos: (dive.photos || []).map((photo) => toPhotoResponse(dive.id, photo)),
    diveCenter: dive.dive_center,
    location: dive.latitude === null ? null : {
      latitude: Number(dive.latitude),
      longitude: Number(dive.longitude),
      precision: dive.location_precision
    },
    comments: dive.comments,
    reflection: toReflectionResponse(dive.reflection),
    createdAt: dive.created_at,
    updatedAt: dive.updated_at
  };
}

function toMapPointResponse(dive) {
  return {
    id: dive.id,
    name: dive.name,
    date: toDateOnly(dive.dive_date),
    latitude: Number(dive.latitude),
    longitude: Number(dive.longitude),
    precision: dive.location_precision
  };
}

// A record dive for the Estadísticas detail panels (just enough to show it and
// open its record).
function toStatsRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    date: toDateOnly(row.dive_date),
    diveCenter: row.dive_center,
    maxDepthMeters: Number(row.max_depth_meters),
    durationMinutes: row.duration_minutes
  };
}

function toStatsResponse(stats) {
  return {
    totalDives: stats.total_dives,
    totalMinutes: stats.total_minutes,
    maxDepthMeters: toNumberOrNull(stats.max_depth_meters),
    averageDepthMeters: toNumberOrNull(stats.average_depth_meters),
    longestDurationMinutes: stats.longest_duration_minutes,
    divesThisYear: stats.dives_this_year,
    favoriteCenter: stats.favorite_center,
    monthlyActivity: stats.monthly_activity,
    averageDurationMinutes: stats.average_duration_minutes,
    deepestDive: toStatsRecord(stats.deepest_dive),
    longestDive: toStatsRecord(stats.longest_dive),
    depthRanges: stats.depth_ranges,
    durationRanges: stats.duration_ranges,
    yearActivity: {
      months: stats.year_activity.months,
      previousYearTotal: stats.year_activity.previous_year_total
    }
  };
}

const INSIGHTS_METHODOLOGY = {
  ballast: "Averages group only dives with recorded ballast and matching configuration.",
  ownership: "Averages compare recorded dives, not controlled conditions.",
  evolution: "Shows up to the 12 most recent dives in chronological order.",
  warning: "Personal history only. These metrics are not safety recommendations."
};

function toInsightsResponse(insights) {
  return {
    ballastConfigurations: insights.ballast_configurations.map((row) => ({
      suitType: row.suit_type,
      suitThicknessMm: toNumberOrNull(row.suit_thickness_mm),
      cylinderMaterial: row.cylinder_material,
      cylinderVolumeLiters: toNumberOrNull(row.cylinder_volume_liters),
      waterType: row.water_type,
      sampleSize: row.sample_size,
      averageBallastKg: Number(row.average_ballast_kg),
      minimumBallastKg: Number(row.minimum_ballast_kg),
      maximumBallastKg: Number(row.maximum_ballast_kg)
    })),
    equipmentOwnership: insights.equipment_ownership.map((row) => ({
      type: row.equipment_ownership,
      sampleSize: row.sample_size,
      averageDurationMinutes: Number(row.average_duration_minutes),
      averageDepthMeters: Number(row.average_depth_meters)
    })),
    frequentCenters: insights.frequent_centers,
    frequentBuddies: insights.frequent_buddies,
    evolution: insights.evolution.map((row) => ({
      date: toDateOnly(row.dive_date),
      maxDepthMeters: Number(row.max_depth_meters),
      durationMinutes: row.duration_minutes
    })),
    reflectionEvolution: insights.reflection_evolution.map((row) => ({
      date: toDateOnly(row.dive_date),
      diveName: row.name,
      practicedSkill: row.practiced_skill,
      comfort: row.comfort,
      nextGoal: row.next_goal
    })),
    methodology: INSIGHTS_METHODOLOGY
  };
}

module.exports = toDiveResponse;
module.exports.toDateOnly = toDateOnly;
module.exports.toNumberOrNull = toNumberOrNull;
module.exports.toPhotoResponse = toPhotoResponse;
module.exports.toEquipmentResponse = toEquipmentResponse;
module.exports.toMapPointResponse = toMapPointResponse;
module.exports.toStatsResponse = toStatsResponse;
module.exports.toInsightsResponse = toInsightsResponse;
