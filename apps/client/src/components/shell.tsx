import { useCallback, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Link, useFocusEffect, usePathname } from "expo-router";
import {
  CalendarDays,
  CheckCheck,
  CloudCheck,
  CloudOff,
  CloudUpload,
  History,
  Inbox,
  Plus,
  Settings,
  Sun,
  Search,
  PanelLeftClose,
  Keyboard,
} from "lucide-react-native";
import { colors, ErrorMessage } from "./primitives";
import { useApp } from "./provider";
import { LoginScreen } from "./login";
import { ScheduleEditor } from "./schedule";
import { TaskComposer } from "./task-editor";
import { SearchDialog, ShortcutsDialog } from "./search";
import type { Scheduling } from "@polydays/core";

const destinations = [
  { href: "/backlog", title: "Бэклог", Icon: Inbox },
  { href: "/current", title: "Текущий полидень", Icon: Sun },
  { href: "/upcoming", title: "Предстоящие", Icon: CalendarDays },
  { href: "/history", title: "История", Icon: History },
] as const;

export function AppShell({
  children,
  defaultScheduling = { kind: "backlog" },
}: {
  children: ReactNode;
  defaultScheduling?: Scheduling;
}) {
  const app = useApp();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = width >= 850;
  const [composer, setComposer] = useState(false);
  const [search, setSearch] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const canQuickAdd =
    app.loaded && !!app.account && !!app.calendar && !composer && !search && !shortcuts;
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "web" || !canQuickAdd) return;
      const quickAdd = (event: KeyboardEvent) => {
        if (
          event.defaultPrevented ||
          event.repeat ||
          event.altKey ||
          (event.target instanceof HTMLElement &&
            event.target.closest(
              'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"]',
            ))
        )
          return;
        const key = event.key.toLowerCase();
        if ((event.metaKey || event.ctrlKey) && key === "k") {
          event.preventDefault();
          setSearch(true);
          return;
        }
        if (event.metaKey || event.ctrlKey) return;
        if (key === "q") {
          event.preventDefault();
          setComposer(true);
        }
        if (key === "/") {
          event.preventDefault();
          setSearch(true);
        }
        if (key === "?") {
          event.preventDefault();
          setShortcuts(true);
        }
      };
      document.addEventListener("keydown", quickAdd);
      return () => document.removeEventListener("keydown", quickAdd);
    }, [canQuickAdd]),
  );
  if (!app.loaded)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={colors.accent} accessibilityLabel="Открываем Polydays" />
      </View>
    );
  if (!app.account) return <LoginScreen />;
  if (!app.calendar) return <ScheduleEditor initial />;
  const SyncIcon =
    app.status === "synced" ? CloudCheck : app.status === "syncing" ? CloudUpload : CloudOff;
  const status =
    app.status === "synced"
      ? "Синхронизировано"
      : app.status === "syncing"
        ? "Синхронизация…"
        : app.status === "conflict"
          ? "Есть конфликт изменений"
          : app.status === "needs-login"
            ? "Нужен повторный вход"
            : "Сохранено на устройстве";
  const navigation = destinations.map(({ href, title, Icon }) => {
    const active = pathname === href || (href === "/current" && pathname.startsWith("/day/"));
    return (
      <Link key={href} href={href} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={title}
          className={`${desktop ? "min-h-[36px] flex-row gap-2 px-3" : "min-h-14 min-w-0 flex-1 items-center justify-center gap-1 px-1"} rounded-md ${active ? "bg-selected" : "active:bg-selected"}`}
          style={desktop ? { alignItems: "center" } : undefined}
        >
          <Icon
            size={desktop ? 20 : 21}
            color={active ? colors.accent : colors.muted}
            strokeWidth={1.7}
          />
          <Text
            numberOfLines={1}
            className={`${desktop ? "text-[14px]" : "text-[11px]"} ${active ? "font-semibold text-accent" : "text-ink"}`}
          >
            {desktop
              ? title
              : href === "/current"
                ? "Полидень"
                : href === "/upcoming"
                  ? "Планы"
                  : title}
          </Text>
        </Pressable>
      </Link>
    );
  });
  return (
    <View className="flex-1 flex-row bg-white">
      {desktop && !collapsed && (
        <View className="w-[280px] bg-sidebar px-3 pb-4 pt-4">
          <View className="mb-4 flex-row items-center gap-2 px-2">
            <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
              <Text className="text-sm font-semibold text-white">
                {app.account.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-ink">
              {app.account.name}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Свернуть боковую панель"
              onPress={() => setCollapsed(true)}
              className="h-8 w-8 items-center justify-center rounded-md hover:bg-[#eeeeee]"
            >
              <PanelLeftClose size={19} color={colors.muted} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setComposer(true)}
            className="mb-1 min-h-10 flex-row items-center gap-2 px-2"
          >
            <View className="h-6 w-6 items-center justify-center rounded-full bg-accent">
              <Plus size={17} color="white" />
            </View>
            <Text className="text-[14px] font-semibold text-accent">Добавить задачу</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Поиск"
            onPress={() => setSearch(true)}
            className="mb-1 min-h-[36px] flex-row items-center gap-2 rounded-md px-3 hover:bg-[#eeeeee]"
          >
            <Search size={20} color={colors.muted} strokeWidth={1.7} />
            <Text className="flex-1 text-sm text-ink">Поиск</Text>
            <Text className="text-xs text-muted">/</Text>
          </Pressable>
          <View>{navigation}</View>
          <Link href="/settings" asChild>
            <Pressable
              className={`mt-5 min-h-[36px] flex-row items-center gap-3 rounded-md px-3 ${pathname === "/settings" ? "bg-selected" : ""}`}
            >
              <Settings size={20} color={colors.muted} strokeWidth={1.7} />
              <Text className="text-sm text-ink">Настройки</Text>
            </Pressable>
          </Link>
          <View className="flex-1" />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShortcuts(true)}
            className="min-h-9 flex-row items-center gap-2 px-3"
          >
            <Keyboard size={16} color={colors.muted} />
            <Text className="text-xs text-muted">Горячие клавиши</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Синхронизировать задачи"
            onPress={() => {
              void app.store.sync();
            }}
            className="min-h-12 flex-row items-center gap-2 px-3"
          >
            <SyncIcon size={16} color={colors.muted} />
            <Text className="flex-1 text-xs text-muted">{status}</Text>
          </Pressable>
          <Text numberOfLines={1} className="mt-1 px-3 text-xs text-muted">
            {app.account.name}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1">
        {desktop && (
          <View className="h-12 flex-row items-center justify-between px-5">
            {collapsed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Открыть боковую панель"
                onPress={() => setCollapsed(false)}
                className="h-9 w-9 items-center justify-center rounded-md hover:bg-sidebar"
              >
                <PanelLeftClose size={20} color={colors.muted} />
              </Pressable>
            ) : (
              <View />
            )}
            <Text className="text-xs text-muted">Polydays</Text>
          </View>
        )}
        {!desktop && (
          <View className="min-h-12 flex-row items-center justify-between border-b border-line px-5 pt-2">
            <View className="flex-row items-center gap-2">
              <CheckCheck size={20} color={colors.accent} />
              <Text className="text-base font-bold text-ink">Polydays</Text>
            </View>
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Поиск"
                onPress={() => setSearch(true)}
                className="h-12 w-12 items-center justify-center"
              >
                <Search size={20} color={colors.muted} />
              </Pressable>
              <Pressable
                accessibilityLabel={status}
                accessibilityRole="button"
                onPress={() => {
                  void app.store.sync();
                }}
                className="h-12 w-12 items-center justify-center"
              >
                <SyncIcon size={18} color={colors.muted} />
              </Pressable>
              <Link href="/settings" asChild>
                <Pressable
                  accessibilityLabel="Настройки"
                  className="h-12 w-12 items-center justify-center"
                >
                  <Settings size={20} color={colors.muted} />
                </Pressable>
              </Link>
            </View>
          </View>
        )}
        {app.error && (
          <View className="px-5 pt-3">
            <ErrorMessage>{app.error}</ErrorMessage>
            {app.status === "needs-login" && (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void app.store.login().catch(() => {});
                }}
                className="py-2"
              >
                <Text className="text-sm font-semibold text-accent">Войти снова</Text>
              </Pressable>
            )}
          </View>
        )}
        {app.local?.conflicts.length ? (
          <Link href="/conflicts" asChild>
            <Pressable className="mx-5 mt-3 rounded-md bg-[#fff5df] px-4 py-3">
              <Text className="text-sm text-[#76501b]">
                Разрешить конфликты изменений · {app.local.conflicts.length}
              </Text>
            </Pressable>
          </Link>
        ) : null}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: "center", paddingBottom: desktop ? 70 : 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className={`w-full max-w-[1000px] ${desktop ? "px-14 pt-7" : "px-5 pt-7"}`}>
            {children}
          </View>
        </ScrollView>
        {!desktop && (
          <View className="flex-row border-t border-line bg-white px-2 pb-3 pt-1">
            {navigation}
          </View>
        )}
        {!desktop && (
          <Pressable
            accessibilityLabel="Добавить задачу"
            accessibilityRole="button"
            onPress={() => setComposer(true)}
            className="absolute bottom-24 right-5 h-14 w-14 items-center justify-center rounded-2xl bg-accent shadow-lg"
          >
            <Plus size={28} color="white" />
          </Pressable>
        )}
      </View>
      {search && <SearchDialog onClose={() => setSearch(false)} />}
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
      <TaskComposer
        visible={composer}
        onClose={() => setComposer(false)}
        scheduling={defaultScheduling}
      />
    </View>
  );
}
