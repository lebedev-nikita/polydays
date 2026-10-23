import { createAuthClient } from "better-auth/react";
import { desktopSignIn, desktopSignOut, isDesktop } from "./desktop.web";
import { executeMutation } from "./query";
import { apiFetch } from "./transport";
import { apiURL } from "./server";
export { apiURL } from "./server";

const createClient = () =>
  createAuthClient({
    baseURL: apiURL,
    fetchOptions: { customFetchImpl: apiFetch },
  });
let webClient = createClient();
export function configureAuth() {
  webClient = createClient();
}
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
