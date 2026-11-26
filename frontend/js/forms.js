// Shared form behaviour (TD-011, TD-040): status messages, busy state, inline
// field errors linked through aria-describedby, validation on submit and when
// leaving a field, server errors mapped to fields, and the password eye.

import {
  apiValidationMessage,
  nativeValidationMessage
} from "./validation-messages.js?v=20261123-2";

export function setMessage(element, message, type = "error") {
  element.textContent = message;
  element.className = `message message-${type}`;
  element.hidden = !message;
}

// Text fields become read-only (not disabled) so their values stay in the
// form and keep focus; only the submit button is disabled.
export function setFormBusy(form, busy) {
  const button = form.querySelector("button[type='submit']");
  button.disabled = busy;
  button.classList.toggle("is-loading", busy);
  form.setAttribute("aria-busy", String(busy));
  [...form.elements].forEach((element) => {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.readOnly = busy;
    }
  });
}

export function isFormBusy(form) {
  return form.getAttribute("aria-busy") === "true";
}

// Non-empty entries only: an empty optional field is left out of the payload.
export function formDataToObject(form) {
  return Object.fromEntries(
    [...new FormData(form).entries()].filter(([, value]) => value !== "")
  );
}

// One polite live region reads an error that appears when the user leaves a
// field, a moment later so it does not talk over the next field. Errors shown
// on submit are read with the field that receives focus instead.
const announcement = { region: null, field: null, timer: 0 };

function fieldErrorId(input) {
  return `${input.form?.id || "form"}-${input.name}-error`;
}

// Errors and hints live inside the <label>, so they are aria-hidden there to
// keep them out of the field's name, and read as its description instead.
function linkDescription(input, id, linked) {
  const ids = (input.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter((value) => value && value !== id);
  if (linked) ids.push(id);
  if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
  else input.removeAttribute("aria-describedby");
}

export function clearFieldError(input) {
  input.setAttribute("aria-invalid", "false");
  const id = fieldErrorId(input);
  linkDescription(input, id, false);
  document.getElementById(id)?.remove();
  if (announcement.field === input) {
    clearTimeout(announcement.timer);
    announcement.region.textContent = "";
  }
}

export function clearFormErrors(container) {
  container.querySelectorAll("input, textarea, select").forEach(clearFieldError);
}

export function setFieldError(form, field, message) {
  const input = form.elements[field];
  if (!input || input.type === "hidden") return;

  clearFieldError(input);
  input.setAttribute("aria-invalid", "true");
  const error = document.createElement("span");
  error.className = "field-error";
  error.id = fieldErrorId(input);
  error.setAttribute("aria-hidden", "true");
  error.textContent = message;
  const fileButton = input.closest(".file-button");
  (fileButton || input.closest(".password-input") || input).insertAdjacentElement("afterend", error);
  linkDescription(input, error.id, true);
}

// Announce on a delay, through the region above.
function announceFieldError(input, message) {
  if (!announcement.region) {
    announcement.region = document.createElement("div");
    announcement.region.className = "visually-hidden";
    announcement.region.setAttribute("aria-live", "polite");
    document.body.append(announcement.region);
  }
  const label = input.labels?.[0]?.firstChild?.textContent.trim();
  clearTimeout(announcement.timer);
  announcement.region.textContent = "";
  announcement.field = input;
  announcement.timer = setTimeout(() => {
    announcement.region.textContent = label ? `${label}: ${message}` : message;
  }, 500);
}

// :user-invalid already paints the field red once the user leaves it; show
// the same message and state that a submit would, so colour is never alone.
function showErrorOnLeave(event) {
  const input = event.target;
  if (!input.form?.noValidate || !input.matches("input, select, textarea")) return;
  if (input.type === "hidden" || input.getAttribute("aria-invalid") === "true") return;
  if (!input.matches(":user-invalid")) return;
  const message = nativeValidationMessage(input);
  setFieldError(input.form, input.name, message);
  announceFieldError(input, message);
}

// Native constraint validation first, then the form's own rules, given as
// `extraErrors(form)` returning [field, message] pairs. Focuses the first
// invalid field and returns whether the form is valid.
export function validateForm(form, extraErrors = () => []) {
  clearFormErrors(form);
  let firstInvalid = null;

  [...form.elements].forEach((input) => {
    if (!(input instanceof HTMLInputElement ||
      input instanceof HTMLTextAreaElement ||
      input instanceof HTMLSelectElement)) {
      return;
    }
    if (input.type === "hidden" || input.checkValidity()) return;
    setFieldError(form, input.name, nativeValidationMessage(input));
    firstInvalid ||= input;
  });

  extraErrors(form).forEach(([field, message]) => {
    setFieldError(form, field, message);
    firstInvalid ||= form.elements[field];
  });

  firstInvalid?.focus();
  return !firstInvalid;
}

// Field errors returned by the API (error.details). Returns whether any of
// them could be shown next to a field.
export function showApiFieldErrors(form, details = []) {
  let firstInvalid = null;
  details.forEach(({ field, message }) => {
    if (!form.elements[field] || form.elements[field].type === "hidden") return;
    setFieldError(form, field, apiValidationMessage(field, message));
    firstInvalid ||= form.elements[field];
  });
  firstInvalid?.focus();
  return Boolean(firstInvalid);
}

// The eye button unmasks the field it controls. The field goes back to
// type="password" on submit, reset and auth tab changes, so password managers
// always see a password field and the next visit starts masked.
function setPasswordVisible(button, visible) {
  document.getElementById(button.getAttribute("aria-controls")).type = visible ? "text" : "password";
  button.setAttribute("aria-pressed", String(visible));
}

export function maskPasswords(container) {
  container.querySelectorAll(".password-toggle").forEach((button) => setPasswordVisible(button, false));
}

// Document-wide wiring, once at start-up.
export function installFormBehaviour(root = document) {
  root.querySelectorAll("input, select, textarea").forEach((field) => {
    field.setAttribute("aria-invalid", "false");
  });
  root.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      setPasswordVisible(button, button.getAttribute("aria-pressed") !== "true");
    });
  });
  // Capture on document runs before each form's own submit handler.
  root.addEventListener("submit", (event) => maskPasswords(event.target), true);
  root.addEventListener("reset", (event) => maskPasswords(event.target), true);
  root.addEventListener("input", (event) => {
    if (event.target.matches("input, textarea, select")) clearFieldError(event.target);
  });
  root.addEventListener("focusout", showErrorOnLeave);
}
