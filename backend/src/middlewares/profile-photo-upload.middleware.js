const multer = require("multer");
const AppError = require("../errors/app-error");

const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter: (_req, file, callback) => accepted.has(file.mimetype)
    ? callback(null, true)
    : callback(new AppError(400, "UNSUPPORTED_PROFILE_PHOTO", "Profile photo must use JPEG, PNG, or WebP"))
}).single("photo");

module.exports = function uploadProfilePhoto(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    if (error instanceof multer.MulterError) {
      return next(new AppError(400, "PROFILE_PHOTO_TOO_LARGE", "Profile photo must be 3 MB or smaller"));
    }
    return next(error);
  });
};
