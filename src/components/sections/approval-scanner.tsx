"use client";

import { useAccount, useChainId } from "wagmi";

import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { pulsechain } from "@/lib/chains";
import { shortenAddress } from "@/lib/format";

/**
 * Approval scanner — foundation only.
 *
 * Real allowance discovery, spender resolution, and revoke transactions will
 * land in the next milestone. This component renders deliberate placeholder
 * states so the shell can ship, be deployed, and wallet-connect end to end.
 */
export function ApprovalScanner() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const onPulseChain = chainId === pulsechain.id;

  return (
    <section
      id="scanner"
      className="relative border-t border-pulse-border/60 bg-gradient-to-b from-pulse-bg to-pulse-panel/40 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Approval <span className="text-gradient-pulse">scanner</span>
            </h2>
            <p className="mt-3 text-pulse-muted">
              Connect a wallet on PulseChain to review ERC-20 allowances that
              you have granted to spender contracts.
            </p>
          </div>
          <div className="hidden sm:block">
            <ConnectWalletButton variant="ghost" />
          </div>
        </div>

        <div className="relative mt-10 overflow-hidden rounded-3xl border border-pulse-border bg-pulse-panel/70 p-6 sm:p-10">
          <ScannerBody
            isConnected={isConnected}
            onPulseChain={onPulseChain}
            address={address}
          />
        </div>
      </div>
    </section>
  );
}

function ScannerBody({
  isConnected,
  onPulseChain,
  address,
}: {
  isConnected: boolean;
  onPulseChain: boolean;
  address: `0x${string}` | undefined;
}) {
  if (!isConnected) {
    return (
      <ScannerState
        eyebrow="Step 1"
        title="Connect a wallet to scan approvals"
        body="We never store your address. Connection is used only to query on-chain allowances from your wallet."
        action={<ConnectWalletButton />}
      />
    );
  }

  if (!onPulseChain) {
    return (
      <ScannerState
        tone="warning"
        eyebrow="Wrong network"
        title="Switch to PulseChain"
        body="Pulse Revoke supports PulseChain mainnet (chainId 369). Switch networks to continue."
        action={<ConnectWalletButton variant="ghost" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-pulse-border bg-pulse-bg/60 px-3 py-1 text-xs font-medium text-pulse-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" aria-hidden />
          Connected
        </span>
        <span className="font-mono text-xs text-pulse-muted">
          {address ? shortenAddress(address) : ""}
        </span>
      </div>

      <PlaceholderTable />

      <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-5 text-sm text-pulse-muted">
        <p className="font-medium text-pulse-text">
          Approval results coming in the next step.
        </p>
        <p className="mt-1">
          The discovery pipeline (token registry, allowance reads, spender
          labels, and revoke transactions) will ship in the next milestone.
        </p>
      </div>
    </div>
  );
}

function ScannerState({
  eyebrow,
  title,
  body,
  action,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const eyebrowClass =
    tone === "warning"
      ? "text-pulse-red"
      : "text-pulse-muted";

  return (
    <div className="flex flex-col items-start gap-5 text-left">
      <span
        className={`text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}
      >
        {eyebrow}
      </span>
      <h3 className="max-w-xl text-2xl font-semibold text-pulse-text sm:text-3xl">
        {title}
      </h3>
      <p className="max-w-xl text-pulse-muted">{body}</p>
      <div>{action}</div>
    </div>
  );
}

function PlaceholderTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-pulse-border">
      <div className="grid grid-cols-12 gap-2 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted">
        <div className="col-span-4">Token</div>
        <div className="col-span-5">Spender</div>
        <div className="col-span-3 text-right">Allowance</div>
      </div>
      <ul>
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="grid grid-cols-12 items-center gap-2 border-b border-pulse-border/70 px-4 py-4 last:border-b-0"
          >
            <div className="col-span-4 flex items-center gap-3">
              <div className="h-8 w-8 animate-pulse rounded-full bg-pulse-panel2" />
              <div className="h-3 w-24 animate-pulse rounded bg-pulse-panel2" />
            </div>
            <div className="col-span-5">
              <div className="h-3 w-40 animate-pulse rounded bg-pulse-panel2" />
            </div>
            <div className="col-span-3 flex justify-end">
              <div className="h-3 w-20 animate-pulse rounded bg-pulse-panel2" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
