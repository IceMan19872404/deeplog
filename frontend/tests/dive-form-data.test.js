import test from "node:test";
import assert from "node:assert/strict";
import { buddiesError, divePayload, parseBuddies, photosError } from "../js/dive-form-data.js";

test("buddies are trimmed and deduplicated ignoring case", () => {
  assert.deepEqual(parseBuddies(" Ana , ana, Luis,, ÁLVARO, álvaro "), ["Ana", "Luis", "ÁLVARO"]);
  assert.deepEqual(parseBuddies(""), []);
});

test("buddy rules match the API (up to 10, 2-80 characters each)", () => {
  assert.equal(buddiesError("Ana, Luis"), null);
  assert.equal(buddiesError(Array.from({ length: 11 }, (_, i) => `Buzo ${i}`).join(",")), "Puedes añadir un máximo de 10 compañeros.");
  assert.equal(buddiesError("Ana, L"), "Cada nombre debe tener entre 2 y 80 caracteres.");
  assert.equal(buddiesError("x".repeat(81)), "Cada nombre debe tener entre 2 y 80 caracteres.");
});

test("photos: count includes the saved ones, then type, then size", () => {
  const jpeg = { type: "image/jpeg", size: 1000 };
  assert.equal(photosError([jpeg, jpeg], 3), null);
  assert.equal(photosError([jpeg, jpeg, jpeg], 3), "Cada inmersión puede contener hasta 5 fotos.");
  assert.equal(photosError([{ type: "image/gif", size: 10 }]), "Utiliza únicamente imágenes JPEG, PNG o WebP.");
  assert.equal(photosError([{ type: "image/webp", size: 8 * 1024 * 1024 + 1 }]), "Cada fotografía debe ocupar 8 MB o menos.");
  assert.equal(photosError([{ type: "image/png", size: 8 * 1024 * 1024 }]), null);
});

test("the payload converts numbers and drops what the API does not take", () => {
  assert.deepEqual(divePayload({
    name: "Cala", date: "2026-11-01", durationMinutes: "44", maxDepthMeters: "17.5", ballastKg: "6",
    suitThicknessMm: "5", buddiesText: "Ana, ana", photos: {}, locationPrecision: "approximate"
  }), {
    name: "Cala", date: "2026-11-01", durationMinutes: 44, maxDepthMeters: 17.5, ballastKg: 6,
    suitThicknessMm: 5, buddies: ["Ana"]
  });
  const located = divePayload({ durationMinutes: "30", maxDepthMeters: "10", latitude: "41.7", longitude: "2.99", locationPrecision: "exact" });
  assert.deepEqual(located, { latitude: 41.7, longitude: 2.99, locationPrecision: "exact", durationMinutes: 30, maxDepthMeters: 10, buddies: [] });
  assert.ok(!("ballastKg" in located));
});
