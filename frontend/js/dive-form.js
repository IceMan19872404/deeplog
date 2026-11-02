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
