import type { ReactNode } from "react";

export { KeyboardAvoidingView, ScrollView as TaskScrollView } from "react-native";

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return children;
}
