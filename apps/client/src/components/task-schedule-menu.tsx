import { useState, type ComponentRef, type RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  Repeat2,
  Sun,
} from "lucide-react-native";
import {
  addDays,
  activeVersion,
  deadlineInstant,
  polydayForInstant,
  polydaysOn,
  versionForDate,
  type Calendar,
  type Scheduling,
} from "@polydays/core";
import { Button, ErrorMessage, colors } from "./primitives";
import { PropertyMenu } from "./property-menu";
import { calendarDateLabel, calendarDays, shiftMonth, timeZoneLabel } from "./schedule-options";
import { TimeField } from "./time-field";
import { normalizeTimeInput } from "./time-input";

export function TaskScheduleMenu({
  anchor,
  calendar,
  value,
  today,
  now,
  defaultSlotId,
  maxHeight,
  width,
  onDismiss,
  onConfirm,
  onRepeat,
}: {
  anchor: RefObject<ComponentRef<typeof View> | null>;
  calendar: Calendar;
  value: Scheduling;
  today: string;
  now: number;
  defaultSlotId: string;
  maxHeight: number;
  width: number;
  onDismiss: () => void;
  onConfirm: (value: Scheduling) => void;
  onRepeat?: (value: Scheduling, date: string) => void;
}) {
  const [kind, setKind] = useState(value.kind);
  const [date, setDate] = useState(value.kind === "backlog" ? today : value.date);
  const [slotId, setSlotId] = useState(value.kind === "polyday" ? value.slotId : defaultSlotId);
  const [time, setTime] = useState(value.kind === "deadline" ? value.time : "09:00");
  const [submitted, setSubmitted] = useState(false);
  const slots = polydaysOn(calendar, date);
  const normalizedTime = normalizeTimeInput(time);
  const zone = versionForDate(calendar, date)?.timeZone ?? activeVersion(calendar, now).timeZone;
  const invalidSlot = kind === "polyday" && !slots.some((slot) => slot.slotId === slotId);
  const invalidTime = kind === "deadline" && normalizedTime === null;
  const placement =
    kind === "deadline" && normalizedTime !== null
      ? polydayForInstant(calendar, deadlineInstant(calendar, date, normalizedTime))
      : null;
  const selection = (): Scheduling =>
    kind === "backlog"
      ? { kind }
      : kind === "polyday"
        ? { kind, date, slotId }
        : { kind, date, time: normalizedTime ?? time };
  const accept = (repeat = false) => {
    setSubmitted(true);
    if (invalidSlot || invalidTime) return;
    if (repeat && onRepeat) onRepeat(selection(), date);
    else onConfirm(selection());
  };
  const footer = (
    <View className="flex-row items-center justify-between gap-2 px-4 pb-4 pt-2">
      {kind !== "deadline" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Во входящие"
          onPress={() => onConfirm({ kind: "backlog" })}
          className="min-h-12 flex-row items-center gap-2 rounded-md px-2 active:bg-sidebar"
        >
          <Inbox size={17} color={colors.muted} />
          <Text className="text-xs text-muted">Во входящие</Text>
        </Pressable>
      ) : (
        <View />
      )}
      <Button onPress={() => accept()}>Готово</Button>
    </View>
  );
  return (
    <PropertyMenu
      anchor={anchor}
      width={width}
      maxHeight={maxHeight}
      onDismiss={onDismiss}
      footer={footer}
    >
      <View className="gap-3 px-4 pt-3">
        <TaskDatePicker
          date={date}
          today={today}
          onChange={(next) => {
            setDate(next);
            if (kind === "backlog") setKind("polyday");
          }}
        />
        {kind === "deadline" ? (
          <View className="gap-2">
            <View className="flex-row flex-wrap items-center justify-between gap-2">
              <View className="flex-row items-center gap-2">
                <Clock3 size={17} color={colors.muted} />
                <TimeField
                  hideLabel
                  label="Время дедлайна"
                  accessibilityLabel="Время дедлайна"
                  value={time}
                  onChange={setTime}
                  submitted={submitted}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (placement?.polyday) {
                    setDate(placement.polyday.date);
                    setSlotId(placement.polyday.slotId);
                  }
                  setKind("polyday");
                }}
                className="min-h-12 justify-center rounded-md px-2 active:bg-sidebar"
              >
                <Text className="text-xs text-accent">Убрать дедлайн</Text>
              </Pressable>
            </View>
            <Text className="text-xs leading-5 text-muted">
              {placement?.polyday
                ? `${placement.polyday.name} · ${calendarDateLabel(placement.polyday.date, today)}${placement.inSleepGap ? " · дедлайн во время сна" : ""}`
                : "Дедлайн вне настроенного расписания"}
            </Text>
            {zone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
              <Text className="text-xs text-muted">{timeZoneLabel(zone, now)}</Text>
            )}
          </View>
        ) : (
          <View accessibilityRole="radiogroup" accessibilityLabel="Полидень">
            {slots.map((slot) => {
              const selected = kind === "polyday" && slotId === slot.slotId;
              return (
                <Pressable
                  key={slot.slotId}
                  accessibilityRole="radio"
                  accessibilityLabel={slot.name}
                  aria-checked={selected}
                  onPress={() => {
                    setKind("polyday");
                    setSlotId(slot.slotId);
                  }}
                  className={`min-h-12 flex-row items-center gap-2 rounded-lg px-2 py-2 ${selected ? "bg-selected" : "active:bg-sidebar"}`}
                >
                  <Sun size={17} color={colors.muted} />
                  <Text className="min-w-0 flex-1 text-sm text-ink">{slot.name}</Text>
                  <Text className="shrink text-right text-xs text-muted">
                    {slot.startTime}–{slot.endTime}
                    {slot.endTime <= slot.startTime
                      ? `, ${new Intl.DateTimeFormat("ru", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${addDays(date, 1)}T12:00:00Z`))}`
                      : ""}
                  </Text>
                  <View style={{ width: 16 }}>
                    {selected && <Check size={16} color={colors.accent} />}
                  </View>
                </Pressable>
              );
            })}
            {!slots.length && (
              <Text className="py-3 text-sm text-muted">
                На эту дату нет полидней. Выберите другую дату или точный дедлайн.
              </Text>
            )}
            {invalidSlot && (
              <Text accessibilityLiveRegion="polite" className="px-2 py-2 text-xs text-accent">
                Выберите полидень из расписания на эту дату.
              </Text>
            )}
          </View>
        )}
        <ErrorMessage>
          {submitted && invalidTime ? "Введите время от 00:00 до 23:59." : null}
        </ErrorMessage>
        <View>
          {kind !== "deadline" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Добавить время"
              onPress={() => setKind("deadline")}
              className="min-h-11 flex-row items-center gap-2 rounded-md px-2 active:bg-sidebar"
            >
              <Clock3 size={17} color={colors.muted} />
              <Text className="text-xs text-muted">Точный дедлайн</Text>
            </Pressable>
          )}
          {onRepeat && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Повтор"
              onPress={() => accept(true)}
              className="min-h-11 flex-row items-center gap-2 rounded-md px-2 active:bg-sidebar"
            >
              <Repeat2 size={17} color={colors.muted} />
              <Text className="text-xs text-muted">Повтор</Text>
            </Pressable>
          )}
        </View>
      </View>
    </PropertyMenu>
  );
}

function TaskDatePicker({
  date,
  today,
  onChange,
}: {
  date: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [visibleDate, setVisibleDate] = useState(date);
  const month = visibleDate.slice(0, 7);
  const weekStart = addDays(
    visibleDate,
    -((new Date(`${visibleDate}T12:00:00Z`).getUTCDay() + 6) % 7),
  );
  const dates = expanded
    ? calendarDays(month)
    : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const monthLabel = new Intl.DateTimeFormat("ru", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${visibleDate}T12:00:00Z`));
  const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Свернуть календарь" : "Открыть календарь"}
          aria-expanded={expanded}
          onPress={() => setExpanded(!expanded)}
          className="min-h-11 min-w-0 shrink flex-row items-center gap-1 rounded-md px-1 active:bg-sidebar"
        >
          <Text className="shrink text-sm font-semibold capitalize text-ink">{monthLabel}</Text>
          <ChevronDown size={14} color={colors.muted} />
        </Pressable>
        <View className="flex-row">
          {([-1, 1] as const).map((offset) => (
            <Pressable
              key={offset}
              accessibilityRole="button"
              accessibilityLabel={
                expanded
                  ? offset === -1
                    ? "Предыдущий месяц"
                    : "Следующий месяц"
                  : offset === -1
                    ? "Предыдущая неделя"
                    : "Следующая неделя"
              }
              onPress={() =>
                setVisibleDate(
                  expanded ? `${shiftMonth(month, offset)}-01` : addDays(visibleDate, offset * 7),
                )
              }
              className="h-11 w-9 items-center justify-center rounded-md active:bg-sidebar"
            >
              {offset === -1 ? (
                <ChevronLeft size={17} color={colors.muted} />
              ) : (
                <ChevronRight size={17} color={colors.muted} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <View className="flex-row">
        {weekdays.map((day) => (
          <Text key={day} className="flex-1 py-1 text-center text-xs text-muted">
            {day}
          </Text>
        ))}
      </View>
      {Array.from({ length: dates.length / 7 }, (_, week) => (
        <View key={week} className="flex-row">
          {dates.slice(week * 7, week * 7 + 7).map((day) => (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={calendarDateLabel(day, today)}
              accessibilityState={{ selected: day === date }}
              onPress={() => {
                onChange(day);
                setVisibleDate(day);
                setExpanded(false);
              }}
              className={`min-h-11 flex-1 items-center justify-center rounded-lg ${day === date ? "bg-selected" : "active:bg-sidebar"}`}
            >
              <Text
                className={`text-sm ${day === date || day === today ? "text-accent" : day.startsWith(month) ? "text-ink" : "text-muted"}`}
              >
                {Number(day.slice(-2))}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}
      <View className="flex-row">
        {[
          { date: today, label: "Сегодня" },
          { date: addDays(today, 1), label: "Завтра" },
        ].map((choice) => (
          <Pressable
            key={choice.date}
            accessibilityRole="button"
            onPress={() => {
              onChange(choice.date);
              setVisibleDate(choice.date);
              setExpanded(false);
            }}
            className="min-h-11 flex-1 items-center justify-center rounded-md active:bg-sidebar"
          >
            <Text className="text-xs text-muted">{choice.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
