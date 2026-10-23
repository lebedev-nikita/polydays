import { useId, useState } from "react";
import { Text, TextInput, View, useWindowDimensions } from "react-native";
import { normalizeTimeInput } from "./time-input";

export function TimeField({
  label,
  accessibilityLabel,
  value,
  onChange,
  submitted,
  nextDay = false,
}: {
  label: string;
  accessibilityLabel: string;
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
  nextDay?: boolean;
}) {
  const errorId = useId();
  const { fontScale } = useWindowDimensions();
  const [touched, setTouched] = useState(false);
  const invalid = (touched || submitted) && normalizeTimeInput(value) === null;
  return (
    <View className="gap-1.5" style={{ width: 96 * fontScale }}>
      <View className="flex-row items-center justify-between gap-1">
        <Text className="text-xs font-semibold text-muted">{label}</Text>
        {nextDay && (
          <Text accessibilityLabel="Конец следующего дня" className="text-[11px] text-muted">
            +1 день
          </Text>
        )}
      </View>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={`${nextDay ? "Конец следующего дня. " : ""}Время в 24-часовом формате. Например, 730 или 07:30.`}
        aria-invalid={invalid}
        aria-describedby={invalid ? errorId : undefined}
        value={value}
        onChangeText={onChange}
        onBlur={() => {
          setTouched(true);
          const normalized = normalizeTimeInput(value);
          if (normalized !== null) onChange(normalized);
        }}
        inputMode="numeric"
        selectTextOnFocus
        autoCorrect={false}
        autoComplete="off"
        placeholder="ЧЧ:ММ"
        placeholderTextColor="#77736d"
        className={`min-h-12 rounded-md border bg-white px-3 py-2 text-[15px] text-ink ${invalid ? "border-accent" : "border-line"}`}
        style={{ fontVariant: ["tabular-nums"] }}
      />
      {invalid && (
        <Text nativeID={errorId} accessibilityLiveRegion="polite" className="text-xs text-accent">
          От 00:00 до 23:59
        </Text>
      )}
    </View>
  );
}
