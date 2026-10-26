import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { enqueue } from "@polydays/sync";
import { CircleCheck, Plus, Repeat2 } from "lucide-react-native";
import { taskView, type Scheduling, type TaskView } from "@polydays/core";
import { useApp } from "./provider";
import { colors, ErrorMessage } from "./primitives";
import { TaskComposer } from "./task-editor";
import { TaskEditor, useTaskEditorSheet } from "./task-editor-sheet";
import { message } from "../data/store";
import { TaskCompletion } from "./task-completion";

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
  const sheet = useTaskEditorSheet();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const [editing, setEditing] = useState(taskId ?? null);
  const [editingSeries, setEditingSeries] = useState(false);
  const changeRequest = useRef<((action: () => void) => void) | null>(null);
  const openTask = (id: string) => {
    const open = () => {
      setEditingSeries(false);
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
  const [composer, setComposer] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      key={view.task.id}
      task={view.task}
      scheduling={view.task.scheduling}
      editSeries={editingSeries}
      changeRequest={changeRequest}
      onSwitchSeries={view.task.seriesId ? () => setEditingSeries(!editingSeries) : undefined}
      onClose={() => setEditing(null)}
      onComplete={async () => {
        await store.complete(view.task, !view.task.completed);
        setEditing(null);
      }}
      onReorder={view.task.completed ? undefined : (direction) => reorder(view, direction)}
      onDelete={async () => {
        await store.save(
          { kind: "task", data: { ...view.task, deleted: true } },
          { kind: "task", data: view.task },
        );
        setEditing(null);
      }}
    />
  );
  return (
    <View>
      <ErrorMessage>{error}</ErrorMessage>
      {shown.map((view) => (
        <View
          key={view.task.id}
          className="min-h-[70px] flex-row items-start gap-2 border-b border-line py-2"
        >
          {editing === view.task.id && !sheet ? (
            <View className="min-w-0 flex-1">{renderEditor(view)}</View>
          ) : (
            <>
              <TaskCompletion
                task={view.task}
                onPress={() => {
                  void store
                    .complete(view.task, !view.task.completed)
                    .catch((cause) => setError(message(cause)));
                }}
              />
              <Pressable
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
            </>
          )}
        </View>
      ))}
      {sheet && selected && renderEditor(selected)}
      {!shown.length &&
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
      {!includeCompleted && (!emptyLabel || shown.length > 0) && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setComposer(true)}
          className="min-h-12 flex-row items-center gap-3 px-2 py-3"
        >
          <Plus size={19} color={colors.accent} />
          <Text className="text-[14px] text-muted">Добавить задачу</Text>
        </Pressable>
      )}
      <TaskComposer visible={composer} scheduling={scheduling} onClose={() => setComposer(false)} />
    </View>
  );
}
