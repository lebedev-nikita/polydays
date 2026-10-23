import { test, expect } from "@playwright/test";

test("custom server persists and supplies authentication and sync endpoints", async ({ page }) => {
  const server = "https://custom.polydays.test";
  let signedIn = false;
  let syncs = 0;
  const calls: string[] = [];
  await page.route(`${server}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    calls.push(path);
    const headers = {
      "access-control-allow-origin": "http://localhost:3400",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type,x-trpc-source",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (path === "/api/config") {
      await route.fulfill({ headers, json: { google: true, devAuth: false } });
      return;
    }
    if (path === "/api/auth/sign-in/social") {
      expect(request.postDataJSON().provider).toBe("google");
      signedIn = true;
      await route.fulfill({ headers, json: { redirect: false } });
      return;
    }
    if (path === "/api/session") {
      await route.fulfill({
        headers,
        json: {
          user: signedIn
            ? { id: "custom-user", name: "Custom", email: "custom@example.com" }
            : null,
        },
      });
      return;
    }
    if (path === "/trpc/sync") {
      syncs++;
      expect(request.postDataJSON().operations).toEqual([]);
      await route.fulfill({
        headers,
        json: {
          result: {
            data: { acknowledged: [], conflicts: [], changes: [], cursor: 0, hasMore: false },
          },
        },
      });
      return;
    }
    await route.fulfill({ status: 404, headers, json: {} });
  });
  await page.goto("/current");
  const field = page.getByRole("textbox", { name: "Сервер", exact: true });
  await field.fill("https://example.com/api");
  await page.getByRole("button", { name: "Подключиться", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("без пути");
  expect(calls).toEqual([]);
  await field.fill(` ${server}/ `);
  await page.getByRole("button", { name: "Подключиться", exact: true }).click();
  await expect(field).toHaveValue(server);
  await expect(page.getByRole("button", { name: "Продолжить с Google" })).toBeEnabled();
  await field.fill("https://another.polydays.test");
  await expect(page.getByRole("button", { name: "Продолжить с Google" })).toBeDisabled();
  await field.fill(server);
  await expect(page.getByRole("button", { name: "Продолжить с Google" })).toBeEnabled();
  await page.reload();
  await expect(field).toHaveValue(server);
  await page.screenshot({
    path: ".data/screenshots/server-url-desktop-20261023.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".data/screenshots/server-url-mobile-20261023.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Продолжить с Google" }).click();
  await expect.poll(() => syncs).toBeGreaterThan(0);
  expect(calls).toContain("/api/config");
  expect(calls).toContain("/api/auth/sign-in/social");
  expect(calls).toContain("/api/session");
});

test("an unreachable server remains editable after restart", async ({ page }) => {
  await page.route("https://offline.polydays.test/**", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/current");
  const field = page.getByRole("textbox", { name: "Сервер", exact: true });
  await field.fill("https://offline.polydays.test");
  await page.getByRole("button", { name: "Подключиться", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Нет связи с сервером");
  await page.reload();
  await expect(field).toHaveValue("https://offline.polydays.test");
  await expect(page.getByRole("alert")).toContainText("Нет связи с сервером");
  await field.fill("http://localhost:3400");
  await page.getByRole("button", { name: "Подключиться", exact: true }).click();
  await expect(page.getByRole("button", { name: "Открыть пространство разработки" })).toBeVisible();
});
