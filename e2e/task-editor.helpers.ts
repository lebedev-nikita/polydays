import { expect, type Page } from "@playwright/test";

export async function showTaskProperties(page: Page) {
  if (await page.getByRole("heading", { name: /^Изменить (задачу|серию)$/ }).isVisible())
    await page.getByRole("button", { name: "Назад к задаче", exact: true }).click();
}

export async function closeTaskEditor(page: Page) {
  await showTaskProperties(page);
  await page.getByRole("button", { name: "Закрыть", exact: true }).last().click();
}

export async function revealDescription(page: Page) {
  const description = page.getByRole("textbox", { name: "Описание · необязательно" });
  if (!(await description.isVisible()))
    await page.getByRole("button", { name: "Добавить описание", exact: true }).click();
  await expect(description).toBeVisible();
}
