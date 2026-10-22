import { openDB } from "idb";
import { Schema } from "effect";
import { decodeLocalState } from "@polydays/sync";
import type { PersistenceAdapter, Stored } from "./contract";

const Profile = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  dev: Schema.Boolean,
});
const db = () =>
  openDB("polydays", 1, {
    upgrade(database) {
      database.createObjectStore("accounts");
      database.createObjectStore("settings");
    },
  });
export const storage: PersistenceAdapter = {
  async load(accountId) {
    const database = await db();
    const stored: unknown = await database.get("accounts", accountId);
    if (!stored) return null;
    const decoded = Schema.decodeUnknownSync(
      Schema.Struct({ version: Schema.Int, state: Schema.Unknown }),
    )(stored);
    return { version: decoded.version, state: decodeLocalState(decoded.state) };
  },
  async compareAndSwap(accountId, version, state, projection) {
    const database = await db();
    const tx = database.transaction(["accounts", "settings"], "readwrite");
    const profile: unknown = await tx.objectStore("settings").get("profile");
    if (!profile || Schema.decodeUnknownSync(Profile)(profile).id !== accountId) {
      await tx.done;
      return false;
    }
    const current: Stored | undefined = await tx.objectStore("accounts").get(accountId);
    if ((current?.version ?? 0) !== version) {
      await tx.done;
      return false;
    }
    await tx.objectStore("accounts").put({ version: version + 1, state }, accountId);
    if (projection) await tx.objectStore("settings").put(projection, `widget:${accountId}`);
    else await tx.objectStore("settings").delete(`widget:${accountId}`);
    await tx.done;
    return true;
  },
  async profile() {
    const database = await db();
    const value: unknown = await database.get("settings", "profile");
    return value ? Schema.decodeUnknownSync(Profile)(value) : null;
  },
  async setProfile(account) {
    const database = await db();
    await database.put("settings", account, "profile");
  },
  async clear(accountId) {
    const database = await db();
    await database.delete("accounts", accountId);
    await database.delete("settings", `widget:${accountId}`);
  },
  async setCredentials() {},
};
