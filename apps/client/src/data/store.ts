import {
  buildWidgetProjection,
  completeTask,
  systemNow,
  validateCalendar,
  validateTask,
  validateSeries,
  type Calendar,
  type Document,
  type Task,
} from "@polydays/core";
import {
  acceptResponse,
  decodeSyncResponse,
  documents,
  emptyState,
  enqueue,
  resolveConflict,
  type LocalState,
} from "@polydays/sync";
import { createTRPCClient, httpLink } from "@trpc/client";
import { Schema } from "effect";
import * as Crypto from "expo-crypto";
import type { AppRouter } from "../../../server/src/api";
import type { Account } from "./contract";
import { apiURL, authClient, authCookie, signInGoogle } from "./auth";
import { persist, runtime } from "./runtime";
import { apiFetch } from "./transport";

const Session = Schema.Struct({
  user: Schema.NullOr(
    Schema.Struct({ id: Schema.String, name: Schema.String, email: Schema.String }),
  ),
});
const ServerConfig = Schema.Struct({ google: Schema.Boolean, devAuth: Schema.Boolean });
export type Snapshot = {
  readonly loaded: boolean;
  readonly account: Account | null;
  readonly local: LocalState | null;
  readonly status: "local" | "syncing" | "synced" | "conflict" | "needs-login";
  readonly error: string | null;
  readonly google: boolean;
  readonly devAvailable: boolean;
};

