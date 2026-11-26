// Estadísticas: the headline figures with their detail tabs (TD-041,
// stats-detail.js) and the descriptive analysis of the logbook (TD-022):
// evolution, frequent buddies and centres, own vs rented equipment, ballast
// by configuration and the learning journal over time.

import { getDiveInsights, getDiveStats } from "./api.js?v=20261126-2";
import { COMFORT_LABELS, configurationName, ownershipLabel } from "./dive-labels.js?v=20261126-2";
import { formatNumber } from "./format.js?v=20261126-2";
import { countUp } from "./motion.js?v=20261121-1";
import { createStatTabs, formatMinutes, renderStatsDetail } from "./stats-detail.js?v=20261126-2";
import { countLabel, escapeHtml, formatDate, formatMonthYear } from "./text.js?v=20261126-2";

function frequencyMarkup(items, emptyLabel) {
  if (!items.length) return `<li class="frequency-empty">${escapeHtml(emptyLabel)}</li>`;
  return items.map((item) => `<li><span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.total)}</strong></li>`).join("");
}

function ownershipMarkup(items) {
  if (!items.length) return '<p class="frequency-empty">Indica si el material es propio o alquilado para comparar.</p>';
  return items.map((item) => `
      <div class="ownership-row"><div><strong>${ownershipLabel(item.type)}</strong><span>${escapeHtml(countLabel(item.sampleSize, "inmersión", "inmersiones"))}</span></div><p><b>${escapeHtml(formatNumber(item.averageDurationMinutes))} min</b><span>duración media</span></p><p><b>${escapeHtml(formatNumber(item.averageDepthMeters))} m</b><span>profundidad media</span></p></div>`).join("");
}

function ballastMarkup(items) {
  if (!items.length) return '<p class="frequency-empty">Completa lastre y configuración para crear grupos comparables.</p>';
  return items.map((item) => `
      <article class="ballast-pattern"><div><strong>${escapeHtml(configurationName(item))}</strong><span>${escapeHtml(countLabel(item.sampleSize, "registro", "registros"))}</span></div><p><b>${escapeHtml(formatNumber(item.averageBallastKg))} kg</b><span>media observada</span></p><p><b>${escapeHtml(formatNumber(item.minimumBallastKg))}-${escapeHtml(formatNumber(item.maximumBallastKg))} kg</b><span>rango registrado</span></p></article>`).join("");
}

function reflectionMarkup(items) {
  if (!items.length) return '<p class="frequency-empty">Añade una reflexión desde el detalle de una inmersión.</p>';
  return items.map((item) => `
      <article class="reflection-moment">
        <time>${escapeHtml(formatDate(item.date))}</time>
        <div><strong>${escapeHtml(item.diveName)}</strong>
          ${item.practicedSkill ? `<span>Practiqué: ${escapeHtml(item.practicedSkill)}</span>` : ""}
          ${item.comfort ? `<span>${escapeHtml(COMFORT_LABELS[item.comfort])}</span>` : ""}
          ${item.nextGoal ? `<p>Próximo objetivo: ${escapeHtml(item.nextGoal)}</p>` : ""}
        </div>
      </article>`).join("");
}

// Depth and duration are drawn side by side, each on its own scale.
function renderEvolution(chart, items) {
  if (!items.length) {
    chart.innerHTML = '<p class="frequency-empty">Sin inmersiones registradas.</p>';
    chart.setAttribute("aria-label", "Sin datos de evolución");
    return;
  }
  const maxDepth = Math.max(...items.map((item) => item.maxDepthMeters), 1);
  const maxDuration = Math.max(...items.map((item) => item.durationMinutes), 1);
  chart.innerHTML = items.map((item) => `
    <div class="evolution-point" title="${escapeHtml(formatDate(item.date))}: ${escapeHtml(formatNumber(item.maxDepthMeters))} m, ${escapeHtml(formatNumber(item.durationMinutes))} min">
      <div class="evolution-bars">
        <span class="evolution-depth" style="--value:${Math.max(6, item.maxDepthMeters / maxDepth * 100)}%"></span>
        <span class="evolution-duration" style="--value:${Math.max(6, item.durationMinutes / maxDuration * 100)}%"></span>
      </div>
      <small>${escapeHtml(formatMonthYear(item.date))}</small>
    </div>`).join("");
  chart.setAttribute(
    "aria-label",
    `Evolución de ${items.length} inmersiones. Profundidad máxima y duración se muestran con escalas independientes.`
  );
}

