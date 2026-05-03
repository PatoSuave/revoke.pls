import { describe, expect, it } from "vitest";

import { parseDiscoveryResults, type ReadResult } from "./approvals";
import {
  BSC_CHAIN_ID,
  BSC_EXPLORER_API_DEFAULT,
  PULSECHAIN_CHAIN_ID,
  bsc,
  getChainConfig,
  isSupportedChainId,
  supportedChainConfigList,
  supportedChains,
} from "./chains";
import { explorerAddressUrl, explorerTokenUrl, explorerTxUrl } from "./explorer";
import {
  getSpenderEntry,
  getSpendersForChain,
  getTokensForChain,
} from "./registry";
import { buildRevokeCall } from "./revoke";
import { siteConfig } from "./site";
import type { DiscoveredPair } from "./discovery";

const OWNER = "0xcae394005c9c4c309621c53d53db9ceb701fc8d8" as const;
const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const SPENDER = "0x2222222222222222222222222222222222222222" as const;
const PULSEX_ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as const;
const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as const;

function success(result: unknown): ReadResult {
  return { status: "success", result };
}

describe("supported chain config", () => {
  it("activates exactly PulseChain and BSC", () => {
    expect(supportedChains.map((chain) => chain.id)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.chainId)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
    ]);
    expect(supportedChainConfigList.map((chain) => chain.shortName)).toEqual([
      "PulseChain",
      "BSC",
    ]);
    expect(isSupportedChainId(1)).toBe(false);
  });

  it("configures BSC identity, gas, standards, and API defaults", () => {
    const config = getChainConfig(BSC_CHAIN_ID);

    expect(config?.chainId).toBe(56);
    expect(config?.displayName).toBe("BNB Smart Chain");
    expect(config?.shortName).toBe("BSC");
    expect(config?.nativeSymbol).toBe("BNB");
    expect(config?.standardLabels).toMatchObject({
      fungible: "BEP-20",
      nft: "BEP-721",
      multiToken: "BEP-1155",
    });
    expect(config?.explorer.baseUrl).toBe("https://bscscan.com");
    expect(config?.discovery.apiUrl).toBe(BSC_EXPLORER_API_DEFAULT);
    expect(bsc.id).toBe(56);
    expect(bsc.nativeCurrency.symbol).toBe("BNB");
  });

  it("keeps PulseChain gas and explorer labels intact", () => {
    const config = getChainConfig(PULSECHAIN_CHAIN_ID);

    expect(config?.nativeSymbol).toBe("PLS");
    expect(config?.explorer.name).toBe("PulseScan");
    expect(config?.standardLabels.fungible).toBe("PRC-20");
  });

  it("builds BscScan explorer links", () => {
    expect(explorerAddressUrl(BSC_CHAIN_ID, SPENDER)).toBe(
      `https://bscscan.com/address/${SPENDER}`,
    );
    expect(explorerTokenUrl(BSC_CHAIN_ID, TOKEN)).toBe(
      `https://bscscan.com/token/${TOKEN}`,
    );
    expect(explorerTxUrl(BSC_CHAIN_ID, "0xabc")).toBe(
      "https://bscscan.com/tx/0xabc",
    );
  });

  it("does not leak PulseChain registry labels onto BSC", () => {
    expect(getSpenderEntry(PULSECHAIN_CHAIN_ID, PULSEX_ROUTER)?.label).toBe(
      "PulseX Router v2",
    );
    expect(getSpenderEntry(BSC_CHAIN_ID, PULSEX_ROUTER)).toBeUndefined();
  });

  it("does not expose dormant Ethereum registries through active lookup helpers", () => {
    expect(isSupportedChainId(1)).toBe(false);
    expect(getSpenderEntry(1, UNISWAP_ROUTER)).toBeUndefined();
    expect(getTokensForChain(1)).toEqual([]);
    expect(getSpendersForChain(1)).toEqual([]);
  });

  it("builds a BEP-20-compatible revoke call with approve(spender, 0)", () => {
    expect(
      buildRevokeCall({
        chainId: BSC_CHAIN_ID,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
    ).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
    });
  });

  it("carries chain ID onto parsed approval records", () => {
    const pair: DiscoveredPair = {
      chainId: BSC_CHAIN_ID,
      approvalType: "fungible",
      tokenAddress: TOKEN,
      ownerAddress: OWNER,
      spenderAddress: SPENDER,
    };

    const parsed = parseDiscoveryResults(
      [success("TOK"), success(18), success("Token"), success(1n)],
      OWNER,
      BSC_CHAIN_ID,
      [pair],
    );

    expect(parsed.approvals[0]).toMatchObject({
      chainId: BSC_CHAIN_ID,
      key: `${BSC_CHAIN_ID}-${TOKEN}-${SPENDER}`,
    });
  });

  it("keeps public product copy from presenting Ethereum as supported", () => {
    const copy = [
      siteConfig.tagline,
      siteConfig.description,
      siteConfig.longDescription,
      ...siteConfig.keywords,
    ].join(" ");

    expect(copy).toContain("BSC");
    expect(copy).not.toContain("Ethereum");
    expect(copy).not.toContain("Etherscan");
  });
});
