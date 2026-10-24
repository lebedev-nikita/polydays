import type { ReactNode } from "react";

export { KeyboardAvoidingView } from "react-native";

export function KeyboardProvider({ children }: { children: ReactNode }) {
  return children;
}
