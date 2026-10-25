import { randomUUID } from "node:crypto";
import { Schema } from "effect";
import {
  DateText,
  Slot,
  Scheduling,
  Priority,
  Recurrence,
  activeVersion,
  addDays,
  changeTimeZone,
  completeTask,
  dateAt,
  expandedTasks,
  ruleForDate,
  updateCalendar,
  validateCalendar,
  validateSeries,
  validateTask,
  type Calendar,
  type Document,
  type Task,
} from "@polydays/core";
import type { Versioned } from "@polydays/sync";

const identity = { requestId: Schema.NonEmptyString };
const existing = { ...identity, id: Schema.NonEmptyString, revision: Schema.Int };
const fields = {
  title: Schema.NonEmptyString,
  description: Schema.String,
  priority: Priority,
};
const seriesFields = {
  ...fields,
  recurrence: Recurrence,
  startDate: DateText,
  endDate: Schema.NullOr(DateText),
};
export const AppCommand = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("create_task"),
    ...identity,
    ...fields,
    scheduling: Scheduling,
  }),
  Schema.Struct({
    kind: Schema.Literal("update_task"),
    ...existing,
    title: Schema.optionalKey(Schema.NonEmptyString),
    description: Schema.optionalKey(Schema.String),
    priority: Schema.optionalKey(Priority),
    scheduling: Schema.optionalKey(Scheduling),
    clearDeadline: Schema.optionalKey(Schema.Boolean),
  }),
  Schema.Struct({ kind: Schema.Literal("complete_task"), ...existing, completed: Schema.Boolean }),
  Schema.Struct({ kind: Schema.Literal("delete_task"), ...existing }),
  Schema.Struct({ kind: Schema.Literal("create_series"), ...identity, ...seriesFields }),
  Schema.Struct({
    kind: Schema.Literal("update_series"),
    ...existing,
    ...seriesFields,
    effectiveDate: DateText,
  }),
  Schema.Struct({
    kind: Schema.Literal("set_schedule"),
    ...identity,
    revision: Schema.Int,
    effectiveDate: DateText,
    timeZone: Schema.NonEmptyString,
    slots: Schema.Array(Slot),
    transferTo: Schema.optionalKey(Schema.String),
  }),
  Schema.Struct({
    kind: Schema.Literal("set_timezone"),
    ...identity,
    revision: Schema.Int,
    timeZone: Schema.NonEmptyString,
    mode: Schema.Literals(["fixed", "local"]),
  }),
]);
export type AppCommand = typeof AppCommand.Type;
export const decodeCommand = Schema.decodeUnknownSync(AppCommand);

export function workspace(records: ReadonlyArray<Versioned>, now: number) {
  const calendar = records.find((row) => row.document.kind === "calendar");
  const data = calendar?.document.kind === "calendar" ? calendar.document.data : null;
  return {
    calendar: data,
    calendarRevision: calendar?.revision ?? 0,
    today: data ? dateAt(now, activeVersion(data, now).timeZone) : null,
    tasks: records.flatMap((row) => (row.document.kind === "task" ? [row.document.data] : [])),
    series: records.flatMap((row) =>
      row.document.kind === "series" && !row.document.data.deleted ? [row.document.data] : [],
    ),
  };
}

export function findTask(
  records: ReadonlyArray<Versioned>,
  calendar: Calendar,
  id: string,
  now: number,
): Task {
  const stored = records.find((row) => row.document.kind === "task" && row.document.data.id === id);
  if (stored?.document.kind === "task") {
    if (stored.document.data.deleted) throw new Error("Задача удалена.");
    return stored.document.data;
  }
  const state = workspace(records, now);
  const occurrenceDate = id.match(/:(\d{4}-\d{2}-\d{2}):[^:]+$/)?.[1];
  if (!occurrenceDate) throw new Error("Задача не найдена.");
  addDays(occurrenceDate, 0);
  const task = expandedTasks([], state.series, calendar, occurrenceDate).find(
    (task) => task.id === id,
  );
  if (!task) throw new Error("Повторение задачи не найдено.");
  return task;
}

