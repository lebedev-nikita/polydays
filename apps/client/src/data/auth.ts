import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import { desktopSignIn, desktopSignOut, isDesktop } from "./desktop.web";

export const apiURL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? __DEV__
      ? "http://localhost:3000"
      : globalThis.location.origin
    : "http://10.0.2.2:3000");
const webClient = createAuthClient({ baseURL: apiURL });
export const authClient = { signOut: () => (isDesktop() ? desktopSignOut() : webClient.signOut()) };
export const authCookie = async () => "";
export async function signInGoogle() {
  if (isDesktop()) return desktopSignIn();
  const result = await webClient.signIn.social({
    provider: "google",
    callbackURL:
      globalThis.location.pathname === "/device"
        ? globalThis.location.href
        : `${globalThis.location.origin}/current`,
  });
  if (result.error) throw new Error(result.error.message || "Не удалось войти через Google.");
}
