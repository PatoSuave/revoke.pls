import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("revoke receipt UI source", () => {
  const receiptSource = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "revoke-receipt.tsx"),
    "utf8",
  );
  const erc20Source = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "approval-row.tsx"),
    "utf8",
  );
  const nftSource = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "nft-approval-row.tsx"),
    "utf8",
  );
  const ethereumSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "sections",
      "ethereum-readonly-scanner.tsx",
    ),
    "utf8",
  );

  it("renders explorer transaction links from the existing helper", () => {
    expect(receiptSource).toContain("explorerTxUrl(details.chainId, hash)");
    expect(receiptSource).toContain("View on explorer");
  });

  it("wires receipts into ERC-20, NFT, and Ethereum row status surfaces", () => {
    expect(erc20Source).toContain("<RevokeReceipt");
    expect(nftSource).toContain("<RevokeReceipt");
    expect(ethereumSource).toContain("<RevokeReceipt");
    expect(erc20Source).toContain("postRevokeVerificationState");
    expect(nftSource).toContain("postRevokeVerificationState");
    expect(ethereumSource).toContain("postRevokeVerificationState");
  });

  it("keeps existing unavailable states visible", () => {
    expect(erc20Source).toContain("Revoke unavailable");
    expect(nftSource).toContain("Revoke unavailable");
    expect(ethereumSource).toContain("ReadOnlyAction");
  });

  it("does not add protected-status claims to receipt source", () => {
    const forbidden = ["sa", "fe"].join("");

    expect(receiptSource.toLowerCase()).not.toMatch(
      new RegExp(`\\b${forbidden}\\b`),
    );
  });
});
