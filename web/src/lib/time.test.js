import { describe, it, expect } from "vitest";
import { formatShort, endTime } from "./time";

describe("formatShort", () => {
  it("shows seconds for a sub-minute value", () => {
    expect(formatShort(0.1)).toBe("6s");
  });
  it("shows 0m for an empty day", () => {
    expect(formatShort(0)).toBe("0m");
  });
  it("rolls 60 minutes up to 1h", () => {
    expect(formatShort(60)).toBe("1h");
  });
  it("keeps minutes and seconds together", () => {
    expect(formatShort(1.5)).toBe("1m 30s");
  });
  it("combines hours and minutes", () => {
    expect(formatShort(90)).toBe("1h 30m");
  });
});

describe("endTime", () => {
  it("adds the duration to the start time", () => {
    const end = endTime("2026-06-27T10:00:00", 90);
    expect(end.getHours()).toBe(11);
    expect(end.getMinutes()).toBe(30);
  });
});
