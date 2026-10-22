import { DateTime, Schema } from "effect";
import { activeVersion, addDays, dateAt, polydaysBetween } from "./calendar.ts";
import { expandedTasks, sortTasks, taskView } from "./tasks.ts";
import { Task, type Document } from "./model.ts";

export const WidgetProjection = Schema.Struct({
  generatedAt: Schema.Number,
  validUntil: Schema.Number,
  views: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      title: Schema.String,
      subtitle: Schema.String,
      from: Schema.Number,
      until: Schema.Number,
      tasks: Schema.Array(
        Schema.Struct({
          id: Schema.String,
          title: Schema.String,
          origin: Schema.String,
          priority: Schema.Number,
          deadline: Schema.NullOr(Schema.String),
          expiresAt: Schema.NullOr(Schema.Number),
          overdue: Schema.Boolean,
          visibleFrom: Schema.Number,
          task: Task,
        }),
      ),
    }),
  ),
});
export type WidgetProjection = typeof WidgetProjection.Type;
export const systemNow = (): number => DateTime.toEpochMillis(DateTime.nowUnsafe());

export function buildWidgetProjection(
  documents: ReadonlyArray<Document>,
  now: number,
): WidgetProjection | null {
  const calendar = documents.find((item) => item.kind === "calendar")?.data;
  if (!calendar) return null;
  const today = dateAt(now, activeVersion(calendar, now).timeZone);
  const tasks = expandedTasks(
    documents.flatMap((doc) => (doc.kind === "task" ? [doc.data] : [])),
    documents.flatMap((doc) => (doc.kind === "series" ? [doc.data] : [])),
    calendar,
    addDays(today, 7),
  );
  const days = polydaysBetween(calendar, addDays(today, -1), addDays(today, 7));
  return {
    generatedAt: now,
    validUntil: days.at(-1)?.end ?? now,
    views: days.map((day, index) => ({
      id: day.id,
      title: day.name,
      subtitle: `${day.date} · ${day.startTime}–${day.endTime}`,
      from: days[index - 1]?.end ?? day.start,
      until: day.end,
      tasks: sortTasks(tasks.map((task) => taskView(task, calendar, now)))
        .filter(
          (view) =>
            !view.task.completed &&
            (view.polyday?.id === day.id ||
              (view.deadline ?? view.polyday?.end ?? Infinity) < day.end),
        )
        .map((view) => ({
          id: view.task.id,
          title: view.task.title,
          origin: view.polyday ? `${view.polyday.date} · ${view.polyday.name}` : "",
          priority: view.task.priority,
          deadline: view.task.scheduling.kind === "deadline" ? view.task.scheduling.time : null,
          expiresAt: view.deadline ?? view.polyday?.end ?? null,
          overdue: view.overdue,
          visibleFrom:
            view.polyday?.id === day.id
              ? (days[index - 1]?.end ?? day.start)
              : view.deadline !== null
                ? view.deadline + 1
                : (view.polyday?.end ?? Infinity),
          task: view.task,
        })),
    })),
  };
}
