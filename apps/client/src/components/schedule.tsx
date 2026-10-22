import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CheckCheck, Plus, Trash2 } from "lucide-react-native";
import * as Crypto from "expo-crypto";
import {
  activeVersion,
  addDays,
  changeTimeZone,
  dateAt,
  defaultSlots,
  systemNow,
  updateCalendar,
  validateCalendar,
  type Calendar,
  type Slot,
} from "@polydays/core";
import { documents, enqueue } from "@polydays/sync";
import { useApp } from "./provider";
import { Button, ErrorMessage, Field, colors } from "./primitives";
import { SlotChoices } from "./task-editor";
import { message } from "../data/store";

export function ScheduleEditor({ initial = false }: { initial?: boolean }) {
  const { store, calendar, now } = useApp();
  const current = calendar ? activeVersion(calendar, now) : null;
  const [slots, setSlots] = useState<ReadonlyArray<Slot>>(current?.slots ?? defaultSlots);
  const [zone, setZone] = useState(
    current?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [mode, setMode] = useState<"fixed" | "local">(calendar?.mode ?? "fixed");
  const [date, setDate] = useState(addDays(dateAt(now, zone), initial ? 0 : 1));
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const removed = current?.slots.filter((slot) => !slots.some((item) => item.id === slot.id)) ?? [];
  const edit = (id: string, patch: Partial<Slot>) =>
    setSlots(slots.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));
  const save = async () => {
    setError(null);
    setBusy(true);
    setSaved(false);
    try {
      if (removed.length && !destination)
        throw new Error("Выберите полидень для переноса задач из удалённых интервалов.");
      const version = { id: Crypto.randomUUID(), from: date, timeZone: zone, slots };
      const adjusted = calendar ? changeTimeZone(calendar, zone, systemNow()) : null;
      const next: Calendar = adjusted
        ? { ...updateCalendar(adjusted, version, systemNow()), mode }
        : validateCalendar({ id: "calendar", mode, versions: [version], frozen: [] });
      await store.update((state) => {
        let nextState = enqueue(
          state,
          { kind: "calendar", data: next },
          Crypto.randomUUID(),
          systemNow(),
        );
        const removedIds = new Set(removed.map((slot) => slot.id));
        for (const document of documents(state)) {
          if (
            document.kind === "task" &&
            !document.data.completed &&
            document.data.scheduling.kind === "polyday" &&
            document.data.scheduling.date >= date &&
            removedIds.has(document.data.scheduling.slotId)
          )
            nextState = enqueue(
              nextState,
              {
                kind: "task",
                data: {
                  ...document.data,
                  scheduling: { ...document.data.scheduling, slotId: destination },
                },
              },
              Crypto.randomUUID(),
              systemNow(),
            );
          if (document.kind === "series") {
            const latest = document.data.rules.at(-1);
            if (latest?.recurrence.kind === "polyday" && removedIds.has(latest.recurrence.slotId))
              nextState = enqueue(
                nextState,
                {
                  kind: "series",
                  data: {
                    ...document.data,
                    rules: [
                      ...document.data.rules.filter((rule) => rule.effectiveDate < date),
                      {
                        ...latest,
                        effectiveDate: date,
                        recurrence: { ...latest.recurrence, slotId: destination },
                      },
                    ],
                  },
                },
                Crypto.randomUUID(),
                systemNow(),
              );
          }
        }
        return nextState;
      });
      void store.sync();
      setSaved(true);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const body = (
    <View className="gap-6">
      {initial && (
        <View className="flex-row items-center gap-2">
          <CheckCheck size={25} color={colors.accent} />
          <Text className="text-lg font-bold text-ink">Polydays</Text>
        </View>
      )}
      <View className="gap-2">
        <Text className="text-2xl font-bold text-ink">
          {initial ? "Настройте свои полидни" : "Расписание полидней"}
        </Text>
        <Text className="text-sm leading-6 text-muted">
          Задайте интервалы бодрствования между снами. Расписание будет повторяться ежедневно;
          полидень может пересекать полночь.
        </Text>
      </View>
      {slots.map((slot, index) => (
        <View key={slot.id} className="gap-3 border-b border-line pb-5">
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Field
                label={`Полидень ${index + 1}`}
                value={slot.name}
                onChangeText={(name) => edit(slot.id, { name })}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Удалить полидень ${slot.name}`}
              onPress={() => setSlots(slots.filter((item) => item.id !== slot.id))}
              className="mt-5 h-12 w-12 items-center justify-center"
            >
              <Trash2 size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                label="Начало · ЧЧ:ММ"
                value={slot.start}
                onChangeText={(start) => edit(slot.id, { start })}
              />
            </View>
            <View className="flex-1">
              <Field
                label="Конец · ЧЧ:ММ"
                value={slot.end}
                onChangeText={(end) => edit(slot.id, { end })}
              />
            </View>
          </View>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          setSlots([
            ...slots,
            { id: Crypto.randomUUID(), name: "Новый полидень", start: "03:00", end: "05:00" },
          ])
        }
        className="min-h-12 flex-row items-center gap-2"
      >
        <Plus size={17} color={colors.accent} />
        <Text className="text-sm font-semibold text-accent">Добавить полидень</Text>
      </Pressable>
      <Field
        label="Часовой пояс"
        value={zone}
        onChangeText={setZone}
        autoCapitalize="none"
        placeholder="Asia/Tbilisi"
      />
      <View className="flex-row gap-3">
        {(
          [
            { value: "fixed", label: "Фиксированный пояс" },
            { value: "local", label: "Следовать местному" },
          ] as const
        ).map((choice) => (
          <Pressable
            accessibilityRole="button"
            key={choice.value}
            onPress={() => setMode(choice.value)}
            className={`min-h-12 flex-1 items-center justify-center rounded-md border px-3 ${choice.value === mode ? "border-accent bg-selected" : "border-line"}`}
          >
            <Text className="text-xs text-ink">{choice.label}</Text>
          </Pressable>
        ))}
      </View>
      {!initial && (
        <Field label="Применить с даты · ГГГГ-ММ-ДД" value={date} onChangeText={setDate} />
      )}
      {removed.length > 0 && (
        <View className="gap-3">
          <Text className="text-sm leading-5 text-ink">
            Куда перенести задачи без дедлайна из удалённых полидней?
          </Text>
          <SlotChoices slots={slots} value={destination} onChange={setDestination} />
        </View>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {saved && (
        <Text accessibilityLiveRegion="polite" className="text-sm text-[#317043]">
          Расписание сохранено.
        </Text>
      )}
      <Button
        disabled={busy || !slots.length}
        onPress={() => {
          void save();
        }}
      >
        {initial ? "Начать планирование" : "Сохранить расписание"}
      </Button>
    </View>
  );
  if (initial)
    return (
      <ScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ alignItems: "center", padding: 24, paddingVertical: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[520px]">{body}</View>
      </ScrollView>
    );
  return body;
}
