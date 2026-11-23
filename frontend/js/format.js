// Numbers shown to people use Spanish formatting (decimal comma), like the
// dates, which already go through Intl.DateTimeFormat("es-ES"). Form values
// (input.value) and coordinates keep the dot: they are data, not prose.
const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

export function formatNumber(value) {
  const number = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(number)
    ? String(value ?? "")
    : numberFormat.format(number);
}
