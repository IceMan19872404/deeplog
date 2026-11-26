// DeepLog's entry point: wires the views together and owns the session
// (sign in, restore, expiry, sign out), the dashboard tabs, the offline
// switch and the start-up route (?share=, ?resetToken= or the session).
// Each section of the page lives in its own view-*.js module.

import { clearToken, logoutUser, restoreUserSession } from "./api.js?v=20261126-2";
import { initializeClientMonitoring } from "./client-monitoring.js?v=20261123-2";
import {
  closeAllDialogs,
  createConfirmDialog,
  installLightDismissFallback
} from "./dialogs.js?v=20261126-2";
import { installFormBehaviour } from "./forms.js?v=20261126-2";
import { createMotionPreference } from "./motion.js?v=20261121-1";
import {
  clearOfflineSnapshot,
  isNetworkError,
  isOffline,
  readOfflineSnapshot,
  setOffline
} from "./offline.js?v=20261126-2";
import { TABS, createTabs } from "./tabs.js?v=20261123-2";
import { createTheme } from "./theme.js?v=20261123-2";
import { createAccountView } from "./view-account.js?v=20261126-2";
import { createAuthView } from "./view-auth.js?v=20261126-2";
import { createDiveDetail } from "./view-dive-detail.js?v=20261126-2";
import { createDiveEditor } from "./view-dive-editor.js?v=20261126-2";
import { createHomeView } from "./view-home.js?v=20261126-2";
import { createLogbookView } from "./view-logbook.js?v=20261126-2";
import { createMapView } from "./view-map.js?v=20261126-2";
import { createProfileView } from "./view-profile.js?v=20261126-2";
import { createShareView } from "./view-share.js?v=20261126-2";
import { createStatsView } from "./view-stats.js?v=20261126-2";

initializeClientMonitoring();
createTheme();
createMotionPreference();
installFormBehaviour();

const session = { user: null };
const getUser = () => session.user;
const authScreen = document.querySelector("#auth-view");
const dashboard = document.querySelector("#dashboard-view");

const confirmDiscard = createConfirmDialog(document.querySelector("#discard-dialog"));
const confirmDeleteReflection = createConfirmDialog(document.querySelector("#delete-reflection-dialog"));

// Each tab sits one "depth" lower than the previous one, so moving right dives
// deeper and moving left rises to the surface; CSS animates the panel to match.
const tabs = createTabs({
  onChange(id, previous) {
    const tab = TABS.find((item) => item.id === id);
    const from = TABS.findIndex((item) => item.id === previous);
    const content = document.querySelector(".dashboard-content");
    if (content) {
      content.dataset.direction = from < 0 ? "none" : TABS.indexOf(tab) > from ? "deeper" : "shallower";
    }
    document.title = id === "inicio" ? "Mi bitácora | DeepLog" : `${tab.label} | DeepLog`;
    if (id === "mapa") mapView.draw();
  }
});

// Data for a tab that is not on screen is fetched with low priority so it
// does not compete with the visible one (Fetch priority; ignored if unsupported).
function backgroundPriority(tab) {
  return tabs.current === tab ? "auto" : "low";
}

// The views. Callbacks into views created later are arrow functions, so
// they resolve when called, not here.
const authView = createAuthView({ onSignedIn: showDashboard });
const profileView = createProfileView({ getUser, handleUnauthorized, confirmDiscard });
createAccountView({ handleUnauthorized, endSession: endSessionWithMessage });
const detailView = createDiveDetail({
  getUser,
  handleUnauthorized,
  confirmDeleteReflection,
  onReflectionChanged: () => statsView.loadInsights()
});
createShareView({ getDive: () => detailView.dive, getProfile: () => profileView.profile, handleUnauthorized });
const homeView = createHomeView({
  openDiveDetail: detailView.open,
  openCreateDiveForm: () => diveEditor.openCreate()
});
const logbookView = createLogbookView({
  getUser,
  handleUnauthorized,
  home: homeView,
  openDiveDetail: detailView.open,
  openEditDiveForm: (diveId) => diveEditor.openEdit(diveId),
  onChanged: loadDashboardData
});
const diveEditor = createDiveEditor({
  handleUnauthorized,
  confirmDiscard,
  onCreated: logbookView.resetPage,
  onSaved: logbookView.afterSave
});
const statsView = createStatsView({
  handleUnauthorized,
  openDiveDetail: detailView.open,
  onStats: homeView.renderStats,
  priority: () => backgroundPriority("estadisticas")
});
const mapView = createMapView({
  getUser,
  handleUnauthorized,
  openDiveDetail: detailView.open,
  isVisible: () => tabs.current === "mapa",
  priority: () => backgroundPriority("mapa")
});

