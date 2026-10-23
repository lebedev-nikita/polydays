import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, CalendarDays, Sun } from "lucide-react-native";
import { addDays } from "@polydays/core";
import { colors } from "./primitives";

/** Dates are calendar dates in the account zone; UTC is only used for arithmetic. */
export function DatePicker({
  value,
  today,
  onChange,
}: {
  value: string;
  today: string;
  onChange: (date: string) => void;
}) {
  const parsed = new Date(`${value}T12:00:00Z`);
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
  const [month, setMonth] = useState((valid ? value : today).slice(0, 7));
  const first = new Date(`${month}-01T12:00:00Z`);
  const offset = (first.getUTCDay() + 6) % 7;
  const start = addDays(`${month}-01`, -offset);
  const shift = (delta: number) => {
    const next = new Date(first);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setMonth(next.toISOString().slice(0, 7));
  };
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        {[
          { date: today, label: "Сегодня", Icon: Sun },
          { date: addDays(today, 1), label: "Завтра", Icon: CalendarDays },
        ].map(({ date, label, Icon }) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() => {
              onChange(date);
              setMonth(date.slice(0, 7));
            }}
            className="min-h-[36px] flex-1 flex-row items-center gap-2 rounded-md bg-sidebar px-3 hover:bg-selected"
          >
            <Icon size={16} color={colors.muted} />
            <Text className="text-sm text-ink">{label}</Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold capitalize text-ink">
          {new Intl.DateTimeFormat("ru", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          }).format(first)}
        </Text>
        <View className="flex-row">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Предыдущий месяц"
            onPress={() => shift(-1)}
            className="h-9 w-9 items-center justify-center rounded-md hover:bg-sidebar"
          >
            <ChevronLeft size={16} color={colors.muted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Следующий месяц"
            onPress={() => shift(1)}
            className="h-9 w-9 items-center justify-center rounded-md hover:bg-sidebar"
          >
            <ChevronRight size={16} color={colors.muted} />
          </Pressable>
        </View>
      </View>
      <View className="flex-row">
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
          <Text key={day} className="flex-1 text-center text-xs text-muted">
            {day}
          </Text>
        ))}
      </View>
      {Array.from({ length: 6 }, (_, week) => (
        <View key={week} className="flex-row">
          {Array.from({ length: 7 }, (_, day) => {
            const date = addDays(start, week * 7 + day);
            const selected = date === value;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={`Выбрать ${date}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(date)}
                className="h-8 flex-1 items-center justify-center"
              >
                <Text
                  className={`h-8 w-8 rounded-full text-center text-xs leading-8 ${selected ? "bg-accent font-semibold text-white" : date === today ? "font-bold text-accent" : date.startsWith(month) ? "text-ink" : "text-muted"}`}
                >
                  {Number(date.slice(-2))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
