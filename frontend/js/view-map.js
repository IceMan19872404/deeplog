// Mapa: the private world map of dive locations (TD-030, TD-033). The map
// module brings ~140 KB of coastline data, so it is imported only when the
// Mapa tab is shown with dives to place (it stays in the offline shell).

import { getDiveMap } from "./api.js?v=20261126-2";
import { readOfflineSnapshot, updateOfflineSnapshot } from "./offline.js?v=20261126-2";
import { formatDate } from "./text.js?v=20261126-2";

function describeDive(dive) {
  const precision = dive.precision === "approximate" ? "ubicación aproximada" : "ubicación exacta privada";
  return `${dive.name} · ${formatDate(dive.date)} · ${precision}`;
}

// `isVisible()` tells whether the Mapa tab is on screen; `priority()` the
// fetch priority for its data.
export function createMapView({ getUser, handleUnauthorized, openDiveDetail, isVisible, priority }) {
  const container = document.querySelector("#dive-map");
  const status = document.querySelector("#map-status");
  let map = null;
  let pending = null; // dives waiting to be drawn when the tab is shown

  function render(dives = []) {
    if (!dives.length) {
      pending = null;
      map?.update([]);
      container.innerHTML = '<p class="map-empty">Añade coordenadas a una inmersión para situarla en tu mapa privado.</p>';
      container.setAttribute("aria-label", "Sin ubicaciones registradas");
      return;
    }
    container.setAttribute("aria-label", `Mapa con ${dives.length} ubicaciones de inmersión registradas`);
    pending = dives;
    if (isVisible()) draw();
  }

  async function draw() {
    if (!pending) return;
    try {
      if (!map) {
        const { createDiveMap } = await import("./dive-map.js?v=20261123-2");
        map ||= createDiveMap(container, { onSelect: openDiveDetail, describe: describeDive });
      }
    } catch (_error) {
      status.textContent = "No se pudo cargar el mapa. Inténtalo de nuevo más tarde.";
      return;
    }
    // Another call may have drawn these dives while the module loaded.
    if (!pending) return;
    map.update(pending);
    pending = null;
  }

  async function load() {
    try {
      const response = await getDiveMap({ priority: priority() });
      render(response.data.dives);
      updateOfflineSnapshot({ map: response.data.dives }, getUser());
    } catch (error) {
      const cached = readOfflineSnapshot()?.map;
      if (cached) {
        render(cached);
        status.textContent = "Mapa guardado en este dispositivo · modo sin conexión.";
      } else if (!handleUnauthorized(error)) {
        render([]);
      }
    }
  }

  return { load, draw };
}
