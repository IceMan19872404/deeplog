const logger = require("../config/logger");
const monitoring = require("../config/monitoring");

function reportClientError(req, res) {
  logger.warn({
    event: "client_error",
    requestId: req.requestId,
    kind: req.body.kind,
    source: req.body.source,
    line: req.body.line,
    column: req.body.column
  }, "Sanitized client error reported");
  monitoring.captureClientError(req.body, req.requestId);
  return res.status(202).json({ data: { accepted: true } });
}

module.exports = { reportClientError };
