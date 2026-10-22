import { test, expect } from "@playwright/test";

test("durable offline capture, reconnect, second device and completion history", async ({
  page,
  browser,
}) => {
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование" }).click();
  await expect(page.getByRole("link", { name: "Бэклог", exact: true })).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toBeFocused();
  await page.getByRole("textbox", { name: "Название задачи" }).press("q");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue("q");
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Отправить план полидня");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
  await expect(
    page.getByRole("link", { name: "Открыть задачу: Отправить план полидня", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Синхронизировано", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Открыть задачу: Отправить план полидня", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Сохранить задачу без сети");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Открыть задачу: Сохранить задачу без сети", exact: true }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Синхронизировать задачи" }).click();
  await expect(
    page.getByText("Синхронизировано", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await other.newPage();
  await phone.goto("http://localhost:3400/current");
  await phone.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await expect(
    phone.getByRole("link", { name: "Открыть задачу: Сохранить задачу без сети", exact: true }),
  ).toBeVisible();
  await phone
    .getByRole("checkbox", { name: "Завершить: Сохранить задачу без сети", exact: true })
    .click();
  await expect(
    phone.getByRole("link", { name: "Открыть задачу: Сохранить задачу без сети", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Синхронизировать задачи" }).click();
  await page.getByRole("button", { name: "Показать выполненные" }).click();
  await expect(
    page.getByRole("link", { name: "Открыть задачу: Сохранить задачу без сети", exact: true }),
  ).toBeVisible();
  await other.close();
});

test("a deadline is explicitly removed before selecting an untimed polyday or backlog", async ({
  page,
}) => {
  await page.goto("/backlog");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await expect(page.getByRole("link", { name: "Бэклог", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Текущий полидень", exact: true }).click();
  await expect(page).toHaveURL(/\/current$/);
  await expect(
    page.getByRole("button", { name: "Показать выполненные", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Бэклог", exact: true }).click();
  await expect(page).toHaveURL(/\/backlog$/);
  await expect(
    page
      .getByText("Задачи, которым вы ещё не выбрали полидень", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await page.keyboard.press("Control+q");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
  await page.keyboard.press("q");
  await expect(
    page.getByRole("textbox", { name: "Дата начала полидня · ГГГГ-ММ-ДД" }),
  ).not.toBeVisible();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Изменить режим планирования");
  await page.getByRole("radio", { name: "Дата и время", exact: true }).click();
  const deadlineDate = page.getByRole("textbox", { name: "Дата дедлайна · ГГГГ-ММ-ДД" });
  const tomorrow = new Date(`${await deadlineDate.inputValue()}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await deadlineDate.fill(tomorrow.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
  await expect(
    page.getByText("Синхронизировано", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  const taskLink = page.getByRole("link", {
    name: "Открыть задачу: Изменить режим планирования",
    exact: true,
  });
  await taskLink.click();
  await expect(page.getByRole("radio", { name: "Полидень", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Убрать дедлайн", exact: true }).click();
  await page.getByRole("radio", { name: "Полидень", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Время дедлайна · ЧЧ:ММ" })).not.toBeVisible();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
  await taskLink.click();
  await page.getByRole("radio", { name: "Бэклог", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
  await page.goto("/backlog");
  await expect(
    page.getByRole("link", { name: "Открыть задачу: Изменить режим планирования", exact: true }),
  ).toBeVisible();
});
