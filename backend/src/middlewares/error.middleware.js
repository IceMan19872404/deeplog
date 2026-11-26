const AppError = require("../errors/app-error");
const { sendError } = require("../errors/error-response");
const logger = require("../config/logger");
const monitoring = require("../config/monitoring");

// body-parser failures caused by the client, keyed by `error.type`.
const bodyParserErrors = {
  "entity.parse.failed": [400, "INVALID_JSON", "Request body must contain valid JSON"],
  "entity.too.large": [413, "PAYLOAD_TOO_LARGE", "Request body is too large"]
};

const internalError = [500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred"];

function notFoundHandler(req, _res, next) {
  next(new AppError(404, "ROUTE_NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
}

function describeExpectedError(error) {
  if (error instanceof AppError) {
    return [error.statusCode, error.code, error.message, error.details];
  }
  return Object.hasOwn(bodyParserErrors, error.type) ? bodyParserErrors[error.type] : null;
}

// Only the error name is logged and the message never reaches the response:
// messages may contain personal data (TD-017, TD-028).
function reportUnexpectedError(error, req) {
  logger.error({
    event: "unhandled_error",
    requestId: req.requestId,
    errorName: error.name
  }, "Unhandled request error");
  monitoring.captureException(error, {
    requestId: req.requestId,
    method: req.method,
    route: req.route?.path || "unmatched"
  });
}

function errorHandler(error, req, res, _next) {
  const expected = describeExpectedError(error);
  if (!expected) reportUnexpectedError(error, req);

  // A response that already started cannot switch to a JSON error. Closing it
  // gives the client a truncated response, as before, without the unstructured
  // ERR_HTTP_HEADERS_SENT stack trace Express used to print.
  if (res.headersSent) return res.destroy();

  const [statusCode, code, message, details] = expected || internalError;
  return sendError(res, statusCode, code, message, details);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
