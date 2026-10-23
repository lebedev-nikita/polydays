import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { requireNativeModule } from "expo";
import * as Crypto from "expo-crypto";
import { executeMutation, queryClient } from "./query";
import { googleConfigQuery } from "./requests";
import { apiFetch } from "./transport";
import { apiURL, defaultApiURL } from "./server";
export { apiURL } from "./server";

const createClient = () =>
  createAuthClient({
    baseURL: apiURL,
    fetchOptions: { customFetchImpl: apiFetch },
    plugins: [
      expoClient({
        scheme: "polydays",
        storagePrefix:
          apiURL === defaultApiURL
            ? "polydays"
            : `polydays-${apiURL.replace(/[^a-zA-Z0-9.-]/g, (char) => `_${char.charCodeAt(0).toString(16)}_`)}`,
        storage: SecureStore,
      }),
    ],
  });
let nativeClient = createClient();
export function configureAuth() {
  nativeClient = createClient();
}
export const authClient = {
  signOut: () =>
    executeMutation(["sign-out", apiURL], async () => {
      const result = await nativeClient.signOut();
      if (result.error) throw new Error(result.error.message || "Не удалось выйти из аккаунта.");
      return result;
    }),
};
export const authCookie = async () => nativeClient.getCookie() || "";
export async function signInGoogle() {
  const config = await queryClient.fetchQuery(googleConfigQuery(apiURL));
  const nonce = Crypto.randomUUID();
  const native = requireNativeModule<{
    googleSignIn(clientId: string, nonce: string): Promise<string>;
  }>("PolydaysStorage");
  const token = await native.googleSignIn(config.clientId, nonce);
  await executeMutation(["sign-in", apiURL], async () => {
    const result = await nativeClient.signIn.social({
      provider: "google",
      idToken: { token, nonce },
    });
    if (result.error) throw new Error(result.error.message || "Не удалось войти через Google.");
  });
}
