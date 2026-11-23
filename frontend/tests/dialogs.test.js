import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  closeAllDialogs,
  formSnapshot,
  guardDialogClose,
  installLightDismissFallback,
  isOutsideRect,
  requestDialogClose
} from "../js/dialogs.js";

// Minimal stand-in for HTMLDialogElement: events plus open/close.
function fakeDialog({ requestClose = false, rect = { left: 100, right: 300, top: 100, bottom: 400 } } = {}) {
  const dialog = new EventTarget();
  dialog.open = true;
  dialog.closed = 0;
  dialog.close = () => { dialog.open = false; dialog.closed += 1; };
  dialog.getBoundingClientRect = () => rect;
  if (requestClose) {
    dialog.requestClose = () => {
      if (dialog.dispatchEvent(new Event("cancel", { cancelable: true }))) dialog.close();
    };
  }
  return dialog;
}

const pointer = (type, clientX, clientY) => Object.assign(new Event(type), { clientX, clientY });
const tick = () => new Promise((resolve) => setTimeout(resolve));

test("points on the dialog edge count as inside", () => {
  const rect = { left: 10, right: 20, top: 10, bottom: 20 };
  assert.equal(isOutsideRect(rect, 10, 20), false);
  assert.equal(isOutsideRect(rect, 15, 15), false);
  assert.equal(isOutsideRect(rect, 9, 15), true);
  assert.equal(isOutsideRect(rect, 15, 21), true);
});

test("requestDialogClose runs the cancel guards with or without requestClose()", () => {
  for (const requestClose of [true, false]) {
    const blocked = fakeDialog({ requestClose });
    blocked.addEventListener("cancel", (event) => event.preventDefault());
    requestDialogClose(blocked);
    assert.equal(blocked.open, true, `blocked, requestClose=${requestClose}`);

    const free = fakeDialog({ requestClose });
    requestDialogClose(free);
    assert.equal(free.open, false, `free, requestClose=${requestClose}`);
  }
});

test("light dismiss fallback needs both press and release outside", () => {
  const dialog = fakeDialog();
  installLightDismissFallback([dialog], false);

  // Text selection: press inside a field, release on the backdrop.
  dialog.dispatchEvent(pointer("pointerdown", 200, 200));
  dialog.dispatchEvent(pointer("pointerup", 20, 200));
  assert.equal(dialog.open, true);

  // Press on the backdrop, release inside.
  dialog.dispatchEvent(pointer("pointerdown", 20, 200));
  dialog.dispatchEvent(pointer("pointerup", 200, 200));
  assert.equal(dialog.open, true);

  // A real tap on the backdrop.
  dialog.dispatchEvent(pointer("pointerdown", 20, 20));
  dialog.dispatchEvent(pointer("pointerup", 22, 22));
  assert.equal(dialog.open, false);
});

test("light dismiss fallback is not installed where closedby works", () => {
  const dialog = fakeDialog();
  installLightDismissFallback([dialog], true);
  dialog.dispatchEvent(pointer("pointerdown", 20, 20));
  dialog.dispatchEvent(pointer("pointerup", 20, 20));
  assert.equal(dialog.open, true);
});

test("light dismiss fallback still honours the busy guard", () => {
  const dialog = fakeDialog();
  guardDialogClose(dialog, { isBusy: () => true });
  installLightDismissFallback([dialog], false);
  dialog.dispatchEvent(pointer("pointerdown", 20, 20));
  dialog.dispatchEvent(pointer("pointerup", 20, 20));
  assert.equal(dialog.open, true);
});

test("a busy dialog ignores close requests", () => {
  const dialog = fakeDialog({ requestClose: true });
  let busy = true;
  guardDialogClose(dialog, { isBusy: () => busy });
  dialog.requestClose();
  assert.equal(dialog.open, true);
  busy = false;
  dialog.requestClose();
  assert.equal(dialog.open, false);
});

