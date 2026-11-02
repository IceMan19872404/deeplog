const pino = require("pino");
const env = require("./env");

const logger = pino({
  level: process.env.LOG_LEVEL || (env.nodeEnv === "test" ? "silent" : "info"),
  base: {
    service: "deeplog-api",
    environment: env.nodeEnv
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password", "token", "accessToken", "refreshToken", "csrfToken",
      "authorization", "cookie", "req.headers.authorization", "req.headers.cookie",
      "request.headers.authorization", "request.headers.cookie"
    ],
    censor: "[redacted]"
  }
});

module.exports = logger;
