import { Platform } from "react-native";
import { serverPreference } from "./server-preference";
import { normalizeServerURL } from "./server-url";

export const defaultApiURL = normalizeServerURL(
  process.env.EXPO_PUBLIC_API_URL ||
    (Platform.OS === "web"
      ? __DEV__
        ? "http://localhost:3000"
        : globalThis.location.origin
      : "http://10.0.2.2:3000"),
);
export let apiURL = defaultApiURL;

export async function loadServerURL() {
  const saved = await serverPreference.load();
  apiURL = saved ? normalizeServerURL(saved) : defaultApiURL;
}

export async function saveServerURL(url: string) {
  const normalized = normalizeServerURL(url);
  await serverPreference.save(normalized);
  apiURL = normalized;
}
