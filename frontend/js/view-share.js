// Private share links for one dive (TD-020): choose what the recipient sees,
// an optional password and expiry, get the link and its QR, and revoke links.

import { createDiveShare, getDiveShares, revokeDiveShare } from "./api.js?v=20261123-2";
import { clearFormErrors, setMessage, validateForm } from "./forms.js?v=20261126-1";
import { escapeHtml } from "./text.js?v=20261126-1";

const STATUS_LABELS = { active: "Activo", expired: "Caducado", revoked: "Revocado" };
const COPIED_LABEL_MS = 1800;

function formatExpiry(value) {
  return value ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value)) : "Sin caducidad";
}

// `getDive()` is the dive open in the detail dialog; `getProfile()` gives
// the default for including the diver's name.
export function createShareView({ getDive, getProfile, handleUnauthorized }) {
  const dialog = document.querySelector("#share-dialog");
  const form = document.querySelector("#share-form");
  const photoOptions = document.querySelector("#share-photo-options");
  const photoList = document.querySelector("#share-photo-list");
  const message = document.querySelector("#share-message");
  const result = document.querySelector("#share-result");
  const qr = document.querySelector("#share-qr");
  const link = document.querySelector("#share-link");
  const copyButton = document.querySelector("#copy-share-link");
  const historyList = document.querySelector("#share-list");
  let shares = [];

  function renderHistory() {
    if (shares.length === 0) {
      historyList.innerHTML = '<p class="muted">Todavía no hay enlaces.</p>';
      return;
    }
    historyList.innerHTML = shares.map((share) => `
    <article class="share-history-item">
      <div><strong>${STATUS_LABELS[share.status]}</strong><span>${escapeHtml(formatExpiry(share.expiresAt))}${share.passwordProtected ? " · Con contraseña" : ""}</span></div>
      ${share.status === "active" ? `<button class="card-action card-action-danger" type="button" data-share-id="${escapeHtml(share.id)}">Revocar</button>` : ""}
    </article>`).join("");
  }

  async function loadHistory() {
    const dive = getDive();
    if (!dive) return;
    try {
      const response = await getDiveShares(dive.id);
      shares = response.data.shares;
      renderHistory();
    } catch (error) {
      if (!handleUnauthorized(error)) setMessage(message, "No se pudieron cargar los enlaces existentes.");
    }
  }

  function open() {
    const dive = getDive();
    if (!dive) return;
    form.reset();
    clearFormErrors(form);
    form.elements.expiresInDays.value = "7";
    form.querySelectorAll('.share-options input[type="checkbox"]').forEach((input) => { input.checked = true; });
    form.elements.includeDiverName.checked = Boolean(getProfile()?.shareNameByDefault);
    result.hidden = true;
    setMessage(message, "");
    photoOptions.hidden = dive.photos.length === 0;
    photoList.innerHTML = dive.photos.map((photo) => `
    <label><input type="checkbox" name="sharedPhotos" value="${escapeHtml(photo.id)}" checked>${escapeHtml(photo.originalName)}</label>`).join("");
    dialog.showModal();
    loadHistory();
  }

  function payload() {
    const fields = form.elements;
    const expiry = fields.expiresInDays.value;
    return {
      visibility: {
        includeDiverName: fields.includeDiverName.checked,
        includeCenter: fields.includeCenter.checked,
        includeEquipment: fields.includeEquipment.checked,
        includeBuddies: fields.includeBuddies.checked,
        includeComments: fields.includeComments.checked,
        photoIds: [...photoList.querySelectorAll("input:checked")].map((input) => Number(input.value))
      },
      expiresInDays: expiry === "never" ? null : Number(expiry),
      ...(fields.password.value && { password: fields.password.value })
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const dive = getDive();
    if (!dive || !validateForm(form)) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage(message, "");
    try {
      const response = await createDiveShare(dive.id, payload());
      link.value = response.data.shareUrl;
      qr.src = response.data.qrDataUrl;
      result.hidden = false;
      form.elements.password.value = "";
      await loadHistory();
      setMessage(message, "Enlace privado creado. Puedes copiarlo o escanear el QR.", "success");
    } catch (error) {
      if (!handleUnauthorized(error)) setMessage(message, "No se pudo crear el enlace. Revisa la configuración.");
    } finally {
      button.disabled = false;
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link.value);
      copyButton.textContent = "Copiado";
      setTimeout(() => { copyButton.textContent = "Copiar"; }, COPIED_LABEL_MS);
    } catch (_error) {
      link.select();
      setMessage(message, "Selecciona el enlace y cópialo manualmente.");
    }
  }

  async function handleHistoryClick(event) {
    const button = event.target.closest("[data-share-id]");
    const dive = getDive();
    if (!button || !dive) return;
    button.disabled = true;
    try {
      await revokeDiveShare(dive.id, button.dataset.shareId);
      await loadHistory();
      setMessage(message, "El enlace ha sido revocado.", "success");
    } catch (error) {
      if (!handleUnauthorized(error)) setMessage(message, "No se pudo revocar el enlace.");
    }
  }

  document.querySelector("#open-share-dialog").addEventListener("click", open);
  document.querySelector("#close-share-dialog").addEventListener("click", () => dialog.close());
  document.querySelector("#cancel-share-dialog").addEventListener("click", () => dialog.close());
  form.addEventListener("submit", handleSubmit);
  copyButton.addEventListener("click", copyLink);
  historyList.addEventListener("click", handleHistoryClick);
}
