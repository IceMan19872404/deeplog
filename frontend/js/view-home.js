// Inicio: greeting, headline figures, the latest dive with its approximate
// profile (TD-036) and the next few recent dives.

import { profileSvg } from "./dive-profile.js?v=20261126-2";
import { formatNumber } from "./format.js?v=20261126-2";
import { countUp } from "./motion.js?v=20261121-1";
import { countLabel, daysAgoLabel, escapeHtml, formatDate, formatLongToday } from "./text.js?v=20261126-2";

export function createHomeView({ openDiveDetail, openCreateDiveForm }) {
  const lastDive = document.querySelector("#home-last-dive");
  const recent = document.querySelector("#home-recent");
  const summary = document.querySelector("#home-summary");
  const totalTime = document.querySelector("#home-total-time");
  const maxDepth = document.querySelector("#home-max-depth");
  const thisYear = document.querySelector("#home-this-year");

  function greet(user) {
    document.querySelector("#greeting-name").textContent = user.firstName;
    document.querySelector("#home-date").textContent = formatLongToday();
  }

  // `figures` are the texts already shown in Estadísticas.
  function renderStats(stats, figures) {
    totalTime.textContent = figures.totalTime;
    maxDepth.textContent = figures.maxDepth;
    countUp(thisYear, stats.divesThisYear);
    summary.textContent = stats.totalDives
      ? `Llevas ${countLabel(stats.totalDives, "inmersión", "inmersiones")} y ${figures.totalTime} bajo el agua.`
      : "Tu bitácora está lista para su primera inmersión.";
  }

  function markLoaded() {
    lastDive.removeAttribute("data-loading");
  }

  // The list endpoint is ordered by date, so the first page of the logbook
  // already holds the newest dives.
  function render(dives) {
    const [latest, ...rest] = dives;
    markLoaded();
    if (!latest) {
      lastDive.innerHTML = `
      <p class="muted">Todavía no hay inmersiones registradas.</p>
      <button class="primary-button" data-open-dive-form type="button">Registrar la primera</button>`;
      recent.replaceChildren();
      return;
    }
    lastDive.innerHTML = `
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
    recent.innerHTML = rest.slice(0, 4).map((dive) => `
    <li><button type="button" data-dive-id="${escapeHtml(dive.id)}">
      <span class="home-recent-depth">${escapeHtml(formatNumber(dive.maxDepthMeters))} m</span>
      <span class="home-recent-text"><strong>${escapeHtml(dive.name)}</strong><small>${escapeHtml(formatDate(dive.date))}</small></span>
    </button></li>`).join("") || '<li class="muted">Las siguientes inmersiones aparecerán aquí.</li>';
  }

  function handleClick(event) {
    if (event.target.closest("[data-open-dive-form]")) {
      openCreateDiveForm();
      return;
    }
    const target = event.target.closest("[data-dive-id]");
    if (target) openDiveDetail(target.dataset.diveId);
  }

  lastDive.addEventListener("click", handleClick);
  recent.addEventListener("click", handleClick);

  return { greet, render, renderStats, markLoaded };
}
