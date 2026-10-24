import { describe, expect, it } from "vite-plus/test";
import { parseTaskTitle } from "./tasks.ts";

describe("task title priority shortcuts", () => {
  it.each([1, 2, 3, 4])("extracts P%i and removes its command", (priority) => {
    expect(parseTaskTitle(`Разметить анкету 7 (Штиль) !!${priority}`)).toEqual({
      title: "Разметить анкету 7 (Штиль)",
      priority,
    });
  });

  it("handles pasted commands at the start or in the middle and uses the last priority", () => {
    expect(parseTaskTitle("!!1 Подготовить !!2 план !!4")).toEqual({
      title: "Подготовить план",
      priority: 4,
    });
    expect(parseTaskTitle("!!3")).toEqual({ title: "", priority: 3 });
  });

  it.each(["План !!", "План !!0", "План !!5", "План !!10", "План!!3", "План !!3abc", "План !!!3"])(
    "preserves incomplete or literal text: %s",
    (title) => expect(parseTaskTitle(title)).toEqual({ title, priority: null }),
  );
});
