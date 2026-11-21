// Air consumption at the surface (SAC/RMV) from what a basic dive computer
// gives you. DeepLog has no depth samples, so the average depth comes from the
// same schematic profile drawn on Inicio (frontend/js/dive-profile.js):
// descent ~18 m/min, bottom phase rising slowly, ascent ~9 m/min and a 3-min
// stop at 5 m below 10 m. Every dive uses the same method, so the trend over
// time is comparable even though each value is an estimate.

const DESCENT_RATE = 18;
const ASCENT_RATE = 9;
const STOP_DEPTH = 5;
const STOP_MINUTES = 3;
// Metres of water per bar: sea water ~10 m, fresh water ~10.3 m.
const METRES_PER_BAR = { salt: 10, fresh: 10.3 };

function approximateProfile(maxDepth, duration) {
  const depth = Number(maxDepth);
  const minutes = Number(duration);
  if (!(depth > 0) || !(minutes > 0)) return [];
  const withStop = depth > 10;
  const descent = Math.max(1, depth / DESCENT_RATE);
  const ascentToStop = (depth - (withStop ? STOP_DEPTH : 0)) / ASCENT_RATE;
  const finalAscent = withStop ? STOP_DEPTH / ASCENT_RATE : 0;
  const stop = withStop ? STOP_MINUTES : 0;
  const fixed = descent + ascentToStop + stop + finalAscent;
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
  return points;
}

// Time-weighted mean depth of the schematic profile (trapezoids).
function approximateAverageDepth(maxDepth, duration) {
  const points = approximateProfile(maxDepth, duration);
  if (points.length < 2) return null;
  let area = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [t0, d0] = points[i - 1];
    const [t1, d1] = points[i];
    area += ((d0 + d1) / 2) * (t1 - t0);
  }
  return area / Number(duration);
}

const round1 = (value) => Math.round(value * 10) / 10;

// Returns null when the dive has no pressures. litersPerMinute needs the
// cylinder volume; barPerMinute is always available but depends on tank size.
function airConsumption({ startPressureBar, endPressureBar, durationMinutes, maxDepthMeters, cylinderVolumeLiters, waterType }) {
  if (startPressureBar == null || endPressureBar == null) return null;
  const used = Number(startPressureBar) - Number(endPressureBar);
  const minutes = Number(durationMinutes);
  const averageDepth = approximateAverageDepth(maxDepthMeters, minutes);
  if (!(used > 0) || !(minutes > 0) || averageDepth === null) return null;
  const ambient = averageDepth / (METRES_PER_BAR[waterType] || METRES_PER_BAR.salt) + 1;
  const barPerMinute = used / minutes / ambient;
  const volume = cylinderVolumeLiters == null ? null : Number(cylinderVolumeLiters);
  return {
    barPerMinute: round1(barPerMinute),
    litersPerMinute: volume ? round1(barPerMinute * volume) : null,
    averageDepthMeters: round1(averageDepth),
    approximate: true
  };
}

// Trend over the diver's history, in litres per minute (only dives with a
// cylinder volume: bar/min is not comparable between different tanks).
function airConsumptionTrend(dives) {
  const series = dives
    .map((dive) => ({ date: dive.date, name: dive.name, consumption: airConsumption(dive) }))
    .filter((item) => item.consumption && item.consumption.litersPerMinute !== null)
    .map((item) => ({ date: item.date, name: item.name, litersPerMinute: item.consumption.litersPerMinute }));
  const average = (items) => items.length
    ? round1(items.reduce((sum, item) => sum + item.litersPerMinute, 0) / items.length)
    : null;
  // Compare first and latest dives once there are enough to mean something.
  const window = series.length >= 6 ? 3 : series.length >= 4 ? 2 : 0;
  const first = window ? average(series.slice(0, window)) : null;
  const recent = window ? average(series.slice(-window)) : null;
  return {
    series,
    averageLitersPerMinute: average(series),
    latestLitersPerMinute: series.length ? series[series.length - 1].litersPerMinute : null,
    comparison: window ? {
      window,
      firstLitersPerMinute: first,
      recentLitersPerMinute: recent,
      changePercent: Math.round(((recent - first) / first) * 100)
    } : null,
    approximate: true
  };
}

module.exports = { approximateAverageDepth, airConsumption, airConsumptionTrend };
