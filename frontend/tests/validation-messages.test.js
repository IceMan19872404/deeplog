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
