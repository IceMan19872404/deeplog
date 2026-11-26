import {
  clearToken,
  createDiveShare,
  createDive,
  deleteDive,
  deleteDivePhoto,
  deleteDiveReflection,
  getConfigurationMemory,
  getDive,
  getDiveInsights,
  getDiveMap,
  getDiveStats,
  getDiveShares,
  getDives,
  logoutUser,
  restoreUserSession,
  saveDiveReflection,
  revokeDiveShare,
  updateDive,
  uploadDivePhotos
} from "./api.js?v=20261123-2";
import { openDivePrintPreview } from "./dive-pdf.js?v=20261123-2";
import { initializeClientMonitoring } from "./client-monitoring.js?v=20261123-2";
import {
  clearFieldError,
  clearFormErrors,
  formDataToObject,
  installFormBehaviour,
  isFormBusy,
  setFormBusy,
  setMessage,
  showApiFieldErrors,
  validateForm
} from "./forms.js?v=20261126-1";
import { createAuthView } from "./view-auth.js?v=20261126-1";
import { createAccountView } from "./view-account.js?v=20261126-1";
import { createProfileView } from "./view-profile.js?v=20261126-1";
import { localIsoDate, populateDiveForm } from "./dive-form.js?v=20261123-2";
import { TABS, createTabs } from "./tabs.js?v=20261123-2";
import { createTheme } from "./theme.js?v=20261123-2";
import { profileSvg } from "./dive-profile.js?v=20261121-2";
import { countUp, createMotionPreference } from "./motion.js?v=20261121-1";
import {
  closeAllDialogs,
  createConfirmDialog,
  createUnsavedChanges,
  guardDialogClose,
  installLightDismissFallback,
  requestDialogClose
} from "./dialogs.js?v=20261123-2";
import { formatNumber } from "./format.js?v=20261123-2";
import { createStatTabs, formatMinutes, renderStatsDetail } from "./stats-detail.js?v=20261123-5";
import {
  countLabel,
  daysAgoLabel,
  escapeHtml,
  formatDate,
  formatLongToday,
  formatMonthYear
} from "./text.js?v=20261126-1";
import {
  COMFORT_LABELS,
  WATER_LABELS,
  configurationName,
  cylinderDescription,
  locationDescription,
  ownershipLabel,
  suitDescription
} from "./dive-labels.js?v=20261126-1";
import { buddiesError, divePayload, photosError } from "./dive-form-data.js?v=20261126-1";
import {
  applyOfflineMode,
  clearOfflineSnapshot,
  isNetworkError,
  isOffline,
  readOfflineSnapshot,
  setOffline,
  updateOfflineSnapshot
} from "./offline.js?v=20261126-1";
import {
  PHOTO_LOADING_MARKUP,
  createUrlPool,
  loadPhotoUrls,
  photoCard,
  photoErrorMarkup
} from "./photos.js?v=20261126-1";

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
  detailDive: null,
  detailPrintPhotos: [],
  shares: []
};

const photoUrls = {
  selected: createUrlPool(),
  existing: createUrlPool(),
  detail: createUrlPool()
};

const elements = {
  authView: document.querySelector("#auth-view"),
  dashboardView: document.querySelector("#dashboard-view"),
  dashboardMessage: document.querySelector("#dashboard-message"),
  userName: document.querySelector("#user-name"),
  logoutButton: document.querySelector("#logout-button"),
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
  insightsPanel: document.querySelector(".insights-panel"),
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
  locationMessage: document.querySelector("#location-message"),
  discardDialog: document.querySelector("#discard-dialog"),
  deleteReflectionDialog: document.querySelector("#delete-reflection-dialog")
};

const confirmDiscard = createConfirmDialog(elements.discardDialog);
const confirmDeleteReflection = createConfirmDialog(elements.deleteReflectionDialog);
const diveFormChanges = createUnsavedChanges(elements.diveForm);

const authView = createAuthView({ onSignedIn: showDashboard });
const profileView = createProfileView({
  getUser: () => state.user,
  handleUnauthorized,
  confirmDiscard
});
createAccountView({ handleUnauthorized, endSession: endSessionWithMessage });

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
    if (id === "mapa") drawDiveMap();
  }
});

