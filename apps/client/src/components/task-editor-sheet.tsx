import { useRef, useState } from "react";
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
  const [textEditing, setTextEditing] = useState(false);
  const closeRequest = useRef<(() => void) | null>(null);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const form = (
    <TaskForm
      {...props}
      key={`${props.task?.id}:${props.editSeries}`}
      inline={!sheet}
      sheet={sheet}
      textEditing={sheet && textEditing}
      onEditText={sheet ? () => setTextEditing(true) : undefined}
      onFinishTextEditing={sheet ? () => setTextEditing(false) : undefined}
      closeRequest={closeRequest}
    />
  );
  if (!sheet) return form;
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      accessibilityLabel="Редактирование задачи"
      onRequestClose={() => closeRequest.current?.()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          paddingTop: textEditing ? 0 : insets.top + 24,
          backgroundColor: textEditing ? colors.sheet : undefined,
        }}
      >
        {!textEditing && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть редактирование задачи"
            onPress={() => closeRequest.current?.()}
            style={{ position: "absolute", inset: 0, backgroundColor: colors.overlay }}
          />
        )}
        <View
          style={{
            flex: textEditing ? 1 : undefined,
            height: textEditing ? undefined : Math.min(720, height * 0.64),
            maxHeight: textEditing ? undefined : height - insets.top - 24,
            flexShrink: 1,
            paddingTop: textEditing ? insets.top : 0,
            paddingBottom: insets.bottom,
            backgroundColor: colors.sheet,
            borderTopLeftRadius: textEditing ? 0 : 28,
            borderTopRightRadius: textEditing ? 0 : 28,
            overflow: "hidden",
          }}
        >
          {form}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
