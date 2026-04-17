"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";

import { pulsechain } from "@/lib/chains";
import { shortenAddress } from "@/lib/format";

type Variant = "primary" | "ghost";

interface ConnectWalletButtonProps {
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-pulse-gradient text-white shadow-glow hover:brightness-110 active:brightness-95",
  ghost:
    "bg-white/5 text-pulse-text border border-pulse-border hover:bg-white/10",
};

export function ConnectWalletButton({
  variant = "primary",
  className = "",
}: ConnectWalletButtonProps) {
  const { address, isConnected, status } = useAccount();
  const { connect, connectors, isPending: isConnecting, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const chainId = useChainId();

  const injectedConnector = useMemo(
    () => connectors.find((c) => c.type === "injected") ?? connectors[0],
    [connectors],
  );

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

  if (status === "reconnecting" || status === "connecting") {
    return (
      <button
        type="button"
        disabled
        className={`${base} ${variantStyles[variant]} ${className}`}
      >
        Connecting…
      </button>
    );
  }

  if (isConnected && address) {
    const onWrongChain = chainId !== pulsechain.id;

    if (onWrongChain) {
      return (
        <button
          type="button"
          onClick={() => switchChain({ chainId: pulsechain.id })}
          disabled={isSwitching}
          className={`${base} bg-pulse-red/20 text-pulse-red border border-pulse-red/40 hover:bg-pulse-red/30 ${className}`}
        >
          {isSwitching ? "Switching…" : "Switch to PulseChain"}
        </button>
      );
    }

    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-pulse-panel/70 px-3 py-2 text-xs font-medium text-pulse-muted">
          <span className="h-2 w-2 rounded-full bg-pulse-green" aria-hidden />
          PulseChain
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

  const canConnect = Boolean(injectedConnector);

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        disabled={!canConnect || isConnecting}
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        className={`${base} ${variantStyles[variant]}`}
      >
        {isConnecting ? "Confirm in wallet…" : "Connect Wallet"}
      </button>
      {error ? (
        <span className="text-xs text-pulse-red">{error.message}</span>
      ) : !canConnect ? (
        <span className="text-xs text-pulse-muted">
          No injected wallet detected
        </span>
      ) : null}
    </div>
  );
}
