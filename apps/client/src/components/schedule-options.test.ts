import { describe, expect, it } from "vitest";
import {
  calendarDateLabel,
  calendarDays,
  shiftMonth,
  timeZoneChoices,
  timeZoneLabel,
  timeZoneOffset,
} from "./schedule-options";

describe("schedule date choices", () => {
  it("labels relative days across a year boundary and includes the year", () => {
    expect(calendarDateLabel("2026-12-31", "2026-12-31")).toBe("Сегодня, 31 декабря");
    expect(calendarDateLabel("2027-01-01", "2026-12-31")).toBe("Завтра, 1 января 2027 г.");
    expect(calendarDateLabel("2026-11-03", "2026-10-23")).toBe("3 ноября");
  });
  it("moves from December to January and back without overflowing the month", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2027-01", -1)).toBe("2026-12");
  });
  it("lays out complete Monday-first weeks including leap day", () => {
    const days = calendarDays("2028-02");
    expect(days[0]).toBe("2028-01-31");
    expect(days.at(-1)).toBe("2028-03-05");
    expect(days).toContain("2028-02-29");
    expect(days.length % 7).toBe(0);
    expect(calendarDays("2026-03")).toHaveLength(42);
  });
});

describe("timezone presentation", () => {
  const winter = Date.parse("2026-01-01T00:15:00Z");
  const summer = Date.parse("2026-07-01T12:00:00Z");
  it("formats city names and offsets including fractional and negative offsets", () => {
    expect(timeZoneLabel("Asia/Tbilisi", winter)).toBe("Тбилиси · UTC+4");
    expect(timeZoneOffset("Asia/Kathmandu", winter)).toBe("UTC+5:45");
    expect(timeZoneOffset("America/St_Johns", winter)).toBe("UTC−3:30");
    expect(timeZoneOffset("UTC", winter)).toBe("UTC");
  });
  it("uses the offset at the supplied instant, including daylight saving time", () => {
    expect(timeZoneOffset("Europe/Berlin", winter)).toBe("UTC+1");
    expect(timeZoneOffset("Europe/Berlin", summer)).toBe("UTC+2");
  });
  it("retains current aliases and local zones and excludes unsupported zones", () => {
    const choices = timeZoneChoices("US/Eastern", "Asia/Tbilisi");
    expect(choices).toContain("US/Eastern");
    expect(choices).toContain("Asia/Tbilisi");
    expect(choices).toContain("UTC");
    expect(new Set(choices).size).toBe(choices.length);
    expect(timeZoneChoices("not-a-zone", "Asia/Tbilisi")).not.toContain("not-a-zone");
  });
});
