import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const [today, month, nextMonth, firstDay, lastDay] of [
  ["2026-10-25", "октябрь 2026", "ноябрь 2026", "26 октября", "1 ноября"],
  ["2026-12-27", "декабрь 2026", "январь 2027", "28 декабря", "3 января 2027 г."],
  ["2028-02-27", "февраль 2028", "март 2028", "28 февраля", "5 марта"],
] as const) {
  test(`week navigation keeps the month of Monday across ${today}`, async ({ page }, testInfo) => {
    await page.clock.setFixedTime(new Date(`${today}T08:00:00+04:00`));
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
    await page.getByRole("textbox", { name: "Название задачи" }).fill("Проверить неделю");
    const trigger = page.getByRole("button", { name: /^Когда выполнить ·/ });
    const originalSelection = await trigger.innerText();
    await trigger.click();
    const heading = page.getByRole("button", { name: "Открыть календарь", exact: true });
    const next = page.getByRole("button", { name: "Следующая неделя", exact: true });
    const previous = page.getByRole("button", { name: "Предыдущая неделя", exact: true });
    await next.click();
    await expect(
      page.getByRole("button", { name: `Завтра, ${firstDay}`, exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: lastDay, exact: true })).toBeVisible();
    await expect(heading).toContainText(month);
    await next.click();
    await expect(heading).toContainText(nextMonth);
    await previous.click();
    await expect(heading).toContainText(month);
    await previous.click();
    await expect(heading).toContainText(month);
    await next.click();
    if (today === "2026-10-25") {
      const capture = crypto.randomUUID();
      await page.screenshot({ path: `.data/ui-qa/week-october-mobile-${capture}.png` });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: testInfo.outputPath(`week-october-desktop-${capture}.png`) });
    }
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    await expect(trigger).toHaveText(originalSelection);
    await trigger.click();
    await next.click();
    await page.getByRole("button", { name: lastDay, exact: true }).click();
    await expect(heading).toContainText(month);
    await heading.click();
    await expect(
      page.getByRole("button", { name: "Свернуть календарь", exact: true }),
    ).toContainText(nextMonth);
    await page.getByRole("button", { name: "Следующий месяц", exact: true }).click();
    await expect(page.getByRole("button", { name: "Предыдущий месяц", exact: true })).toBeVisible();
  });
}

for (const [width, height] of [
  [1440, 1000],
  [1440, 400],
  [390, 844],
  [320, 640],
] as const) {
  test(`date and polyday are one cancelable, persisted selection at ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await setup(page);
    await page.getByRole("link", { name: "Входящие", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Входящие", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
    const title = page.getByRole("textbox", { name: "Название задачи" });
    await title.fill("Купить кофту и шапку");
    const trigger = page.getByRole("button", { name: /^Когда выполнить ·/ });
    const fields = [
      title,
      page.getByRole("textbox", { name: "Описание · необязательно" }),
      page.getByRole("button", { name: "Добавить задачу", exact: true }).last(),
    ];
    const bounds = await Promise.all(fields.map((field) => field.boundingBox()));
    await trigger.click();
    const menu = page.getByRole("dialog", { name: "Дата и полидень", exact: true });
    await expect(menu).toBeVisible();
    const menuBounds = (await menu.boundingBox())!;
    expect(menuBounds.x).toBeGreaterThanOrEqual(0);
    expect(menuBounds.y).toBeGreaterThanOrEqual(0);
    expect(menuBounds.x + menuBounds.width).toBeLessThanOrEqual(width);
    expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(height);
    for (const [i, field] of fields.entries()) expect(await field.boundingBox()).toEqual(bounds[i]);
    await page.getByRole("button", { name: "Завтра", exact: true }).click();
    await page.getByRole("radio", { name: "Вечерний", exact: true }).click();
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    await expect(trigger).toHaveText("Завтра · Вечерний");
    await trigger.click();
    await expect(page.getByRole("radio", { name: "Вечерний", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Сегодня", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Вечерний", exact: true })).toBeChecked();
    await page.getByRole("radio", { name: "Утренний", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveText("Завтра · Вечерний");
    await expect(title).toBeFocused();
    await trigger.click();
    await page.getByRole("button", { name: "Открыть календарь", exact: true }).click();
    await page.getByRole("button", { name: "Следующий месяц", exact: true }).click();
    await page.getByRole("button", { name: /^15 / }).click();
    await expect(page.getByRole("radio", { name: "Вечерний", exact: true })).toBeChecked();
    await page.mouse.click(4, 4);
    await expect(menu).not.toBeVisible();
    await expect(trigger).toHaveText("Завтра · Вечерний");
    await trigger.click();
    await page.screenshot({
      path: testInfo.outputPath(`unified-scheduling-${width}-${Date.now()}.png`),
    });
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
    await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    await page
      .getByRole("button", { name: "Редактировать задачу: Купить кофту и шапку", exact: true })
      .click();
    await expect(trigger).toHaveText("Завтра · Вечерний");
    await trigger.click();
    await page.getByRole("button", { name: "Сегодня", exact: true }).click();
    await page.getByRole("radio", { name: "Дневной", exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveText("Завтра · Вечерний");
    await expect(title).toBeFocused();
    await expect(
      page.getByText("Закрыть без сохранения изменений?", { exact: true }),
    ).not.toBeVisible();
  });
}

test("date-specific polydays never silently replace a removed selection", async ({ page }) => {
  await setup(page);
  await page.getByRole("link", { name: "Настройки", exact: true }).click();
  await page.getByRole("button", { name: "Удалить полидень Утренний", exact: true }).click();
  await page.getByRole("radio", { name: /Дневной/ }).click();
  await page.getByRole("button", { name: "Сохранить расписание", exact: true }).click();
  await expect(page.getByText("Расписание сохранено.", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Входящие", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Входящие", exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).not.toBeVisible();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Выбрать доступный полидень");
  const trigger = page.getByRole("button", { name: /^Когда выполнить ·/ });
  await trigger.click();
  await page.getByRole("radio", { name: "Утренний", exact: true }).click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Утренний", exact: true })).toHaveCount(0);
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(
    page.getByText("Выберите полидень из расписания на эту дату.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Дневной", exact: true }).click();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(trigger).toHaveText("Завтра · Дневной");
});

async function setup(page: Page) {
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки", exact: true }).click();
  await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
}

test("removing an overnight deadline selects the polyday's start date", async ({ page }) => {
  await setup(page);
  await expect(page.getByRole("progressbar")).not.toBeVisible();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Дедлайн после полуночи");
  const trigger = page.getByRole("button", { name: /^Когда выполнить ·/ });
  await trigger.click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await page.getByRole("button", { name: "Добавить время", exact: true }).click();
  await page.getByRole("textbox", { name: "Время дедлайна", exact: true }).fill("01:00");
  await expect(page.getByText(/^Вечерний · Сегодня,/)).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Полидень", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Во входящие", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(trigger).toHaveText("Завтра, 01:00");
  await trigger.click();
  await page.getByRole("button", { name: "Убрать дедлайн", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Вечерний", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await expect(trigger).toHaveText("Сегодня · Вечерний");
});
