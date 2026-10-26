import { expect, test, type Page } from "@playwright/test";
import type { Document, Task } from "@polydays/core";
import { closeTaskEditor, revealDescription, showTaskProperties } from "./task-editor.helpers";

test.use({ serviceWorkers: "block" });

async function setup(page: Page) {
  await page.route("**/trpc/**", (route) => route.abort());
  await page.goto("/backlog");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование", exact: true }).click();
  await page.getByRole("link", { name: "Входящие", exact: true }).click();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Подготовить поездку");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await page.getByRole("button", { name: "Редактировать задачу: Подготовить поездку" }).click();
}

async function savedTask(page: Page): Promise<Task | undefined> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open("polydays", 1);
      request.onsuccess = () => resolve(request.result);
    });
    const stored = await new Promise<
      {
        state: { records: { document: Document }[]; pending: { entity: Document }[] };
      }[]
    >((resolve) => {
      const request = db.transaction("accounts").objectStore("accounts").getAll();
      request.onsuccess = () => resolve(request.result);
    });
    db.close();
    return stored
      .flatMap(({ state }) => [
        ...state.records.map((record) => record.document),
        ...state.pending.map((operation) => operation.entity),
      ])
      .reverse()
      .find((document) => document.kind === "task")?.data as Task | undefined;
  });
}

for (const width of [1440, 390]) {
  test(`unchanged task text closes with Save without a write at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    const title = page.getByRole("textbox", { name: "Название задачи" });
    const save = page.getByRole("button", { name: "Сохранить", exact: true });
    await expect(save).toBeEnabled();
    await page.screenshot({
      path: testInfo.outputPath(`unchanged-editor-open-${width}-${Date.now()}.png`),
    });
    // A clean editor must close even when local storage cannot accept another write.
    await page.evaluate(() => {
      const put: IDBObjectStore["put"] = Object.getOwnPropertyDescriptor(
        IDBObjectStore.prototype,
        "put",
      )!.value;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === "accounts") throw new Error("Unexpected write from unchanged editor");
        return put.apply(this, args);
      };
    });
    await save.click();
    await expect(title).not.toBeVisible();
    await expect(
      page.getByText("Закрыть без сохранения изменений?", { exact: true }),
    ).not.toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`unchanged-editor-closed-${width}-${Date.now()}.png`),
    });
    await page.getByRole("button", { name: "Редактировать задачу: Подготовить поездку" }).click();
    await title.fill("Временный черновик");
    await title.fill("Подготовить поездку");
    await save.click();
    await expect(title).not.toBeVisible();
    await page.getByRole("button", { name: "Редактировать задачу: Подготовить поездку" }).click();
    await title.fill("");
    await expect(save).toBeDisabled();
    await title.fill("Изменённый заголовок");
    await save.click();
    await expect(
      page.getByText("Unexpected write from unchanged editor", { exact: true }),
    ).toBeVisible();
    await expect(title).toHaveValue("Изменённый заголовок");
    await title.fill("Подготовить поездку");
    await save.click();
    await expect(title).not.toBeVisible();
  });

  test(`properties persist independently of text drafts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    const title = page.getByRole("textbox", { name: "Название задачи" });
    const description = page.getByRole("textbox", { name: "Описание · необязательно" });
    const save = page.getByRole("button", { name: "Сохранить", exact: true });
    await expect(save).toBeEnabled();
    await title.fill("Несохранённый заголовок");
    await revealDescription(page);
    await description.fill("Несохранённое описание");
    await showTaskProperties(page);
    await page.getByRole("button", { name: /^Приоритет ·/ }).click();
    await page.getByRole("radio", { name: "P1 · Высокий", exact: true }).click();
    await expect.poll(async () => (await savedTask(page))?.priority).toBe(1);
    await expect.poll(async () => (await savedTask(page))?.title).toBe("Подготовить поездку");
    await expect.poll(async () => (await savedTask(page))?.description).toBe("");
    await showTaskProperties(page);
    await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
    await page.getByRole("button", { name: "Завтра", exact: true }).click();
    await page.getByRole("radio", { name: "Вечерний", exact: true }).click();
    await page.getByRole("button", { name: "Готово", exact: true }).click();
    await expect.poll(async () => (await savedTask(page))?.scheduling.kind).toBe("polyday");
    await expect(title).toHaveValue("Несохранённый заголовок");
    await expect(description).toHaveValue("Несохранённое описание");
    await expect(page.getByRole("button", { name: /^Когда выполнить ·/ })).toHaveText(
      "Завтра · Вечерний",
    );
    await page.screenshot({ path: `.data/ui-qa/immediate-properties-${width}-${Date.now()}.png` });
    await closeTaskEditor(page);
    await expect(
      page.getByText("Закрыть без сохранения изменений?", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Не сохранять", exact: true }).click();
    await expect(title).not.toBeVisible();
    await page.reload();
    await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
    await page.getByRole("button", { name: "Редактировать задачу: Подготовить поездку" }).click();
    await expect(title).toHaveValue("Подготовить поездку");
    await revealDescription(page);
    await showTaskProperties(page);
    await expect(description).toHaveValue("");
    await showTaskProperties(page);
    await expect(
      page.getByRole("button", { name: "Приоритет · P1 · Высокий", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Когда выполнить ·/ })).toHaveText(
      "Завтра · Вечерний",
    );
    await expect(save).toBeEnabled();
    // Complete title shortcuts also persist independently, including P4.
    for (const priority of [2, 3, 4]) {
      await title.fill(`Подготовить поездку !!${priority}`);
      await expect(title).toHaveValue("Подготовить поездку");
      await expect.poll(async () => (await savedTask(page))?.priority).toBe(priority);
    }
    await save.click();
    await expect(title).not.toBeVisible();
    await page.getByRole("button", { name: "Редактировать задачу: Подготовить поездку" }).click();
    await title.fill("Собрать чемодан");
    await revealDescription(page);
    await description.fill("Проверить билеты");
    await save.click();
    await expect(title).not.toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Редактировать задачу: Собрать чемодан" }).click();
    await showTaskProperties(page);
    await expect(description).toHaveValue("Проверить билеты");
    await showTaskProperties(page);
    await expect(
      page.getByRole("button", { name: "Приоритет · P4 · Без приоритета", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Когда выполнить ·/ })).toHaveText(
      "Завтра · Вечерний",
    );
    await closeTaskEditor(page);
    await expect(
      page.getByText("Закрыть без сохранения изменений?", { exact: true }),
    ).not.toBeVisible();
    await expect(title).not.toBeVisible();
  });
}

test("a failed property save keeps the saved value and offers a retry", async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const put: IDBObjectStore["put"] = Object.getOwnPropertyDescriptor(
      IDBObjectStore.prototype,
      "put",
    )!.value;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "accounts") {
        IDBObjectStore.prototype.put = put;
        throw new Error("Не удалось сохранить свойство");
      }
      return put.apply(this, args);
    };
  });
  await showTaskProperties(page);
  await page.getByRole("button", { name: /^Приоритет ·/ }).click();
  await page.getByRole("radio", { name: "P2 · Средний", exact: true }).click();
  await expect(page.getByText("Не удалось сохранить свойство", { exact: true })).toBeVisible();
  expect((await savedTask(page))?.priority).toBe(4);
  await expect(page.getByRole("radio", { name: "P4 · Без приоритета", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "P2 · Средний", exact: true }).click();
  await expect.poll(async () => (await savedTask(page))?.priority).toBe(2);
  await expect(page.getByText("Не удалось сохранить свойство", { exact: true })).not.toBeVisible();
  await closeTaskEditor(page);
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
});

