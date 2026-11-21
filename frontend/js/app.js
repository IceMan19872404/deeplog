import {
  clearToken,
  createDiveShare,
  createDive,
  deleteAccount,
  deleteDive,
  deleteDivePhoto,
  deleteDiveReflection,
  getConfigurationMemory,
  getDive,
  getDiveInsights,
  getDiveMap,
  getDivePhotoBlob,
  getDiveStats,
  getDiveShares,
  getDives,
  getProfile,
  getProfilePhotoBlob,
  loginUser,
  logoutAllSessions,
  logoutUser,
  downloadAccountExport,
  requestPasswordReset,
  registerUser,
  resetPassword,
  restoreUserSession,
  saveDiveReflection,
  revokeDiveShare,
  setToken,
  updateProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateDive,
  uploadDivePhotos
} from "./api.js?v=20260930-1";
import { openDivePrintPreview } from "./dive-pdf.js?v=20260902-2";
import { initializePublicShare } from "./public-share.js?v=20260902-2";
import { initializeClientMonitoring } from "./client-monitoring.js?v=20260916-1";
import {
  apiValidationMessage,
  nativeValidationMessage
} from "./validation-messages.js?v=20261019-2";
import { populateDiveForm } from "./dive-form.js?v=20261019-1";
import { createDiveMap } from "./dive-map.js?v=20261030-1";
import { TABS, createTabs } from "./tabs.js?v=20261121-1";
import { createTheme } from "./theme.js?v=20261121-2";
import { profileSvg } from "./dive-profile.js?v=20261121-2";
import { countUp, createMotionPreference } from "./motion.js?v=20261121-1";

initializeClientMonitoring();
createTheme();
createMotionPreference();

const state = {
  user: null,
  page: 1,
  limit: 6,
  totalPages: 0,
  editingDiveId: null,
  deletingDive: null,
  currentPhotos: [],
  selectedPhotoUrls: [],
  existingPhotoUrls: [],
  detailPhotoUrls: [],
  detailDive: null,
  detailPrintPhotos: [],
  shares: [],
  profile: null,
  profilePhotoUrl: null,
  offline: false
};

const elements = {
  authView: document.querySelector("#auth-view"),
  dashboardView: document.querySelector("#dashboard-view"),
  loginTab: document.querySelector("#login-tab"),
  registerTab: document.querySelector("#register-tab"),
  loginForm: document.querySelector("#login-form"),
  registerForm: document.querySelector("#register-form"),
  forgotPasswordForm: document.querySelector("#forgot-password-form"),
  resetPasswordForm: document.querySelector("#reset-password-form"),
  forgotPasswordButton: document.querySelector("#forgot-password-button"),
  backLoginButtons: document.querySelectorAll("[data-back-login]"),
  authTabs: document.querySelector(".auth-tabs"),
  authMessage: document.querySelector("#auth-message"),
  dashboardMessage: document.querySelector("#dashboard-message"),
  userName: document.querySelector("#user-name"),
  openProfileHeader: document.querySelector("#open-profile-header"),
  openProfile: document.querySelector("#open-profile"),
  profileDialog: document.querySelector("#profile-dialog"),
  profileForm: document.querySelector("#profile-form"),
  closeProfile: document.querySelector("#close-profile"),
  cancelProfile: document.querySelector("#cancel-profile"),
  removeProfilePhoto: document.querySelector("#remove-profile-photo"),
  profileMessage: document.querySelector("#profile-message"),
  profileSummaryCopy: document.querySelector("#profile-summary-copy"),
  profileCertification: document.querySelector("#profile-certification"),
  profileSince: document.querySelector("#profile-since"),
  profilePrivacy: document.querySelector("#profile-privacy"),
  profileAvatars: document.querySelectorAll("#header-avatar, #profile-avatar, #profile-form-avatar"),
  logoutButton: document.querySelector("#logout-button"),
  logoutAllButton: document.querySelector("#logout-all-button"),
  refreshButton: document.querySelector("#refresh-button"),
  divesTotal: document.querySelector("#dives-total"),
  greetingName: document.querySelector("#greeting-name"),
  homeDate: document.querySelector("#home-date"),
  homeSummary: document.querySelector("#home-summary"),
  homeTotalTime: document.querySelector("#home-total-time"),
  homeMaxDepth: document.querySelector("#home-max-depth"),
  homeThisYear: document.querySelector("#home-this-year"),
  homeLastDive: document.querySelector("#home-last-dive"),
  homeRecent: document.querySelector("#home-recent"),
  totalTime: document.querySelector("#total-time"),
  maxDepth: document.querySelector("#max-depth"),
  longestDuration: document.querySelector("#longest-duration"),
  divesThisYear: document.querySelector("#dives-this-year"),
  favoriteCenter: document.querySelector("#favorite-center"),
  statsLoading: document.querySelector("#stats-loading"),
  activityChart: document.querySelector("#activity-chart"),
  diveMap: document.querySelector("#dive-map"),
  mapStatus: document.querySelector("#map-status"),
  advancedInsightsLoading: document.querySelector("#advanced-insights-loading"),
  advancedInsightsEmpty: document.querySelector("#advanced-insights-empty"),
  advancedInsightsContent: document.querySelector("#advanced-insights-content"),
  evolutionChart: document.querySelector("#evolution-chart"),
  ownershipComparison: document.querySelector("#ownership-comparison"),
  frequentBuddies: document.querySelector("#frequent-buddies"),
  frequentCenters: document.querySelector("#frequent-centers"),
  ballastPatterns: document.querySelector("#ballast-patterns"),
  reflectionEvolution: document.querySelector("#reflection-evolution"),
  exportButtons: document.querySelectorAll("[data-export-format]"),
  accountMessage: document.querySelector("#account-message"),
  openDeleteAccount: document.querySelector("#open-delete-account"),
  deleteAccountDialog: document.querySelector("#delete-account-dialog"),
  deleteAccountForm: document.querySelector("#delete-account-form"),
  deleteAccountMessage: document.querySelector("#delete-account-message"),
  cancelDeleteAccount: document.querySelector("#cancel-delete-account"),
  divesLoading: document.querySelector("#dives-loading"),
  divesEmpty: document.querySelector("#dives-empty"),
  divesList: document.querySelector("#dives-list"),
  pagination: document.querySelector("#pagination"),
  previousPage: document.querySelector("#previous-page"),
  nextPage: document.querySelector("#next-page"),
  pageLabel: document.querySelector("#page-label"),
  openDiveFormButtons: document.querySelectorAll("[data-open-dive-form]"),
  diveDialog: document.querySelector("#dive-dialog"),
  diveForm: document.querySelector("#dive-form"),
  diveFormTitle: document.querySelector("#dive-form-title"),
  diveFormEyebrow: document.querySelector("#dive-form-eyebrow"),
  diveFormMessage: document.querySelector("#dive-form-message"),
  saveDiveButton: document.querySelector("#save-dive-button"),
  closeDiveFormButtons: document.querySelectorAll("[data-close-dive-form]"),
  deleteDialog: document.querySelector("#delete-dialog"),
  deleteDiveName: document.querySelector("#delete-dive-name"),
  deleteMessage: document.querySelector("#delete-message"),
  cancelDeleteButton: document.querySelector("#cancel-delete-button"),
  confirmDeleteButton: document.querySelector("#confirm-delete-button"),
  selectedPhotos: document.querySelector("#selected-photos"),
  existingPhotos: document.querySelector("#existing-photos"),
  searchConfigurationMemory: document.querySelector("#search-configuration-memory"),
  configurationMemoryMessage: document.querySelector("#configuration-memory-message"),
  configurationMemoryResults: document.querySelector("#configuration-memory-results"),
  detailDialog: document.querySelector("#dive-detail-dialog"),
  detailName: document.querySelector("#detail-name"),
  detailSubtitle: document.querySelector("#detail-subtitle"),
  detailLoading: document.querySelector("#detail-loading"),
  detailMessage: document.querySelector("#detail-message"),
  detailContent: document.querySelector("#detail-content"),
  detailDate: document.querySelector("#detail-date"),
  detailDuration: document.querySelector("#detail-duration"),
  detailDepth: document.querySelector("#detail-depth"),
  detailCenter: document.querySelector("#detail-center"),
  detailBallast: document.querySelector("#detail-ballast"),
  detailEquipment: document.querySelector("#detail-equipment"),
  detailSuit: document.querySelector("#detail-suit"),
  detailCylinder: document.querySelector("#detail-cylinder"),
  detailWater: document.querySelector("#detail-water"),
  detailLocation: document.querySelector("#detail-location"),
  detailBuddies: document.querySelector("#detail-buddies"),
  detailComments: document.querySelector("#detail-comments"),
  reflectionForm: document.querySelector("#reflection-form"),
  reflectionMessage: document.querySelector("#reflection-message"),
  deleteReflection: document.querySelector("#delete-reflection"),
  detailGallerySection: document.querySelector("#detail-gallery-section"),
  detailPhotos: document.querySelector("#detail-photos"),
  closeDiveDetail: document.querySelector("#close-dive-detail"),
  exportDivePdf: document.querySelector("#export-dive-pdf"),
  detailExportMessage: document.querySelector("#detail-export-message"),
  openShareDialog: document.querySelector("#open-share-dialog"),
  shareDialog: document.querySelector("#share-dialog"),
  shareForm: document.querySelector("#share-form"),
  closeShareDialog: document.querySelector("#close-share-dialog"),
  cancelShareDialog: document.querySelector("#cancel-share-dialog"),
  sharePhotoOptions: document.querySelector("#share-photo-options"),
  sharePhotoList: document.querySelector("#share-photo-list"),
  shareMessage: document.querySelector("#share-message"),
  shareResult: document.querySelector("#share-result"),
  shareQr: document.querySelector("#share-qr"),
  shareLink: document.querySelector("#share-link"),
  copyShareLink: document.querySelector("#copy-share-link"),
  shareList: document.querySelector("#share-list"),
  useCurrentLocation: document.querySelector("#use-current-location"),
  clearLocation: document.querySelector("#clear-location"),
  locationMessage: document.querySelector("#location-message")
};

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
  }
});

function setMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = `message message-${type}`;
  element.hidden = !message;
}

function setFormBusy(form, busy) {
  const button = form.querySelector("button[type='submit']");
  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
  form.setAttribute("aria-busy", String(busy));
  [...form.elements].forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.readOnly = busy;
    }
  });
}

function syncDisappearingExamples() {
  elements.diveForm.querySelectorAll("[data-disappearing-example]").forEach((example) => {
    const field = example.previousElementSibling?.matches("input, select, textarea")
      ? example.previousElementSibling
      : example.previousElementSibling?.querySelector("input, select, textarea");
    if (!field) return;
    example.hidden = field.type === "file" ? field.files.length > 0 : Boolean(field.value);
  });
}

function switchAuthMode(mode) {
  const loginActive = mode === "login";
  const registerActive = mode === "register";

  elements.loginForm.hidden = !loginActive;
  elements.registerForm.hidden = !registerActive;
  elements.forgotPasswordForm.hidden = mode !== "forgot";
  elements.resetPasswordForm.hidden = mode !== "reset";
  elements.authTabs.hidden = !loginActive && !registerActive;
  elements.loginTab.classList.toggle("is-active", loginActive);
  elements.registerTab.classList.toggle("is-active", registerActive);
  elements.loginTab.setAttribute("aria-selected", String(loginActive));
  elements.registerTab.setAttribute("aria-selected", String(registerActive));
  elements.loginTab.tabIndex = loginActive ? 0 : -1;
  elements.registerTab.tabIndex = registerActive ? 0 : -1;
  setMessage(elements.authMessage, "");
  clearFormErrors(elements.authView);
}

function clearFieldError(input) {
  input.removeAttribute("aria-invalid");
  const error = input.closest("label")?.querySelector(".field-error");
  if (error) error.remove();
}

function clearFormErrors(container) {
  container.querySelectorAll("input, textarea, select").forEach(clearFieldError);
}

function setFieldError(form, field, message) {
  const input = form.elements[field];
  if (!input || input.type === "hidden") return;

  clearFieldError(input);
  input.setAttribute("aria-invalid", "true");
  const error = document.createElement("span");
  error.className = "field-error";
  error.textContent = message;
  input.insertAdjacentElement("afterend", error);
}

function validateForm(form) {
  clearFormErrors(form);
  let firstInvalid = null;

  [...form.elements].forEach((input) => {
    if (!(input instanceof HTMLInputElement ||
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLSelectElement)) {
      return;
    }
    if (input.type === "hidden" || input.checkValidity()) return;
    setFieldError(form, input.name, nativeValidationMessage(input));
    firstInvalid ||= input;
  });

  if (form === elements.resetPasswordForm) {
    const password = form.elements.password;
    const confirmation = form.elements.passwordConfirmation;
    if (password.value && confirmation.value && password.value !== confirmation.value) {
      setFieldError(form, "passwordConfirmation", "Las contraseñas no coinciden.");
      firstInvalid ||= confirmation;
    }
  }

  if (form === elements.diveForm) {
    const buddiesInput = form.elements.buddiesText;
    const buddies = parseBuddies(buddiesInput.value);
    if (buddies.length > 10) {
      setFieldError(form, "buddiesText", "Puedes añadir un máximo de 10 compañeros.");
      firstInvalid ||= buddiesInput;
    } else if (buddies.some((name) => name.length < 2 || name.length > 80)) {
      setFieldError(
        form,
        "buddiesText",
        "Cada nombre debe tener entre 2 y 80 caracteres."
      );
      firstInvalid ||= buddiesInput;
    }

    const files = [...form.elements.photos.files];
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (state.currentPhotos.length + files.length > 5) {
      setFieldError(form, "photos", "Cada inmersión puede contener hasta 5 fotos.");
      firstInvalid ||= form.elements.photos;
    } else if (files.some((file) => !allowedTypes.has(file.type))) {
      setFieldError(form, "photos", "Utiliza únicamente imágenes JPEG, PNG o WebP.");
      firstInvalid ||= form.elements.photos;
    } else if (files.some((file) => file.size > 8 * 1024 * 1024)) {
      setFieldError(form, "photos", "Cada fotografía debe ocupar 8 MB o menos.");
      firstInvalid ||= form.elements.photos;
    }
  }

  if (form === elements.reflectionForm) {
    const values = [...new FormData(form).values()];
    if (!values.some((value) => String(value).trim())) {
      setFieldError(form, "wentWell", "Escribe al menos una reflexión.");
      firstInvalid ||= form.elements.wentWell;
    }
  }

  firstInvalid?.focus();
  return !firstInvalid;
}

function showApiFieldErrors(form, details = []) {
  let firstInvalid = null;
  details.forEach(({ field, message }) => {
    if (!form.elements[field] || form.elements[field].type === "hidden") return;
    setFieldError(form, field, apiValidationMessage(field, message));
    firstInvalid ||= form.elements[field];
  });
  firstInvalid?.focus();
  return Boolean(firstInvalid);
}

function formDataToObject(form) {
  return Object.fromEntries(
    [...new FormData(form).entries()].filter(([, value]) => value !== "")
  );
}

