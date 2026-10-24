// Run against an emulator with a signed-in Polydays workspace:
// bun scripts/+test-android-keyboard.ts emulator-5554
// Opens quick entry without saving a task; verifies real IME and UI bounds.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const serial = process.argv[2];
assert(serial, "Pass the emulator serial explicitly.");
const adb = (...args: string[]) =>
  execFileSync("adb", ["-s", serial, ...args], { encoding: "utf8", timeout: 10000 });
const dump = () => {
  adb("shell", "rm", "-f", "/sdcard/polydays-keyboard-test.xml");
  adb("shell", "uiautomator", "dump", "/sdcard/polydays-keyboard-test.xml");
  return adb("shell", "cat", "/sdcard/polydays-keyboard-test.xml");
};
const bounds = (xml: string, label: string) => {
  const node = [...xml.matchAll(/<node\b[^>]+>/g)].find((match) =>
    match[0].includes(`content-desc="${label}"`),
  )?.[0];
  const rect = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert(rect, `Missing control: ${label}`);
  return rect.slice(1).map(Number) as [number, number, number, number];
};
const tap = (rect: [number, number, number, number]) =>
  adb("shell", "input", "tap", String((rect[0] + rect[2]) / 2), String((rect[1] + rect[3]) / 2));
const keyboardTop = () => {
  const windows = adb("shell", "dumpsys", "window");
  const frame = windows.match(/type=ime frame=\[\d+,(\d+)\]\[\d+,\d+\][^\n]*visible=true/);
  assert(frame, "The software keyboard must be visible.");
  return Number(frame[1]);
};

adb("shell", "am", "start", "-n", "app.polydays.mobile/.MainActivity");
let xml = dump();
if (!xml.includes('content-desc="Название задачи"')) {
  tap(bounds(xml, "Добавить задачу"));
  await setTimeout(500);
  xml = dump();
}
for (let attempt = 0; attempt < 2; attempt++) {
  tap(bounds(xml, "Название задачи"));
  await setTimeout(500);
  const top = keyboardTop();
  xml = dump();
  for (const label of ["Название задачи", "Описание · необязательно", "Добавить задачу"]) {
    const rect = bounds(xml, label);
    assert(rect[3] > rect[1], `${label} must have visible height.`);
    assert(
      rect[1] >= 0 && rect[3] <= top,
      `${label} ends at ${rect[3]}, keyboard starts at ${top}.`,
    );
  }
  console.info(
    `PASS: title, description and submit are above the keyboard (cycle ${attempt + 1}).`,
  );
  adb("shell", "input", "keyevent", "KEYCODE_BACK");
  await setTimeout(300);
  xml = dump();
}
tap(bounds(xml, "Закрыть"));
