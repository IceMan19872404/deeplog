const dotenv = require("dotenv");

dotenv.config();

const developmentJwtSecret = "development-only-change-me";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  dbHost: process.env.DB_HOST || "db",
  dbPort: Number(process.env.DB_PORT || 5432),
  dbName: process.env.DB_NAME || "deeplog",
  dbUser: process.env.DB_USER || "deeplog_user",
  dbPassword: process.env.DB_PASSWORD || "deeplog_password",
  uploadsDir: process.env.UPLOADS_DIR || "/app/uploads",
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  jwtSecret: process.env.JWT_SECRET || developmentJwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtIssuer: process.env.JWT_ISSUER || "deeplog-api",
  jwtAudience: process.env.JWT_AUDIENCE || "deeplog-web",
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS || 30),
  sentryDsn: process.env.SENTRY_DSN || "",
  appRelease: process.env.APP_RELEASE || "development",
  trustProxyHops: Number(process.env.TRUST_PROXY_HOPS || 0),
  publicAppUrl: (process.env.PUBLIC_APP_URL || "").replace(/\/+$/, "")
};

if (env.nodeEnv === "production") {
  if (!/^https:\/\/[^/]+$/.test(env.publicAppUrl)) {
    throw new Error("PUBLIC_APP_URL must be the public https origin in production");
  }

  const jwtSecretIsUnsafe =
    env.jwtSecret === developmentJwtSecret ||
    env.jwtSecret.length < 32 ||
    env.jwtSecret.startsWith("replace-with");

  if (jwtSecretIsUnsafe) {
    throw new Error(
      "JWT_SECRET must contain at least 32 random characters in production"
    );
  }
}

module.exports = env;
