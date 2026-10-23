import { afterEach, describe, expect, it, vi } from "vitest";
import { MutationObserver, onlineManager } from "@tanstack/react-query";
import { clearRequestCache, executeMutation, queryClient } from "./query";
import {
  deviceAuthorizationMutation,
  googleConfigQuery,
  serverConfigQuery,
  sessionQuery,
} from "./requests";

const apiURL = "https://polydays.test";

afterEach(async () => {
  await clearRequestCache();
  onlineManager.setOnline(true);
  vi.unstubAllGlobals();
});

describe("HTTP queries", () => {
  it("deduplicates concurrent configuration reads and reuses decoded cached data", async () => {
    const fetch = vi.fn(async () => Response.json({ google: true, devAuth: false }));
    vi.stubGlobal("fetch", fetch);
    const options = serverConfigQuery(apiURL);
    const [first, second] = await Promise.all([
      queryClient.fetchQuery(options),
      queryClient.fetchQuery(options),
    ]);
    expect(first).toEqual({ google: true, devAuth: false });
    expect(second).toEqual(first);
    expect(await queryClient.fetchQuery(options)).toEqual(first);
    expect(fetch).toHaveBeenCalledTimes(1);
    await queryClient.invalidateQueries({ queryKey: options.queryKey });
    await queryClient.fetchQuery(options);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("caches Google configuration by server", async () => {
    const fetch = vi.fn(async () => Response.json({ clientId: "google-client-id" }));
    vi.stubGlobal("fetch", fetch);
    await queryClient.fetchQuery(googleConfigQuery(apiURL));
    await queryClient.fetchQuery(googleConfigQuery(apiURL));
    await queryClient.fetchQuery(googleConfigQuery("https://another.test"));
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects HTTP failures and malformed data without caching them as successful reads", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ google: "yes", devAuth: false }))
      .mockResolvedValueOnce(Response.json({ google: true, devAuth: false }));
    vi.stubGlobal("fetch", fetch);
    const options = serverConfigQuery(apiURL);
    await expect(queryClient.fetchQuery(options)).rejects.toThrow("настройки сервера");
    await expect(queryClient.fetchQuery(options)).rejects.toThrow();
    expect(queryClient.getQueryData(options.queryKey)).toBeUndefined();
    await expect(queryClient.fetchQuery(options)).resolves.toEqual({
      google: true,
      devAuth: false,
    });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("rechecks sessions and separates accounts and development authentication", async () => {
    const user = { id: "owner", name: "Owner", email: "owner@example.com" };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ user }))
      .mockResolvedValueOnce(Response.json({ user: null }))
      .mockResolvedValue(Response.json({ user }));
    vi.stubGlobal("fetch", fetch);
    const headers = async () => ({ Cookie: "session=private" });
    const options = sessionQuery(apiURL, "owner", false, headers);
    expect((await queryClient.fetchQuery(options)).user).toEqual(user);
    expect((await queryClient.fetchQuery(options)).user).toBeNull();
    const dev = sessionQuery(apiURL, "owner", true, headers);
    await queryClient.fetchQuery(dev);
    expect(dev.queryKey).not.toEqual(options.queryKey);
    expect(sessionQuery(apiURL, "other", false, headers).queryKey).not.toEqual(options.queryKey);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      credentials: "include",
      headers: { Cookie: "session=private" },
    });
    expect(fetch.mock.calls[2]?.[1]).toMatchObject({ headers: { "x-polydays-dev": "1" } });
    expect(JSON.stringify(options.queryKey)).not.toContain("private");
  });

  it("aborts in-flight reads and removes cached account data when authentication changes", async () => {
    let signal: AbortSignal | undefined;
    let finish: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init: RequestInit) => {
        signal = init.signal ?? undefined;
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }),
    );
    const pending = queryClient.fetchQuery(serverConfigQuery(apiURL));
    const rejected = expect(pending).rejects.toThrow();
    await clearRequestCache();
    expect(signal?.aborted).toBe(true);
    finish(Response.json({ google: true, devAuth: false }));
    await rejected;
    expect(queryClient.getQueryCache().getAll()).toEqual([]);
  });
});

describe("HTTP mutations", () => {
  it("runs every mutation once even when the online manager reports offline", async () => {
    onlineManager.setOnline(false);
    const write = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(executeMutation(["sync", apiURL, "owner"], write)).rejects.toThrow("offline");
    expect(write).toHaveBeenCalledTimes(1);
    const success = vi.fn(async () => "saved");
    await executeMutation(["sync", apiURL, "owner"], success);
    await executeMutation(["sync", apiURL, "owner"], success);
    expect(success).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => expect(queryClient.getMutationCache().getAll()).toEqual([]));
  });

  it("revalidates the device code before each decision and never retries approval", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ status: "pending" }))
      .mockResolvedValueOnce(Response.json({ error: "unavailable" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: "expired_token" }, { status: 400 }));
    vi.stubGlobal("fetch", fetch);
    const mutation = new MutationObserver(
      queryClient,
      deviceAuthorizationMutation(apiURL, "owner"),
    );
    try {
      await expect(mutation.mutate({ code: "CODE 123", approve: true })).rejects.toThrow(
        "Не удалось подтвердить вход",
      );
      await expect(mutation.mutate({ code: "CODE 123", approve: true })).rejects.toThrow(
        "Код недействителен или истёк",
      );
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(fetch.mock.calls[0]?.[0]).toContain("user_code=CODE%20123");
      expect(fetch.mock.calls[1]).toEqual([
        `${apiURL}/api/auth/device/approve`,
        expect.objectContaining({ method: "POST", body: JSON.stringify({ userCode: "CODE 123" }) }),
      ]);
    } finally {
      mutation.reset();
    }
  });
});
