"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";

import { shortenAddress } from "@/lib/format";
import { isDesktopBuild } from "@/lib/platform";
import { trackEvent } from "@/lib/telemetry";
import { resolveHeaderNetworkStatus } from "@/lib/wallet-network-status";

type Variant = "primary" | "ghost";

interface ConnectWalletButtonProps {
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-pulse-gradient text-pulse-on-gradient shadow-glow hover:brightness-110 active:brightness-95",
  ghost:
    "bg-pulse-text/5 text-pulse-text border border-pulse-border hover:bg-pulse-text/10",
};

/**
 * Connector types we surface in the connect menu. Everything else wagmi might
 * register (mock, etc.) is filtered out. Ordering here matches display order.
 */
const SUPPORTED_CONNECTOR_TYPES = ["injected", "walletConnect"] as const;

function describeConnector(c: Connector): { label: string; sub: string } {
  if (c.type === "walletConnect") {
    return {
      label: "WalletConnect",
      sub: isDesktopBuild
        ? "Scan a QR code with a mobile or hardware wallet (recommended)"
        : "Scan a QR code with a mobile wallet",
    };
  }
  if (c.type === "injected") {
    return {
      label: "Browser wallet",
      sub: isDesktopBuild
        ? "Browser extensions run only in the web app — use the web version for MetaMask, Rabby, etc."
        : "MetaMask, Rabby, Brave, and similar",
    };
  }
  return { label: c.name, sub: c.type };
}

