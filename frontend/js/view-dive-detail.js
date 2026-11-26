// The read-only dive sheet (TD-014): every recorded field, the private gallery
// with the photos chosen for the PDF (TD-019), and the learning journal
// (TD-024) saved per dive.

import { deleteDiveReflection, getDive, saveDiveReflection } from "./api.js?v=20261123-2";
import {
  WATER_LABELS,
  cylinderDescription,
  locationDescription,
  ownershipLabel,
  suitDescription
} from "./dive-labels.js?v=20261126-1";
import { openDivePrintPreview } from "./dive-pdf.js?v=20261123-2";
import { formatNumber } from "./format.js?v=20261123-2";
import {
  formDataToObject,
  setFormBusy,
  setMessage,
  showApiFieldErrors,
  validateForm
} from "./forms.js?v=20261126-1";
import {
  PHOTO_LOADING_MARKUP,
  createUrlPool,
  loadPhotoUrls,
  photoCard,
  photoErrorMarkup
} from "./photos.js?v=20261126-1";
import { escapeHtml, formatDate } from "./text.js?v=20261126-1";

function reflectionErrors(form) {
  const values = [...new FormData(form).values()];
  return values.some((value) => String(value).trim()) ? [] : [["wentWell", "Escribe al menos una reflexión."]];
}

