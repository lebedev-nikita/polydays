import { Schema } from "effect";

const ServerURL = Schema.URLFromString.check(
  Schema.makeFilter(
    (url) =>
      (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
  ),
);

export function normalizeServerURL(input: string): string {
  try {
    return Schema.decodeUnknownSync(ServerURL)(input.trim()).origin;
  } catch {
    throw new Error("Введите адрес сервера с https:// или http://, без пути, параметров и пароля.");
  }
}
