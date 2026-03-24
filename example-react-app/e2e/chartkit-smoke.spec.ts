import { expect, test } from "playwright/test";

test("renders the Datathing ChartKit example and reacts to dimension changes", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("/?market=CN");

  await expect(page.getByRole("heading", { name: "Datathing ChartKit" })).toBeVisible();
  await expect(page.getByText("Export Value")).toBeVisible();
  await page.locator(".ck-chart-echart").first().waitFor({ state: "visible", timeout: 20000 });

  const firstDimensionCell = page.locator(".ck-table tbody tr").first().locator("td").nth(1);
  const initialDimension = (await firstDimensionCell.textContent())?.trim() ?? "";
  expect(initialDimension).not.toBe("");

  await page.selectOption("#exports-dimension", "group");

  await expect
    .poll(async () => ((await firstDimensionCell.textContent()) ?? "").trim(), {
      timeout: 20000,
    })
    .not.toBe(initialDimension);

  await expect(pageErrors, `page errors: ${pageErrors.join("\n")}`).toEqual([]);
  await expect(consoleErrors, `console errors: ${consoleErrors.join("\n")}`).toEqual([]);
});
