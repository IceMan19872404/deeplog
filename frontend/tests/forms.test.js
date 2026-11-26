import test from "node:test";
import assert from "node:assert/strict";

// Minimal DOM stand-ins: enough for validateForm and the field errors.
class FakeElement {
  constructor() { this.attributes = new Map(); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }
}
globalThis.HTMLInputElement = class extends FakeElement {};
globalThis.HTMLTextAreaElement = class extends FakeElement {};
globalThis.HTMLSelectElement = class extends FakeElement {};
const byId = new Map();
globalThis.document = {
  getElementById: (id) => byId.get(id) || null,
  createElement: () => {
    const element = new FakeElement();
    element.remove = () => byId.delete(element.id);
    return element;
  }
};

const { validateForm, setMessage, isFormBusy } = await import("../js/forms.js");

function input(name, { valid = true, type = "text" } = {}) {
  const field = new HTMLInputElement();
  Object.assign(field, {
    name, type, focused: false,
    checkValidity: () => valid,
    validity: { valueMissing: !valid },
    focus() { this.focused = true; },
    closest: () => null,
    insertAdjacentElement(_position, element) { byId.set(element.id, element); }
  });
  return field;
}

function form(fields) {
  const elements = Object.assign([...fields], Object.fromEntries(fields.map((field) => [field.name, field])));
  const result = { id: "test-form", elements, querySelectorAll: () => fields };
  fields.forEach((field) => { field.form = result; });
  return result;
}

test("native errors come first, then the form's own rules; the first one gets focus", () => {
  const name = input("name", { valid: false });
  const buddies = input("buddiesText");
  const photos = input("photos");
  const target = form([name, buddies, photos]);
  const valid = validateForm(target, () => [["buddiesText", "Demasiados"], ["photos", "Formato"]]);
  assert.equal(valid, false);
  assert.ok(name.focused && !buddies.focused);
  assert.equal(buddies.getAttribute("aria-invalid"), "true");
  assert.equal(byId.get("test-form-buddiesText-error").textContent, "Demasiados");
  assert.equal(buddies.getAttribute("aria-describedby"), "test-form-buddiesText-error");
  assert.equal(photos.getAttribute("aria-invalid"), "true");
});

test("a valid form clears earlier errors and focuses nothing", () => {
  const buddies = input("buddiesText");
  const target = form([buddies, input("token", { type: "hidden", valid: false })]);
  assert.equal(validateForm(target, () => [["buddiesText", "x"]]), false);
  assert.ok(buddies.focused);
  buddies.focused = false;
  assert.equal(validateForm(target), true);
  assert.equal(buddies.getAttribute("aria-invalid"), "false");
  assert.equal(buddies.getAttribute("aria-describedby"), null);
  assert.equal(byId.has("test-form-buddiesText-error"), false);
  assert.equal(buddies.focused, false);
});

test("messages show their type and hide when empty; busy reads aria-busy", () => {
  const element = {};
  setMessage(element, "Guardado", "success");
  assert.deepEqual(element, { textContent: "Guardado", className: "message message-success", hidden: false });
  setMessage(element, "");
  assert.deepEqual(element, { textContent: "", className: "message message-error", hidden: true });
  const target = new FakeElement();
  assert.equal(isFormBusy(target), false);
  target.setAttribute("aria-busy", "true");
  assert.equal(isFormBusy(target), true);
});
