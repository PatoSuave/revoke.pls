import { describe, expect, it } from "vitest";
import type { Connector } from "wagmi";

import {
  buildAvailableWalletConnectors,
  groupWalletMenuConnectors,
} from "@/lib/wallet-connectors";

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

  it("caps visible injected wallets while keeping WalletConnect separate", () => {
    const connectors = buildAvailableWalletConnectors([
      mockConnector({ id: "wallet.a", name: "Wallet A", type: "injected" }),
      mockConnector({ id: "wallet.b", name: "Wallet B", type: "injected" }),
      mockConnector({ id: "wallet.c", name: "Wallet C", type: "injected" }),
      mockConnector({ id: "wallet.d", name: "Wallet D", type: "injected" }),
      mockConnector({ id: "wallet.e", name: "Wallet E", type: "injected" }),
      mockConnector({ id: "wallet.f", name: "Wallet F", type: "injected" }),
      mockConnector({
        id: "walletConnect",
        name: "WalletConnect",
        type: "walletConnect",
      }),
    ]);

    const grouped = groupWalletMenuConnectors(connectors);

    expect(grouped.visibleInjected.map((connector) => connector.name)).toEqual([
      "Wallet A",
      "Wallet B",
      "Wallet C",
      "Wallet D",
      "Wallet E",
    ]);
    expect(grouped.hiddenInjectedCount).toBe(1);
    expect(grouped.walletConnect.map((connector) => connector.name)).toEqual([
      "WalletConnect",
    ]);
  });

  it("shows all injected wallets after the more-wallets expander is opened", () => {
    const connectors = buildAvailableWalletConnectors([
      mockConnector({ id: "wallet.a", name: "Wallet A", type: "injected" }),
      mockConnector({ id: "wallet.b", name: "Wallet B", type: "injected" }),
      mockConnector({ id: "wallet.c", name: "Wallet C", type: "injected" }),
      mockConnector({ id: "wallet.d", name: "Wallet D", type: "injected" }),
      mockConnector({ id: "wallet.e", name: "Wallet E", type: "injected" }),
      mockConnector({ id: "wallet.f", name: "Wallet F", type: "injected" }),
    ]);

    const grouped = groupWalletMenuConnectors(connectors, {
      showMoreInjected: true,
    });

    expect(grouped.visibleInjected.map((connector) => connector.name)).toEqual([
      "Wallet A",
      "Wallet B",
      "Wallet C",
      "Wallet D",
      "Wallet E",
      "Wallet F",
    ]);
    expect(grouped.hiddenInjectedCount).toBe(0);
  });
});
