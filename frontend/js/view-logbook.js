// Inmersiones: the paginated list of dive cards, its status message, the
// delete confirmation and where focus goes after the list is redrawn. The
// first page is also what Inicio and the offline copy show.

import { deleteDive, getDives } from "./api.js?v=20261126-2";
import { guardDialogClose } from "./dialogs.js?v=20261126-2";
import { ownershipLabel } from "./dive-labels.js?v=20261126-2";
import { formatNumber } from "./format.js?v=20261126-2";
import { setMessage } from "./forms.js?v=20261126-2";
import {
  applyOfflineMode,
  readOfflineSnapshot,
  setOffline,
  updateOfflineSnapshot
} from "./offline.js?v=20261126-2";
import { countLabel, escapeHtml, formatDate } from "./text.js?v=20261126-2";

const PAGE_SIZE = 6;
// The depth bar is full at 40 m, the recreational limit.
const DEPTH_BAR_FULL_METERS = 40;

function diveCard(dive, index) {
  return `
        <article
          class="dive-card"
          style="--delay: ${index * 70}ms"
          data-dive-id="${escapeHtml(dive.id)}"
        >
          <div class="dive-date">
            ${dive.diveNumber ? `<span class="dive-number"><abbr title="Número de inmersión">Nº</abbr> ${escapeHtml(dive.diveNumber)}</span>` : ""}
            <span>${escapeHtml(formatDate(dive.date))}</span>
            <strong>${escapeHtml(formatNumber(dive.maxDepthMeters))} m</strong>
            <span class="depth-bar" style="--depth: ${Math.min(100, Math.round((Number(dive.maxDepthMeters) / DEPTH_BAR_FULL_METERS) * 100))}%" aria-hidden="true"></span>
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
              ${dive.ballastKg === null ? "" : `<span>${escapeHtml(formatNumber(dive.ballastKg))} kg de lastre</span>`}
              ${dive.equipmentOwnership ? `<span>${ownershipLabel(dive.equipmentOwnership)}</span>` : ""}
            </div>
            ${dive.buddies.length ? `<p class="dive-buddies">Con ${escapeHtml(dive.buddies.join(", "))}</p>` : ""}
            ${dive.photos.length ? `<span class="photo-count">${escapeHtml(countLabel(dive.photos.length, "foto", "fotos"))}</span>` : ""}
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
      `;
}

