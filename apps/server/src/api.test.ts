import { afterEach, describe, expect, it } from "vite-plus/test";
import { createAPI } from "./api.ts";

const apis: ReturnType<typeof createAPI>[] = [];
afterEach(async () => {
  await Promise.all(apis.splice(0).map((api) => api.close()));
});
function setup(devAuth = false) {
  const api = createAPI({
    databasePath: ":memory:",
    auth: null,
    devAuth,
    ownerEmail: "owner@example.com",
    googleClientId: "",
    webOrigin: "http://localhost:3400",
    staticDirectory: "apps/client/dist",
  });
  apis.push(api);
  return api;
}
describe("HTTP authentication and transport", () => {
  it("does not accept the development header when the mode is off", async () => {
    const api = setup();
    const response = await api.handle(
      new Request("http://localhost:3400/api/sync", {
        method: "POST",
        headers: { "x-polydays-dev": "1", "content-type": "application/json" },
        body: JSON.stringify({ cursor: 0, operations: [] }),
      }),
    );
    expect(response.status).toBe(401);
    expect(
      (
        await api.handle(
          new Request("http://localhost:3400/api/auth/sign-in/social", { method: "POST" }),
        )
      ).status,
    ).toBe(503);
  });
  it("shares the sync service with native workers and rejects foreign web origins", async () => {
    const api = setup(true);
    const request = (origin: string) =>
      new Request("http://localhost:3400/api/sync", {
        method: "POST",
        headers: { origin, "x-polydays-dev": "1", "content-type": "application/json" },
        body: JSON.stringify({ cursor: 0, operations: [] }),
      });
    expect((await api.handle(request("https://untrusted.example"))).status).toBe(403);
    const response = await api.handle(request("http://localhost:3400"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      cursor: 0,
      acknowledged: [],
      changes: [],
      widget: null,
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3400");
  });
});
