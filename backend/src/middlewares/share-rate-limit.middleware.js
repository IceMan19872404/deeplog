const { createLimiter } = require("./rate-limit");

const shareViewLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  identifier: "shared_dive_views"
});

const sharePasswordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  identifier: "shared_dive_passwords"
});

module.exports = { shareViewLimiter, sharePasswordLimiter };
