import { test, expect } from "@playwright/test";

test("streams assistant message in chat UI", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("new-chat").click();

  const input = page.getByTestId("composer-input");
  await input.fill("React 中 useEffect 有什么作用？");

  await page.getByTestId("send-button").click();

  await expect(page.locator("text=React 中 useEffect 有什么作用？")).toBeVisible();

  const assistant = page.locator(".bubble-assistant").last();

  // Wait for the first chunk to appear.
  await expect(assistant).toContainText("useEffect", { timeout: 30_000 });

  const firstText = await assistant.innerText();
  await page.waitForTimeout(800);
  const secondText = await assistant.innerText();

  expect(secondText.length).toBeGreaterThan(firstText.length);
});

