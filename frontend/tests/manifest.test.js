import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

test("the manifest has a stable id and PNG icons, one of them maskable", async () => {
  const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.id, "/");
  const sizes = manifest.icons.filter((icon) => icon.type === "image/png").map((icon) => icon.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  assert.ok(manifest.icons.some((icon) => icon.purpose === "maskable"));
  assert.ok(!manifest.icons.some((icon) => /any maskable|maskable any/.test(icon.purpose)), "one artwork cannot serve both purposes");
  for (const icon of manifest.icons) await access(new URL(`..${icon.src}`, import.meta.url));
});
