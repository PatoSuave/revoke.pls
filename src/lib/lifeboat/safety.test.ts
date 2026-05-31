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

  it("keeps the guided report readable without weakening safety copy", () => {
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

    expect(component).toContain("GuidedTriageReport");
    expect(component).toContain("Priority findings");
    expect(component).toContain("Recommended next steps");
    expect(component).toContain("function DiagnosticGroup");
    expect(component).toContain("<details");
    expect(component).toContain("<summary");
    expect(component).toContain("Exposure");
    expect(component).toContain("Active compromise signals");
    expect(component).toContain("Account and delegation risk");
    expect(component).toContain("HEX and staking");
    expect(component).toContain("Save or share this report");
    expect(component.toLowerCase()).not.toContain("all clear");
    expect(component.toLowerCase()).not.toContain("guaranteed recovery");
    expect(component.toLowerCase()).not.toContain("remove the hacker");
  });
});
