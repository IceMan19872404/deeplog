// The dive form dialog, for a new dive and for editing one: photos (new
// previews and saved ones that can be removed), the ballast memory for the
// chosen configuration (TD-021), the current location and the disappearing
// examples under each field.

import {
  createDive,
  deleteDivePhoto,
  getConfigurationMemory,
  getDive,
  updateDive,
  uploadDivePhotos
} from "./api.js?v=20261126-2";
import { createUnsavedChanges, guardDialogClose, requestDialogClose } from "./dialogs.js?v=20261126-2";
import { localIsoDate, populateDiveForm } from "./dive-form.js?v=20261123-2";
import { buddiesError, divePayload, photosError } from "./dive-form-data.js?v=20261126-2";
import { formatNumber } from "./format.js?v=20261126-2";
import {
  clearFieldError,
  formDataToObject,
  isFormBusy,
  setFormBusy,
  setMessage,
  showApiFieldErrors,
  validateForm
} from "./forms.js?v=20261126-2";
import {
  PHOTO_LOADING_MARKUP,
  createUrlPool,
  loadPhotoUrls,
  photoCard,
  photoErrorMarkup
} from "./photos.js?v=20261126-2";
import { countLabel, escapeHtml, formatDate } from "./text.js?v=20261126-2";

const MEMORY_FIELDS = ["waterType", "suitType", "suitThicknessMm", "cylinderMaterial", "cylinderVolumeLiters"];

