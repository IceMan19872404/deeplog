import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the offline shell caches the exact versions the page loads", async () => {
  const [worker, html, app] = await Promise.all([
    read("../service-worker.js"),
    read("../index.html"),
    read("../js/app.js")
  ]);

  assert.match(worker, /const CACHE = "deeplog-shell-v\d+"/);

  // Entry points referenced by index.html must be cached with the same version.
  const entryPoints = [...html.matchAll(/(?:href|src)="(\/(?:styles\/[\w-]+\.css|js\/[\w-]+\.js)\?v=[\w-]+)"/g)]
    .map((match) => match[1]);
  assert.ok(entryPoints.length >= 2, "index.html should load versioned CSS and JS");

  // Local modules imported by app.js must be cached with the same version too.
  const modules = [...app.matchAll(/from "\.\/([\w-]+\.js\?v=[\w-]+)"/g)]
    .map((match) => `/js/${match[1]}`);

  for (const url of [...entryPoints, ...modules]) {
    assert.ok(worker.includes(`"${url}"`), `service worker does not cache ${url}`);
  }
});

test("every stylesheet in styles/ is linked once, in file-name order", async () => {
  const html = await read("../index.html");
  const files = (await readdir(new URL("../styles/", import.meta.url)))
    .filter((name) => name.endsWith(".css"))
    .sort();
  const linked = [...html.matchAll(/href="\/styles\/([\w-]+\.css)\?v=[\w-]+"/g)].map((match) => match[1]);
  assert.deepEqual(linked, files);
});