function parseBuddies(value) {
  const seen = new Set();
  return value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => {
      if (!name) return false;
      const key = name.toLocaleLowerCase("es");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function diveFormData() {
  const data = formDataToObject(elements.diveForm);
  const { buddiesText = "", photos: _photos, ...diveData } = data;

  ["suitThicknessMm", "cylinderVolumeLiters", "latitude", "longitude"].forEach((key) => {
    if (diveData[key] !== undefined) diveData[key] = Number(diveData[key]);
  });
  if (diveData.latitude === undefined && diveData.longitude === undefined) {
    delete diveData.locationPrecision;
  }
  return {
    ...diveData,
    durationMinutes: Number(data.durationMinutes),
    maxDepthMeters: Number(data.maxDepthMeters),
    ...(data.ballastKg !== undefined && { ballastKg: Number(data.ballastKg) }),
    buddies: parseBuddies(buddiesText)
  };
}

const offlineKey = "deeplog.offline.v1";

const onlineOnlySelector = [
  "[data-open-dive-form]", ".dive-card [data-action]", "#open-share-dialog",
  "#reflection-form button[type=\"submit\"]", "#delete-reflection", "#open-profile",
  "[data-export-format]", "#logout-all-button", "#open-delete-account", "#refresh-button"
].join(", ");

function applyOfflineMode() {
  document.body.classList.toggle("is-offline", state.offline);
  document.querySelectorAll(onlineOnlySelector).forEach((control) => {
    control.disabled = state.offline;
    if (state.offline) control.title = "Disponible al recuperar la conexión";
    else control.removeAttribute("title");
  });
}

function isNetworkError(error) {
  return !navigator.onLine || error instanceof TypeError;
}

function writeOfflineSnapshot(data) {
  try {
    localStorage.setItem(offlineKey, JSON.stringify({ ...data, user: state.user, savedAt: Date.now() }));
  } catch (_error) { /* Storage can be unavailable in private browsing. */ }
}

function readOfflineSnapshot() {
  try { return JSON.parse(localStorage.getItem(offlineKey)); } catch (_error) { return null; }
}

let diveMap = null;

function describeMapDive(dive) {
  return `${dive.name} · ${formatDate(dive.date)} · ${dive.precision === "approximate" ? "ubicación aproximada" : "ubicación exacta privada"}`;
}

function renderDiveMap(dives = []) {
  if (!dives.length) {
    diveMap?.update([]);
    elements.diveMap.innerHTML = '<p class="map-empty">Añade coordenadas a una inmersión para situarla en tu mapa privado.</p>';
    elements.diveMap.setAttribute("aria-label", "Sin ubicaciones registradas");
    return;
  }
  elements.diveMap.setAttribute("aria-label", `Mapa con ${dives.length} ubicaciones de inmersión registradas`);
  diveMap ||= createDiveMap(elements.diveMap, { onSelect: openDiveDetail, describe: describeMapDive });
  diveMap.update(dives);
}

async function loadDiveMap() {
  try {
    const response = await getDiveMap();
    renderDiveMap(response.data.dives);
    writeOfflineSnapshot({ ...(readOfflineSnapshot() || {}), map: response.data.dives });
  } catch (error) {
    const cached = readOfflineSnapshot()?.map;
    if (cached) {
      renderDiveMap(cached);
      elements.mapStatus.textContent = "Mapa guardado en este dispositivo · modo sin conexión.";
    } else if (!handleUnauthorized(error)) {
      renderDiveMap([]);
    }
  }
}

function clearPhotoUrls(type) {
  const keyByType = {
    selected: "selectedPhotoUrls",
    existing: "existingPhotoUrls",
    detail: "detailPhotoUrls"
  };
  const key = keyByType[type];
  state[key].forEach(URL.revokeObjectURL);
  state[key] = [];
}

function clearAllPhotoUrls() {
  clearPhotoUrls("selected");
  clearPhotoUrls("existing");
  clearPhotoUrls("detail");
}

function photoCard(url, label, deleteButton = "") {
  return `
    <figure class="photo-card">
      <img src="${url}" alt="${escapeHtml(label)}">
      <figcaption>${escapeHtml(label)}</figcaption>
      ${deleteButton}
    </figure>
  `;
}

function renderSelectedPhotos() {
  clearPhotoUrls("selected");
  const files = [...elements.diveForm.elements.photos.files];
  elements.selectedPhotos.hidden = files.length === 0;
  elements.selectedPhotos.innerHTML = files
    .map((file) => {
      const url = URL.createObjectURL(file);
      state.selectedPhotoUrls.push(url);
      return photoCard(url, file.name);
    })
    .join("");
}

async function renderExistingPhotos(photos, diveId) {
  clearPhotoUrls("existing");
  state.currentPhotos = photos;
  elements.existingPhotos.hidden = photos.length === 0;
  elements.existingPhotos.innerHTML = photos.length
    ? '<span class="photo-loading">Cargando galería...</span>'
    : "";
  if (photos.length === 0) return;

  const cards = await Promise.all(
    photos.map(async (photo) => {
      try {
        const blob = await getDivePhotoBlob(photo.url);
        const url = URL.createObjectURL(blob);
        state.existingPhotoUrls.push(url);
        const button = `
          <button
            class="photo-remove"
            type="button"
            data-photo-id="${escapeHtml(photo.id)}"
            data-dive-id="${escapeHtml(diveId)}"
            aria-label="Eliminar ${escapeHtml(photo.originalName)}"
          >×</button>`;
        return photoCard(url, photo.originalName, button);
      } catch (_error) {
        return `<span class="photo-load-error">No se pudo cargar ${escapeHtml(photo.originalName)}</span>`;
      }
    })
  );
  elements.existingPhotos.innerHTML = cards.join("");
}

async function renderDetailPhotos(photos) {
  clearPhotoUrls("detail");
  state.detailPrintPhotos = [];
  elements.detailGallerySection.hidden = photos.length === 0;
  elements.detailPhotos.innerHTML = photos.length
    ? '<span class="photo-loading">Cargando galería...</span>'
    : "";
  if (photos.length === 0) return;

  const cards = await Promise.all(
    photos.map(async (photo) => {
      try {
        const blob = await getDivePhotoBlob(photo.url);
        const url = URL.createObjectURL(blob);
        state.detailPhotoUrls.push(url);
        return {
          photo: { ...photo, url },
          card: `
            <figure class="photo-card photo-card-selectable">
              <img src="${url}" alt="${escapeHtml(photo.originalName)}">
              <figcaption>${escapeHtml(photo.originalName)}</figcaption>
              <label class="photo-export-toggle">
                <input type="checkbox" value="${escapeHtml(photo.id)}" checked>
                <span>Incluir en PDF</span>
              </label>
            </figure>`
        };
      } catch (_error) {
        return {
          photo: null,
          card: `<span class="photo-load-error">No se pudo cargar ${escapeHtml(photo.originalName)}</span>`
        };
      }
    })
  );
  state.detailPrintPhotos = cards.flatMap((item) => item.photo ? [item.photo] : []);
  elements.detailPhotos.innerHTML = cards.map((item) => item.card).join("");
}

const suitLabels = { wetsuit: "Traje húmedo", drysuit: "Traje seco", shorty: "Shorty", none: "Sin traje" };
const cylinderLabels = { steel: "Acero", aluminum: "Aluminio" };
const waterLabels = { salt: "Agua salada", fresh: "Agua dulce" };
const comfortLabels = {
  comfortable: "Con comodidad",
  mixed: "Con sensaciones mixtas",
  challenging: "Fue exigente"
};

function suitDescription(dive) {
  if (!dive.suitType && dive.suitThicknessMm === null) return "No indicado";
  return [suitLabels[dive.suitType], dive.suitThicknessMm === null ? null : `${dive.suitThicknessMm} mm`]
    .filter(Boolean).join(" · ");
}

function cylinderDescription(dive) {
  if (!dive.cylinderMaterial && dive.cylinderVolumeLiters === null) return "No indicada";
  return [cylinderLabels[dive.cylinderMaterial], dive.cylinderVolumeLiters === null ? null : `${dive.cylinderVolumeLiters} L`]
    .filter(Boolean).join(" · ");
}

function configurationFilters() {
  const form = elements.diveForm.elements;
  const filters = {};
  ["waterType", "suitType", "suitThicknessMm", "cylinderMaterial", "cylinderVolumeLiters"]
    .forEach((key) => { if (form[key].value) filters[key] = form[key].value; });
  if (state.editingDiveId) filters.excludeDiveId = state.editingDiveId;
  return filters;
}

async function searchConfigurationMemory() {
  const filters = configurationFilters();
  elements.configurationMemoryResults.replaceChildren();
  if (Object.keys(filters).every((key) => key === "excludeDiveId")) {
    elements.configurationMemoryMessage.textContent = "Indica al menos el traje, la botella o el tipo de agua para buscar coincidencias.";
    return;
  }
  elements.searchConfigurationMemory.disabled = true;
  elements.configurationMemoryMessage.textContent = "Buscando en tu bitácora...";
  try {
    const response = await getConfigurationMemory(filters);
    const dives = response.data.dives;
    elements.configurationMemoryMessage.textContent = dives.length
      ? `${dives.length} ${dives.length === 1 ? "experiencia similar encontrada" : "experiencias similares encontradas"}. Referencia personal, no recomendación.`
      : "No hay experiencias anteriores que coincidan con esta configuración.";
    elements.configurationMemoryResults.innerHTML = dives.map((dive) => `
      <article class="memory-card">
        <div><strong>${escapeHtml(dive.name)}</strong><span>${escapeHtml(formatDate(dive.date))}${dive.diveCenter ? ` · ${escapeHtml(dive.diveCenter)}` : ""}</span></div>
        <div class="memory-ballast"><strong>${escapeHtml(dive.ballastKg)} kg</strong><span>lastre registrado</span></div>
      </article>`).join("");
  } catch (error) {
    if (!handleUnauthorized(error)) elements.configurationMemoryMessage.textContent = "No se pudo consultar tu historial.";
  } finally { elements.searchConfigurationMemory.disabled = false; }
}

function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${date}T00:00:00`));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderDives(dives) {
  elements.divesList.replaceChildren();
  queueMicrotask(applyOfflineMode);

  if (dives.length === 0) {
    elements.divesEmpty.hidden = false;
    return;
  }

  elements.divesEmpty.hidden = true;
  elements.divesList.innerHTML = dives
    .map(
      (dive, index) => `
        <article
          class="dive-card"
          style="--delay: ${index * 70}ms"
          data-dive-id="${escapeHtml(dive.id)}"
          role="button"
          tabindex="0"
          aria-label="Ver toda la información de ${dive.diveNumber ? `la inmersión nº ${escapeHtml(dive.diveNumber)}, ` : ""}${escapeHtml(dive.name)}"
        >
          <div class="dive-date">
            ${dive.diveNumber ? `<span class="dive-number"><abbr title="Número de inmersión">Nº</abbr> ${escapeHtml(dive.diveNumber)}</span>` : ""}
            <span>${escapeHtml(formatDate(dive.date))}</span>
            <strong>${escapeHtml(dive.maxDepthMeters)} m</strong>
            <span class="depth-bar" style="--depth: ${Math.min(100, Math.round((Number(dive.maxDepthMeters) / 40) * 100))}%" aria-hidden="true"></span>
          </div>
          <div class="dive-main">
            <h3>${escapeHtml(dive.name)}</h3>
            <p>${escapeHtml(dive.diveCenter || "Centro no indicado")}</p>
            <div class="dive-equipment">
              ${
                dive.ballastKg === null
                  ? ""
                  : `<span>${escapeHtml(dive.ballastKg)} kg de lastre</span>`
              }
              ${
                dive.equipmentOwnership
                  ? `<span>${
                      dive.equipmentOwnership === "owned"
                        ? "Material propio"
                        : "Material de alquiler"
                    }</span>`
                  : ""
              }
            </div>
            ${
              dive.buddies.length
                ? `<p class="dive-buddies">Con ${escapeHtml(dive.buddies.join(", "))}</p>`
                : ""
            }
            ${
              dive.photos.length
                ? `<span class="photo-count">${escapeHtml(dive.photos.length)} ${
                    dive.photos.length === 1 ? "foto" : "fotos"
                  }</span>`
                : ""
            }
          </div>
          <div class="dive-duration">
            <strong>${escapeHtml(dive.durationMinutes)}</strong>
            <span>min</span>
          </div>
          <p class="dive-comments">
            ${escapeHtml(dive.comments || "Sin comentarios")}
          </p>
          <div class="dive-actions" aria-label="Acciones de ${escapeHtml(dive.name)}">
            <button
              class="card-action"
              type="button"
              data-action="edit"
              data-dive-id="${escapeHtml(dive.id)}"
            >
              Editar
            </button>
            <button
              class="card-action card-action-danger"
              type="button"
              data-action="delete"
              data-dive-id="${escapeHtml(dive.id)}"
              data-dive-name="${escapeHtml(dive.name)}"
            >
              Eliminar
            </button>
          </div>
          <span class="card-open-hint" aria-hidden="true">Ver detalle →</span>
        </article>
      `
    )
    .join("");
}

function handleUnauthorized(error) {
  if (error.status !== 401) return false;

  elements.diveDialog.close();
  elements.detailDialog.close();
  elements.shareDialog.close();
  elements.deleteDialog.close();
  endSessionLocally();
  setMessage(
    elements.authMessage,
    "Tu sesión ha caducado. Inicia sesión de nuevo."
  );
  return true;
}

function closeDiveDetail() {
  elements.detailDialog.close();
  clearPhotoUrls("detail");
  state.detailDive = null;
  state.detailPrintPhotos = [];
  elements.detailPhotos.replaceChildren();
}

function exportDivePdf() {
  if (!state.detailDive) return;

  const selectedPhotoIds = new Set(
    [...elements.detailPhotos.querySelectorAll("input:checked")]
      .map((input) => String(input.value))
  );
  const photos = state.detailPrintPhotos.filter((photo) =>
    selectedPhotoIds.has(String(photo.id))
  );
  const diverName = state.user
    ? `${state.user.firstName} ${state.user.lastName}`
    : "Bitácora personal";
  const opened = openDivePrintPreview({
    dive: state.detailDive,
    photos,
    diverName
  });

  elements.detailExportMessage.textContent = opened
    ? "Previsualización abierta en una nueva pestaña."
    : "El navegador ha bloqueado la previsualización. Permite las ventanas emergentes e inténtalo de nuevo.";
}

function formatShareExpiry(value) {
  return value ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value)) : "Sin caducidad";
}

function renderShareList() {
  if (state.shares.length === 0) {
    elements.shareList.innerHTML = '<p class="muted">Todavía no hay enlaces.</p>';
    return;
  }
  const labels = { active: "Activo", expired: "Caducado", revoked: "Revocado" };
  elements.shareList.innerHTML = state.shares.map((share) => `
    <article class="share-history-item">
      <div><strong>${labels[share.status]}</strong><span>${escapeHtml(formatShareExpiry(share.expiresAt))}${share.passwordProtected ? " · Con contraseña" : ""}</span></div>
      ${share.status === "active" ? `<button class="card-action card-action-danger" type="button" data-share-id="${escapeHtml(share.id)}">Revocar</button>` : ""}
    </article>`).join("");
}

async function loadShares() {
  if (!state.detailDive) return;
  try {
    const response = await getDiveShares(state.detailDive.id);
    state.shares = response.data.shares;
    renderShareList();
  } catch (error) {
    if (!handleUnauthorized(error)) setMessage(elements.shareMessage, "No se pudieron cargar los enlaces existentes.");
  }
}

function openShareDialog() {
  if (!state.detailDive) return;
  elements.shareForm.reset();
  elements.shareForm.elements.expiresInDays.value = "7";
  [...elements.shareForm.querySelectorAll('.share-options input[type="checkbox"]')].forEach((input) => { input.checked = true; });
  elements.shareForm.elements.includeDiverName.checked = Boolean(state.profile?.shareNameByDefault);
  elements.shareResult.hidden = true;
  setMessage(elements.shareMessage, "");
  elements.sharePhotoOptions.hidden = state.detailDive.photos.length === 0;
  elements.sharePhotoList.innerHTML = state.detailDive.photos.map((photo) => `
    <label><input type="checkbox" name="sharedPhotos" value="${escapeHtml(photo.id)}" checked>${escapeHtml(photo.originalName)}</label>`).join("");
  elements.shareDialog.showModal();
  loadShares();
}

function closeShareDialog() {
  elements.shareDialog.close();
}

async function handleShareSubmit(event) {
  event.preventDefault();
  if (!state.detailDive || !validateForm(elements.shareForm)) return;
  const button = elements.shareForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setMessage(elements.shareMessage, "");
  const form = elements.shareForm.elements;
  const expiry = form.expiresInDays.value;
  const payload = {
    visibility: {
      includeDiverName: form.includeDiverName.checked,
      includeCenter: form.includeCenter.checked,
      includeEquipment: form.includeEquipment.checked,
      includeBuddies: form.includeBuddies.checked,
      includeComments: form.includeComments.checked,
      photoIds: [...elements.sharePhotoList.querySelectorAll("input:checked")].map((input) => Number(input.value))
    },
    expiresInDays: expiry === "never" ? null : Number(expiry),
    ...(form.password.value && { password: form.password.value })
  };
  try {
    const response = await createDiveShare(state.detailDive.id, payload);
    elements.shareLink.value = response.data.shareUrl;
    elements.shareQr.src = response.data.qrDataUrl;
    elements.shareResult.hidden = false;
    form.password.value = "";
    await loadShares();
    setMessage(elements.shareMessage, "Enlace privado creado. Puedes copiarlo o escanear el QR.", "success");
  } catch (error) {
    if (!handleUnauthorized(error)) setMessage(elements.shareMessage, "No se pudo crear el enlace. Revisa la configuración.");
  } finally { button.disabled = false; }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(elements.shareLink.value);
    elements.copyShareLink.textContent = "Copiado";
    setTimeout(() => { elements.copyShareLink.textContent = "Copiar"; }, 1800);
  } catch (_error) {
    elements.shareLink.select();
    setMessage(elements.shareMessage, "Selecciona el enlace y cópialo manualmente.");
  }
}

async function handleShareListClick(event) {
  const button = event.target.closest("[data-share-id]");
  if (!button || !state.detailDive) return;
  button.disabled = true;
  try {
    await revokeDiveShare(state.detailDive.id, button.dataset.shareId);
    await loadShares();
    setMessage(elements.shareMessage, "El enlace ha sido revocado.", "success");
  } catch (error) {
    if (!handleUnauthorized(error)) setMessage(elements.shareMessage, "No se pudo revocar el enlace.");
  }
}

async function openDiveDetail(diveId) {
  clearPhotoUrls("detail");
  elements.detailName.textContent = "Detalle de la inmersión";
  elements.detailSubtitle.textContent = "Consulta toda la información registrada.";
  elements.detailLoading.hidden = false;
  elements.detailContent.hidden = true;
  elements.detailGallerySection.hidden = true;
  elements.detailExportMessage.textContent = "";
  state.detailDive = null;
  setMessage(elements.detailMessage, "");
  elements.detailDialog.showModal();

  try {
    const response = await getDive(diveId);
    const dive = response.data.dive;
    state.detailDive = dive;
    elements.detailName.textContent = dive.name;
    elements.detailSubtitle.textContent = [
      dive.diveNumber ? `Inmersión nº ${dive.diveNumber}` : "",
      formatDate(dive.date),
      `${dive.maxDepthMeters} m`
    ].filter(Boolean).join(" · ");
    elements.detailDate.textContent = formatDate(dive.date);
    elements.detailDuration.textContent = `${dive.durationMinutes} minutos`;
    elements.detailDepth.textContent = `${dive.maxDepthMeters} metros`;
    elements.detailCenter.textContent = dive.diveCenter || "No indicado";
    elements.detailBallast.textContent =
      dive.ballastKg === null ? "No indicado" : `${dive.ballastKg} kg`;
    elements.detailEquipment.textContent = dive.equipmentOwnership
      ? dive.equipmentOwnership === "owned"
        ? "Material propio"
        : "Material de alquiler"
      : "No indicado";
    elements.detailSuit.textContent = suitDescription(dive);
    elements.detailCylinder.textContent = cylinderDescription(dive);
    elements.detailWater.textContent = waterLabels[dive.waterType] || "No indicado";
    elements.detailLocation.textContent = dive.location
      ? `${dive.location.latitude}, ${dive.location.longitude} · ${dive.location.precision === "approximate" ? "aproximada" : "exacta y privada"}`
      : "No indicada";
    elements.detailBuddies.textContent = dive.buddies.length
      ? dive.buddies.join(", ")
      : "No se indicaron compañeros.";
    elements.detailComments.textContent = dive.comments || "Sin notas registradas.";
    elements.reflectionForm.reset();
    Object.entries(dive.reflection || {}).forEach(([key, value]) => {
      if (elements.reflectionForm.elements[key]) {
        elements.reflectionForm.elements[key].value = value || "";
      }
    });
    elements.deleteReflection.hidden = !dive.reflection;
    setMessage(elements.reflectionMessage, "");
    elements.detailContent.hidden = false;
    await renderDetailPhotos(dive.photos);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    setMessage(elements.detailMessage, "No se pudo cargar la inmersión.");
  } finally {
    elements.detailLoading.hidden = true;
  }
}

async function handleReflectionSubmit(event) {
  event.preventDefault();
  if (!state.detailDive || !validateForm(elements.reflectionForm)) return;
  setFormBusy(elements.reflectionForm, true);
  setMessage(elements.reflectionMessage, "");
  try {
    const response = await saveDiveReflection(
      state.detailDive.id,
      formDataToObject(elements.reflectionForm)
    );
    state.detailDive = response.data.dive;
    elements.deleteReflection.hidden = false;
    setMessage(elements.reflectionMessage, "Reflexión guardada en tu diario.", "success");
    await loadAdvancedInsights();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showApiFieldErrors(elements.reflectionForm, error.details);
    setMessage(elements.reflectionMessage, "No se pudo guardar la reflexión.");
  } finally {
    setFormBusy(elements.reflectionForm, false);
  }
}

async function handleReflectionDelete() {
  if (!state.detailDive || !window.confirm("¿Borrar esta reflexión personal?")) return;
  elements.deleteReflection.disabled = true;
  try {
    await deleteDiveReflection(state.detailDive.id);
    state.detailDive.reflection = null;
    elements.reflectionForm.reset();
    elements.deleteReflection.hidden = true;
    setMessage(elements.reflectionMessage, "Reflexión borrada.", "success");
    await loadAdvancedInsights();
  } catch (error) {
    if (!handleUnauthorized(error)) {
      setMessage(elements.reflectionMessage, "No se pudo borrar la reflexión.");
    }
  } finally {
    elements.deleteReflection.disabled = false;
  }
}

function renderPagination(meta) {
  state.totalPages = meta.totalPages;
  elements.divesTotal.textContent = meta.total;
  elements.pagination.hidden = meta.totalPages <= 1;
  elements.pageLabel.textContent = `Página ${meta.page} de ${meta.totalPages}`;
  elements.previousPage.disabled = meta.page <= 1;
  elements.nextPage.disabled = meta.page >= meta.totalPages;
}

function formatTotalTime(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
}

function monthLabel(month) {
  return new Intl.DateTimeFormat("es-ES", { month: "short" })
    .format(new Date(`${month}-01T00:00:00`))
    .replace(".", "");
}

function renderActivityChart(activity) {
  const maximum = Math.max(...activity.map((entry) => entry.total), 1);
  elements.activityChart.innerHTML = activity
    .map((entry) => {
      const height = entry.total === 0 ? 5 : Math.max(18, (entry.total / maximum) * 100);
      return `
        <div class="activity-month">
          <span class="activity-value">${escapeHtml(entry.total)}</span>
          <span
            class="activity-bar"
            style="--bar-height: ${height}%"
            title="${escapeHtml(entry.total)} inmersiones"
          ></span>
          <span class="activity-label">${escapeHtml(monthLabel(entry.month))}</span>
        </div>
      `;
    })
    .join("");
  const total = activity.reduce((sum, entry) => sum + entry.total, 0);
  elements.activityChart.setAttribute(
    "aria-label",
    total === 0
      ? "Sin actividad registrada en los últimos seis meses"
      : `${total} inmersiones registradas en los últimos seis meses`
  );
}

function renderStats(stats) {
  countUp(elements.divesTotal, stats.totalDives);
  elements.totalTime.textContent = formatTotalTime(stats.totalMinutes);
  elements.maxDepth.textContent = stats.maxDepthMeters === null
    ? "—"
    : `${stats.maxDepthMeters} m`;
  elements.longestDuration.textContent = stats.longestDurationMinutes === null
    ? "—"
    : `${stats.longestDurationMinutes} min`;
  elements.divesThisYear.textContent = stats.divesThisYear;
  elements.homeTotalTime.textContent = elements.totalTime.textContent;
  elements.homeMaxDepth.textContent = elements.maxDepth.textContent;
  countUp(elements.homeThisYear, stats.divesThisYear);
  elements.homeSummary.textContent = stats.totalDives
    ? `Llevas ${stats.totalDives} ${stats.totalDives === 1 ? "inmersión" : "inmersiones"} y ${formatTotalTime(stats.totalMinutes)} bajo el agua.`
    : "Tu bitácora está lista para su primera inmersión.";
  elements.favoriteCenter.textContent = stats.favoriteCenter
    ? `Tu centro más visitado: ${stats.favoriteCenter.name}`
    : "Registra un centro para descubrir tu lugar más visitado.";
  renderActivityChart(stats.monthlyActivity);
}

function frequencyMarkup(items, emptyLabel) {
  if (!items.length) return `<li class="frequency-empty">${escapeHtml(emptyLabel)}</li>`;
  return items.map((item) => `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.total)}</strong></li>`).join("");
}

function configurationName(item) {
  const suit = [suitLabels[item.suitType], item.suitThicknessMm === null ? null : `${item.suitThicknessMm} mm`].filter(Boolean).join(" ");
  const cylinder = [cylinderLabels[item.cylinderMaterial], item.cylinderVolumeLiters === null ? null : `${item.cylinderVolumeLiters} L`].filter(Boolean).join(" ");
  return [suit, cylinder, waterLabels[item.waterType]].filter(Boolean).join(" · ") || "Configuración parcial";
}

function renderEvolution(items) {
  if (!items.length) {
    elements.evolutionChart.innerHTML = '<p class="frequency-empty">Sin inmersiones registradas.</p>';
    elements.evolutionChart.setAttribute("aria-label", "Sin datos de evolución");
    return;
  }
  const maxDepth = Math.max(...items.map((item) => item.maxDepthMeters), 1);
  const maxDuration = Math.max(...items.map((item) => item.durationMinutes), 1);
  elements.evolutionChart.innerHTML = items.map((item) => `
    <div class="evolution-point" title="${escapeHtml(formatDate(item.date))}: ${escapeHtml(item.maxDepthMeters)} m, ${escapeHtml(item.durationMinutes)} min">
      <div class="evolution-bars">
        <span class="evolution-depth" style="--value:${Math.max(6, item.maxDepthMeters / maxDepth * 100)}%"></span>
        <span class="evolution-duration" style="--value:${Math.max(6, item.durationMinutes / maxDuration * 100)}%"></span>
      </div>
      <small>${escapeHtml(new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" }).format(new Date(`${item.date}T00:00:00`)).replace(".", ""))}</small>
    </div>`).join("");
  elements.evolutionChart.setAttribute(
    "aria-label",
    `Evolución de ${items.length} inmersiones. Profundidad máxima y duración se muestran con escalas independientes.`
  );
}

function renderAdvancedInsights(insights) {
  const hasData = insights.evolution.length > 0;
  elements.advancedInsightsEmpty.hidden = hasData;
  elements.advancedInsightsContent.hidden = !hasData;
  if (!hasData) return;

  renderEvolution(insights.evolution);
  elements.frequentBuddies.innerHTML = frequencyMarkup(insights.frequentBuddies, "Aún no hay compañeros repetidos.");
  elements.frequentCenters.innerHTML = frequencyMarkup(insights.frequentCenters, "Aún no hay centros registrados.");
  elements.ownershipComparison.innerHTML = insights.equipmentOwnership.length
    ? insights.equipmentOwnership.map((item) => `
      <div class="ownership-row"><div><strong>${item.type === "owned" ? "Material propio" : "Material de alquiler"}</strong><span>${escapeHtml(item.sampleSize)} ${item.sampleSize === 1 ? "inmersión" : "inmersiones"}</span></div><p><b>${escapeHtml(item.averageDurationMinutes)} min</b><span>duración media</span></p><p><b>${escapeHtml(item.averageDepthMeters)} m</b><span>profundidad media</span></p></div>`).join("")
    : '<p class="frequency-empty">Indica si el material es propio o alquilado para comparar.</p>';
  elements.ballastPatterns.innerHTML = insights.ballastConfigurations.length
    ? insights.ballastConfigurations.map((item) => `
      <article class="ballast-pattern"><div><strong>${escapeHtml(configurationName(item))}</strong><span>${escapeHtml(item.sampleSize)} ${item.sampleSize === 1 ? "registro" : "registros"}</span></div><p><b>${escapeHtml(item.averageBallastKg)} kg</b><span>media observada</span></p><p><b>${escapeHtml(item.minimumBallastKg)}-${escapeHtml(item.maximumBallastKg)} kg</b><span>rango registrado</span></p></article>`).join("")
    : '<p class="frequency-empty">Completa lastre y configuración para crear grupos comparables.</p>';
  elements.reflectionEvolution.innerHTML = insights.reflectionEvolution.length
    ? insights.reflectionEvolution.map((item) => `
      <article class="reflection-moment">
        <time>${escapeHtml(formatDate(item.date))}</time>
        <div><strong>${escapeHtml(item.diveName)}</strong>
          ${item.practicedSkill ? `<span>Practiqué: ${escapeHtml(item.practicedSkill)}</span>` : ""}
          ${item.comfort ? `<span>${escapeHtml(comfortLabels[item.comfort])}</span>` : ""}
          ${item.nextGoal ? `<p>Próximo objetivo: ${escapeHtml(item.nextGoal)}</p>` : ""}
        </div>
      </article>`).join("")
    : '<p class="frequency-empty">Añade una reflexión desde el detalle de una inmersión.</p>';
}

async function loadAdvancedInsights() {
  elements.advancedInsightsLoading.hidden = false;
  try {
    const response = await getDiveInsights();
    renderAdvancedInsights(response.data.insights);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    elements.advancedInsightsEmpty.textContent = "No se pudo analizar el historial en este momento.";
    elements.advancedInsightsEmpty.hidden = false;
    elements.advancedInsightsContent.hidden = true;
  } finally {
    elements.advancedInsightsLoading.hidden = true;
  }
}

async function loadStats() {
  elements.statsLoading.hidden = false;
  try {
    const response = await getDiveStats();
    renderStats(response.data.stats);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    elements.favoriteCenter.textContent = "No se pudieron actualizar las estadísticas.";
  } finally {
    elements.statsLoading.hidden = true;
  }
}

const certificationLabels = {
  beginner: "En formación",
  open_water: "Open Water",
  advanced: "Advanced",
  rescue: "Rescue Diver",
  divemaster: "Divemaster",
  instructor: "Instructor/a"
};

function setProfileAvatars(photoUrl = null) {
  const initials = state.user
    ? `${state.user.firstName[0] || ""}${state.user.lastName[0] || ""}`.toUpperCase()
    : "";
  elements.profileAvatars.forEach((avatar) => {
    avatar.textContent = photoUrl ? "" : initials;
    avatar.style.backgroundImage = photoUrl ? `url("${photoUrl}")` : "";
    avatar.classList.toggle("has-photo", Boolean(photoUrl));
  });
}

async function loadProfilePhoto(profile) {
  if (state.profilePhotoUrl) URL.revokeObjectURL(state.profilePhotoUrl);
  state.profilePhotoUrl = null;
  if (profile.photoUrl) {
    try {
      state.profilePhotoUrl = URL.createObjectURL(await getProfilePhotoBlob());
    } catch (_error) {
      state.profilePhotoUrl = null;
    }
  }
  setProfileAvatars(state.profilePhotoUrl);
  elements.removeProfilePhoto.hidden = !state.profilePhotoUrl;
}

function renderProfile(profile) {
  state.profile = profile;
  elements.profileSummaryCopy.textContent = profile.bio ||
    "Completa tu perfil para reunir trayectoria y preferencias.";
  elements.profileCertification.textContent =
    certificationLabels[profile.certificationLevel] || "Sin indicar";
  elements.profileSince.textContent = profile.divingSince || "Sin indicar";
  elements.profilePrivacy.textContent = profile.shareNameByDefault
    ? "Nombre incluido por defecto"
    : "Nombre oculto por defecto";
}

async function loadProfile() {
  try {
    const response = await getProfile();
    renderProfile(response.data.profile);
    await loadProfilePhoto(response.data.profile);
  } catch (error) {
    if (!handleUnauthorized(error)) {
      elements.profileSummaryCopy.textContent = "No se pudo cargar el perfil.";
    }
  }
}

function openProfileDialog() {
  const profile = state.profile || {};
  elements.profileForm.elements.bio.value = profile.bio || "";
  elements.profileForm.elements.certificationLevel.value = profile.certificationLevel || "";
  elements.profileForm.elements.divingSince.value = profile.divingSince || "";
  elements.profileForm.elements.divingSince.max = new Date().getFullYear();
  elements.profileForm.elements.shareNameByDefault.checked = Boolean(profile.shareNameByDefault);
  elements.profileForm.elements.photo.value = "";
  setMessage(elements.profileMessage, "");
  clearFormErrors(elements.profileForm);
  elements.profileDialog.showModal();
}

function closeProfileDialog() {
  elements.profileDialog.close();
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  if (!validateForm(elements.profileForm)) return;
  const form = elements.profileForm.elements;
  const photo = form.photo.files[0];
  setFormBusy(elements.profileForm, true);
  setMessage(elements.profileMessage, "");
  try {
    const response = await updateProfile({
      bio: form.bio.value.trim() || null,
      certificationLevel: form.certificationLevel.value || null,
      divingSince: form.divingSince.value ? Number(form.divingSince.value) : null,
      shareNameByDefault: form.shareNameByDefault.checked
    });
    let profile = response.data.profile;
    if (photo) {
      try {
        profile = (await uploadProfilePhoto(photo)).data.profile;
      } catch (photoError) {
        renderProfile(profile);
        await loadProfilePhoto(profile);
        setMessage(elements.profileMessage, "Los datos se guardaron, pero la fotografía no era válida o superaba 3 MB.");
        return;
      }
    }
    renderProfile(profile);
    await loadProfilePhoto(profile);
    setMessage(elements.profileMessage, "Perfil actualizado.", "success");
    setTimeout(() => { if (elements.profileDialog.open) closeProfileDialog(); }, 500);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    const fields = showApiFieldErrors(elements.profileForm, error.details);
    setMessage(elements.profileMessage, fields ? "Revisa los campos señalados." : "No se pudo guardar el perfil.");
  } finally {
    setFormBusy(elements.profileForm, false);
  }
}

async function handleProfilePhotoDelete() {
  elements.removeProfilePhoto.disabled = true;
  try {
    await deleteProfilePhoto();
    const profile = { ...state.profile, photoUrl: null };
    renderProfile(profile);
    await loadProfilePhoto(profile);
    setMessage(elements.profileMessage, "Fotografía eliminada.", "success");
  } catch (error) {
    if (!handleUnauthorized(error)) setMessage(elements.profileMessage, "No se pudo eliminar la fotografía.");
  } finally {
    elements.removeProfilePhoto.disabled = false;
  }
}

async function loadDashboardData() {
  await Promise.all([loadProfile(), loadStats(), loadAdvancedInsights(), loadDives(), loadDiveMap()]);
}

function daysAgoLabel(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today - new Date(`${date}T00:00:00`)) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

// Inicio shows the newest dives. The list endpoint is ordered by date, so the
// first page of the logbook already holds them.
function renderHome(dives) {
  const [latest, ...rest] = dives;
  if (!latest) {
    elements.homeLastDive.innerHTML = `
      <p class="muted">Todavía no hay inmersiones registradas.</p>
      <button class="primary-button" data-open-dive-form type="button">Registrar la primera</button>`;
    elements.homeLastDive.querySelector("[data-open-dive-form]").addEventListener("click", openCreateDiveForm);
    elements.homeRecent.innerHTML = "";
    return;
  }
  elements.homeLastDive.innerHTML = `
    <button class="home-last-open" type="button" data-dive-id="${escapeHtml(latest.id)}">
      <span class="home-last-name">${escapeHtml(latest.name)}</span>
      <span class="home-last-meta">${escapeHtml(formatDate(latest.date))} · ${escapeHtml(daysAgoLabel(latest.date))}${latest.diveCenter ? ` · ${escapeHtml(latest.diveCenter)}` : ""}</span>
      <span class="home-last-facts">
        <span><b>${escapeHtml(latest.maxDepthMeters)}</b> m</span>
        <span><b>${escapeHtml(latest.durationMinutes)}</b> min</span>
        ${latest.buddies.length ? `<span>Con ${escapeHtml(latest.buddies.join(", "))}</span>` : ""}
      </span>
      <span class="home-last-profile">${profileSvg(latest.maxDepthMeters, latest.durationMinutes)}</span>
      <span class="home-last-caption">Perfil aproximado según profundidad máxima y duración</span>
      <span class="home-last-hint">Abrir ficha →</span>
    </button>`;
  elements.homeRecent.innerHTML = rest.slice(0, 4).map((dive) => `
    <li><button type="button" data-dive-id="${escapeHtml(dive.id)}">
      <span class="home-recent-depth">${escapeHtml(dive.maxDepthMeters)} m</span>
      <span class="home-recent-text"><strong>${escapeHtml(dive.name)}</strong><small>${escapeHtml(formatDate(dive.date))}</small></span>
    </button></li>`).join("") || '<li class="muted">Las siguientes inmersiones aparecerán aquí.</li>';
}

function handleHomeClick(event) {
  const target = event.target.closest("[data-dive-id]");
  if (target) openDiveDetail(target.dataset.diveId);
}

async function loadDives() {
  elements.divesLoading.hidden = false;
  elements.divesList.hidden = true;
  elements.divesEmpty.hidden = true;
  setMessage(elements.dashboardMessage, "");

  try {
    const response = await getDives(state.page, state.limit);
    renderDives(response.data.dives);
    renderPagination(response.meta);
    if (state.page === 1) renderHome(response.data.dives);
    writeOfflineSnapshot({ ...(readOfflineSnapshot() || {}), dives: response.data.dives, meta: response.meta });
  } catch (error) {
    if (handleUnauthorized(error)) return;
    const cached = readOfflineSnapshot();
    if (cached?.dives) {
      state.offline = true;
      applyOfflineMode();
      renderDives(cached.dives);
      renderPagination(cached.meta || { page: 1, totalPages: 1 });
      renderHome(cached.dives);
      setMessage(elements.dashboardMessage, "Mostrando la última copia sincronizada. La edición requiere conexión.", "success");
    } else setMessage(elements.dashboardMessage, "No se pudieron cargar las inmersiones.");
  } finally {
    elements.divesLoading.hidden = true;
    elements.divesList.hidden = false;
  }
}

function resetDiveForm() {
  state.editingDiveId = null;
  elements.diveForm.reset();
  elements.diveForm.elements.date.max = new Date().toISOString().slice(0, 10);
  elements.diveFormTitle.textContent = "Registrar inmersión";
  elements.diveFormEyebrow.textContent = "Nueva experiencia";
  elements.saveDiveButton.textContent = "Guardar inmersión";
  clearAllPhotoUrls();
  state.currentPhotos = [];
  elements.selectedPhotos.replaceChildren();
  elements.selectedPhotos.hidden = true;
  elements.existingPhotos.replaceChildren();
  elements.existingPhotos.hidden = true;
  elements.configurationMemoryMessage.textContent = "";
  elements.configurationMemoryResults.replaceChildren();
  elements.locationMessage.textContent = "";
  setMessage(elements.diveFormMessage, "");
  syncDisappearingExamples();
}

function openCreateDiveForm() {
  resetDiveForm();
  elements.diveDialog.showModal();
  elements.diveForm.elements.name.focus();
}

function closeDiveForm() {
  if (elements.diveForm.classList.contains("is-busy")) return;
  elements.diveDialog.close();
  resetDiveForm();
}

async function openEditDiveForm(diveId) {
  resetDiveForm();
  state.editingDiveId = diveId;
  elements.diveFormTitle.textContent = "Editar inmersión";
  elements.diveFormEyebrow.textContent = "Actualizar recuerdo";
  elements.saveDiveButton.textContent = "Guardar cambios";
  elements.diveDialog.showModal();
  setFormBusy(elements.diveForm, true);
  elements.diveForm.classList.add("is-busy");

  try {
    const response = await getDive(diveId);
    const dive = response.data.dive;

    populateDiveForm(elements.diveForm, dive);
    await renderExistingPhotos(dive.photos, dive.id);
    elements.diveForm.elements.name.focus();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    setMessage(
      elements.diveFormMessage,
      "No se pudo cargar la inmersión para editarla."
    );
  } finally {
    elements.diveForm.classList.remove("is-busy");
    setFormBusy(elements.diveForm, false);
  }
}

async function handleDiveSubmit(event) {
  event.preventDefault();
  setMessage(elements.diveFormMessage, "");

  if (!validateForm(elements.diveForm)) return;

  setFormBusy(elements.diveForm, true);
  elements.diveForm.classList.add("is-busy");

  try {
    const data = diveFormData();
    const photoFiles = [...elements.diveForm.elements.photos.files];
    const isEditing = Boolean(state.editingDiveId);
    let response;

    if (isEditing) {
      response = await updateDive(state.editingDiveId, data);
    } else {
      response = await createDive(data);
      state.page = 1;
    }

    if (photoFiles.length > 0) {
      try {
        await uploadDivePhotos(response.data.dive.id, photoFiles);
      } catch (photoError) {
        state.editingDiveId = response.data.dive.id;
        elements.diveForm.elements.photos.value = "";
        clearPhotoUrls("selected");
        elements.selectedPhotos.hidden = true;
        const refreshed = await getDive(response.data.dive.id);
        await renderExistingPhotos(refreshed.data.dive.photos, response.data.dive.id);
        setMessage(
          elements.diveFormMessage,
          photoError.code === "PHOTO_LIMIT_EXCEEDED"
            ? "La inmersión se guardó, pero supera el límite de 5 fotos."
            : "La inmersión se guardó, pero las fotografías no pudieron subirse."
        );
        return;
      }
    }

    elements.diveDialog.close();
    resetDiveForm();
    await loadDashboardData();
    setMessage(
      elements.dashboardMessage,
      isEditing
        ? "Inmersión actualizada correctamente."
        : "Inmersión añadida a tu bitácora.",
      "success"
    );
  } catch (error) {
    if (handleUnauthorized(error)) return;
    const hasFieldErrors = showApiFieldErrors(elements.diveForm, error.details);
    setMessage(
      elements.diveFormMessage,
      hasFieldErrors
        ? "Revisa los campos señalados."
        : "No se pudo guardar la inmersión. Inténtalo de nuevo."
    );
  } finally {
    elements.diveForm.classList.remove("is-busy");
    setFormBusy(elements.diveForm, false);
  }
}

async function handlePhotoDelete(event) {
  const button = event.target.closest("[data-photo-id]");
  if (!button) return;
  button.disabled = true;

  try {
    await deleteDivePhoto(button.dataset.diveId, button.dataset.photoId);
    const remaining = state.currentPhotos.filter(
      (photo) => String(photo.id) !== button.dataset.photoId
    );
    clearPhotoUrls("existing");
    await renderExistingPhotos(remaining, button.dataset.diveId);
    setMessage(elements.diveFormMessage, "Fotografía eliminada.", "success");
  } catch (error) {
    if (handleUnauthorized(error)) return;
    button.disabled = false;
    setMessage(elements.diveFormMessage, "No se pudo eliminar la fotografía.");
  }
}

function openDeleteDialog(diveId, diveName) {
  state.deletingDive = { id: diveId, name: diveName };
  elements.deleteDiveName.textContent = diveName;
  setMessage(elements.deleteMessage, "");
  elements.deleteDialog.showModal();
}

function closeDeleteDialog() {
  state.deletingDive = null;
  elements.deleteDialog.close();
}

async function handleDeleteDive() {
  if (!state.deletingDive) return;

  elements.confirmDeleteButton.disabled = true;
  elements.confirmDeleteButton.classList.add("is-loading");
  elements.cancelDeleteButton.disabled = true;
  setMessage(elements.deleteMessage, "");

  try {
    await deleteDive(state.deletingDive.id);
    closeDeleteDialog();

    if (state.page > 1 && elements.divesList.children.length === 1) {
      state.page -= 1;
    }

    await loadDashboardData();
    setMessage(
      elements.dashboardMessage,
      "Inmersión eliminada de tu bitácora.",
      "success"
    );
  } catch (error) {
    if (handleUnauthorized(error)) return;
    setMessage(elements.deleteMessage, "No se pudo eliminar la inmersión.");
  } finally {
    elements.confirmDeleteButton.disabled = false;
    elements.confirmDeleteButton.classList.remove("is-loading");
    elements.cancelDeleteButton.disabled = false;
  }
}

function handleDiveListClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) {
    const card = event.target.closest(".dive-card");
    if (card) openDiveDetail(card.dataset.diveId);
    return;
  }

  if (button.dataset.action === "edit") {
    openEditDiveForm(button.dataset.diveId);
  }

  if (button.dataset.action === "delete") {
    openDeleteDialog(button.dataset.diveId, button.dataset.diveName);
  }
}

function handleDiveListKeydown(event) {
  if (event.target.closest("[data-action]")) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".dive-card");
  if (!card) return;
  event.preventDefault();
  openDiveDetail(card.dataset.diveId);
}

function showDashboard(user) {
  state.user = user;
  elements.userName.textContent = `${user.firstName} ${user.lastName}`;
  elements.greetingName.textContent = user.firstName;
  elements.homeDate.textContent = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  elements.authView.hidden = true;
  elements.dashboardView.hidden = false;
  tabs.start();
  loadDashboardData();
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    elements.locationMessage.textContent = "Este navegador no permite obtener la ubicación.";
    return;
  }
  elements.useCurrentLocation.disabled = true;
  elements.locationMessage.textContent = "Solicitando permiso de ubicación...";
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    elements.diveForm.elements.latitude.value = coords.latitude.toFixed(5);
    elements.diveForm.elements.longitude.value = coords.longitude.toFixed(5);
    elements.locationMessage.textContent = "Ubicación añadida. Revisa la precisión antes de guardar.";
    elements.useCurrentLocation.disabled = false;
  }, () => {
    elements.locationMessage.textContent = "No se pudo obtener la ubicación. Puedes escribirla manualmente.";
    elements.useCurrentLocation.disabled = false;
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

function clearLocation() {
  elements.diveForm.elements.latitude.value = "";
  elements.diveForm.elements.longitude.value = "";
  elements.diveForm.elements.locationPrecision.value = "approximate";
  elements.locationMessage.textContent = "La ubicación no se guardará.";
}

function showAuth() {
  state.user = null;
  state.page = 1;
  if (state.profilePhotoUrl) URL.revokeObjectURL(state.profilePhotoUrl);
  state.profilePhotoUrl = null;
  state.profile = null;
  elements.dashboardView.hidden = true;
  elements.authView.hidden = false;
  document.title = "DeepLog";
}

function endSessionLocally() {
  clearToken();
  localStorage.removeItem(offlineKey);
  showAuth();
}

async function logout() {
  try {
    await logoutUser();
  } finally {
    endSessionLocally();
  }
}

async function handleLogoutAll() {
  elements.logoutAllButton.disabled = true;
  elements.accountMessage.textContent = "Cerrando todas las sesiones...";
  try {
    await logoutAllSessions();
    endSessionLocally();
    setMessage(elements.authMessage, "Se han cerrado todas tus sesiones.", "success");
  } catch (_error) {
    elements.accountMessage.textContent = "No se pudieron cerrar todas las sesiones.";
  } finally {
    elements.logoutAllButton.disabled = false;
  }
}

async function handleAccountExport(event) {
  const button = event.currentTarget;
  const format = button.dataset.exportFormat;
  elements.accountMessage.textContent = "Preparando descarga...";
  button.disabled = true;
  try {
    await downloadAccountExport(format);
    elements.accountMessage.textContent = format === "zip"
      ? "Archivo completo preparado. Incluye datos y fotografías."
      : `Exportación ${format.toUpperCase()} preparada.`;
  } catch (error) {
    if (handleUnauthorized(error)) return;
    elements.accountMessage.textContent = "No se pudo preparar la exportación.";
  } finally {
    button.disabled = false;
  }
}

function openDeleteAccountDialog() {
  elements.deleteAccountForm.reset();
  setMessage(elements.deleteAccountMessage, "");
  elements.deleteAccountDialog.showModal();
}

function closeDeleteAccountDialog() {
  if (!elements.deleteAccountForm.classList.contains("is-busy")) {
    elements.deleteAccountDialog.close();
  }
}

async function handleDeleteAccount(event) {
  event.preventDefault();
  setMessage(elements.deleteAccountMessage, "");
  if (!validateForm(elements.deleteAccountForm)) return;

  setFormBusy(elements.deleteAccountForm, true);
  try {
    await deleteAccount(formDataToObject(elements.deleteAccountForm));
    elements.deleteAccountDialog.close();
    endSessionLocally();
    switchAuthMode("login");
    setMessage(elements.authMessage, "Tu cuenta y todos sus datos se han eliminado.", "success");
  } catch (error) {
    if (handleUnauthorized(error) && error.code !== "INVALID_ACCOUNT_PASSWORD") return;
    if (error.code === "INVALID_ACCOUNT_PASSWORD") {
      setFieldError(elements.deleteAccountForm, "password", "La contraseña no es correcta.");
    } else {
      showApiFieldErrors(elements.deleteAccountForm, error.details);
    }
    setMessage(elements.deleteAccountMessage,
      error.code === "INVALID_ACCOUNT_PASSWORD"
        ? "La contraseña no es correcta."
        : "No se pudo eliminar la cuenta.");
  } finally {
    setFormBusy(elements.deleteAccountForm, false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  setMessage(elements.authMessage, "");

  if (!validateForm(elements.loginForm)) return;

  setFormBusy(elements.loginForm, true);

  try {
    const response = await loginUser(formDataToObject(elements.loginForm));
    setToken(response.data.accessToken);
    elements.loginForm.reset();
    showDashboard(response.data.user);
  } catch (error) {
    if (error.code === "INVALID_CREDENTIALS") {
      const message = "El correo o la contraseña no coinciden con una cuenta.";
      setFieldError(elements.loginForm, "email", message);
      setFieldError(elements.loginForm, "password", message);
    } else {
      showApiFieldErrors(elements.loginForm, error.details);
    }
    const message = error.code === "INVALID_CREDENTIALS"
      ? "El correo o la contraseña no son correctos."
      : error.code === "RATE_LIMIT_EXCEEDED"
        ? "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."
        : "No se pudo iniciar sesión. Inténtalo de nuevo.";
    setMessage(elements.authMessage, message);
  } finally {
    setFormBusy(elements.loginForm, false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  setMessage(elements.authMessage, "");

  if (!validateForm(elements.registerForm)) return;

  setFormBusy(elements.registerForm, true);

  try {
    const data = formDataToObject(elements.registerForm);
    await registerUser(data);
    elements.registerForm.reset();
    switchAuthMode("login");
    elements.loginForm.elements.email.value = data.email;
    setMessage(
      elements.authMessage,
      "Cuenta creada. Ya puedes iniciar sesión.",
      "success"
    );
  } catch (error) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      setMessage(
        elements.authMessage,
        "Se han creado demasiadas cuentas desde esta conexión. Inténtalo más tarde."
      );
      return;
    }
    if (error.code === "EMAIL_ALREADY_REGISTERED") {
      setFieldError(
        elements.registerForm,
        "email",
        "Ya existe una cuenta registrada con este correo."
      );
    } else {
      showApiFieldErrors(elements.registerForm, error.details);
    }
    const message =
      error.code === "EMAIL_ALREADY_REGISTERED"
        ? "Ya existe una cuenta con ese correo."
        : error.details?.[0]?.message ||
          "No se pudo crear la cuenta. Revisa los datos.";
    setMessage(elements.authMessage, message);
  } finally {
    setFormBusy(elements.registerForm, false);
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();
  setMessage(elements.authMessage, "");
  if (!validateForm(elements.forgotPasswordForm)) return;

  setFormBusy(elements.forgotPasswordForm, true);
  try {
    const response = await requestPasswordReset(
      formDataToObject(elements.forgotPasswordForm)
    );
    const resetToken = response.data.resetToken;

    if (resetToken) {
      switchAuthMode("reset");
      elements.resetPasswordForm.elements.token.value = resetToken;
      elements.resetPasswordForm.elements.password.focus();
      setMessage(
        elements.authMessage,
        "Cuenta localizada. Ya puedes establecer una contraseña nueva.",
        "success"
      );
    } else {
      switchAuthMode("login");
      setMessage(
        elements.authMessage,
        "Si existe una cuenta con ese correo, recibirás instrucciones para recuperarla.",
        "success"
      );
    }
  } catch (error) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      setMessage(
        elements.authMessage,
        "Has solicitado demasiados enlaces. Espera unos minutos antes de repetirlo."
      );
      return;
    }
    const hasFieldErrors = showApiFieldErrors(
      elements.forgotPasswordForm,
      error.details
    );
    setMessage(
      elements.authMessage,
      hasFieldErrors
        ? "Revisa el campo señalado."
        : "No se pudo preparar la recuperación. Inténtalo de nuevo."
    );
  } finally {
    setFormBusy(elements.forgotPasswordForm, false);
  }
}

async function handleResetPassword(event) {
  event.preventDefault();
  setMessage(elements.authMessage, "");
  if (!validateForm(elements.resetPasswordForm)) return;

  setFormBusy(elements.resetPasswordForm, true);
  try {
    const { token, password } = formDataToObject(elements.resetPasswordForm);
    await resetPassword({ token, password });
    elements.resetPasswordForm.reset();
    history.replaceState({}, "", location.pathname);
    switchAuthMode("login");
    setMessage(
      elements.authMessage,
      "Contraseña actualizada. Ya puedes iniciar sesión.",
      "success"
    );
  } catch (error) {
    if (error.code === "RATE_LIMIT_EXCEEDED") {
      setMessage(
        elements.authMessage,
        "Demasiados intentos. Solicita un enlace nuevo dentro de unos minutos."
      );
      return;
    }
    if (error.code === "INVALID_OR_EXPIRED_RESET_TOKEN") {
      setMessage(
        elements.authMessage,
        "El enlace de recuperación ha caducado o ya se ha utilizado. Solicita uno nuevo."
      );
    } else {
      const hasFieldErrors = showApiFieldErrors(
        elements.resetPasswordForm,
        error.details
      );
      setMessage(
        elements.authMessage,
        hasFieldErrors
          ? "Revisa los campos señalados."
          : "No se pudo cambiar la contraseña. Inténtalo de nuevo."
      );
    }
  } finally {
    setFormBusy(elements.resetPasswordForm, false);
  }
}

async function restoreSession() {
  try {
    const response = await restoreUserSession();
    showDashboard(response.data.user);
  } catch (error) {
    // Without network the refresh call cannot reach the API. Keep the last
    // synchronised read-only copy instead of wiping it and showing the login.
    const snapshot = readOfflineSnapshot();
    if (isNetworkError(error) && snapshot?.user && snapshot?.dives) {
      state.offline = true;
      showDashboard(snapshot.user);
      applyOfflineMode();
      return;
    }
    endSessionLocally();
  }
}

window.addEventListener("offline", () => {
  if (elements.dashboardView.hidden) return;
  state.offline = true;
  applyOfflineMode();
  setMessage(elements.dashboardMessage, "Sin conexión: consulta en solo lectura. La edición requiere conexión.", "success");
});

window.addEventListener("online", () => {
  if (!state.offline) return;
  state.offline = false;
  applyOfflineMode();
  if (state.user) restoreSession();
});

elements.loginTab.addEventListener("click", () => switchAuthMode("login"));
elements.registerTab.addEventListener("click", () => switchAuthMode("register"));
elements.authTabs.addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const login = event.key === "ArrowLeft" || event.key === "Home";
  switchAuthMode(login ? "login" : "register");
  (login ? elements.loginTab : elements.registerTab).focus();
});
elements.loginForm.addEventListener("submit", handleLogin);
elements.registerForm.addEventListener("submit", handleRegister);
elements.forgotPasswordForm.addEventListener("submit", handleForgotPassword);
elements.resetPasswordForm.addEventListener("submit", handleResetPassword);
elements.forgotPasswordButton.addEventListener("click", () => {
  switchAuthMode("forgot");
  elements.forgotPasswordForm.elements.email.value =
    elements.loginForm.elements.email.value;
  elements.forgotPasswordForm.elements.email.focus();
});
elements.backLoginButtons.forEach((button) =>
  button.addEventListener("click", () => switchAuthMode("login"))
);
document.addEventListener("input", (event) => {
  if (event.target.matches("input, textarea")) clearFieldError(event.target);
});
elements.logoutButton.addEventListener("click", logout);
elements.openProfile.addEventListener("click", openProfileDialog);
elements.homeLastDive.addEventListener("click", handleHomeClick);
elements.homeRecent.addEventListener("click", handleHomeClick);
elements.closeProfile.addEventListener("click", closeProfileDialog);
elements.cancelProfile.addEventListener("click", closeProfileDialog);
elements.profileForm.addEventListener("submit", handleProfileSubmit);
elements.removeProfilePhoto.addEventListener("click", handleProfilePhotoDelete);
elements.profileDialog.addEventListener("click", (event) => {
  if (event.target === elements.profileDialog) closeProfileDialog();
});
elements.logoutAllButton.addEventListener("click", handleLogoutAll);
elements.exportButtons.forEach((button) =>
  button.addEventListener("click", handleAccountExport)
);
elements.openDeleteAccount.addEventListener("click", openDeleteAccountDialog);
elements.cancelDeleteAccount.addEventListener("click", closeDeleteAccountDialog);
elements.deleteAccountForm.addEventListener("submit", handleDeleteAccount);
elements.deleteAccountDialog.addEventListener("click", (event) => {
  if (event.target === elements.deleteAccountDialog) closeDeleteAccountDialog();
});
elements.refreshButton.addEventListener("click", loadDashboardData);
elements.openDiveFormButtons.forEach((button) =>
  button.addEventListener("click", openCreateDiveForm)
);
elements.closeDiveFormButtons.forEach((button) =>
  button.addEventListener("click", closeDiveForm)
);
elements.diveForm.addEventListener("submit", handleDiveSubmit);
elements.diveForm.elements.photos.addEventListener("change", () => {
  renderSelectedPhotos();
  clearFieldError(elements.diveForm.elements.photos);
  syncDisappearingExamples();
});
elements.diveForm.addEventListener("input", syncDisappearingExamples);
elements.diveForm.addEventListener("change", syncDisappearingExamples);
elements.searchConfigurationMemory.addEventListener("click", searchConfigurationMemory);
elements.useCurrentLocation.addEventListener("click", useCurrentLocation);
elements.clearLocation.addEventListener("click", clearLocation);
elements.existingPhotos.addEventListener("click", handlePhotoDelete);
elements.divesList.addEventListener("click", handleDiveListClick);
elements.divesList.addEventListener("keydown", handleDiveListKeydown);
elements.closeDiveDetail.addEventListener("click", closeDiveDetail);
elements.exportDivePdf.addEventListener("click", exportDivePdf);
elements.reflectionForm.addEventListener("submit", handleReflectionSubmit);
elements.deleteReflection.addEventListener("click", handleReflectionDelete);
elements.openShareDialog.addEventListener("click", openShareDialog);
elements.closeShareDialog.addEventListener("click", closeShareDialog);
elements.cancelShareDialog.addEventListener("click", closeShareDialog);
elements.shareForm.addEventListener("submit", handleShareSubmit);
elements.copyShareLink.addEventListener("click", copyShareLink);
elements.shareList.addEventListener("click", handleShareListClick);
elements.cancelDeleteButton.addEventListener("click", closeDeleteDialog);
elements.confirmDeleteButton.addEventListener("click", handleDeleteDive);
elements.diveDialog.addEventListener("click", (event) => {
  if (event.target === elements.diveDialog) closeDiveForm();
});
elements.diveDialog.addEventListener("cancel", (event) => {
  if (elements.diveForm.classList.contains("is-busy")) {
    event.preventDefault();
  } else {
    resetDiveForm();
  }
});
elements.deleteDialog.addEventListener("click", (event) => {
  if (event.target === elements.deleteDialog) closeDeleteDialog();
});
elements.deleteDialog.addEventListener("cancel", () => {
  state.deletingDive = null;
});
elements.detailDialog.addEventListener("click", (event) => {
  if (event.target === elements.detailDialog) closeDiveDetail();
});
elements.detailDialog.addEventListener("cancel", () => {
  clearPhotoUrls("detail");
  state.detailDive = null;
  state.detailPrintPhotos = [];
  elements.detailPhotos.replaceChildren();
});
elements.shareDialog.addEventListener("click", (event) => {
  if (event.target === elements.shareDialog) closeShareDialog();
});
elements.previousPage.addEventListener("click", () => {
  if (state.page > 1) {
    state.page -= 1;
    loadDives();
  }
});
elements.nextPage.addEventListener("click", () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    loadDives();
  }
});

const urlParameters = new URLSearchParams(location.search);
const shareTokenFromUrl = urlParameters.get("share");
const resetTokenFromUrl = urlParameters.get("resetToken");
if (shareTokenFromUrl) {
  initializePublicShare(shareTokenFromUrl);
} else if (resetTokenFromUrl) {
  showAuth();
  switchAuthMode("reset");
  elements.resetPasswordForm.elements.token.value = resetTokenFromUrl;
} else {
  restoreSession();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
}
