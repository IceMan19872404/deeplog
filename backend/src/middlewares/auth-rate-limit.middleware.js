const { rateLimit } = require("express-rate-limit");

function rateLimitHandler(_req, res) {
  return res.status(429).json({
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many attempts. Please try again later"
    }
  });
}

function createLimiter(options) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: rateLimitHandler,
    ...options
  });
}

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
