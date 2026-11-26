// Approximate dive profile for the Inicio card. DeepLog only records maximum
// depth and duration (no dive-computer samples), so the curve is a schematic
// built from common practice and is always labelled as approximate:
// descent at ~18 m/min, a bottom phase that slowly rises, ascent at ~9 m/min
// and, below 10 m, a 3-minute safety stop at 5 m.

import { formatNumber } from "./format.js?v=20261123-2";

const DESCENT_RATE = 18;
const ASCENT_RATE = 9;
const STOP_DEPTH = 5;
const STOP_MINUTES = 3;

export function approximateProfile(maxDepth, duration) {
  const depth = Number(maxDepth);
  const minutes = Number(duration);
  if (!(depth > 0) || !(minutes > 0)) return [];

  const withStop = depth > 10;
  const descent = Math.max(1, depth / DESCENT_RATE);
  const ascentToStop = (depth - (withStop ? STOP_DEPTH : 0)) / ASCENT_RATE;
  const finalAscent = withStop ? STOP_DEPTH / ASCENT_RATE : 0;
  const stop = withStop ? STOP_MINUTES : 0;
  const fixed = descent + ascentToStop + stop + finalAscent;
  // Short dives: compress every phase so the profile still ends at `minutes`.
  const scale = fixed > minutes * 0.85 ? (minutes * 0.85) / fixed : 1;
  const bottom = minutes - fixed * scale;

  const points = [[0, 0], [descent * scale, depth]];
  let t = descent * scale;
  points.push([t + bottom * 0.35, depth * 0.93]);
  t += bottom;
  points.push([t, depth * 0.72]);
  if (withStop) {
    t += ascentToStop * scale * 0.72;
    points.push([t, STOP_DEPTH]);
    t += stop * scale;
    points.push([t, STOP_DEPTH]);
  }
  points.push([minutes, 0]);
  return points.map(([time, d]) => [Math.round(time * 100) / 100, Math.round(d * 100) / 100]);
}

export function profileSvg(maxDepth, duration, { width = 520, height = 120 } = {}) {
  const points = approximateProfile(maxDepth, duration);
  if (!points.length) return "";
  const depth = Number(maxDepth);
  const minutes = Number(duration);
  const pad = 6;
  const x = (t) => (pad + (t / minutes) * (width - pad * 2)).toFixed(1);
  const y = (d) => (pad + (d / depth) * (height - pad * 2)).toFixed(1);
  const line = points.map(([t, d], i) => `${i ? "L" : "M"}${x(t)} ${y(d)}`).join(" ");
  const deepest = points[1];
  const stopIndex = points.findIndex(([, d], i) => i > 1 && d === STOP_DEPTH);
  const stop = stopIndex > 0 ? points[stopIndex] : null;
  const stopEnd = stop ? points[stopIndex + 1][0] : 0;
  const label = `Perfil aproximado: descenso hasta ${formatNumber(maxDepth)} m` +
    (stop ? " y parada de seguridad a 5 m" : "") + ` en ${minutes} minutos.`;
  return `<svg class="dive-profile" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
    <path class="dive-profile-area" d="${line} L${x(minutes)} ${pad} L${x(0)} ${pad} Z"/>
    <path class="dive-profile-line" d="${line}" pathLength="1"/>
    ${stop ? `<rect class="dive-profile-stop" x="${x(stop[0])}" y="${(Number(y(STOP_DEPTH)) - 7).toFixed(1)}" width="${(Number(x(stopEnd)) - Number(x(stop[0]))).toFixed(1)}" height="14" rx="4"/>` : ""}
    <circle class="dive-profile-max" cx="${x(deepest[0])}" cy="${y(deepest[1])}" r="4.5"/>
  </svg>`;
}
