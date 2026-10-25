import { test, expect } from "@playwright/test";

for (const futureDate of [false, true]) {
  test(`keeps renamed polydays after reopening settings (${futureDate ? "selected future date" : "tomorrow"})`, async ({
    page,
  }, testInfo) => {
    await page.clock.setFixedTime(new Date("2026-10-25T08:00:00+04:00"));
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/current");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование" }).click();
    await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();
    await page.goto("/settings");
    const name = page.getByRole("textbox", { name: "Полидень 1", exact: true });
    const date = page.getByRole("button", { name: /^Дата начала действия расписания:/ });
    if (futureDate) {
      await date.click();
      await page.getByRole("button", { name: "Следующий месяц", exact: true }).click();
      await page.getByRole("button", { name: /^15 / }).click();
    }
    const selectedDate = await date.innerText();
    await name.fill("Рассвет");
    await page.getByRole("button", { name: "Сохранить расписание", exact: true }).click();
    await expect(page.getByText("Расписание сохранено.", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Начало действия:/)).toContainText(
      selectedDate.toLocaleLowerCase("ru"),
    );
    await page.reload();
    await expect(name).toHaveValue("Рассвет");
    await expect(date).toHaveText(selectedDate);
    await name.fill("Ранний");
    await page.getByRole("button", { name: "Сохранить расписание", exact: true }).click();
    await expect(page.getByText("Расписание сохранено.", { exact: true })).toBeVisible();
    if (!futureDate) {
      await page.screenshot({ path: testInfo.outputPath("rename-verified-desktop-20261025.png") });
      await page.setViewportSize({ width: 390, height: 1000 });
      await name.scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath("rename-verified-mobile-20261025.png") });
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    await page.getByRole("link", { name: "Входящие", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Входящие", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    await page.getByRole("link", { name: "Настройки", exact: true }).click();
    await expect(name).toHaveValue("Ранний");
    await expect(date).toHaveText(selectedDate);
    await page.goto("/current");
    await expect(page.getByRole("heading", { name: "Утренний", exact: true })).toBeVisible();
    await page.clock.setFixedTime(
      new Date(`${futureDate ? "2026-11-15" : "2026-10-26"}T08:00:00+04:00`),
    );
    await page.reload();
    await expect(page.getByRole("heading", { name: "Ранний", exact: true })).toBeVisible();
  });
}

test("schedule accepts quick time entry, explains errors and keeps each wide row together", async ({
  page,
}, testInfo) => {
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование" }).click();
  await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();
  await page.goto("/settings");
  const save = page.getByRole("button", { name: "Сохранить расписание", exact: true });
  await expect(save).toBeVisible();

  const zoneChoice = page.getByRole("button", { name: /^Выбрать часовой пояс:/ });
  await zoneChoice.click();
  const zoneSearch = page.getByRole("textbox", { name: "Поиск часового пояса", exact: true });
  await zoneSearch.fill("несуществующий город");
  await expect(
    page.getByText("Ничего не найдено. Попробуйте другое название города."),
  ).toBeVisible();
  await zoneSearch.fill("берлин");
  await page.getByRole("button", { name: /^Часовой пояс: Берлин ·/ }).click();
  await expect(zoneChoice).toContainText("Берлин");
  await expect(zoneChoice).toBeFocused();
  await zoneChoice.click();
  await zoneSearch.press("Escape");
  await expect(zoneSearch).not.toBeVisible();
  await expect(zoneChoice).toBeFocused();
  const automatic = page.getByRole("switch", { name: "Определять часовой пояс автоматически" });
  await automatic.check();
  await expect(automatic).toBeChecked();
  await automatic.uncheck();
  await expect(automatic).not.toBeChecked();

  const dateChoice = page.getByRole("button", { name: /^Дата начала действия расписания:/ });
  await expect(dateChoice).toContainText("Завтра,");
  await dateChoice.click();
  await page.getByRole("button", { name: "Сегодня", exact: true }).click();
  await expect(dateChoice).toContainText("Сегодня,");
  await dateChoice.click();
  await expect(page.getByRole("button", { name: "Предыдущий месяц", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Следующий месяц", exact: true }).click();
  await page.getByRole("button", { name: /^15 / }).click();
  await expect(dateChoice).toContainText("15 ");
  await expect(dateChoice).toBeFocused();
  await dateChoice.click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await expect(dateChoice).toContainText("Завтра,");

  const name = page.getByRole("textbox", { name: "Полидень 1", exact: true });
  const start = page.getByRole("textbox", { name: "Начало полидня 1", exact: true });
  const end = page.getByRole("textbox", { name: "Конец полидня 1", exact: true });
  const originalEnd = await end.inputValue();
  const overnightHints = page.getByText("+1 день", { exact: true });
  const originalOvernightCount = await overnightHints.count();
  const nameBounds = await name.boundingBox();
  expect((await start.boundingBox())?.y).toBe(nameBounds?.y);
  expect((await end.boundingBox())?.y).toBe(nameBounds?.y);
  await page.screenshot({ path: testInfo.outputPath("schedule-desktop.png") });
  await dateChoice.click();
  await page.screenshot({ path: testInfo.outputPath("schedule-calendar.png") });
  await dateChoice.click();

  await start.fill("730");
  await start.press("Tab");
  await expect(start).toHaveValue("07:30");
  await expect(end).toBeFocused();
  expect(
    await end.evaluate((input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!),
  ).toBe(5);
  await end.fill("24:00");
  await end.press("Tab");
  await expect(end).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("От 00:00 до 23:59", { exact: true })).toBeVisible();
  await save.click();
  await expect(page.getByText("Проверьте время полидня 1:", { exact: false })).toBeVisible();
  await expect(page.getByText("Расписание сохранено.", { exact: true })).not.toBeVisible();

  await end.fill("200");
  await expect(end).toHaveAttribute("aria-invalid", "false");
  await expect(overnightHints).toHaveCount(originalOvernightCount + 1);
  await end.fill(originalEnd.replace(":", ""));
  // Saving also normalizes the active field, without relying on a prior blur.
  await save.dispatchEvent("click");
  await expect(end).toHaveValue(originalEnd);
  await expect(page.getByText("Расписание сохранено.", { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 320, height: 760 });
  await expect
    .poll(async () => {
      const nameBounds = await name.boundingBox();
      const startBounds = await start.boundingBox();
      return startBounds!.y > nameBounds!.y;
    })
    .toBe(true);
  await name.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("schedule-mobile.png") });
  const narrowName = await name.boundingBox();
  const narrowStart = await start.boundingBox();
  const narrowEnd = await end.boundingBox();
  expect(narrowStart!.y).toBeGreaterThan(narrowName!.y);
  expect(narrowEnd!.y).toBe(narrowStart!.y);
  expect(narrowEnd!.x + narrowEnd!.width).toBeLessThanOrEqual(320);

  await dateChoice.scrollIntoViewIfNeeded();
  await dateChoice.click();
  await page.getByRole("button", { name: "Следующий месяц", exact: true }).click();
  await page.getByRole("button", { name: /^15 / }).click();
  await expect(dateChoice).toContainText("15 ");
  await dateChoice.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("schedule-mobile-settings.png") });
});
