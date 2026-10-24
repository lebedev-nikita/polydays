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

export function TaskScrollView(props: ScrollViewProps) {
  return <KeyboardAwareScrollView {...props} bottomOffset={160} />;
}
