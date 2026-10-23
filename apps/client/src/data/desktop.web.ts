import { invoke, isTauri } from "@tauri-apps/api/core";
import { Schema } from "effect";

export const isDesktop = isTauri;
const NativeResponse = Schema.Struct({
  status: Schema.Int,
  body: Schema.String,
  contentType: Schema.String,
});
export const desktopFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const response = Schema.decodeUnknownSync(NativeResponse)(
    await invoke("api_request", {
      path: url.pathname + url.search,
      method: request.method,
      body: request.method === "GET" ? null : await request.text(),
    }),
  );
  return new Response(response.body, {
    status: response.status,
    headers: { "Content-Type": response.contentType },
  });
};
export const desktopSignIn = () => invoke<void>("sign_in");
export const desktopSignOut = async () => {
  try {
    await invoke("sign_out");
    return { error: null };
  } catch (cause) {
    return { error: { message: String(cause) } };
  }
};
