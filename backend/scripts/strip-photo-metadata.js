// One-off maintenance: remove EXIF/XMP metadata (GPS, device, capture time) from
// photos uploaded before uploads were sanitised. Safe to run more than once.
//   docker compose exec backend node scripts/strip-photo-metadata.js
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const env = require("../src/config/env");
const { pool } = require("../src/config/database");
const { sanitizeImage } = require("../src/utils/image-sanitizer");

async function photoRows() {
  const result = await pool.query(`
    SELECT 'dive_photos' AS source, id::text, storage_key, mime_type FROM dive_photos
    UNION ALL
    SELECT 'user_profiles', user_id::text, photo_storage_key, photo_mime_type
      FROM user_profiles WHERE photo_storage_key IS NOT NULL`);
  return result.rows;
}

async function main() {
  let cleaned = 0, alreadyClean = 0, missing = 0;
  for (const row of await photoRows()) {
    const file = path.join(env.uploadsDir, path.basename(row.storage_key));
    let original;
    try { original = await fs.readFile(file); } catch { missing += 1; continue; }

    const metadata = await sharp(original).metadata();
    if (!metadata.exif && !metadata.xmp && !metadata.iptc) { alreadyClean += 1; continue; }

    const clean = await sanitizeImage(original, row.mime_type);
    const temporary = `${file}.clean`;
    await fs.writeFile(temporary, clean);
    await fs.rename(temporary, file); // atomic replace on the same volume
    if (row.source === "dive_photos") {
      await pool.query("UPDATE dive_photos SET size_bytes = $1 WHERE id = $2", [clean.length, row.id]);
    }
    cleaned += 1;
  }
  console.log(`Fotos limpiadas: ${cleaned}. Ya limpias: ${alreadyClean}. Archivos ausentes: ${missing}.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
