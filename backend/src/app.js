const express = require("express");
const helmet = require("helmet");
const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const diveRoutes = require("./routes/dive.routes");
const healthRoutes = require("./routes/health.routes");
const publicShareRoutes = require("./routes/public-share.routes");
const accountRoutes = require("./routes/account.routes");
const telemetryRoutes = require("./routes/telemetry.routes");
const profileRoutes = require("./routes/profile.routes");
const {
  notFoundHandler,
  errorHandler
} = require("./middlewares/error.middleware");
const requestLogger = require("./middlewares/request-logger.middleware");

const app = express();

if (env.trustProxyHops > 0) app.set("trust proxy", env.trustProxyHops);
app.set("query parser", "simple");
app.disable("x-powered-by");
app.use(requestLogger);
app.use(helmet({
  contentSecurityPolicy: false,
  strictTransportSecurity: env.nodeEnv === "production" ? undefined : false
}));
app.use(express.json({ limit: "100kb" }));
app.use("/api/v1", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/account", accountRoutes);
app.use("/api/v1/public/dives", publicShareRoutes);
app.use("/api/v1/telemetry", telemetryRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/dives", diveRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
