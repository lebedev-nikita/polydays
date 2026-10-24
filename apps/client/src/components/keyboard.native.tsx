import type { ReactNode } from "react";
import { KeyboardProvider as NativeKeyboardProvider } from "react-native-keyboard-controller";

export { KeyboardAvoidingView } from "react-native-keyboard-controller";

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return <NativeKeyboardProvider preload={false}>{children}</NativeKeyboardProvider>;
}
