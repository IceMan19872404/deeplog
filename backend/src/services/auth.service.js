const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const env = require("../config/env");
const AppError = require("../errors/app-error");
const userRepository = require("../repositories/user.repository");
const passwordResetRepository = require("../repositories/password-reset.repository");
const sessionRepository = require("../repositories/auth-session.repository");
const tokenService = require("./token.service");

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function register(input) {
  const email = normalizeEmail(input.email);
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    throw new AppError(
      409,
      "EMAIL_ALREADY_REGISTERED",
      "An account with this email already exists"
    );
  }

  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);

  try {
    return await userRepository.create({
      ...input,
      email,
      passwordHash
    });
  } catch (error) {
    // The database unique constraint closes the race between lookup and insert.
    if (error.code === "23505") {
      throw new AppError(
        409,
        "EMAIL_ALREADY_REGISTERED",
        "An account with this email already exists"
      );
    }

    throw error;
  }
}

function hashSessionSecret(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function secretsMatch(first, second) {
  if (!first || !second) return false;
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function newSessionSecrets() {
  return {
    id: crypto.randomUUID(),
    refreshToken: crypto.randomBytes(32).toString("hex"),
    csrfToken: crypto.randomBytes(32).toString("hex")
  };
}

function expiresAt() {
  return new Date(Date.now() + env.refreshTokenDays * 24 * 60 * 60 * 1000);
}

// Unknown emails are compared against a throwaway hash with the same cost, so
// response time does not reveal whether an account exists.
const timingEqualizerHash = bcrypt.hashSync(
  crypto.randomBytes(16).toString("hex"),
  env.bcryptRounds
);

async function login(input) {
  const email = normalizeEmail(input.email);
  const user = await userRepository.findByEmail(email);
  const passwordMatches = await bcrypt.compare(
    input.password,
    user ? user.password_hash : timingEqualizerHash
  ) && Boolean(user);

  if (!passwordMatches) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect"
    );
  }

  const secrets = newSessionSecrets();
  const familyId = crypto.randomUUID();
  await sessionRepository.create({
    id: secrets.id,
    familyId,
    userId: user.id,
    tokenHash: hashSessionSecret(secrets.refreshToken),
    csrfHash: hashSessionSecret(secrets.csrfToken),
    expiresAt: expiresAt()
  });

  return {
    user,
    accessToken: tokenService.createAccessToken(user.id, familyId),
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
    refreshToken: secrets.refreshToken,
    csrfToken: secrets.csrfToken
  };
}

function validateSessionCredentials(credentials) {
  if (!credentials.refreshToken) {
    throw new AppError(401, "REFRESH_TOKEN_REQUIRED", "Refresh session is required");
  }
  if (!secretsMatch(credentials.csrfCookie, credentials.csrfHeader)) {
    throw new AppError(403, "CSRF_VALIDATION_FAILED", "CSRF validation failed");
  }
}

async function refresh(credentials) {
  validateSessionCredentials(credentials);
  const secrets = newSessionSecrets();
  const result = await sessionRepository.rotate(
    hashSessionSecret(credentials.refreshToken),
    hashSessionSecret(credentials.csrfHeader),
    {
      id: secrets.id,
      tokenHash: hashSessionSecret(secrets.refreshToken),
      csrfHash: hashSessionSecret(secrets.csrfToken),
      expiresAt: expiresAt()
    }
  );

  if (result.status !== "rotated") {
    throw new AppError(
      401,
      result.status === "reused" ? "REFRESH_TOKEN_REUSED" : "INVALID_REFRESH_TOKEN",
      "Refresh session is invalid or expired"
    );
  }

  return {
    user: result.user,
    accessToken: tokenService.createAccessToken(result.session.user_id, result.session.family_id),
    tokenType: "Bearer",
    expiresIn: env.jwtExpiresIn,
    refreshToken: secrets.refreshToken,
    csrfToken: secrets.csrfToken
  };
}

async function logout(credentials) {
  validateSessionCredentials(credentials);
  const revoked = await sessionRepository.revokeFamily(
    hashSessionSecret(credentials.refreshToken),
    hashSessionSecret(credentials.csrfHeader)
  );
  if (!revoked) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh session is invalid or expired");
}

async function logoutAll(userId, credentials) {
  validateSessionCredentials(credentials);
  const currentSession = await sessionRepository.revokeFamily(
    hashSessionSecret(credentials.refreshToken),
    hashSessionSecret(credentials.csrfHeader)
  );
  if (!currentSession) throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh session is invalid or expired");
  await sessionRepository.revokeAllForUser(userId);
}

async function getCurrentUser(userId) {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError(
      401,
      "INVALID_ACCESS_TOKEN",
      "The user for this access token no longer exists"
    );
  }

  return user;
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function requestPasswordReset(input) {
  const user = await userRepository.findByEmail(normalizeEmail(input.email));

  if (!user) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await passwordResetRepository.replaceForUser(
    user.id,
    hashResetToken(token),
    expiresAt
  );

  return token;
}

async function resetPassword(input) {
  const passwordHash = await bcrypt.hash(input.password, env.bcryptRounds);
  const consumed = await passwordResetRepository.consume(
    hashResetToken(input.token),
    passwordHash
  );

  if (!consumed) {
    throw new AppError(
      400,
      "INVALID_OR_EXPIRED_RESET_TOKEN",
      "Password reset token is invalid or expired",
      [{ field: "token", message: "Password reset token is invalid or expired" }]
    );
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
