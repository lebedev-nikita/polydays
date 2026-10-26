import { expect, test, type Page } from "@playwright/test";
import { defaultSlots, type Document, type Task } from "@polydays/core";

test.use({ serviceWorkers: "block", timezoneId: "Asia/Tbilisi" });

for (const width of [1440, 390, 320]) {
  test(`groups timeline dates and updates their shared summary at ${width}px`, async ({
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
    await expect(today.getByText("4 задачи", { exact: true })).toBeVisible();
    await expect(today.getByRole("link")).toHaveCount(3);
    await expect(today.getByRole("link").last()).toContainText("19:00–02:00 · +1 день");
    await expect(page.getByTestId("timeline-date-2026-10-27").getByRole("heading")).toHaveText(
      "вторник, 27 октября",
    );
    await page.screenshot({
      path: testInfo.outputPath(`upcoming-grouped-${width}-${Date.now()}.png`),
    });
    await today
      .getByRole("checkbox", { name: "Завершить: Разобрать почту и выбрать главное", exact: true })
      .click();
    await expect(today.getByText("3 задачи", { exact: true })).toBeVisible();
    await today.getByRole("link").last().click();
    await expect(page.getByRole("heading", { name: "Вечерний", exact: true })).toBeVisible();
    await page.goBack();
    await expect(today.getByText("3 задачи", { exact: true })).toBeVisible();
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
    await expect(yesterday.getByText("Выполнено 3 из 4", { exact: true })).toBeVisible();
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

async function scrollToEnd(page: Page) {
  await page
    .getByTestId("task-scroll")
    .filter({ visible: true })
    .evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
}

async function seedTimeline(page: Page) {
  await page.clock.setFixedTime(new Date("2026-10-26T08:00:00+04:00"));
  await page.route("**/trpc/**", (route) => {
    const input = route.request().postDataJSON() as {
      operations: Array<{ id: string; entity: Document }>;
      cursor: number;
    };
    return route.fulfill({
      json: {
        result: {
          data: {
            acknowledged: input.operations.map((operation) => operation.id),
            conflicts: [],
            changes: input.operations.map((operation, index) => ({
              document: operation.entity,
              revision: input.cursor + index + 1,
            })),
            cursor: input.cursor + input.operations.length,
            hasMore: false,
          },
        },
      },
    });
  });
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование" }).click();
  await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();
  const task = (
    id: string,
    title: string,
    date: string,
    slotId: string,
    completed = false,
    priority = 4,
  ): Document => ({
    kind: "task",
    data: {
      id,
      title,
      description: "",
      priority,
      order: 1,
      scheduling: { kind: "polyday", date, slotId },
      completed,
      completedAt: completed ? Date.parse("2026-10-26T03:00:00Z") : null,
      deleted: false,
      createdAt: 1,
      seriesId: null,
      occurrenceDate: null,
    } as Task,
  });
  const documents: Document[] = [
    {
      kind: "calendar",
      data: {
        id: "calendar",
        mode: "fixed",
        versions: [
          { id: "initial", from: "2026-10-01", timeZone: "Asia/Tbilisi", slots: defaultSlots },
        ],
        frozen: [],
      },
    },
    task("mail", "Разобрать почту и выбрать главное", "2026-10-26", "morning", false, 2),
    task("plan", "Подготовить план новой версии", "2026-10-26", "morning", false, 1),
    task("design", "Обсудить макеты с Сашей", "2026-10-26", "afternoon", false, 3),
    task("read", "Прочитать главу книги", "2026-10-26", "night"),
    task("next", "Записаться к стоматологу", "2026-10-27", "morning"),
    task("past-a", "Отправить обновлённый план", "2026-10-25", "morning", true, 1),
    task("past-b", "Купить продукты на неделю", "2026-10-25", "afternoon", true),
    task("past-c", "Читать перед сном", "2026-10-25", "night", true),
    task("past-open", "Разобрать фотографии", "2026-10-25", "night"),
  ];
  await page.evaluate(async (documents) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("polydays", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(["accounts", "settings"], "readwrite");
    const profile = await new Promise<{ id: string }>((resolve) => {
      const request = tx.objectStore("settings").get("profile");
      request.onsuccess = () => resolve(request.result);
    });
    tx.objectStore("accounts").put(
      {
        version: 1,
        state: {
          accountId: profile.id,
          records: documents.map((document) => ({ document, revision: 1 })),
          pending: [],
          conflicts: [],
          cursor: 100,
        },
      },
      profile.id,
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, documents);
}
