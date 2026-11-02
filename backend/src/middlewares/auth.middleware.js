const AppError = require("../errors/app-error");
const tokenService = require("../services/token.service");
const sessionRepository = require("../repositories/auth-session.repository");

async function authenticate(req, _res, next) {
  const authorization = req.get("authorization");

  if (!authorization) {
    return next(
      new AppError(401, "AUTHENTICATION_REQUIRED", "Authentication is required")
    );
  }

  const [scheme, token, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return next(
      new AppError(
        401,
        "INVALID_AUTHORIZATION_HEADER",
        "Authorization header must use the Bearer scheme"
      )
    );
  }

  try {
    const payload = tokenService.verifyAccessToken(token);

    if (!payload.sub || !payload.sid) {
      throw new Error("Token identity is incomplete");
    }

    const sessionIsActive = await sessionRepository.hasActiveFamily(payload.sub, payload.sid);
    if (!sessionIsActive) throw new Error("Session is no longer active");

    req.auth = {
      userId: payload.sub,
      familyId: payload.sid
    };

    return next();
  } catch (_error) {
    return next(
      new AppError(
        401,
        "INVALID_ACCESS_TOKEN",
        "Access token is invalid or expired"
      )
    );
  }
}

module.exports = authenticate;