export function prepareCommand(
  records: ReadonlyArray<Versioned>,
  command: AppCommand,
  now: number,
): ReadonlyArray<Document> {
  const state = workspace(records, now);
  const calendar = state.calendar;
  const assertRevision = (kind: Document["kind"], id: string, revision: number) => {
    const row = records.find((row) => row.document.kind === kind && row.document.data.id === id);
    if ((row?.revision ?? 0) !== revision)
      throw new Error("Версия устарела. Прочитайте данные снова и используйте новый requestId.");
  };
  if (command.kind === "set_schedule") {
    assertRevision("calendar", "calendar", command.revision);
    addDays(command.effectiveDate, 0);
    const version = {
      id: randomUUID(),
      from: command.effectiveDate,
      timeZone: command.timeZone,
      slots: command.slots,
    };
    if (!calendar)
      return [
        {
          kind: "calendar",
          data: validateCalendar({
            id: "calendar",
            mode: "fixed",
            versions: [version],
            frozen: [],
          }),
        },
      ];
    if (command.timeZone !== activeVersion(calendar, now).timeZone)
      throw new Error("Для смены часового пояса используйте set_timezone.");
    const next = updateCalendar(calendar, version, now);
    const removed = new Set(
      calendar.versions
        .filter((v) => v.from >= command.effectiveDate || v.id === activeVersion(calendar, now).id)
        .flatMap((v) => v.slots)
        .filter((slot) => !command.slots.some((next) => next.id === slot.id))
        .map((slot) => slot.id),
    );
    if (removed.size && !command.slots.some((slot) => slot.id === command.transferTo))
      throw new Error("Укажите transferTo для задач из удалённых полидней.");
    const changes: Document[] = [{ kind: "calendar", data: next }];
    for (const row of records) {
      if (row.document.kind === "task") {
        const task = row.document.data;
        if (
          !task.completed &&
          !task.deleted &&
          task.scheduling.kind === "polyday" &&
          task.scheduling.date >= command.effectiveDate &&
          removed.has(task.scheduling.slotId)
        ) {
          changes.push({
            kind: "task",
            data: validateTask(
              { ...task, scheduling: { ...task.scheduling, slotId: command.transferTo! } },
              next,
            ),
          });
        }
      }
      if (row.document.kind === "series" && !row.document.data.deleted) {
        const series = row.document.data;
        const rules = series.rules.map((rule) =>
          rule.effectiveDate >= command.effectiveDate &&
          rule.recurrence.kind === "polyday" &&
          removed.has(rule.recurrence.slotId)
            ? { ...rule, recurrence: { ...rule.recurrence, slotId: command.transferTo! } }
            : rule,
        );
        const active = ruleForDate(series, command.effectiveDate);
        if (
          active?.recurrence.kind === "polyday" &&
          removed.has(active.recurrence.slotId) &&
          active.effectiveDate < command.effectiveDate
        )
          rules.push({
            ...active,
            effectiveDate: command.effectiveDate,
            recurrence: { ...active.recurrence, slotId: command.transferTo! },
          });
        if (JSON.stringify(rules) !== JSON.stringify(series.rules))
          changes.push({ kind: "series", data: validateSeries({ ...series, rules }, next) });
      }
    }
    return changes;
  }
  if (!calendar) throw new Error("Сначала настройте расписание через set_schedule.");
  if (command.kind === "set_timezone") {
    assertRevision("calendar", "calendar", command.revision);
    return [
      {
        kind: "calendar",
        data: { ...changeTimeZone(calendar, command.timeZone, now), mode: command.mode },
      },
    ];
  }
  if (command.kind === "create_task") {
    return [
      {
        kind: "task",
        data: validateTask(
          {
            id: randomUUID(),
            title: command.title.trim(),
            description: command.description,
            priority: command.priority,
            scheduling: command.scheduling,
            order: now,
            createdAt: now,
            completed: false,
            completedAt: null,
            deleted: false,
            seriesId: null,
            occurrenceDate: null,
          },
          calendar,
        ),
      },
    ];
  }
  if (command.kind === "create_series" || command.kind === "update_series") {
    const previous =
      command.kind === "update_series"
        ? state.series.find((series) => series.id === command.id)
        : undefined;
    if (command.kind === "update_series") {
      if (!previous) throw new Error("Серия не найдена.");
      assertRevision("series", command.id, command.revision);
      if (command.effectiveDate < addDays(state.today!, 1))
        throw new Error("Изменения серии применяются не раньше завтрашней даты.");
    }
    const effectiveDate =
      command.kind === "update_series" ? command.effectiveDate : command.startDate;
    const rule = {
      effectiveDate,
      title: command.title.trim(),
      description: command.description,
      priority: command.priority,
      recurrence: command.recurrence,
      startDate: command.startDate,
      endDate: command.endDate,
    };
    return [
      {
        kind: "series",
        data: validateSeries(
          {
            id: previous?.id ?? randomUUID(),
            rules: [
              ...(previous?.rules.filter((rule) => rule.effectiveDate < effectiveDate) ?? []),
              rule,
            ],
            deleted: false,
            createdAt: previous?.createdAt ?? now,
          },
          calendar,
        ),
      },
    ];
  }
  const task = findTask(records, calendar, command.id, now);
  const stored = records.some(
    (row) => row.document.kind === "task" && row.document.data.id === task.id,
  );
  assertRevision(stored ? "task" : "series", stored ? task.id : task.seriesId!, command.revision);
  if (command.kind === "complete_task") {
    if (task.completed === command.completed) return [];
    return [{ kind: "task", data: completeTask(task, command.completed, calendar, now) }];
  }
  if (command.kind === "delete_task") return [{ kind: "task", data: { ...task, deleted: true } }];
  if (
    task.scheduling.kind === "deadline" &&
    command.scheduling &&
    command.scheduling.kind !== "deadline" &&
    !command.clearDeadline
  )
    throw new Error("Для снятия дедлайна явно передайте clearDeadline: true и новое назначение.");
  return [
    {
      kind: "task",
      data: validateTask(
        {
          ...task,
          ...(command.title === undefined ? {} : { title: command.title.trim() }),
          ...(command.description === undefined ? {} : { description: command.description }),
          ...(command.priority === undefined ? {} : { priority: command.priority }),
          ...(command.scheduling === undefined ? {} : { scheduling: command.scheduling }),
        },
        calendar,
      ),
    },
  ];
}
