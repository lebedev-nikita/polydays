import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState, Platform, Pressable, Text, View } from "react-native";
import { appStore } from "../data/store";
import { systemNow, type Calendar, type Series, type Task } from "@polydays/core";
import { documents } from "@polydays/sync";
import { prepareOffline } from "../data/offline";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../data/query";

const StoreContext = createContext(appStore);
type Notice = { text: string; undo?: () => Promise<void> };
const NoticeContext = createContext<(text: string, undo?: () => Promise<void>) => void>(() => {});
export const useNotice = () => useContext(NoticeContext);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    prepareOffline();
    void appStore.start();
    const timer = setInterval(() => {
      void appStore.reloadLocal().then(() => appStore.sync());
    }, 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void appStore.reloadLocal().then(() => appStore.sync());
    });
    const online = () => {
      void appStore.sync();
    };
    if (Platform.OS === "web") globalThis.addEventListener("online", online);
    return () => {
      clearInterval(timer);
      subscription.remove();
      if (Platform.OS === "web") globalThis.removeEventListener("online", online);
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <StoreContext.Provider value={appStore}>
        <NoticeContext.Provider value={(text, undo) => setNotice({ text, undo })}>
          {children}
          {notice && (
            <View className="absolute bottom-24 left-5 right-5 flex-row items-center gap-4 rounded-lg bg-ink px-4 py-2 shadow-lg md:bottom-6 md:left-auto md:right-6 md:max-w-[440px]">
              <Text accessibilityLiveRegion="polite" className="flex-1 text-sm text-white">
                {notice.text}
              </Text>
              {notice.undo && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    const undo = notice.undo;
                    setNotice(null);
                    void undo?.().catch(() =>
                      setNotice({ text: "Не удалось отменить. Повторите действие." }),
                    );
                  }}
                  className="min-h-9 justify-center px-2"
                >
                  <Text className="text-sm font-semibold text-white underline">Отменить</Text>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Скрыть уведомление"
                onPress={() => setNotice(null)}
                className="min-h-9 justify-center px-2"
              >
                <Text className="text-xs text-white">Закрыть</Text>
              </Pressable>
            </View>
          )}
        </NoticeContext.Provider>
      </StoreContext.Provider>
    </QueryClientProvider>
  );
}
export function useApp() {
  const store = useContext(StoreContext);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [now, setNow] = useState(systemNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(systemNow()), 15000);
    return () => clearInterval(timer);
  }, []);
  const all = snapshot.local ? documents(snapshot.local) : [];
  const calendar: Calendar | null = all.find((item) => item.kind === "calendar")?.data ?? null;
  const tasks: ReadonlyArray<Task> = all.flatMap((item) =>
    item.kind === "task" ? [item.data] : [],
  );
  const series: ReadonlyArray<Series> = all.flatMap((item) =>
    item.kind === "series" ? [item.data] : [],
  );
  return { ...snapshot, store, now, calendar, tasks, series };
}