// `onCreated()` runs as soon as a new dive exists (before its photos upload);
// `onSaved({ isEditing, savedId })` once the dialog has closed.
export function createDiveEditor({ handleUnauthorized, confirmDiscard, onCreated, onSaved }) {
  const dialog = document.querySelector("#dive-dialog");
  const form = document.querySelector("#dive-form");
  const title = document.querySelector("#dive-form-title");
  const eyebrow = document.querySelector("#dive-form-eyebrow");
  const message = document.querySelector("#dive-form-message");
  const saveButton = document.querySelector("#save-dive-button");
  const selectedPhotos = document.querySelector("#selected-photos");
  const existingPhotos = document.querySelector("#existing-photos");
  const memory = {
    button: document.querySelector("#search-configuration-memory"),
    message: document.querySelector("#configuration-memory-message"),
    results: document.querySelector("#configuration-memory-results")
  };
  const place = {
    useCurrent: document.querySelector("#use-current-location"),
    clear: document.querySelector("#clear-location"),
    message: document.querySelector("#location-message")
  };
  const changes = createUnsavedChanges(form);
  const urls = { selected: createUrlPool(), existing: createUrlPool() };
  let editingDiveId = null;
  let savedPhotos = [];

  function formErrors() {
    const errors = [];
    const buddies = buddiesError(form.elements.buddiesText.value);
    if (buddies) errors.push(["buddiesText", buddies]);
    const photos = photosError([...form.elements.photos.files], savedPhotos.length);
    if (photos) errors.push(["photos", photos]);
    return errors;
  }

  // Each example hides once its field has a value.
  function syncDisappearingExamples() {
    form.querySelectorAll("[data-disappearing-example]").forEach((example) => {
      const field = example.previousElementSibling?.matches("input, select, textarea")
        ? example.previousElementSibling
        : example.previousElementSibling?.querySelector("input, select, textarea");
      if (!field) return;
      example.hidden = field.type === "file" ? field.files.length > 0 : Boolean(field.value);
    });
  }

  function renderSelectedPhotos() {
    urls.selected.revokeAll();
    const files = [...form.elements.photos.files];
    selectedPhotos.hidden = files.length === 0;
    selectedPhotos.innerHTML = files
      .map((file) => photoCard(urls.selected.add(file), file.name))
      .join("");
  }

  async function renderSavedPhotos(photos, diveId) {
    urls.existing.revokeAll();
    savedPhotos = photos;
    existingPhotos.hidden = photos.length === 0;
    existingPhotos.innerHTML = photos.length ? PHOTO_LOADING_MARKUP : "";
    if (photos.length === 0) return;

    const loaded = await loadPhotoUrls(photos, urls.existing);
    existingPhotos.innerHTML = loaded.map(({ photo, url }) => url
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

  async function handlePhotoDelete(event) {
    const button = event.target.closest("[data-photo-id]");
    if (!button) return;
    button.disabled = true;

    try {
      await deleteDivePhoto(button.dataset.diveId, button.dataset.photoId);
      const remaining = savedPhotos.filter((photo) => String(photo.id) !== button.dataset.photoId);
      await renderSavedPhotos(remaining, button.dataset.diveId);
      setMessage(message, "Fotografía eliminada.", "success");
    } catch (error) {
      if (handleUnauthorized(error)) return;
      button.disabled = false;
      setMessage(message, "No se pudo eliminar la fotografía.");
    }
  }

  async function searchConfigurationMemory() {
    const filters = {};
    MEMORY_FIELDS.forEach((key) => { if (form.elements[key].value) filters[key] = form.elements[key].value; });
    memory.results.replaceChildren();
    if (Object.keys(filters).length === 0) {
      memory.message.textContent = "Indica al menos el traje, la botella o el tipo de agua para buscar coincidencias.";
      return;
    }
    if (editingDiveId) filters.excludeDiveId = editingDiveId;
    memory.button.disabled = true;
    memory.message.textContent = "Buscando en tu bitácora...";
    try {
      const response = await getConfigurationMemory(filters);
      const dives = response.data.dives;
      memory.message.textContent = dives.length
        ? `${countLabel(dives.length, "experiencia similar encontrada", "experiencias similares encontradas")}. Referencia personal, no recomendación.`
        : "No hay experiencias anteriores que coincidan con esta configuración.";
      memory.results.innerHTML = dives.map((dive) => `
      <article class="memory-card">
        <div><strong>${escapeHtml(dive.name)}</strong><span>${escapeHtml(formatDate(dive.date))}${dive.diveCenter ? ` · ${escapeHtml(dive.diveCenter)}` : ""}</span></div>
        <div class="memory-ballast"><strong>${escapeHtml(formatNumber(dive.ballastKg))} kg</strong><span>lastre registrado</span></div>
      </article>`).join("");
    } catch (error) {
      if (!handleUnauthorized(error)) memory.message.textContent = "No se pudo consultar tu historial.";
    } finally {
      memory.button.disabled = false;
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      place.message.textContent = "Este navegador no permite obtener la ubicación.";
      return;
    }
    place.useCurrent.disabled = true;
    place.message.textContent = "Solicitando permiso de ubicación...";
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      form.elements.latitude.value = coords.latitude.toFixed(5);
      form.elements.longitude.value = coords.longitude.toFixed(5);
      place.message.textContent = "Ubicación añadida. Revisa la precisión antes de guardar.";
      place.useCurrent.disabled = false;
    }, () => {
      place.message.textContent = "No se pudo obtener la ubicación. Puedes escribirla manualmente.";
      place.useCurrent.disabled = false;
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  function clearLocation() {
    form.elements.latitude.value = "";
    form.elements.longitude.value = "";
    form.elements.locationPrecision.value = "approximate";
    place.message.textContent = "La ubicación no se guardará.";
  }

  function setBusy(busy) {
    form.classList.toggle("is-busy", busy);
    setFormBusy(form, busy);
  }

  function reset() {
    editingDiveId = null;
    form.reset();
    form.elements.date.max = localIsoDate();
    title.textContent = "Registrar inmersión";
    eyebrow.textContent = "Nueva experiencia";
    saveButton.textContent = "Guardar inmersión";
    urls.selected.revokeAll();
    urls.existing.revokeAll();
    savedPhotos = [];
    selectedPhotos.replaceChildren();
    selectedPhotos.hidden = true;
    existingPhotos.replaceChildren();
    existingPhotos.hidden = true;
    memory.message.textContent = "";
    memory.results.replaceChildren();
    place.message.textContent = "";
    setMessage(message, "");
    syncDisappearingExamples();
    changes.markClean();
  }

  function openCreate() {
    reset();
    dialog.showModal();
    form.elements.name.focus();
  }

  async function openEdit(diveId) {
    reset();
    editingDiveId = diveId;
    title.textContent = "Editar inmersión";
    eyebrow.textContent = "Actualizar recuerdo";
    saveButton.textContent = "Guardar cambios";
    dialog.showModal();
    setFormBusy(form, true);
    form.classList.add("is-busy");

    try {
      const response = await getDive(diveId);
      const dive = response.data.dive;
      populateDiveForm(form, dive);
      await renderSavedPhotos(dive.photos, dive.id);
      changes.markClean();
      form.elements.name.focus();
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setMessage(message, "No se pudo cargar la inmersión para editarla.");
    } finally {
      setBusy(false);
    }
  }

  // The dive is saved first and its photos uploaded after. If the photos
  // fail, the form stays open in edit mode on the saved dive.
  async function keepOpenAfterPhotoError(diveId, photoError) {
    editingDiveId = diveId;
    form.elements.photos.value = "";
    urls.selected.revokeAll();
    selectedPhotos.hidden = true;
    const refreshed = await getDive(diveId);
    await renderSavedPhotos(refreshed.data.dive.photos, diveId);
    changes.markClean();
    setMessage(message, photoError.code === "PHOTO_LIMIT_EXCEEDED"
      ? "La inmersión se guardó, pero supera el límite de 5 fotos."
      : "La inmersión se guardó, pero las fotografías no pudieron subirse.");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(message, "");
    if (!validateForm(form, formErrors)) return;

    setFormBusy(form, true);
    form.classList.add("is-busy");

    try {
      const data = divePayload(formDataToObject(form));
      const photoFiles = [...form.elements.photos.files];
      const isEditing = Boolean(editingDiveId);
      let response;

      if (isEditing) {
        response = await updateDive(editingDiveId, data);
      } else {
        response = await createDive(data);
        onCreated();
      }

      if (photoFiles.length > 0) {
        try {
          await uploadDivePhotos(response.data.dive.id, photoFiles);
        } catch (photoError) {
          await keepOpenAfterPhotoError(response.data.dive.id, photoError);
          return;
        }
      }

      const savedId = editingDiveId;
      dialog.close();
      await onSaved({ isEditing, savedId });
    } catch (error) {
      if (handleUnauthorized(error)) return;
      const hasFieldErrors = showApiFieldErrors(form, error.details);
      setMessage(message, hasFieldErrors
        ? "Revisa los campos señalados."
        : "No se pudo guardar la inmersión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  document.querySelectorAll("[data-open-dive-form]").forEach((button) =>
    button.addEventListener("click", openCreate)
  );
  document.querySelectorAll("[data-close-dive-form]").forEach((button) =>
    button.addEventListener("click", () => requestDialogClose(dialog))
  );
  form.addEventListener("submit", handleSubmit);
  form.elements.photos.addEventListener("change", () => {
    renderSelectedPhotos();
    clearFieldError(form.elements.photos);
    syncDisappearingExamples();
  });
  form.addEventListener("input", syncDisappearingExamples);
  form.addEventListener("change", syncDisappearingExamples);
  memory.button.addEventListener("click", searchConfigurationMemory);
  place.useCurrent.addEventListener("click", useCurrentLocation);
  place.clear.addEventListener("click", clearLocation);
  existingPhotos.addEventListener("click", handlePhotoDelete);
  guardDialogClose(dialog, {
    isBusy: () => isFormBusy(form),
    isDirty: changes.isDirty,
    confirmDiscard
  });
  // One `close` listener holds the cleanup, whatever closed the dialog.
  dialog.addEventListener("close", reset);

  return { openCreate, openEdit };
}
