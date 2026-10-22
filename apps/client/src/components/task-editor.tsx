import { useRef, useState, type ComponentRef } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { X, Flag, Repeat2 } from "lucide-react-native";
import * as Crypto from "expo-crypto";
import {
  activeVersion,
  addDays,
  dateAt,
  ruleForDate,
  systemNow,
  type Recurrence,
  type Scheduling,
  type Series,
  type Task,
} from "@polydays/core";
import { useApp } from "./provider";
import { Button, ErrorMessage, Field, colors, priorityName } from "./primitives";
import { message } from "../data/store";

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
type FormProps = {
  readonly scheduling: Scheduling;
  readonly task?: Task;
  readonly onClose: () => void;
  readonly editSeries?: boolean;
};

export function TaskComposer({
  visible,
  onClose,
  scheduling,
}: {
  visible: boolean;
  onClose: () => void;
  scheduling: Scheduling;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 items-center justify-center bg-black/30 px-4 py-8"
      >
        <View className="max-h-[90%] w-full max-w-[560px] rounded-xl bg-white shadow-xl">
          {visible && <TaskForm scheduling={scheduling} onClose={onClose} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function TaskForm({ scheduling, task, onClose, editSeries = false }: FormProps) {
  const { store, calendar, series, now } = useApp();
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const zone = calendar ? activeVersion(calendar, now).timeZone : "UTC";
  const today = dateAt(now, zone);
  const sourceSeries = editSeries ? series.find((item) => item.id === task?.seriesId) : undefined;
  const seriesRule = sourceSeries ? ruleForDate(sourceSeries, addDays(today, 1)) : undefined;
  const [title, setTitle] = useState(seriesRule?.title ?? task?.title ?? "");
  const [description, setDescription] = useState(
    seriesRule?.description ?? task?.description ?? "",
  );
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(
    seriesRule?.priority ?? task?.priority ?? 4,
  );
  const initial = task?.scheduling ?? scheduling;
  const [kind, setKind] = useState<Scheduling["kind"]>(initial.kind);
  const [date, setDate] = useState(initial.kind === "backlog" ? today : initial.date);
  const slots = calendar ? activeVersion(calendar, now).slots : [];
  const [slotId, setSlotId] = useState(
    initial.kind === "polyday" ? initial.slotId : (slots[0]?.id ?? ""),
  );
  const [time, setTime] = useState(initial.kind === "deadline" ? initial.time : "09:00");
  const [repeat, setRepeat] = useState<"none" | "every-polyday" | "polyday" | "time">(
    seriesRule?.recurrence.kind ?? "none",
  );
  const [weekdays, setWeekdays] = useState<ReadonlyArray<number>>(
    seriesRule && seriesRule.recurrence.kind !== "every-polyday"
      ? seriesRule.recurrence.weekdays
      : [],
  );
  const [startDate, setStartDate] = useState(seriesRule?.startDate ?? today);
  const [endDate, setEndDate] = useState(seriesRule?.endDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submit = async () => {
    if (!calendar) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      if (!title.trim()) throw new Error("Введите название задачи.");
      const when: Scheduling =
        kind === "backlog"
          ? { kind }
          : kind === "polyday"
            ? { kind, date, slotId }
            : { kind, date, time };
      if (repeat !== "none") {
        if (endDate && endDate < startDate)
          throw new Error("Окончание серии должно быть не раньше начала.");
        const recurrence: Recurrence =
          repeat === "every-polyday"
            ? { kind: repeat }
            : repeat === "polyday"
              ? { kind: repeat, slotId, weekdays }
              : { kind: repeat, time, weekdays };
        const rule = {
          effectiveDate: sourceSeries ? addDays(today, 1) : startDate,
          title: title.trim(),
          description,
          priority,
          recurrence,
          startDate,
          endDate: endDate || null,
        };
        const next: Series = {
          id: sourceSeries?.id ?? Crypto.randomUUID(),
          rules: [
            ...(sourceSeries?.rules.filter((item) => item.effectiveDate < rule.effectiveDate) ??
              []),
            rule,
          ],
          deleted: false,
          createdAt: sourceSeries?.createdAt ?? systemNow(),
        };
        await store.save(
          { kind: "series", data: next },
          sourceSeries ? { kind: "series", data: sourceSeries } : undefined,
        );
      } else {
        const next: Task = {
          id: task?.id ?? Crypto.randomUUID(),
          title: title.trim(),
          description,
          priority,
          order: task?.order ?? systemNow(),
          scheduling: when,
          completed: task?.completed ?? false,
          completedAt: task?.completedAt ?? null,
          deleted: task?.deleted ?? false,
          createdAt: task?.createdAt ?? systemNow(),
          seriesId: task?.seriesId ?? null,
          occurrenceDate: task?.occurrenceDate ?? null,
        };
        await store.save(
          { kind: "task", data: next },
          task ? { kind: "task", data: task } : undefined,
        );
      }
      if (task) onClose();
      else {
        setTitle("");
        setDescription("");
        setSaved(true);
        titleRef.current?.focus();
      }
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const choices = (
    [
      { kind: "backlog", label: "Бэклог" },
      { kind: "polyday", label: "Полидень" },
      { kind: "deadline", label: "Дата и время" },
    ] as const
  ).filter(
    (choice) =>
      task?.scheduling.kind !== "deadline" || kind !== "deadline" || choice.kind === "deadline",
  );
  return (
    <View style={{ flexShrink: 1, minHeight: 0 }}>
      <View className="flex-row items-center justify-between border-b border-line px-5 py-3">
        <Text className="text-base font-semibold text-ink">
          {editSeries ? "Изменить серию" : task ? "Задача" : "Новая задача"}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть"
          onPress={onClose}
          className="h-12 w-12 items-center justify-center"
        >
          <X size={21} color={colors.muted} />
        </Pressable>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 22, gap: 18 }}
      >
        <TextInput
          ref={titleRef}
          accessibilityLabel="Название задачи"
          placeholder="Что нужно сделать?"
          placeholderTextColor="#77736d"
          autoFocus
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={() => {
            void submit();
          }}
          className="min-h-12 text-xl font-semibold text-ink"
        />
        <Field
          label="Описание"
          placeholder="Добавить подробности"
          multiline
          value={description}
          onChangeText={setDescription}
        />
        {!editSeries && (
          <View className="gap-3">
            <Text className="text-xs font-semibold text-muted">Когда выполнить</Text>
            <View className="flex-row gap-2">
              {choices.map((choice) => (
                <Pressable
                  key={choice.kind}
                  onPress={() => setKind(choice.kind)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: kind === choice.kind }}
                  className={`min-h-12 flex-1 items-center justify-center rounded-md border px-2 ${kind === choice.kind ? "border-accent bg-selected" : "border-line"}`}
                >
                  <Text
                    className={`text-xs ${kind === choice.kind ? "font-semibold text-accent" : "text-muted"}`}
                  >
                    {choice.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {kind !== "backlog" && (
              <Field
                label={
                  kind === "deadline"
                    ? "Дата дедлайна · ГГГГ-ММ-ДД"
                    : "Дата начала полидня · ГГГГ-ММ-ДД"
                }
                value={date}
                onChangeText={setDate}
                placeholder="2026-10-23"
              />
            )}
            {kind === "deadline" && (
              <Field
                label="Время дедлайна · ЧЧ:ММ"
                value={time}
                onChangeText={setTime}
                placeholder="09:00"
              />
            )}
            {kind === "polyday" && (
              <SlotChoices slots={slots} value={slotId} onChange={setSlotId} />
            )}
            {kind === "deadline" && (
              <View className="gap-2">
                <Text className="text-xs leading-5 text-muted">
                  Полидень определится по дате и времени дедлайна.
                </Text>
                {task?.scheduling.kind === "deadline" && (
                  <Button secondary onPress={() => setKind("backlog")}>
                    Убрать дедлайн
                  </Button>
                )}
              </View>
            )}
          </View>
        )}
        <View className="gap-2">
          <View className="flex-row items-center gap-2">
            <Flag size={14} color={colors.muted} />
            <Text className="text-xs font-semibold text-muted">Приоритет</Text>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {([1, 2, 3, 4] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setPriority(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: value === priority }}
                className={`min-h-12 flex-row items-center gap-2 rounded-md border px-3 ${value === priority ? "border-[#aaa49a] bg-sidebar" : "border-line"}`}
              >
                <Flag size={13} color={colors.priorities[value]} />
                <Text className="text-xs text-ink">{priorityName(value)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {(!task || editSeries) && (
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Repeat2 size={14} color={colors.muted} />
              <Text className="text-xs font-semibold text-muted">Повторение</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {(
                [
                  { value: "none", label: "Один раз" },
                  { value: "every-polyday", label: "Каждый полидень" },
                  { value: "polyday", label: "В выбранном полидне" },
                  { value: "time", label: "В точное время" },
                ] as const
              )
                .filter((item) => !editSeries || item.value !== "none")
                .map((item) => (
                  <Pressable
                    accessibilityRole="button"
                    key={item.value}
                    onPress={() => setRepeat(item.value)}
                    className={`min-h-12 justify-center rounded-md border px-3 ${repeat === item.value ? "border-accent bg-selected" : "border-line"}`}
                  >
                    <Text className="text-xs text-ink">{item.label}</Text>
                  </Pressable>
                ))}
            </View>
            {repeat === "polyday" && (
              <SlotChoices slots={slots} value={slotId} onChange={setSlotId} />
            )}
            {repeat === "time" && (
              <Field label="Время дедлайна · ЧЧ:ММ" value={time} onChangeText={setTime} />
            )}
            {(repeat === "polyday" || repeat === "time") && (
              <View className="gap-2">
                <Text className="text-xs text-muted">Дни недели · пусто означает ежедневно</Text>
                <View className="flex-row flex-wrap gap-1">
                  {days.map((name, index) => (
                    <Pressable
                      key={name}
                      accessibilityLabel={name}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: weekdays.includes(index + 1) }}
                      onPress={() =>
                        setWeekdays(
                          weekdays.includes(index + 1)
                            ? weekdays.filter((item) => item !== index + 1)
                            : [...weekdays, index + 1],
                        )
                      }
                      className={`h-12 min-w-12 items-center justify-center rounded-md px-2 ${weekdays.includes(index + 1) ? "bg-selected" : "bg-sidebar"}`}
                    >
                      <Text className="text-xs text-ink">{name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            {repeat !== "none" && (
              <>
                <Field
                  label="Начало серии · ГГГГ-ММ-ДД"
                  value={startDate}
                  onChangeText={setStartDate}
                />
                <Field
                  label="Окончание серии · необязательно"
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="ГГГГ-ММ-ДД"
                />
              </>
            )}
            {editSeries && (
              <Text className="text-xs leading-5 text-muted">
                Изменения применятся к будущим повторениям с завтрашнего дня. Прошлые и выполненные
                задачи сохранятся.
              </Text>
            )}
          </View>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        {saved && (
          <Text accessibilityLiveRegion="polite" className="text-sm text-[#317043]">
            Задача сохранена. Можно добавить следующую.
          </Text>
        )}
      </ScrollView>
      <View className="flex-row justify-end gap-3 border-t border-line px-5 py-4">
        <Button secondary onPress={onClose}>
          Закрыть
        </Button>
        <Button
          disabled={busy || !title.trim()}
          onPress={() => {
            void submit();
          }}
        >
          {task ? "Сохранить" : "Добавить задачу"}
        </Button>
      </View>
    </View>
  );
}

export function SlotChoices({
  slots,
  value,
  onChange,
}: {
  slots: ReadonlyArray<{ id: string; name: string; start: string; end: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View className="gap-2">
      {slots.map((slot) => (
        <Pressable
          key={slot.id}
          accessibilityRole="radio"
          accessibilityState={{ selected: slot.id === value }}
          onPress={() => onChange(slot.id)}
          className={`min-h-12 flex-row items-center justify-between rounded-md border px-3 ${slot.id === value ? "border-accent bg-selected" : "border-line"}`}
        >
          <Text className="text-sm text-ink">{slot.name}</Text>
          <Text className="text-xs text-muted">
            {slot.start}–{slot.end}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
