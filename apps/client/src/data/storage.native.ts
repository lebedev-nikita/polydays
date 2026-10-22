import { requireNativeModule } from "expo";
import { decodeLocalState } from "@polydays/sync";
import { Schema } from "effect";
import type { Account, PersistenceAdapter } from "./contract";

type NativeStore = {
  load(accountId: string): Promise<string | null>;
  compareAndSwap(
    accountId: string,
    version: number,
    state: string,
    projection: string | null,
  ): Promise<boolean>;
  getProfile(): Promise<string | null>;
  setProfile(value: string | null): Promise<void>;
  clear(accountId: string): Promise<void>;
  setCredentials(apiURL: string, cookie: string): Promise<void>;
};
const module = () => requireNativeModule<NativeStore>("PolydaysStorage");
const Stored = Schema.Struct({ version: Schema.Int, state: Schema.Unknown });
const Profile = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  dev: Schema.Boolean,
});
export const storage: PersistenceAdapter = {
  async load(accountId) {
    const raw = await module().load(accountId);
    if (!raw) return null;
    const value = Schema.decodeUnknownSync(Stored)(JSON.parse(raw));
    return { version: value.version, state: decodeLocalState(value.state) };
  },
  compareAndSwap: (accountId, version, state, projection) =>
    module().compareAndSwap(
      accountId,
      version,
      JSON.stringify(state),
      projection ? JSON.stringify(projection) : null,
    ),
  async profile() {
    const raw = await module().getProfile();
    return raw ? Schema.decodeUnknownSync(Profile)(JSON.parse(raw)) : null;
  },
  setProfile: (account: Account | null) =>
    module().setProfile(account ? JSON.stringify(account) : null),
  clear: (accountId) => module().clear(accountId),
  setCredentials: (apiURL, cookie) => module().setCredentials(apiURL, cookie),
};
