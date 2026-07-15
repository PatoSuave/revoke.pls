import { expect, test } from "@playwright/test";

import { createCtmTokenContractReportFixture } from "../src/lib/token-contract-report-ctm-fixture";

test("renders the layered CTM report with architecture-aware answers", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.route("**/api/token-contract-report/stream", async (route) => {
    const report = createCtmTokenContractReportFixture();
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: JSON.stringify({ type: "final", report }) + "\n",
    });
  });

  await page.goto("/TokenContractReport");
  await page.getByLabel("Chain").selectOption("1");
  await page
    .getByLabel("Contract address")
    .fill("0xc8Fb80fCc03f699C70ff0CC08C09106288888888");
  await page.getByRole("button", { name: "Generate report" }).click();
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}nextjs-portal{display:none!important}",
  });
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete),
  );
  await expect(
    page.getByRole("heading", {
      name: "High-severity mint capability confirmed",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "What is possible, what happened, and what remains unknown",
    }),
  ).toBeVisible();
  await expect(page.getByText("Role-based AccessControl", { exact: true })).toBeVisible();
  await expect(page.getByText("Who currently holds MINTER_ROLE?", { exact: true })).toBeVisible();
  await expect(page.getByText("Liquidity, buyability, and sellability remain untested", { exact: false })).toBeVisible();
  await expect(page.getByText("Invalid test:", { exact: false })).toBeVisible();

  const questions = page.locator(
    'section[aria-labelledby="token-report-key-questions"]',
  );
  await expect(questions).not.toContainText("Can owner");
  await expect(page.getByLabel("Token contract report results")).not.toContainText(
    "HIGH OBSERVED RISK",
  );
  await expect(
    page.getByRole("link", { name: "View all findings and evidence" }),
  ).toHaveAttribute("href", "#token-report-findings-by-meaning");

  await page.getByRole("button", { name: "Protective evidence" }).click();
  await expect(page.getByText("Caller self-burn decreases supply", { exact: true })).toBeVisible();
  await expect(page.getByText("Additional token minting capability", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "All findings" }).click();

  const advancedEvidence = page.getByText(/Advanced evidence \(/).first();
  await advancedEvidence.click();
  await expect(
    page.getByText("primary · source · src/ctm.sol:18", { exact: true }),
  ).toBeVisible();

  await expect(
    page.locator("[data-nextjs-dialog], #webpack-dev-server-client-overlay"),
  ).toHaveCount(0);
  const relevantConsoleErrors = consoleErrors.filter(
    (message) =>
      !message.includes("upgrade-insecure-requests") &&
      !(
        message.includes("hydrated") &&
        message.includes("nonce") &&
        message.includes("HotReload")
      ),
  );
  expect(relevantConsoleErrors).toEqual([]);
  const screenshot = await page
    .getByLabel("Token contract report results")
    .screenshot({ animations: "disabled" });
  expect(screenshot).toMatchSnapshot("ctm-token-contract-report.png", {
    maxDiffPixelRatio: 0.02,
  });
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});
