"use client";

import { useEffect, useMemo } from "react";
import type { Address } from "viem";

import { useOptimismApprovalScan } from "@/hooks/use-optimism-approval-scan";
import type { Approval } from "@/lib/approvals";
import { shortenAddress } from "@/lib/format";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  OPTIMISM_BATCH_REVOKE_UNAVAILABLE_COPY,
  OPTIMISM_CLIENT_CHAIN_ID,
  OPTIMISM_EXPLORER_NAME,
  OPTIMISM_REVOKE_UNAVAILABLE_COPY,
  OPTIMISM_STATUS_LABEL,
  optimismExplorerAddressUrl,
  optimismExplorerTokenUrl,
  type OptimismApprovalClientMapping,
} from "@/lib/optimism-approval-client";

export function OptimismReadOnlyScanner({
  owner,
  connectedAddress,
  walletChainId,
  wagmiChainId,
  debugMode,
  onScanSettled,
}: {
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  debugMode: boolean;
  onScanSettled?: () => void;
}) {
  const scan = useOptimismApprovalScan({ owner });
  const erc20Approvals = useMemo(
    () => sortErc20(scan.mapped?.approvals.erc20 ?? []),
    [scan.mapped?.approvals.erc20],
  );
  const nftApprovals = useMemo(
    () => sortNft(scan.mapped?.approvals.nft ?? []),
    [scan.mapped?.approvals.nft],
  );
  const activeCount = erc20Approvals.length + nftApprovals.length;

  useEffect(() => {
    if (scan.status === "success" || scan.status === "error") {
      onScanSettled?.();
    }
  }, [onScanSettled, scan.status]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              {OPTIMISM_STATUS_LABEL}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-pulse-text">
              Optimism approval scan
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pulse-muted">
              Revoke is not enabled for Optimism yet. Revoke.PLS is first
              validating approval discovery and live verification on OP
              Mainnet.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-pulse-cyan">
              Read-only scan
            </span>
            <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-pulse-muted">
              Row revoke disabled
            </span>
            <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-pulse-muted">
              Batch revoke disabled
            </span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-pulse-muted">
            {shortenAddress(owner)}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-pulse-muted">
            Chain ID {OPTIMISM_CLIENT_CHAIN_ID}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-pulse-muted">
            Explorer: {OPTIMISM_EXPLORER_NAME}
          </span>
        </div>
      </section>

      <OptimismStatusPanel
        mapping={scan.mapped}
        status={scan.status}
        activeCount={activeCount}
        isFetching={scan.isFetching}
        onRescan={scan.refetch}
      />

      {activeCount > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/65">
          <div className="border-b border-pulse-border/70 px-4 py-3">
            <p className="text-sm font-semibold text-pulse-text">
              Live-verified Optimism approvals
            </p>
            <p className="mt-1 text-xs leading-5 text-pulse-muted">
              These rows passed live reads on OP Mainnet. Revoke remains
              disabled for Optimism while this scan lane is validated.
            </p>
          </div>
          {erc20Approvals.length > 0 ? (
            <div className="border-b border-pulse-border/70">
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
                ERC-20 allowances
              </div>
              <ul className="divide-y divide-pulse-border/70">
                {erc20Approvals.map((approval) => (
                  <OptimismErc20Row key={approval.key} approval={approval} />
                ))}
              </ul>
            </div>
          ) : null}
          {nftApprovals.length > 0 ? (
            <div>
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
                NFT approvals
              </div>
              <ul className="divide-y divide-pulse-border/70">
                {nftApprovals.map((approval) => (
                  <OptimismNftRow key={approval.key} approval={approval} />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-xs text-pulse-muted">
        Optimism discovery uses the server read-only API, Etherscan API V2
        logs with <span className="font-mono">chainid=10</span>, and live RPC
        reads before showing active approvals. Incomplete discovery is never
        shown as a clear result.
      </p>

      <OptimismDiagnostics
        enabled={debugMode}
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        mapping={scan.mapped}
        response={scan.response}
      />
    </div>
  );
}

function OptimismStatusPanel({
  mapping,
  status,
  activeCount,
  isFetching,
  onRescan,
}: {
  mapping: OptimismApprovalClientMapping | null;
  status: ReturnType<typeof useOptimismApprovalScan>["status"];
  activeCount: number;
  isFetching: boolean;
  onRescan: () => void;
}) {
  let title = "Scanning Optimism approvals";
  let body =
    "Reading Optimism approval history and checking current allowance or NFT approval state before showing rows.";
  let tone: "neutral" | "success" | "warning" = "neutral";

  if (mapping?.state === "config-missing") {
    title = "Optimism approval API not configured";
    body =
      "The Optimism read-only API needs server-side RPC and Etherscan API V2 settings before it can verify approvals. This is not a clear result.";
    tone = "warning";
  } else if (mapping?.state === "upstream-failure") {
    title = "Optimism discovery unavailable";
    body =
      "The explorer or Optimism RPC failed during read-only discovery. This is not a clear result.";
    tone = "warning";
  } else if (mapping?.state === "verification-incomplete") {
    title = "Optimism verification incomplete";
    body =
      mapping.incompleteReason ??
      "Optimism live validation or explorer discovery was incomplete. This is not a clear result.";
    tone = "warning";
  } else if (mapping?.state === "complete-clear") {
    title = "No active Optimism approvals found";
    body =
      "Discovery and live verification completed without finding active Optimism approvals for this scan target.";
    tone = "success";
  } else if (mapping?.state === "active") {
    title = `${activeCount} active Optimism approval${activeCount === 1 ? "" : "s"} found`;
    body =
      "Rows shown below passed live reads. Revoke remains disabled for Optimism in this phase.";
    tone = "success";
  }

  const classes =
    tone === "success"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : tone === "warning"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
        : "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan";

  return (
    <section className={`rounded-2xl border p-4 text-sm ${classes}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-pulse-text">{title}</p>
          <p className="mt-1 leading-6 text-pulse-muted">{body}</p>
          <p className="mt-2 text-xs font-semibold text-pulse-muted">
            {OPTIMISM_REVOKE_UNAVAILABLE_COPY}{" "}
            {OPTIMISM_BATCH_REVOKE_UNAVAILABLE_COPY}
          </p>
        </div>
        <button
          type="button"
          onClick={onRescan}
          disabled={isFetching || status === "pending"}
          className="inline-flex items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetching || status === "pending" ? "Scanning..." : "Rescan"}
        </button>
      </div>
    </section>
  );
}

function OptimismErc20Row({ approval }: { approval: Approval }) {
  return (
    <li className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1.2fr_0.9fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-pulse-text">
          {approval.tokenSymbol}
        </p>
        <p className="truncate text-xs text-pulse-muted">
          {approval.tokenName ?? "Unnamed token"}
        </p>
        <ExplorerLink
          href={optimismExplorerTokenUrl(approval.tokenAddress)}
          label={approval.tokenAddress}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.spenderLabel}
        </p>
        <ExplorerLink
          href={optimismExplorerAddressUrl(approval.spenderAddress)}
          label={approval.spenderAddress}
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
          Allowance
        </p>
        <p className="mt-1 text-sm text-pulse-text">
          {approval.formattedAllowance}
        </p>
      </div>
      <UnavailableRowPill reason={OPTIMISM_REVOKE_UNAVAILABLE_COPY} />
    </li>
  );
}

function OptimismNftRow({ approval }: { approval: NftApproval }) {
  const tokenLabel =
    approval.kind === "tokenApproval" && approval.tokenId !== undefined
      ? `#${approval.tokenId.toString()}`
      : "Collection-wide";

  return (
    <li className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1.2fr_0.9fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-pulse-text">
          {approval.collectionName ?? "Unnamed collection"}
        </p>
        <ExplorerLink
          href={optimismExplorerAddressUrl(approval.collectionAddress)}
          label={approval.collectionAddress}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.operatorLabel}
        </p>
        <ExplorerLink
          href={optimismExplorerAddressUrl(approval.operatorAddress)}
          label={approval.operatorAddress}
        />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
          Permission
        </p>
        <p className="mt-1 text-sm text-pulse-text">{tokenLabel}</p>
        <p className="text-xs text-pulse-muted">
          {approval.standard.toUpperCase()}
        </p>
      </div>
      <UnavailableRowPill reason="Optimism NFT revoke is not enabled yet." />
    </li>
  );
}

function OptimismDiagnostics({
  enabled,
  owner,
  connectedAddress,
  walletChainId,
  wagmiChainId,
  mapping,
  response,
}: {
  enabled: boolean;
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  mapping: OptimismApprovalClientMapping | null;
  response: ReturnType<typeof useOptimismApprovalScan>["response"];
}) {
  if (!enabled) return null;

  const diagnostics = response?.diagnostics;
  const rows: [string, string][] = [
    ["API route", "/api/optimism/approvals"],
    ["Scan target", owner],
    ["Connected wallet", connectedAddress ?? "Not connected"],
    ["Wallet chain ID", walletChainId?.toString() ?? "Unknown"],
    ["Wagmi chain ID", wagmiChainId?.toString() ?? "Unknown"],
    ["API status", response?.status ?? "No response"],
    ["Mapping state", mapping?.state ?? "No mapping"],
    ["Chain ID", response?.chainId?.toString() ?? "10"],
    ["RPC configured", diagnostics?.rpcConfigured ? "Yes" : "No"],
    ["Explorer/API configured", diagnostics?.explorerConfigured ? "Yes" : "No"],
    ["Raw approval logs", diagnostics?.rawApprovalLogCount?.toString() ?? "0"],
    [
      "Decoded ERC-20 approvals",
      diagnostics?.decodedErc20ApprovalCount?.toString() ?? "0",
    ],
    [
      "Decoded NFT approvals",
      diagnostics?.decodedNftApprovalCount?.toString() ?? "0",
    ],
    ["Live read successes", diagnostics?.liveReadSuccessCount?.toString() ?? "0"],
    ["Live read failures", diagnostics?.liveReadFailureCount?.toString() ?? "0"],
    [
      "Incomplete checks",
      diagnostics?.incompleteVerificationCount?.toString() ?? "0",
    ],
    ["ERC-20 row revoke", "Disabled"],
    ["NFT row revoke", "Disabled"],
    ["Batch revoke", "Disabled"],
  ];

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4 text-xs">
      <p className="font-semibold uppercase tracking-[0.16em] text-pulse-text">
        Optimism API diagnostics
      </p>
      <dl className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/50 p-3"
          >
            <dt className="text-pulse-muted">{label}</dt>
            <dd className="mt-1 break-all font-mono text-pulse-text">{value}</dd>
          </div>
        ))}
      </dl>
      {response?.errors.length ? (
        <p className="mt-3 text-amber-200">
          Errors: {response.errors.join("; ")}
        </p>
      ) : null}
      {mapping?.warnings.length ? (
        <p className="mt-3 text-amber-200">
          Warnings: {mapping.warnings.join("; ")}
        </p>
      ) : null}
    </section>
  );
}

function ExplorerLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-1 block truncate font-mono text-xs text-pulse-cyan hover:text-pulse-green"
    >
      {shortenAddress(label)}
    </a>
  );
}

function UnavailableRowPill({ reason }: { reason: string }) {
  return (
    <span
      title={reason}
      className="inline-flex max-w-full items-center justify-center rounded-full border border-pulse-border bg-pulse-bg/65 px-3 py-1 text-center text-xs font-semibold leading-5 text-pulse-muted md:min-w-[9rem] md:justify-self-end"
    >
      Revoke disabled
    </span>
  );
}

function sortErc20(approvals: readonly Approval[]): Approval[] {
  return [...approvals].sort((a, b) => {
    const token = a.tokenSymbol.localeCompare(b.tokenSymbol);
    if (token !== 0) return token;
    return a.spenderLabel.localeCompare(b.spenderLabel);
  });
}

function sortNft(approvals: readonly NftApproval[]): NftApproval[] {
  return [...approvals].sort((a, b) => {
    const collection = (a.collectionName ?? a.collectionAddress).localeCompare(
      b.collectionName ?? b.collectionAddress,
    );
    if (collection !== 0) return collection;
    return a.operatorLabel.localeCompare(b.operatorLabel);
  });
}
