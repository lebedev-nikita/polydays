import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const width of [390, 320]) {
  test(`mobile text editing fills the screen and preserves its draft at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/backlog");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
    const title = page.getByRole("textbox", { name: "Название задачи" });
    const description = page.getByRole("textbox", { name: "Описание · необязательно" });
    const name = "Вкатиться в ИИ?";
    await title.fill(name);
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await page.getByRole("button", { name: `Редактировать задачу: ${name}` }).click();
    await expect(title).not.toBeFocused();
    await page.getByRole("button", { name: "Действия с задачей", exact: true }).click();
    await page.getByRole("button", { name: "Изменить задачу", exact: true }).click();
    const heading = page.getByRole("heading", { name: "Изменить задачу", exact: true });
    await expect(heading).toBeVisible();
    await expect(title).toBeFocused();
    await expect(description).toBeVisible();
    await expect(page.getByRole("button", { name: /^Когда выполнить ·/ })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^Приоритет ·/ })).not.toBeVisible();
    const bounds = await page.getByTestId("task-editor").boundingBox();
    expect(bounds!.y).toBe(0);
    expect(bounds!.height).toBe(900);
    const save = page.getByRole("button", { name: "Сохранить", exact: true });
    await expect(save).toHaveText("Сохранить");
    expect((await save.boundingBox())!.y).toBeLessThan(60);
    // Capture the finished modal, including ancestors used by RN Web's fade.
    await expect
      .poll(() =>
        title.evaluate((element) => {
          let opacity = 1;
          for (let node: Element | null = element; node; node = node.parentElement)
            opacity *= Number(getComputedStyle(node).opacity);
          return opacity;
        }),
      )
      .toBe(1);
    await page.screenshot({
      path: testInfo.outputPath(`task-text-fullscreen-${width}-${Date.now()}.png`),
    });
    await title.fill("Разобраться с ИИ");
    await description.fill("Начать с одного небольшого проекта.");
    await page.getByRole("button", { name: "Назад к задаче", exact: true }).click();
    await expect(heading).not.toBeVisible();
    await expect(title).toHaveValue("Разобраться с ИИ");
    await expect(description).toHaveValue("Начать с одного небольшого проекта.");
    await page.getByRole("button", { name: /^Приоритет ·/ }).click();
    await page.getByRole("radio", { name: "P3 · Низкий", exact: true }).click();
    await description.click();
    await expect(heading).toBeVisible();
    await expect(description).toBeFocused();
    await expect(title).toHaveValue("Разобраться с ИИ");
    await save.click();
    await expect(title).not.toBeVisible();
    await page
      .getByRole("button", { name: "Редактировать задачу: Разобраться с ИИ", exact: true })
      .click();
    await expect(description).toHaveValue("Начать с одного небольшого проекта.");
    await title.click();
    await expect(heading).toBeVisible();
    await save.click();
    await expect(title).not.toBeVisible();
  });
}
