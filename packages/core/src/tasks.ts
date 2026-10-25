import {
  addDays,
  currentPolyday,
  deadlineInstant,
  polydayForInstant,
  polydaysOn,
  weekday,
} from "./calendar.ts";
import {
  decodeTask,
  Series as SeriesSchema,
  type Calendar,
  type Recurrence,
  type Series,
  type SeriesRule,
  type Task,
  type TaskView,
} from "./model.ts";
import * as Schema from "effect/Schema";

export function parseTaskTitle(input: string): {
  readonly title: string;
  readonly priority: Task["priority"] | null;
} {
  let priority: Task["priority"] | null = null;
  const title = input.replace(/(?:^|\s)!!([1-4])(?=\s|$)/g, (_, value: string) => {
    priority = Number(value) as Task["priority"];
    return "";
  });
  return { title: priority === null ? title : title.trim(), priority };
}

export function taskView(task: Task, calendar: Calendar, now: number): TaskView {
  if (task.scheduling.kind === "backlog")
    return { task, polyday: null, deadline: null, overdue: false, inSleepGap: false };
  if (task.scheduling.kind === "deadline") {
    const deadline = deadlineInstant(calendar, task.scheduling.date, task.scheduling.time);
    const placement = polydayForInstant(calendar, deadline);
    return { task, ...placement, deadline, overdue: !task.completed && deadline < now };
  }
  const { date, slotId } = task.scheduling;
  const polyday = polydaysOn(calendar, date).find((p) => p.slotId === slotId) ?? null;
  return {
    task,
    polyday,
    deadline: null,
    overdue: !task.completed && polyday !== null && polyday.end <= now,
    inSleepGap: false,
  };
}

export function validateTask(task: Task, calendar: Calendar): Task {
  const parsed = decodeTask(task);
  if (!parsed.title.trim()) throw new Error("Введите название задачи.");
  if (parsed.title.length > 1000 || parsed.description.length > 20000)
    throw new Error("Текст задачи слишком длинный.");
  if (parsed.scheduling.kind === "deadline")
    deadlineInstant(calendar, parsed.scheduling.date, parsed.scheduling.time);
  const scheduling = parsed.scheduling;
  if (
    scheduling.kind === "polyday" &&
    !polydaysOn(calendar, scheduling.date).some((p) => p.slotId === scheduling.slotId)
  )
    throw new Error("Выбранный полидень отсутствует в расписании.");
  return parsed;
}

export function validateSeries(series: Series, calendar: Calendar): Series {
  const parsed = Schema.decodeUnknownSync(SeriesSchema)(series);
  if (!parsed.rules.length) throw new Error("Добавьте правило повторения.");
  const dates = new Set<string>();
  for (const rule of parsed.rules) {
    addDays(rule.effectiveDate, 0);
    addDays(rule.startDate, 0);
    if (dates.has(rule.effectiveDate))
      throw new Error("Правила серии не должны начинаться в один день.");
    dates.add(rule.effectiveDate);
    if (!rule.title.trim() || rule.title.length > 1000 || rule.description.length > 20000)
      throw new Error("Проверьте название и описание серии.");
    if (rule.endDate) {
      addDays(rule.endDate, 0);
      if (rule.endDate < rule.startDate)
        throw new Error("Окончание серии должно быть не раньше начала.");
    }
    if (
      rule.recurrence.kind !== "every-polyday" &&
      rule.recurrence.weekdays.some((day) => day < 1 || day > 7)
    )
      throw new Error("Выберите дни недели от понедельника до воскресенья.");
    if (rule.recurrence.kind === "time")
      deadlineInstant(calendar, rule.startDate, rule.recurrence.time);
    if (rule.recurrence.kind === "polyday") {
      const recurrence = rule.recurrence;
      const date = rule.effectiveDate > rule.startDate ? rule.effectiveDate : rule.startDate;
      if (!polydaysOn(calendar, date).some((day) => day.slotId === recurrence.slotId))
        throw new Error("Полидень для серии отсутствует в расписании.");
    }
  }
  return parsed;
}

