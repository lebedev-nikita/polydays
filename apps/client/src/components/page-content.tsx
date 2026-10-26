import { useCallback, useRef, useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { useFocusEffect, useIsFocused } from "expo-router";
import { colors } from "./primitives";

// Keep expensive list preparation in a child component. Passing already prepared
// rows here would still block the destination's first render.
export function PageContent({
  children,
  preserveHeight = false,
}: {
  children: ReactNode;
  preserveHeight?: boolean;
}) {
  const focused = useIsFocused();
  const [ready, setReady] = useState(false);
  const height = useRef(0);
  useFocusEffect(
    useCallback(() => {
      // A second frame lets the destination and spinner paint before mounting
      // the list, including on native screens and when returning through history.
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setReady(true));
      });
      return () => {
        cancelAnimationFrame(frame);
        setReady(false);
      };
    }, []),
  );
  if (!focused || !ready)
    return (
      <View
        className="min-h-[160px] items-center justify-center"
        style={preserveHeight ? { minHeight: Math.max(160, height.current) } : undefined}
      >
        <ActivityIndicator color={colors.accent} accessibilityLabel="Загрузка списка" />
      </View>
    );
  if (!preserveHeight) return children;
  return (
    <View
      onLayout={({ nativeEvent }) => {
        if (nativeEvent.layout.height > 0) height.current = nativeEvent.layout.height;
      }}
    >
      {children}
    </View>
  );
}
