const diveService = require("../services/dive.service");
const toDiveResponse = require("../utils/dive-response");
const photoService = require("../services/dive-photo.service");

async function create(req, res, next) {
  try {
    const dive = await diveService.createDive(req.auth.userId, req.body);

    return res.status(201).json({
      data: {
        dive: toDiveResponse(dive)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function list(req, res, next) {
  try {
    const result = await diveService.listDives(req.auth.userId, req.query);
    const totalPages =
      result.total === 0 ? 0 : Math.ceil(result.total / req.query.limit);

    return res.status(200).json({
      data: {
        dives: result.dives.map(toDiveResponse)
      },
      meta: {
        page: req.query.page,
        limit: req.query.limit,
        total: result.total,
        totalPages
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const dive = await diveService.getDive(req.auth.userId, req.params.diveId);

    return res.status(200).json({
      data: {
        dive: toDiveResponse(dive)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function stats(req, res, next) {
  try {
    const result = await diveService.getDiveStats(req.auth.userId);
    return res.status(200).json({
      data: {
        stats: {
          totalDives: result.total_dives,
          totalMinutes: result.total_minutes,
          maxDepthMeters: result.max_depth_meters === null
            ? null
            : Number(result.max_depth_meters),
          averageDepthMeters: result.average_depth_meters === null
            ? null
            : Number(result.average_depth_meters),
          longestDurationMinutes: result.longest_duration_minutes,
          divesThisYear: result.dives_this_year,
          favoriteCenter: result.favorite_center,
          monthlyActivity: result.monthly_activity
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function map(req, res, next) {
  try {
    const dives = await diveService.getDiveMap(req.auth.userId);
    return res.status(200).json({ data: { dives: dives.map((dive) => ({
      id: dive.id,
      name: dive.name,
      date: dive.dive_date instanceof Date
        ? dive.dive_date.toISOString().slice(0, 10)
        : dive.dive_date,
      latitude: Number(dive.latitude),
      longitude: Number(dive.longitude),
      precision: dive.location_precision
    })) } });
  } catch (error) {
    return next(error);
  }
}

async function configurationMemory(req, res, next) {
  try {
    const dives = await diveService.getConfigurationMemory(req.auth.userId, req.query);
    return res.status(200).json({ data: { dives: dives.map(toDiveResponse) } });
  } catch (error) {
    return next(error);
  }
}

async function insights(req, res, next) {
  try {
    const result = await diveService.getDiveInsights(req.auth.userId);
    return res.status(200).json({
      data: {
        insights: {
          ballastConfigurations: result.ballast_configurations.map((row) => ({
            suitType: row.suit_type,
            suitThicknessMm: row.suit_thickness_mm === null ? null : Number(row.suit_thickness_mm),
            cylinderMaterial: row.cylinder_material,
            cylinderVolumeLiters: row.cylinder_volume_liters === null ? null : Number(row.cylinder_volume_liters),
            waterType: row.water_type,
            sampleSize: row.sample_size,
            averageBallastKg: Number(row.average_ballast_kg),
            minimumBallastKg: Number(row.minimum_ballast_kg),
            maximumBallastKg: Number(row.maximum_ballast_kg)
          })),
          equipmentOwnership: result.equipment_ownership.map((row) => ({
            type: row.equipment_ownership,
            sampleSize: row.sample_size,
            averageDurationMinutes: Number(row.average_duration_minutes),
            averageDepthMeters: Number(row.average_depth_meters)
          })),
          frequentCenters: result.frequent_centers,
          frequentBuddies: result.frequent_buddies,
          evolution: result.evolution.map((row) => ({
            date: row.dive_date instanceof Date
              ? row.dive_date.toISOString().slice(0, 10)
              : row.dive_date,
            maxDepthMeters: Number(row.max_depth_meters),
            durationMinutes: row.duration_minutes
          })),
          reflectionEvolution: result.reflection_evolution.map((row) => ({
            date: row.dive_date instanceof Date
              ? row.dive_date.toISOString().slice(0, 10)
              : row.dive_date,
            diveName: row.name,
            practicedSkill: row.practiced_skill,
            comfort: row.comfort,
            nextGoal: row.next_goal
          })),
          methodology: {
            ballast: "Averages group only dives with recorded ballast and matching configuration.",
            ownership: "Averages compare recorded dives, not controlled conditions.",
            evolution: "Shows up to the 12 most recent dives in chronological order.",
            warning: "Personal history only. These metrics are not safety recommendations."
          }
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const dive = await diveService.updateDive(
      req.auth.userId,
      req.params.diveId,
      req.body
    );

    return res.status(200).json({
      data: {
        dive: toDiveResponse(dive)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    await diveService.deleteDive(req.auth.userId, req.params.diveId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function uploadPhotos(req, res, next) {
  try {
    const photos = await photoService.addPhotos(
      req.auth.userId,
      req.params.diveId,
      req.files
    );
    return res.status(201).json({
      data: {
        photos: photos.map((photo) => ({
          id: photo.id,
          originalName: photo.original_name,
          mimeType: photo.mime_type,
          sizeBytes: photo.size_bytes,
          url: `/api/v1/dives/${req.params.diveId}/photos/${photo.id}/content`,
          createdAt: photo.created_at
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function photoContent(req, res, next) {
  try {
    const photo = await photoService.getPhoto(
      req.auth.userId,
      req.params.diveId,
      req.params.photoId
    );
    res.set("Cache-Control", "private, max-age=3600");
    res.type(photo.mime_type);
    return res.sendFile(photo.absolutePath);
  } catch (error) {
    return next(error);
  }
}

async function removePhoto(req, res, next) {
  try {
    await photoService.deletePhoto(
      req.auth.userId,
      req.params.diveId,
      req.params.photoId
    );
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function saveReflection(req, res, next) {
  try {
    await diveService.saveReflection(req.auth.userId, req.params.diveId, req.body);
    const dive = await diveService.getDive(req.auth.userId, req.params.diveId);
    return res.status(200).json({ data: { dive: toDiveResponse(dive) } });
  } catch (error) {
    return next(error);
  }
}

async function removeReflection(req, res, next) {
  try {
    await diveService.deleteReflection(req.auth.userId, req.params.diveId);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  create,
  list,
  stats,
  map,
  configurationMemory,
  insights,
  getById,
  update,
  remove,
  uploadPhotos,
  photoContent,
  removePhoto,
  saveReflection,
  removeReflection
};
