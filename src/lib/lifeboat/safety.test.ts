import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LIFEBOAT_CRITICAL_WARNINGS,
  LIFEBOAT_NOT_TO_DO,
  LIFEBOAT_PLANNED_MODULES,
} from "@/lib/lifeboat/copy";

describe("Wallet Lifeboat safety copy", () => {
  it("keeps required warnings visible and direct", () => {
    const copy = [
      ...LIFEBOAT_CRITICAL_WARNINGS,
      ...LIFEBOAT_NOT_TO_DO,
      ...LIFEBOAT_PLANNED_MODULES.map((module) => module.body),
    ].join(" ");

    expect(copy).toContain("Never enter your seed phrase or private key");
    expect(copy).toContain("read-only");
    expect(copy).toContain("Do not add gas");
    expect(copy).toContain(
      "Revoking approvals may reduce spender risk, but it does not secure a wallet",
    );
    expect(copy.toLowerCase()).not.toContain("guaranteed recovery");
    expect(copy.toLowerCase()).not.toContain("recover your wallet");
  });

  it("does not render secret-request input fields", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "wallet-lifeboat.tsx",
      ),
      "utf8",
    );
    const inputBlocks = source.match(/<input[\s\S]*?\/>/g) ?? [];
    const secretFieldPattern =
      /seed phrase|recovery phrase|private key|mnemonic|keystore|wallet password/i;

    expect(inputBlocks.length).toBeGreaterThan(0);
    for (const input of inputBlocks) {
      expect(input).not.toMatch(secretFieldPattern);
    }
  });

  it("keeps the route wired without adding write-path vocabulary", () => {
    const page = readFileSync(
      join(process.cwd(), "src", "app", "app", "wallet-lifeboat", "page.tsx"),
      "utf8",
    );
    const component = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "wallet-lifeboat.tsx",
      ),
      "utf8",
    );

    expect(page).toContain("WalletLifeboat");
    expect(page).toContain("LIFEBOAT_ROUTE");
    expect(component).not.toMatch(
      /writeContract|sendTransaction|server signer|server-sign|flashbots|eth_sendBundle|eth_sendPrivateTransaction/i,
    );
  });

  it("keeps the polished report layout readable without weakening safety copy", () => {
    const component = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "wallet-lifeboat.tsx",
      ),
      "utf8",
    );

    expect(component).toContain("export function WalletLifeboat");
    expect(component).toContain("GuidedTriageReport");
    expect(component).toContain("Check a risky wallet before adding gas.");
    expect(component).toContain("Read-only scan");
    expect(component).toContain("No wallet connection required");
    expect(component).toContain("Never enter a seed phrase or private key.");
    expect(component).toContain("Before you do anything");
    expect(component.match(/Before you do anything/g) ?? []).toHaveLength(1);
    expect(component).toContain("Wallet to inspect");
    expect(component).toContain('id="lifeboat-address-input"');
    expect(component).toContain("What Lifeboat checks");
    expect(component).toContain("Approvals");
    expect(component).toContain("NFT permissions");
    expect(component).toContain("Gas-sweeper signals");
    expect(component).toContain("HEX stake status");
    expect(component).toContain("Scan summary");
    expect(component).toContain("Top priority findings");
    expect(component).toContain("Recommended next steps");
    expect(component).toContain("Report status");
    expect(component).toContain("function DiagnosticGroup");
    expect(component).toContain("<details");
    expect(component).toContain("<summary");
    expect(component).toContain("Exposure");
    expect(component).toContain("Active compromise signals");
    expect(component).toContain("Account and delegation risk");
    expect(component).toContain("HEX and staking");
    expect(component).toContain("Diagnostic details");
    expect(component).toContain("Full diagnostic coverage");
    expect(component).toContain("Save or share this report");
    expect(component.toLowerCase()).not.toContain("all clear");
    expect(component.toLowerCase()).not.toContain("guaranteed recovery");
    expect(component.toLowerCase()).not.toContain("remove the hacker");
    expect(component.toLowerCase()).not.toMatch(/scan complete[^.]*safe/);
  });
});
