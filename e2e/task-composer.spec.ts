import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const width of [1440, 390]) {
  test(`task capture closes after saving and from the backdrop at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/backlog");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
    await page.getByRole("link", { name: "Входящие", exact: true }).click();
    const open = () =>
      page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
    const title = page.getByRole("textbox", { name: "Название задачи" });
    await open();
    await title.fill("Сохранить и закрыть");
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await expect(title).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Редактировать задачу: Сохранить и закрыть", exact: true }),
    ).toBeVisible();
    await open();
    await expect(title).toHaveValue("");
    await page.mouse.click(4, 4);
    await expect(title).not.toBeVisible();
    await open();
    await title.fill("Несохранённый черновик");
    await page.mouse.click(4, 4);
    await expect(page.getByText("Закрыть и удалить черновик?", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await expect(title).toHaveValue("Несохранённый черновик");
    await page.mouse.click(4, 4);
    await page.getByRole("button", { name: "Не сохранять", exact: true }).click();
    await expect(title).not.toBeVisible();
    await open();
    await expect(title).toHaveValue("");
    await title.fill("Сохранить клавишей Enter");
    await title.press("Enter");
    await expect(title).not.toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Редактировать задачу: Сохранить клавишей Enter",
        exact: true,
      }),
    ).toBeVisible();
  });
}
