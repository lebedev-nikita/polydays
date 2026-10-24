import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const width of [1440, 390]) {
  test(`edits a task in its list and protects drafts at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/backlog");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование" }).click();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    const title = page.getByRole("textbox", { name: "Название задачи" });
    for (const name of [
      "Собрать идеи для выходных",
      "Подготовить план следующего полидня",
      "Заказать продукты",
    ]) {
      await title.fill(name);
      await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
      await expect(title).toHaveValue("");
    }
    await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
    const url = page.url();
    await task(page, "Подготовить план следующего полидня").click();
    await expect(title).toBeFocused();
    await expect(task(page, "Собрать идеи для выходных")).toBeVisible();
    await expect(task(page, "Заказать продукты")).toBeVisible();
    await expect(page).toHaveURL(url);
    await title.fill("Подготовить план следующего полидня !!2");
    await expect(title).toHaveValue("Подготовить план следующего полидня");
    await page
      .getByRole("textbox", { name: "Описание · необязательно" })
      .fill("Выбрать главное и оставить время для отдыха.");
    await page.screenshot({
      path: testInfo.outputPath(`inline-editing-${width}-${Date.now()}.png`),
    });
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(title).not.toBeVisible();
    await task(page, "Подготовить план следующего полидня").click();
    await expect(page.getByRole("textbox", { name: "Описание · необязательно" })).toHaveValue(
      "Выбрать главное и оставить время для отдыха.",
    );
    await expect(
      page.getByRole("button", { name: "Приоритет · P2 · Средний", exact: true }),
    ).toBeVisible();
    await title.fill("Несохранённый черновик");
    await page
      .getByRole("checkbox", { name: "Завершить: Собрать идеи для выходных", exact: true })
      .click();
    await expect(task(page, "Собрать идеи для выходных")).not.toBeVisible();
    await expect(title).toHaveValue("Несохранённый черновик");
    await task(page, "Заказать продукты").click();
    await expect(page.getByText("Закрыть без сохранения изменений?")).toBeVisible();
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await expect(title).toHaveValue("Несохранённый черновик");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Не сохранять", exact: true }).click();
    await task(page, "Подготовить план следующего полидня").click();
    await expect(title).toHaveValue("Подготовить план следующего полидня");
    await page.keyboard.press("Escape");
    await task(page, "Заказать продукты").click();
    await page.getByRole("button", { name: "Удалить задачу", exact: true }).click();
    await expect(title).not.toBeVisible();
    await expect(task(page, "Заказать продукты")).not.toBeVisible();
    await page.reload();
    await expect(task(page, "Подготовить план следующего полидня")).toBeVisible();
    await expect(task(page, "Заказать продукты")).not.toBeVisible();
  });
}

function task(page: Page, name: string) {
  return page.getByRole("button", { name: `Редактировать задачу: ${name}`, exact: true });
}
