const crypto = require("crypto");
const logger = require("../config/logger");

const requestIdPattern = /^[a-zA-Z0-9._-]{1,64}$/;

function sanitizePath(originalUrl) {
  const pathname = originalUrl.split("?", 1)[0];
  return pathname.replace(
    /(\/api\/v1\/public\/dives\/)[a-f0-9]{64}(?=\/|\?|$)/gi,
    "$1[redacted]"
  );
}

function requestLogger(req, res, next) {
  const incomingRequestId = req.get("X-Request-ID");
  const requestId = requestIdPattern.test(incomingRequestId || "")
    ? incomingRequestId
    : crypto.randomUUID();
  const startedAt = process.hrtime.bigint();

  req.requestId = requestId;
  res.set("X-Request-ID", requestId);

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    logger.info({
      event: "http_request",
      requestId,
      method: req.method,
      path: sanitizePath(req.originalUrl),
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2))
    }, "HTTP request completed");
  });

  next();
}

module.exports = requestLogger;
module.exports.sanitizePath = sanitizePath;
