import { test, expect } from "@playwright/test";

test("schedule accepts quick time entry, explains errors and keeps each wide row together", async ({
  page,
}, testInfo) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
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