// `home` receives the first page; `onChanged()` reloads every dashboard
// section after a dive is saved or deleted.
export function createLogbookView({ getUser, handleUnauthorized, home, openDiveDetail, openEditDiveForm, onChanged }) {
  const list = document.querySelector("#dives-list");
  const loading = document.querySelector("#dives-loading");
  const empty = document.querySelector("#dives-empty");
  const message = document.querySelector("#dashboard-message");
  const total = document.querySelector("#dives-total");
  const pagination = {
    root: document.querySelector("#pagination"),
    previous: document.querySelector("#previous-page"),
    next: document.querySelector("#next-page"),
    label: document.querySelector("#page-label")
  };
  const deletion = {
    dialog: document.querySelector("#delete-dialog"),
    name: document.querySelector("#delete-dive-name"),
    message: document.querySelector("#delete-message"),
    cancel: document.querySelector("#cancel-delete-button"),
    confirm: document.querySelector("#confirm-delete-button")
  };
  let page = 1;
  let totalPages = 0;
  let deletingDive = null;

  function showMessage(text, type) {
    setMessage(message, text, type);
  }

  function resetPage() {
    page = 1;
  }

  function renderDives(dives) {
    list.replaceChildren();
    // Cards drawn while offline must start disabled too.
    queueMicrotask(applyOfflineMode);
    empty.hidden = dives.length > 0;
    if (dives.length === 0) return;
    list.innerHTML = dives.map(diveCard).join("");
  }

  function renderPagination(meta) {
    totalPages = meta.totalPages;
    total.textContent = meta.total;
    pagination.root.hidden = meta.totalPages <= 1;
    pagination.label.textContent = `Página ${meta.page} de ${meta.totalPages}`;
    pagination.previous.disabled = meta.page <= 1;
    pagination.next.disabled = meta.page >= meta.totalPages;
  }

  async function load() {
    loading.hidden = false;
    list.setAttribute("aria-busy", "true");
    list.hidden = true;
    empty.hidden = true;
    showMessage("");

    try {
      const response = await getDives(page, PAGE_SIZE);
      renderDives(response.data.dives);
      renderPagination(response.meta);
      if (page === 1) home.render(response.data.dives);
      updateOfflineSnapshot({ dives: response.data.dives, meta: response.meta }, getUser());
    } catch (error) {
      if (handleUnauthorized(error)) return;
      const cached = readOfflineSnapshot();
      if (cached?.dives) {
        setOffline(true);
        renderDives(cached.dives);
        renderPagination(cached.meta || { page: 1, totalPages: 1 });
        home.render(cached.dives);
        showMessage("Mostrando la última copia sincronizada. La edición requiere conexión.", "success");
      } else {
        showMessage("No se pudieron cargar las inmersiones.");
      }
    } finally {
      loading.hidden = true;
      list.hidden = false;
      list.removeAttribute("aria-busy");
      home.markLoaded();
    }
  }

  // After a save or delete the list is re-rendered and the card that opened
  // the dialog is gone, so focus would fall to <body>. Move it to the
  // matching card control, else the card now in the same position, else the
  // list heading.
  function restoreFocus(selector, index = 0) {
    if (document.activeElement && document.activeElement !== document.body) return;
    const cards = list.querySelectorAll(".dive-card");
    const card = cards[Math.min(index, cards.length - 1)];
    const target = (selector && list.querySelector(selector))
      || (card && (card.tabIndex >= 0 ? card : card.querySelector("button")))
      || document.querySelector("#inmersiones-title");
    if (!target) return;
    if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus();
  }

  // Called by the dive form once its dialog has closed.
  async function afterSave({ isEditing, savedId }) {
    await onChanged();
    if (isEditing) restoreFocus(`[data-action="edit"][data-dive-id="${CSS.escape(String(savedId))}"]`);
    showMessage(isEditing ? "Inmersión actualizada correctamente." : "Inmersión añadida a tu bitácora.", "success");
  }

  function openDeleteDialog(id, name) {
    deletingDive = { id, name };
    deletion.name.textContent = name;
    setMessage(deletion.message, "");
    deletion.dialog.showModal();
  }

  async function handleDelete() {
    if (!deletingDive) return;

    deletion.confirm.disabled = true;
    deletion.confirm.classList.add("is-loading");
    deletion.cancel.disabled = true;
    setMessage(deletion.message, "");

    const cardIndex = [...list.querySelectorAll(".dive-card")]
      .findIndex((card) => card.dataset.diveId === String(deletingDive.id));

    try {
      await deleteDive(deletingDive.id);
      deletion.dialog.close();
      // The last card of a later page is gone: show the previous page.
      if (page > 1 && list.children.length === 1) page -= 1;
      await onChanged();
      restoreFocus(null, Math.max(cardIndex, 0));
      showMessage("Inmersión eliminada de tu bitácora.", "success");
    } catch (error) {
      if (handleUnauthorized(error)) return;
      setMessage(deletion.message, "No se pudo eliminar la inmersión.");
    } finally {
      deletion.confirm.disabled = false;
      deletion.confirm.classList.remove("is-loading");
      deletion.cancel.disabled = false;
    }
  }

  function handleListClick(event) {
    const button = event.target.closest("[data-action]");
    if (!button) {
      const card = event.target.closest(".dive-card");
      if (card) openDiveDetail(card.dataset.diveId);
      return;
    }
    if (button.dataset.action === "edit") openEditDiveForm(button.dataset.diveId);
    if (button.dataset.action === "delete") openDeleteDialog(button.dataset.diveId, button.dataset.diveName);
  }

  list.addEventListener("click", handleListClick);
  deletion.cancel.addEventListener("click", () => deletion.dialog.close());
  deletion.confirm.addEventListener("click", handleDelete);
  guardDialogClose(deletion.dialog, { isBusy: () => deletion.confirm.disabled });
  // One `close` listener holds the cleanup, whatever closed the dialog.
  deletion.dialog.addEventListener("close", () => { deletingDive = null; });
  pagination.previous.addEventListener("click", () => {
    if (page > 1) {
      page -= 1;
      load();
    }
  });
  pagination.next.addEventListener("click", () => {
    if (page < totalPages) {
      page += 1;
      load();
    }
  });

  return { load, resetPage, restoreFocus, afterSave, showMessage };
}
