import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  HARDWARE_WALLET_CANCEL_COPY,
  HARDWARE_WALLET_COMPATIBILITY_ROWS,
  HARDWARE_WALLET_CONFIRMATION_COPY,
  HARDWARE_WALLET_EXPECTED_REVOKE_CALLS,
  HARDWARE_WALLET_EXPECTED_REVOKE_FUNCTIONS,
  HARDWARE_WALLET_PROVIDER_COPY,
  HARDWARE_WALLET_REVIEW_COPY,
  HARDWARE_WALLET_SECTION_TITLE,
  HARDWARE_WALLET_SIGNING_LIMIT_COPY,
} from "./hardware-wallet-guidance";

describe("hardware wallet guidance", () => {
  it("keeps the security page section copy explicit", () => {
    expect(HARDWARE_WALLET_SECTION_TITLE).toBe("Hardware wallet users");
    expect(HARDWARE_WALLET_SIGNING_LIMIT_COPY).toBe(
      "Pulse Revoke does not manage hardware-wallet signing directly.",
    );
    expect(HARDWARE_WALLET_PROVIDER_COPY).toContain(
      "wallet provider and device handle signing",
    );
    expect(HARDWARE_WALLET_REVIEW_COPY).toContain("Rabby");
    expect(HARDWARE_WALLET_REVIEW_COPY).toContain("MetaMask");
  });

  it("lists expected revoke functions and wallet cancel signals", () => {
    expect(HARDWARE_WALLET_EXPECTED_REVOKE_FUNCTIONS).toEqual([
      "approve(spender, 0)",
      "setApprovalForAll(operator, false)",
      "approve(0x0, tokenId)",
    ]);
    expect(HARDWARE_WALLET_EXPECTED_REVOKE_CALLS.map((item) => item.call)).toEqual(
      HARDWARE_WALLET_EXPECTED_REVOKE_FUNCTIONS,
    );

    for (const signal of [
      "transfer",
      "swap",
      "bridge",
      "new approval",
      "unknown function",
      "unexpected spender",
      "unreasonable fee",
    ]) {
      expect(HARDWARE_WALLET_CANCEL_COPY).toContain(signal);
    }
  });

  it("keeps confirmation guidance clear without overclaiming", () => {
    const copy = [
      HARDWARE_WALLET_SIGNING_LIMIT_COPY,
      HARDWARE_WALLET_PROVIDER_COPY,
      HARDWARE_WALLET_REVIEW_COPY,
      HARDWARE_WALLET_CANCEL_COPY,
      HARDWARE_WALLET_CONFIRMATION_COPY,
      JSON.stringify(HARDWARE_WALLET_EXPECTED_REVOKE_CALLS),
      JSON.stringify(HARDWARE_WALLET_COMPATIBILITY_ROWS),
    ].join(" ");
    const lowerCopy = copy.toLowerCase();

    expect(HARDWARE_WALLET_CONFIRMATION_COPY).toContain("Verify the chain");
    expect(HARDWARE_WALLET_CONFIRMATION_COPY).toContain(
      "Pulse Revoke does not manage hardware-wallet signing directly",
    );
    expect(lowerCopy).not.toContain(["guaranteed", "safe"].join(" "));
    expect(lowerCopy).not.toContain(["trusted", "wallet"].join(" "));
    expect(lowerCopy).not.toContain(
      ["directly supports ", "trezor", " connect"].join(""),
    );
    expect(lowerCopy).not.toContain(
      ["directly supports ", "wallet", "connect"].join(""),
    );
    expect(lowerCopy).not.toContain(
      ["directly supports ", "qr", " signing"].join(""),
    );
  });

  it("wires the section and confirmation guidance into the UI sources", () => {
    const securityPage = readFileSync(
      join(process.cwd(), "src", "app", "security", "page.tsx"),
      "utf8",
    );
    const erc20Row = readFileSync(
      join(process.cwd(), "src", "components", "approvals", "approval-row.tsx"),
      "utf8",
    );
    const nftRow = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "approvals",
        "nft-approval-row.tsx",
      ),
      "utf8",
    );
    const batchPanel = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "approvals",
        "batch-revoke-panel.tsx",
      ),
      "utf8",
    );

    expect(securityPage).toContain("<HardwareWalletSection />");
    expect(securityPage).toContain("HARDWARE_WALLET_EXPECTED_REVOKE_FUNCTIONS");
    expect(erc20Row).toContain("<HardwareWalletGuidance />");
    expect(nftRow).toContain("<HardwareWalletGuidance />");
    expect(batchPanel).toContain("HardwareWalletGuidance");
  });

  it("does not add direct signing code or direct hardware wallet dependencies", () => {
    const guidanceSources = [
      readFileSync(
        join(process.cwd(), "src", "lib", "hardware-wallet-guidance.ts"),
        "utf8",
      ),
      readFileSync(
        join(
          process.cwd(),
          "src",
          "components",
          "approvals",
          "hardware-wallet-guidance.tsx",
        ),
        "utf8",
      ),
      readFileSync(
        join(process.cwd(), "src", "components", "approvals", "approval-row.tsx"),
        "utf8",
      ),
      readFileSync(
        join(
          process.cwd(),
          "src",
          "components",
          "approvals",
          "nft-approval-row.tsx",
        ),
        "utf8",
      ),
      readFileSync(
        join(
          process.cwd(),
          "src",
          "components",
          "approvals",
          "batch-revoke-panel.tsx",
        ),
        "utf8",
      ),
    ].join("\n");
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const directDependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).map((name) => name.toLowerCase());

    for (const forbiddenCode of [
      ["write", "Contract"].join(""),
      ["send", "Transaction"].join(""),
      ["sign", "Transaction"].join(""),
      ["private", "Key"].join(""),
      ["mnemon", "ic"].join(""),
      ["relay", "er"].join(""),
    ]) {
      expect(guidanceSources).not.toContain(forbiddenCode);
    }

    for (const forbiddenDependency of [
      ["@trezor", "/connect"].join(""),
      ["@trezor", "/connect-web"].join(""),
      ["wallet", "connect"].join(""),
      ["web", "usb"].join(""),
      ["web", "hid"].join(""),
    ]) {
      expect(directDependencyNames).not.toContain(forbiddenDependency);
    }
  });
});
