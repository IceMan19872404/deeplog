import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("every form uses POST as a safe fallback when JavaScript is unavailable", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const forms = [...html.matchAll(/<form\b[^>]*>/g)].map(([tag]) => tag);

  assert.ok(forms.length > 0);
  forms.forEach((form) => assert.match(form, /\bmethod="post"/));
});

test("the dive form gives an example for every data field", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const diveForm = html.match(/<form id="dive-form"[\s\S]*?<\/form>/)?.[0];

  assert.ok(diveForm);
  const fields = [...diveForm.matchAll(/<(input|textarea|select)\b[^>]*\bname="([^"]+)"[^>]*>/g)];
  const examples = [
    ...diveForm.matchAll(/placeholder="Ej\.:/g),
    ...diveForm.matchAll(/<option[^>]*>Ej\.:/g),
    ...diveForm.matchAll(/data-disappearing-example/g)
  ];

  assert.equal(fields.length, 18);
  assert.equal(examples.length, 18);
  assert.match(diveForm, /name="locationPrecision"[\s\S]*?<option value="approximate">Ej\.:/);
});
