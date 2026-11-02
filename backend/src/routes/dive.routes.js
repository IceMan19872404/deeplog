const express = require("express");
const diveController = require("../controllers/dive.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const uploadDivePhotos = require("../middlewares/photo-upload.middleware");
const shareController = require("../controllers/dive-share.controller");
const {
  createShareSchema,
  diveIdSchema: shareDiveIdSchema,
  shareIdSchema
} = require("../validations/dive-share.validation");
const {
  createDiveSchema,
  updateDiveSchema,
  diveIdSchema,
  listDivesSchema,
  divePhotoIdSchema,
  configurationMemorySchema
} = require("../validations/dive.validation");
const { reflectionSchema } = require("../validations/dive-reflection.validation");

const router = express.Router();

router.use(authenticate);
router.post("/", validate(createDiveSchema), diveController.create);
router.get("/", validate(listDivesSchema, "query"), diveController.list);
router.get("/stats", diveController.stats);
router.get("/map", diveController.map);
router.get("/insights", diveController.insights);
router.get(
  "/configuration-memory",
  validate(configurationMemorySchema, "query"),
  diveController.configurationMemory
);
router.post(
  "/:diveId/shares",
  validate(shareDiveIdSchema, "params"),
  validate(createShareSchema),
  shareController.create
);
router.get(
  "/:diveId/shares",
  validate(shareDiveIdSchema, "params"),
  shareController.list
);
router.delete(
  "/:diveId/shares/:shareId",
  validate(shareIdSchema, "params"),
  shareController.revoke
);
router.post(
  "/:diveId/photos",
  validate(diveIdSchema, "params"),
  uploadDivePhotos,
  diveController.uploadPhotos
);
router.get(
  "/:diveId/photos/:photoId/content",
  validate(divePhotoIdSchema, "params"),
  diveController.photoContent
);
router.delete(
  "/:diveId/photos/:photoId",
  validate(divePhotoIdSchema, "params"),
  diveController.removePhoto
);
router.put(
  "/:diveId/reflection",
  validate(diveIdSchema, "params"),
  validate(reflectionSchema),
  diveController.saveReflection
);
router.delete(
  "/:diveId/reflection",
  validate(diveIdSchema, "params"),
  diveController.removeReflection
);
router.get(
  "/:diveId",
  validate(diveIdSchema, "params"),
  diveController.getById
);
router.put(
  "/:diveId",
  validate(diveIdSchema, "params"),
  validate(updateDiveSchema),
  diveController.update
);
router.delete(
  "/:diveId",
  validate(diveIdSchema, "params"),
  diveController.remove
);

module.exports = router;
