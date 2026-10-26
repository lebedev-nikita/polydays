import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const width of [1440, 390]) {
  test(`task details adapt to the screen and own completion at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/backlog");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
    const title = page.getByRole("textbox", { name: "Название задачи" });
    const name = "Записать номер поданной заявки";
    await title.fill(`${name} !!1`);
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await page.getByRole("button", { name: `Редактировать задачу: ${name}` }).click();
    const editor = page.getByTestId("task-editor");
    const complete = editor.getByRole("checkbox", { name: `Завершить: ${name}`, exact: true });
    await expect(complete).toBeVisible();
    if (width < 600) {
      await expect(page.getByRole("dialog", { name: "Редактирование задачи" })).toBeVisible();
      await expect(title).not.toBeFocused();
      await expect(page.getByRole("button", { name: "Добавить описание" })).toBeVisible();
      const bounds = await editor.boundingBox();
      expect(bounds!.y).toBeGreaterThan(250);
    } else {
      await expect(page.getByRole("dialog")).not.toBeVisible();
      await expect(title).toBeFocused();
    }
    // Completion belongs to the editor surface, including on desktop.
    const formBounds = await editor.boundingBox();
    const circleBounds = await complete.boundingBox();
    expect(circleBounds!.x).toBeGreaterThanOrEqual(formBounds!.x);
    expect(circleBounds!.x + circleBounds!.width).toBeLessThanOrEqual(
      formBounds!.x + formBounds!.width,
    );
    await page.screenshot({ path: testInfo.outputPath(`task-detail-${width}-${Date.now()}.png`) });
    if (width < 600) await page.getByRole("button", { name: "Добавить описание" }).click();
    const description = page.getByRole("textbox", { name: "Описание · необязательно" });
    await description.fill("Проверить номер в личном кабинете.");
    await complete.click();
    await expect(
      page.getByText("Закрыть без сохранения изменений?", { exact: true }),
    ).toBeVisible();
    if (width < 600)
      await expect(page.getByRole("button", { name: "Сохранить", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await expect(description).toHaveValue("Проверить номер в личном кабинете.");
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await page.getByRole("button", { name: `Редактировать задачу: ${name}` }).click();
    await expect(description).toHaveValue("Проверить номер в личном кабинете.");
    await complete.click();
    await expect(editor).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: `Редактировать задачу: ${name}` }),
    ).not.toBeVisible();
  });
}