async function loadDashboardData() {
  await Promise.all([profileView.load(), statsView.loadStats(), statsView.loadInsights(), logbookView.load(), mapView.load()]);
}

function showDashboard(user) {
  session.user = user;
  document.querySelector("#user-name").textContent = `${user.firstName} ${user.lastName}`;
  homeView.greet(user);
  authScreen.hidden = true;
  dashboard.hidden = false;
  document.documentElement.removeAttribute("data-boot");
  tabs.start();
  loadDashboardData();
}

function showAuth() {
  session.user = null;
  logbookView.resetPage();
  profileView.reset();
  dashboard.hidden = true;
  authScreen.hidden = false;
  document.documentElement.removeAttribute("data-boot");
  document.title = "DeepLog";
}

function endSessionLocally() {
  closeAllDialogs();
  clearToken();
  clearOfflineSnapshot();
  showAuth();
}

// Signs out here and explains why on the login screen (logout everywhere,
// deleted account).
function endSessionWithMessage(message, { showLogin = false } = {}) {
  endSessionLocally();
  if (showLogin) authView.switchMode("login");
  authView.showMessage(message, "success");
}

// Every view calls this on a failed request: a 401 means the session is
// gone, so go back to the login. Returns whether it handled the error.
function handleUnauthorized(error) {
  if (error.status !== 401) return false;
  endSessionLocally();
  authView.showMessage("Tu sesión ha caducado. Inicia sesión de nuevo.");
  return true;
}

async function logout() {
  try {
    await logoutUser();
  } finally {
    endSessionLocally();
  }
}

async function restoreSession() {
  // Without the CSRF cookie there is no refresh cookie either (both are set
  // and cleared together): go straight to the login instead of a sure 401.
  if (!/(?:^|;\s*)deeplog_csrf=[^;]/.test(document.cookie)) {
    endSessionLocally();
    return;
  }
  try {
    const response = await restoreUserSession();
    showDashboard(response.data.user);
  } catch (error) {
    // Without network the refresh call cannot reach the API. Keep the last
    // synchronised read-only copy instead of wiping it and showing the login.
    const snapshot = readOfflineSnapshot();
    if (isNetworkError(error) && snapshot?.user && snapshot?.dives) {
      setOffline(true);
      showDashboard(snapshot.user);
      return;
    }
    endSessionLocally();
  }
}

window.addEventListener("offline", () => {
  if (dashboard.hidden) return;
  setOffline(true);
  logbookView.showMessage("Sin conexión: consulta en solo lectura. La edición requiere conexión.", "success");
});

window.addEventListener("online", () => {
  if (!isOffline()) return;
  setOffline(false);
  if (session.user) restoreSession();
});

// The skip link's href (#main-content) would replace the #/<tab> route and
// leave focus before the header and tab bar. On the dashboard it jumps to the
// current panel's heading instead; elsewhere the browser handles it.
document.querySelector(".skip-link")?.addEventListener("click", (event) => {
  if (dashboard.hidden || !tabs.current) return;
  event.preventDefault();
  tabs.focusCurrent();
});
document.querySelector("#logout-button").addEventListener("click", logout);
document.querySelector("#refresh-button").addEventListener("click", loadDashboardData);
installLightDismissFallback(document.querySelectorAll('dialog[closedby="any"]'));

const urlParameters = new URLSearchParams(location.search);
const shareTokenFromUrl = urlParameters.get("share");
const resetTokenFromUrl = urlParameters.get("resetToken");
if (shareTokenFromUrl) {
  // Only share recipients need this module; it stays in the offline shell.
  import("./public-share.js?v=20261126-2")
    .then(({ initializePublicShare }) => {
      const loading = initializePublicShare(shareTokenFromUrl); // swaps the views synchronously
      document.documentElement.removeAttribute("data-boot");
      return loading;
    });
} else if (resetTokenFromUrl) {
  showAuth();
  authView.startPasswordReset(resetTokenFromUrl);
} else {
  restoreSession();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
}