// The skip link's href (#main-content) would replace the #/<tab> route and
// leave focus before the header and tab bar. On the dashboard it jumps to the
// current panel's heading instead; elsewhere the browser handles it.
document.querySelector(".skip-link")?.addEventListener("click", (event) => {
  if (elements.dashboardView.hidden || !tabs.current) return;
  event.preventDefault();
  tabs.focusCurrent();
});

function syncDisappearingExamples() {
  elements.diveForm.querySelectorAll("[data-disappearing-example]").forEach((example) => {
    const field = example.previousElementSibling?.matches("input, select, textarea")
      ? example.previousElementSibling
      : example.previousElementSibling?.querySelector("input, select, textarea");
    if (!field) return;
    example.hidden = field.type === "file" ? field.files.length > 0 : Boolean(field.value);
  });
}

// Rules the browser cannot check, per form, as [field, message] pairs.
function diveFormErrors(form) {
  const errors = [];
  const buddies = buddiesError(form.elements.buddiesText.value);
  if (buddies) errors.push(["buddiesText", buddies]);
  const photos = photosError([...form.elements.photos.files], state.currentPhotos.length);
  if (photos) errors.push(["photos", photos]);
  return errors;
}

function reflectionFormErrors(form) {
  const values = [...new FormData(form).values()];
  return values.some((value) => String(value).trim()) ? [] : [["wentWell", "Escribe al menos una reflexión."]];
}

// Data for a tab that is not on screen is fetched with low priority so it
// does not compete with the visible one (Fetch priority; ignored if unsupported).
function backgroundPriority(tab) {
  return tabs.current === tab ? "auto" : "low";
}

let diveMap = null;
let mapDives = null; // dives waiting to be drawn when the Mapa tab is shown

function describeMapDive(dive) {
  return `${dive.name} · ${formatDate(dive.date)} · ${dive.precision === "approximate" ? "ubicación aproximada" : "ubicación exacta privada"}`;
}

function renderDiveMap(dives = []) {
  if (!dives.length) {
    mapDives = null;
    diveMap?.update([]);
    elements.diveMap.innerHTML = '<p class="map-empty">Añade coordenadas a una inmersión para situarla en tu mapa privado.</p>';
    elements.diveMap.setAttribute("aria-label", "Sin ubicaciones registradas");
    return;
  }
  elements.diveMap.setAttribute("aria-label", `Mapa con ${dives.length} ubicaciones de inmersión registradas`);
  mapDives = dives;
  if (tabs.current === "mapa") drawDiveMap();
}

// dive-map.js brings ~140 KB of coastline data, so it is imported only when
// the Mapa tab is shown with dives to place (it stays in the offline shell).
async function drawDiveMap() {
  if (!mapDives) return;
  try {
    if (!diveMap) {
      const { createDiveMap } = await import("./dive-map.js?v=20261123-2");
      diveMap ||= createDiveMap(elements.diveMap, { onSelect: openDiveDetail, describe: describeMapDive });
    }
  } catch (_error) {
    elements.mapStatus.textContent = "No se pudo cargar el mapa. Inténtalo de nuevo más tarde.";
    return;
  }
  if (!mapDives) return;
  diveMap.update(mapDives);
  mapDives = null;
}

