const jwt = require("jsonwebtoken");
const env = require("../config/env");

const commonOptions = {
  audience: env.jwtAudience,
  issuer: env.jwtIssuer
};

function createAccessToken(userId, familyId) {
  return jwt.sign({ sid: familyId }, env.jwtSecret, {
    ...commonOptions,
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn,
    subject: String(userId)
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret, {
    ...commonOptions,
    algorithms: ["HS256"]
  });
}

function createShareToken(shareId) {
  return jwt.sign({ type: "share", shareId }, env.jwtSecret, {
    ...commonOptions,
    algorithm: "HS256",
    expiresIn: "15m"
  });
}

function verifyShareTokenSafely(token, shareId) {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      ...commonOptions,
      algorithms: ["HS256"]
    });
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
