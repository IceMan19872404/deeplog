const AppError = require("../errors/app-error");
const { createImageUpload } = require("./image-upload");

module.exports = createImageUpload({
  array: "photos",
  maxFiles: 5,
  maxFileSize: 8 * 1024 * 1024,
  typeError: () => new AppError(400, "UNSUPPORTED_PHOTO_TYPE", "Photos must use JPEG, PNG, or WebP"),
  limitError: (code) => (code === "LIMIT_FILE_SIZE"
    ? new AppError(400, "PHOTO_TOO_LARGE", "Each photo must be 8 MB or smaller")
    : new AppError(400, "PHOTO_UPLOAD_LIMIT", "A maximum of 5 photos can be uploaded at once"))
});
