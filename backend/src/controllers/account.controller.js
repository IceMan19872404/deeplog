const accountExportService = require("../services/account-export.service");
const accountService = require("../services/account.service");
const { clearSessionCookies } = require("../utils/auth-cookies");

function downloadHeaders(res, filename, contentType) {
  res.set({
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store"
  });
}

async function exportJson(req, res, next) {
  try {
    const user = await accountExportService.getUser(req.auth.userId);
    downloadHeaders(res, "deeplog-export.json", "application/json; charset=utf-8");
    await accountExportService.writeJson(res, user);
  } catch (error) {
    if (!res.headersSent) return next(error);
    return res.destroy(error);
  }
}

async function exportCsv(req, res, next) {
  try {
    await accountExportService.getUser(req.auth.userId);
    downloadHeaders(res, "deeplog-dives.csv", "text/csv; charset=utf-8");
    await accountExportService.writeCsv(res, req.auth.userId);
  } catch (error) {
    if (!res.headersSent) return next(error);
    return res.destroy(error);
  }
}

async function exportArchive(req, res, next) {
  try {
    const user = await accountExportService.getUser(req.auth.userId);
    downloadHeaders(res, "deeplog-complete-export.zip", "application/zip");
    await accountExportService.streamArchive(res, user);
  } catch (error) {
    if (!res.headersSent) return next(error);
    return res.destroy(error);
  }
}

async function remove(req, res, next) {
  try {
    await accountService.deleteAccount(req.auth.userId, req.body);
    clearSessionCookies(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = { exportJson, exportCsv, exportArchive, remove };
