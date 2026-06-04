"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Address } from "viem";

import {
  RevokeReceipt,
  type RevokeReceiptDetails,
} from "@/components/approvals/revoke-receipt";
import { AccountCodeDelegationCard } from "@/components/sections/account-code-delegation-card";
import { TokenAvatar } from "@/components/tokens/token-avatar";
import { useHyperEVMApprovalScan } from "@/hooks/use-hyperevm-approval-scan";
import { useTokenLogos } from "@/hooks/use-token-logos";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import type { RevokeStatus } from "@/hooks/use-revoke-approval";
import { useRevokeNftApproval } from "@/hooks/use-revoke-nft-approval";
import type { Approval } from "@/lib/approvals";
import { shortenAddress } from "@/lib/format";
import { HYPEREVM_SYSTEM_CONTRACTS } from "@/lib/hyperevm-system-contracts";
import type { NftApproval } from "@/lib/nft-approvals";
import type { Erc20PreflightResult, NftPreflightResult } from "@/lib/preflight";
import { WALLET_PROMPT_SAFETY_COPY } from "@/lib/revoke-gas";
import {
  HYPEREVM_BATCH_REVOKE_UNAVAILABLE_COPY,
  HYPEREVM_CLIENT_CHAIN_ID,
  HYPEREVM_DISPLAY_NAME,
  HYPEREVM_EXPLORER_NAME,
  HYPEREVM_NATIVE_SYMBOL,
  HYPEREVM_REVOKE_UNAVAILABLE_COPY,
  HYPEREVM_STATUS_LABEL,
  canEnableHyperEVMErc20RowRevoke,
  canEnableHyperEVMNftRowRevoke,
  hyperevmErc20RowRevokeDisabledReasonForWallet,
  hyperevmNftRowRevokeDisabledReasonForWallet,
  hyperevmExplorerAddressUrl,
  hyperevmExplorerTokenUrl,
  type HyperEVMApprovalClientMapping,
} from "@/lib/hyperevm-approval-client";
import { tokenLogoAddressKey } from "@/lib/token-logos";

