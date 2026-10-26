import { test, expect, type Page } from "@playwright/test";

test("durable offline capture, reconnect, second device and completion history", async ({
  page,
  browser,
}) => {
  await page.goto("/current");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Начать планирование" }).click();
  await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();
  await page.keyboard.press("q");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toBeFocused();
  await page.getByRole("textbox", { name: "Название задачи" }).press("q");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue("q");
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Отправить план полидня");
  await page.getByRole("textbox", { name: "Название задачи" }).press("Enter");
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Редактировать задачу: Отправить план полидня", exact: true }),
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
    page.getByRole("button", { name: "Редактировать задачу: Отправить план полидня", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Сохранить задачу без сети");
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Редактировать задачу: Сохранить задачу без сети",
      exact: true,
    }),
  ).toBeVisible();
  await page.context().setOffline(false);
  await page.getByRole("button", { name: "Синхронизировать задачи" }).click();
  await expect(
    page.getByText("Синхронизировано", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await other.newPage();
  await phone.goto(new URL("/current", page.url()).href);
  await phone.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await expect(
    phone.getByRole("button", {
      name: "Редактировать задачу: Сохранить задачу без сети",
      exact: true,
    }),
  ).toBeVisible();
  await phone
    .getByRole("checkbox", { name: "Завершить: Сохранить задачу без сети", exact: true })
    .click();
  await expect(
    phone.getByRole("button", {
      name: "Редактировать задачу: Сохранить задачу без сети",
      exact: true,
    }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Синхронизировать задачи" }).click();
  await page.getByRole("button", { name: "Показать выполненные" }).click();
  await expect(
    page.getByRole("button", {
      name: "Редактировать задачу: Сохранить задачу без сети",
      exact: true,
    }),
  ).toBeVisible();
  await other.close();
});

test("a deadline is explicitly removed before selecting an untimed polyday or inbox", async ({
  page,
}) => {
  await openComposer(page);
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Изменить режим планирования");
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await page.getByRole("button", { name: "Добавить время", exact: true }).click();
  await page.getByRole("textbox", { name: "Время дедлайна" }).fill("12:00");
  await done(page);
  await send(page);
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  const taskLink = page.getByRole("button", {
    name: "Редактировать задачу: Изменить режим планирования",
    exact: true,
  });
  await taskLink.click();
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await expect(page.getByRole("radio", { name: "Входящие", exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Убрать дедлайн", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Время дедлайна" })).not.toBeVisible();
  await done(page);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await taskLink.click();
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Во входящие", exact: true }).click();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
  await page.getByRole("link", { name: "Входящие", exact: true }).click();
  await expect(taskLink).toBeVisible();
});

test("compact capture supports shortcut menus, transactional dates and narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await openComposer(page);
  const title = page.getByRole("textbox", { name: "Название задачи" });
  await expect(title).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Описание · необязательно" })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Добавить задачу", exact: true }).last(),
  ).toBeDisabled();
  await page.getByRole("textbox", { name: "Описание · необязательно" }).click();
  await expect(title).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("Введите название задачи.")).not.toBeVisible();
  await title.fill("Подготовить подробный план следующего полидня и обсудить его с командой");
  // Long titles grow, then remain scrollable without hiding their final line.
  await expect.poll(() => title.evaluate((input) => input.clientHeight)).toBeGreaterThan(48);
  await title.press("End");
  await expect
    .poll(() =>
      title.evaluate((input) => {
        input.scrollTop = input.scrollHeight;
        return input.scrollTop + input.clientHeight >= input.scrollHeight - 2;
      }),
    )
    .toBe(true);
  await title.fill("Подготовить план !!");
  await page.getByRole("radio", { name: "P1 · Высокий", exact: true }).click();
  await expect(title).toHaveValue("Подготовить план");
  await expect(page.getByRole("radio")).toHaveCount(0);
  await title.fill("Подготовить план #");
  await page.getByRole("button", { name: "Во входящие", exact: true }).click();
  await expect(title).toHaveValue("Подготовить план");
  await page
    .getByRole("textbox", { name: "Описание · необязательно" })
    .fill("Сверить задачи и время сна.");
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await page.getByRole("button", { name: "Добавить время", exact: true }).click();
  await page.getByRole("textbox", { name: "Время дедлайна" }).fill("21:30");
  await page.keyboard.press("Escape");
  await expect(title).toHaveValue("Подготовить план");
  await expect(
    page.getByRole("button", { name: "Когда выполнить · Входящие", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Открыть календарь", exact: true }).click();
  await page.getByRole("button", { name: "Предыдущий месяц", exact: true }).click();
  await page.getByRole("button", { name: /^15 / }).click();
  await page.getByRole("button", { name: "Добавить время", exact: true }).click();
  const time = page.getByRole("textbox", { name: "Время дедлайна" });
  await time.fill("25:70");
  await done(page);
  await expect(time).toHaveAttribute("aria-invalid", "true");
  await time.fill("100");
  await time.press("Tab");
  await expect(time).toHaveValue("01:00");
  await done(page);
  await expect(page.getByRole("button", { name: /^Когда выполнить ·.*01:00/ })).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
  await expect(page.getByText("Закрыть и удалить черновик?")).toBeVisible();
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await send(page);
  await expect(title).not.toBeVisible();
});

for (const width of [1440, 390]) {
  test(`title shortcuts select and persist all four priorities at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await openComposer(page);
    const title = page.getByRole("textbox", { name: "Название задачи" });
    const labels = ["P1 · Высокий", "P2 · Средний", "P3 · Низкий", "P4 · Без приоритета"];
    for (const priority of [1, 2, 3, 4]) {
      const name = `План ${width} P${priority}`;
      await title.fill(name);
      await title.pressSequentially(" !!");
      await expect(page.getByRole("radiogroup", { name: "Приоритет", exact: true })).toBeVisible();
      await title.pressSequentially(String(priority));
      await expect(title).toHaveValue(name);
      await expect(page.getByRole("radio")).toHaveCount(0);
      await expect(title).toBeFocused();
      await expect(
        page.getByRole("button", { name: `Приоритет · ${labels[priority - 1]}`, exact: true }),
      ).toBeVisible();
      if (priority === 3) {
        await page.screenshot({
          path: testInfo.outputPath(`priority-shortcut-${width}-${Date.now()}.png`),
        });
      }
      await send(page);
      if (priority < 4)
        await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
    }
    for (const priority of [1, 2, 3, 4]) {
      await page
        .getByRole("button", {
          name: `Редактировать задачу: План ${width} P${priority}`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", { name: `Приоритет · ${labels[priority - 1]}`, exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
    }
    const task = page.getByRole("button", {
      name: `Редактировать задачу: План ${width} P1`,
      exact: true,
    });
    await task.click();
    // Pasting a complete command also works while editing an existing task.
    await title.fill(`План ${width} P1 !!4`);
    await expect(title).toHaveValue(`План ${width} P1`);
    await expect(
      page.getByRole("button", { name: "Приоритет · P4 · Без приоритета", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Сохранить", exact: true }).click();
    await expect(title).not.toBeVisible();
    await task.click();
    await expect(
      page.getByRole("button", { name: "Приоритет · P4 · Без приоритета", exact: true }),
    ).toBeVisible();
  });
}

test("recurrence editing preserves the series deadline independently of an occurrence", async ({
  page,
}) => {
  await openComposer(page);
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Проверить план перед сном");
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await page.getByRole("button", { name: "Завтра", exact: true }).click();
  await page.getByRole("button", { name: "Повтор", exact: true }).click();
  await page.getByRole("radio", { name: "В точное время", exact: true }).click();
  const time = page.getByRole("textbox", { name: "Время дедлайна" });
  await time.fill("21:15");
  await expect(page.getByRole("button", { name: /^Начало серии:/ })).toContainText("Завтра");
  await chooseDate(page, "Окончание серии · необязательно", "Сегодня");
  await done(page);
  await expect(page.getByText("Окончание серии должно быть не раньше начала.")).toBeVisible();
  await chooseDate(page, "Окончание серии · необязательно", "Завтра");
  await done(page);
  await send(page);
  await page.getByRole("link", { name: "Предстоящие", exact: true }).click();
  const task = page.getByRole("button", {
    name: "Редактировать задачу: Проверить план перед сном",
    exact: true,
  });
  await task.click();
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await time.fill("22:30");
  await done(page);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await task.click();
  await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
  await expect(time).toHaveValue("22:30");
  await done(page);
  await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
  await page.getByRole("button", { name: /^Повторение ·/ }).click();
  await expect(time).toHaveValue("21:15");
  await expect(page.getByText(/Изменения применятся к будущим повторениям/)).toBeVisible();
  await time.fill("20:45");
  await done(page);
  await page.getByRole("textbox", { name: "Название задачи" }).fill("Черновик названия серии");
  await page.getByRole("button", { name: /^Приоритет ·/ }).click();
  await page.getByRole("radio", { name: "P1 · Высокий", exact: true }).click();
  await page.getByRole("button", { name: "Вернуться к повторению", exact: true }).click();
  await expect(page.getByText("Перейти без сохранения изменений?")).toBeVisible();
  await page.getByRole("button", { name: "Не сохранять", exact: true }).click();
  await page.getByRole("button", { name: "Изменить всю серию", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).toHaveValue(
    "Проверить план перед сном",
  );
  await expect(
    page.getByRole("button", { name: "Приоритет · P1 · Высокий", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Повторение ·/ }).click();
  await expect(time).toHaveValue("20:45");
  await done(page);
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
});

for (const [width, height] of [
  [1440, 900],
  [1440, 400],
  [390, 640],
  [320, 640],
] as const) {
  test(`property menus keep the composer stationary at ${width}×${height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await openComposer(page);
    const title = page.getByRole("textbox", { name: "Название задачи" });
    const description = page.getByRole("textbox", { name: "Описание · необязательно" });
    const submit = page.getByRole("button", { name: "Добавить задачу", exact: true }).last();
    await title.fill("Подготовить план");
    const fields = [title, description, submit];
    const bounds = await Promise.all(fields.map((field) => field.boundingBox()));
    const expectStationary = async () => {
      for (const [index, field] of fields.entries()) {
        await expect.poll(() => field.boundingBox()).toEqual(bounds[index]);
      }
    };

    await page.getByRole("button", { name: /^Приоритет ·/ }).click();
    const choices = page.getByRole("radiogroup", { name: "Приоритет", exact: true });
    await expect(choices).toBeVisible();
    await expectStationary();
    await expect(page.getByRole("radio", { name: "P1 · Высокий", exact: true })).toBeInViewport();
    if (height === 400) {
      await choices.hover();
      await page.mouse.wheel(0, 240);
      await expect(
        page.getByRole("radio", { name: "P4 · Без приоритета", exact: true }),
      ).toBeInViewport({ ratio: 1 });
    }
    await page
      .getByRole("radio", { name: "P4 · Без приоритета", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("radio", { name: "P4 · Без приоритета", exact: true }),
    ).toBeInViewport();
    if (height === 900 || width === 390) {
      await page.screenshot({
        path: testInfo.outputPath(`priority-stationary-${width}-${Date.now()}.png`),
        animations: "disabled",
      });
    }
    await page.getByRole("radio", { name: "P1 · Высокий", exact: true }).click();
    await expect(title).toBeFocused();
    await expectStationary();

    await title.fill("Подготовить план !!");
    await expect(page.getByRole("radio", { name: "P1 · Высокий", exact: true })).toBeVisible();
    await expectStationary();
    await page.keyboard.press("Escape");
    await title.fill("Подготовить план");
    await page.getByRole("button", { name: /^Когда выполнить ·/ }).click();
    await expect(page.getByRole("radiogroup", { name: "Полидень", exact: true })).toBeVisible();
    await expectStationary();
    await page.getByRole("button", { name: "Во входящие", exact: true }).click();
    await expectStationary();
  });
}

async function openComposer(page: Page) {
  await page.goto("/backlog");
  await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
}
async function done(page: Page) {
  await page.getByRole("button", { name: "Готово", exact: true }).click();
}
async function send(page: Page) {
  await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
  await expect(page.getByRole("textbox", { name: "Название задачи" })).not.toBeVisible();
}
async function chooseDate(page: Page, label: string, shortcut: "Сегодня" | "Завтра") {
  await page.getByRole("button", { name: new RegExp(`^${label}:`) }).click();
  await page.getByRole("button", { name: shortcut, exact: true }).click();
}

test.describe("first-visit navigation", () => {
  test.use({ serviceWorkers: "block" });

  for (const width of [1440, 390]) {
    test(`keeps the app visible throughout new routes at ${width}px`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/current");
      await page.getByRole("button", { name: "Открыть пространство разработки" }).click();
      await expect(page.getByRole("link", { name: "Входящие", exact: true })).toBeVisible();
      // Make a cold route load long enough to expose even a brief empty fallback.
      await page.route(
        /\/_expo\/static\/js\/web\/(backlog|upcoming|history|settings)-.*\.js$/,
        async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 250));
          await route.continue();
        },
      );

      for (const [name, heading] of [
        ["Входящие", "Входящие"],
        ["Предстоящие", "Предстоящие"],
        ["История", "История полидней"],
        ["Настройки", "Расписание полидней"],
      ]) {
        await page.evaluate(() => {
          const frames: boolean[] = [];
          const sample = () => {
            frames.push(
              [...document.querySelectorAll('a[href="/current"]')].some((link) =>
                [...link.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0),
              ),
            );
            frame = requestAnimationFrame(sample);
          };
          let frame = requestAnimationFrame(sample);
          Object.assign(window, {
            stopNavigationFrames: () => {
              cancelAnimationFrame(frame);
              return frames;
            },
          });
        });
        await page.getByRole("link", { name, exact: true }).click();
        await expect(
          page.getByText(heading, { exact: true }).filter({ visible: true }).last(),
        ).toBeVisible();
        const frames = await page.evaluate(async () => {
          await new Promise(requestAnimationFrame);
          return (
            window as unknown as { stopNavigationFrames: () => boolean[] }
          ).stopNavigationFrames();
        });
        expect(frames.length).toBeGreaterThan(0);
        expect(frames.every(Boolean), `${name}: navigation disappeared during the transition`).toBe(
          true,
        );
      }

      await page.goBack();
      await expect(page.getByRole("heading", { name: "История полидней" })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`navigation-${width}-${Date.now()}.png`) });
      await page.goForward();
      await expect(
        page.getByText("Расписание полидней", { exact: true }).filter({ visible: true }),
      ).toBeVisible();
    });
  }
});

