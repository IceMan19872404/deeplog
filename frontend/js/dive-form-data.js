// The dive form's values as the API expects them, and the checks the browser
// cannot express with constraint validation (buddy names, photo files).

export const MAX_PHOTOS = 5;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const NUMERIC_OPTIONAL_FIELDS = ["suitThicknessMm", "cylinderVolumeLiters", "latitude", "longitude"];

// Comma-separated names, trimmed, without empties or repeats (ignoring case).
export function parseBuddies(value) {
  const seen = new Set();
  return value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => {
      if (!name) return false;
      const key = name.toLocaleLowerCase("es");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// `values` holds the form's non-empty entries (see formDataToObject).
export function divePayload(values) {
  const { buddiesText = "", photos: _photos, ...dive } = values;
  NUMERIC_OPTIONAL_FIELDS.forEach((key) => {
    if (dive[key] !== undefined) dive[key] = Number(dive[key]);
  });
  if (dive.latitude === undefined && dive.longitude === undefined) {
    delete dive.locationPrecision;
  }
  return {
    ...dive,
    durationMinutes: Number(values.durationMinutes),
    maxDepthMeters: Number(values.maxDepthMeters),
    ...(values.ballastKg !== undefined && { ballastKg: Number(values.ballastKg) }),
    buddies: parseBuddies(buddiesText)
  };
}

export function buddiesError(text) {
  const buddies = parseBuddies(text);
  if (buddies.length > 10) return "Puedes añadir un máximo de 10 compañeros.";
  if (buddies.some((name) => name.length < 2 || name.length > 80)) {
    return "Cada nombre debe tener entre 2 y 80 caracteres.";
  }
  return null;
}

// `files` are the newly chosen ones; `existingCount` those already saved.
export function photosError(files, existingCount = 0) {
  if (existingCount + files.length > MAX_PHOTOS) return `Cada inmersión puede contener hasta ${MAX_PHOTOS} fotos.`;
  if (files.some((file) => !PHOTO_TYPES.has(file.type))) return "Utiliza únicamente imágenes JPEG, PNG o WebP.";
  if (files.some((file) => file.size > MAX_PHOTO_BYTES)) return "Cada fotografía debe ocupar 8 MB o menos.";
  return null;
}
