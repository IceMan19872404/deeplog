const sharp = require("sharp");

const formatByMimeType = {
  "image/jpeg": (image) => image.jpeg({ quality: 90, mozjpeg: true }),
  "image/png": (image) => image.png({ compressionLevel: 9 }),
  "image/webp": (image) => image.webp({ quality: 90 })
};

// Phone photos carry EXIF/XMP metadata: exact GPS position, device model and
// capture time. DeepLog promises approximate, private locations, so every image
// is decoded and re-encoded without metadata before it reaches disk. Applying
// the EXIF orientation first keeps the picture upright once the tag is gone.
// Re-encoding also discards trailing bytes, so polyglot files cannot survive.
async function sanitizeImage(buffer, mimeType) {
  const encode = formatByMimeType[mimeType];
  if (!encode) throw new Error(`Unsupported image type: ${mimeType}`);

  const image = sharp(buffer, { failOn: "error", limitInputPixels: 40_000_000 })
    .rotate();
  return encode(image).toBuffer();
}

module.exports = { sanitizeImage };
