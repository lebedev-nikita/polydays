import { afterEach, describe, expect, it } from "vite-plus/test";
import type { BoxDB } from "@boxdb/client";
import { defaultSlots, type Calendar, type Document, type Task } from "@polydays/core";
import { exchangeDatabase, openDatabase } from "./database.ts";

const clients: BoxDB[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((db) => db.close()));
});
const calendar: Calendar = {
  id: "calendar",
  mode: "fixed",
  versions: [{ id: "v1", from: "2026-10-01", timeZone: "Asia/Tbilisi", slots: defaultSlots }],
  frozen: [],
};
const task: Task = {
  id: "one",
  title: "Задача",
  description: "",
  priority: 4,
  order: 1,
  scheduling: { kind: "backlog" },
  completed: false,
  completedAt: null,
  deleted: false,
  createdAt: 1,
  seriesId: null,
  occurrenceDate: null,
};
const document: Document = { kind: "task", data: task };
async function setup() {
  const db = await openDatabase(":memory:");
  clients.push(db);
  await exchangeDatabase(db, "owner", {
    operations: [
      { id: "calendar", entity: { kind: "calendar", data: calendar }, base: null, at: 1 },
      { id: "create", entity: document, base: null, at: 1 },
    ],
    cursor: 0,
  });
  return db;
}

describe("BoxDB sync transaction", () => {
  it("deduplicates retries after a lost acknowledgement", async () => {
    const db = await setup();
    const request = {
      operations: [
        {
          id: "retry",
          entity: { kind: "task" as const, data: { ...task, title: "Один раз" } },
          base: document,
          at: 2,
        },
      ],
      cursor: 2,
    };
    const first = await exchangeDatabase(db, "owner", request);
    const retried = await exchangeDatabase(db, "owner", request);
    expect({ ...retried, widget: null }).toEqual({ ...first, widget: null });
    const count = await db.query`SELECT COUNT(*) AS count FROM polydays_changes`.get();
    expect(count).toEqual({ count: 3n });
  });
  it("isolates accounts and persists same-field conflicts", async () => {
    const db = await setup();
    expect(
      (await exchangeDatabase(db, "other", { operations: [], cursor: 0 })).changes,
    ).toHaveLength(0);
    await exchangeDatabase(db, "owner", {
      operations: [
        {
          id: "mac",
          entity: { kind: "task", data: { ...task, title: "Mac" } },
          base: document,
          at: 2,
        },
      ],
      cursor: 2,
    });
    const request = {
      operations: [
        {
          id: "phone",
          entity: { kind: "task" as const, data: { ...task, title: "Телефон" } },
          base: document,
          at: 3,
        },
      ],
      cursor: 2,
    };
    const first = await exchangeDatabase(db, "owner", request);
    expect(first.conflicts[0]?.fields).toEqual(["title"]);
    expect((await exchangeDatabase(db, "owner", request)).conflicts).toEqual(first.conflicts);
  });
  it("stores schedule times as native BoxDB TIME", async () => {
    const db = await setup();
    const result =
      await db.query`SELECT starts_at, ends_at FROM polydays_schedule_slots WHERE slot_id = ${"night"}`.get();
    expect(result).toEqual({ starts_at: "19:00:00.000000", ends_at: "02:00:00.000000" });
  });
});
