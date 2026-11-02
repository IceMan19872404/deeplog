const AppError = require("../errors/app-error");
const logger = require("../config/logger");
const monitoring = require("../config/monitoring");

function notFoundHandler(req, _res, next) {
  next(
    new AppError(
      404,
      "ROUTE_NOT_FOUND",
      `Route ${req.method} ${req.originalUrl} not found`
    )
  );
}

function errorHandler(error, req, res, _next) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      }
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      error: {
        code: "INVALID_JSON",
        message: "Request body must contain valid JSON"
      }
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large"
      }
    });
  }

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

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred"
    }
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
