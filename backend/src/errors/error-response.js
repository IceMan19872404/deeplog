// Single source of the API error envelope: { error: { code, message, details? } }.
function sendError(res, statusCode, code, message, details) {
  return res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details && { details })
    }
  });
}

module.exports = { sendError };
