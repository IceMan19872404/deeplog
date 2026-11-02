const service = require("../services/profile.service");

async function get(req, res, next) {
  try { return res.status(200).json({ data: { profile: await service.get(req.auth.userId) } }); }
  catch (error) { return next(error); }
}

async function update(req, res, next) {
  try { return res.status(200).json({ data: { profile: await service.update(req.auth.userId, req.body) } }); }
  catch (error) { return next(error); }
}

async function uploadPhoto(req, res, next) {
  try { return res.status(200).json({ data: { profile: await service.savePhoto(req.auth.userId, req.file) } }); }
  catch (error) { return next(error); }
}

async function photo(req, res, next) {
  try {
    const result = await service.getPhoto(req.auth.userId);
    res.set({ "Content-Type": result.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    return res.sendFile(result.path);
  } catch (error) { return next(error); }
}

async function deletePhoto(req, res, next) {
  try { await service.deletePhoto(req.auth.userId); return res.status(204).send(); }
  catch (error) { return next(error); }
}

module.exports = { get, update, uploadPhoto, photo, deletePhoto };
