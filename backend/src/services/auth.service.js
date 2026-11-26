const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const env = require("../config/env");
const AppError = require("../errors/app-error");
const userRepository = require("../repositories/user.repository");
const passwordResetRepository = require("../repositories/password-reset.repository");
const sessionRepository = require("../repositories/auth-session.repository");
const tokenService = require("./token.service");

const resetTokenLifetimeMs = 30 * 60 * 1000;

const emailAlreadyRegistered = () =>
  new AppError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists");
const invalidRefreshSession = (code = "INVALID_REFRESH_TOKEN") =>
  new AppError(401, code, "Refresh session is invalid or expired");

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

// Opaque secrets (refresh, CSRF and reset tokens) are 32 random bytes; only
// their SHA-256 reaches the database (TD-010, TD-026).
function randomSecret() {
  return crypto.randomBytes(32).toString("hex");
}

function hashSecret(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function secretsMatch(first, second) {
  if (!first || !second) return false;
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function hashPassword(password) {
  return bcrypt.hash(password, env.bcryptRounds);
}

// Unknown emails are compared against a throwaway hash with the same cost, so
// response time does not reveal whether an account exists.
const timingEqualizerHash = bcrypt.hashSync(
  crypto.randomBytes(16).toString("hex"),
  env.bcryptRounds
);

async function register(input) {
  const email = normalizeEmail(input.email);
  if (await userRepository.findByEmail(email)) throw emailAlreadyRegistered();

  const passwordHash = await hashPassword(input.password);
  try {
    return await userRepository.create({ ...input, email, passwordHash });
  } catch (error) {
    // The database unique constraint closes the race between lookup and insert.
    if (error.code === "23505") throw emailAlreadyRegistered();
    throw error;
  }
}

// A session row stores hashes of a fresh refresh token and CSRF token. The
// plain values only travel to the client, in cookies.
function newSession() {
  const refreshToken = randomSecret();
  const csrfToken = randomSecret();
  return {
    refreshToken,
    csrfToken,
    record: {
      id: crypto.randomUUID(),
      tokenHash: hashSecret(refreshToken),
      csrfHash: hashSecret(csrfToken),
      expiresAt: new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000)
    }
  };
}

function sessionResult(user, userId, familyId, session) {
  return {
    user,
    accessToken: tokenService.createAccessToken(userId, familyId),
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
    refreshToken: session.refreshToken,
    csrfToken: session.csrfToken
  };
}

async function login(input) {
  const user = await userRepository.findByEmail(normalizeEmail(input.email));
  const passwordMatches = await bcrypt.compare(
    input.password,
    user ? user.password_hash : timingEqualizerHash
  ) && Boolean(user);

  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const session = newSession();
  const familyId = crypto.randomUUID();
  await sessionRepository.create({ ...session.record, familyId, userId: user.id });
  return sessionResult(user, user.id, familyId, session);
}

// Refresh and logout need the refresh cookie and a CSRF header equal to the
// CSRF cookie. Returns the hashes that identify the session in the database.
function sessionHashes(credentials) {
  if (!credentials.refreshToken) {
    throw new AppError(401, "REFRESH_TOKEN_REQUIRED", "Refresh session is required");
  }
  if (!secretsMatch(credentials.csrfCookie, credentials.csrfHeader)) {
    throw new AppError(403, "CSRF_VALIDATION_FAILED", "CSRF validation failed");
  }
  return [hashSecret(credentials.refreshToken), hashSecret(credentials.csrfHeader)];
}

async function refresh(credentials) {
  const [tokenHash, csrfHash] = sessionHashes(credentials);
  const replacement = newSession();
  const result = await sessionRepository.rotate(tokenHash, csrfHash, replacement.record);

  if (result.status !== "rotated") {
    throw invalidRefreshSession(result.status === "reused" ? "REFRESH_TOKEN_REUSED" : undefined);
  }

  return sessionResult(result.user, result.session.user_id, result.session.family_id, replacement);
}

async function revokeCurrentFamily(credentials) {
  const revoked = await sessionRepository.revokeFamily(...sessionHashes(credentials));
  if (!revoked) throw invalidRefreshSession();
}

async function logout(credentials) {
  await revokeCurrentFamily(credentials);
}

async function logoutAll(userId, credentials) {
  await revokeCurrentFamily(credentials);
  await sessionRepository.revokeAllForUser(userId);
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new AppError(401, "INVALID_ACCESS_TOKEN", "The user for this access token no longer exists");
  }
  return user;
}

async function requestPasswordReset(input) {
  const user = await userRepository.findByEmail(normalizeEmail(input.email));
  if (!user) return null;

  const token = randomSecret();
  await passwordResetRepository.replaceForUser(
    user.id,
    hashSecret(token),
    new Date(Date.now() + resetTokenLifetimeMs)
  );
  return token;
}

async function resetPassword(input) {
  const passwordHash = await hashPassword(input.password);
  const consumed = await passwordResetRepository.consume(hashSecret(input.token), passwordHash);

  if (!consumed) {
    const message = "Password reset token is invalid or expired";
    throw new AppError(400, "INVALID_OR_EXPIRED_RESET_TOKEN", message, [{ field: "token", message }]);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  getCurrentUser,
  requestPasswordReset,
  resetPassword
};
