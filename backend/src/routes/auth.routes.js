const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const {
  loginLimiter,
  registerLimiter,
  passwordRecoveryLimiter,
  passwordResetLimiter,
  refreshLimiter
} = require("../middlewares/auth-rate-limit.middleware");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require("../validations/auth.validation");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  authController.register
);
router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  authController.login
);
router.post(
  "/forgot-password",
  passwordRecoveryLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.post("/logout-all", authenticate, authController.logoutAll);
router.get("/me", authenticate, authController.me);

module.exports = router;
