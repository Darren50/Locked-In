import { describe, it, expect } from "vitest";
import { isOverdue } from "./tasks";

const now = new Date("2026-06-27T12:00:00");

describe("isOverdue", () => {
  it("is true when the due date has passed", () => {
    expect(isOverdue({ dueDate: "2026-06-26", dueTime: "10:00" }, now)).toBe(
      true,
    );
  });
  it("is false for a future task", () => {
    expect(isOverdue({ dueDate: "2026-06-28", dueTime: "10:00" }, now)).toBe(
      false,
    );
  });
  it("is false when the task is done", () => {
    expect(isOverdue({ dueDate: "2026-06-01", done: true }, now)).toBe(false);
  });
  it("is false when there is no due date", () => {
    expect(isOverdue({}, now)).toBe(false);
  });
});