test("task links open the inline editor in inbox and completed polyday lists", async ({
  page,
}, testInfo) => {
  await openComposer(page);
  const title = page.getByRole("textbox", { name: "Название задачи" });
  for (const name of [
    "Собрать идеи для выходных",
    "Подготовить план следующего полидня",
    "Заказать продукты",
  ]) {
    await title.fill(name);
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).last().click();
    await expect(title).not.toBeVisible();
    await page.getByRole("button", { name: "Добавить задачу", exact: true }).first().click();
  }
  await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
  const id = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("polydays", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stored = await new Promise<Array<{ state: import("@polydays/sync").LocalState }>>(
      (resolve, reject) => {
        const request = db.transaction("accounts").objectStore("accounts").getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    db.close();
    return stored
      .flatMap(({ state }) => [
        ...state.records.map((record) => record.document),
        ...state.pending.map((operation) => operation.entity),
      ])
      .find(
        (document) =>
          document.kind === "task" && document.data.title === "Подготовить план следующего полидня",
      )?.data.id;
  });
  expect(id).toBeTruthy();
  await page.goto(`/task/${id}`);
  await expect(page).toHaveURL(/\/backlog\?taskId=/);
  await expect(title).toHaveValue("Подготовить план следующего полидня");
  await expect(task(page, "Заказать продукты")).toBeVisible();
  await title.fill("Подготовить план следующего полидня !!2");
  await page
    .getByRole("textbox", { name: "Описание · необязательно" })
    .fill("Выбрать главное и оставить время для отдыха.");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await task(page, "Подготовить план следующего полидня").click();
  await expect(
    page.getByText("Синхронизировано", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath(`inline-desktop-verified-${Date.now()}.png`) });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath(`inline-mobile-verified-${Date.now()}.png`) });
  await page
    .getByTestId("task-editor")
    .getByRole("checkbox", { name: "Завершить: Подготовить план следующего полидня", exact: true })
    .click();
  await expect(title).not.toBeVisible();
  await page.goto(`/task/${id}`);
  await expect(page).toHaveURL(/\/day\/.*\?taskId=/);
  await expect(title).toHaveValue("Подготовить план следующего полидня");
  await expect(
    page.getByTestId("task-editor").getByRole("checkbox", {
      name: "Вернуть в работу: Подготовить план следующего полидня",
      exact: true,
    }),
  ).toBeChecked();
});

function task(page: Page, name: string) {
  return page.getByRole("button", { name: `Редактировать задачу: ${name}`, exact: true });
}
