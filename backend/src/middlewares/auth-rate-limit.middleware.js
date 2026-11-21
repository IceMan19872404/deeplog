const { createLimiter } = require("./rate-limit");

const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  identifier: "login_attempts"
});

const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  identifier: "registrations"
});

const passwordRecoveryLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  identifier: "password_recovery"
});

const passwordResetLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  identifier: "password_reset"
});

const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  identifier: "session_refresh"
});

module.exports = {
  loginLimiter,
  registerLimiter,
  passwordRecoveryLimiter,
  passwordResetLimiter,
  refreshLimiter
};
