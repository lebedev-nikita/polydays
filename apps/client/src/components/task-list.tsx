import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { enqueue } from "@polydays/sync";
import {
  CalendarDays,
  CircleCheck,
  Flag,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat2,
  Trash2,
} from "lucide-react-native";
import { taskView, type Scheduling, type TaskView } from "@polydays/core";
import { useApp, useNotice } from "./provider";
import { colors, ErrorMessage } from "./primitives";
import { TaskComposer, TaskForm } from "./task-editor";
import { TaskEditor, useTaskEditorSheet } from "./task-editor-sheet";
import { message } from "../data/store";
import { TaskCompletion } from "./task-completion";
import { undoTask } from "../data/undo";

export function TaskList({
  rows,
  scheduling,
  includeCompleted = false,
  showOrigin = false,
  emptyLabel,
}: {
  rows: ReadonlyArray<TaskView>;
  scheduling: Scheduling;
  includeCompleted?: boolean;
  showOrigin?: boolean;
  emptyLabel?: string;
}) {
  const { store, now, tasks, calendar } = useApp();
  const notify = useNotice();
  const listRef = useRef<ComponentRef<typeof View>>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [initialPanel, setInitialPanel] = useState<"schedule" | undefined>();
  const sheet = useTaskEditorSheet();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const [editing, setEditing] = useState(taskId ?? null);
  const [editingSeries, setEditingSeries] = useState(false);
  const changeRequest = useRef<((action: () => void) => void) | null>(null);
  const openTask = (id: string, panel?: "schedule") => {
    const open = () => {
      setEditingSeries(false);
      setInitialPanel(panel);
      setMenu(null);
      setEditing(id);
    };
    if (changeRequest.current) changeRequest.current(open);
    else open();
  };
  const reorder = async (view: TaskView, direction: -1 | 1) => {
    const group = rows.filter(
      (row) =>
        !row.task.completed &&
        row.task.priority === view.task.priority &&
        row.polyday?.id === view.polyday?.id,
    );
    const index = group.findIndex((row) => row.task.id === view.task.id);
    if (index + direction < 0 || index + direction >= group.length) return;
    const reordered = [...group];
    const moved = reordered.splice(index, 1)[0];
    if (!moved) return;
    reordered.splice(index + direction, 0, moved);
    await store.update((state) => {
      let next = state;
      for (const [rank, row] of reordered.entries())
        next = enqueue(
          next,
          { kind: "task", data: { ...row.task, order: rank } },
          Crypto.randomUUID(),
          now,
        );
      return next;
    });
    void store.sync();
  };
  const [composer, setComposer] = useState<"inline" | "modal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const keydown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!(listRef.current as unknown as HTMLElement | null)?.contains(target)) return;
      if (event.key === "Escape" && menu) {
        event.preventDefault();
        setMenu(null);
        return;
      }
      const id = target.closest('[id^="task-open-"]')?.id.slice("task-open-".length);
      const task = rows.find((row) => row.task.id === id)?.task;
      if (!task) return;
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        void store
          .complete(task, !task.completed)
          .then(() =>
            notify(task.completed ? "Задача возвращена в работу" : "Задача выполнена", () =>
              undoTask(store, task, "completion"),
            ),
          )
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
  const shown = rows.filter((row) => includeCompleted || !row.task.completed);
  const editingView = useRef<TaskView | null>(null);
  const visibleEditor = shown.find((row) => row.task.id === editing);
  if (visibleEditor) editingView.current = visibleEditor;
  // A reschedule can remove this row from its list while its text draft is still open.
  if (!visibleEditor && editingView.current?.task.id === editing && calendar) {
    const latest = tasks.find((task) => task.id === editing) ?? editingView.current.task;
    if (!latest.deleted) shown.push(taskView(latest, calendar, now));
  }
  const selected = shown.find((view) => view.task.id === editing);
  const renderEditor = (view: TaskView) => (
    <TaskEditor
      key={`${view.task.id}:${initialPanel ?? ""}`}
      initialPanel={initialPanel}
      task={view.task}
      scheduling={view.task.scheduling}
      editSeries={editingSeries}
      changeRequest={changeRequest}
      onSwitchSeries={view.task.seriesId ? () => setEditingSeries(!editingSeries) : undefined}
      onClose={() => setEditing(null)}
      onComplete={async () => {
        await store.complete(view.task, !view.task.completed);
        notify(view.task.completed ? "Задача возвращена в работу" : "Задача выполнена", () =>
          undoTask(store, view.task, "completion"),
        );
        setEditing(null);
      }}
      onReorder={view.task.completed ? undefined : (direction) => reorder(view, direction)}
      onDelete={async () => {
        await store.save(
          { kind: "task", data: { ...view.task, deleted: true } },
          { kind: "task", data: view.task },
        );
        notify("Задача удалена", () => undoTask(store, view.task, "deletion"));
        setEditing(null);
      }}
    />
  );
  return (
    <View ref={listRef}>
      <ErrorMessage>{error}</ErrorMessage>
      {shown.map((view) => (
        <View key={view.task.id} className="group min-h-[54px] border-b border-line">
          {editing === view.task.id && !sheet ? (
            <View className="min-w-0 flex-1">{renderEditor(view)}</View>
          ) : (
            <View className="flex-row items-start">
              <TaskCompletion
                task={view.task}
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
              />
              <Pressable
                nativeID={`task-open-${view.task.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Редактировать задачу: ${view.task.title}`}
                onPress={() => openTask(view.task.id)}
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
                  {view.inSleepGap && <Text className="text-xs text-[#76501b]">Во время сна</Text>}
                  {view.task.seriesId && <Repeat2 size={12} color={colors.muted} />}
                </View>
              </Pressable>
              <View className="flex-row pt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Изменить: ${view.task.title}`}
                  onPress={() => openTask(view.task.id)}
                  className="h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar"
                >
                  <Pencil size={15} color={colors.muted} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Срок: ${view.task.title}`}
                  onPress={() => openTask(view.task.id, "schedule")}
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
            <View className="mb-2 ml-8 gap-1 overflow-hidden rounded-lg border border-line bg-white p-2">
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
                    <Flag
                      size={15}
                      color={colors.priorities[priority]}
                      fill={priority === 4 ? "none" : colors.priorities[priority]}
                    />
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
      {sheet && selected && renderEditor(selected)}
      {!shown.length &&
        !composer &&
        (emptyLabel ? (
          <Text className="py-3 text-sm text-muted">{emptyLabel}</Text>
        ) : (
          <View className="items-center gap-3 py-12">
            <CircleCheck size={34} color="#a69b89" strokeWidth={1.2} />
            <Text className="text-base font-semibold text-ink">
              {includeCompleted ? "Пока нет выполненных задач" : "Здесь пока нет задач"}
            </Text>
            <Text className="max-w-[300px] text-center text-sm leading-5 text-muted">
              {includeCompleted
                ? "Сделанное останется в истории этого полидня."
                : "Добавьте задачу или запланируйте её из входящих."}
            </Text>
          </View>
        ))}
      {!includeCompleted && !composer && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setComposer(sheet ? "modal" : "inline")}
          className="min-h-10 flex-row items-center gap-2 py-2 hover:bg-sidebar"
        >
          <Plus size={19} color={colors.accent} />
          <Text className="text-[14px] text-muted">Добавить задачу</Text>
        </Pressable>
      )}
      {composer === "modal" ? (
        <TaskComposer visible scheduling={scheduling} onClose={() => setComposer(null)} />
      ) : composer === "inline" ? (
        <View className="my-2">
          <TaskForm inline scheduling={scheduling} onClose={() => setComposer(null)} />
        </View>
      ) : null}
    </View>
  );
}
