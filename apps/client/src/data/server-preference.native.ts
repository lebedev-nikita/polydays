import * as SecureStore from "expo-secure-store";

const key = "polydays.server-url";

export const serverPreference = {
  load: () => SecureStore.getItemAsync(key),
  save: (url: string) => SecureStore.setItemAsync(key, url),
};
