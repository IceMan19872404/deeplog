import test from "node:test";
import assert from "node:assert/strict";
import { localIsoDate } from "../js/dive-form.js";

// Node reads process.env.TZ again whenever it changes, and node:test runs
// every file in its own process, so this does not leak into other tests.
function withTimeZone(timeZone, run) {
  const previous = process.env.TZ;
  process.env.TZ = timeZone;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// 00:30 in Madrid on 24 November is still 23 November in UTC.
const madridHalfPastMidnight = Date.parse("2026-11-23T23:30:00Z");
// 00:30 in Madrid in summer (UTC+2).
const madridSummerHalfPastMidnight = Date.parse("2026-07-14T22:30:00Z");
// 22:30 in New York on 23 November is already 24 November in UTC.
const newYorkEvening = Date.parse("2026-11-24T03:30:00Z");

test("fallback without Temporal uses the local calendar date, not the UTC one", () => {
  withTimeZone("Europe/Madrid", () => {
    assert.equal(new Date(madridHalfPastMidnight).toISOString().slice(0, 10), "2026-11-23");
    assert.equal(localIsoDate(madridHalfPastMidnight, undefined), "2026-11-24");
    assert.equal(localIsoDate(madridSummerHalfPastMidnight, undefined), "2026-07-15");
  });
  withTimeZone("America/New_York", () => {
    assert.equal(localIsoDate(newYorkEvening, undefined), "2026-11-23");
  });
});

test("fallback pads single-digit months and days", () => {
  withTimeZone("Europe/Madrid", () => {
    assert.equal(localIsoDate(Date.parse("2026-01-04T23:30:00Z"), undefined), "2026-01-05");
  });
});

// Minimal stand-in for the Temporal calls localIsoDate makes, backed by Intl,
// so the Temporal path is exercised on Node versions without Temporal.
function fakeTemporal(timeZone) {
  const calls = [];
  return {
    calls,
    Now: { timeZoneId: () => timeZone },
    Instant: {
      fromEpochMilliseconds(ms) {
        calls.push(ms);
        return {
          toZonedDateTimeISO(zone) {
            return {
              toPlainDate() {
                return { toString: () => new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(ms) };
              }
            };
          }
        };
      }
    }
  };
}

test("with Temporal it converts the same clock reading in the user's time zone", () => {
  const temporal = fakeTemporal("Europe/Madrid");
  assert.equal(localIsoDate(madridHalfPastMidnight, temporal), "2026-11-24");
  assert.deepEqual(temporal.calls, [madridHalfPastMidnight]);
  assert.equal(localIsoDate(newYorkEvening, fakeTemporal("America/New_York")), "2026-11-23");
});

test("native Temporal, when this Node has it, agrees with the fallback", { skip: typeof globalThis.Temporal?.Now?.timeZoneId !== "function" }, () => {
  withTimeZone("Europe/Madrid", () => {
    assert.equal(localIsoDate(madridHalfPastMidnight), localIsoDate(madridHalfPastMidnight, undefined));
  });
});
