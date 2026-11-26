import test from "node:test";
import assert from "node:assert/strict";
import {
  configurationName,
  cylinderDescription,
  locationDescription,
  ownershipLabel,
  suitDescription
} from "../js/dive-labels.js";

const none = { suitType: null, suitThicknessMm: null, cylinderMaterial: null, cylinderVolumeLiters: null, waterType: null };

test("suit and cylinder read as label and size, or as not indicated", () => {
  assert.equal(suitDescription({ ...none, suitType: "wetsuit", suitThicknessMm: 5.5 }), "Traje húmedo · 5,5 mm");
  assert.equal(suitDescription({ ...none, suitThicknessMm: 0 }), "0 mm");
  assert.equal(suitDescription({ ...none, suitType: "drysuit" }), "Traje seco");
  assert.equal(suitDescription(none), "No indicado");
  assert.equal(cylinderDescription({ ...none, cylinderMaterial: "aluminum", cylinderVolumeLiters: 12 }), "Aluminio · 12 L");
  assert.equal(cylinderDescription({ ...none, cylinderVolumeLiters: 15 }), "15 L");
  assert.equal(cylinderDescription(none), "No indicada");
});

test("a ballast configuration joins suit, cylinder and water", () => {
  assert.equal(
    configurationName({ suitType: "wetsuit", suitThicknessMm: 7, cylinderMaterial: "steel", cylinderVolumeLiters: 15, waterType: "salt" }),
    "Traje húmedo 7 mm · Acero 15 L · Agua salada"
  );
  assert.equal(configurationName({ ...none, waterType: "fresh" }), "Agua dulce");
  assert.equal(configurationName(none), "Configuración parcial");
});

test("ownership and location labels", () => {
  assert.equal(ownershipLabel("owned"), "Material propio");
  assert.equal(ownershipLabel("rented"), "Material de alquiler");
  assert.equal(locationDescription(null), "No indicada");
  assert.equal(locationDescription({ latitude: 41.7, longitude: -2.99, precision: "approximate" }), "41.7, -2.99 · aproximada");
  assert.equal(locationDescription({ latitude: 41.70212, longitude: 2.9946, precision: "exact" }), "41.70212, 2.9946 · exacta y privada");
});
