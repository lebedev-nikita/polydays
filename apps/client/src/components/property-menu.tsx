import type { ComponentRef, ReactNode, RefObject } from "react";
import { ScrollView, type View } from "react-native";

export type PropertyMenuProps = {
  readonly anchor: RefObject<ComponentRef<typeof View> | null>;
  readonly width: number;
  readonly maxHeight: number;
  readonly children: ReactNode;
};

export function PropertyMenu({ width, maxHeight, children }: PropertyMenuProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="mb-2 ml-3 rounded-2xl bg-white shadow-lg"
      style={{ width, maxHeight }}
    >
      {children}
    </ScrollView>
  );
}
