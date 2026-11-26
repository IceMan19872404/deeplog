// Estadísticas: the four headline cards are tabs and the panel below shows the
// detail of the selected figure (time per month, depth and duration records
// and bands, this year month by month). Pattern from the Modern Web Guidance
// `tabs` guide: buttons in a tablist, aria-selected as the single source of
// truth, panels hidden="until-found" so find-in-page still reaches them, and
// selection follows focus because every panel is already rendered.

import {
  escapeHtml,
  formatCalendarDate,
  formatMinutes,
  formatMinutesCompact,
  formatNumber
} from "./format.js?v=20261126-2";

// Re-exported: they lived here first and tests/stats-detail.test.js imports them.
export { formatMinutes, formatMinutesCompact };

// `month` is "YYYY-MM". Spanish short months end in a dot («sept.»): dropped.
function monthShort(month) {
  return formatCalendarDate(`${month}-01`, { month: "short" }).replace(".", "");
}

function monthNarrow(month) {
  return formatCalendarDate(`${month}-01`, { month: "narrow" });
}

function dateLong(date) {
  return formatCalendarDate(date, { day: "numeric", month: "short", year: "numeric" }).replace(".", "");
}

// Vertical bars (months). `value` is what sets the height, `label` the text.
export function columnsMarkup(items) {
  const maximum = Math.max(...items.map((item) => item.value), 1);
  return items.map((item) => {
    const height = item.value === 0 ? 5 : Math.max(18, (item.value / maximum) * 100);
    return `
      <div class="activity-month">
        <span class="activity-value"><span class="label-short">${escapeHtml(item.label)}</span><span class="label-narrow">${escapeHtml(item.compact ?? item.label)}</span></span>
        <span class="activity-bar" style="--bar-height: ${height}%"></span>
        <span class="activity-label"><span class="label-short">${escapeHtml(monthShort(item.month))}</span><span class="label-narrow">${escapeHtml(monthNarrow(item.month))}</span></span>
      </div>`;
  }).join("");
}

// Horizontal bars (depth or duration bands).
export function bandsMarkup(ranges) {
  const maximum = Math.max(...ranges.map((range) => range.total), 1);
  return ranges.map((range) => `
    <li class="stat-band">
      <span class="stat-band-label">${escapeHtml(range.label)}</span>
      <span class="stat-band-track"><span class="stat-band-fill" style="--band: ${range.total ? Math.max(4, (range.total / maximum) * 100) : 0}%"></span></span>
      <b>${escapeHtml(range.total)}</b>
    </li>`).join("");
}

