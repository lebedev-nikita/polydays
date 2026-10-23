import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import {
  Check,
  CircleCheck,
  Plus,
  Repeat2,
  Pencil,
  MoreHorizontal,
  Flag,
  Trash2,
  CalendarDays,
} from "lucide-react-native";
import type { Scheduling, TaskView, Task } from "@polydays/core";
import { useApp, useNotice } from "./provider";
import { colors, ErrorMessage } from "./primitives";
import { TaskForm } from "./task-editor";
import { message } from "../data/store";
import { undoTask } from "../data/undo";

export function TaskList({
  rows,
  scheduling,
  includeCompleted = false,
  showOrigin = false,
  compactEmpty = false,
}: {
  rows: ReadonlyArray<TaskView>;
  scheduling: Scheduling;
  includeCompleted?: boolean;
  showOrigin?: boolean;
  compactEmpty?: boolean;
}) {
  const { store } = useApp();
  const notify = useNotice();
  const [editing, setEditing] = useState<{ task: Task; panel?: "schedule" } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = rows.filter((row) => includeCompleted || !row.task.completed);
  const listRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target;
      if (
        event.key === "Escape" &&
        menu &&
        target instanceof HTMLElement &&
        (listRef.current as unknown as HTMLElement | null)?.contains(target)
      ) {
        event.preventDefault();
        setMenu(null);
        return;
      }
      if (
        !(target instanceof HTMLElement) ||
        !target.closest("a") ||
        !(listRef.current as unknown as HTMLElement | null)?.contains(target)
      )
        return;
      const id = decodeURIComponent(
        new URL(target.closest("a")!.href).pathname.split("/").at(-1) ?? "",
      );
      const task = rows.find((row) => row.task.id === id)?.task;
      if (!task) return;
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        void store
          .complete(task, !task.completed)
          .then(() => notify("Задача выполнена", () => undoTask(store, task, "completion")))
          .catch((cause) => setError(message(cause)));
      }
      if (/^[1-4]$/.test(event.key)) {
        event.preventDefault();
        void store
          .save(
            { kind: "task", data: { ...task, priority: Number(event.key) as 1 | 2 | 3 | 4 } },
            { kind: "task", data: task },
          )
          .catch((cause) => setError(message(cause)));
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [rows, store, notify, menu]);
  return (
    <View ref={listRef}>
      <ErrorMessage>{error}</ErrorMessage>
      {shown.map((view) => (
        <View key={view.task.id} className="group min-h-[54px] border-b border-line">
          {editing?.task.id === view.task.id ? (
            <View className="my-2 overflow-hidden rounded-lg border border-line">
              <TaskForm
                task={view.task}
                scheduling={view.task.scheduling}
                initialPanel={editing.panel}
                onClose={() => setEditing(null)}
                inline
              />
            </View>
          ) : (
            <View className="flex-row items-start">
              <Pressable
                accessibilityRole="checkbox"
                aria-checked={view.task.completed}
                accessibilityLabel={`${view.task.completed ? "Вернуть в работу" : "Завершить"}: ${view.task.title}`}
                onPress={() => {
                  void store
                    .complete(view.task, !view.task.completed)
                    .then(() =>
                      notify(
                        view.task.completed ? "Задача возвращена в работу" : "Задача выполнена",
                        () => undoTask(store, view.task, "completion"),
                      ),
                    )
                    .catch((cause) => setError(message(cause)));
                }}
                className="h-12 w-11 items-center md:w-8 justify-center"
              >
                <View
                  className="h-[19px] w-[19px] items-center justify-center rounded-full"
                  style={{
                    borderWidth: 1.7,
                    borderColor: colors.priorities[view.task.priority],
                    backgroundColor: view.task.completed
                      ? colors.priorities[view.task.priority]
                      : view.task.priority === 4
                        ? "transparent"
                        : `${colors.priorities[view.task.priority]}18`,
                  }}
                >
                  {view.task.completed && <Check size={12} color="white" strokeWidth={3} />}
                </View>
              </Pressable>
              <Link href={{ pathname: "/task/[id]", params: { id: view.task.id } }} asChild>
                <Pressable
                  accessibilityLabel={`Открыть задачу: ${view.task.title}`}
                  className="min-h-12 flex-1 justify-center py-2"
                >
                  <Text
                    className={`text-[15px] leading-[22px] ${view.task.completed ? "text-muted line-through" : "text-ink"}`}
                  >
                    {view.task.title}
                  </Text>
                  {view.task.description ? (
                    <Text numberOfLines={1} className="mt-1 text-xs leading-5 text-muted">
                      {view.task.description}
                    </Text>
                  ) : null}
                  {(view.task.scheduling.kind === "deadline" ||
                    view.overdue ||
                    (showOrigin && view.polyday) ||
                    view.inSleepGap ||
                    view.task.seriesId) && (
                    <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                      {view.task.scheduling.kind === "deadline" && (
                        <Text className={`text-xs ${view.overdue ? "text-accent" : "text-muted"}`}>
                          {view.task.scheduling.time}
                        </Text>
                      )}
                      {view.overdue && (
                        <Text className="text-xs text-accent">
                          Просрочено
                          {view.polyday ? ` · ${view.polyday.date}, ${view.polyday.name}` : ""}
                        </Text>
                      )}
                      {showOrigin && !view.overdue && view.polyday && (
                        <Text className="text-xs text-muted">
                          {view.polyday.name} · {view.polyday.date}
                        </Text>
                      )}
                      {view.inSleepGap && (
                        <Text className="text-xs text-[#76501b]">Во время сна</Text>
                      )}
                      {view.task.seriesId && <Repeat2 size={12} color={colors.muted} />}
                    </View>
                  )}
                </Pressable>
              </Link>
              <View className="flex-row pt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Изменить: ${view.task.title}`}
                  onPress={() => setEditing({ task: view.task })}
                  className="h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar"
                >
                  <Pencil size={15} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Срок: ${view.task.title}`}
                  onPress={() => setEditing({ task: view.task, panel: "schedule" })}
                  className="hidden h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar md:flex"
                >
                  <CalendarDays size={16} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Другие действия: ${view.task.title}`}
                  aria-expanded={menu === view.task.id}
                  onPress={() => setMenu(menu === view.task.id ? null : view.task.id)}
                  className="h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar"
                >
                  <MoreHorizontal size={18} color={colors.muted} />
                </Pressable>
              </View>
            </View>
          )}
          {menu === view.task.id && (
            <View className="mb-2 ml-8 gap-1 rounded-lg border border-line bg-white p-2">
              <Text className="px-2 py-1 text-xs text-muted">Приоритет</Text>
              <View className="flex-row gap-2">
                {([1, 2, 3, 4] as const).map((priority) => (
                  <Pressable
                    key={priority}
                    accessibilityRole="button"
                    accessibilityLabel={`Установить P${priority}: ${view.task.title}`}
                    onPress={() => {
                      void store
                        .save(
                          { kind: "task", data: { ...view.task, priority } },
                          { kind: "task", data: view.task },
                        )
                        .catch((cause) => setError(message(cause)));
                      setMenu(null);
                    }}
                    className={`h-9 flex-1 flex-row items-center justify-center gap-2 rounded-md hover:bg-sidebar ${priority === view.task.priority ? "bg-sidebar" : ""}`}
                  >
                    <Flag size={15} color={colors.priorities[priority]} />
                    <Text className="text-xs text-ink">P{priority}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Удалить: ${view.task.title}`}
                onPress={() => {
                  void store
                    .save(
                      { kind: "task", data: { ...view.task, deleted: true } },
                      { kind: "task", data: view.task },
                    )
                    .then(() =>
                      notify("Задача удалена", () => undoTask(store, view.task, "deletion")),
                    )
                    .catch((cause) => setError(message(cause)));
                  setMenu(null);
                }}
                className="min-h-[36px] flex-row items-center gap-2 rounded-md px-2 hover:bg-sidebar"
              >
                <Trash2 size={15} color={colors.accent} />
                <Text className="text-sm text-accent">Удалить задачу</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
      {!shown.length && !compactEmpty && !composer && (
        <View className="items-center gap-3 py-12">
          <CircleCheck size={34} color="#a69b89" strokeWidth={1.2} />
          <Text className="text-base font-semibold text-ink">
            {includeCompleted ? "Пока нет выполненных задач" : "Здесь пока нет задач"}
          </Text>
          <Text className="max-w-[300px] text-center text-sm leading-5 text-muted">
            {includeCompleted
              ? "Сделанное останется в истории этого полидня."
              : "Добавьте задачу или запланируйте её из бэклога."}
          </Text>
        </View>
      )}
      {!includeCompleted && !composer && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setComposer(true)}
          className="min-h-10 flex-row items-center gap-2 py-2 hover:bg-sidebar"
        >
          <Plus size={19} color={colors.accent} />
          <Text className="text-[14px] text-muted">Добавить задачу</Text>
        </Pressable>
      )}
      {composer && (
        <View className="my-2 overflow-hidden rounded-lg border border-line">
          <TaskForm inline scheduling={scheduling} onClose={() => setComposer(false)} />
        </View>
      )}
    </View>
  );
}
