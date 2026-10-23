import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { AppState, Platform } from "react-native";
import { appStore } from "../data/store";
import { systemNow, type Calendar, type Series, type Task } from "@polydays/core";
import { documents } from "@polydays/sync";
import { prepareOffline } from "../data/offline";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../data/query";

const StoreContext = createContext(appStore);
export function StoreProvider({ children }: { children: ReactNode }) {
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
      <StoreContext.Provider value={appStore}>{children}</StoreContext.Provider>
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
