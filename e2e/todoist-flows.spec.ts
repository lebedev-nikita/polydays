import { test, expect } from "@playwright/test";
import { closeTaskEditor } from "./task-editor.helpers";

test("inline capture, priority, search, details, completion and delete undo", async ({
  page,
}, testInfo) => {
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/backlog");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
  await expect(page.getByRole("button", { name: "Добавить задачу", exact: true })).toHaveCount(2);
  const title = "Проверить привычные сценарии Todoist";
  const task = page.getByRole("button", { name: `Редактировать задачу: ${title}`, exact: true });
  const input = page.getByRole("textbox", { name: "Название задачи" });
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByLabel("Новая задача", { exact: true })).not.toBeVisible();
  await input.fill(`${title} !!1 `);
  await expect(input).toHaveValue(title);
  await page
    .getByRole("textbox", { name: "Описание · необязательно", exact: true })
    .fill("Найти по описанию: акварель");
  await input.press("Enter");
  await expect(input).not.toBeVisible();
  await expect(task).toBeVisible();
  await task.focus();
  await page.keyboard.press("2");
  await page.getByRole("button", { name: `Другие действия: ${title}`, exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Установить P2: ${title}`, exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: `Установить P2: ${title}`, exact: true }),
  ).not.toBeVisible();
  await page.keyboard.press("Control+k");
  await page.getByRole("textbox", { name: "Поиск задач", exact: true }).fill("акварель");
  await page.getByRole("link", { name: `Найденная задача: ${title}`, exact: true }).click();
  await expect(page).toHaveURL(/\/backlog\?taskId=/);
  await expect(input).toHaveValue(title);
  await closeTaskEditor(page);
  await task.focus();
  await page.keyboard.press("e");
  await expect(task).not.toBeVisible();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(task).toBeVisible();
  await page.getByRole("button", { name: `Другие действия: ${title}`, exact: true }).click();
  await page.getByRole("button", { name: `Удалить: ${title}`, exact: true }).click();
  await expect(task).not.toBeVisible();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(task).toBeVisible();
  await page.reload();
  await expect(input).toHaveValue(title);
  await closeTaskEditor(page);
  await expect(task).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`rebased-desktop-${Date.now()}.png`) });
});

test("mobile capture, recurring search, completed results and navigation", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  const input = page.getByRole("textbox", { name: "Название задачи" });
  await input.fill("Ежедневная проверка");
  await page.getByRole("button", { name: "Настроить повторение", exact: true }).click();
  await page.getByRole("radio", { name: "Каждый полидень", exact: true }).click();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(input).not.toBeVisible();
  await page.getByRole("button", { name: "Поиск", exact: true }).click();
  await page.getByRole("textbox", { name: "Поиск задач", exact: true }).fill("Ежедневная проверка");
  const results = page.getByRole("link", {
    name: "Найденная задача: Ежедневная проверка",
    exact: true,
  });
  expect(await results.count()).toBeGreaterThan(2);
  await page
    .getByRole("textbox", { name: "Поиск задач", exact: true })
    .fill("ничего подобного нет");
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть поиск", exact: true }).click();
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Предстоящие", exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).not.toBeVisible();
  const occurrences = page.getByRole("button", {
    name: "Редактировать задачу: Ежедневная проверка",
    exact: true,
  });
  await expect(occurrences.first()).toBeVisible();
  const count = await occurrences.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await page
    .getByRole("checkbox", { name: "Завершить: Ежедневная проверка", exact: true })
    .first()
    .click();
  await expect(occurrences).toHaveCount(count - 1);
  await page.getByRole("button", { name: "Поиск", exact: true }).click();
  await page.getByRole("textbox", { name: "Поиск задач", exact: true }).fill("Ежедневная проверка");
  const incomplete = await results.count();
  await page.getByRole("checkbox", { name: "Включая выполненные", exact: true }).click();
  await expect(results).toHaveCount(incomplete + 1);
  await page.getByRole("button", { name: "Закрыть поиск", exact: true }).click();
  await page.getByRole("link", { name: "История", exact: true }).click();
  await expect(page.getByRole("heading", { name: "История полидней", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath(`rebased-mobile-${Date.now()}.png`) });
});

test("sidebar, shortcut help and contextual upcoming capture", async ({ page }) => {
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/upcoming");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
  await page.getByRole("button", { name: "Свернуть боковую панель", exact: true }).click();
  await expect(page.getByRole("link", { name: "Входящие", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Открыть боковую панель", exact: true }).click();
  await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();
  await page.keyboard.press("?");
  await expect(page.getByText("Завершить выбранную задачу", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Завершить выбранную задачу", { exact: true })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Предстоящие", exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).not.toBeVisible();
  await expect(page.getByRole("link", { name: /неделя/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("План на будущий полидень");
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await page.getByRole("radio", { name: "Утренний", exact: true }).click();
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.getByRole("textbox", { name: "Название задачи" }).press("Enter");
  await expect(
    page.getByRole("button", {
      name: "Редактировать задачу: План на будущий полидень",
      exact: true,
    }),
  ).toBeVisible();
});
