import { useRef } from "react";
import { Modal, Platform, Pressable, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isDesktop } from "../data/desktop";
import { KeyboardAvoidingView } from "./keyboard";
import { TaskForm, type TaskFormProps } from "./task-editor";
import { colors } from "./primitives";

export function useTaskEditorSheet() {
  const { width } = useWindowDimensions();
  return !isDesktop() && (Platform.OS !== "web" || width < 600);
}

export function TaskEditor(props: TaskFormProps) {
  const sheet = useTaskEditorSheet();
  const closeRequest = useRef<(() => void) | null>(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const form = (
    <TaskForm
      {...props}
      key={`${props.task?.id}:${props.editSeries}`}
      inline={!sheet}
      sheet={sheet}
      closeRequest={closeRequest}
    />
  );
  if (!sheet) return form;
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      accessibilityLabel="Редактирование задачи"
      onRequestClose={() => closeRequest.current?.()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, justifyContent: "flex-end", paddingTop: insets.top + 24 }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть редактирование задачи"
          onPress={() => closeRequest.current?.()}
          style={{ position: "absolute", inset: 0, backgroundColor: colors.overlay }}
        />
        <View
          style={{
            height: Math.min(720, height * 0.64),
            maxHeight: height - insets.top - 24,
            flexShrink: 1,
            paddingBottom: insets.bottom,
            backgroundColor: colors.sheet,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          {form}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
