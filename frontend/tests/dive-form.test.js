import test from "node:test";
import assert from "node:assert/strict";
import { populateDiveForm } from "../js/dive-form.js";

function fakeForm() {
  const names = [
    "name", "date", "durationMinutes", "maxDepthMeters", "ballastKg",
    "equipmentOwnership", "suitType", "suitThicknessMm", "cylinderMaterial",
    "cylinderVolumeLiters", "waterType", "diveCenter", "comments",
    "buddiesText", "latitude", "longitude", "locationPrecision", "photos"
  ];
  return {
    elements: Object.fromEntries(names.map((name) => [name, { value: "" }]))
  };
}

test("editing a dive with photos preserves fields that follow the gallery data", () => {
  const form = fakeForm();
  populateDiveForm(form, {
    name: "Cala Azul",
    date: "2026-10-18",
    durationMinutes: 61,
    maxDepthMeters: 24.6,
    buddies: ["Ana López", "Marcos Ruiz"],
    photos: [{ id: "84", originalName: "audit.png" }],
    diveCenter: "Deep Blue Center",
    location: { latitude: 41.7, longitude: 2.99, precision: "approximate" },
    comments: "Registro completo"
  });

  assert.equal(form.elements.buddiesText.value, "Ana López, Marcos Ruiz");
  assert.equal(form.elements.diveCenter.value, "Deep Blue Center");
  assert.equal(form.elements.latitude.value, 41.7);
  assert.equal(form.elements.longitude.value, 2.99);
  assert.equal(form.elements.locationPrecision.value, "approximate");
  assert.equal(form.elements.comments.value, "Registro completo");
  assert.equal(form.elements.photos.value, "");
});