export function completeTask(
  task: Task,
  completed: boolean,
  calendar: Calendar,
  now: number,
): Task {
  const current = currentPolyday(calendar, now);
  if (completed && task.scheduling.kind === "backlog" && !current)
    throw new Error("Сначала настройте полидни.");
  return {
    ...task,
    completed,
    completedAt: completed ? now : null,
    scheduling:
      completed && task.scheduling.kind === "backlog" && current
        ? { kind: "polyday", date: current.date, slotId: current.slotId }
        : task.scheduling,
  };
}

export function moveTask(task: Task, date: string, slotId: string): Task {
  if (task.scheduling.kind === "deadline")
    throw new Error("У этой задачи есть дедлайн. Измените его дату и время.");
  return { ...task, scheduling: { kind: "polyday", date, slotId } };
}

export function ruleForDate(series: Series, date: string): SeriesRule | undefined {
  return [...series.rules]
    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
    .find((r) => r.effectiveDate <= date);
}

function matchesWeekday(recurrence: Recurrence, date: string): boolean {
  return (
    recurrence.kind === "every-polyday" ||
    recurrence.weekdays.length === 0 ||
    recurrence.weekdays.includes(weekday(date))
  );
}

export function occurrences(
  series: Series,
  calendar: Calendar,
  until: string,
): ReadonlyArray<Task> {
  if (series.deleted) return [];
  const first = [...series.rules].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))[0];
  if (!first) return [];
  const result: Task[] = [];
  for (let date = first.startDate; date <= until; date = addDays(date, 1)) {
    const rule = ruleForDate(series, date);
    if (
      !rule ||
      date < rule.startDate ||
      (rule.endDate && date > rule.endDate) ||
      !matchesWeekday(rule.recurrence, date)
    )
      continue;
    const recurrence = rule.recurrence;
    const targets =
      recurrence.kind === "time"
        ? [{ key: "time", scheduling: { kind: "deadline" as const, date, time: recurrence.time } }]
        : polydaysOn(calendar, date)
            .filter((p) => recurrence.kind === "every-polyday" || p.slotId === recurrence.slotId)
            .map((p) => ({
              key: p.slotId,
              scheduling: { kind: "polyday" as const, date, slotId: p.slotId },
            }));
    for (const target of targets)
      result.push({
        id: `occurrence:${series.id}:${date}:${target.key}`,
        title: rule.title,
        description: rule.description,
        priority: rule.priority,
        order: series.createdAt,
        scheduling: target.scheduling,
        completed: false,
        completedAt: null,
        deleted: false,
        createdAt: series.createdAt,
        seriesId: series.id,
        occurrenceDate: date,
      });
  }
  return result;
}

export function expandedTasks(
  tasks: ReadonlyArray<Task>,
  series: ReadonlyArray<Series>,
  calendar: Calendar,
  until: string,
): ReadonlyArray<Task> {
  const all = new Map<string, Task>();
  for (const item of series)
    for (const task of occurrences(item, calendar, until)) all.set(task.id, task);
  for (const task of tasks) all.set(task.id, task);
  return [...all.values()].filter((task) => !task.deleted);
}

export const sortTasks = (tasks: ReadonlyArray<TaskView>): ReadonlyArray<TaskView> =>
  [...tasks].sort(
    (a, b) =>
      a.task.priority - b.task.priority ||
      a.task.order - b.task.order ||
      a.task.id.localeCompare(b.task.id),
  );

export function tasksForPolyday(
  tasks: ReadonlyArray<Task>,
  calendar: Calendar,
  id: string,
  now: number,
  includeOverdue: boolean,
): ReadonlyArray<TaskView> {
  return sortTasks(
    tasks
      .map((task) => taskView(task, calendar, now))
      .filter((view) => view.polyday?.id === id || (includeOverdue && view.overdue)),
  );
}

export function reorderWithinPriority(task: Task, neighbor: Task): readonly [Task, Task] {
  if (task.priority !== neighbor.priority)
    throw new Error("Менять порядок можно только внутри одного приоритета.");
  return [
    { ...task, order: neighbor.order },
    { ...neighbor, order: task.order },
  ];
}
