const crypto = require("crypto");
const path = require("path");
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
const env = require("../config/env");
const AppError = require("../errors/app-error");
const diveRepository = require("../repositories/dive.repository");
const buddyRepository = require("../repositories/dive-buddy.repository");
const photoRepository = require("../repositories/dive-photo.repository");
const shareRepository = require("../repositories/dive-share.repository");
const tokenService = require("./token.service");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function toShareStatus(share) {
  const now = Date.now();
  return {
    id: share.public_id,
    passwordProtected: Boolean(share.password_hash),
    visibility: share.visibility,
    expiresAt: share.expires_at,
    revokedAt: share.revoked_at,
    createdAt: share.created_at,
    status: share.revoked_at ? "revoked"
      : share.expires_at && new Date(share.expires_at).getTime() <= now ? "expired"
        : "active"
  };
}

async function createShare(userId, diveId, input, origin) {
  const dive = await diveRepository.findByIdAndUserId(diveId, userId);
  if (!dive) throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");

  const selectedPhotos = await photoRepository.findByDiveIds([diveId]);
  const ownedIds = new Set((selectedPhotos.get(String(diveId)) || []).map((p) => Number(p.id)));
  if (input.visibility.photoIds.some((id) => !ownedIds.has(id))) {
    throw new AppError(400, "INVALID_SHARED_PHOTO", "A selected photo does not belong to this dive");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = input.expiresInDays === null ? null
    : new Date(Date.now() + input.expiresInDays * 86400000);
  const share = await shareRepository.create(diveId, {
    publicId: crypto.randomUUID(),
    tokenHash: hashToken(rawToken),
    passwordHash: input.password
      ? await bcrypt.hash(input.password, env.bcryptRounds)
      : null,
    visibility: input.visibility,
    expiresAt
  });
  const shareUrl = `${origin}/?share=${rawToken}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    errorCorrectionLevel: "M", margin: 2, width: 320,
    color: { dark: "#073b5c", light: "#ffffff" }
  });
  return { share: toShareStatus(share), shareUrl, qrDataUrl };
}

async function listShares(userId, diveId) {
  const dive = await diveRepository.findByIdAndUserId(diveId, userId);
  if (!dive) throw new AppError(404, "DIVE_NOT_FOUND", "Dive not found");
  return (await shareRepository.listOwned(diveId, userId)).map(toShareStatus);
}

async function revokeShare(userId, diveId, shareId) {
  const revoked = await shareRepository.revokeOwned(shareId, diveId, userId);
  if (!revoked) throw new AppError(404, "SHARE_NOT_FOUND", "Share not found");
}

function ensureActive(share) {
  if (!share) throw new AppError(404, "SHARE_NOT_FOUND", "Shared dive not found");
  if (share.revoked_at) throw new AppError(410, "SHARE_REVOKED", "This share has been revoked");
  if (share.expires_at && new Date(share.expires_at) <= new Date()) {
    throw new AppError(410, "SHARE_EXPIRED", "This share has expired");
  }
}

async function getShare(rawToken, accessToken) {
  const share = await shareRepository.findByTokenHash(hashToken(rawToken));
  ensureActive(share);
  if (share.password_hash && !tokenService.verifyShareTokenSafely(accessToken, share.public_id)) {
    throw new AppError(401, "SHARE_PASSWORD_REQUIRED", "A password is required to view this dive");
  }
  return share;
}

async function buildPublicDive(share, rawToken) {
  const visibility = share.visibility;
  const photos = await shareRepository.findVisiblePhotos(share.dive_id, visibility.photoIds || []);
  const buddiesByDive = visibility.includeBuddies
    ? await buddyRepository.findByDiveIds([share.dive_id]) : new Map();
  return {
    name: share.name,
    date: share.dive_date instanceof Date ? share.dive_date.toISOString().slice(0, 10) : share.dive_date,
    durationMinutes: share.duration_minutes,
    maxDepthMeters: Number(share.max_depth_meters),
    ...(visibility.includeDiverName && { diverName: `${share.first_name} ${share.last_name}` }),
    ...(visibility.includeCenter && { diveCenter: share.dive_center }),
    ...(visibility.includeEquipment && {
      ballastKg: share.ballast_kg === null ? null : Number(share.ballast_kg),
      equipmentOwnership: share.equipment_ownership,
      suitType: share.suit_type,
      suitThicknessMm: share.suit_thickness_mm === null ? null : Number(share.suit_thickness_mm),
      cylinderMaterial: share.cylinder_material,
      cylinderVolumeLiters: share.cylinder_volume_liters === null ? null : Number(share.cylinder_volume_liters),
      waterType: share.water_type
    }),
    ...(visibility.includeBuddies && {
      buddies: buddiesByDive.get(String(share.dive_id)) || []
    }),
    ...(visibility.includeComments && { comments: share.comments }),
    photos: photos.map((photo, index) => ({
      originalName: photo.original_name,
      mimeType: photo.mime_type,
      url: `/api/v1/public/dives/${rawToken}/photos/${index + 1}/content`
    }))
  };
}

async function viewShare(rawToken, accessToken) {
  const share = await getShare(rawToken, accessToken);
  return buildPublicDive(share, rawToken);
}

async function unlockShare(rawToken, password) {
  const share = await shareRepository.findByTokenHash(hashToken(rawToken));
  ensureActive(share);
  if (!share.password_hash || !(await bcrypt.compare(password, share.password_hash))) {
    throw new AppError(401, "INVALID_SHARE_PASSWORD", "Share password is incorrect");
  }
  const accessToken = tokenService.createShareToken(share.public_id);
  return { accessToken, dive: await buildPublicDive(share, rawToken) };
}

async function getPublicPhoto(rawToken, position, accessToken) {
  const share = await getShare(rawToken, accessToken);
  const photoIds = share.visibility.photoIds || [];
  const requestedId = photoIds[position - 1];
  if (!requestedId) throw new AppError(404, "PHOTO_NOT_FOUND", "Photo not found");
  const photos = await shareRepository.findVisiblePhotos(share.dive_id, [requestedId]);
  const photo = photos[0];
  if (!photo) throw new AppError(404, "PHOTO_NOT_FOUND", "Photo not found");
  return { ...photo, absolutePath: path.join(env.uploadsDir, photo.storage_key) };
}

module.exports = { createShare, listShares, revokeShare, viewShare, unlockShare, getPublicPhoto };
