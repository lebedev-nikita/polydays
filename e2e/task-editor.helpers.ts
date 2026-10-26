import { expect, type Page } from "@playwright/test";

export async function revealDescription(page: Page) {
  const description = page.getByRole("textbox", { name: "Описание · необязательно" });
  if (!(await description.isVisible()))
    await page.getByRole("button", { name: "Добавить описание", exact: true }).click();
  await expect(description).toBeVisible();
}
