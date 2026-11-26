const AppError = require("../errors/app-error");
const { createImageUpload } = require("./image-upload");

module.exports = createImageUpload({
  single: "photo",
  maxFileSize: 3 * 1024 * 1024,
  typeError: () => new AppError(400, "UNSUPPORTED_PROFILE_PHOTO", "Profile photo must use JPEG, PNG, or WebP"),
  // Every multer limit (size, a second file, an extra field) maps to this code.
  limitError: () => new AppError(400, "PROFILE_PHOTO_TOO_LARGE", "Profile photo must be 3 MB or smaller")
});
