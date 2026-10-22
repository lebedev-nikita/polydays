import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Check, CircleCheck, Plus, Repeat2 } from "lucide-react-native";
import type { Scheduling, TaskView } from "@polydays/core";
import { useApp } from "./provider";
import { colors, ErrorMessage } from "./primitives";
import { TaskComposer } from "./task-editor";
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
  const { store } = useApp();
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
            accessibilityLabel={`${view.task.completed ? "Вернуть в работу" : "Завершить"}: ${view.task.title}`}
            onPress={() => {
              void store
                .complete(view.task, !view.task.completed)
                .catch((cause) => setError(message(cause)));
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
                  : "transparent",
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
              <View className="mt-1 flex-row flex-wrap items-center gap-x-3 gap-y-1">
                {view.task.scheduling.kind === "deadline" && (
                  <Text className={`text-xs ${view.overdue ? "text-accent" : "text-muted"}`}>
                    {view.task.scheduling.time}
                  </Text>
                )}
                {view.overdue && (
                  <Text className="text-xs text-accent">
                    Просрочено{view.polyday ? ` · ${view.polyday.date}, ${view.polyday.name}` : ""}
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
          </Link>
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
              : "Добавьте задачу или запланируйте её из бэклога."}
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
