const { rateLimit } = require("express-rate-limit");
const { sendError } = require("../errors/error-response");

function rateLimitHandler(_req, res) {
  return sendError(res, 429, "RATE_LIMIT_EXCEEDED", "Too many attempts. Please try again later");
}

// Shared defaults for every limiter: IETF draft-8 `RateLimit` headers, no legacy
// `X-RateLimit-*` headers and the API error envelope. `identifier` names the
// policy in the headers. Counters live in memory, which is only correct for a
// single API instance (TD-017).
function createLimiter(options) {
  return rateLimit({
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: rateLimitHandler,
    ...options
  });
}

module.exports = { createLimiter };
