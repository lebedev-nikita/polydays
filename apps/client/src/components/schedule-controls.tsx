import { useRef, useState, type ComponentRef } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react-native";
import { addDays } from "@polydays/core";
import { Field, colors } from "./primitives";
import {
  calendarDateLabel,
  calendarDays,
  shiftMonth,
  timeZoneChoices,
  timeZoneCity,
  timeZoneLabel,
} from "./schedule-options";

export function TimeZoneControl({
  zone,
  mode,
  now,
  onChange,
}: {
  zone: string;
  mode: "fixed" | "local";
  now: number;
  onChange: (zone: string, mode: "fixed" | "local") => void;
}) {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [choices, setChoices] = useState<string[]>([]);
  const query = search.trim().toLocaleLowerCase("ru");
  const filtered = choices.filter((item) =>
    `${timeZoneCity(item)} ${item}`.toLocaleLowerCase("ru").includes(query),
  );
  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-muted">Часовой пояс</Text>
        <Pressable
          ref={trigger}
          accessibilityRole="button"
          accessibilityLabel={`Выбрать часовой пояс: ${timeZoneLabel(zone, now)}`}
          accessibilityState={{ expanded: open }}
          onPress={() => {
            if (!open) {
              setChoices(timeZoneChoices(zone, local));
              setSearch("");
            }
            setOpen(!open);
          }}
          className="min-h-12 flex-row items-center justify-between gap-3 self-start rounded-md border border-line px-3 py-2 active:bg-sidebar"
        >
          <Text className="shrink text-[15px] text-ink">{timeZoneLabel(zone, now)}</Text>
          <ChevronDown size={16} color={colors.muted} />
        </Pressable>
      </View>
      <View className="min-h-12 flex-row items-center gap-3">
        <Switch
          accessibilityLabel="Определять часовой пояс автоматически"
          value={mode === "local"}
          onValueChange={(enabled) => {
            onChange(enabled ? local : zone, enabled ? "local" : "fixed");
            setOpen(false);
          }}
          trackColor={{ true: colors.accent, false: "#c6c2b9" }}
        />
        <Text className="shrink text-sm text-ink">Определять автоматически</Text>
      </View>
      {open && (
        <View className="gap-2 rounded-lg border border-line p-3">
          <Field
            label="Поиск часового пояса"
            value={search}
            onChangeText={setSearch}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Город или часовой пояс"
            onKeyPress={(event) => {
              if (event.nativeEvent.key === "Escape") {
                setOpen(false);
                trigger.current?.focus();
              }
            }}
          />
          <ScrollView className="max-h-60" keyboardShouldPersistTaps="handled" nestedScrollEnabled>
            {filtered.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Часовой пояс: ${timeZoneLabel(item, now)}`}
                accessibilityState={{ selected: item === zone }}
                onPress={() => {
                  onChange(item, "fixed");
                  setOpen(false);
                  trigger.current?.focus();
                }}
                className={`min-h-12 flex-row items-center justify-between gap-2 rounded-md px-2 py-2 ${item === zone ? "bg-selected" : "active:bg-sidebar"}`}
              >
                <View className="flex-1 gap-1">
                  <Text className="text-sm text-ink">{timeZoneLabel(item, now)}</Text>
                  <Text className="text-xs text-muted">{item.replaceAll("_", " ")}</Text>
                </View>
                {item === zone && <Check size={16} color={colors.accent} />}
              </Pressable>
            ))}
            {!filtered.length && (
              <Text className="py-3 text-sm text-muted">
                Ничего не найдено. Попробуйте другое название города.
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export function EffectiveDateControl({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const [month, setMonth] = useState(value.slice(0, 7));
  const days = calendarDays(month);
  const monthLabel = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  const choose = (date: string) => {
    onChange(date);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <View className="gap-3">
      <View className="gap-1.5">
        <Text className="text-xs font-semibold text-muted">Когда применить</Text>
        <Pressable
          ref={trigger}
          accessibilityRole="button"
          accessibilityLabel={`Дата начала действия расписания: ${calendarDateLabel(value, today)}`}
          accessibilityState={{ expanded: open }}
          onPress={() => {
            setMonth(value.slice(0, 7));
            setOpen(!open);
          }}
          className="min-h-12 flex-row items-center gap-3 self-start rounded-md border border-line px-3 py-2 active:bg-sidebar"
        >
          <CalendarDays size={17} color={colors.muted} />
          <Text className="shrink text-[15px] text-ink">{calendarDateLabel(value, today)}</Text>
          <ChevronDown size={16} color={colors.muted} />
        </Pressable>
      </View>
      <Text className="text-xs leading-5 text-muted">Прошлые полидни останутся без изменений.</Text>
      {open && (
        <View
          className="gap-2 rounded-lg border border-line p-2"
          accessibilityLabel="Календарь начала действия расписания"
        >
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Предыдущий месяц"
              disabled={month <= today.slice(0, 7)}
              onPress={() => setMonth(shiftMonth(month, -1))}
              className={`h-12 w-12 items-center justify-center rounded-md active:bg-sidebar ${month <= today.slice(0, 7) ? "opacity-40" : ""}`}
            >
              <ChevronLeft size={18} color={colors.muted} />
            </Pressable>
            <Text
              accessibilityLiveRegion="polite"
              className="shrink text-sm font-semibold text-ink"
            >
              {monthLabel}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Следующий месяц"
              onPress={() => setMonth(shiftMonth(month, 1))}
              className="h-12 w-12 items-center justify-center rounded-md active:bg-sidebar"
            >
              <ChevronRight size={18} color={colors.muted} />
            </Pressable>
          </View>
          <View className="flex-row">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <Text key={day} className="flex-1 py-2 text-center text-xs text-muted">
                {day}
              </Text>
            ))}
          </View>
          {Array.from({ length: days.length / 7 }, (_, week) => (
            <View key={week} className="flex-row">
              {days.slice(week * 7, week * 7 + 7).map((date) => (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={calendarDateLabel(date, today)}
                  accessibilityState={{ selected: date === value, disabled: date < today }}
                  disabled={date < today}
                  onPress={() => choose(date)}
                  className={`min-h-12 flex-1 items-center justify-center rounded-md ${date === value ? "bg-selected" : "active:bg-sidebar"} ${date < today ? "opacity-30" : ""}`}
                >
                  <Text
                    className={`text-sm ${date === value ? "font-semibold text-accent" : date.startsWith(month) ? "text-ink" : "text-muted"}`}
                  >
                    {Number(date.slice(-2))}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          <View className="flex-row gap-2">
            {[
              { date: today, label: "Сегодня" },
              { date: addDays(today, 1), label: "Завтра" },
            ].map((choice) => (
              <Pressable
                key={choice.date}
                accessibilityRole="button"
                onPress={() => choose(choice.date)}
                className="min-h-12 flex-1 items-center justify-center rounded-md active:bg-sidebar"
              >
                <Text className="text-sm text-accent">{choice.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
