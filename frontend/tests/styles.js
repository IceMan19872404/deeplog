import { readFile, readdir } from "node:fs/promises";

// All stylesheets concatenated in load order, for tests that inspect the CSS.
export async function readAllStyles() {
  const dir = new URL("../styles/", import.meta.url);
  const files = (await readdir(dir)).filter((name) => name.endsWith(".css")).sort();
  const parts = await Promise.all(files.map((name) => readFile(new URL(name, dir), "utf8")));
  return parts.join("\n");
}