function recordMarkup(dive, figure) {
  if (!dive) return '<p class="stat-detail-empty">Registra una inmersión para ver tu récord.</p>';
  const where = [dateLong(dive.date), dive.diveCenter].filter(Boolean).join(" · ");
  return `
    <div class="stat-record">
      <strong class="stat-record-figure">${escapeHtml(figure)}</strong>
      <span class="stat-record-name">${escapeHtml(dive.name)}</span>
      <span class="stat-record-meta">${escapeHtml(where)}</span>
      <button type="button" class="stat-record-open" data-dive-id="${escapeHtml(dive.id)}">Abrir ficha →</button>
    </div>`;
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

export function yearComparison(thisYear, previousYearTotal, year) {
  const difference = thisYear - previousYearTotal;
  const trend = difference === 0
    ? "las mismas que"
    : difference > 0 ? `${difference} más que` : `${-difference} menos que`;
  return `${plural(thisYear, "inmersión", "inmersiones")} en ${year}: ${trend} en el mismo periodo de ${year - 1} (${previousYearTotal}).`;
}

// Fills the four panels. `stats` is the /dives/stats payload.
export function renderStatsDetail(root, stats) {
  const panel = (name) => root.querySelector(`[data-stat-panel="${name}"]`);
  const months = stats.monthlyActivity || [];
  const year = new Date().getFullYear();

  const time = panel("time");
  time.querySelector(".activity-chart").innerHTML = columnsMarkup(
    months.map((entry) => ({
      month: entry.month,
      value: entry.minutes || 0,
      label: entry.minutes ? formatMinutes(entry.minutes) : "0",
      compact: entry.minutes ? formatMinutesCompact(entry.minutes) : "0"
    }))
  );
  time.querySelector(".activity-chart").setAttribute(
    "aria-label",
    months.map((entry) => `${monthShort(entry.month)}: ${formatMinutes(entry.minutes || 0)}`).join(", ")
  );
  time.querySelector("[data-stat-facts]").innerHTML = stats.totalDives
    ? `<li><span>Media por inmersión</span><b>${escapeHtml(formatMinutes(stats.averageDurationMinutes))}</b></li>
       <li><span>Inmersiones</span><b>${escapeHtml(stats.totalDives)}</b></li>
       <li><span>Últimos seis meses</span><b>${escapeHtml(formatMinutes(months.reduce((sum, entry) => sum + (entry.minutes || 0), 0)))}</b></li>`
    : "";

  const depth = panel("depth");
  depth.querySelector("[data-stat-record]").innerHTML = recordMarkup(
    stats.deepestDive,
    stats.deepestDive ? `${formatNumber(stats.deepestDive.maxDepthMeters)} m` : ""
  );
  depth.querySelector("[data-stat-average]").textContent = stats.averageDepthMeters === null
    ? ""
    : `Profundidad media: ${formatNumber(stats.averageDepthMeters)} m`;
  depth.querySelector(".stat-bands").innerHTML = bandsMarkup(stats.depthRanges || []);

  const duration = panel("duration");
  duration.querySelector("[data-stat-record]").innerHTML = recordMarkup(
    stats.longestDive,
    stats.longestDive ? `${formatNumber(stats.longestDive.durationMinutes)} min` : ""
  );
  duration.querySelector("[data-stat-average]").textContent = stats.averageDurationMinutes === null
    ? ""
    : `Duración media: ${formatMinutes(stats.averageDurationMinutes)}`;
  duration.querySelector(".stat-bands").innerHTML = bandsMarkup(stats.durationRanges || []);

  const yearPanel = panel("year");
  const yearMonths = stats.yearActivity?.months || [];
  yearPanel.querySelector("[data-stat-year]").textContent = String(year);
  yearPanel.querySelector(".activity-chart").innerHTML = columnsMarkup(
    yearMonths.map((entry) => ({ month: entry.month, value: entry.total, label: String(entry.total) }))
  );
  yearPanel.querySelector(".activity-chart").style.setProperty("--columns", Math.max(yearMonths.length, 1));
  yearPanel.querySelector(".activity-chart").setAttribute(
    "aria-label",
    yearMonths.map((entry) => `${monthShort(entry.month)}: ${plural(entry.total, "inmersión", "inmersiones")}`).join(", ")
  );
  yearPanel.querySelector("[data-stat-comparison]").textContent = yearComparison(
    stats.divesThisYear,
    stats.yearActivity?.previousYearTotal ?? 0,
    year
  );
}

// Tab behaviour. Native `focusgroup` handles arrow keys where it exists; the
// small fallback below gives the same roving focus elsewhere (the guide's
// polyfill would have to be copied into the project because of the CSP).
export function createStatTabs(root, { onOpenDive } = {}) {
  const tablist = root.querySelector('[role="tablist"]');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => root.querySelector(`#${tab.dataset.panel}`));
  const nativeFocusgroup = Object.hasOwn(HTMLElement.prototype, "focusGroup");

  function select(tab, { focus = false } = {}) {
    tabs.forEach((item, index) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.toggleAttribute("focusgroupstart", selected);
      // Roving tabindex only for the fallback: native focusgroup manages focus
      // itself and skips items with tabindex="-1".
      if (nativeFocusgroup) item.removeAttribute("tabindex");
      else item.tabIndex = selected ? 0 : -1;
      const panel = panels[index];
      if (selected) {
        panel.hidden = false;
        panel.removeAttribute("hidden");
        panel.tabIndex = 0;
      } else {
        panel.hidden = "until-found";
        panel.removeAttribute("tabindex");
      }
    });
    if (focus) tab.focus();
  }

  tablist.addEventListener("click", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab);
  });

  // Selection follows focus (arrow keys, native or fallback).
  tablist.addEventListener("focusin", (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && tab.getAttribute("aria-selected") !== "true") select(tab);
  });

  if (!nativeFocusgroup) {
    tablist.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const next = {
        ArrowRight: (current + 1) % tabs.length,
        ArrowDown: (current + 1) % tabs.length,
        ArrowLeft: (current - 1 + tabs.length) % tabs.length,
        ArrowUp: (current - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select(tabs[next], { focus: true });
    });
  }

  // Find-in-page revealed a hidden panel: select its tab.
  panels.forEach((panel, index) => {
    panel.addEventListener("beforematch", () => select(tabs[index]));
  });

  root.addEventListener("click", (event) => {
    const open = event.target.closest(".stat-record-open[data-dive-id]");
    if (open && onOpenDive) onOpenDive(open.dataset.diveId);
  });

  select(tabs.find((tab) => tab.getAttribute("aria-selected") === "true") || tabs[0]);
  return { select: (name) => select(tabs.find((tab) => tab.dataset.stat === name)) };
}
