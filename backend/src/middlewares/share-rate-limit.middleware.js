const { rateLimit } = require("express-rate-limit");

function handler(_req, res) {
  return res.status(429).json({
    error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many attempts. Please try again later" }
  });
}

const shareViewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 120,
  standardHeaders: "draft-8", legacyHeaders: false, handler,
  identifier: "shared_dive_views"
});
const sharePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true,
  standardHeaders: "draft-8", legacyHeaders: false, handler,
  identifier: "shared_dive_passwords"
});

module.exports = { shareViewLimiter, sharePasswordLimiter };
