import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

for (const width of [1440, 390]) {
  test(`paints the destination and loading indicator before its list at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    // Keep this fixture local so it cannot change the shared development account.
    await page.route("**/trpc/**", (route) => route.abort());
    await page.goto("/current");
    await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
    await page.getByRole("button", { name: "Начать планирование" }).click();
    await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();

    for (const [name, heading] of [
      ["Входящие", "Входящие"],
      ["Предстоящие", "Предстоящие"],
      ["История", "История полидней"],
    ]) {
      await observeLoading(page, heading!, async () => {
        await page.getByRole("link", { name, exact: true }).click();
      });
    }
    await observeLoading(page, "История полидней", async () => {
      await page.getByRole("link", { name: "Предыдущая неделя" }).click();
    });
    await observeLoading(page, "Предстоящие", async () => {
      await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
    });
    const day = page.locator('a[href^="/day/"]:visible').first();
    const heading = (await day.innerText()).split("\n")[0]!;
    await observeLoading(page, heading, () => day.click());
    const otherDay = page
      .locator('a[href^="/day/"]:visible')
      .filter({ hasNotText: `${heading} ·` })
      .last();
    const otherHeading = (await otherDay.innerText()).split(" · ")[0]!;
    await observeLoading(page, otherHeading, () => otherDay.click());
    await observeLoading(page, heading, () => page.goBack().then(() => {}));
    await observeLoading(page, "История полидней", async () => {
      await page.getByRole("link", { name: "История", exact: true }).click();
    });
    // A second destination chosen before the next frame wins; cancelled work
    // must not restore the previous list or leave a spinner behind.
    await page.evaluate(() => {
      document.querySelector<HTMLAnchorElement>('a[href="/upcoming"]')!.click();
      document.querySelector<HTMLAnchorElement>('a[href="/backlog"]')!.click();
    });
    await expect(page.getByRole("heading", { name: "Входящие", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Предстоящие", exact: true })).not.toBeVisible();
  });
}

async function observeLoading(page: Page, heading: string, navigate: () => Promise<unknown>) {
  await page.evaluate((title) => {
    const frames: Array<{ heading: boolean; loading: boolean; navigation: boolean }> = [];
    const visible = (element: Element) =>
      [...element.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0);
    let frame = 0;
    const sample = () => {
      frames.push({
        heading: [...document.querySelectorAll('[role="heading"]')].some(
          (element) => element.textContent === title && visible(element),
        ),
        loading: [...document.querySelectorAll('[role="progressbar"]')].some(visible),
        navigation: [...document.querySelectorAll('a[href="/backlog"]')].some(visible),
      });
      frame = requestAnimationFrame(sample);
    };
    frame = requestAnimationFrame(sample);
    Object.assign(window, {
      hasLoadingFrame: () =>
        frames.some((frame) => frame.heading && frame.loading && frame.navigation),
      stopLoadingFrames: () => {
        cancelAnimationFrame(frame);
        return frames;
      },
    });
  }, heading);
  await navigate();
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { hasLoadingFrame: () => boolean }).hasLoadingFrame(),
      ),
    )
    .toBe(true);
  await expect(page.getByRole("progressbar")).not.toBeVisible();
  const frames = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    return (
      window as unknown as {
        stopLoadingFrames: () => Array<{ heading: boolean; loading: boolean; navigation: boolean }>;
      }
    ).stopLoadingFrames();
  });
  expect(
    frames.some((frame) => frame.heading && frame.loading && frame.navigation),
    `${heading}: ${JSON.stringify(frames)}`,
  ).toBe(true);
  expect(frames.every((frame) => frame.navigation)).toBe(true);
}
