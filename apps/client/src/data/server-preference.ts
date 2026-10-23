const key = "polydays.server-url";

export const serverPreference = {
  async load() {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  async save(url: string) {
    globalThis.localStorage.setItem(key, url);
  },
};
