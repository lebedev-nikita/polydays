import { useLayoutEffect, useState } from "react";
import { ScrollView, useWindowDimensions } from "react-native";
import type { PropertyMenuProps } from "./property-menu";

export function PropertyMenu({ anchor, width, maxHeight, children }: PropertyMenuProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [bounds, setBounds] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    const element = anchor.current as unknown as HTMLElement | null;
    if (!element) return;
    const measure = () => setBounds(element.getBoundingClientRect());
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [anchor, viewportWidth, viewportHeight]);

  if (!bounds) return null;
  const gap = 8;
  const above = bounds.top - gap * 2;
  const below = viewportHeight - bounds.bottom - gap * 2;
  const opensAbove = above >= Math.min(192, maxHeight) || above >= below;
  const availableHeight = Math.max(48, opensAbove ? above : below);

  return (
    <div
      style={{
        position: "fixed",
        zIndex: 20,
        left: Math.max(gap, Math.min(bounds.left + 12, viewportWidth - width - gap)),
        ...(opensAbove
          ? { bottom: viewportHeight - bounds.top + gap }
          : { top: bounds.bottom + gap }),
      }}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        className="rounded-2xl bg-white shadow-lg"
        style={{ width, maxHeight: Math.min(maxHeight, availableHeight) }}
      >
        {children}
      </ScrollView>
    </div>
  );
}
