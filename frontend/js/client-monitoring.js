function safeSource(filename) {
  if (!filename) return "inline";
  try {
    const url = new URL(filename, location.origin);
    return url.origin === location.origin ? url.pathname.slice(0, 120) : "external";
  } catch (_error) {
    return "external";
  }
}

function report(signal) {
  fetch("/api/v1/telemetry/client-errors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signal),
    keepalive: true,
    priority: "low", // telemetry must not compete with what the user is waiting for
    credentials: "same-origin"
  }).catch(() => {});
}

export function initializeClientMonitoring() {
  window.addEventListener("error", (event) => {
    report({
      kind: "error",
      source: safeSource(event.filename),
      line: Number.isInteger(event.lineno) ? event.lineno : null,
      column: Number.isInteger(event.colno) ? event.colno : null
    });
  });
  window.addEventListener("unhandledrejection", () => {
    report({ kind: "unhandledrejection", source: "inline", line: null, column: null });
  });
}
