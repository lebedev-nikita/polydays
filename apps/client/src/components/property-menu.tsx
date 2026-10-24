import type { ComponentRef, ReactNode, RefObject } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "./keyboard";

export type PropertyMenuProps = {
  readonly anchor: RefObject<ComponentRef<typeof View> | null>;
  readonly width: number;
  readonly maxHeight: number;
  readonly children: ReactNode;
  readonly onDismiss?: () => void;
  readonly footer?: ReactNode;
};

export function PropertyMenu({ width, maxHeight, children, onDismiss, footer }: PropertyMenuProps) {
  const insets = useSafeAreaInsets();
  if (onDismiss) {
    return (
      <Modal transparent visible animationType="fade" onRequestClose={onDismiss}>
        <KeyboardAvoidingView behavior="height" style={{ flex: 1, justifyContent: "flex-end" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Отменить выбор даты и полидня"
            onPress={onDismiss}
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.3)" }}
          />
          <View
            className="mx-2 overflow-hidden rounded-3xl border border-line bg-white shadow-lg"
            style={{ maxHeight, marginBottom: insets.bottom + 8, flexShrink: 1 }}
          >
            <View className="mb-1 mt-2 h-1 w-9 self-center rounded-full bg-line" />
            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }}>
              {children}
            </ScrollView>
            {footer}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
  return (
    <View
      className="mb-2 ml-3 overflow-hidden rounded-2xl bg-white shadow-lg"
      style={{ width, maxHeight }}
    >
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight }}>
        {children}
      </ScrollView>
    </View>
  );
}
