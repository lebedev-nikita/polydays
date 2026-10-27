// Run against a signed-in Android build, including the signed release APK:
// bun scripts/+test-android-timeline.ts SERIAL
// Opens plans/history and scrolls; does not edit account data.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const serial = process.argv[2];
assert(serial, "Pass the Android device serial explicitly.");
const adb = (...args: string[]) =>
  execFileSync("adb", ["-s", serial, ...args], { encoding: "utf8", timeout: 30000 });
const dump = () => {
  adb("shell", "uiautomator", "dump", "/sdcard/polydays-timeline-test.xml");
  return adb("shell", "cat", "/sdcard/polydays-timeline-test.xml");
};
const open = async (path: string, heading: string) => {
  adb("shell", "am", "force-stop", "app.polydays.mobile");
  adb(
    "shell",
    "am",
    "start",
    "-W",
    "-n",
    "app.polydays.mobile/.MainActivity",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `polydays://${path}`,
  );
  let xml = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    await setTimeout(500);
    xml = dump();
    if (/timeline-date-\d{4}-\d{2}-\d{2}|Пока нет завершённых полидней/.test(xml)) break;
  }
  assert(
    xml.includes(`text="${heading}"`),
    `Missing ${heading}; sign in and configure a schedule first.`,
  );
  assert(
    /timeline-date-\d{4}-\d{2}-\d{2}/.test(xml) ||
      (path === "history" && xml.includes("Пока нет завершённых полидней")),
    "The timeline or its empty history must render.",
  );
  return xml;
};
const dates = (xml: string) =>
  [...xml.matchAll(/timeline-date-(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]!).sort();

adb("logcat", "-c");
for (let attempt = 0; attempt < 3; attempt++) {
  const initial = await open("upcoming", "Предстоящие");
  if (attempt === 0) {
    const screen = initial.match(/bounds="\[0,0\]\[(\d+),(\d+)\]"/);
    assert(screen, "Missing screen bounds.");
    const x = String(Math.round(Number(screen[1]) / 2));
    const height = Number(screen[2]);
    for (let scroll = 0; scroll < 12; scroll++) {
      adb(
        "shell",
        "input",
        "swipe",
        x,
        String(Math.round(height * 0.78)),
        x,
        String(Math.round(height * 0.25)),
        "250",
      );
      await setTimeout(150);
    }
    const after = dump();
    assert(dates(after).at(-1)! > dates(initial).at(-1)!, "Scrolling must reveal later dates.");
  }
  await open("history", "История полидней");
}
const log = adb("logcat", "-d", "-s", "ReactNativeJS:E", "AndroidRuntime:E");
assert(!/FATAL EXCEPTION|JavascriptException|TypeError:|ReferenceError:/.test(log), log);
assert(adb("shell", "pidof", "app.polydays.mobile").trim(), "The app must remain running.");
console.info("PASS: plans, scrolling and history remain available in the Android runtime.");
