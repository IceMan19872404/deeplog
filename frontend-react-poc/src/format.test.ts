import { describe, expect, it } from "vitest";
import { formatDate, formatMinutes } from "./format";

describe("format helpers", () => {
  it("formats accumulated dive time", () => expect(formatMinutes(119)).toBe("1 h 59 min"));
  it("formats dates in Spanish", () => expect(formatDate("2026-08-06")).toContain("2026"));
});
