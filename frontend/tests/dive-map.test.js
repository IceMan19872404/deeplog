import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { clusterPoints, fitView, project } from "../js/dive-map.js";

const medas = project({ latitude: 42.0472, longitude: 3.2241 });
const cadaques = project({ latitude: 42.3191, longitude: 3.3187 });
const bali = project({ latitude: -8.2742, longitude: 115.593 });
const mexico = project({ latitude: 20.3548, longitude: -87.0286 });

const inside = (p, v) => p.x >= v.x && p.x <= v.x + v.width && p.y >= v.y && p.y <= v.y + v.height;

test("the view keeps every dive visible on wide and narrow screens", () => {
  for (const aspect of [3.2, 1]) {
    const view = fitView([medas, bali, mexico], aspect);
    for (const point of [medas, bali, mexico]) assert.ok(inside(point, view), `aspect ${aspect}`);
    assert.ok(Math.abs(view.width / view.height - aspect) < 1e-9);
  }
});

test("a single coast is shown at regional zoom, never street level", () => {
  const view = fitView([medas, cadaques], 2);
  assert.ok(view.width >= 60, "at least ~6 degrees wide");
  assert.ok(view.width < 200, "but zoomed in on the region");
});

test("nearby dives are grouped and distant ones stay separate", () => {
  const world = fitView([medas, cadaques, bali, mexico], 3);
  const clusters = clusterPoints([medas, cadaques, bali, mexico], world, 1000);
  assert.deepEqual(clusters.map((c) => c.points.length).sort(), [1, 1, 2]);
});

test("the map ships its own land data instead of calling a tile provider", async () => {
  const source = await readFile(new URL("../js/dive-map.js", import.meta.url), "utf8");
  // The only URL allowed is the SVG namespace identifier, which is never fetched.
  assert.doesNotMatch(source.replaceAll("http://www.w3.org/2000/svg", ""), /https?:\/\//);
  const data = await readFile(new URL("../js/world-map-data.js", import.meta.url), "utf8");
  assert.match(data, /Natural Earth/);
});
