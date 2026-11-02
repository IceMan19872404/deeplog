const authService = require("../services/auth.service");
const toUserResponse = require("../utils/user-response");
const env = require("../config/env");
const {
  setSessionCookies,
  clearSessionCookies,
  readSessionCredentials
} = require("../utils/auth-cookies");

function sessionResponse(res, result) {
  setSessionCookies(res, result);
  res.set("Cache-Control", "no-store");
  return res.status(200).json({
    data: {
      user: toUserResponse(result.user),
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn
    }
  });
}

async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);

    return res.status(201).json({
      data: {
        user: toUserResponse(user)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);

    return sessionResponse(res, result);
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(readSessionCredentials(req));
    return sessionResponse(res, result);
  } catch (error) {
    clearSessionCookies(res);
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(readSessionCredentials(req));
    clearSessionCookies(res);
    res.set("Cache-Control", "no-store");
    return res.status(204).send();
  } catch (error) {
    clearSessionCookies(res);
    return next(error);
  }
}

async function logoutAll(req, res, next) {
  try {
    await authService.logoutAll(req.auth.userId, readSessionCredentials(req));
    clearSessionCookies(res);
    res.set("Cache-Control", "no-store");
    return res.status(204).send();
  } catch (error) {
    clearSessionCookies(res);
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.auth.userId);

    return res.status(200).json({
      data: {
        user: toUserResponse(user)
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const token = await authService.requestPasswordReset(req.body);

    return res.status(200).json({
      data: {
        message: "If the account exists, password reset instructions are ready",
        ...(env.nodeEnv !== "production" && token && { resetToken: token })
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body);
    clearSessionCookies(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
  forgotPassword,
  resetPassword
};
