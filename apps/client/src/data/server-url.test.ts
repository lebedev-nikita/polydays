import { describe, expect, it } from "vitest";
import { normalizeServerURL } from "./server-url";

describe("server URL", () => {
  it("normalizes origins, trailing slashes, whitespace and default ports", () => {
    expect(normalizeServerURL("  https://EXAMPLE.com:443/  ")).toBe("https://example.com");
    expect(normalizeServerURL("http://10.0.2.2:3000/")).toBe("http://10.0.2.2:3000");
    expect(normalizeServerURL("http://[::1]:3400")).toBe("http://[::1]:3400");
  });
  it.each([
    "",
    "example.com",
    "//example.com",
    "file:///tmp/a",
    "ftp://example.com",
    "https://user:password@example.com",
    "https://example.com/api",
    "https://example.com?token=a",
    "https://example.com/#fragment",
  ])("rejects unsupported server address %s", (url) => {
    expect(() => normalizeServerURL(url)).toThrow("Введите адрес сервера");
  });
});
