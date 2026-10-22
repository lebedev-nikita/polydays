import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from "react-native";
import type { ReactNode } from "react";

export const colors = {
  ink: "#252421",
  muted: "#66645f",
  accent: "#b9382e",
  line: "#e9e7e2",
  priorities: ["", "#c73529", "#b96712", "#286db4", "#77736d"],
};
export function Button({
  children,
  onPress,
  secondary = false,
  disabled = false,
  label,
}: {
  children: ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-md px-4 py-2.5 ${secondary ? "border border-line bg-white active:bg-sidebar" : "bg-accent active:opacity-80"} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`text-[14px] font-semibold ${secondary ? "text-ink" : "text-white"}`}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-semibold text-muted">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor="#77736d"
        className={`min-h-12 rounded-md border border-line bg-white px-3 py-2 text-[15px] text-ink ${props.multiline ? "min-h-24" : ""}`}
      />
    </View>
  );
}
export function ErrorMessage({ children }: { children: ReactNode }) {
  return children ? (
    <View accessibilityRole="alert" className="rounded-md bg-[#fff0ed] px-3 py-2.5">
      <Text className="text-sm leading-5 text-accent">{children}</Text>
    </View>
  ) : null;
}
export function Panel({ children, ...props }: ViewProps) {
  return (
    <View {...props} className="gap-5 rounded-lg border border-line bg-white p-5">
      {children}
    </View>
  );
}
export const priorityName = (priority: number): string =>
  ["", "P1 · Высокий", "P2 · Средний", "P3 · Низкий", "P4 · Без приоритета"][priority] ??
  "Без приоритета";
