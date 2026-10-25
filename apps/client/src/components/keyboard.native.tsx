import type { ReactNode } from "react";
import type { ScrollViewProps } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardProvider as NativeKeyboardProvider,
} from "react-native-keyboard-controller";

export { KeyboardAvoidingView } from "react-native-keyboard-controller";

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return <NativeKeyboardProvider preload={false}>{children}</NativeKeyboardProvider>;
}

export function FormScrollView({
  bottomOffset = 24,
  ...props
}: ScrollViewProps & { bottomOffset?: number }) {
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps="handled"
      {...props}
      bottomOffset={bottomOffset}
    />
  );
}

export function TaskScrollView(props: ScrollViewProps) {
  return <FormScrollView {...props} bottomOffset={160} />;
}
