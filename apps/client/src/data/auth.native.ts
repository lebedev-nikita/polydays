import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { requireNativeModule } from "expo";
import * as Crypto from "expo-crypto";
import { Schema } from "effect";

export const apiURL = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";
export const authClient = createAuthClient({
  baseURL: apiURL,
  plugins: [expoClient({ scheme: "polydays", storagePrefix: "polydays", storage: SecureStore })],
});
export const authCookie = async () => authClient.getCookie() || "";
export async function signInGoogle() {
  const response = await fetch(`${apiURL}/api/google-config`);
  if (!response.ok) throw new Error("Google-вход пока не настроен.");
  const config = Schema.decodeUnknownSync(Schema.Struct({ clientId: Schema.NonEmptyString }))(
    await response.json(),
  );
  const nonce = Crypto.randomUUID();
  const native = requireNativeModule<{
    googleSignIn(clientId: string, nonce: string): Promise<string>;
  }>("PolydaysStorage");
  const token = await native.googleSignIn(config.clientId, nonce);
  const result = await authClient.signIn.social({ provider: "google", idToken: { token, nonce } });
  if (result.error) throw new Error(result.error.message || "Не удалось войти через Google.");
}
