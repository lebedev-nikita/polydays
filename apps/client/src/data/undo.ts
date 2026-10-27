import type { Task } from "@polydays/core";
import { documents } from "@polydays/sync";
import type { AppStore } from "./store";

/** Undo only this command, retaining any edits made while the notice was visible. */
export async function undoTask(store: AppStore, before: Task, command: "completion" | "deletion") {
  const state = store.getSnapshot().local;
  if (!state) return;
  const latest = documents(state).find((doc) => doc.kind === "task" && doc.data.id === before.id);
  const current = latest?.kind === "task" ? latest.data : before;
  const patch =
    command === "deletion"
      ? { deleted: before.deleted }
      : {
          completed: before.completed,
          completedAt: before.completedAt,
          ...(before.scheduling.kind === "backlog" ? { scheduling: before.scheduling } : {}),
        };
  await store.save(
    { kind: "task", data: { ...current, ...patch } },
    { kind: "task", data: current },
  );
}