export function ConnectWalletButton({
  variant = "primary",
  className = "",
}: ConnectWalletButtonProps) {
  const { address, chainId: walletChainId, isConnected, status } = useAccount();
  const wagmiChainId = useChainId();
  const { connect, connectors, isPending: isConnecting, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Deduplicate connectors by type. wagmi auto-registers EIP-6963 providers
  // alongside our explicit `injected()` connector — each with `type: "injected"`
  // — which would otherwise render as multiple identical "Browser wallet" rows.
  // We keep the first entry per type, preserving the order declared in
  // SUPPORTED_CONNECTOR_TYPES so injected appears before WalletConnect.
  const availableConnectors = useMemo(() => {
    const seen = new Set<string>();
    const out: Connector[] = [];
    for (const t of SUPPORTED_CONNECTOR_TYPES) {
      for (const c of connectors) {
        if (c.type !== t) continue;
        if (seen.has(c.type)) continue;
        seen.add(c.type);
        out.push(c);
      }
    }
    return out;
  }, [connectors]);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Dismiss the menu once a connection lands, and clear the per-row pending
  // marker once wagmi is no longer pending.
  useEffect(() => {
    if (isConnected) setMenuOpen(false);
  }, [isConnected]);
  useEffect(() => {
    if (!isConnecting) setPendingId(null);
  }, [isConnecting]);

  const base =
    "inline-flex max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2.5 sm:text-sm";
  const connectedControls =
    "inline-flex max-w-full flex-wrap items-center gap-2";

  if (status === "reconnecting" || status === "connecting") {
    return (
      <button
        type="button"
        disabled
        className={`${base} ${variantStyles[variant]} ${className}`}
      >
        Connecting...
      </button>
    );
  }

  if (isConnected && address) {
    const networkStatus = resolveHeaderNetworkStatus({
      walletChainId,
      wagmiChainId,
    });

    if (networkStatus.kind === "ethereum") {
      return (
        <div className={`${connectedControls} ${className}`}>
          <span className="inline-flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden />
            {networkStatus.label}
          </span>
          <button
            type="button"
            onClick={() => disconnect()}
            className={`${base} ${variantStyles.ghost}`}
          >
            <span className="font-mono text-xs text-pulse-text">
              {shortenAddress(address)}
            </span>
            <span className="text-xs text-pulse-muted">Disconnect</span>
          </button>
        </div>
      );
    }

    if (networkStatus.kind === "arbitrum" || networkStatus.kind === "optimism") {
      return (
        <div className={`${connectedControls} ${className}`}>
          <span
            title={networkStatus.helper}
            className="inline-flex items-center gap-2 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-medium text-pulse-cyan"
          >
            <span className="h-2 w-2 rounded-full bg-pulse-cyan" aria-hidden />
            {networkStatus.label}
          </span>
          <span
            title={networkStatus.helper}
            className="hidden max-w-[12rem] text-[11px] leading-4 text-pulse-muted xl:inline"
          >
            {networkStatus.shortHelper}
          </span>
          <button
            type="button"
            onClick={() => disconnect()}
            className={`${base} ${variantStyles.ghost}`}
          >
            <span className="font-mono text-xs text-pulse-text">
              {shortenAddress(address)}
            </span>
            <span className="text-xs text-pulse-muted">Disconnect</span>
          </button>
        </div>
      );
    }

    if (networkStatus.kind === "unsupported") {
      return (
        <div className={`${connectedControls} ${className}`}>
          <span className="text-xs font-semibold text-pulse-red">
            Unsupported network
          </span>
          {networkStatus.switchChains.map((c) => (
            <button
              key={c.chainId}
              type="button"
              onClick={() => switchChain({ chainId: c.chainId })}
              disabled={isSwitching}
              className={`${base} bg-pulse-red/20 text-pulse-red border border-pulse-red/40 hover:bg-pulse-red/30`}
            >
              {isSwitching ? "Switching..." : `Switch to ${c.displayName}`}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className={`${connectedControls} ${className}`}>
        <span className="inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-pulse-panel/70 px-3 py-2 text-xs font-medium text-pulse-muted">
          <span className="h-2 w-2 rounded-full bg-pulse-green" aria-hidden />
          {networkStatus.label}
        </span>
        <button
          type="button"
          onClick={() => disconnect()}
          className={`${base} ${variantStyles.ghost}`}
        >
          <span className="font-mono text-xs text-pulse-text">
            {shortenAddress(address)}
          </span>
          <span className="text-xs text-pulse-muted">Disconnect</span>
        </button>
      </div>
    );
  }

  if (availableConnectors.length === 0) {
    return (
      <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
        <button
          type="button"
          disabled
          className={`${base} ${variantStyles[variant]}`}
        >
          <span className="sm:hidden">Connect</span>
          <span className="hidden sm:inline">Connect Wallet</span>
        </button>
        <span className="text-xs text-pulse-muted">
          {isDesktopBuild
            ? "Configure a WalletConnect project ID to enable pairing"
            : "Install a browser wallet to continue"}
        </span>
      </div>
    );
  }

  // Single-connector fallback: preserve the original one-click UX.
  if (availableConnectors.length === 1) {
    const only = availableConnectors[0];
    return (
      <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
        <button
          type="button"
          disabled={isConnecting}
          onClick={() => {
            setPendingId(only.uid);
            trackEvent("connector_selected", { type: only.type });
            connect({ connector: only });
          }}
          className={`${base} ${variantStyles[variant]}`}
        >
          {isConnecting ? (
            <>
              <span className="sm:hidden">Confirm...</span>
              <span className="hidden sm:inline">Confirm in wallet...</span>
            </>
          ) : (
            <>
              <span className="sm:hidden">Connect</span>
              <span className="hidden sm:inline">Connect Wallet</span>
            </>
          )}
        </button>
        {error ? (
          <span className="max-w-xs truncate text-xs text-pulse-red">
            {error.message}
          </span>
        ) : null}
      </div>
    );
  }

  // Multi-connector menu.
  return (
    <div ref={wrapperRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        disabled={isConnecting}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className={`${base} ${variantStyles[variant]}`}
      >
        {isConnecting ? (
          <>
            <span className="sm:hidden">Confirm...</span>
            <span className="hidden sm:inline">Confirm in wallet...</span>
          </>
        ) : (
          <>
            <span className="sm:hidden">Connect</span>
            <span className="hidden sm:inline">Connect Wallet</span>
          </>
        )}
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label="Choose a wallet connection method"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/95 p-1 shadow-xl backdrop-blur"
        >
          {availableConnectors.map((c) => {
            const d = describeConnector(c);
            const isThisPending = isConnecting && pendingId === c.uid;
            return (
              <button
                key={c.uid}
                role="menuitem"
                type="button"
                disabled={isConnecting}
                onClick={() => {
                  setPendingId(c.uid);
                  trackEvent("connector_selected", { type: c.type });
                  connect({ connector: c });
                }}
                className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-pulse-text transition hover:bg-pulse-text/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex flex-col">
                  <span className="font-semibold">{d.label}</span>
                  <span className="text-xs text-pulse-muted">{d.sub}</span>
                </span>
                <span className="text-xs text-pulse-muted">
                  {isThisPending ? "..." : ""}
                </span>
              </button>
            );
          })}
          {error ? (
            <p className="mt-1 rounded-xl bg-pulse-red/10 px-3 py-2 text-xs text-pulse-red">
              {error.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
