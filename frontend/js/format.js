// How values are shown to people. Numbers use Spanish formatting (decimal
// comma), like the dates. Form values (input.value) and coordinates keep the
// dot: they are data, not prose.
const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

export function formatNumber(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number)
    ? String(value ?? "")
    : numberFormat.format(number);
}

// Escapes text for HTML built with template strings (text and quoted
// attribute values). null and undefined become an empty string.
export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// A calendar date from the API ("YYYY-MM-DD") in Spanish. It is read as local
// midnight, not UTC, so the day never shifts with the diver's time zone.
export function formatCalendarDate(date, options) {
  return new Intl.DateTimeFormat("es-ES", options).format(new Date(`${date}T00:00:00`));
}

// Durations. Compact form for narrow charts: «55m», «1h45», «2h».
export function formatMinutesCompact(minutes) {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

export function formatMinutes(minutes) {
  const total = Number(minutes) || 0;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// Equipment as the printable story and the public share page describe it:
// «Húmedo · 5 mm», «Acero · 12 L».
const suitLabels = { wetsuit: "Húmedo", drysuit: "Seco", shorty: "Shorty", none: "Sin traje" };
const cylinderLabels = { steel: "Acero", aluminum: "Aluminio" };

const withAmount = (label, amount, unit) =>
  [label, amount === null ? null : `${formatNumber(amount)} ${unit}`].filter(Boolean).join(" · ");

export function suitSummary(dive) {
  return withAmount(suitLabels[dive.suitType], dive.suitThicknessMm, "mm") || "No indicado";
}

export function cylinderSummary(dive) {
  return withAmount(cylinderLabels[dive.cylinderMaterial], dive.cylinderVolumeLiters, "L") || "No indicada";
}

export function waterSummary(waterType) {
  return waterType === "salt" ? "Salada" : waterType === "fresh" ? "Dulce" : "No indicada";
}
