import { describe, expect, it } from "vitest";
import type { Connector } from "wagmi";

import { buildAvailableWalletConnectors } from "@/lib/wallet-connectors";

function mockConnector({
  id,
  name,
  type,
  uid = id,
}: {
  id: string;
  name: string;
  type: Connector["type"];
  uid?: string;
}): Connector {
  return { id, name, type, uid } as Connector;
}

describe("connect wallet menu connectors", () => {
  it("keeps named injected wallets separate instead of letting one provider win", () => {
    const connectors = buildAvailableWalletConnectors([
      mockConnector({ id: "injected", name: "Injected", type: "injected" }),
      mockConnector({
        id: "io.rabby",
        name: "Rabby Wallet",
        type: "injected",
      }),
      mockConnector({
        id: "io.internetmoney",
        name: "Internet Money Wallet",
        type: "injected",
      }),
      mockConnector({
        id: "com.zkxwallet",
        name: "ZKX Wallet",
        type: "injected",
      }),
      mockConnector({
        id: "walletConnect",
        name: "WalletConnect",
        type: "walletConnect",
      }),
    ]);

    expect(connectors.map((connector) => connector.name)).toEqual([
      "Rabby Wallet",
      "Internet Money Wallet",
      "ZKX Wallet",
      "WalletConnect",
    ]);
  });

  it("keeps a generic Browser wallet fallback when named discovery is unavailable", () => {
    const connectors = buildAvailableWalletConnectors([
      mockConnector({ id: "injected", name: "Injected", type: "injected" }),
      mockConnector({
        id: "walletConnect",
        name: "WalletConnect",
        type: "walletConnect",
      }),
    ]);

    expect(connectors.map((connector) => connector.name)).toEqual([
      "Injected",
      "WalletConnect",
    ]);
  });

  it("deduplicates repeated named injected providers by stable connector id", () => {
    const connectors = buildAvailableWalletConnectors([
      mockConnector({
        id: "io.rabby",
        name: "Rabby Wallet",
        type: "injected",
        uid: "rabby-a",
      }),
      mockConnector({
        id: "io.rabby",
        name: "Rabby Wallet",
        type: "injected",
        uid: "rabby-b",
      }),
    ]);

    expect(connectors.map((connector) => connector.uid)).toEqual(["rabby-a"]);
  });
});
