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
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ethereum",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const arbitrumRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "arbitrum",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const optimismRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "optimism",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const hyperevmRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "hyperevm",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const bscBaseRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "discovery",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );

    expect(
      `${ethereumRoute}\n${arbitrumRoute}\n${optimismRoute}\n${hyperevmRoute}\n${bscBaseRoute}`,
    ).not.toMatch(
      /writeContract|sendTransaction|signTransaction|privateKey|mnemonic|seed|relayer/i,
    );
  });

  it("keeps public approval API responses explicitly non-cacheable", () => {
    const cacheHeaders = readFileSync(
      join(process.cwd(), "src", "lib", "approval-api-cache.ts"),
      "utf8",
    );
    const ethereumRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "ethereum",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const arbitrumRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "arbitrum",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const optimismRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "optimism",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const hyperevmRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "hyperevm",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );
    const bscBaseRoute = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "discovery",
        "approvals",
        "route.ts",
      ),
      "utf8",
    );

    expect(cacheHeaders).toContain("Cache-Control");
    expect(cacheHeaders).toContain("Vercel-CDN-Cache-Control");
    expect(cacheHeaders).toContain("no-store");
    for (const route of [
      ethereumRoute,
      arbitrumRoute,
      optimismRoute,
      hyperevmRoute,
      bscBaseRoute,
    ]) {
      expect(route).toContain("approvalApiNoStoreHeaders");
      expect(route).toContain("headers: approvalApiNoStoreHeaders({");
    }
  });

  it("keeps token-logo lookup bounded and rate-limited", () => {
    const route = readFileSync(
      join(process.cwd(), "src", "app", "api", "token-logos", "route.ts"),
      "utf8",
    );
    const helpers = readFileSync(
      join(process.cwd(), "src", "lib", "token-logos.ts"),
      "utf8",
    );
    const controls = readFileSync(
      join(process.cwd(), "src", "lib", "token-logo-api-controls.ts"),
      "utf8",
    );

    expect(helpers).toContain("TOKEN_LOGO_MAX_ADDRESSES = 30");
    expect(helpers).toContain("TOKEN_LOGO_REQUEST_TIMEOUT_MS = 8_000");
    expect(route).toContain("checkTokenLogoApiRateLimit");
    expect(route).toContain("tokenLogoNoStoreHeaders");
    expect(route).toContain("Retry-After");
    expect(controls).toContain("TOKEN_LOGO_API_RATE_LIMIT");
    expect(`${route}\n${helpers}`).not.toMatch(
      /writeContract|sendTransaction|signTransaction|privateKey|mnemonic|seed|relayer/i,
    );
  });

  it("keeps hosted hardening smoke checks wired", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
    const liveScript = readFileSync(
      join(process.cwd(), "scripts", "security-live.mjs"),
      "utf8",
    );
    const envScript = readFileSync(
      join(process.cwd(), "scripts", "check-hosted-public-env.mjs"),
      "utf8",
    );
    const hostedHardening = readFileSync(
      join(process.cwd(), "docs", "HOSTED-HARDENING.md"),
      "utf8",
    );
    const auditGuide = readFileSync(
      join(process.cwd(), "docs", "AUDIT-GUIDE.md"),
      "utf8",
    );

    expect(packageJson).toContain('"security:live"');
    expect(packageJson).toContain('"security:env"');
    expect(liveScript).toContain("content-security-policy");
    expect(liveScript).toContain("/api/token-logos");
    expect(liveScript).toContain("/api/gas?chainId=369");
    expect(liveScript).toContain("assertNoApiKeyShapedLiteral");
    expect(liveScript).toContain("_vercel_share");
    expect(envScript).toContain("NEXT_PUBLIC_BSC_EXPLORER_API_KEY");
    expect(envScript).toContain("NEXT_PUBLIC_BSCSCAN_API_KEY");
    expect(envScript).toContain("NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY");
    expect(envScript).toContain("NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY");
    expect(envScript).toContain("NEXT_PUBLIC_ETHERSCAN_API_KEY");
    expect(envScript).toContain("allow-desktop-public-keys");
    expect(`${hostedHardening}\n${auditGuide}`).toContain("Vercel Firewall");
    expect(hostedHardening).toContain("npm.cmd run security:live");
    expect(hostedHardening).toContain("npm.cmd run security:env");
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

  it("keeps HyperEVM revoke limited to controlled row hooks", () => {
    const component = readFileSync(
      join(
        process.cwd(),
        "src",
        "components",
        "sections",
        "hyperevm-readonly-scanner.tsx",
      ),
      "utf8",
    );
    const hook = readFileSync(
      join(process.cwd(), "src", "hooks", "use-hyperevm-approval-scan.ts"),
      "utf8",
    );
    const client = readFileSync(
      join(process.cwd(), "src", "lib", "hyperevm-approval-client.ts"),
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
    expect(client).toContain("/api/hyperevm/approvals?owner=");
    expect(hook).toContain('queryKey: ["hyperevm-approval-api"');
    expect(hook).toContain('emptyHyperEVMApprovalApiResponse("upstream-failure"');
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
    expect(security).toContain("HyperEVM, chain ID `999`");
    expect(security).toContain("HYPE");
    expect(auditGuide).toContain("Ethereum Mainnet, chain ID `1`");
    expect(auditGuide).toContain("Arbitrum One, chain ID `42161`");
    expect(auditGuide).toContain("Optimism / OP Mainnet, chain ID `10`");
    expect(auditGuide).toContain("HyperEVM, chain ID `999`");
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
