import test from "node:test";
import assert from "node:assert/strict";
import { approximateProfile, profileSvg } from "../js/dive-profile.js";

test("the profile starts and ends at the surface and reaches the maximum depth", () => {
  const points = approximateProfile(24.6, 58);
  assert.deepEqual(points[0], [0, 0]);
  assert.deepEqual(points.at(-1), [58, 0]);
  assert.equal(Math.max(...points.map(([, depth]) => depth)), 24.6);
  for (let i = 1; i < points.length; i += 1) assert.ok(points[i][0] >= points[i - 1][0], "time never goes back");
});

test("dives deeper than 10 m include a safety stop at 5 m; shallow ones do not", () => {
  const stopAt5 = (points) => points.filter(([, depth]) => depth === 5).length === 2;
  assert.equal(stopAt5(approximateProfile(18, 45)), true);
  assert.equal(stopAt5(approximateProfile(8, 30)), false);
});

test("short dives still fit their duration", () => {
  const points = approximateProfile(30, 12);
  assert.equal(points.at(-1)[0], 12);
  assert.ok(points.every(([time]) => time <= 12));
});

test("the chart says it is approximate and handles missing data", () => {
  assert.match(profileSvg(24.6, 58), /aria-label="Perfil aproximado: descenso hasta 24,6 m y parada de seguridad a 5 m en 58 minutos\."/);
  assert.equal(profileSvg(null, 40), "");
  assert.equal(profileSvg(20, 0), "");
});
