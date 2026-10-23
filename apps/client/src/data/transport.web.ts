import { desktopFetch, isDesktop } from "./desktop.web";

export const apiFetch: typeof fetch = (...args) =>
  isDesktop() ? desktopFetch(...args) : fetch(...args);
