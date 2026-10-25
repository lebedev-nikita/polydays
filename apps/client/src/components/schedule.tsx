import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CheckCheck, Plus, Trash2 } from "lucide-react-native";
import * as Crypto from "expo-crypto";
import {
  activeVersion,
  addDays,
  changeTimeZone,
  dateAt,
  defaultSlots,
  slotDurationMinutes,
  systemNow,
  updateCalendar,
  validateCalendar,
  versionForDate,
  type Calendar,
  type Slot,
} from "@polydays/core";
import { documents, enqueue } from "@polydays/sync";
import { useApp } from "./provider";
import { Button, ErrorMessage, Field, colors } from "./primitives";
import { SlotChoices } from "./task-editor";
import { message } from "../data/store";
import { TimeField } from "./time-field";
import { normalizeTimeInput } from "./time-input";
import { EffectiveDateControl, TimeZoneControl } from "./schedule-controls";
import { calendarDateLabel } from "./schedule-options";
import { FormScrollView } from "./keyboard";

export function ScheduleEditor({ initial = false }: { initial?: boolean }) {
  const { store, calendar, now } = useApp();
  const current = calendar ? activeVersion(calendar, now) : null;
  const today = dateAt(now, current?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  // Reopen the next saved schedule, even before it becomes active.
  const upcomingDate = calendar?.versions
    .map((version) => version.from)
    .filter((from) => from > today)
    .sort()[0];
  const editable = calendar && upcomingDate ? versionForDate(calendar, upcomingDate) : current;
  const [slots, setSlots] = useState<ReadonlyArray<Slot>>(editable?.slots ?? defaultSlots);
  const [zone, setZone] = useState(
    editable?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [mode, setMode] = useState<"fixed" | "local">(calendar?.mode ?? "fixed");
  const [date, setDate] = useState(upcomingDate ?? addDays(today, initial ? 0 : 1));
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const original = calendar ? versionForDate(calendar, date) : null;
  const removed =
    original?.slots.filter((slot) => !slots.some((item) => item.id === slot.id)) ?? [];
  const changedIntervals =
    current &&
    (current.slots.length !== slots.length ||
      slots.some(
        (slot) =>
          !current.slots.some(
            (previous) =>
              previous.id === slot.id && previous.start === slot.start && previous.end === slot.end,
          ),
      ));
  const edit = (id: string, patch: Partial<Slot>) => {
    setSaved(false);
    setError(null);
    setSlots((previous) => previous.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));
  };
  const save = async () => {
    setError(null);
    setSubmitted(true);
    setBusy(true);
    setSaved(false);
    try {
      const normalizedSlots = slots.map((slot, index) => {
        const start = normalizeTimeInput(slot.start);
        const end = normalizeTimeInput(slot.end);
        if (start === null || end === null)
          throw new Error(`Проверьте время полидня ${index + 1}: укажите время от 00:00 до 23:59.`);
        return { ...slot, start, end };
      });
      setSlots(normalizedSlots);
      if (removed.length && !destination)
        throw new Error("Выберите полидень для переноса задач из удалённых интервалов.");
      const version = {
        id: Crypto.randomUUID(),
        from: date,
        timeZone: zone,
        slots: normalizedSlots,
      };
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
      <View className="gap-4">
        <Text className="text-xs leading-5 text-muted">
          Время в 24-часовом формате: можно ввести 730 или 7:30 — получится 07:30.
        </Text>
        {slots.map((slot, index) => {
          const start = normalizeTimeInput(slot.start);
          const end = normalizeTimeInput(slot.end);
          const duration =
            start !== null && end !== null && start !== end
              ? slotDurationMinutes({ start, end })
              : null;
          const durationText =
            duration === null
              ? null
              : [
                  duration >= 60 ? `${Math.floor(duration / 60)} ч` : "",
                  duration % 60 ? `${duration % 60} мин` : "",
                ]
                  .filter(Boolean)
                  .join(" ");
          return (
            <View key={slot.id}>
              <View className="flex-row flex-wrap items-start gap-3">
                <View className="min-w-32 flex-1 basis-40">
                  <Field
                    label={`Полидень ${index + 1}`}
                    value={slot.name}
                    onChangeText={(name) => edit(slot.id, { name })}
                  />
                </View>
                <View className="max-w-full flex-row flex-wrap items-start gap-3">
                  <View className="max-w-full gap-1.5">
                    <View className="flex-row flex-wrap items-start gap-3">
                      <TimeField
                        label="Начало"
                        accessibilityLabel={`Начало полидня ${index + 1}`}
                        value={slot.start}
                        onChange={(start) => edit(slot.id, { start })}
                        submitted={submitted}
                      />
                      <TimeField
                        label="Конец"
                        accessibilityLabel={`Конец полидня ${index + 1}`}
                        nextDay={start !== null && end !== null && end < start}
                        value={slot.end}
                        onChange={(end) => edit(slot.id, { end })}
                        submitted={submitted}
                      />
                    </View>
                    {durationText !== null && (
                      <Text
                        className="text-xs text-muted"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        Длительность: {durationText}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Удалить полидень ${slot.name}`}
                    onPress={() => setSlots(slots.filter((item) => item.id !== slot.id))}
                    className="mt-5 h-12 w-12 items-center justify-center rounded-md active:bg-sidebar"
                  >
                    <Trash2 size={18} color={colors.muted} />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })}
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
      </View>
      <View className="flex-row flex-wrap items-start gap-6 border-t border-line pt-6">
        <View className="min-w-60 flex-1">
          <TimeZoneControl
            zone={zone}
            mode={mode}
            now={now}
            onChange={(nextZone, nextMode) => {
              setZone(nextZone);
              setMode(nextMode);
              setSaved(false);
              setError(null);
            }}
          />
        </View>
        {!initial && (
          <View className="min-w-60 flex-1">
            <EffectiveDateControl
              value={date}
              today={dateAt(now, current?.timeZone ?? zone)}
              onChange={(nextDate) => {
                setDate(nextDate);
                setSaved(false);
                setError(null);
              }}
            />
          </View>
        )}
      </View>
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
        <View accessibilityLiveRegion="polite" className="gap-1">
          <Text className="text-sm text-[#317043]">Расписание сохранено.</Text>
          {changedIntervals && (
            <Text className="text-sm text-muted">
              Изменения интервалов: {calendarDateLabel(date, today).toLocaleLowerCase("ru")}.
            </Text>
          )}
        </View>
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
      <FormScrollView
        className="flex-1 bg-white"
        contentContainerStyle={{ alignItems: "center", padding: 24, paddingVertical: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-[520px]">{body}</View>
      </FormScrollView>
    );
  return body;
}
