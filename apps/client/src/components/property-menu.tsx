import type { ComponentRef, ReactNode, RefObject } from "react";
import { ScrollView, View } from "react-native";

export type PropertyMenuProps = {
  readonly anchor: RefObject<ComponentRef<typeof View> | null>;
  readonly width: number;
  readonly maxHeight: number;
  readonly children: ReactNode;
};

export function PropertyMenu({ width, maxHeight, children }: PropertyMenuProps) {
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
