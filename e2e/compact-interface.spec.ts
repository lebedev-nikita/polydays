import { expect, test } from "@playwright/test";
import { seedTimeline } from "./timeline.helpers";

test.use({ serviceWorkers: "block", timezoneId: "Asia/Tbilisi" });

for (const width of [1440, 390]) {
  test(`keeps shared app screens compact at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    const capture = `${width}-${Date.now()}`;
    const screenshot = async (screen: string) => {
      await expect(page.getByRole("progressbar")).not.toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `.data/ui-qa/app-043-${screen}-${capture}.png` });
    };
    await page.goto("/current");
    await expect(
      page.getByRole("button", { name: "Продолжить с Google", exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Задачи в ритме ваших дней", { exact: true })).toHaveCount(0);
    await screenshot("login");
    await seedTimeline(page);
    for (const [path, heading] of [
      ["upcoming", "Предстоящие"],
      ["history", "История полидней"],
      ["current", "Утренний"],
      ["backlog", "Входящие"],
    ]) {
      await page.goto(`/${path}`);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await screenshot(path!);
    }
    await expect(page.getByText("Нет задач", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Добавьте задачу или запланируйте её из входящих.", { exact: true }),
    ).toHaveCount(0);
    await page.goto("/settings");
    await expect(page.getByRole("textbox", { name: "Полидень 1", exact: true })).toBeVisible();
    await expect(
      page.getByText("Задайте интервалы бодрствования между снами.", { exact: false }),
    ).toHaveCount(0);
    await screenshot("settings");
    await page.getByRole("button", { name: "Поиск", exact: true }).click();
    await page.getByRole("textbox", { name: "Поиск задач", exact: true }).fill("план");
    await expect(
      page.getByRole("link", {
        name: "Найденная задача: Подготовить план новой версии",
        exact: true,
      }),
    ).toBeVisible();
    await screenshot("search");
    await page.getByRole("button", { name: "Закрыть поиск", exact: true }).click();
    await page.goto("/current");
    await page
      .getByRole("button", {
        name: "Редактировать задачу: Подготовить план новой версии",
        exact: true,
      })
      .click();
    await screenshot("task");
  });
}
