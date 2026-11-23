// Helpers for the app's native modal <dialog>s: closing paths, light dismiss
// where `closedby` is missing, unsaved-changes and busy guards, and small
// confirmation dialogs. Cleanup after a dialog closes belongs in that
// dialog's own `close` listener (app.js), so every closing path runs it.

export function isOutsideRect(rect, x, y) {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}

// Close the way Esc does: fire a cancelable `cancel` first so the dialog's
// guards run. requestClose() does exactly that; older engines get the same
// sequence by hand.
export function requestDialogClose(dialog) {
  if (typeof dialog.requestClose === "function") {
    dialog.requestClose();
  } else if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) {
    dialog.close();
  }
}

// close() skips `cancel`, so busy or dirty guards do not block it: meant for
// session loss, where nothing in a dialog can be saved anyway.
export function closeAllDialogs(root = document) {
  for (const dialog of root.querySelectorAll("dialog[open]")) dialog.close();
}

// `closedby="any"` is not supported everywhere (Safari). Where it is missing,
// close on a press AND release outside the dialog box, so a text-selection
// drag that ends on the backdrop does not dismiss it.
export function installLightDismissFallback(
  dialogs,
  supported = "closedBy" in HTMLDialogElement.prototype
) {
  if (supported) return;
  for (const dialog of dialogs) {
    let pressedOutside = false;
    const outside = (event) => isOutsideRect(dialog.getBoundingClientRect(), event.clientX, event.clientY);
    dialog.addEventListener("pointerdown", (event) => { pressedOutside = outside(event); });
    dialog.addEventListener("pointerup", (event) => {
      if (pressedOutside && outside(event)) requestDialogClose(dialog);
      pressedOutside = false;
    });
  }
}

// Comparable string of a form's current values (FormData entries). Files are
// compared by name and size: an empty file input yields a new File (with a
// fresh lastModified) on every read.
export function formSnapshot(entries) {
  return JSON.stringify([...entries].map(([name, value]) =>
    [name, typeof value === "string" ? value : [value.name, value.size]]
  ));
}

// Remembers a form's values at a known clean point (after opening or saving)
// and reports whether they changed since, whatever changed them.
export function createUnsavedChanges(form) {
  const current = () => formSnapshot(new FormData(form));
  let clean = "";
  return {
    markClean() { clean = current(); },
    isDirty() { return current() !== clean; }
  };
}

// Guard Esc, the back gesture, light dismiss and requestClose(): keep the
// dialog open while a request is in flight and ask before discarding changes.
// Browsers only let `cancel` be prevented again after the user interacts with
// the page; when it is not cancelable the dialog closes as the user asked.
export function guardDialogClose(dialog, { isBusy = () => false, isDirty = () => false, confirmDiscard } = {}) {
  dialog.addEventListener("cancel", async (event) => {
    if (isBusy()) {
      event.preventDefault();
      return;
    }
    if (!confirmDiscard || !isDirty() || !event.cancelable) return;
    event.preventDefault();
    if (await confirmDiscard()) dialog.close();
  });
}

// Confirmation dialog whose buttons carry `value`: "confirm" resolves true;
// any other button, Esc or a forced close resolves false.
export function createConfirmDialog(dialog) {
  dialog.addEventListener("click", (event) => {
    const button = event.target.closest("button[value]");
    if (button) dialog.close(button.value);
  });
  return function confirm() {
    return new Promise((resolve) => {
      dialog.returnValue = "";
      dialog.addEventListener("close", () => {
        resolve(dialog.returnValue === "confirm");
        dialog.returnValue = "";
      }, { once: true });
      dialog.showModal();
    });
  };
}
