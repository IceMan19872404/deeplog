const AppError = require("../errors/app-error");
const { sendError } = require("../errors/error-response");
const logger = require("../config/logger");
const monitoring = require("../config/monitoring");

// body-parser failures that are the client's fault, keyed by `error.type`.
const bodyParserErrors = new Map([
  ["entity.parse.failed", [400, "INVALID_JSON", "Request body must contain valid JSON"]],
  ["entity.too.large", [413, "PAYLOAD_TOO_LARGE", "Request body is too large"]]
]);

const internalError = [500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred"];

function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Route ${req.method} ${req.originalUrl} not found`
    )
  );
}

function describeKnownError(error) {
  if (error instanceof AppError) {
    return [error.statusCode, error.code, error.message, error.details];
  }
  return bodyParserErrors.get(error.type) || null;
}

function reportUnexpectedError(error, req) {
  // Only the error name is logged: messages may contain user data (TD-017).
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
  const knownError = describeKnownError(error);
  if (!knownError) reportUnexpectedError(error, req);

  // A streamed response cannot switch to a JSON error: close it so the client
  // sees a truncated download instead of a corrupt body.
  if (res.headersSent) return res.destroy();

  const [statusCode, code, message, details] = knownError || internalError;
  return sendError(res, statusCode, code, message, details);
}

module.exports = {
  notFoundHandler,
  errorHandler
};
