import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";
import { desktopSignIn, desktopSignOut, isDesktop } from "./desktop.web";
import { executeMutation } from "./query";
import { apiFetch } from "./transport";

export const apiURL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? __DEV__
      ? "http://localhost:3000"
      : globalThis.location.origin
    : "http://10.0.2.2:3000");
const webClient = createAuthClient({
  baseURL: apiURL,
  fetchOptions: { customFetchImpl: apiFetch },
});
export const authClient = {
  signOut: () =>
    executeMutation(["sign-out", apiURL], async () => {
      const result = await (isDesktop() ? desktopSignOut() : webClient.signOut());
      if (result.error) throw new Error(result.error.message || "Не удалось выйти из аккаунта.");
      return result;
    }),
};
export const authCookie = async () => "";
export function signInGoogle() {
  return executeMutation(["sign-in", apiURL], async () => {
    if (isDesktop()) return desktopSignIn();
    const result = await webClient.signIn.social({
      provider: "google",
      callbackURL:
        globalThis.location.pathname === "/device"
          ? globalThis.location.href
          : `${globalThis.location.origin}/current`,
    });
    if (result.error) throw new Error(result.error.message || "Не удалось войти через Google.");
  });
}
