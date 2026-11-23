function toDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
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
    ballastKg: dive.ballast_kg === null ? null : Number(dive.ballast_kg),
    equipmentOwnership: dive.equipment_ownership,
    suitType: dive.suit_type,
    suitThicknessMm: dive.suit_thickness_mm === null ? null : Number(dive.suit_thickness_mm),
    cylinderMaterial: dive.cylinder_material,
    cylinderVolumeLiters: dive.cylinder_volume_liters === null ? null : Number(dive.cylinder_volume_liters),
    waterType: dive.water_type,
    buddies: dive.buddies || [],
    photos: (dive.photos || []).map((photo) => ({
      id: photo.id,
      originalName: photo.original_name,
      mimeType: photo.mime_type,
      sizeBytes: photo.size_bytes,
      url: `/api/v1/dives/${dive.id}/photos/${photo.id}/content`,
      createdAt: photo.created_at
    })),
    diveCenter: dive.dive_center,
    location: dive.latitude === null ? null : {
      latitude: Number(dive.latitude),
      longitude: Number(dive.longitude),
      precision: dive.location_precision
    },
    comments: dive.comments,
    reflection: dive.reflection ? {
      wentWell: dive.reflection.went_well,
      improveNext: dive.reflection.improve_next,
      practicedSkill: dive.reflection.practiced_skill,
      comfort: dive.reflection.comfort,
      incidents: dive.reflection.incidents,
      nextGoal: dive.reflection.next_goal,
      createdAt: dive.reflection.created_at,
      updatedAt: dive.reflection.updated_at
    } : null,
    createdAt: dive.created_at,
    updatedAt: dive.updated_at
  };
}

module.exports = toDiveResponse;
module.exports.toDateOnly = toDateOnly;