test("an untouched form closes at once; a dirty one asks first", async () => {
  let dirty = false;
  let answer = false;
  let asked = 0;
  const dialog = fakeDialog({ requestClose: true });
  guardDialogClose(dialog, {
    isDirty: () => dirty,
    confirmDiscard: async () => { asked += 1; return answer; }
  });

  dialog.requestClose();
  assert.equal(dialog.open, false);
  assert.equal(asked, 0);

  dialog.open = true;
  dirty = true;
  dialog.requestClose();
  await tick();
  assert.equal(asked, 1);
  assert.equal(dialog.open, true, "keep editing");

  answer = true;
  dialog.requestClose();
  await tick();
  assert.equal(asked, 2);
  assert.equal(dialog.open, false, "discard");
});

test("a close request the browser will not let us cancel is not fought", async () => {
  let asked = 0;
  const dialog = fakeDialog();
  guardDialogClose(dialog, { isDirty: () => true, confirmDiscard: async () => { asked += 1; return false; } });
  const event = new Event("cancel", { cancelable: false });
  dialog.dispatchEvent(event);
  await tick();
  assert.equal(asked, 0);
  assert.equal(event.defaultPrevented, false);
});

test("closeAllDialogs closes every open dialog, guards or not", () => {
  const dialogs = [fakeDialog(), fakeDialog()];
  guardDialogClose(dialogs[0], { isBusy: () => true });
  closeAllDialogs({ querySelectorAll: (selector) => (selector === "dialog[open]" ? dialogs : []) });
  assert.deepEqual(dialogs.map((dialog) => dialog.open), [false, false]);
});

test("form snapshots notice edits and ignore empty file inputs", () => {
  const read = (values) => {
    const data = new FormData();
    for (const [name, value] of values) data.append(name, value);
    // An empty <input type=file> appears as a fresh empty File every time.
    data.append("photos", new File([], "", { lastModified: Math.random() }));
    return formSnapshot(data);
  };
  const clean = read([["name", "Medas"], ["date", ""]]);
  assert.equal(read([["name", "Medas"], ["date", ""]]), clean);
  assert.notEqual(read([["name", "Medas II"], ["date", ""]]), clean);

  const withFile = new FormData();
  withFile.append("photos", new File(["x"], "pez.jpg"));
  assert.notEqual(formSnapshot(withFile), formSnapshot(new FormData()));
});

test("every dialog has an accessible name and only low-stakes ones light-dismiss", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const dialogs = [...html.matchAll(/<dialog\b[^>]*>/g)].map(([tag]) => tag);
  assert.ok(dialogs.length >= 8);
  for (const tag of dialogs) {
    const id = tag.match(/\bid="([^"]+)"/)[1];
    const labelledBy = tag.match(/\baria-labelledby="([^"]+)"/)?.[1];
    assert.ok(labelledBy, `${id} has no aria-labelledby`);
    assert.match(html, new RegExp(`\\bid="${labelledBy}"`), `${id} points at a missing id`);
  }
  const lightDismiss = dialogs.filter((tag) => /\bclosedby="any"/.test(tag)).map((tag) => tag.match(/\bid="([^"]+)"/)[1]);
  assert.deepEqual(lightDismiss.sort(), ["delete-dialog", "dive-detail-dialog", "share-dialog"]);
});

test("every aria-labelledby in the page points at an existing id", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, refs] of html.matchAll(/\baria-(?:labelledby|describedby)="([^"]+)"/g)) {
    for (const ref of refs.split(/\s+/)) assert.ok(ids.has(ref), `missing id "${ref}"`);
  }
});

test("modals contain scroll without locking the page", async () => {
  const css = await readFile(new URL("../styles/10-dialogs.css", import.meta.url), "utf8");
  assert.match(css, /\.app-dialog:modal\s*\{[^}]*overscroll-behavior:\s*contain/);
  assert.match(css, /\.app-dialog::backdrop\s*\{[^}]*overflow:\s*hidden;[^}]*overscroll-behavior:\s*contain/);
  assert.match(css, /max-height:[^;]*100vh[^;]*;\s*max-height:[^;]*100dvh/);
});
