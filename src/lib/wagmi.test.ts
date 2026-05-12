import { describe, expect, it } from "vitest";

import {
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  supportedChains,
} from "./chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "./arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "./ethereum-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "./optimism-approval-client";
import { walletChains } from "./wagmi";

describe("wagmi wallet chains", () => {
  it("keeps active product chains separate from read-only wallet-recognition chains", () => {
    expect(supportedChains.map((chain) => chain.id)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
    ]);

    expect(walletChains.map((chain) => chain.id)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
      OPTIMISM_CLIENT_CHAIN_ID,
    ]);
  });
});