export class AppStore {
  private snapshot: Snapshot = {
    loaded: false,
    account: null,
    local: null,
    status: "local",
    error: null,
    google: false,
    devAvailable: false,
  };
  private listeners = new Set<() => void>();
  private syncing = false;
  private client = createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${apiURL}/trpc`,
        headers: () => this.headers(),
        fetch: (input, init) => apiFetch(input, { ...init, credentials: "include" }),
      }),
    ],
  });
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const callback of this.listeners) callback();
  }
  private async headers(): Promise<Record<string, string>> {
    const cookie = await authCookie();
    return {
      ...(this.snapshot.account?.dev ? { "x-polydays-dev": "1" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    };
  }
  async start() {
    try {
      const account = await runtime.runPromise(persist((adapter) => adapter.profile()));
      if (account) {
        const stored = await runtime.runPromise(persist((adapter) => adapter.load(account.id)));
        this.publish({ account, local: stored?.state ?? emptyState(account.id), loaded: true });
      }
      try {
        const response = await apiFetch(`${apiURL}/api/config`);
        if (response.ok) {
          const config = Schema.decodeUnknownSync(ServerConfig)(await response.json());
          this.publish({ google: config.google, devAvailable: config.devAuth });
        }
        if (!account) await this.refreshSession(false);
      } catch {
        /* Saved data remains available while the server is unreachable. */
      }
      this.publish({ loaded: true });
      if (this.snapshot.account) await this.sync();
    } catch (error) {
      this.publish({ loaded: true, error: message(error) });
    }
  }
  async refreshSession(dev: boolean) {
    const response = await apiFetch(`${apiURL}/api/session`, {
      credentials: "include",
      headers: dev ? { "x-polydays-dev": "1" } : await this.headers(),
    });
    if (!response.ok) throw new Error("Не удалось проверить вход.");
    const session = Schema.decodeUnknownSync(Session)(await response.json());
    if (!session.user) return;
    const account: Account = { ...session.user, dev };
    await runtime.runPromise(persist((adapter) => adapter.setProfile(account)));
    const stored = await runtime.runPromise(persist((adapter) => adapter.load(account.id)));
    this.publish({ account, local: stored?.state ?? emptyState(account.id), error: null });
    const cookie = await authCookie();
    await runtime.runPromise(persist((adapter) => adapter.setCredentials(apiURL, cookie)));
    await this.sync();
  }
  async login(dev = false) {
    if (!dev) await signInGoogle();
    await this.refreshSession(dev);
  }
  async update(transform: (state: LocalState) => LocalState) {
    const account = this.snapshot.account;
    if (!account) throw new Error("Сначала войдите в приложение.");
    const state = await runtime.runPromise(
      persist(async (adapter) => {
        for (let attempt = 0; attempt < 12; attempt++) {
          const stored = await adapter.load(account.id);
          const next = transform(stored?.state ?? emptyState(account.id));
          const projection = buildWidgetProjection(documents(next), systemNow());
          if (await adapter.compareAndSwap(account.id, stored?.version ?? 0, next, projection))
            return next;
        }
        throw new Error("Данные изменились в другом окне. Повторите действие.");
      }),
    );
    this.publish({
      local: state,
      status: state.conflicts.length ? "conflict" : state.pending.length ? "local" : "synced",
      error: null,
    });
  }
  async save(document: Document, base?: Document | null) {
    await this.update((state) => {
      const calendar =
        document.kind === "calendar"
          ? document.data
          : documents(state).find((doc) => doc.kind === "calendar")?.data;
      if (!calendar) throw new Error("Сначала настройте расписание.");
      if (document.kind === "calendar") validateCalendar(document.data);
      if (document.kind === "task") validateTask(document.data, calendar);
      if (document.kind === "series") validateSeries(document.data, calendar);
      if (base !== undefined)
        return {
          ...state,
          pending: [
            ...state.pending,
            { id: Crypto.randomUUID(), entity: document, base, at: systemNow() },
          ],
        };
      return enqueue(state, document, Crypto.randomUUID(), systemNow());
    });
    void this.sync();
  }
  async complete(task: Task, value: boolean) {
    await this.update((state) => {
      const all = documents(state);
      const calendar = all.find((doc) => doc.kind === "calendar")?.data;
      if (!calendar) throw new Error("Сначала настройте расписание.");
      const current = all.find((doc) => doc.kind === "task" && doc.data.id === task.id);
      const latest = current?.kind === "task" ? current.data : task;
      return enqueue(
        state,
        { kind: "task", data: completeTask(latest, value, calendar, systemNow()) },
        Crypto.randomUUID(),
        systemNow(),
      );
    });
    void this.sync();
  }
  async saveCalendar(calendar: Calendar) {
    await this.save({ kind: "calendar", data: calendar });
  }
  async sync() {
    const account = this.snapshot.account;
    if (!account || this.syncing) return;
    this.syncing = true;
    this.publish({ status: "syncing" });
    try {
      for (let page = 0; page < 100; page++) {
        const stored = await runtime.runPromise(persist((adapter) => adapter.load(account.id)));
        const local = stored?.state ?? emptyState(account.id);
        const result = decodeSyncResponse(
          await this.client.sync.mutate({
            cursor: local.cursor,
            operations: local.pending.slice(0, 100),
          }),
        );
        if (this.snapshot.account?.id !== account.id) return;
        await this.update((state) => acceptResponse(state, result));
        if (!result.hasMore && !this.snapshot.local?.pending.length) break;
      }
      this.publish({
        status: this.snapshot.local?.conflicts.length ? "conflict" : "synced",
        error: null,
      });
    } catch (error) {
      const needsLogin =
        message(error).includes("UNAUTHORIZED") || message(error).includes("Google");
      this.publish({
        status: needsLogin ? "needs-login" : "local",
        error: needsLogin
          ? "Сессия истекла. Локальные изменения сохранены; войдите снова для синхронизации."
          : "Нет связи с сервером. Изменения сохранены на устройстве.",
      });
    } finally {
      this.syncing = false;
    }
  }
  async reloadLocal() {
    const account = this.snapshot.account;
    if (!account) return;
    const profile = await runtime.runPromise(persist((adapter) => adapter.profile()));
    if (profile?.id !== account.id) {
      this.publish({ account: null, local: null, status: "local", error: null });
      return;
    }
    const stored = await runtime.runPromise(persist((adapter) => adapter.load(account.id)));
    if (stored) this.publish({ local: stored.state });
  }
  async resolve(id: string, choice: "local" | "remote") {
    await this.update((state) =>
      resolveConflict(state, id, choice, Crypto.randomUUID(), systemNow()),
    );
    void this.sync();
  }
  async logout(discard: boolean) {
    if (this.snapshot.local?.pending.length && !discard) {
      await this.sync();
      if (this.snapshot.local?.pending.length)
        throw new Error(
          "Остались неотправленные изменения. Синхронизируйтесь или подтвердите их удаление.",
        );
    }
    const account = this.snapshot.account;
    if (!account?.dev) {
      const result = await authClient.signOut();
      if (result.error && !discard)
        throw new Error("Не удалось завершить серверную сессию. Проверьте соединение.");
    }
    await runtime.runPromise(
      persist(async (adapter) => {
        await adapter.setCredentials(apiURL, "");
        if (account) await adapter.clear(account.id);
        await adapter.setProfile(null);
      }),
    );
    this.publish({ account: null, local: null, status: "local", error: null });
  }
}
export const message = (error: unknown): string =>
  error instanceof Error ? error.message : "Не удалось выполнить действие.";
export const appStore = new AppStore();
