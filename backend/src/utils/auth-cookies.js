const env = require("../config/env");

const refreshCookie = "deeplog_refresh";
const csrfCookie = "deeplog_csrf";
const authCookiePath = "/api/v1/auth";

function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return [part, ""];
      const value = part.slice(separator + 1);
      try {
        return [part.slice(0, separator), decodeURIComponent(value)];
      } catch (_error) {
        return [part.slice(0, separator), ""];
      }
    })
  );
}

function cookie(name, value, options = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || authCookiePath}`,
    "SameSite=Strict"
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (env.nodeEnv === "production") parts.push("Secure");
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge / 1000))}`);
  return parts.join("; ");
}

function setSessionCookies(res, tokens) {
  const maxAge = env.refreshTokenDays * 24 * 60 * 60 * 1000;
  res.append("Set-Cookie", cookie(refreshCookie, tokens.refreshToken, { httpOnly: true, maxAge }));
  res.append("Set-Cookie", cookie(csrfCookie, tokens.csrfToken, { path: "/", maxAge }));
}

function clearSessionCookies(res) {
  res.append("Set-Cookie", cookie(refreshCookie, "", { httpOnly: true, maxAge: 0 }));
  res.append("Set-Cookie", cookie(csrfCookie, "", { path: "/", maxAge: 0 }));
}

function readSessionCredentials(req) {
  const cookies = parseCookies(req.get("cookie"));
  return {
    refreshToken: cookies[refreshCookie],
    csrfCookie: cookies[csrfCookie],
    csrfHeader: req.get("x-csrf-token")
  };
}

module.exports = { setSessionCookies, clearSessionCookies, readSessionCredentials };
