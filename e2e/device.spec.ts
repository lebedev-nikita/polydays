import { test, expect } from "@playwright/test";

test("desktop authorization requires an explicit decision and handles an expired code", async ({
  page,
}) => {
  await page.route("**/api/auth/device?**", (route) =>
    route.fulfill({ json: { status: "pending", client_id: "polydays-macos" } }),
  );
  let approved = 0;
  await page.route("**/api/auth/device/approve", async (route) => {
    approved++;
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/device?user_code=DEMO1234");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await expect(page.getByRole("heading", { name: "Вход в Polydays на Mac" })).toBeVisible();
  expect(approved).toBe(0);
  await expect(page.getByRole("textbox", { name: "Код входа" })).toHaveValue("DEMO1234");
  await page.screenshot({
    path: ".impeccable/review/release-0.1.0/device-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: ".impeccable/review/release-0.1.0/device-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 390 });
  await page.getByRole("heading", { name: "Вход в Polydays на Mac" }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: ".impeccable/review/release-0.1.0/device-landscape-top.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Отклонить", exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Отклонить", exact: true })).toBeInViewport();
  await page.screenshot({
    path: ".impeccable/review/release-0.1.0/device-landscape-actions.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Разрешить вход", exact: true }).click();
  await expect(page.getByText("Вход разрешён. Вернитесь в Polydays на Mac.")).toBeVisible();
  expect(approved).toBe(1);
  await expect(page.locator('[aria-live="polite"]')).toContainText("Вход разрешён");
  await page.screenshot({
    path: ".impeccable/review/release-0.1.0/device-approved.png",
    fullPage: true,
  });
  await page.route("**/api/auth/device?**", (route) =>
    route.fulfill({ status: 400, json: { error: "expired_token" } }),
  );
  await page.goto("/device?user_code=EXPIRED1");
  await page.getByRole("button", { name: "Разрешить вход", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Код недействителен или истёк");
  expect(approved).toBe(1);
  await page.screenshot({
    path: ".impeccable/review/release-0.1.0/device-expired.png",
    fullPage: true,
  });
});