test("properties of a series starting later than tomorrow save to the series", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-25T08:00:00Z"));
  await setup(page);
  await closeTaskEditor(page);
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  const title = page.getByRole("textbox", { name: "Название задачи" });
  await title.fill("Будущая серия");
  await showTaskProperties(page);
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Следующая неделя", exact: true }).click();
  await page.getByRole("button", { name: "27 октября", exact: true }).click();
  await page.getByRole("button", { name: "Повтор", exact: true }).click();
  await page.getByRole("radio", { name: "В точное время", exact: true }).click();
  const time = page.getByRole("textbox", { name: "Время дедлайна", exact: true });
  await time.fill("21:15");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  const task = page
    .getByRole("button", { name: "Редактировать задачу: Будущая серия", exact: true })
    .first();
  await task.click();
  await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
  await page.getByRole("button", { name: /^Повторение ·/ }).click();
  await expect(time).toHaveValue("21:15");
  await time.fill("20:45");
  await page.getByRole("button", { name: "Готово", exact: true }).click();
  await showTaskProperties(page);
  await page.getByRole("button", { name: /^Приоритет ·/ }).click();
  await page.getByRole("radio", { name: "P2 · Средний", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить серию", exact: true }).click();
  await expect(title).not.toBeVisible();
  await page.reload();
  await task.click();
  await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
  await showTaskProperties(page);
  await expect(
    page.getByRole("button", { name: "Приоритет · P2 · Средний", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Повторение ·/ }).click();
  await expect(time).toHaveValue("20:45");
});
