import { expect, test, type Page } from "@playwright/test";
import { seedTimeline } from "./timeline.helpers";

test.use({ serviceWorkers: "block", timezoneId: "Asia/Tbilisi" });

test("opens plans and history without Intl.PluralRules, as on Android Hermes", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Intl, "PluralRules", { value: undefined, configurable: true });
  });
  await seedTimeline(page);
  await page.goto("/upcoming");
  const today = page.getByTestId("timeline-date-2026-10-26");
  await expect(today.getByRole("link")).toHaveCount(3);
  await scrollToEnd(page);
  await expect(page.getByTestId("timeline-date-2026-11-02")).toBeAttached();
  await page.goto("/history");
  await expect(page.getByTestId("timeline-date-2026-10-25").getByRole("link")).toHaveCount(3);
});

for (const width of [1440, 390, 320]) {
  test(`keeps timeline groups compact and hides empty polydays at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 900 });
    await seedTimeline(page);
    await page.goto("/upcoming");
    const today = page.getByTestId("timeline-date-2026-10-26");
    await expect(today).toBeVisible();
    await expect(
      page.getByText("Планируйте задачи на следующие полидни", { exact: true }),
    ).not.toBeAttached();
    await expect(page.getByRole("link", { name: /неделя/ })).toHaveCount(0);
    await expect(today.getByRole("heading")).toHaveText("понедельник, 26 октября");
    await expect(today.getByRole("link")).toHaveCount(3);
    await expect(today.getByRole("link").last()).toContainText("19:00–02:00 · +1 день");
    await expect(
      page
        .getByText(/задачи|Выполнено \d+ из/)
        .filter({ hasText: /^\d+ задачи|^Выполнено \d+ из/ }),
    ).toHaveCount(0);
    await expect(page.getByTestId("timeline-date-2026-10-27").getByRole("link")).toHaveCount(1);
    await expect(today.getByTestId("task-row-design")).toHaveCSS("border-bottom-width", "0px");
    await expect(today.getByTestId("task-row-plan")).toHaveCSS("border-bottom-width", "1px");
    await expect(today.getByTestId("task-row-mail")).toHaveCSS("border-bottom-width", "0px");
    await expect(page.getByTestId("timeline-date-2026-10-27").getByRole("heading")).toHaveText(
      "вторник, 27 октября",
    );
    await page.screenshot({
      path: testInfo.outputPath(`upcoming-grouped-${width}-${Date.now()}.png`),
    });
    await today
      .getByRole("checkbox", { name: "Завершить: Разобрать почту и выбрать главное", exact: true })
      .click();
    await expect(
      today.getByRole("button", {
        name: "Редактировать задачу: Разобрать почту и выбрать главное",
        exact: true,
      }),
    ).toHaveCount(0);
    await today.getByRole("link").last().click();
    await expect(page.getByRole("heading", { name: "Вечерний", exact: true })).toBeVisible();
    await page.goBack();
    await expect(
      today.getByRole("button", {
        name: "Редактировать задачу: Разобрать почту и выбрать главное",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.getByTestId("timeline-date-2026-11-02")).not.toBeAttached();
    await scrollToEnd(page);
    await expect(page.getByTestId("timeline-date-2026-11-02")).toBeAttached();
    await expect(today).toHaveCount(1);
    const later = page.getByTestId("timeline-date-2026-11-03");
    await later.getByRole("link").first().click();
    await expect(page.getByRole("heading", { name: "Утренний", exact: true })).toBeVisible();
    await page.goBack();
    await expect(later).toBeVisible();
    await page.goto("/history");
    const yesterday = page.getByTestId("timeline-date-2026-10-25");
    await expect(yesterday).toBeVisible();
    await expect(yesterday.getByRole("heading")).toHaveText("воскресенье, 25 октября");
    await expect(yesterday.getByRole("link")).toHaveCount(3);
    await expect(yesterday.getByRole("link").first()).toContainText("Вечерний");
    await expect(
      yesterday.getByRole("button", {
        name: "Редактировать задачу: Читать перед сном",
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`history-grouped-${width}-${Date.now()}.png`),
    });
    for (const date of ["2026-10-19", "2026-10-12", "2026-10-05", "2026-10-01"]) {
      await scrollToEnd(page);
      await expect(page.getByTestId(`timeline-date-${date}`)).toBeAttached();
    }
    await scrollToEnd(page);
    await expect(page.getByTestId("timeline-date-2026-09-30")).not.toBeAttached();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test("empty timelines retain one empty state while browsing more dates", async ({ page }) => {
  await seedTimeline(page, true);
  for (const [path, label] of [
    ["upcoming", "Нет запланированных задач"],
    ["history", "Пока нет выполненных задач"],
  ]) {
    await page.goto(`/${path}`);
    for (let index = 0; index < 3; index++) {
      await expect(page.getByText(label!, { exact: true })).toHaveCount(1);
      await expect(page.getByRole("progressbar")).not.toBeVisible();
      await page.getByRole("button", { name: "Показать ещё", exact: true }).click();
    }
    await expect(page.getByText(label!, { exact: true })).toHaveCount(1);
    await expect(page.locator('[data-testid^="timeline-date-"]')).toHaveCount(0);
  }
});

async function scrollToEnd(page: Page) {
  await expect(page.getByRole("progressbar")).not.toBeVisible();
  const scrolled = await page
    .getByTestId("task-scroll")
    .filter({ visible: true })
    .evaluate((element) => {
      const end = element.scrollHeight - element.clientHeight;
      if (end > element.scrollTop + 1) {
        element.scrollTop = element.scrollHeight;
        return true;
      }
      return false;
    });
  const more = page.getByRole("button", { name: "Показать ещё", exact: true });
  if (!scrolled && (await more.isVisible())) await more.click();
}
