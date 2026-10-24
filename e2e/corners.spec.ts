import { expect, test, type Locator } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const width of [1440, 390]) {
  test(`rounded task surfaces clip their contents at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/current");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование" }).click();
    await page.getByRole("link", { name: "Входящие", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Входящие", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    const title = page.getByRole("textbox", { name: "Название задачи" });
    await title.fill("Проверить углы панелей");
    await expectSingleContour(title);
    await page.getByRole("button", { name: /^Приоритет ·/ }).click();
    await expectClippedCorner(page.getByRole("radio", { name: "P1 · Высокий", exact: true }));
    await page.getByRole("radio", { name: "P3 · Низкий", exact: true }).click();
    await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
    await expectSingleContour(page.getByRole("heading", { name: "Дата", exact: true }));
    await expectClippedCorner(page.getByRole("button", { name: "Сегодня", exact: true }));
    await expectClippedCorner(page.getByRole("button", { name: "Добавить время", exact: true }));
    await page.getByRole("button", { name: "Повтор", exact: true }).click();
    await expectSingleContour(page.getByRole("heading", { name: "Повторение", exact: true }));
    await page.getByRole("button", { name: "Отменить настройки", exact: true }).click();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
    await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
    await page
      .getByRole("link", { name: "Открыть задачу: Проверить углы панелей", exact: true })
      .click();
    await expectSingleContour(title);
    await expect(page.getByRole("button", { name: "Завершить задачу", exact: true })).toBeVisible();
    // Wait for the modal's native fade to finish before recording the destination.
    await expect(page.locator('[aria-modal="true"]')).toHaveCount(0);
    const panel = await title.evaluate((element) => {
      let node = element.parentElement!;
      while (getComputedStyle(node).boxShadow === "none") node = node.parentElement!;
      const bounds = node.getBoundingClientRect();
      return {
        x: bounds.x - 16,
        y: bounds.y - 84,
        width: bounds.width + 32,
        height: bounds.height + 116,
      };
    });
    await page.screenshot({
      path: testInfo.outputPath(`task-corners-${width}-${Date.now()}.png`),
      clip: panel,
    });
    await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
    await expectSingleContour(page.getByRole("heading", { name: "Дата", exact: true }));
    await expectClippedCorner(page.getByRole("button", { name: "Добавить время", exact: true }));
    await page.screenshot({ path: testInfo.outputPath(`date-corners-${width}-${Date.now()}.png`) });
  });
}

async function expectSingleContour(content: Locator) {
  await expect
    .poll(() =>
      content.evaluate((element) => {
        const surfaces: Array<{ radius: string; border: string; shadow: boolean }> = [];
        for (let node = element.parentElement; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (
            parseFloat(style.borderRadius) > 0 &&
            (parseFloat(style.borderWidth) > 0 || style.boxShadow !== "none")
          ) {
            surfaces.push({
              radius: style.borderRadius,
              border: style.borderWidth,
              shadow: style.boxShadow !== "none",
            });
          }
        }
        return surfaces;
      }),
    )
    .toEqual([{ radius: widthRadius(content), border: "1px", shadow: true }]);
}

function widthRadius(content: Locator) {
  return content.page().viewportSize()!.width < 600 ? "24px" : "16px";
}

async function expectClippedCorner(row: Locator) {
  await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      row.evaluate((element) => {
        let surface = element.parentElement;
        while (surface && parseFloat(getComputedStyle(surface).borderRadius) === 0)
          surface = surface.parentElement;
        if (!surface) throw new Error("Rounded surface missing");
        const bounds = surface.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.left + 1, bounds.top + 1);
        return !!hit && surface.contains(hit) && hit !== surface;
      }),
    )
    .toBe(false);
}
