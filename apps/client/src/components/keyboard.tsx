import type { ReactNode } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

export { KeyboardAvoidingView, ScrollView as TaskScrollView } from "react-native";

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return children;
}

export function FormScrollView({
  bottomOffset: _bottomOffset,
  ...props
}: ScrollViewProps & { bottomOffset?: number }) {
  return <ScrollView keyboardShouldPersistTaps="handled" {...props} />;
}
