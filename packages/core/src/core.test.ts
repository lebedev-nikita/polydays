import { describe, expect, it } from "vite-plus/test";
import {
  completeTask,
  changeTimeZone,
  activeVersion,
  deadlineInstant,
  buildWidgetProjection,
  currentPolyday,
  defaultSlots,
  expandedTasks,
  localInstant,
  moveTask,
  polydayForInstant,
  polydaysOn,
  taskView,
  updateCalendar,
  validateSlots,
  type Calendar,
  type Series,
  type Task,
} from "./index.ts";

const calendar: Calendar = {
  id: "calendar",
  mode: "fixed",
  versions: [{ id: "initial", from: "2026-10-01", timeZone: "Asia/Tbilisi", slots: defaultSlots }],
  frozen: [],
};
const at = (date: string, time: string) => localInstant(date, time, "Asia/Tbilisi");
const task: Task = {
  id: "one",
  title: "Проверить результат",
  description: "",
  priority: 2,
  order: 1,
  scheduling: { kind: "polyday", date: "2026-10-22", slotId: "morning" },
  completed: false,
  completedAt: null,
  deleted: false,
  createdAt: at("2026-10-22", "06:00"),
  seriesId: null,
  occurrenceDate: null,
};

describe("polyday boundaries", () => {
  it("prepares overdue visibility without expiring gap deadlines early", () => {
    const timed: Task = {
      ...task,
      scheduling: { kind: "deadline", date: "2026-10-22", time: "12:15" },
    };
    const projection = buildWidgetProjection(
      [
        { kind: "calendar", data: calendar },
        { kind: "task", data: timed },
      ],
      at("2026-10-22", "12:00"),
    );
    const next = projection?.views.find((view) => view.id === "2026-10-22/afternoon");
    expect(next?.tasks[0]?.overdue).toBe(false);
    expect(next?.tasks[0]?.origin).toBe("2026-10-22 · Утренний");
    expect(next?.tasks[0]?.visibleFrom).toBe(at("2026-10-22", "12:15") + 1);
  });
  it("changes zones immediately without rewriting past deadlines or intervals", () => {
    const now = at("2026-10-22", "16:00");
    const morning = polydaysOn(calendar, "2026-10-22")[0];
    const changed = changeTimeZone(calendar, "Europe/Berlin", now);
    expect(activeVersion(changed, now).timeZone).toBe("Europe/Berlin");
    expect(polydaysOn(changed, "2026-10-22")[0]).toEqual(morning);
    expect(deadlineInstant(changed, "2026-10-22", "09:00")).toBe(at("2026-10-22", "09:00"));
    expect(deadlineInstant(changed, "2026-10-23", "15:00")).toBe(
      localInstant("2026-10-23", "15:00", "Europe/Berlin"),
    );
  });
  it("keeps the start-date identity after midnight", () => {
    const current = currentPolyday(calendar, at("2026-10-23", "01:00"));
    expect(current?.date).toBe("2026-10-22");
    expect(current?.slotId).toBe("night");
    expect(current?.end).toBe(at("2026-10-23", "02:00"));
  });
  it("places gap deadlines in the preceding day while showing the next day by default", () => {
    expect(polydayForInstant(calendar, at("2026-10-22", "12:15")).polyday?.slotId).toBe("morning");
    expect(polydayForInstant(calendar, at("2026-10-22", "12:15")).inSleepGap).toBe(true);
    expect(currentPolyday(calendar, at("2026-10-22", "12:15"))?.slotId).toBe("afternoon");
    expect(polydayForInstant(calendar, at("2026-10-22", "12:00")).inSleepGap).toBe(true);
  });
  it("rejects overlaps across midnight and zero-length intervals", () => {
    expect(() =>
      validateSlots([
        { id: "a", name: "A", start: "19:00", end: "02:00" },
        { id: "b", name: "B", start: "01:00", end: "06:00" },
      ]),
    ).toThrow("пересекается");
    expect(() => validateSlots([{ id: "a", name: "A", start: "00:00", end: "00:00" }])).toThrow(
      "совпадает",
    );
  });
  it("preserves ended intervals on timezone changes", () => {
    const before = polydaysOn(calendar, "2026-10-21");
    const changed = updateCalendar(
      calendar,
      { id: "travel", from: "2026-10-22", timeZone: "Europe/Berlin", slots: defaultSlots },
      at("2026-10-22", "16:00"),
    );
    expect(polydaysOn(changed, "2026-10-21")).toEqual(before);
    expect(polydaysOn(changed, "2026-10-23")[0]?.timeZone).toBe("Europe/Berlin");
  });
  it("uses the first valid local time through DST gaps and the first repeated occurrence", () => {
    expect(localInstant("2026-03-29", "02:30", "Europe/Berlin")).toBe(
      localInstant("2026-03-29", "03:00", "Europe/Berlin"),
    );
    expect(localInstant("2026-10-25", "02:30", "Europe/Berlin")).toBe(
      Number(TemporalInstant("2026-10-25T00:30:00Z")),
    );
  });
});