// `onStats(stats, figures)` lets Inicio reuse the same figures.
export function createStatsView({ handleUnauthorized, openDiveDetail, onStats, priority }) {
  const panel = document.querySelector(".insights-panel");
  const loading = document.querySelector("#stats-loading");
  const figures = {
    divesTotal: document.querySelector("#dives-total"),
    totalTime: document.querySelector("#total-time"),
    maxDepth: document.querySelector("#max-depth"),
    longestDuration: document.querySelector("#longest-duration"),
    divesThisYear: document.querySelector("#dives-this-year"),
    favoriteCenter: document.querySelector("#favorite-center")
  };
  const insights = {
    loading: document.querySelector("#advanced-insights-loading"),
    empty: document.querySelector("#advanced-insights-empty"),
    content: document.querySelector("#advanced-insights-content"),
    evolution: document.querySelector("#evolution-chart"),
    ownership: document.querySelector("#ownership-comparison"),
    buddies: document.querySelector("#frequent-buddies"),
    centers: document.querySelector("#frequent-centers"),
    ballast: document.querySelector("#ballast-patterns"),
    reflections: document.querySelector("#reflection-evolution")
  };

  function renderStats(stats) {
    const totalTime = formatMinutes(stats.totalMinutes);
    const maxDepth = stats.maxDepthMeters === null ? "—" : `${formatNumber(stats.maxDepthMeters)} m`;
    countUp(figures.divesTotal, stats.totalDives);
    figures.totalTime.textContent = totalTime;
    figures.maxDepth.textContent = maxDepth;
    figures.longestDuration.textContent = stats.longestDurationMinutes === null
      ? "—"
      : `${formatNumber(stats.longestDurationMinutes)} min`;
    figures.divesThisYear.textContent = stats.divesThisYear;
    onStats(stats, { totalTime, maxDepth });
    figures.favoriteCenter.textContent = stats.favoriteCenter
      ? `Tu centro más visitado: ${stats.favoriteCenter.name}`
      : "Registra un centro para descubrir tu lugar más visitado.";
    renderStatsDetail(panel, stats);
  }

  function renderInsights(data) {
    const hasData = data.evolution.length > 0;
    insights.empty.hidden = hasData;
    insights.content.hidden = !hasData;
    if (!hasData) return;

    renderEvolution(insights.evolution, data.evolution);
    insights.buddies.innerHTML = frequencyMarkup(data.frequentBuddies, "Aún no hay compañeros repetidos.");
    insights.centers.innerHTML = frequencyMarkup(data.frequentCenters, "Aún no hay centros registrados.");
    insights.ownership.innerHTML = ownershipMarkup(data.equipmentOwnership);
    insights.ballast.innerHTML = ballastMarkup(data.ballastConfigurations);
    insights.reflections.innerHTML = reflectionMarkup(data.reflectionEvolution);
  }

  async function loadStats() {
    loading.hidden = false;
    try {
      const response = await getDiveStats();
      renderStats(response.data.stats);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      figures.favoriteCenter.textContent = "No se pudieron actualizar las estadísticas.";
    } finally {
      loading.hidden = true;
    }
  }

  async function loadInsights() {
    insights.loading.hidden = false;
    try {
      const response = await getDiveInsights({ priority: priority() });
      renderInsights(response.data.insights);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      insights.empty.textContent = "No se pudo analizar el historial en este momento.";
      insights.empty.hidden = false;
      insights.content.hidden = true;
    } finally {
      insights.loading.hidden = true;
    }
  }

  createStatTabs(panel, { onOpenDive: openDiveDetail });

  return { loadStats, loadInsights };
}
