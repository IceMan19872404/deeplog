const AppError = require("../errors/app-error");

function validate(schema, source = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }));

      return next(
        new AppError(400, "VALIDATION_ERROR", "Invalid request data", details)
      );
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
