const express = require("express");
const validate = require("../middlewares/validate.middleware");
const { createLimiter } = require("../middlewares/rate-limit");
const controller = require("../controllers/telemetry.controller");
const { clientErrorSchema } = require("../validations/telemetry.validation");

const router = express.Router();
const limiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20
});

router.post("/client-errors", limiter, validate(clientErrorSchema), controller.reportClientError);

module.exports = router;
