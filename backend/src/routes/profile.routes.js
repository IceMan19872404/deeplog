const express = require("express");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const uploadPhoto = require("../middlewares/profile-photo-upload.middleware");
const controller = require("../controllers/profile.controller");
const { profileSchema } = require("../validations/profile.validation");

const router = express.Router();
router.use(authenticate);
router.get("/", controller.get);
router.put("/", validate(profileSchema), controller.update);
router.get("/photo", controller.photo);
router.put("/photo", uploadPhoto, controller.uploadPhoto);
router.delete("/photo", controller.deletePhoto);

module.exports = router;
