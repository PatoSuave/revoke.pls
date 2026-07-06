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
    expect(rowsByChain.get("Polygon")).toMatchObject({
      chainId: "137",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Sonic Mainnet")).toMatchObject({
      chainId: "146",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Sonic Mainnet")?.note).toContain(
      "Gas is paid in S",
    );
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
      "Batch revoke is not enabled",
    );
    expect(rowsByChain.get("Optimism")).toMatchObject({
      chainId: "10",
      scan: "Yes",
      revoke: "ERC-20/NFT verified rows only",
      status: "Live",
    });
    expect(rowsByChain.get("Optimism")?.note).toContain(
      "Batch revoke is not enabled",
    );
    expect(rowsByChain.get("HyperEVM")).toMatchObject({
      chainId: "999",
      scan: "Yes",
      revoke: "ERC-20/NFT verified rows only",
      status: "Live",
    });
    expect(rowsByChain.get("HyperEVM")?.note).toContain(
      "Gas is paid in HYPE",
    );
    expect(rowsByChain.get("Linea")).toMatchObject({
      chainId: "59144",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Linea")?.note).toContain("Gas is paid in ETH");
    expect(rowsByChain.get("Blast")).toMatchObject({
      chainId: "81457",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Blast")?.note).toContain("Gas is paid in ETH");
    expect(rowsByChain.get("Berachain")).toMatchObject({
      chainId: "80094",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Berachain")?.note).toContain(
      "Gas is paid in BERA",
    );
    expect(rowsByChain.get("Celo")).toMatchObject({
      chainId: "42220",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Celo")?.note).toContain("Gas is paid in CELO");
    expect(rowsByChain.get("Gnosis")).toMatchObject({
      chainId: "100",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Gnosis")?.note).toContain("Gas is paid in XDAI");
    expect(rowsByChain.get("Unichain")).toMatchObject({
      chainId: "130",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Unichain")?.note).toContain("Gas is paid in ETH");
    expect(rowsByChain.get("World Chain")).toMatchObject({
      chainId: "480",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("World Chain")?.note).toContain(
      "Gas is paid in ETH",
    );
    expect(rowsByChain.get("Robinhood Chain")).toMatchObject({
      chainId: "4663",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Robinhood Chain")?.note).toContain(
      "Gas is paid in ETH",
    );
    expect(rowsByChain.get("Monad")).toMatchObject({
      chainId: "143",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Monad")?.note).toContain("Gas is paid in MON");
    expect(rowsByChain.get("Katana")).toMatchObject({
      chainId: "747474",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Katana")?.note).toContain("Gas is paid in ETH");
    expect(rowsByChain.get("Sei")).toMatchObject({
      chainId: "1329",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Sei")?.note).toContain("Gas is paid in SEI");
    expect(rowsByChain.get("Plasma")).toMatchObject({
      chainId: "9745",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Plasma")?.note).toContain("Gas is paid in XPL");
    expect(rowsByChain.get("Abstract")).toMatchObject({
      chainId: "2741",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Abstract")?.note).toContain("Gas is paid in ETH");
    expect(rowsByChain.get("Fraxtal")).toMatchObject({
      chainId: "252",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Fraxtal")?.note).toContain("Gas is paid in FRAX");
    expect(rowsByChain.get("Taiko Mainnet")).toMatchObject({
      chainId: "167000",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Taiko Mainnet")?.note).toContain(
      "Gas is paid in ETH",
    );
    expect(rowsByChain.get("opBNB")).toMatchObject({
      chainId: "204",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("opBNB")?.note).toContain("Gas is paid in BNB");
    expect(rowsByChain.get("Moonbeam")).toMatchObject({
      chainId: "1284",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("Moonbeam")?.note).toContain("Gas is paid in GLMR");
    expect(rowsByChain.get("ApeChain")).toMatchObject({
      chainId: "33139",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("ApeChain")?.note).toContain("Gas is paid in APE");
    expect(rowsByChain.get("XDC Network")).toMatchObject({
      chainId: "50",
      scan: "Yes",
      revoke: "Yes",
      status: "Live",
    });
    expect(rowsByChain.get("XDC Network")?.note).toContain(
      "Gas is paid in XDC",
    );
    expect(rowsByChain.get("Solana")).toMatchObject({
      scan: "No",
      revoke: "No",
      status: "Not supported",
    });
  });

  it("states privacy limits without overclaiming infrastructure behavior", () => {
    expect(DATA_MINIMIZATION_COPY).toContain(
      "does not maintain an application database",
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
