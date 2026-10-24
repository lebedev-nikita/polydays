import { afterEach, expect, it } from "vite-plus/test";
import { defaultSlots, expandedTasks } from "@polydays/core";
import type { BoxDB } from "@boxdb/client";
import { commandDatabase, exchangeDatabase, openDatabase, snapshotDatabase } from "./database.ts";
import { createAppMcp, taskRevision } from "./mcp.ts";

const clients: BoxDB[] = [];
afterEach(async () => {
  await Promise.all(clients.splice(0).map((db) => db.close()));
});
async function setup() {
  const db = await openDatabase(":memory:");
  clients.push(db);
  await commandDatabase(db, "owner", {
    kind: "set_schedule",
    requestId: "schedule",
    revision: 0,
    effectiveDate: "2026-10-01",
    timeZone: "Asia/Tbilisi",
    slots: defaultSlots,
  });
  return db;
}

it("persists MCP commands in sync, deduplicates retries and rejects stale revisions atomically", async () => {
  const db = await setup();
  const create = {
    kind: "create_task" as const,
    requestId: "create",
    title: "MCP task",
    description: "",
    priority: 4 as const,
    scheduling: { kind: "backlog" as const },
  };
  const first = await commandDatabase(db, "owner", create);
  expect(await commandDatabase(db, "owner", create)).toEqual(first);
  await expect(commandDatabase(db, "owner", { ...create, title: "Different" })).rejects.toThrow(
    "requestId",
  );
  const row = (await snapshotDatabase(db, "owner")).find((row) => row.document.kind === "task")!;
  const update = {
    kind: "update_task" as const,
    requestId: "update",
    id: row.document.data.id,
    revision: row.revision,
    title: "Changed",
  };
  await commandDatabase(db, "owner", update);
  await expect(
    commandDatabase(db, "owner", { ...update, requestId: "stale", title: "Lost update" }),
  ).rejects.toThrow("устарела");
  expect(await snapshotDatabase(db, "other")).toEqual([]);
  const synced = await exchangeDatabase(db, "owner", { operations: [], cursor: 0 });
  expect(synced.changes).toHaveLength(3);
  expect(synced.changes.at(-1)?.document).toMatchObject({
    kind: "task",
    data: { title: "Changed" },
  });
});

it("materialises exactly one recurring occurrence using the parent series revision", async () => {
  const db = await setup();
  await commandDatabase(db, "owner", {
    kind: "create_series",
    requestId: "series",
    title: "Daily",
    description: "",
    priority: 4,
    startDate: "2026-10-24",
    endDate: null,
    recurrence: { kind: "every-polyday" },
  });
  const records = await snapshotDatabase(db, "owner");
  const calendar = records.find((row) => row.document.kind === "calendar")!.document;
  const series = records.find((row) => row.document.kind === "series")!.document;
  if (calendar.kind !== "calendar" || series.kind !== "series") throw new Error("Missing fixture");
  const occurrences = expandedTasks([], [series.data], calendar.data, "2026-10-25");
  const occurrence = occurrences[0]!;
  await commandDatabase(db, "owner", {
    kind: "complete_task",
    requestId: "done",
    id: occurrence.id,
    revision: taskRevision(records, occurrence.id, occurrence.seriesId),
    completed: true,
  });
  const stored = (await snapshotDatabase(db, "owner")).filter(
    (row) => row.document.kind === "task",
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]?.document).toMatchObject({ data: { id: occurrence.id, completed: true } });
  expect(occurrences.length).toBeGreaterThan(1);
});

it("requires explicit confirmation before removing a deadline", async () => {
  const db = await setup();
  await commandDatabase(db, "owner", {
    kind: "create_task",
    requestId: "deadline",
    title: "Deadline",
    description: "",
    priority: 1,
    scheduling: { kind: "deadline", date: "2026-10-25", time: "12:00" },
  });
  const row = (await snapshotDatabase(db, "owner")).find((row) => row.document.kind === "task")!;
  const move = {
    kind: "update_task" as const,
    requestId: "move",
    id: row.document.data.id,
    revision: row.revision,
    scheduling: { kind: "backlog" as const },
  };
  await expect(commandDatabase(db, "owner", move)).rejects.toThrow("clearDeadline");
  await commandDatabase(db, "owner", { ...move, clearDeadline: true });
});

it("serves real MCP tool discovery and enforces read-only grants at the command boundary", async () => {
  const db = await setup();
  const handler = createAppMcp({
    snapshot: (id) => snapshotDatabase(db, id),
    command: (id, command) => commandDatabase(db, id, command),
  });
  try {
    const call = async (method: string, params: unknown) => {
      const response = await handler.fetch(
        new Request("http://localhost/mcp", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
            "mcp-protocol-version": "2025-03-26",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        }),
        {
          authInfo: {
            token: "test",
            clientId: "client",
            scopes: ["polydays:read"],
            extra: { userId: "owner" },
          },
        },
      );
      expect(response.status).toBe(200);
      const body = await response.text();
      return JSON.parse(
        body.startsWith("event:")
          ? body
              .split("\n")
              .find((line) => line.startsWith("data: "))!
              .slice(6)
          : body,
      );
    };
    const listed = await call("tools/list", {});
    expect(listed.result.tools.map((tool: { name: string }) => tool.name)).toContain("create_task");
    const context = await call("tools/call", { name: "get_context", arguments: {} });
    expect(context.result.structuredContent.data.timeZone).toBe("Asia/Tbilisi");
    const denied = await call("tools/call", {
      name: "create_task",
      arguments: { requestId: "deny", title: "Denied" },
    });
    expect(denied.result.isError).toBe(true);
    expect(
      (await snapshotDatabase(db, "owner")).filter((row) => row.document.kind === "task"),
    ).toHaveLength(0);
  } finally {
    await handler.close();
  }
});
