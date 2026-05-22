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
    const ethereumRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "ethereum", "approvals", "route.ts"),
      "utf8",
    );
    const arbitrumRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "arbitrum", "approvals", "route.ts"),
      "utf8",
    );
    const optimismRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "optimism", "approvals", "route.ts"),
      "utf8",
    );
    const tokenChairRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "token-chair-sniffer",
        "market",
        "route.ts",
      ),
      "utf8",
    );

    expect(
      `${ethereumRoute}\n${arbitrumRoute}\n${optimismRoute}\n${tokenChairRoute}`,
    ).not.toMatch(
      /writeContract|sendTransaction|signTransaction|privateKey|mnemonic|seed|relayer/i,
    );
  });

  it("keeps public API rate-limit keys centralized and bounded", () => {
    const clientKeyHelper = readFileSync(
      join(process.cwd(), "src", "lib", "request-client-key.ts"),
      "utf8",
    );
    const ethereumRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "ethereum", "approvals", "route.ts"),
      "utf8",
    );
    const arbitrumRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "arbitrum", "approvals", "route.ts"),
      "utf8",
    );
    const optimismRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "optimism", "approvals", "route.ts"),
      "utf8",
    );
    const tokenChairRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "token-chair-sniffer",
        "market",
        "route.ts",
      ),
      "utf8",
    );
    const routes = `${ethereumRoute}\n${arbitrumRoute}\n${optimismRoute}\n${tokenChairRoute}`;

    expect(clientKeyHelper).toContain("isIP");
    expect(clientKeyHelper).toContain("unknown-client");
    for (const route of [
      ethereumRoute,
      arbitrumRoute,
      optimismRoute,
      tokenChairRoute,
    ]) {
      expect(route).toContain("getRequestClientKey(request)");
    }
    expect(routes).not.toContain('headers.get("x-forwarded-for")');
    expect(routes).not.toContain("function rateLimitKey");
  });

  it("keeps wallet providers out of the global and Token Chair route shells", () => {
    const globalProviders = readFileSync(
      join(process.cwd(), "src", "components", "providers.tsx"),
      "utf8",
    );
    const walletProviders = readFileSync(
      join(process.cwd(), "src", "components", "wallet-providers.tsx"),
      "utf8",
    );
    const siteHeader = readFileSync(
      join(process.cwd(), "src", "components", "sections", "site-header.tsx"),
      "utf8",
    );
    const appPage = readFileSync(
      join(process.cwd(), "src", "app", "app", "page.tsx"),
      "utf8",
    );
    const tokenChairPage = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "app",
        "token-chair-sniffer",
        "page.tsx",
      ),
      "utf8",
    );

    expect(globalProviders).not.toContain("WagmiProvider");
    expect(globalProviders).not.toContain("@/lib/wagmi");
    expect(siteHeader).not.toContain("ConnectWalletButton");
    expect(siteHeader).not.toContain("@/lib/wagmi");
    expect(walletProviders).toContain("WagmiProvider");
    expect(walletProviders).toContain("@/lib/wagmi");
    expect(appPage).toContain("<WalletProviders>");
    expect(appPage).toContain("<ConnectWalletButton");
    expect(tokenChairPage).not.toContain("WalletProviders");
    expect(tokenChairPage).not.toContain("WagmiProvider");
  });

  it("keeps public approval API responses explicitly non-cacheable", () => {
    const cacheHeaders = readFileSync(
      join(process.cwd(), "src", "lib", "approval-api-cache.ts"),
      "utf8",
    );
    const ethereumRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "ethereum", "approvals", "route.ts"),
      "utf8",
    );
    const arbitrumRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "arbitrum", "approvals", "route.ts"),
      "utf8",
    );
    const optimismRoute = readFileSync(
      join(process.cwd(), "src", "app", "api", "optimism", "approvals", "route.ts"),
      "utf8",
    );

    expect(cacheHeaders).toContain("Cache-Control");
    expect(cacheHeaders).toContain("Vercel-CDN-Cache-Control");
    expect(cacheHeaders).toContain("no-store");
    for (const route of [ethereumRoute, arbitrumRoute, optimismRoute]) {
      expect(route).toContain("approvalApiNoStoreHeaders");
      expect(route).toContain("headers: approvalApiNoStoreHeaders({");
    }
  });

  it("keeps Arbitrum revoke limited to controlled row hooks", () => {
    const component = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "arbitrum-readonly-scanner.tsx",
      ),
      "utf8",
    );
    const hook = readFileSync(
      join(process.cwd(), "src", "hooks", "use-arbitrum-approval-scan.ts"),
      "utf8",
    );
    const client = readFileSync(
      join(process.cwd(), "src", "lib", "arbitrum-approval-client.ts"),
      "utf8",
    );

    expect(component).toContain("useRevokeApproval");
    expect(component).toContain("useRevokeNftApproval");
    expect(`${hook}\n${client}`).not.toMatch(
      /useRevokeApproval|useRevokeNftApproval|useBatchRevoke|writeContract|sendTransaction/i,
    );
    expect(component).not.toMatch(
      /useBatchRevoke|writeContract|sendTransaction/i,
    );
    expect(client).toContain("revokeEnabled: false");
    expect(client).toContain("batchRevokeEnabled: false");
    expect(client).toContain("nftRevokeEnabled: false");
    expect(client).toContain("nftRowRevokeEnabled");
    expect(client).toContain("/api/arbitrum/approvals?owner=");
    expect(hook).toContain('queryKey: ["arbitrum-approval-api"');
    expect(hook).toContain('emptyArbitrumApprovalApiResponse("upstream-failure"');
    expect(`${component}\n${client}`).not.toMatch(/\bsafe\b/i);
  });

  it("keeps Optimism revoke limited to controlled row hooks", () => {
    const component = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "optimism-readonly-scanner.tsx",
      ),
      "utf8",
    );
    const hook = readFileSync(
      join(process.cwd(), "src", "hooks", "use-optimism-approval-scan.ts"),
      "utf8",
    );
    const client = readFileSync(
      join(process.cwd(), "src", "lib", "optimism-approval-client.ts"),
      "utf8",
    );

    expect(component).toContain("useRevokeApproval");
    expect(component).toContain("useRevokeNftApproval");
    expect(`${hook}\n${client}`).not.toMatch(
      /useRevokeApproval|useRevokeNftApproval|useBatchRevoke|writeContract|sendTransaction/i,
    );
    expect(component).not.toMatch(
      /useBatchRevoke|writeContract|sendTransaction/i,
    );
    expect(client).toContain("revokeEnabled: false");
    expect(client).toContain("batchRevokeEnabled: false");
    expect(client).toContain("nftRevokeEnabled: false");
    expect(client).toContain("erc20RowRevokeEnabled");
    expect(client).toContain("nftRowRevokeEnabled");
    expect(client).toContain("/api/optimism/approvals?owner=");
    expect(hook).toContain('queryKey: ["optimism-approval-api"');
    expect(hook).toContain('emptyOptimismApprovalApiResponse("upstream-failure"');
    expect(`${component}\n${client}`).not.toMatch(/\bsafe\b/i);
  });

  it("keeps Ethereum security docs current", () => {
    const security = readFileSync(join(process.cwd(), "SECURITY.md"), "utf8");
    const auditGuide = readFileSync(
      join(process.cwd(), "docs", "AUDIT-GUIDE.md"),
      "utf8",
    );

    expect(security).toContain("Ethereum Mainnet, chain ID `1`");
    expect(security).toContain("server-read-only discovery");
    expect(security).toContain("Arbitrum One, chain ID `42161`");
    expect(security).toContain("verified ERC-20 and NFT rows");
    expect(security).toContain("Optimism / OP Mainnet, chain ID `10`");
    expect(security).toContain("verified ERC-20 and NFT rows");
    expect(auditGuide).toContain("Ethereum Mainnet, chain ID `1`");
    expect(auditGuide).toContain("Arbitrum One, chain ID `42161`");
    expect(auditGuide).toContain("Optimism / OP Mainnet, chain ID `10`");
    expect(auditGuide).toContain("CSP report-only");
    expect(auditGuide).toContain("Permit2 And Hybrid Discovery Questions");
    expect(auditGuide).toContain("Permit2.approve(token, spender, 0, 0)");
    expect(auditGuide).toContain("Hybrid filter");
    expect(`${security}\n${auditGuide}`).not.toContain(
      "Ethereum Mainnet should remain inactive",
    );
    expect(`${security}\n${auditGuide}`).not.toContain(
      "Ethereum Mainnet is not an active supported product chain",
    );
  });
});
