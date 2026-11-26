// Text helpers shared by the app's views: escaping for HTML templates and the
// Spanish wording of dates and counts. Dates arrive from the API as
// YYYY-MM-DD and are read as local calendar days, never as UTC midnight.

// Escaping lives in format.js (null becomes ""); re-exported for the views.
export { escapeHtml } from "./format.js?v=20261126-2";

function localDay(date) {
  return new Date(`${date}T00:00:00`);
}

// «01 nov 2026»
export function formatDate(date) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", year: "numeric" })
    .format(localDay(date));
}

// «nov 26», for chart axes.
export function formatMonthYear(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "short", year: "2-digit" })
    .format(localDay(date))
    .replace(".", "");
}

// «jueves, 26 de noviembre»
export function formatLongToday(now = new Date()) {
  return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(now);
}

// «hoy», «ayer», «hace 3 días»
export function daysAgoLabel(date, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today - localDay(date)) / 86400000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${days} días`;
}

// «3 inmersiones», «1 foto»
export function countLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}
