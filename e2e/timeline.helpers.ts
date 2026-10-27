import { expect, type Page } from "@playwright/test";
import { defaultSlots, type Document, type Task } from "@polydays/core";

export async function seedTimeline(page: Page, empty = false) {
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
    task("later-a", "Проверить план следующей недели", "2026-11-02", "morning"),
    task("later-b", "Согласовать встречу", "2026-11-03", "morning"),
    ...["2026-10-19", "2026-10-12", "2026-10-05", "2026-10-01"].map((date) =>
      task(`history-${date}`, "Проверить итоги", date, "morning", true),
    ),
    task("next", "Записаться к стоматологу", "2026-10-27", "morning"),
    task("past-a", "Отправить обновлённый план", "2026-10-25", "morning", true, 1),
    task("past-b", "Купить продукты на неделю", "2026-10-25", "afternoon", true),
    task("past-c", "Читать перед сном", "2026-10-25", "night", true),
    task("past-open", "Разобрать фотографии", "2026-10-25", "night"),
  ];
  if (empty) documents.splice(1);
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
