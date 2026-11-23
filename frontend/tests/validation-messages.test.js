import test from "node:test";
import assert from "node:assert/strict";
import {
  apiValidationMessage,
  nativeValidationMessage
} from "../js/validation-messages.js";

function input(name, validity, extra = {}) {
  return {
    name,
    validity: {
      valueMissing: false,
      typeMismatch: false,
      tooShort: false,
      tooLong: false,
      rangeUnderflow: false,
      rangeOverflow: false,
      stepMismatch: false,
      patternMismatch: false,
      badInput: false,
      ...validity
    },
    ...extra
  };
}

test("required messages agree with masculine, feminine, and plural fields", () => {
  assert.equal(
    nativeValidationMessage(input("name", { valueMissing: true })),
    "El nombre de la inmersión es obligatorio."
  );
  assert.equal(
    nativeValidationMessage(input("date", { valueMissing: true })),
    "La fecha es obligatoria."
  );
  assert.equal(
    nativeValidationMessage(input("photos", { valueMissing: true })),
    "Las fotografías son obligatorias."
  );
});

test("range and fallback messages use the correct article", () => {
  assert.equal(
    nativeValidationMessage(input("durationMinutes", { rangeUnderflow: true }, { min: "1" })),
    "La duración debe ser igual o superior a 1."
  );
  assert.equal(apiValidationMessage("latitude"), "Revisa la latitud.");
  assert.equal(apiValidationMessage("email"), "Revisa el correo electrónico.");
});

test("password API messages remain specific", () => {
  assert.equal(
    apiValidationMessage("password", "must include uppercase"),
    "La contraseña debe incluir una letra mayúscula."
  );
});

test("account deletion confirmation reads in Spanish and explains the exact word", () => {
  assert.equal(
    nativeValidationMessage(input("confirmation", { valueMissing: true })),
    "La confirmación es obligatoria."
  );
  assert.equal(
    nativeValidationMessage(input("confirmation", { patternMismatch: true })),
    "Escribe ELIMINAR en mayúsculas para confirmar."
  );
});

test("a date after today explains the limit instead of showing an ISO date", () => {
  assert.equal(
    nativeValidationMessage(input("date", { rangeOverflow: true }, { type: "date", max: "2026-11-24" })),
    "La fecha no puede ser posterior a hoy."
  );
  assert.equal(
    nativeValidationMessage(input("durationMinutes", { rangeOverflow: true }, { type: "number", max: "300" })),
    "La duración no puede superar 300."
  );
});

test("numbers that cannot be parsed or have too many decimals say how to fix them", () => {
  assert.equal(
    nativeValidationMessage(input("maxDepthMeters", { badInput: true })),
    "Escribe la profundidad máxima solo con números; usa coma o punto para los decimales."
  );
  assert.equal(
    nativeValidationMessage(input("maxDepthMeters", { stepMismatch: true }, { step: "0.01" })),
    "La profundidad máxima admite hasta 2 decimales."
  );
  assert.equal(
    nativeValidationMessage(input("suitThicknessMm", { stepMismatch: true }, { step: "0.1" })),
    "El grosor del traje admite hasta 1 decimal."
  );
  assert.equal(
    nativeValidationMessage(input("durationMinutes", { stepMismatch: true }, { step: "1" })),
    "La duración debe ser un número entero."
  );
});

test("profile photo has a Spanish label", () => {
  assert.equal(apiValidationMessage("photo"), "Revisa la fotografía.");
});
