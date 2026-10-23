import { describe, expect, it } from "vitest";
import { normalizeTimeInput } from "./time-input";

describe("schedule time entry", () => {
  it.each([
    ["7", "07:00"],
    ["07", "07:00"],
    ["730", "07:30"],
    ["0730", "07:30"],
    ["7:30", "07:30"],
    ["7.30", "07:30"],
    [" 23:59 ", "23:59"],
    ["0", "00:00"],
    ["000", "00:00"],
    ["0000", "00:00"],
    ["0015", "00:15"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeTimeInput(input)).toBe(expected);
  });

  it.each([
    "",
    " ",
    "24",
    "2400",
    "24:00",
    "7:60",
    "1260",
    "-1",
    "7:3",
    "7:",
    "12345",
    "noon",
    "7pm",
    "7:30:00",
  ])("rejects invalid or incomplete input %s without guessing or clamping", (input) => {
    expect(normalizeTimeInput(input)).toBeNull();
  });
});
