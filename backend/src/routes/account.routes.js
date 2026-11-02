const express = require("express");
const accountController = require("../controllers/account.controller");
const authenticate = require("../middlewares/auth.middleware");
const validate = require("../middlewares/validate.middleware");
const { deleteAccountSchema } = require("../validations/account.validation");

const router = express.Router();

router.use(authenticate);
router.get("/export.json", accountController.exportJson);
router.get("/export.csv", accountController.exportCsv);
router.get("/export.zip", accountController.exportArchive);
router.delete("/", validate(deleteAccountSchema), accountController.remove);

module.exports = router;
