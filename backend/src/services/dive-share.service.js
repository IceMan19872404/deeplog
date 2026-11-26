const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const QRCode = require("qrcode");
const env = require("../config/env");
const AppError = require("../errors/app-error");
const buddyRepository = require("../repositories/dive-buddy.repository");
const photoRepository = require("../repositories/dive-photo.repository");
const shareRepository = require("../repositories/dive-share.repository");
const { toDateOnly, toEquipmentResponse } = require("../utils/dive-response");
const { assertDiveOwner } = require("./dive-ownership");
const { photoPath } = require("./photo-files");
const tokenService = require("./token.service");

const DAY_MS = 24 * 60 * 60 * 1000;
const QR_OPTIONS = {
  errorCorrectionLevel: "M", margin: 2, width: 320,
  color: { dark: "#073b5c", light: "#ffffff" }
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const photoNotFound = () => new AppError(404, "PHOTO_NOT_FOUND", "Photo not found");

function isExpired(share) {
  return Boolean(share.expires_at) && new Date(share.expires_at).getTime() <= Date.now();
}

function toShareStatus(share) {
  return {
    id: share.public_id,
    passwordProtected: Boolean(share.password_hash),
    visibility: share.visibility,
    expiresAt: share.expires_at,
    revokedAt: share.revoked_at,
    createdAt: share.created_at,
    status: share.revoked_at ? "revoked" : isExpired(share) ? "expired" : "active"
  };
}

async function createShare(userId, diveId, input, origin) {
  await assertDiveOwner(userId, diveId);

  const selectedPhotos = await photoRepository.findByDiveIds([diveId]);
  const ownedIds = new Set((selectedPhotos.get(String(diveId)) || []).map((p) => Number(p.id)));
  if (input.visibility.photoIds.some((id) => !ownedIds.has(id))) {
    throw new AppError(400, "INVALID_SHARED_PHOTO", "A selected photo does not belong to this dive");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = input.expiresInDays === null ? null
    : new Date(Date.now() + input.expiresInDays * DAY_MS);
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
  const qrDataUrl = await QRCode.toDataURL(shareUrl, QR_OPTIONS);
  return { share: toShareStatus(share), shareUrl, qrDataUrl };
}

async function listShares(userId, diveId) {
  await assertDiveOwner(userId, diveId);
  return (await shareRepository.listOwned(diveId, userId)).map(toShareStatus);
}

async function revokeShare(userId, diveId, shareId) {
  const revoked = await shareRepository.revokeOwned(shareId, diveId, userId);
  if (!revoked) throw new AppError(404, "SHARE_NOT_FOUND", "Share not found");
}

// The share behind a public token, or 404/410 when it is unknown, revoked or
// expired.
async function findActiveShare(rawToken) {
  const share = await shareRepository.findByTokenHash(hashToken(rawToken));
  if (!share) throw new AppError(404, "SHARE_NOT_FOUND", "Shared dive not found");
  if (share.revoked_at) throw new AppError(410, "SHARE_REVOKED", "This share has been revoked");
  if (isExpired(share)) throw new AppError(410, "SHARE_EXPIRED", "This share has expired");
  return share;
}

// An active share the caller may read: password-protected shares also need
// the scoped token issued by unlockShare.
async function findViewableShare(rawToken, accessToken) {
  const share = await findActiveShare(rawToken);
  if (share.password_hash && !tokenService.verifyShareTokenSafely(accessToken, share.public_id)) {
    throw new AppError(401, "SHARE_PASSWORD_REQUIRED", "A password is required to view this dive");
  }
  return share;
}

// The shared photos that still exist, in the owner's chosen order. Public
// URLs address them by position in this list, never by internal ID.
function findSharedPhotos(share) {
  return shareRepository.findVisiblePhotos(share.dive_id, share.visibility.photoIds || []);
}

async function buildPublicDive(share, rawToken) {
  const visibility = share.visibility;
  const photos = await findSharedPhotos(share);
  const buddiesByDive = visibility.includeBuddies
    ? await buddyRepository.findByDiveIds([share.dive_id]) : new Map();
  return {
    name: share.name,
    date: toDateOnly(share.dive_date),
    durationMinutes: share.duration_minutes,
    maxDepthMeters: Number(share.max_depth_meters),
    ...(visibility.includeDiverName && { diverName: `${share.first_name} ${share.last_name}` }),
    ...(visibility.includeCenter && { diveCenter: share.dive_center }),
    ...(visibility.includeEquipment && toEquipmentResponse(share)),
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
  const share = await findViewableShare(rawToken, accessToken);
  return buildPublicDive(share, rawToken);
}

async function unlockShare(rawToken, password) {
  const share = await findActiveShare(rawToken);
  if (!share.password_hash || !(await bcrypt.compare(password, share.password_hash))) {
    throw new AppError(401, "INVALID_SHARE_PASSWORD", "Share password is incorrect");
  }
  const accessToken = tokenService.createShareToken(share.public_id);
  return { accessToken, dive: await buildPublicDive(share, rawToken) };
}

async function getPublicPhoto(rawToken, position, accessToken) {
  const share = await findViewableShare(rawToken, accessToken);
  // Same list as the public view, so its URLs keep working after the owner
  // deletes one of the shared photos.
  const photo = (await findSharedPhotos(share))[position - 1];
  if (!photo) throw photoNotFound();
  return { ...photo, absolutePath: photoPath(photo.storage_key) };
}

module.exports = { createShare, listShares, revokeShare, viewShare, unlockShare, getPublicPhoto };
