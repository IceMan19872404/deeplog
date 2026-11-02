const multer = require("multer");
const AppError = require("../errors/app-error");

const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
    fields: 0
  },
  fileFilter: (_req, file, callback) => {
    if (!acceptedMimeTypes.has(file.mimetype)) {
      return callback(
        new AppError(
          400,
          "UNSUPPORTED_PHOTO_TYPE",
          "Photos must use JPEG, PNG, or WebP"
        )
      );
    }
    return callback(null, true);
  }
}).array("photos", 5);

function uploadDivePhotos(req, res, next) {
  upload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);

    if (error instanceof multer.MulterError) {
      const code = error.code === "LIMIT_FILE_SIZE"
        ? "PHOTO_TOO_LARGE"
        : "PHOTO_UPLOAD_LIMIT";
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Each photo must be 8 MB or smaller"
        : "A maximum of 5 photos can be uploaded at once";
      return next(new AppError(400, code, message));
    }

    return next(error);
  });
}

module.exports = uploadDivePhotos;
