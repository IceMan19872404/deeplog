const multer = require("multer");
const AppError = require("../errors/app-error");

// The image types utils/image-sanitizer.js can re-encode without metadata.
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// Builds a multipart middleware for one image (`single` field, req.file) or
// several (`array` field up to `maxFiles`, req.files). Images stay in memory
// because they are sanitised before reaching disk; other types are rejected
// with `typeError()` and multer limit errors become `limitError(code)`.
function createImageUpload({ single, array, maxFiles = 1, maxFileSize, typeError, limitError }) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize, files: single ? 1 : maxFiles, fields: 0 },
    fileFilter: (_req, file, callback) => (acceptedMimeTypes.has(file.mimetype)
      ? callback(null, true)
      : callback(typeError()))
  });
  const parse = single ? upload.single(single) : upload.array(array, maxFiles);

  return function uploadImages(req, res, next) {
    parse(req, res, (error) => {
      if (!error || error instanceof AppError) return next(error);
      if (error instanceof multer.MulterError) return next(limitError(error.code));
      return next(error);
    });
  };
}

module.exports = { createImageUpload };
