import { describe, expect, it } from "vitest";

import {
  ANTI_PHISHING_COPY,
  DATA_MINIMIZATION_COPY,
  OFFICIAL_DOMAIN,
  SECURITY_CHAIN_STATUS_ROWS,
  SECURITY_CANNOT_DO,
  WALLET_VERIFICATION_ITEMS,
} from "./security-content";

describe("security content", () => {
  it("keeps the official-domain warning explicit", () => {
    expect(OFFICIAL_DOMAIN).toBe("pulserevoke.com");
    expect(ANTI_PHISHING_COPY).toContain("Official site: pulserevoke.com");
    expect(ANTI_PHISHING_COPY).toContain("seed phrase");
    expect(ANTI_PHISHING_COPY).toContain("private key");
    expect(ANTI_PHISHING_COPY).toContain("DMs");
    expect(ANTI_PHISHING_COPY).toContain("Telegram");
    expect(ANTI_PHISHING_COPY).toContain("Discord");
    expect(ANTI_PHISHING_COPY).toContain("misspelled domains");
  });

  it("reflects the current production chain status without enabling future chains", () => {
    const rowsByChain = new Map(
      SECURITY_CHAIN_STATUS_ROWS.map((row) => [row.chain, row]),
    );

    expect(rowsByChain.get("PulseChain")).toMatchObject({
      chainId: "369",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("BNB Smart Chain")).toMatchObject({
      chainId: "56",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Base")).toMatchObject({
      chainId: "8453",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Ethereum Mainnet")?.revoke).toContain(
      "live-verified rows",
    );
    expect(rowsByChain.get("Arbitrum One")).toMatchObject({
      chainId: "42161",
      scan: "Yes",
      revoke: "ERC-20/NFT verified rows only",
      status: "Live",
    });
    expect(rowsByChain.get("Arbitrum One")?.note).toContain(
      "batch revoke is not enabled",
    );
    expect(rowsByChain.get("Optimism")).toMatchObject({
      chainId: "10",
      scan: "Yes",
      revoke: "NFT verified rows only",
      status: "Live",
    });
    expect(rowsByChain.get("Optimism")?.note).toContain(
      "ERC-20 and batch revoke are not enabled",
    );
    expect(rowsByChain.get("Solana")).toMatchObject({
      scan: "No",
      revoke: "No",
      status: "Not supported",
    });
  });

  it("states privacy limits without overclaiming infrastructure behavior", () => {
    expect(DATA_MINIMIZATION_COPY).toContain(
      "does not maintain an app-level database",
    );
    expect(DATA_MINIMIZATION_COPY).toContain("RPC");
    expect(DATA_MINIMIZATION_COPY).toContain("explorer");
    expect(DATA_MINIMIZATION_COPY).toContain("providers may still process");
    expect(DATA_MINIMIZATION_COPY).not.toContain("never log");
  });

  it("keeps public safety limits and wallet review checks concrete", () => {
    expect(SECURITY_CANNOT_DO.join(" ")).toContain("custody tokens");
    expect(SECURITY_CANNOT_DO.join(" ")).toContain("Recover stolen assets");
    expect(SECURITY_CANNOT_DO.join(" ")).toContain("Support Solana");
    expect(WALLET_VERIFICATION_ITEMS.join(" ").toLowerCase()).toContain(
      "function name",
    );
    expect(WALLET_VERIFICATION_ITEMS.join(" ")).toContain("Gas fee");
    expect(WALLET_VERIFICATION_ITEMS.join(" ")).toContain("transfer");
    expect(JSON.stringify(SECURITY_CHAIN_STATUS_ROWS).toLowerCase()).not.toContain(
      "safe",
    );
  });
});
