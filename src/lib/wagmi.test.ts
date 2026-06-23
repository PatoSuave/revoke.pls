import { describe, expect, it } from "vitest";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
  supportedChains,
} from "./chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "./arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "./ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "./hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "./optimism-approval-client";
import { walletChains } from "./wagmi";

describe("wagmi wallet chains", () => {
  it("keeps generic product chains separate from special wallet-recognition chains", () => {
    expect(supportedChains.map((chain) => chain.id)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
    ]);

    expect(walletChains.map((chain) => chain.id)).toEqual([
      PULSECHAIN_CHAIN_ID,
      BSC_CHAIN_ID,
      BASE_CHAIN_ID,
      POLYGON_CHAIN_ID,
      SONIC_CHAIN_ID,
      AVALANCHE_CHAIN_ID,
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      BERACHAIN_CHAIN_ID,
      CELO_CHAIN_ID,
      GNOSIS_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
      ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
      ARBITRUM_ONE_CLIENT_CHAIN_ID,
      OPTIMISM_CLIENT_CHAIN_ID,
      HYPEREVM_CLIENT_CHAIN_ID,
    ]);
  });
});
