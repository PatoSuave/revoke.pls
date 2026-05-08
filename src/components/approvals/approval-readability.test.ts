import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

describe("approval row readability copy", () => {
  const erc20Source = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "approval-row.tsx"),
    "utf8",
  );
  const nftSource = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "nft-approval-row.tsx"),
    "utf8",
  );
  const helperSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "approvals",
      "approval-readability.tsx",
    ),
    "utf8",
  );

  it("explains ERC-20 approval permission and recommended action", () => {
    expect(helperSource).toContain("What this approval means");
    expect(erc20Source).toContain(
      "This spender can use an unlimited amount of this token from your wallet.",
    );
    expect(erc20Source).toContain(
      "This spender can use up to ${approval.formattedAllowance} of this token from your wallet.",
    );
    expect(erc20Source).toContain("Unlimited approval");
    expect(erc20Source).toContain("Limited approval");
    expect(erc20Source).toContain(
      "Revoke if you do not recognize this spender or no longer use the connected app.",
    );
  });

  it("explains NFT approval permission and recommended action", () => {
    expect(nftSource).toContain("Collection / token");
    expect(nftSource).toContain(
      "This operator can manage all NFTs from this collection.",
    );
    expect(nftSource).toContain(
      "This operator can manage this NFT approval.",
    );
    expect(nftSource).toContain(
      "Revoke if you do not recognize this operator or no longer use the connected app.",
    );
  });

  it("does not claim spenders or operators are safe", () => {
    const combined = `${erc20Source}\n${nftSource}`.toLowerCase();

    expect(combined).not.toContain("spender is safe");
    expect(combined).not.toContain("operator is safe");
    expect(combined).not.toContain("safe spender");
    expect(combined).not.toContain("safe operator");
  });
});
