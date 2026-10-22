import { describe, expect, it } from "vite-plus/test";
import { type Document, type Task } from "@polydays/core";
import {
  acceptResponse,
  documents,
  emptyState,
  enqueue,
  mergeOperation,
  resolveConflict,
  type LocalState,
  type Operation,
} from "./index.ts";

const task: Task = {
  id: "one",
  title: "Написать",
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
const base: Document = { kind: "task", data: task };
const doc = (patch: Partial<Task>): Document => ({ kind: "task", data: { ...task, ...patch } });
const operation = (entity: Document): Operation => ({ id: "op", at: 2, entity, base });

describe("multi-device merge", () => {
  it("merges text from one device with completion from another", () => {
    const result = mergeOperation(
      doc({ title: "Новый текст" }),
      operation(doc({ completed: true, completedAt: 10 })),
    );
    expect(result.ok).toBe(true);
    if (result.ok && result.document.kind === "task") {
      expect(result.document.data.title).toBe("Новый текст");
      expect(result.document.data.completed).toBe(true);
    }
  });
  it("preserves conflicting text and deletion-versus-edit", () => {
    expect(mergeOperation(doc({ title: "Mac" }), operation(doc({ title: "Телефон" })))).toEqual({
      ok: false,
      fields: ["title"],
    });
    expect(
      mergeOperation(doc({ deleted: true }), operation(doc({ description: "Изменено офлайн" }))),
    ).toEqual({ ok: false, fields: ["deleted"] });
  });
  it("does not overwrite a newer pending edit when an older edit is acknowledged", () => {
    let state: LocalState = { ...emptyState("owner"), records: [{ document: base, revision: 1 }] };
    state = enqueue(state, doc({ title: "Первое" }), "a", 2);
    state = enqueue(state, doc({ title: "Второе" }), "b", 3);
    state = acceptResponse(state, {
      acknowledged: ["a"],
      conflicts: [],
      changes: [{ document: doc({ title: "Первое" }), revision: 2 }],
      cursor: 2,
      hasMore: false,
    });
    expect(state.pending.map((op) => op.id)).toEqual(["b"]);
    expect(documents(state)[0]?.data).toMatchObject({ title: "Второе" });
  });
  it("keeps local conflict data and resolves through a new versioned operation", () => {
    let state = enqueue(
      { ...emptyState("owner"), records: [{ document: base, revision: 1 }] },
      doc({ title: "Телефон" }),
      "a",
      2,
    );
    state = acceptResponse(state, {
      acknowledged: [],
      conflicts: [
        {
          id: "a",
          entityId: "task:one",
          fields: ["title"],
          local: doc({ title: "Телефон" }),
          remote: doc({ title: "Mac" }),
        },
      ],
      changes: [{ document: doc({ title: "Mac" }), revision: 2 }],
      cursor: 2,
      hasMore: false,
    });
    expect(state.pending).toHaveLength(0);
    expect(documents(state)[0]?.data).toMatchObject({ title: "Телефон" });
    const resolved = resolveConflict(state, "a", "local", "resolution", 3);
    expect(resolved.conflicts).toHaveLength(0);
    expect(resolved.pending[0]?.base?.data).toMatchObject({ title: "Mac" });
  });
});
