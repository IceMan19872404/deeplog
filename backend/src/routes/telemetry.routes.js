const express = require("express");
const { rateLimit } = require("express-rate-limit");
const validate = require("../middlewares/validate.middleware");
const controller = require("../controllers/telemetry.controller");
const { clientErrorSchema } = require("../validations/telemetry.validation");

const router = express.Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

router.post("/client-errors", limiter, validate(clientErrorSchema), controller.reportClientError);

module.exports = router;
