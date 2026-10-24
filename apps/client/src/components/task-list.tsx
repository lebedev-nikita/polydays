import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { enqueue } from "@polydays/sync";
import { Check, CircleCheck, Plus, Repeat2 } from "lucide-react-native";
import type { Scheduling, TaskView } from "@polydays/core";
import { useApp } from "./provider";
import { colors, ErrorMessage } from "./primitives";
import { TaskComposer, TaskForm } from "./task-editor";
import { message } from "../data/store";

export function TaskList({
  rows,
  scheduling,
  includeCompleted = false,
  showOrigin = false,
}: {
  rows: ReadonlyArray<TaskView>;
  scheduling: Scheduling;
  includeCompleted?: boolean;
  showOrigin?: boolean;
}) {
  const { store, now } = useApp();
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
  return (
    <View>
      <ErrorMessage>{error}</ErrorMessage>
      {shown.map((view) => (
        <View
          key={view.task.id}
          className="min-h-[70px] flex-row items-start gap-2 border-b border-line py-2"
        >
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: view.task.completed }}
            aria-checked={view.task.completed}
            accessibilityLabel={`${view.task.completed ? "Вернуть в работу" : "Завершить"}: ${view.task.title}`}
            onPress={() => {
              const complete = () => {
                void store
                  .complete(view.task, !view.task.completed)
                  .then(() => {
                    if (editing === view.task.id) setEditing(null);
                  })
                  .catch((cause) => setError(message(cause)));
              };
              if (editing === view.task.id && changeRequest.current)
                changeRequest.current(complete);
              else complete();
            }}
            className="h-12 w-12 items-center justify-center"
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
                    : `${colors.priorities[view.task.priority]}14`,
              }}
            >
              {view.task.completed && <Check size={12} color="white" strokeWidth={3} />}
            </View>
          </Pressable>
          {editing === view.task.id ? (
            <View className="min-w-0 flex-1">
              <TaskForm
                key={`${view.task.id}:${editingSeries}`}
                inline
                task={view.task}
                scheduling={view.task.scheduling}
                editSeries={editingSeries}
                changeRequest={changeRequest}
                onSwitchSeries={
                  view.task.seriesId ? () => setEditingSeries(!editingSeries) : undefined
                }
                onClose={() => setEditing(null)}
                onReorder={
                  view.task.completed ? undefined : (direction) => reorder(view, direction)
                }
                onDelete={async () => {
                  await store.save(
                    { kind: "task", data: { ...view.task, deleted: true } },
                    { kind: "task", data: view.task },
                  );
                  setEditing(null);
                }}
              />
            </View>
          ) : (
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
          )}
        </View>
      ))}
      {!shown.length && (
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
      )}
      {!includeCompleted && (
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
