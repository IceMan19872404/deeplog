// Regenerates frontend/js/world-map-data.js: a compact SVG path of the world's
// land from Natural Earth (public domain) via the world-atlas package.
// Coordinates: x = (lon + 180) * K, y = (90 - lat) * K, integers, relative commands.
//
// Not needed for normal development (the generated file is committed). To rebuild:
//   cd /tmp && npm i world-atlas@2 topojson-client@3 topojson-simplify@3
//   NODE_PATH=/tmp/node_modules node ops/build-world-map.js land-50m 0.005 10 frontend/js/world-map-data.js
const fs = require("fs");
const topojson = require("topojson-client");
const simplify = require("topojson-simplify");

const [source = "land-50m", minWeight = "0.002", K = "10", out] = process.argv.slice(2);
let topo = JSON.parse(fs.readFileSync(require.resolve(`world-atlas/${source}.json`)));
topo = simplify.presimplify(topo, simplify.planarTriangleArea);
topo = simplify.simplify(topo, Number(minWeight));
const land = topojson.feature(topo, topo.objects.land);
const k = Number(K);

let d = "";
let rings = 0;
const geometries = land.features ? land.features.map((f) => f.geometry) : [land.geometry];
const polygons = geometries.flatMap((g) => (g.type === "MultiPolygon" ? g.coordinates : [g.coordinates]));
for (const polygon of polygons) {
  // Unwrap longitudes so rings crossing the antimeridian stay continuous
  // (otherwise they draw a band across the whole map), then also draw a
  // copy shifted one world-width to the left.
  const unwrapped = polygon.map((ring) => {
    let offset = 0;
    return ring.map(([lon, lat], i) => {
      if (i > 0) {
        const prev = ring[i - 1][0];
        if (lon - prev > 180) offset -= 360;
        else if (prev - lon > 180) offset += 360;
      }
      return [lon + offset, lat];
    });
  });
  const crosses = unwrapped.some((ring) => ring.some(([lon]) => lon > 180 || lon < -180));
  const copies = crosses ? [0, unwrapped.flat().some(([lon]) => lon > 180) ? -360 : 360] : [0];
  for (const shift of copies) for (const ring of unwrapped) {
    const pts = [];
    for (const [rawLon, lat] of ring) {
      const lon = rawLon + shift;
      const p = [Math.round((lon + 180) * k), Math.round((90 - lat) * k)];
      const last = pts[pts.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
    }
    if (pts.length < 3) continue;
    rings += 1;
    d += `M${pts[0][0]} ${pts[0][1]}`;
    let s = "l";
    for (let i = 1; i < pts.length; i += 1) {
      const dx = pts[i][0] - pts[i - 1][0];
      const dy = pts[i][1] - pts[i - 1][1];
      s += `${i > 1 && dx >= 0 ? " " : ""}${dx}${dy >= 0 ? " " : ""}${dy}`;
    }
    d += `${s}z`;
  }
}
console.error(`${source} weight=${minWeight} k=${k}: ${rings} rings, ${(d.length / 1024).toFixed(1)} KB`);
if (out) {
  fs.writeFileSync(out, `// Land masses from Natural Earth (public domain) via world-atlas ${source}.
// Equirectangular projection: x = (longitude + 180) * ${k}, y = (90 - latitude) * ${k}.
// Generated once; served by our own Nginx so no coordinates leave DeepLog.
export const WORLD_SCALE = ${k};
export const WORLD_LAND_PATH = "${d}";
`);
}
