const diveService = require("../services/dive.service");
const toDiveResponse = require("../utils/dive-response");
const {
  toInsightsResponse,
  toMapPointResponse,
  toPhotoResponse,
  toStatsResponse
} = require("../utils/dive-response");
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
    return res.status(200).json({ data: { stats: toStatsResponse(result) } });
  } catch (error) {
    return next(error);
  }
}

async function map(req, res, next) {
  try {
    const dives = await diveService.getDiveMap(req.auth.userId);
    return res.status(200).json({ data: { dives: dives.map(toMapPointResponse) } });
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
    return res.status(200).json({ data: { insights: toInsightsResponse(result) } });
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
        photos: photos.map((photo) => toPhotoResponse(req.params.diveId, photo))
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
