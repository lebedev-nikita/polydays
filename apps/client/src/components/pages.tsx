import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowDown,
  ArrowUp,
  Trash2,
  Repeat2,
  X,
  Inbox,
} from "lucide-react-native";
import {
  activeVersion,
  addDays,
  changeTimeZone,
  currentPolyday,
  dateAt,
  expandedTasks,
  polydaysBetween,
  polydaysOn,
  sortTasks,
  taskView,
  type Scheduling,
  type Document,
} from "@polydays/core";
import { useApp, useNotice } from "./provider";
import { AppShell } from "./shell";
import { TaskList } from "./task-list";
import { Button, ErrorMessage, colors } from "./primitives";
import { ScheduleEditor } from "./schedule";
import { TaskForm } from "./task-editor";
import { message } from "../data/store";
import { undoTask } from "../data/undo";
import * as Crypto from "expo-crypto";
import { enqueue } from "@polydays/sync";
import { pinWidget } from "../data/widget";

function prettyDate(date: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="mb-7 gap-2">
      <Text accessibilityRole="header" className="text-[26px] font-bold leading-8 text-ink">
        {title}
      </Text>
      {subtitle && <Text className="text-sm leading-5 text-muted">{subtitle}</Text>}
    </View>
  );
}

export function PolydayScreen({ explicit = false }: { explicit?: boolean }) {
  const app = useApp();
  const params = useLocalSearchParams<{ date?: string; slotId?: string }>();
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calendar = app.calendar;
  const current = calendar ? currentPolyday(calendar, app.now) : null;
  const day =
    explicit && calendar && params.date
      ? (polydaysOn(calendar, params.date).find((p) => p.slotId === params.slotId) ?? null)
      : current;
  const date =
    day?.date ??
    (calendar ? dateAt(app.now, activeVersion(calendar, app.now).timeZone) : "2026-01-01");
  const scheduling: Scheduling = day
    ? { kind: "polyday", date: day.date, slotId: day.slotId }
    : { kind: "backlog" };
  const all = calendar ? expandedTasks(app.tasks, app.series, calendar, addDays(date, 7)) : [];
  const rows =
    calendar && day
      ? sortTasks(
          all
            .map((task) => taskView(task, calendar, app.now))
            .filter((view) => view.polyday?.id === day.id || (!explicit && view.overdue)),
        )
      : [];
  const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zone = calendar ? activeVersion(calendar, app.now).timeZone : detectedZone;
  const adoptZone = async () => {
    if (!calendar) return;
    try {
      await app.store.saveCalendar(changeTimeZone(calendar, detectedZone, app.now));
    } catch (cause) {
      setError(message(cause));
    }
  };
  return (
    <AppShell defaultScheduling={scheduling}>
      <ErrorMessage>{error}</ErrorMessage>
      {calendar?.mode === "local" && detectedZone !== zone && (
        <View className="mb-6 gap-3 rounded-md border border-line bg-sidebar p-4">
          <Text className="text-sm leading-5 text-ink">
            На устройстве часовой пояс {detectedZone}. Использовать его на всех устройствах?
          </Text>
          <Button
            secondary
            onPress={() => {
              void adoptZone();
            }}
          >
            Применить часовой пояс
          </Button>
        </View>
      )}
      <Title
        title={day?.name ?? "Текущий полидень"}
        subtitle={
          day
            ? `${prettyDate(day.date)} · ${day.startTime}–${day.endTime}${day.endTime < day.startTime ? " следующего дня" : ""}`
            : "Сначала настройте своё расписание"
        }
      />
      {!explicit && day && app.now < day.start && (
        <Text className="mb-5 text-sm leading-5 text-muted">
          Сейчас время сна по расписанию. Уже открыт следующий полидень.
        </Text>
      )}
      {calendar && (
        <View className="mb-7 flex-row flex-wrap gap-2">
          {polydaysOn(calendar, date).map((item) => (
            <Link
              key={item.id}
              href={{
                pathname: "/day/[date]/[slotId]",
                params: { date: item.date, slotId: item.slotId },
              }}
              asChild
            >
              <Pressable
                className={`min-h-12 justify-center rounded-md border px-3 ${day?.id === item.id ? "border-accent bg-selected" : "border-line"}`}
              >
                <Text
                  className={`text-xs ${day?.id === item.id ? "font-semibold text-accent" : "text-muted"}`}
                >
                  {item.name} · {item.startTime}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
      <TaskList rows={rows.filter((row) => !row.task.completed)} scheduling={scheduling} />
      {rows.some((row) => row.task.completed) && (
        <View className="mt-6">
          <Pressable
            onPress={() => setShowCompleted(!showCompleted)}
            accessibilityRole="button"
            className="min-h-12 justify-center"
          >
            <Text className="text-sm text-muted">
              {showCompleted ? "Скрыть" : "Показать"} выполненные
            </Text>
          </Pressable>
          {showCompleted && (
            <TaskList
              rows={rows.filter((row) => row.task.completed)}
              scheduling={scheduling}
              includeCompleted
            />
          )}
        </View>
      )}
    </AppShell>
  );
}

export function BacklogScreen() {
  const { calendar, tasks, now } = useApp();
  const rows = calendar
    ? sortTasks(
        tasks
          .filter((task) => !task.deleted && task.scheduling.kind === "backlog")
          .map((task) => taskView(task, calendar, now)),
      )
    : [];
  return (
    <AppShell>
      <Title title="Бэклог" subtitle="Задачи, которым вы ещё не выбрали полидень" />
      <TaskList rows={rows} scheduling={{ kind: "backlog" }} />
    </AppShell>
  );
}

export function TimelineScreen({ history = false }: { history?: boolean }) {
  const { calendar, tasks, series, now } = useApp();
  const params = useLocalSearchParams<{ from?: string }>();
  const today = calendar ? dateAt(now, activeVersion(calendar, now).timeZone) : "2026-01-01";
  const from =
    params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
      ? params.from
      : history
        ? addDays(today, -6)
        : today;
  const until = addDays(from, 6);
  const days = calendar
    ? polydaysBetween(calendar, from, until)
        .filter((day) => (history ? day.end <= now : day.end > now))
        .sort((a, b) => (history ? b.start - a.start : a.start - b.start))
    : [];
  const all = calendar ? expandedTasks(tasks, series, calendar, until) : [];
  const views = calendar ? all.map((task) => taskView(task, calendar, now)) : [];
  const path = history ? "/history" : "/upcoming";
  return (
    <AppShell>
      <View className="flex-row items-start justify-between">
        <Title
          title={history ? "История полидней" : "Предстоящие"}
          subtitle={
            history
              ? "Выполненные задачи остаются в своих полиднях"
              : "Планируйте задачи на следующие полидни"
          }
        />
        <View className="flex-row">
          <Link href={{ pathname: path, params: { from: addDays(from, -7) } }} asChild>
            <Pressable
              accessibilityLabel="Предыдущая неделя"
              className="h-12 w-12 items-center justify-center"
            >
              <ChevronLeft size={20} color={colors.muted} />
            </Pressable>
          </Link>
          <Link href={{ pathname: path, params: { from: addDays(from, 7) } }} asChild>
            <Pressable
              accessibilityLabel="Следующая неделя"
              className="h-12 w-12 items-center justify-center"
            >
              <ChevronRight size={20} color={colors.muted} />
            </Pressable>
          </Link>
        </View>
      </View>
      <Text className="mb-5 text-sm text-muted">
        {prettyDate(from)} — {prettyDate(until)}
      </Text>
      <View className="mb-6 flex-row border-b border-line pb-3">
        {Array.from({ length: 7 }, (_, index) => {
          const date = addDays(from, index);
          const current = date === today;
          return (
            <Link key={date} href={{ pathname: path, params: { from: date } }} asChild>
              <Pressable
                accessibilityLabel={`Показать неделю с ${prettyDate(date)}`}
                className="min-h-14 flex-1 items-center justify-center gap-1 rounded-md hover:bg-sidebar"
              >
                <Text className={`text-xs ${current ? "font-semibold text-accent" : "text-muted"}`}>
                  {new Intl.DateTimeFormat("ru", { weekday: "short", timeZone: "UTC" }).format(
                    new Date(`${date}T12:00:00Z`),
                  )}
                </Text>
                <View
                  className={`h-7 w-7 items-center justify-center rounded-full ${current ? "bg-accent" : ""}`}
                >
                  <Text className={`text-sm ${current ? "font-semibold text-white" : "text-ink"}`}>
                    {Number(date.slice(-2))}
                  </Text>
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
      {!days.length && (
        <Text className="py-10 text-sm text-muted">
          На этой неделе пока нет {history ? "завершённых" : "предстоящих"} полидней.
        </Text>
      )}
      {days.map((day) => {
        const rows = sortTasks(
          views.filter(
            (view) =>
              view.polyday?.id === day.id && (history ? view.task.completed : !view.task.completed),
          ),
        );
        return (
          <View key={day.id} className="mb-7 border-b border-line pb-5">
            <Link
              href={{
                pathname: "/day/[date]/[slotId]",
                params: { date: day.date, slotId: day.slotId },
              }}
              asChild
            >
              <Pressable className="min-h-12 flex-row items-center justify-between">
                <View className="gap-1">
                  <Text className="text-base font-semibold text-ink">{day.name}</Text>
                  <Text className="text-xs text-muted">
                    {prettyDate(day.date)} · {day.startTime}–{day.endTime}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.muted} />
              </Pressable>
            </Link>
            <TaskList
              rows={rows}
              scheduling={{ kind: "polyday", date: day.date, slotId: day.slotId }}
              includeCompleted={history}
              compactEmpty
            />
          </View>
        );
      })}
    </AppShell>
  );
}

export function SettingsScreen() {
  const app = useApp();
  const [error, setError] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [widgetMessage, setWidgetMessage] = useState<string | null>(null);
  const logout = async (force: boolean) => {
    try {
      await app.store.logout(force);
    } catch (cause) {
      setError(message(cause));
      setDiscard(true);
    }
  };
  return (
    <AppShell>
      {Platform.OS === "android" && (
        <View className="mb-8 gap-3 border-b border-line pb-6">
          <Text className="text-lg font-semibold text-ink">Виджет на главном экране</Text>
          <Text className="text-sm leading-5 text-muted">
            Текущий полидень и просроченные задачи. Завершайте их прямо в виджете, даже без сети.
          </Text>
          <Button
            secondary
            onPress={() => {
              void pinWidget()
                .then((pinned) =>
                  setWidgetMessage(
                    pinned
                      ? "Подтвердите добавление на главном экране."
                      : "Откройте список виджетов на главном экране и выберите Polydays.",
                  ),
                )
                .catch((cause) => setError(message(cause)));
            }}
          >
            Добавить виджет
          </Button>
          {widgetMessage && <Text className="text-xs leading-5 text-muted">{widgetMessage}</Text>}
        </View>
      )}
      <ScheduleEditor />
      <View className="mt-10 gap-4 border-t border-line pt-7">
        <Text className="text-base font-semibold text-ink">Аккаунт</Text>
        <Text className="text-sm text-muted">{app.account?.email}</Text>
        <ErrorMessage>{error}</ErrorMessage>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void logout(false);
          }}
          className="min-h-12 flex-row items-center gap-3"
        >
          <LogOut size={18} color={colors.muted} />
          <Text className="text-sm text-ink">Выйти из аккаунта</Text>
        </Pressable>
        {discard && (
          <Button
            onPress={() => {
              void logout(true);
            }}
          >
            Удалить локальные изменения и выйти
          </Button>
        )}
      </View>
    </AppShell>
  );
}

export function TaskScreen() {
  const app = useApp();
  const notify = useNotice();
  const dismissRef = useRef<(() => void) | null>(null);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [editingSeries, setEditingSeries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/current");
  }, []);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const dismiss = (event: KeyboardEvent) => {
      // The form's capture handler dismisses its parameter panel first.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      (dismissRef.current ?? close)();
    };
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [close]);
  const date = app.calendar
    ? dateAt(app.now, activeVersion(app.calendar, app.now).timeZone)
    : "2026-01-01";
  const requestedDate = id?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? date;
  const until = requestedDate > addDays(date, 30) ? requestedDate : addDays(date, 30);
  const all = app.calendar ? expandedTasks(app.tasks, app.series, app.calendar, until) : [];
  const task = all.find((item) => item.id === id);
  const reorder = async (direction: -1 | 1) => {
    if (!task || !app.calendar) return;
    try {
      const view = taskView(task, app.calendar, app.now);
      const group = sortTasks(
        all
          .filter((item) => item.priority === task.priority && !item.completed)
          .map((item) => taskView(item, app.calendar!, app.now))
          .filter((item) => item.polyday?.id === view.polyday?.id),
      );
      const index = group.findIndex((item) => item.task.id === task.id);
      if (index + direction < 0 || index + direction >= group.length) return;
      const reordered = [...group];
      const moved = reordered.splice(index, 1)[0];
      if (!moved) return;
      reordered.splice(index + direction, 0, moved);
      await app.store.update((state) => {
        let next = state;
        for (const [rank, row] of reordered.entries())
          next = enqueue(
            next,
            { kind: "task", data: { ...row.task, order: rank } },
            Crypto.randomUUID(),
            app.now,
          );
        return next;
      });
      void app.store.sync();
    } catch (cause) {
      setError(message(cause));
    }
  };
  const remove = async () => {
    if (!task) return;
    try {
      await app.store.save(
        { kind: "task", data: { ...task, deleted: true } },
        { kind: "task", data: task },
      );
      notify("Задача удалена", () => undoTask(app.store, task, "deletion"));
      close();
    } catch (cause) {
      setError(message(cause));
    }
  };
  if (!app.loaded || !app.account || !app.calendar)
    return (
      <AppShell>
        <View />
      </AppShell>
    );
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={Platform.OS === "web" ? undefined : close}
    >
      <View className="flex-1 items-center justify-start bg-black/30 px-4 pb-8 pt-[8%]">
        <Pressable
          accessibilityLabel="Закрыть задачу"
          onPress={close}
          className="absolute inset-0"
        />
        <View
          accessibilityViewIsModal
          className="max-h-[90%] w-full max-w-[800px] overflow-hidden rounded-xl bg-white shadow-xl"
        >
          <View className="flex-row items-center justify-between border-b border-line px-4 py-2">
            <View className="flex-row items-center gap-2">
              <Inbox size={16} color={colors.muted} />
              <Text className="text-xs text-muted">
                {task?.scheduling.kind === "backlog" ? "Бэклог" : "Задача полидня"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть задачу"
              onPress={close}
              className="h-9 w-9 items-center justify-center rounded-md hover:bg-sidebar"
            >
              <X size={19} color={colors.muted} />
            </Pressable>
          </View>
          <ErrorMessage>{error}</ErrorMessage>
          {!task ? (
            <Title
              title="Задача не найдена"
              subtitle="Она могла быть удалена или ещё не загружена на это устройство."
            />
          ) : (
            <>
              <View className="flex-row flex-wrap items-center gap-2 px-4 pt-3">
                <Button
                  secondary
                  onPress={() => {
                    void app.store
                      .complete(task, !task.completed)
                      .catch((cause) => setError(message(cause)));
                  }}
                >
                  {task.completed ? "Вернуть в работу" : "Завершить задачу"}
                </Button>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Поднять задачу внутри приоритета"
                  onPress={() => {
                    void reorder(-1);
                  }}
                  className="h-12 w-12 items-center justify-center"
                >
                  <ArrowUp size={18} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Опустить задачу внутри приоритета"
                  onPress={() => {
                    void reorder(1);
                  }}
                  className="h-12 w-12 items-center justify-center"
                >
                  <ArrowDown size={18} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Удалить задачу"
                  onPress={() => {
                    void remove();
                  }}
                  className="h-12 w-12 items-center justify-center"
                >
                  <Trash2 size={18} color={colors.muted} />
                </Pressable>
              </View>
              {task.seriesId && (
                <View className="flex-row items-center gap-3 px-4">
                  <Repeat2 size={16} color={colors.muted} />
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setEditingSeries(!editingSeries)}
                    className="min-h-12 justify-center"
                  >
                    <Text className="text-sm text-accent">
                      {editingSeries ? "Вернуться к повторению" : "Изменить всю серию"}
                    </Text>
                  </Pressable>
                </View>
              )}
              <View style={{ flexShrink: 1, minHeight: 0 }}>
                <TaskForm
                  key={`${task.id}:${editingSeries}`}
                  task={task}
                  editSeries={editingSeries}
                  dismissRef={dismissRef}
                  scheduling={task.scheduling}
                  onClose={close}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function ConflictsScreen() {
  const app = useApp();
  const [error, setError] = useState<string | null>(null);
  return (
    <AppShell>
      <Title
        title="Конфликты изменений"
        subtitle="Выберите, какие изменения сохранить. Другие задачи продолжают синхронизироваться."
      />
      <ErrorMessage>{error}</ErrorMessage>
      {app.local?.conflicts.map((conflict) => (
        <View key={conflict.id} className="mb-6 gap-4 border-b border-line pb-6">
          <Text className="text-base font-semibold text-ink">
            {conflict.local.kind === "task"
              ? conflict.local.data.title
              : conflict.local.kind === "calendar"
                ? "Расписание"
                : "Повторяющаяся задача"}
          </Text>
          <Text className="text-xs leading-5 text-muted">
            Изменения затрагивают:{" "}
            {conflict.fields.map((field) => conflictFieldNames[field] ?? "Параметры").join(", ")}
          </Text>
          <ConflictVersion label="На этом устройстве" document={conflict.local} />
          <ConflictVersion label="На сервере" document={conflict.remote} />
          <View className="flex-row flex-wrap gap-3">
            <Button
              onPress={() => {
                void app.store
                  .resolve(conflict.id, "local")
                  .catch((cause) => setError(message(cause)));
              }}
            >
              Сохранить мои изменения
            </Button>
            <Button
              secondary
              onPress={() => {
                void app.store
                  .resolve(conflict.id, "remote")
                  .catch((cause) => setError(message(cause)));
              }}
            >
              Использовать серверные
            </Button>
          </View>
        </View>
      ))}
      {!app.local?.conflicts.length && (
        <Text className="text-sm text-muted">Все конфликты разрешены.</Text>
      )}
    </AppShell>
  );
}

const conflictFieldNames: Record<string, string> = {
  title: "Название",
  description: "Описание",
  scheduling: "Срок",
  priority: "Приоритет",
  completed: "Выполнение",
  completedAt: "Время выполнения",
  deleted: "Удаление",
  order: "Порядок",
  rules: "Правила повторения",
  versions: "Расписание",
  frozen: "История",
  mode: "Часовой пояс",
  creation: "Создание",
};
function ConflictVersion({ label, document }: { label: string; document: Document | null }) {
  const app = useApp();
  let lines: string[];
  if (!document) lines = ["Записи ещё нет"];
  else if (document.kind === "task") {
    const task = document.data;
    const when = task.scheduling;
    const slotId = when.kind === "polyday" ? when.slotId : null;
    const slot = app.calendar
      ? activeVersion(app.calendar, app.now).slots.find((item) => item.id === slotId)
      : null;
    const schedule =
      when.kind === "backlog"
        ? "Бэклог"
        : when.kind === "deadline"
          ? `Дедлайн: ${when.date}, ${when.time}`
          : `${when.date} · ${slot?.name ?? "Полидень"}`;
    lines = [
      task.deleted ? "Задача удалена" : task.completed ? "Выполнена" : "Не выполнена",
      task.title,
      task.description,
      schedule,
      ["", "Высокий приоритет", "Средний приоритет", "Низкий приоритет", "Без приоритета"][
        task.priority
      ] ?? "",
    ];
  } else if (document.kind === "calendar") {
    const version = activeVersion(document.data, app.now);
    lines = [
      version.timeZone,
      ...version.slots.map((slot) => `${slot.name}: ${slot.start}–${slot.end}`),
    ];
  } else {
    const rule = document.data.rules.at(-1);
    lines = rule
      ? [
          document.data.deleted ? "Серия удалена" : rule.title,
          rule.description,
          `С ${rule.startDate}${rule.endDate ? ` по ${rule.endDate}` : ""}`,
          rule.recurrence.kind === "every-polyday"
            ? "Каждый полидень"
            : rule.recurrence.kind === "time"
              ? `В ${rule.recurrence.time}`
              : "В выбранном полидне",
        ]
      : ["Пустая серия"];
  }
  return (
    <View className="gap-2 rounded-md bg-sidebar p-4">
      <Text className="text-xs font-semibold text-muted">{label}</Text>
      {lines.filter(Boolean).map((line, index) => (
        <Text key={index} className="text-sm leading-5 text-ink">
          {line}
        </Text>
      ))}
    </View>
  );
}