async function loadDiveMap() {
  try {
    const response = await getDiveMap({ priority: backgroundPriority("mapa") });
    renderDiveMap(response.data.dives);
    updateOfflineSnapshot({ map: response.data.dives }, state.user);
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

function renderSelectedPhotos() {
  photoUrls.selected.revokeAll();
  const files = [...elements.diveForm.elements.photos.files];
  elements.selectedPhotos.hidden = files.length === 0;
  elements.selectedPhotos.innerHTML = files
    .map((file) => photoCard(photoUrls.selected.add(file), file.name))
    .join("");
}

async function renderExistingPhotos(photos, diveId) {
  photoUrls.existing.revokeAll();
  state.currentPhotos = photos;
  elements.existingPhotos.hidden = photos.length === 0;
  elements.existingPhotos.innerHTML = photos.length ? PHOTO_LOADING_MARKUP : "";
  if (photos.length === 0) return;

  const loaded = await loadPhotoUrls(photos, photoUrls.existing);
  elements.existingPhotos.innerHTML = loaded.map(({ photo, url }) => url
    ? photoCard(url, photo.originalName, `
          <button
            class="photo-remove"
            type="button"
            data-photo-id="${escapeHtml(photo.id)}"
            data-dive-id="${escapeHtml(diveId)}"
            aria-label="Eliminar ${escapeHtml(photo.originalName)}"
          >×</button>`)
    : photoErrorMarkup(photo)).join("");
}

// The detail gallery also chooses which photos go into the PDF.
async function renderDetailPhotos(photos) {
  photoUrls.detail.revokeAll();
  state.detailPrintPhotos = [];
  elements.detailGallerySection.hidden = photos.length === 0;
  elements.detailPhotos.innerHTML = photos.length ? PHOTO_LOADING_MARKUP : "";
  if (photos.length === 0) return;

  const loaded = await loadPhotoUrls(photos, photoUrls.detail);
  state.detailPrintPhotos = loaded.filter(({ url }) => url).map(({ photo, url }) => ({ ...photo, url }));
  elements.detailPhotos.innerHTML = loaded.map(({ photo, url }) => url
    ? photoCard(url, photo.originalName, `
              <label class="photo-export-toggle">
                <input type="checkbox" value="${escapeHtml(photo.id)}" checked>
                <span>Incluir en PDF</span>
              </label>`, "photo-card photo-card-selectable")
    : photoErrorMarkup(photo)).join("");
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
      ? `${countLabel(dives.length, "experiencia similar encontrada", "experiencias similares encontradas")}. Referencia personal, no recomendación.`
      : "No hay experiencias anteriores que coincidan con esta configuración.";
    elements.configurationMemoryResults.innerHTML = dives.map((dive) => `
      <article class="memory-card">
        <div><strong>${escapeHtml(dive.name)}</strong><span>${escapeHtml(formatDate(dive.date))}${dive.diveCenter ? ` · ${escapeHtml(dive.diveCenter)}` : ""}</span></div>
        <div class="memory-ballast"><strong>${escapeHtml(formatNumber(dive.ballastKg))} kg</strong><span>lastre registrado</span></div>
      </article>`).join("");
  } catch (error) {
    if (!handleUnauthorized(error)) elements.configurationMemoryMessage.textContent = "No se pudo consultar tu historial.";
  } finally { elements.searchConfigurationMemory.disabled = false; }
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
        >
          <div class="dive-date">
            ${dive.diveNumber ? `<span class="dive-number"><abbr title="Número de inmersión">Nº</abbr> ${escapeHtml(dive.diveNumber)}</span>` : ""}
            <span>${escapeHtml(formatDate(dive.date))}</span>
            <strong>${escapeHtml(formatNumber(dive.maxDepthMeters))} m</strong>
            <span class="depth-bar" style="--depth: ${Math.min(100, Math.round((Number(dive.maxDepthMeters) / 40) * 100))}%" aria-hidden="true"></span>
          </div>
          <div class="dive-main">
            <h3><button
              class="dive-open"
              type="button"
              data-dive-id="${escapeHtml(dive.id)}"
              aria-label="${escapeHtml(dive.name)}: ver toda la información${dive.diveNumber ? ` de la inmersión nº ${escapeHtml(dive.diveNumber)}` : ""}"
            >${escapeHtml(dive.name)}</button></h3>
            <p>${escapeHtml(dive.diveCenter || "Centro no indicado")}</p>
            <div class="dive-equipment">
              ${
                dive.ballastKg === null
                  ? ""
                  : `<span>${escapeHtml(formatNumber(dive.ballastKg))} kg de lastre</span>`
              }
              ${dive.equipmentOwnership ? `<span>${ownershipLabel(dive.equipmentOwnership)}</span>` : ""}
            </div>
            ${
              dive.buddies.length
                ? `<p class="dive-buddies">Con ${escapeHtml(dive.buddies.join(", "))}</p>`
                : ""
            }
            ${
              dive.photos.length
                ? `<span class="photo-count">${escapeHtml(countLabel(dive.photos.length, "foto", "fotos"))}</span>`
                : ""
            }
          </div>
          <div class="dive-duration">
            <strong>${escapeHtml(formatNumber(dive.durationMinutes))}</strong>
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

  endSessionLocally();
  authView.showMessage(
    "Tu sesión ha caducado. Inicia sesión de nuevo."
  );
  return true;
}

function closeDiveDetail() {
  elements.detailDialog.close();
}

function clearDiveDetail() {
  photoUrls.detail.revokeAll();
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
  clearFormErrors(elements.shareForm);
  elements.shareForm.elements.expiresInDays.value = "7";
  [...elements.shareForm.querySelectorAll('.share-options input[type="checkbox"]')].forEach((input) => { input.checked = true; });
  elements.shareForm.elements.includeDiverName.checked = Boolean(profileView.profile?.shareNameByDefault);
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
  photoUrls.detail.revokeAll();
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
      `${formatNumber(dive.maxDepthMeters)} m`
    ].filter(Boolean).join(" · ");
    elements.detailDate.textContent = formatDate(dive.date);
    elements.detailDuration.textContent = `${formatNumber(dive.durationMinutes)} minutos`;
    elements.detailDepth.textContent = `${formatNumber(dive.maxDepthMeters)} metros`;
    elements.detailCenter.textContent = dive.diveCenter || "No indicado";
    elements.detailBallast.textContent =
      dive.ballastKg === null ? "No indicado" : `${formatNumber(dive.ballastKg)} kg`;
    elements.detailEquipment.textContent = dive.equipmentOwnership
      ? ownershipLabel(dive.equipmentOwnership)
      : "No indicado";
    elements.detailSuit.textContent = suitDescription(dive);
    elements.detailCylinder.textContent = cylinderDescription(dive);
    elements.detailWater.textContent = WATER_LABELS[dive.waterType] || "No indicado";
    elements.detailLocation.textContent = locationDescription(dive.location);
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
  if (!state.detailDive || !validateForm(elements.reflectionForm, reflectionFormErrors)) return;
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
  if (!state.detailDive || !(await confirmDeleteReflection()) || !state.detailDive) return;
  elements.deleteReflection.disabled = true;
  try {
    await deleteDiveReflection(state.detailDive.id);
    state.detailDive.reflection = null;
    elements.reflectionForm.reset();
    elements.deleteReflection.hidden = true;
    // The button that had focus is now hidden: continue at the first field.
    elements.reflectionForm.elements.wentWell.focus();
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

function renderStats(stats) {
  countUp(elements.divesTotal, stats.totalDives);
  elements.totalTime.textContent = formatMinutes(stats.totalMinutes);
  elements.maxDepth.textContent = stats.maxDepthMeters === null
    ? "—"
    : `${formatNumber(stats.maxDepthMeters)} m`;
  elements.longestDuration.textContent = stats.longestDurationMinutes === null
    ? "—"
    : `${formatNumber(stats.longestDurationMinutes)} min`;
  elements.divesThisYear.textContent = stats.divesThisYear;
  elements.homeTotalTime.textContent = elements.totalTime.textContent;
  elements.homeMaxDepth.textContent = elements.maxDepth.textContent;
  countUp(elements.homeThisYear, stats.divesThisYear);
  elements.homeSummary.textContent = stats.totalDives
    ? `Llevas ${countLabel(stats.totalDives, "inmersión", "inmersiones")} y ${formatMinutes(stats.totalMinutes)} bajo el agua.`
    : "Tu bitácora está lista para su primera inmersión.";
  elements.favoriteCenter.textContent = stats.favoriteCenter
    ? `Tu centro más visitado: ${stats.favoriteCenter.name}`
    : "Registra un centro para descubrir tu lugar más visitado.";
  renderStatsDetail(elements.insightsPanel, stats);
}

function frequencyMarkup(items, emptyLabel) {
  if (!items.length) return `<li class="frequency-empty">${escapeHtml(emptyLabel)}</li>`;
  return items.map((item) => `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.total)}</strong></li>`).join("");
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
    <div class="evolution-point" title="${escapeHtml(formatDate(item.date))}: ${escapeHtml(formatNumber(item.maxDepthMeters))} m, ${escapeHtml(formatNumber(item.durationMinutes))} min">
      <div class="evolution-bars">
        <span class="evolution-depth" style="--value:${Math.max(6, item.maxDepthMeters / maxDepth * 100)}%"></span>
        <span class="evolution-duration" style="--value:${Math.max(6, item.durationMinutes / maxDuration * 100)}%"></span>
      </div>
      <small>${escapeHtml(formatMonthYear(item.date))}</small>
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
      <div class="ownership-row"><div><strong>${ownershipLabel(item.type)}</strong><span>${escapeHtml(countLabel(item.sampleSize, "inmersión", "inmersiones"))}</span></div><p><b>${escapeHtml(formatNumber(item.averageDurationMinutes))} min</b><span>duración media</span></p><p><b>${escapeHtml(formatNumber(item.averageDepthMeters))} m</b><span>profundidad media</span></p></div>`).join("")
    : '<p class="frequency-empty">Indica si el material es propio o alquilado para comparar.</p>';
  elements.ballastPatterns.innerHTML = insights.ballastConfigurations.length
    ? insights.ballastConfigurations.map((item) => `
      <article class="ballast-pattern"><div><strong>${escapeHtml(configurationName(item))}</strong><span>${escapeHtml(countLabel(item.sampleSize, "registro", "registros"))}</span></div><p><b>${escapeHtml(formatNumber(item.averageBallastKg))} kg</b><span>media observada</span></p><p><b>${escapeHtml(formatNumber(item.minimumBallastKg))}-${escapeHtml(formatNumber(item.maximumBallastKg))} kg</b><span>rango registrado</span></p></article>`).join("")
    : '<p class="frequency-empty">Completa lastre y configuración para crear grupos comparables.</p>';
  elements.reflectionEvolution.innerHTML = insights.reflectionEvolution.length
    ? insights.reflectionEvolution.map((item) => `
      <article class="reflection-moment">
        <time>${escapeHtml(formatDate(item.date))}</time>
        <div><strong>${escapeHtml(item.diveName)}</strong>
          ${item.practicedSkill ? `<span>Practiqué: ${escapeHtml(item.practicedSkill)}</span>` : ""}
          ${item.comfort ? `<span>${escapeHtml(COMFORT_LABELS[item.comfort])}</span>` : ""}
          ${item.nextGoal ? `<p>Próximo objetivo: ${escapeHtml(item.nextGoal)}</p>` : ""}
        </div>
      </article>`).join("")
    : '<p class="frequency-empty">Añade una reflexión desde el detalle de una inmersión.</p>';
}

async function loadAdvancedInsights() {
  elements.advancedInsightsLoading.hidden = false;
  try {
    const response = await getDiveInsights({ priority: backgroundPriority("estadisticas") });
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

async function loadDashboardData() {
  await Promise.all([profileView.load(), loadStats(), loadAdvancedInsights(), loadDives(), loadDiveMap()]);
}

// Inicio shows the newest dives. The list endpoint is ordered by date, so the
// first page of the logbook already holds them.
function renderHome(dives) {
  const [latest, ...rest] = dives;
  elements.homeLastDive.removeAttribute("data-loading");
  if (!latest) {
    elements.homeLastDive.innerHTML = `
      <p class="muted">Todavía no hay inmersiones registradas.</p>
      <button class="primary-button" data-open-dive-form type="button">Registrar la primera</button>`;
    elements.homeLastDive.querySelector("[data-open-dive-form]").addEventListener("click", openCreateDiveForm);
    elements.homeRecent.replaceChildren();
    return;
  }
  elements.homeLastDive.innerHTML = `
    <button class="home-last-open" type="button" data-dive-id="${escapeHtml(latest.id)}">
      <span class="home-last-name">${escapeHtml(latest.name)}</span>
      <span class="home-last-meta">${escapeHtml(formatDate(latest.date))} · ${escapeHtml(daysAgoLabel(latest.date))}${latest.diveCenter ? ` · ${escapeHtml(latest.diveCenter)}` : ""}</span>
      <span class="home-last-facts">
        <span><b>${escapeHtml(formatNumber(latest.maxDepthMeters))}</b> m</span>
        <span><b>${escapeHtml(formatNumber(latest.durationMinutes))}</b> min</span>
        ${latest.buddies.length ? `<span>Con ${escapeHtml(latest.buddies.join(", "))}</span>` : ""}
      </span>
      <span class="home-last-profile">${profileSvg(latest.maxDepthMeters, latest.durationMinutes)}</span>
      <span class="home-last-caption">Perfil aproximado según profundidad máxima y duración</span>
      <span class="home-last-hint">Abrir ficha →</span>
    </button>`;
  elements.homeRecent.innerHTML = rest.slice(0, 4).map((dive) => `
    <li><button type="button" data-dive-id="${escapeHtml(dive.id)}">
      <span class="home-recent-depth">${escapeHtml(formatNumber(dive.maxDepthMeters))} m</span>
      <span class="home-recent-text"><strong>${escapeHtml(dive.name)}</strong><small>${escapeHtml(formatDate(dive.date))}</small></span>
    </button></li>`).join("") || '<li class="muted">Las siguientes inmersiones aparecerán aquí.</li>';
}

function handleHomeClick(event) {
  const target = event.target.closest("[data-dive-id]");
  if (target) openDiveDetail(target.dataset.diveId);
}

async function loadDives() {
  elements.divesLoading.hidden = false;
  elements.divesList.setAttribute("aria-busy", "true");
  elements.divesList.hidden = true;
  elements.divesEmpty.hidden = true;
  setMessage(elements.dashboardMessage, "");

  try {
    const response = await getDives(state.page, state.limit);
    renderDives(response.data.dives);
    renderPagination(response.meta);
    if (state.page === 1) renderHome(response.data.dives);
    updateOfflineSnapshot({ dives: response.data.dives, meta: response.meta }, state.user);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    const cached = readOfflineSnapshot();
    if (cached?.dives) {
      setOffline(true);
      renderDives(cached.dives);
      renderPagination(cached.meta || { page: 1, totalPages: 1 });
      renderHome(cached.dives);
      setMessage(elements.dashboardMessage, "Mostrando la última copia sincronizada. La edición requiere conexión.", "success");
    } else setMessage(elements.dashboardMessage, "No se pudieron cargar las inmersiones.");
  } finally {
    elements.divesLoading.hidden = true;
    elements.divesList.hidden = false;
    elements.divesList.removeAttribute("aria-busy");
    elements.homeLastDive.removeAttribute("data-loading");
  }
}

function resetDiveForm() {
  state.editingDiveId = null;
  elements.diveForm.reset();
  elements.diveForm.elements.date.max = localIsoDate();
  elements.diveFormTitle.textContent = "Registrar inmersión";
  elements.diveFormEyebrow.textContent = "Nueva experiencia";
  elements.saveDiveButton.textContent = "Guardar inmersión";
  photoUrls.selected.revokeAll();
  photoUrls.existing.revokeAll();
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
  diveFormChanges.markClean();
}

function openCreateDiveForm() {
  resetDiveForm();
  elements.diveDialog.showModal();
  elements.diveForm.elements.name.focus();
}

function closeDiveForm() {
  requestDialogClose(elements.diveDialog);
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
    diveFormChanges.markClean();
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

  if (!validateForm(elements.diveForm, diveFormErrors)) return;

  setFormBusy(elements.diveForm, true);
  elements.diveForm.classList.add("is-busy");

  try {
    const data = divePayload(formDataToObject(elements.diveForm));
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
        photoUrls.selected.revokeAll();
        elements.selectedPhotos.hidden = true;
        const refreshed = await getDive(response.data.dive.id);
        await renderExistingPhotos(refreshed.data.dive.photos, response.data.dive.id);
        diveFormChanges.markClean();
        setMessage(
          elements.diveFormMessage,
          photoError.code === "PHOTO_LIMIT_EXCEEDED"
            ? "La inmersión se guardó, pero supera el límite de 5 fotos."
            : "La inmersión se guardó, pero las fotografías no pudieron subirse."
        );
        return;
      }
    }

    const savedId = state.editingDiveId;
    elements.diveDialog.close();
    await loadDashboardData();
    if (isEditing) restoreListFocus(`[data-action="edit"][data-dive-id="${CSS.escape(String(savedId))}"]`);
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
  elements.deleteDialog.close();
}

// After a save or delete the list is re-rendered and the card that opened the
// dialog is gone, so focus would fall to <body>. Move it to the matching card
// control, else the card now in the same position, else the list heading.
function restoreListFocus(selector, index = 0) {
  if (document.activeElement && document.activeElement !== document.body) return;
  const cards = elements.divesList.querySelectorAll(".dive-card");
  const card = cards[Math.min(index, cards.length - 1)];
  const target = (selector && elements.divesList.querySelector(selector))
    || (card && (card.tabIndex >= 0 ? card : card.querySelector("button")))
    || document.querySelector("#inmersiones-title");
  if (!target) return;
  if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus();
}

async function handleDeleteDive() {
  if (!state.deletingDive) return;

  elements.confirmDeleteButton.disabled = true;
  elements.confirmDeleteButton.classList.add("is-loading");
  elements.cancelDeleteButton.disabled = true;
  setMessage(elements.deleteMessage, "");

  const cardIndex = [...elements.divesList.querySelectorAll(".dive-card")]
    .findIndex((card) => card.dataset.diveId === String(state.deletingDive.id));

  try {
    await deleteDive(state.deletingDive.id);
    closeDeleteDialog();

    if (state.page > 1 && elements.divesList.children.length === 1) {
      state.page -= 1;
    }

    await loadDashboardData();
    restoreListFocus(null, Math.max(cardIndex, 0));
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

function showDashboard(user) {
  state.user = user;
  elements.userName.textContent = `${user.firstName} ${user.lastName}`;
  elements.greetingName.textContent = user.firstName;
  elements.homeDate.textContent = formatLongToday();
  elements.authView.hidden = true;
  elements.dashboardView.hidden = false;
  document.documentElement.removeAttribute("data-boot");
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
  profileView.reset();
  elements.dashboardView.hidden = true;
  elements.authView.hidden = false;
  document.documentElement.removeAttribute("data-boot");
  document.title = "DeepLog";
}

function endSessionLocally() {
  closeAllDialogs();
  clearToken();
  clearOfflineSnapshot();
  showAuth();
}

async function logout() {
  try {
    await logoutUser();
  } finally {
    endSessionLocally();
  }
}

// Signs out here and explains why on the login screen (logout everywhere,
// deleted account).
function endSessionWithMessage(message, { showLogin = false } = {}) {
  endSessionLocally();
  if (showLogin) authView.switchMode("login");
  authView.showMessage(message, "success");
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
  if (elements.dashboardView.hidden) return;
  setOffline(true);
  setMessage(elements.dashboardMessage, "Sin conexión: consulta en solo lectura. La edición requiere conexión.", "success");
});

window.addEventListener("online", () => {
  if (!isOffline()) return;
  setOffline(false);
  if (state.user) restoreSession();
});

installFormBehaviour();
elements.logoutButton.addEventListener("click", logout);
elements.homeLastDive.addEventListener("click", handleHomeClick);
createStatTabs(elements.insightsPanel, { onOpenDive: openDiveDetail });
elements.homeRecent.addEventListener("click", handleHomeClick);
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
guardDialogClose(elements.diveDialog, {
  isBusy: () => isFormBusy(elements.diveForm),
  isDirty: diveFormChanges.isDirty,
  confirmDiscard
});
guardDialogClose(elements.deleteDialog, {
  isBusy: () => elements.confirmDeleteButton.disabled
});
// One `close` listener per dialog holds its cleanup, so the buttons, Esc,
// light dismiss and closeAllDialogs() all leave the same state behind.
elements.diveDialog.addEventListener("close", resetDiveForm);
elements.deleteDialog.addEventListener("close", () => { state.deletingDive = null; });
elements.detailDialog.addEventListener("close", clearDiveDetail);
installLightDismissFallback(document.querySelectorAll('dialog[closedby="any"]'));
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
  // Only share recipients need this module; it stays in the offline shell.
  import("./public-share.js?v=20261123-2")
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
