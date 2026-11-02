const shareService = require("../services/dive-share.service");
const env = require("../config/env");

function bearerToken(req) {
  const value = req.get("authorization") || "";
  const [scheme, token, extra] = value.trim().split(/\s+/);
  return scheme?.toLowerCase() === "bearer" && token && !extra ? token : null;
}

async function create(req, res, next) {
  try {
    // Share links and QR codes must always point to the canonical https origin.
    // Proxies may rewrite protocol or Host, so production uses PUBLIC_APP_URL.
    const origin = env.publicAppUrl || `${req.protocol}://${req.get("host")}`;
    const result = await shareService.createShare(
      req.auth.userId, req.params.diveId, req.body, origin
    );
    res.set("Cache-Control", "no-store");
    return res.status(201).json({ data: result });
  } catch (error) { return next(error); }
}

async function list(req, res, next) {
  try {
    const shares = await shareService.listShares(req.auth.userId, req.params.diveId);
    return res.status(200).json({ data: { shares } });
  } catch (error) { return next(error); }
}

async function revoke(req, res, next) {
  try {
    await shareService.revokeShare(req.auth.userId, req.params.diveId, req.params.shareId);
    return res.status(204).send();
  } catch (error) { return next(error); }
}

async function view(req, res, next) {
  try {
    const dive = await shareService.viewShare(req.params.token, bearerToken(req));
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ data: { dive } });
  } catch (error) { return next(error); }
}

async function unlock(req, res, next) {
  try {
    const result = await shareService.unlockShare(req.params.token, req.body.password);
    res.set("Cache-Control", "no-store");
    return res.status(200).json({ data: result });
  } catch (error) { return next(error); }
}

async function photoContent(req, res, next) {
  try {
    const photo = await shareService.getPublicPhoto(
      req.params.token, req.params.position, bearerToken(req)
    );
    res.set("Cache-Control", "no-store");
    res.type(photo.mime_type);
    return res.sendFile(photo.absolutePath);
  } catch (error) { return next(error); }
}

module.exports = { create, list, revoke, view, unlock, photoContent };