function TemporalInstant(value: string): number {
  return Date.parse(value);
}

describe("task semantics", () => {
  it("records late completion in the original day", () => {
    const completed = completeTask(task, true, calendar, at("2026-10-22", "20:00"));
    expect(taskView(completed, calendar, at("2026-10-22", "20:00")).polyday?.slotId).toBe(
      "morning",
    );
    expect(completed.completedAt).toBe(at("2026-10-22", "20:00"));
  });
  it("expires timed tasks after their deadline, and prevents polyday moves", () => {
    const timed: Task = {
      ...task,
      scheduling: { kind: "deadline", date: "2026-10-23", time: "01:00" },
    };
    expect(taskView(timed, calendar, at("2026-10-23", "00:59")).overdue).toBe(false);
    expect(taskView(timed, calendar, at("2026-10-23", "01:01")).overdue).toBe(true);
    expect(taskView(timed, calendar, at("2026-10-23", "01:01")).polyday?.date).toBe("2026-10-22");
    expect(() => moveTask(timed, "2026-10-24", "night")).toThrow("Измените");
  });
  it("puts a completed backlog task in the default current polyday even during sleep", () => {
    const backlog: Task = { ...task, scheduling: { kind: "backlog" } };
    const completed = completeTask(backlog, true, calendar, at("2026-10-22", "12:15"));
    expect(completed.scheduling).toEqual({
      kind: "polyday",
      date: "2026-10-22",
      slotId: "afternoon",
    });
  });
});

describe("recurring occurrences", () => {
  const series: Series = {
    id: "daily",
    deleted: false,
    createdAt: 1,
    rules: [
      {
        effectiveDate: "2026-10-19",
        title: "Читать",
        description: "",
        priority: 3,
        recurrence: { kind: "time", time: "01:00", weekdays: [1] },
        startDate: "2026-10-19",
        endDate: null,
      },
    ],
  };
  it("uses the deadline weekday, even when the polyday started on Sunday", () => {
    const all = expandedTasks([], [series], calendar, "2026-10-26");
    expect(all).toHaveLength(2);
    const first = all[0];
    expect(first).toBeDefined();
    if (first)
      expect(taskView(first, calendar, at("2026-10-22", "12:00")).polyday?.date).toBe("2026-10-18");
  });
  it("keeps every missed occurrence and only completes the selected one", () => {
    const daily: Series = {
      ...series,
      rules: [{ ...series.rules[0]!, recurrence: { kind: "every-polyday" } }],
    };
    const all = expandedTasks([], [daily], calendar, "2026-10-21");
    expect(all).toHaveLength(9);
    const selected = all[0]!;
    const completed = completeTask(selected, true, calendar, at("2026-10-22", "12:00"));
    const after = expandedTasks([completed], [daily], calendar, "2026-10-21");
    expect(after.filter((t) => t.completed)).toHaveLength(1);
    expect(new Set(after.map((t) => t.id)).size).toBe(9);
  });
});
