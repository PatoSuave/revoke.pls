import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("hardening source invariants", () => {
  it("keeps batch revoke receipt handling sequential", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "hooks", "use-batch-revoke.ts"),
      "utf8",
    );

    expect(source).toContain("await client.waitForTransactionReceipt");
    expect(source).not.toContain("receiptPromises");
    expect(source).not.toContain("Promise.all(receipt");
  });

  it("keeps API routes free of server-side write, signing, or relayer logic", () => {
    const route = readFileSync(
      join(process.cwd(), "src", "app", "api", "ethereum", "approvals", "route.ts"),
      "utf8",
    );

    expect(route).not.toMatch(
      /writeContract|sendTransaction|signTransaction|privateKey|mnemonic|seed|relayer/i,
    );
  });

  it("keeps Ethereum security docs current", () => {
    const security = readFileSync(join(process.cwd(), "SECURITY.md"), "utf8");
    const auditGuide = readFileSync(
      join(process.cwd(), "docs", "AUDIT-GUIDE.md"),
      "utf8",
    );

    expect(security).toContain("Ethereum Mainnet, chain ID `1`");
    expect(security).toContain("server-read-only discovery");
    expect(auditGuide).toContain("Ethereum Mainnet, chain ID `1`");
    expect(auditGuide).toContain("CSP report-only");
    expect(`${security}\n${auditGuide}`).not.toContain(
      "Ethereum Mainnet should remain inactive",
    );
    expect(`${security}\n${auditGuide}`).not.toContain(
      "Ethereum Mainnet is not an active supported product chain",
    );
  });
});