export function HyperEVMReadOnlyScanner({
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
  const scan = useHyperEVMApprovalScan({ owner });
  const erc20Approvals = useMemo(
    () => sortErc20(scan.mapped?.approvals.erc20 ?? []),
    [scan.mapped?.approvals.erc20],
  );
  const tokenLogoAddresses = useMemo(
    () => erc20Approvals.map((approval) => approval.tokenAddress),
    [erc20Approvals],
  );
  const tokenLogos = useTokenLogos({
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    tokenAddresses: tokenLogoAddresses,
  });
  const nftApprovals = useMemo(
    () => sortNft(scan.mapped?.approvals.nft ?? []),
    [scan.mapped?.approvals.nft],
  );
  const activeCount = erc20Approvals.length + nftApprovals.length;
  const erc20RowRevokeEnabled = canEnableHyperEVMErc20RowRevoke({
    mapping: scan.mapped,
    walletChainId,
    ownerAddress: owner,
    connectedAddress,
  });
  const erc20RowRevokeDisabledReason =
    hyperevmErc20RowRevokeDisabledReasonForWallet({
      mapping: scan.mapped,
      walletChainId,
      ownerAddress: owner,
      connectedAddress,
    });
  const nftRowRevokeEnabled = canEnableHyperEVMNftRowRevoke({
    mapping: scan.mapped,
    walletChainId,
    ownerAddress: owner,
    connectedAddress,
  });
  const nftRowRevokeDisabledReason =
    hyperevmNftRowRevokeDisabledReasonForWallet({
      mapping: scan.mapped,
      walletChainId,
      ownerAddress: owner,
      connectedAddress,
    });

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
              {HYPEREVM_STATUS_LABEL}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-pulse-text">
              HyperEVM approval scan
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pulse-muted">
              Verified ERC-20 and NFT rows can be revoked when your connected
              wallet matches the scanned address and your wallet is on
              HyperEVM. Batch revoke is not enabled for HyperEVM.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-pulse-cyan">
              ERC-20 row revoke
            </span>
            <span className="rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-pulse-cyan">
              NFT row revoke
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
            Chain ID {HYPEREVM_CLIENT_CHAIN_ID}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-pulse-muted">
            Explorer: {HYPEREVM_EXPLORER_NAME}
          </span>
        </div>
      </section>

      <HyperEVMStatusPanel
        mapping={scan.mapped}
        status={scan.status}
        activeCount={activeCount}
        isFetching={scan.isFetching}
        onRescan={scan.refetch}
      />

      <AccountCodeDelegationCard
        owner={owner}
        chainId={HYPEREVM_CLIENT_CHAIN_ID}
        chainName={HYPEREVM_DISPLAY_NAME}
      />

      <HyperEVMSystemContextNotice />

      {activeCount > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/65">
          <div className="border-b border-pulse-border/70 px-4 py-3">
            <p className="text-sm font-semibold text-pulse-text">
              Live-verified HyperEVM approvals
            </p>
            <p className="mt-1 text-xs leading-5 text-pulse-muted">
              These rows passed live reads on HyperEVM. ERC-20 and NFT rows
              can show row-level revoke only after matching-wallet and HyperEVM
              checks pass; batch revoke remains disabled for HyperEVM.
            </p>
          </div>
          {erc20Approvals.length > 0 ? (
            <div className="border-b border-pulse-border/70">
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
                ERC-20 allowances
              </div>
              <ul className="divide-y divide-pulse-border/70">
                {erc20Approvals.map((approval) => (
                  <HyperEVMErc20Row
                    key={approval.key}
                    approval={approval}
                    tokenLogoUrl={
                      tokenLogos.logos[tokenLogoAddressKey(approval.tokenAddress)]
                        ?.imageUrl
                    }
                    owner={owner}
                    rowRevokeEnabled={erc20RowRevokeEnabled}
                    rowRevokeDisabledReason={erc20RowRevokeDisabledReason}
                    onRevoked={scan.refetch}
                    debugMode={debugMode}
                  />
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
                  <HyperEVMNftRow
                    key={approval.key}
                    approval={approval}
                    owner={owner}
                    rowRevokeEnabled={nftRowRevokeEnabled}
                    rowRevokeDisabledReason={nftRowRevokeDisabledReason}
                    onRevoked={scan.refetch}
                    debugMode={debugMode}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="text-xs text-pulse-muted">
        HyperEVM discovery uses the server read-only API, Etherscan API V2
        logs with <span className="font-mono">chainid=999</span>, and live RPC
        reads before showing active approvals. Incomplete discovery is never
        shown as a clear result.
      </p>

      <HyperEVMDiagnostics
        enabled={debugMode}
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        mapping={scan.mapped}
        response={scan.response}
        erc20RowRevokeEnabled={erc20RowRevokeEnabled}
        erc20RowRevokeDisabledReason={erc20RowRevokeDisabledReason}
        nftRowRevokeEnabled={nftRowRevokeEnabled}
        nftRowRevokeDisabledReason={nftRowRevokeDisabledReason}
      />
    </div>
  );
}

function HyperEVMSystemContextNotice() {
  return (
    <section className="rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
        HyperEVM system context
      </p>
      <p className="mt-2 max-w-3xl leading-6 text-pulse-muted">
        HyperEVM has HyperCore actions that may not appear as standard ERC-20
        or NFT approvals. Review CoreWriter interactions separately.
      </p>
      <dl className="mt-3 grid gap-2 text-xs text-pulse-muted md:grid-cols-3">
        {Object.values(HYPEREVM_SYSTEM_CONTRACTS).map((contract) => (
          <div
            key={contract.address}
            className="rounded-xl border border-pulse-border/70 bg-pulse-bg/40 p-3"
          >
            <dt className="font-semibold text-pulse-text">{contract.label}</dt>
            <dd className="mt-1 break-all font-mono">{contract.address}</dd>
            {contract.warning ? (
              <dd className="mt-2 leading-5">{contract.warning}</dd>
            ) : null}
          </div>
        ))}
      </dl>
    </section>
  );
}

function HyperEVMStatusPanel({
  mapping,
  status,
  activeCount,
  isFetching,
  onRescan,
}: {
  mapping: HyperEVMApprovalClientMapping | null;
  status: ReturnType<typeof useHyperEVMApprovalScan>["status"];
  activeCount: number;
  isFetching: boolean;
  onRescan: () => void;
}) {
  let title = "Scanning HyperEVM approvals";
  let body =
    "Reading HyperEVM approval history and checking current allowance or NFT approval state before showing rows.";
  let tone: "neutral" | "success" | "warning" = "neutral";

  if (mapping?.state === "config-missing") {
    title = "HyperEVM approval API not configured";
    body =
      "The HyperEVM read-only API needs server-side RPC and Etherscan API V2 settings before it can verify approvals. This is not a clear result.";
    tone = "warning";
  } else if (mapping?.state === "upstream-failure") {
    title = "HyperEVM discovery unavailable";
    body =
      "The explorer or HyperEVM RPC failed during read-only discovery. This is not a clear result.";
    tone = "warning";
  } else if (mapping?.state === "verification-incomplete") {
    title = "HyperEVM verification incomplete";
    body =
      mapping.incompleteReason ??
      "HyperEVM live validation or explorer discovery was incomplete. This is not a clear result.";
    tone = "warning";
  } else if (mapping?.state === "complete-clear") {
    title = "No active HyperEVM approvals found";
    body =
      "Discovery and live verification completed without finding active HyperEVM approvals for this scan target.";
    tone = "success";
  } else if (mapping?.state === "active") {
    title = `${activeCount} active HyperEVM approval${activeCount === 1 ? "" : "s"} found`;
    body =
      "Rows shown below passed live reads. ERC-20 and NFT revoke are available only for verified rows when the connected wallet and HyperEVM checks pass.";
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
            {HYPEREVM_REVOKE_UNAVAILABLE_COPY}{" "}
            {HYPEREVM_BATCH_REVOKE_UNAVAILABLE_COPY}
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

function HyperEVMErc20Row({
  approval,
  tokenLogoUrl,
  owner,
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approval: Approval;
  tokenLogoUrl?: string;
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
}) {
  return (
    <li className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1.2fr_0.9fr_auto] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <TokenAvatar symbol={approval.tokenSymbol} logoUrl={tokenLogoUrl} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pulse-text">
            {approval.tokenSymbol}
          </p>
          <p className="truncate text-xs text-pulse-muted">
            {approval.tokenName ?? "Unnamed token"}
          </p>
          <ExplorerLink
            href={hyperevmExplorerTokenUrl(approval.tokenAddress)}
            label={approval.tokenAddress}
          />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.spenderLabel}
        </p>
        <ExplorerLink
          href={hyperevmExplorerAddressUrl(approval.spenderAddress)}
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
      <HyperEVMErc20Action
        approval={approval}
        owner={owner}
        rowRevokeEnabled={rowRevokeEnabled}
        rowRevokeDisabledReason={rowRevokeDisabledReason}
        onRevoked={onRevoked}
        debugMode={debugMode}
      />
    </li>
  );
}

function HyperEVMErc20Action({
  approval,
  owner,
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approval: Approval;
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const rowIsVerifiedActive =
    approval.chainId === HYPEREVM_CLIENT_CHAIN_ID && approval.rawAllowance > 0n;
  const canRevoke = rowRevokeEnabled && rowIsVerifiedActive;
  const revoke = useRevokeApproval({
    target: {
      chainId: HYPEREVM_CLIENT_CHAIN_ID,
      tokenAddress: approval.tokenAddress,
      spenderAddress: approval.spenderAddress,
    },
    ownerAddress: owner,
    tokenSymbol: approval.tokenSymbol,
    tokenDecimals: approval.tokenDecimals,
    onSuccess: onRevoked,
  });
  const receiptDetails: RevokeReceiptDetails = {
    kind: "erc20",
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    chainName: HYPEREVM_DISPLAY_NAME,
    assetLabel: "Token",
    assetValue: (
      <ReceiptExplorerLink href={hyperevmExplorerTokenUrl(approval.tokenAddress)}>
        {approval.tokenSymbol}
      </ReceiptExplorerLink>
    ),
    counterpartyLabel: "Spender",
    counterpartyValue: (
      <ReceiptExplorerLink
        href={hyperevmExplorerAddressUrl(approval.spenderAddress)}
      >
        {shortenAddress(approval.spenderAddress)}
      </ReceiptExplorerLink>
    ),
    verificationState: revoke.postRevokeVerificationState,
  };

  if (!canRevoke) {
    return (
      <UnavailableRowPill
        reason={
          rowIsVerifiedActive
            ? rowRevokeDisabledReason
            : "Revoke unavailable until current approval state is verified."
        }
      />
    );
  }

  return (
    <div className="flex min-w-[14rem] flex-col items-stretch gap-2 md:items-end">
      <span className="inline-flex items-center justify-center rounded-full border border-pulse-green/35 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
        Live verified
      </span>
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          void revoke.refreshPreflight();
        }}
        disabled={revoke.isBusy}
        className="inline-flex items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {revoke.isBusy ? "Checking..." : "Review revoke"}
      </button>
      {confirming ? (
        <HyperEVMErc20Confirm
          preflight={revoke.preflight}
          status={revoke.status}
          isRefreshing={revoke.isRefreshingApproval}
          errorMessage={revoke.errorMessage}
          debugMode={debugMode}
          onRefresh={() => void revoke.refreshPreflight()}
          onConfirm={() => void revoke.revoke()}
          onCancel={() => {
            setConfirming(false);
            revoke.reset();
          }}
        />
      ) : null}
      {isReceiptStatus(revoke.status) ? (
        <div className="w-full md:min-w-[24rem]">
          <RevokeReceipt
            status={revoke.status}
            hash={revoke.hash}
            errorMessage={revoke.errorMessage}
            details={receiptDetails}
            onDismiss={() => {
              setConfirming(false);
              revoke.reset();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function HyperEVMErc20Confirm({
  preflight,
  status,
  isRefreshing,
  errorMessage,
  debugMode,
  onRefresh,
  onConfirm,
  onCancel,
}: {
  preflight: Erc20PreflightResult | null;
  status: RevokeStatus;
  isRefreshing: boolean;
  errorMessage?: string;
  debugMode: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const canConfirm =
    preflight?.status === "active" &&
    status !== "wallet" &&
    status !== "pending" &&
    !isRefreshing;

  return (
    <div className="w-full rounded-xl border border-pulse-border bg-pulse-bg/70 p-3 text-left text-xs text-pulse-muted shadow-xl md:w-80">
      <p className="font-semibold text-pulse-text">Review HyperEVM revoke</p>
      <p className="mt-1 leading-5">
        This calls approve(spender, 0). Gas is paid in{" "}
        {HYPEREVM_NATIVE_SYMBOL}.
      </p>
      <p className="mt-1 leading-5">{WALLET_PROMPT_SAFETY_COPY}</p>
      <HyperEVMErc20PreflightNotice
        preflight={preflight}
        isRefreshing={isRefreshing}
        debugMode={debugMode}
      />
      {errorMessage ? (
        <p className="mt-2 rounded-lg border border-pulse-red/35 bg-pulse-red/10 p-2 text-pulse-red">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-pulse-border bg-pulse-text/5 px-2.5 py-1.5 font-semibold text-pulse-muted transition hover:bg-pulse-text/10"
        >
          Cancel
        </button>
        {!canConfirm ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-pulse-cyan/35 bg-pulse-cyan/10 px-2.5 py-1.5 font-semibold text-pulse-cyan disabled:opacity-60"
          >
            {isRefreshing ? "Checking..." : "Refresh"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="rounded-lg bg-pulse-gradient px-2.5 py-1.5 font-semibold text-pulse-on-gradient shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "wallet" ? "Wallet open" : "Confirm revoke"}
        </button>
      </div>
    </div>
  );
}

function HyperEVMErc20PreflightNotice({
  preflight,
  isRefreshing,
  debugMode,
}: {
  preflight: Erc20PreflightResult | null;
  isRefreshing: boolean;
  debugMode: boolean;
}) {
  if (isRefreshing || !preflight) {
    return (
      <p className="mt-2 rounded-lg border border-pulse-cyan/35 bg-pulse-cyan/10 p-2 text-pulse-cyan">
        Checking allowance(owner, spender) before the wallet opens.
      </p>
    );
  }

  if (preflight.status === "active") {
    return (
      <p className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        Current allowance is still active
        {preflight.currentLabel ? `: ${preflight.currentLabel}` : "."}
      </p>
    );
  }

  if (preflight.status === "cleared") {
    return (
      <p className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        Already cleared. allowance(owner, spender) returned 0.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-amber-200">
      <p>
        Revoke unavailable until current approval state is verified
        {preflight.error ? ` (${preflight.error})` : ""}.
      </p>
      {debugMode ? (
        <dl className="mt-2 grid gap-1 font-mono text-[11px]">
          <DebugRow label="Preflight status" value={preflight.status} />
          <DebugRow label="Chain ID" value={preflight.chainId?.toString() ?? "999"} />
          <DebugRow
            label="Gas estimate attempted"
            value={preflight.gasEstimateAttempted ? "Yes" : "No"}
          />
        </dl>
      ) : null}
    </div>
  );
}

function HyperEVMNftRow({
  approval,
  owner,
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approval: NftApproval;
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
}) {
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
          href={hyperevmExplorerAddressUrl(approval.collectionAddress)}
          label={approval.collectionAddress}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.operatorLabel}
        </p>
        <ExplorerLink
          href={hyperevmExplorerAddressUrl(approval.operatorAddress)}
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
      <HyperEVMNftAction
        approval={approval}
        owner={owner}
        rowRevokeEnabled={rowRevokeEnabled}
        rowRevokeDisabledReason={rowRevokeDisabledReason}
        onRevoked={onRevoked}
        debugMode={debugMode}
      />
    </li>
  );
}

function HyperEVMNftAction({
  approval,
  owner,
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approval: NftApproval;
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const rowIsVerifiedActive =
    approval.chainId === HYPEREVM_CLIENT_CHAIN_ID &&
    (approval.kind === "approvalForAll" || approval.tokenId !== undefined);
  const canRevoke = rowRevokeEnabled && rowIsVerifiedActive;
  const revoke = useRevokeNftApproval({
    target: approval,
    ownerAddress: owner,
    onSuccess: onRevoked,
  });
  const receiptDetails: RevokeReceiptDetails = {
    kind: approval.kind === "approvalForAll" ? "nft-operator" : "nft-token",
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    chainName: HYPEREVM_DISPLAY_NAME,
    assetLabel: "Collection / token",
    assetValue: (
      <ReceiptExplorerLink
        href={hyperevmExplorerAddressUrl(approval.collectionAddress)}
      >
        {formatNftAssetLabel(approval)}
      </ReceiptExplorerLink>
    ),
    counterpartyLabel: "Operator",
    counterpartyValue: (
      <ReceiptExplorerLink
        href={hyperevmExplorerAddressUrl(approval.operatorAddress)}
      >
        {shortenAddress(approval.operatorAddress)}
      </ReceiptExplorerLink>
    ),
    verificationState: revoke.postRevokeVerificationState,
  };

  if (!canRevoke) {
    return (
      <UnavailableRowPill
        reason={
          rowIsVerifiedActive
            ? rowRevokeDisabledReason
            : "Revoke unavailable until current NFT approval state is verified."
        }
      />
    );
  }

  return (
    <div className="flex min-w-[14rem] flex-col items-stretch gap-2 md:items-end">
      <span className="inline-flex items-center justify-center rounded-full border border-pulse-green/35 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
        Live verified
      </span>
      <button
        type="button"
        onClick={() => {
          setConfirming(true);
          void revoke.refreshPreflight();
        }}
        disabled={revoke.isBusy}
        className="inline-flex items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {revoke.isBusy ? "Checking..." : "Review revoke"}
      </button>
      {confirming ? (
        <HyperEVMNftConfirm
          approval={approval}
          preflight={revoke.preflight}
          status={revoke.status}
          isRefreshing={revoke.isRefreshingApproval}
          errorMessage={revoke.errorMessage}
          debugMode={debugMode}
          onRefresh={() => void revoke.refreshPreflight()}
          onConfirm={() => void revoke.revoke()}
          onCancel={() => {
            setConfirming(false);
            revoke.reset();
          }}
        />
      ) : null}
      {isReceiptStatus(revoke.status) ? (
        <div className="w-full md:min-w-[24rem]">
          <RevokeReceipt
            status={revoke.status}
            hash={revoke.hash}
            errorMessage={revoke.errorMessage}
            details={receiptDetails}
            onDismiss={() => {
              setConfirming(false);
              revoke.reset();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function HyperEVMNftConfirm({
  approval,
  preflight,
  status,
  isRefreshing,
  errorMessage,
  debugMode,
  onRefresh,
  onConfirm,
  onCancel,
}: {
  approval: NftApproval;
  preflight: NftPreflightResult | null;
  status: RevokeStatus;
  isRefreshing: boolean;
  errorMessage?: string;
  debugMode: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const canConfirm =
    preflight?.status === "active" &&
    status !== "wallet" &&
    status !== "pending" &&
    !isRefreshing;

  return (
    <div className="w-full rounded-xl border border-pulse-border bg-pulse-bg/70 p-3 text-left text-xs text-pulse-muted shadow-xl md:w-80">
      <p className="font-semibold text-pulse-text">Review HyperEVM NFT revoke</p>
      <p className="mt-1 leading-5">
        This calls {nftRevokeMethodLabel(approval)}. Gas is paid in{" "}
        {HYPEREVM_NATIVE_SYMBOL}.
      </p>
      <p className="mt-1 leading-5">{WALLET_PROMPT_SAFETY_COPY}</p>
      <HyperEVMNftPreflightNotice
        approval={approval}
        preflight={preflight}
        isRefreshing={isRefreshing}
        debugMode={debugMode}
      />
      {errorMessage ? (
        <p className="mt-2 rounded-lg border border-pulse-red/35 bg-pulse-red/10 p-2 text-pulse-red">
          {errorMessage}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-pulse-border bg-pulse-text/5 px-2.5 py-1.5 font-semibold text-pulse-muted transition hover:bg-pulse-text/10"
        >
          Cancel
        </button>
        {!canConfirm ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-lg border border-pulse-cyan/35 bg-pulse-cyan/10 px-2.5 py-1.5 font-semibold text-pulse-cyan disabled:opacity-60"
          >
            {isRefreshing ? "Checking..." : "Refresh"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="rounded-lg bg-pulse-gradient px-2.5 py-1.5 font-semibold text-pulse-on-gradient shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "wallet" ? "Wallet open" : "Confirm revoke"}
        </button>
      </div>
    </div>
  );
}

function HyperEVMNftPreflightNotice({
  approval,
  preflight,
  isRefreshing,
  debugMode,
}: {
  approval: NftApproval;
  preflight: NftPreflightResult | null;
  isRefreshing: boolean;
  debugMode: boolean;
}) {
  if (isRefreshing || !preflight) {
    return (
      <p className="mt-2 rounded-lg border border-pulse-cyan/35 bg-pulse-cyan/10 p-2 text-pulse-cyan">
        Checking current NFT approval before the wallet opens.
      </p>
    );
  }

  if (preflight.status === "active") {
    return (
      <p className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        {approval.kind === "approvalForAll"
          ? "Current operator approval is still active."
          : "Current token approval still points to this operator."}
      </p>
    );
  }

  if (preflight.status === "cleared") {
    return (
      <p className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        {approval.kind === "approvalForAll"
          ? "Already cleared. isApprovedForAll(owner, operator) returned false."
          : "Already cleared. getApproved(tokenId) no longer points to this operator."}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-amber-200">
      <p>
        Revoke unavailable until current NFT approval state is verified
        {preflight.error ? ` (${preflight.error})` : ""}.
      </p>
      {debugMode ? (
        <dl className="mt-2 grid gap-1 font-mono text-[11px]">
          <DebugRow label="Preflight status" value={preflight.status} />
          <DebugRow label="Chain ID" value={preflight.chainId?.toString() ?? "999"} />
          <DebugRow
            label="Gas estimate attempted"
            value={preflight.gasEstimateAttempted ? "Yes" : "No"}
          />
        </dl>
      ) : null}
    </div>
  );
}

function HyperEVMDiagnostics({
  enabled,
  owner,
  connectedAddress,
  walletChainId,
  wagmiChainId,
  mapping,
  response,
  erc20RowRevokeEnabled,
  erc20RowRevokeDisabledReason,
  nftRowRevokeEnabled,
  nftRowRevokeDisabledReason,
}: {
  enabled: boolean;
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  mapping: HyperEVMApprovalClientMapping | null;
  response: ReturnType<typeof useHyperEVMApprovalScan>["response"];
  erc20RowRevokeEnabled: boolean;
  erc20RowRevokeDisabledReason: string;
  nftRowRevokeEnabled: boolean;
  nftRowRevokeDisabledReason: string;
}) {
  if (!enabled) return null;

  const diagnostics = response?.diagnostics;
  const rows: [string, string][] = [
    ["API route", "/api/hyperevm/approvals"],
    ["Scan target", owner],
    ["Connected wallet", connectedAddress ?? "Not connected"],
    ["Wallet chain ID", walletChainId?.toString() ?? "Unknown"],
    ["Wagmi chain ID", wagmiChainId?.toString() ?? "Unknown"],
    ["API status", response?.status ?? "No response"],
    ["Mapping state", mapping?.state ?? "No mapping"],
    ["Chain ID", response?.chainId?.toString() ?? "999"],
    ["RPC configured", diagnostics?.rpcConfigured ? "Yes" : "No"],
    ["Explorer/API configured", diagnostics?.explorerConfigured ? "Yes" : "No"],
    ["Raw approval logs", diagnostics?.rawApprovalLogCount?.toString() ?? "0"],
    [
      "Decoded ERC-20 approvals",
      diagnostics?.decodedErc20ApprovalCount?.toString() ?? "0",
    ],
    [
      "Decoded Permit2 approvals",
      diagnostics?.decodedPermit2ApprovalCount?.toString() ?? "0",
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
    ["ERC-20 row revoke", erc20RowRevokeEnabled ? "Enabled" : "Disabled"],
    ["ERC-20 row revoke reason", erc20RowRevokeDisabledReason],
    ["NFT row revoke", nftRowRevokeEnabled ? "Enabled" : "Disabled"],
    ["NFT row revoke reason", nftRowRevokeDisabledReason],
    ["Batch revoke", "Disabled"],
  ];

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4 text-xs">
      <p className="font-semibold uppercase tracking-[0.16em] text-pulse-text">
        HyperEVM API diagnostics
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

function ReceiptExplorerLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-semibold text-pulse-cyan underline underline-offset-2 hover:text-pulse-text"
    >
      {children}
    </a>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-pulse-muted">{label}</dt>
      <dd className="break-words text-pulse-text">{value}</dd>
    </div>
  );
}

function isReceiptStatus(
  status: RevokeStatus,
): status is "pending" | "success" | "rejected" | "error" {
  return (
    status === "pending" ||
    status === "success" ||
    status === "rejected" ||
    status === "error"
  );
}

function formatNftAssetLabel(approval: NftApproval): string {
  const collection =
    approval.collectionName ?? shortenAddress(approval.collectionAddress);
  if (approval.kind !== "tokenApproval" || approval.tokenId === undefined) {
    return collection;
  }
  return `${collection} #${approval.tokenId.toString()}`;
}

function nftRevokeMethodLabel(approval: NftApproval): string {
  return approval.kind === "approvalForAll"
    ? "setApprovalForAll(operator, false)"
    : "approve(address(0), tokenId)";
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
