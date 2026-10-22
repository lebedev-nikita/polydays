import { Schema } from "effect";

export const DateText = Schema.String.check(Schema.isPattern(/^\d{4}-\d{2}-\d{2}$/));
export const TimeText = Schema.String.check(Schema.isPattern(/^([01]\d|2[0-3]):[0-5]\d$/));
export const Priority = Schema.Literals([1, 2, 3, 4]);
export const Slot = Schema.Struct({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  start: TimeText,
  end: TimeText,
});
export type Slot = typeof Slot.Type;

export const Polyday = Schema.Struct({
  id: Schema.String,
  slotId: Schema.String,
  date: DateText,
  name: Schema.String,
  start: Schema.Number,
  end: Schema.Number,
  startTime: TimeText,
  endTime: TimeText,
  timeZone: Schema.String,
});
export type Polyday = typeof Polyday.Type;

export const CalendarVersion = Schema.Struct({
  id: Schema.String,
  from: DateText,
  timeZone: Schema.NonEmptyString,
  slots: Schema.Array(Slot),
  activatedAt: Schema.optionalKey(Schema.Number),
});
export type CalendarVersion = typeof CalendarVersion.Type;
export const Calendar = Schema.Struct({
  id: Schema.Literal("calendar"),
  mode: Schema.Literals(["fixed", "local"]),
  versions: Schema.Array(CalendarVersion),
  frozen: Schema.Array(Polyday),
});
export type Calendar = typeof Calendar.Type;

export const Scheduling = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("backlog") }),
  Schema.Struct({ kind: Schema.Literal("polyday"), date: DateText, slotId: Schema.NonEmptyString }),
  Schema.Struct({ kind: Schema.Literal("deadline"), date: DateText, time: TimeText }),
]);
export type Scheduling = typeof Scheduling.Type;

export const Task = Schema.Struct({
  id: Schema.NonEmptyString,
  title: Schema.NonEmptyString,
  description: Schema.String,
  priority: Priority,
  order: Schema.Number,
  scheduling: Scheduling,
  completed: Schema.Boolean,
  completedAt: Schema.NullOr(Schema.Number),
  deleted: Schema.Boolean,
  createdAt: Schema.Number,
  seriesId: Schema.NullOr(Schema.String),
  occurrenceDate: Schema.NullOr(DateText),
});
export type Task = typeof Task.Type;

export const Recurrence = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("every-polyday") }),
  Schema.Struct({
    kind: Schema.Literal("polyday"),
    slotId: Schema.String,
    weekdays: Schema.Array(Schema.Int),
  }),
  Schema.Struct({
    kind: Schema.Literal("time"),
    time: TimeText,
    weekdays: Schema.Array(Schema.Int),
  }),
]);
export type Recurrence = typeof Recurrence.Type;
export const SeriesRule = Schema.Struct({
  effectiveDate: DateText,
  title: Schema.NonEmptyString,
  description: Schema.String,
  priority: Priority,
  recurrence: Recurrence,
  startDate: DateText,
  endDate: Schema.NullOr(DateText),
});
export type SeriesRule = typeof SeriesRule.Type;
export const Series = Schema.Struct({
  id: Schema.NonEmptyString,
  rules: Schema.Array(SeriesRule),
  deleted: Schema.Boolean,
  createdAt: Schema.Number,
});
export type Series = typeof Series.Type;

export const Document = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("calendar"), data: Calendar }),
  Schema.Struct({ kind: Schema.Literal("task"), data: Task }),
  Schema.Struct({ kind: Schema.Literal("series"), data: Series }),
]);
export type Document = typeof Document.Type;
export const decodeDocument = Schema.decodeUnknownSync(Document);
export const decodeTask = Schema.decodeUnknownSync(Task);
export const decodeCalendar = Schema.decodeUnknownSync(Calendar);

export type TaskView = {
  readonly task: Task;
  readonly polyday: Polyday | null;
  readonly deadline: number | null;
  readonly overdue: boolean;
  readonly inSleepGap: boolean;
};

export const defaultSlots: ReadonlyArray<Slot> = [
  { id: "morning", name: "Утренний", start: "06:00", end: "12:00" },
  { id: "afternoon", name: "Дневной", start: "12:30", end: "18:30" },
  { id: "night", name: "Вечерний", start: "19:00", end: "02:00" },
];
