import type { Connector } from "wagmi";

export const DEFAULT_VISIBLE_INJECTED_WALLET_LIMIT = 5;

const GENERIC_INJECTED_IDS = new Set(["injected"]);
const GENERIC_INJECTED_NAMES = new Set(["injected", "browser wallet"]);

export interface WalletMenuConnectorGroups {
  visibleInjected: Connector[];
  hiddenInjectedCount: number;
  walletConnect: Connector[];
}

export function isGenericInjectedConnector(c: Connector): boolean {
  return (
    c.type === "injected" &&
    (GENERIC_INJECTED_IDS.has(c.id.toLowerCase()) ||
      GENERIC_INJECTED_NAMES.has(c.name.toLowerCase()))
  );
}

function connectorKey(c: Connector): string {
  return c.type === "injected" && !isGenericInjectedConnector(c)
    ? `${c.type}:${c.id.toLowerCase()}`
    : c.type;
}

export function buildAvailableWalletConnectors(
  connectors: readonly Connector[],
): Connector[] {
  const namedInjected: Connector[] = [];
  let genericInjected: Connector | null = null;
  const seenInjected = new Set<string>();

  for (const c of connectors) {
    if (c.type !== "injected") continue;

    if (isGenericInjectedConnector(c)) {
      genericInjected ??= c;
      continue;
    }

    const key = connectorKey(c);
    if (seenInjected.has(key)) continue;
    seenInjected.add(key);
    namedInjected.push(c);
  }

  const out: Connector[] =
    namedInjected.length > 0
      ? namedInjected
      : genericInjected
        ? [genericInjected]
        : [];

  const seenWalletConnect = new Set<string>();
  for (const c of connectors) {
    if (c.type !== "walletConnect") continue;
    const key = connectorKey(c);
    if (seenWalletConnect.has(key)) continue;
    seenWalletConnect.add(key);
    out.push(c);
  }

  return out;
}

export function groupWalletMenuConnectors(
  connectors: readonly Connector[],
  {
    showMoreInjected = false,
    visibleInjectedLimit = DEFAULT_VISIBLE_INJECTED_WALLET_LIMIT,
  }: {
    showMoreInjected?: boolean;
    visibleInjectedLimit?: number;
  } = {},
): WalletMenuConnectorGroups {
  const injected = connectors.filter((c) => c.type === "injected");
  const walletConnect = connectors.filter((c) => c.type === "walletConnect");
  const visibleInjected =
    showMoreInjected || injected.length <= visibleInjectedLimit
      ? injected
      : injected.slice(0, visibleInjectedLimit);

  return {
    visibleInjected,
    hiddenInjectedCount: injected.length - visibleInjected.length,
    walletConnect,
  };
}
