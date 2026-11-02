const Sentry = require("@sentry/node");
const env = require("./env");

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const opaqueTokenPattern = /\b[a-f0-9]{64}\b/gi;

function sanitizeText(value) {
  return String(value || "")
    .replace(emailPattern, "[email]")
    .replace(jwtPattern, "[jwt]")
    .replace(opaqueTokenPattern, "[token]")
    .slice(0, 500);
}

function beforeSend(event) {
  delete event.user;
  delete event.request;
  delete event.breadcrumbs;
  if (event.message) event.message = sanitizeText(event.message);
  for (const value of event.exception?.values || []) {
    if (value.value) value.value = "Unhandled server exception";
  }
  return event;
}

const enabled = Boolean(env.sentryDsn);
if (enabled) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    release: env.appRelease,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    defaultIntegrations: false,
    beforeSend
  });
}

function captureException(error, context = {}) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined && value !== null) scope.setTag(key, sanitizeText(value));
    }
    Sentry.captureException(error);
  });
}

function captureClientError(signal, requestId) {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag("requestId", requestId);
    scope.setContext("client_signal", signal);
    Sentry.captureMessage(`Client ${signal.kind}`, "error");
  });
}

module.exports = { enabled, sanitizeText, beforeSend, captureException, captureClientError };
