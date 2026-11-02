const express = require("express");
const controller = require("../controllers/dive-share.controller");
const validate = require("../middlewares/validate.middleware");
const { shareViewLimiter, sharePasswordLimiter } = require("../middlewares/share-rate-limit.middleware");
const { tokenSchema, sharePasswordSchema, publicPhotoSchema } = require("../validations/dive-share.validation");

const router = express.Router();
router.get("/:token", shareViewLimiter, validate(tokenSchema, "params"), controller.view);
router.post("/:token/access", sharePasswordLimiter, validate(tokenSchema, "params"), validate(sharePasswordSchema), controller.unlock);
router.get("/:token/photos/:position/content", shareViewLimiter, validate(publicPhotoSchema, "params"), controller.photoContent);

module.exports = router;
