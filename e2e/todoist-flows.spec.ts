import { test, expect } from "@playwright/test";

test("inline capture, priority, search, details, completion and delete undo", async ({ page }) => {
  await page.goto("/backlog");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  const title = "Проверить привычные сценарии Todoist";
  const task = page.getByRole("link", { name: `Открыть задачу: ${title}`, exact: true });
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill(`${title} p1 `);
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue(title);
  await page
    .getByRole("textbox", { name: "Описание", exact: true })
    .fill("Найти по описанию: акварель");
  await page.getByRole("button", { name: "Приоритет 1", exact: true }).click();
  await expect(page.getByRole("radio", { name: "P1 · Высокий" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue(title);
  await page.getByRole("textbox", { name: "Название задачи" }).press("Enter");
  await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(task).toBeVisible();
  await task.focus();
  await page.keyboard.press("2");
  await page.getByRole("button", { name: `Другие действия: ${title}`, exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Установить P2: ${title}`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Другие действия: ${title}`, exact: true }).click();
  await page.keyboard.press("/");
  await page.getByRole("textbox", { name: "Поиск задач", exact: true }).fill("акварель");
  await page.getByRole("link", { name: `Найденная задача: ${title}`, exact: true }).click();
  await expect(page).toHaveURL(/\/task\//);
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue(title);
  await page.getByRole("button", { name: "Когда выполнить", exact: true }).click();
  await page.getByRole("radio", { name: "Полидень", exact: true }).click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page).toHaveURL(/\/backlog$/);
  await expect(task).not.toBeVisible();
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  await task.click();
  await page.getByRole("button", { name: "Когда выполнить", exact: true }).click();
  await page.getByRole("radio", { name: "Бэклог", exact: true }).click();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.getByRole("link", { name: "Бэклог", exact: true }).click();
  await task.focus();
  await page.keyboard.press("e");
  await expect(task).not.toBeVisible();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(task).toBeVisible();
  await page.getByRole("button", { name: `Другие действия: ${title}`, exact: true }).click();
  await page.getByRole("button", { name: `Удалить: ${title}`, exact: true }).click();
  await expect(task).not.toBeVisible();
  await page.getByRole("button", { name: "Отменить", exact: true }).click();
  await expect(task).toBeVisible();
  await page.reload();
  await expect(task).toBeVisible();
});

test("mobile quick capture, recurrence validation, cancel and navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Ежедневная проверка");
  await page.getByRole("button", { name: "Повторение", exact: true }).click();
  await page.getByRole("button", { name: "В выбранном полидне", exact: true }).click();
  await page.getByRole("checkbox", { name: "Пн", exact: true }).click();
  await page.getByRole("checkbox", { name: "Вт", exact: true }).click();
  await page.getByRole("textbox", { name: "Окончание серии · необязательно" }).fill("2020-01-01");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByRole("alert")).toContainText(
    "Окончание серии должно быть не раньше начала.",
  );
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue(
    "Ежедневная проверка",
  );
  await page.getByRole("textbox", { name: "Окончание серии · необязательно" }).fill("");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await page.getByRole("button", { name: "Поиск", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Поиск задач", exact: true })
    .fill("ничего подобного нет");
  await expect(page.getByText("Ничего не найдено", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть поиск", exact: true }).click();
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Открыть задачу: Ежедневная проверка", exact: true }).first(),
  ).toBeVisible();
  const occurrences = page.getByRole("link", {
    name: "Открыть задачу: Ежедневная проверка",
    exact: true,
  });
  const count = await occurrences.count();
  expect(count).toBeGreaterThanOrEqual(2);
  await page
    .getByRole("checkbox", { name: "Завершить: Ежедневная проверка", exact: true })
    .first()
    .click();
  await expect(occurrences).toHaveCount(count - 1);
  await page.getByRole("link", { name: "История", exact: true }).click();
  await expect(page.getByRole("heading", { name: "История полидней", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});

test("series editing from an old occurrence retains the future time and polyday", async ({
  page,
}) => {
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await expect(page.getByRole("link", { name: "Бэклог", exact: true })).toBeVisible();
  for (const mode of ["time", "polyday"] as const) {
    await expect(page.getByRole("link", { name: "Бэклог", exact: true })).toBeVisible();
    const title = `Сохранить будущее правило ${mode}`;
    await page.keyboard.press("q");
    await page.getByRole("textbox", { name: "Название задачи" }).fill(title);
    await page.getByRole("button", { name: "Повторение", exact: true }).click();
    await page
      .getByRole("button", {
        name: mode === "time" ? "В точное время" : "В выбранном полидне",
        exact: true,
      })
      .click();
    if (mode === "time")
      await page.getByRole("textbox", { name: "Время дедлайна · ЧЧ:ММ" }).fill("09:00");
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await expect(page.getByText("Задача сохранена. Можно добавить следующую.")).toBeVisible();
    await page.getByRole("button", { name: "Закрыть", exact: true }).click();
    // Current view also includes today's overdue morning occurrence.
    const old = page.getByRole("link", { name: `Открыть задачу: ${title}`, exact: true }).first();
    await old.click();
    await expect(page).toHaveURL(/\/task\//);
    const oldURL = page.url();
    await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
    if (mode === "time")
      await page.getByRole("textbox", { name: "Время дедлайна · ЧЧ:ММ" }).fill("21:30");
    else await page.getByRole("radio", { name: /Вечерний/ }).click();
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page).toHaveURL(/\/current$/);
    await page.goto(oldURL);
    await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
    if (mode === "time")
      await expect(page.getByRole("textbox", { name: "Время дедлайна · ЧЧ:ММ" })).toHaveValue(
        "21:30",
      );
    else await expect(page.getByRole("radio", { name: /Вечерний/ })).toBeChecked();
    await page.getByRole("textbox", { name: "Название задачи" }).fill(`${title} изменено`);
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(page).toHaveURL(/\/current$/);
    await page.goto(oldURL);
    await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
    if (mode === "time")
      await expect(page.getByRole("textbox", { name: "Время дедлайна · ЧЧ:ММ" })).toHaveValue(
        "21:30",
      );
    else await expect(page.getByRole("radio", { name: /Вечерний/ })).toBeChecked();
    // Escape from the toolbar must close even when focus is outside the form.
    await page.getByRole("button", { name: "Закрыть задачу", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("textbox", { name: "Название задачи" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
    await page.goto("/current");
  }
});
