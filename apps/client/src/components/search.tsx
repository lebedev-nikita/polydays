import { useEffect, useState, type ReactNode } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link } from "expo-router";
import { Search, X, CircleCheck } from "lucide-react-native";
import { activeVersion, addDays, dateAt, expandedTasks, sortTasks, taskView } from "@polydays/core";
import { useApp } from "./provider";
import { colors } from "./primitives";
import { KeyboardAvoidingView } from "./keyboard";

export function Overlay({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", close, true);
    return () => document.removeEventListener("keydown", close, true);
  }, [onClose]);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 items-center justify-start bg-black/30 px-4 pb-8 pt-[12%]"
      >
        <Pressable
          accessibilityLabel="Закрыть окно"
          onPress={onClose}
          className="absolute inset-0"
        />
        <View
          accessibilityViewIsModal
          accessibilityLabel={label}
          className="max-h-[85%] w-full max-w-[640px] overflow-hidden rounded-xl bg-white shadow-xl"
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function SearchDialog({ onClose }: { onClose: () => void }) {
  const { tasks, series, calendar, now } = useApp();
  const [query, setQuery] = useState("");
  const [completed, setCompleted] = useState(false);
  const today = calendar ? dateAt(now, activeVersion(calendar, now).timeZone) : "2026-01-01";
  const all = calendar ? expandedTasks(tasks, series, calendar, addDays(today, 30)) : [];
  const words = query.toLocaleLowerCase("ru").trim().split(/\s+/).filter(Boolean);
  const rows = calendar
    ? sortTasks(
        all
          .filter(
            (task) =>
              !task.deleted &&
              (completed || !task.completed) &&
              words.every((word) =>
                `${task.title} ${task.description}`.toLocaleLowerCase("ru").includes(word),
              ),
          )
          .map((task) => taskView(task, calendar, now)),
      )
    : [];
  return (
    <Overlay label="Поиск задач" onClose={onClose}>
      <View className="flex-row items-center gap-3 border-b border-line px-4 py-3">
        <Search size={21} color={colors.muted} />
        <TextInput
          accessibilityLabel="Поиск задач"
          placeholder="Поиск задач"
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          className="min-h-10 flex-1 text-base text-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть поиск"
          onPress={onClose}
          className="h-9 w-9 items-center justify-center rounded-md hover:bg-sidebar"
        >
          <X size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text accessibilityLiveRegion="polite" className="text-xs font-semibold text-muted">
          {query.trim() ? `Найдено: ${rows.length}` : "Ваши задачи"}
        </Text>
        <Pressable
          accessibilityRole="checkbox"
          aria-checked={completed}
          onPress={() => setCompleted(!completed)}
          className="min-h-8 flex-row items-center gap-2"
        >
          <CircleCheck size={15} color={completed ? colors.accent : colors.muted} />
          <Text className="text-xs text-muted">Включая выполненные</Text>
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
      >
        {rows.slice(0, 100).map(({ task, polyday, overdue }) => (
          <Link key={task.id} href={{ pathname: "/task/[id]", params: { id: task.id } }} asChild>
            <Pressable
              accessibilityLabel={`Найденная задача: ${task.title}`}
              onPress={onClose}
              className="min-h-14 flex-row items-center gap-3 rounded-md px-3 py-2 hover:bg-sidebar"
            >
              <View
                className="h-4 w-4 rounded-full border"
                style={{ borderColor: colors.priorities[task.priority] }}
              />
              <View className="flex-1 gap-1">
                <Text className={`text-sm text-ink ${task.completed ? "line-through" : ""}`}>
                  {task.title}
                </Text>
                <Text className={`text-xs ${overdue ? "text-accent" : "text-muted"}`}>
                  {polyday ? `${polyday.name} · ${polyday.date}` : "Входящие"}
                  {task.completed ? " · Выполнена" : ""}
                </Text>
              </View>
            </Pressable>
          </Link>
        ))}
        {!rows.length && (
          <View className="items-center gap-3 px-5 py-12">
            <Search size={30} color={colors.muted} />
            <Text className="text-base font-semibold text-ink">Ничего не найдено</Text>
          </View>
        )}
      </ScrollView>
      <Text className="px-4 py-3 text-[11px] text-muted">Повторения на ближайшие 30 дней</Text>
    </Overlay>
  );
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Overlay label="Горячие клавиши" onClose={onClose}>
      <View className="flex-row items-center justify-between border-b border-line px-5 py-3">
        <Text className="text-lg font-semibold text-ink">Горячие клавиши</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть подсказки"
          onPress={onClose}
          className="h-9 w-9 items-center justify-center"
        >
          <X size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View className="gap-3 p-5">
        {[
          ["Добавить задачу", "Q"],
          ["Поиск", "/ или ⌘/Ctrl K"],
          ["Добавить из названия", "Enter"],
          ["Завершить выбранную задачу", "E"],
          ["Приоритет выбранной задачи", "1–4"],
          ["Приоритет при вводе", "!!1–!!4 + пробел"],
          ["Закрыть параметры или форму", "Esc"],
          ["Эта подсказка", "?"],
        ].map(([label, keys]) => (
          <View key={label} className="flex-row items-center justify-between gap-4">
            <Text className="flex-1 text-sm text-ink">{label}</Text>
            <Text className="rounded-md bg-sidebar px-2 py-1 text-xs text-muted">{keys}</Text>
          </View>
        ))}
      </View>
    </Overlay>
  );
}
