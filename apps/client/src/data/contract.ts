import type { LocalState } from "@polydays/sync";
import type { WidgetProjection } from "@polydays/core";

export type Account = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly dev: boolean;
};
export type Stored = { readonly version: number; readonly state: LocalState };
export interface PersistenceAdapter {
  load(accountId: string): Promise<Stored | null>;
  compareAndSwap(
    accountId: string,
    version: number,
    state: LocalState,
    projection: WidgetProjection | null,
  ): Promise<boolean>;
  profile(): Promise<Account | null>;
  setProfile(account: Account | null): Promise<void>;
  clear(accountId: string): Promise<void>;
  setCredentials(apiURL: string, cookie: string): Promise<void>;
}
