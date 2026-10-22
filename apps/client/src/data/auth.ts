import { createAuthClient } from "better-auth/react";
import { Platform } from "react-native";

export const apiURL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web"
    ? __DEV__
      ? "http://localhost:3000"
      : globalThis.location.origin
    : "http://10.0.2.2:3000");
export const authClient = createAuthClient({ baseURL: apiURL });
export const authCookie = async () => "";
export async function signInGoogle() {
  const result = await authClient.signIn.social({
    provider: "google",
    callbackURL: `${globalThis.location.origin}/current`,
  });
  if (result.error) throw new Error(result.error.message || "Не удалось войти через Google.");
}
