const scalarDiveFields = [
  "name",
  "date",
  "durationMinutes",
  "maxDepthMeters",
  "ballastKg",
  "equipmentOwnership",
  "suitType",
  "suitThicknessMm",
  "cylinderMaterial",
  "cylinderVolumeLiters",
  "waterType",
  "diveCenter",
  "comments"
];

export function populateDiveForm(form, dive) {
  scalarDiveFields.forEach((field) => {
    if (dive[field] !== null && dive[field] !== undefined) {
      form.elements[field].value = dive[field];
    }
  });

  form.elements.buddiesText.value = (dive.buddies || []).join(", ");
  if (dive.location) {
    form.elements.latitude.value = dive.location.latitude;
    form.elements.longitude.value = dive.location.longitude;
    form.elements.locationPrecision.value = dive.location.precision;
  }
}

// Today's calendar date where the diver is, as the YYYY-MM-DD a date input
// expects. toISOString() would give the UTC date, which is still "yesterday"
// for a while after local midnight east of UTC. The clock is read from
// Date.now() so tests and frozen clocks drive both paths alike.
export function localIsoDate(now = Date.now(), temporal = globalThis.Temporal) {
  if (temporal?.Instant && temporal.Now) {
    return temporal.Instant.fromEpochMilliseconds(now)
      .toZonedDateTimeISO(temporal.Now.timeZoneId())
      .toPlainDate()
      .toString();
  }
  const date = new Date(now);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
