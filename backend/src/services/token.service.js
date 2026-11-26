const jwt = require("jsonwebtoken");
const env = require("../config/env");

const commonOptions = {
  audience: env.jwtAudience,
  issuer: env.jwtIssuer
};
const signOptions = { ...commonOptions, algorithm: "HS256" };
const verifyOptions = { ...commonOptions, algorithms: ["HS256"] };

function createAccessToken(userId, familyId) {
  return jwt.sign({ sid: familyId }, env.jwtSecret, {
    ...signOptions,
    expiresIn: env.jwtExpiresIn,
    subject: String(userId)
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, verifyOptions);
}

// Unlocking a password-protected share grants a 15-minute token for that share
// only (TD-020).
function createShareToken(shareId) {
  return jwt.sign({ type: "share", shareId }, env.jwtSecret, {
    ...signOptions,
    expiresIn: "15m"
  });
}

function verifyShareTokenSafely(token, shareId) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, env.jwtSecret, verifyOptions);
    return payload.type === "share" && payload.shareId === shareId;
  } catch (_error) {
    return false;
  }
}

module.exports = {
  createAccessToken,
  verifyAccessToken,
  createShareToken,
  verifyShareTokenSafely
};
