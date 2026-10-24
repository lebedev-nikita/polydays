import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScrollView, View, useWindowDimensions } from "react-native";
import type { PropertyMenuProps } from "./property-menu";

export function PropertyMenu({
  anchor,
  width,
  maxHeight,
  children,
  onDismiss,
  footer,
}: PropertyMenuProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [bounds, setBounds] = useState<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const ready = bounds !== null;
  const dismissible = !!onDismiss;

  useLayoutEffect(() => {
    if (ready && dismissible)
      menuRef.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [ready, dismissible]);

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
  const overlapsAnchor = !!onDismiss && Math.max(above, below) < 320;
  const availableHeight = overlapsAnchor
    ? viewportHeight - gap * 2
    : Math.max(48, opensAbove ? above : below);

  const menu = (
    <>
      {onDismiss && (
        <div
          onPointerDown={onDismiss}
          style={{ position: "fixed", inset: 0, zIndex: 19 }}
          aria-hidden="true"
        />
      )}
      <div
        ref={menuRef}
        role={onDismiss ? "dialog" : undefined}
        aria-label={onDismiss ? "Дата и полидень" : undefined}
        onKeyUp={(event) => {
          if (onDismiss && event.key === "Escape") {
            event.stopPropagation();
            onDismiss();
          }
        }}
        onKeyDown={(event) => {
          if (onDismiss && event.key === "Tab") {
            const controls = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                'button, input, textarea, select, [tabindex="0"]',
              ),
            ].filter(
              (element) => element.offsetParent !== null && !element.hasAttribute("disabled"),
            );
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
        style={{
          position: "fixed",
          zIndex: 20,
          left: Math.max(gap, Math.min(bounds.left + 12, viewportWidth - width - gap)),
          ...(overlapsAnchor
            ? { top: Math.max(gap, (viewportHeight - Math.min(maxHeight, availableHeight)) / 2) }
            : opensAbove
              ? { bottom: viewportHeight - bounds.top + gap }
              : { top: bounds.bottom + gap }),
        }}
      >
        <View
          className={
            onDismiss
              ? "overflow-hidden rounded-2xl border border-line bg-white shadow-lg"
              : "overflow-hidden rounded-2xl bg-white shadow-lg"
          }
          style={{
            width,
            maxHeight: Math.min(maxHeight, availableHeight),
            borderRadius: onDismiss && viewportWidth < 600 ? 24 : 16,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: Math.min(maxHeight, availableHeight), flexShrink: 1 }}
          >
            {children}
          </ScrollView>
          {footer}
        </View>
      </div>
    </>
  );
  const anchorElement = anchor.current as unknown as HTMLElement | null;
  return createPortal(menu, anchorElement?.closest('[aria-modal="true"]') ?? document.body);
}
