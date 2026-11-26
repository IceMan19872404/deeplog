import { getPublicDive, getPublicPhotoBlob, unlockPublicDive } from "./api.js?v=20261123-2";
import {
  cylinderSummary,
  formatCalendarDate,
  formatNumber,
  suitSummary,
  waterSummary
} from "./format.js?v=20261123-2";

// Read-only page for a share link (?share=<token>, TD-020). The API only
// returns the fields the owner chose to share, so each optional block is
// shown when its field is present in the response.

const photoUrls = [];
const byId = (id) => document.querySelector(`#${id}`);

function fact(label, value) {
  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = label;
  dd.textContent = value;
  wrapper.append(dt, dd);
  return wrapper;
}

async function renderPhotos(photos, accessToken) {
  const container = byId("public-photos");
  container.replaceChildren();
  byId("public-photos-section").hidden = photos.length === 0;
  const results = await Promise.all(photos.map(async (photo) => {
    try {
      const blob = await getPublicPhotoBlob(photo.url, accessToken);
      const url = URL.createObjectURL(blob);
      photoUrls.push(url);
      const figure = document.createElement("figure");
      const image = document.createElement("img");
      image.src = url;
      image.alt = photo.originalName;
      figure.append(image);
      return figure;
    } catch (_error) {
      const message = document.createElement("p");
      message.textContent = "No se pudo cargar una fotografía.";
      return message;
    }
  }));
  container.append(...results);
}

async function renderDive(dive, accessToken) {
  byId("public-share-password-form").hidden = true;
  byId("public-dive-name").textContent = dive.name;
  byId("public-diver-name").hidden = !dive.diverName;
  byId("public-diver-name").textContent = dive.diverName ? `Bitácora de ${dive.diverName}` : "";
  const facts = byId("public-dive-facts");
  facts.replaceChildren(
    fact("Fecha", formatCalendarDate(dive.date, { day: "2-digit", month: "long", year: "numeric" })),
    fact("Duración", `${formatNumber(dive.durationMinutes)} minutos`),
    fact("Profundidad máxima", `${formatNumber(dive.maxDepthMeters)} metros`)
  );
  if (Object.hasOwn(dive, "diveCenter")) facts.append(fact("Centro de buceo", dive.diveCenter || "No indicado"));
  if (Object.hasOwn(dive, "ballastKg")) facts.append(fact("Lastre", dive.ballastKg === null ? "No indicado" : `${formatNumber(dive.ballastKg)} kg`));
  if (Object.hasOwn(dive, "equipmentOwnership")) facts.append(fact("Material", dive.equipmentOwnership === "owned" ? "Propio" : dive.equipmentOwnership === "rented" ? "De alquiler" : "No indicado"));
  if (Object.hasOwn(dive, "suitType")) {
    facts.append(
      fact("Traje", suitSummary(dive)),
      fact("Botella", cylinderSummary(dive)),
      fact("Agua", waterSummary(dive.waterType))
    );
  }
  byId("public-buddies-section").hidden = !Object.hasOwn(dive, "buddies");
  byId("public-buddies").textContent = dive.buddies?.length ? dive.buddies.join(", ") : "No se indicaron compañeros.";
  byId("public-comments-section").hidden = !Object.hasOwn(dive, "comments");
  byId("public-comments").textContent = dive.comments || "Sin notas registradas.";
  byId("public-dive-content").hidden = false;
  document.title = `${dive.name} | DeepLog`;
  await renderPhotos(dive.photos || [], accessToken);
}

function showTerminalError(error) {
  const state = byId("public-share-error");
  const messages = {
    SHARE_EXPIRED: ["Este enlace ha caducado", "Pide a la persona propietaria que genere uno nuevo."],
    SHARE_REVOKED: ["Este enlace ya no está disponible", "La persona propietaria ha revocado el acceso."],
    SHARE_NOT_FOUND: ["No encontramos esta inmersión", "Comprueba que el enlace esté completo."]
  };
  const [title, copy] = messages[error.code] || ["No se pudo abrir la inmersión", "Inténtalo de nuevo más tarde."];
  state.replaceChildren();
  const heading = document.createElement("h1"); heading.textContent = title;
  const paragraph = document.createElement("p"); paragraph.textContent = copy;
  state.append(heading, paragraph);
  state.hidden = false;
}

export async function initializePublicShare(token) {
  document.querySelector('meta[name="robots"]')?.remove();
  const robots = document.createElement("meta");
  robots.name = "robots"; robots.content = "noindex,nofollow,noarchive";
  document.head.append(robots);
  byId("auth-view").hidden = true;
  byId("dashboard-view").hidden = true;
  byId("public-share-view").hidden = false;
  try {
    const response = await getPublicDive(token);
    await renderDive(response.data.dive);
  } catch (error) {
    if (error.code === "SHARE_PASSWORD_REQUIRED") {
      byId("public-share-password-form").hidden = false;
      byId("public-share-password-form").addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector("button[type='submit']");
        const message = byId("public-password-message");
        message.hidden = true; button.disabled = true;
        try {
          const unlocked = await unlockPublicDive(token, form.elements.password.value);
          await renderDive(unlocked.data.dive, unlocked.data.accessToken);
        } catch (unlockError) {
          message.textContent = unlockError.code === "INVALID_SHARE_PASSWORD"
            ? "La contraseña no es correcta." : "No se pudo abrir la inmersión.";
          message.className = "message message-error"; message.hidden = false;
        } finally { button.disabled = false; }
      });
    } else showTerminalError(error);
  } finally {
    byId("public-share-loading").hidden = true;
  }
}