// `onReflectionChanged()` refreshes what depends on the journal (Estadísticas).
export function createDiveDetail({ getUser, handleUnauthorized, confirmDeleteReflection, onReflectionChanged }) {
  const dialog = document.querySelector("#dive-detail-dialog");
  const heading = document.querySelector("#detail-name");
  const subtitle = document.querySelector("#detail-subtitle");
  const loading = document.querySelector("#detail-loading");
  const message = document.querySelector("#detail-message");
  const content = document.querySelector("#detail-content");
  const facts = {
    date: document.querySelector("#detail-date"),
    duration: document.querySelector("#detail-duration"),
    depth: document.querySelector("#detail-depth"),
    center: document.querySelector("#detail-center"),
    ballast: document.querySelector("#detail-ballast"),
    equipment: document.querySelector("#detail-equipment"),
    suit: document.querySelector("#detail-suit"),
    cylinder: document.querySelector("#detail-cylinder"),
    water: document.querySelector("#detail-water"),
    location: document.querySelector("#detail-location"),
    buddies: document.querySelector("#detail-buddies"),
    comments: document.querySelector("#detail-comments")
  };
  const gallerySection = document.querySelector("#detail-gallery-section");
  const gallery = document.querySelector("#detail-photos");
  const exportMessage = document.querySelector("#detail-export-message");
  const reflectionForm = document.querySelector("#reflection-form");
  const reflectionMessage = document.querySelector("#reflection-message");
  const deleteReflectionButton = document.querySelector("#delete-reflection");
  const urls = createUrlPool();
  let dive = null;
  let printPhotos = [];

  async function renderGallery(photos) {
    urls.revokeAll();
    printPhotos = [];
    gallerySection.hidden = photos.length === 0;
    gallery.innerHTML = photos.length ? PHOTO_LOADING_MARKUP : "";
    if (photos.length === 0) return;

    const loaded = await loadPhotoUrls(photos, urls);
    printPhotos = loaded.filter(({ url }) => url).map(({ photo, url }) => ({ ...photo, url }));
    gallery.innerHTML = loaded.map(({ photo, url }) => url
      ? photoCard(url, photo.originalName, `
              <label class="photo-export-toggle">
                <input type="checkbox" value="${escapeHtml(photo.id)}" checked>
                <span>Incluir en PDF</span>
              </label>`, "photo-card photo-card-selectable")
      : photoErrorMarkup(photo)).join("");
  }

  function renderFacts(current) {
    heading.textContent = current.name;
    subtitle.textContent = [
      current.diveNumber ? `Inmersión nº ${current.diveNumber}` : "",
      formatDate(current.date),
      `${formatNumber(current.maxDepthMeters)} m`
    ].filter(Boolean).join(" · ");
    facts.date.textContent = formatDate(current.date);
    facts.duration.textContent = `${formatNumber(current.durationMinutes)} minutos`;
    facts.depth.textContent = `${formatNumber(current.maxDepthMeters)} metros`;
    facts.center.textContent = current.diveCenter || "No indicado";
    facts.ballast.textContent = current.ballastKg === null ? "No indicado" : `${formatNumber(current.ballastKg)} kg`;
    facts.equipment.textContent = current.equipmentOwnership ? ownershipLabel(current.equipmentOwnership) : "No indicado";
    facts.suit.textContent = suitDescription(current);
    facts.cylinder.textContent = cylinderDescription(current);
    facts.water.textContent = WATER_LABELS[current.waterType] || "No indicado";
    facts.location.textContent = locationDescription(current.location);
    facts.buddies.textContent = current.buddies.length ? current.buddies.join(", ") : "No se indicaron compañeros.";
    facts.comments.textContent = current.comments || "Sin notas registradas.";
  }

  function renderReflection(current) {
    reflectionForm.reset();
    Object.entries(current.reflection || {}).forEach(([key, value]) => {
      if (reflectionForm.elements[key]) reflectionForm.elements[key].value = value || "";
    });
    deleteReflectionButton.hidden = !current.reflection;
    setMessage(reflectionMessage, "");
  }

  async function open(diveId) {
    urls.revokeAll();
    heading.textContent = "Detalle de la inmersión";
    subtitle.textContent = "Consulta toda la información registrada.";
    loading.hidden = false;
    content.hidden = true;
    gallerySection.hidden = true;
    exportMessage.textContent = "";
    dive = null;
    setMessage(message, "");
    dialog.showModal();

    try {
      const response = await getDive(diveId);
      dive = response.data.dive;
      renderFacts(dive);
      renderReflection(dive);
      content.hidden = false;
      await renderGallery(dive.photos);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setMessage(message, "No se pudo cargar la inmersión.");
    } finally {
      loading.hidden = true;
    }
  }

  function clear() {
    urls.revokeAll();
    dive = null;
    printPhotos = [];
    gallery.replaceChildren();
  }

  function exportPdf() {
    if (!dive) return;
    const selectedIds = new Set([...gallery.querySelectorAll("input:checked")].map((input) => String(input.value)));
    const user = getUser();
    const opened = openDivePrintPreview({
      dive,
      photos: printPhotos.filter((photo) => selectedIds.has(String(photo.id))),
      diverName: user ? `${user.firstName} ${user.lastName}` : "Bitácora personal"
    });
    exportMessage.textContent = opened
      ? "Previsualización abierta en una nueva pestaña."
      : "El navegador ha bloqueado la previsualización. Permite las ventanas emergentes e inténtalo de nuevo.";
  }

  async function handleReflectionSubmit(event) {
    event.preventDefault();
    if (!dive || !validateForm(reflectionForm, reflectionErrors)) return;
    setFormBusy(reflectionForm, true);
    setMessage(reflectionMessage, "");
    try {
      const response = await saveDiveReflection(dive.id, formDataToObject(reflectionForm));
      dive = response.data.dive;
      deleteReflectionButton.hidden = false;
      setMessage(reflectionMessage, "Reflexión guardada en tu diario.", "success");
      await onReflectionChanged();
    } catch (error) {
      if (handleUnauthorized(error)) return;
      showApiFieldErrors(reflectionForm, error.details);
      setMessage(reflectionMessage, "No se pudo guardar la reflexión.");
    } finally {
      setFormBusy(reflectionForm, false);
    }
  }

  async function handleReflectionDelete() {
    // Ask first; the dialog may have closed meanwhile.
    if (!dive || !(await confirmDeleteReflection()) || !dive) return;
    deleteReflectionButton.disabled = true;
    try {
      await deleteDiveReflection(dive.id);
      dive.reflection = null;
      reflectionForm.reset();
      deleteReflectionButton.hidden = true;
      // The button that had focus is now hidden: continue at the first field.
      reflectionForm.elements.wentWell.focus();
      setMessage(reflectionMessage, "Reflexión borrada.", "success");
      await onReflectionChanged();
    } catch (error) {
      if (!handleUnauthorized(error)) setMessage(reflectionMessage, "No se pudo borrar la reflexión.");
    } finally {
      deleteReflectionButton.disabled = false;
    }
  }

  document.querySelector("#close-dive-detail").addEventListener("click", () => dialog.close());
  document.querySelector("#export-dive-pdf").addEventListener("click", exportPdf);
  reflectionForm.addEventListener("submit", handleReflectionSubmit);
  deleteReflectionButton.addEventListener("click", handleReflectionDelete);
  // One `close` listener holds the cleanup, whatever closed the dialog.
  dialog.addEventListener("close", clear);

  return {
    open,
    get dive() { return dive; }
  };
}
