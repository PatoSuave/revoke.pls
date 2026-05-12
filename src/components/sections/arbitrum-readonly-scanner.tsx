"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Address } from "viem";

import {
  RevokeReceipt,
  type RevokeReceiptDetails,
} from "@/components/approvals/revoke-receipt";
import { useArbitrumApprovalScan } from "@/hooks/use-arbitrum-approval-scan";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import type { RevokeStatus } from "@/hooks/use-revoke-approval";
import { useRevokeNftApproval } from "@/hooks/use-revoke-nft-approval";
import {
  ARBITRUM_BATCH_REVOKE_UNAVAILABLE_COPY,
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  ARBITRUM_ONE_DISPLAY_NAME,
  ARBITRUM_ONE_EXPLORER_NAME,
  ARBITRUM_ONE_NATIVE_SYMBOL,
  ARBITRUM_ONE_STATUS_LABEL,
  ARBITRUM_NFT_REVOKE_UNAVAILABLE_COPY,
  ARBITRUM_REVOKE_UNAVAILABLE_COPY,
  arbitrumErc20RowRevokeDisabledReasonForWallet,
  arbitrumNftRowRevokeDisabledReasonForWallet,
  canEnableArbitrumErc20RowRevoke,
  canEnableArbitrumNftRowRevoke,
} from "@/lib/arbitrum-approval-client";
import type { Approval } from "@/lib/approvals";
import { explorerAddressUrl, explorerTokenUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import type { NftApproval } from "@/lib/nft-approvals";
import type { Erc20PreflightResult, NftPreflightResult } from "@/lib/preflight";
import { WALLET_PROMPT_SAFETY_COPY } from "@/lib/revoke-gas";
import { addressesEqual } from "@/lib/scan-target";

export function ArbitrumReadOnlyScanner({
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
  const scan = useArbitrumApprovalScan({ owner });
  const erc20Approvals = useMemo(
    () => sortApprovals(scan.mapped?.approvals.erc20 ?? []),
    [scan.mapped?.approvals.erc20],
  );
  const nftApprovals = useMemo(
    () => sortNftApprovals(scan.mapped?.approvals.nft ?? []),
    [scan.mapped?.approvals.nft],
  );
  const activeCount = erc20Approvals.length + nftApprovals.length;
  const erc20RowRevokeEnabled = canEnableArbitrumErc20RowRevoke({
    mapping: scan.mapped,
    walletChainId,
    ownerAddress: owner,
    connectedAddress,
  });
  const erc20RowRevokeDisabledReason =
    arbitrumErc20RowRevokeDisabledReasonForWallet({
      mapping: scan.mapped,
      walletChainId,
      ownerAddress: owner,
      connectedAddress,
    });
  const nftRowRevokeEnabled = canEnableArbitrumNftRowRevoke({
    mapping: scan.mapped,
    walletChainId,
    ownerAddress: owner,
    connectedAddress,
  });
  const nftRowRevokeDisabledReason =
    arbitrumNftRowRevokeDisabledReasonForWallet({
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
              {ARBITRUM_ONE_STATUS_LABEL}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-pulse-text">
              Arbitrum One approval scan
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pulse-muted">
              Verified ERC-20 and NFT rows can be revoked when your connected
              wallet matches the scanned address and your wallet is on Arbitrum
              One. Batch revoke is not enabled for Arbitrum.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-pulse-cyan">
              ERC-20 row revoke beta
            </span>
            <span className="rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-pulse-cyan">
              NFT row revoke beta
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
            Explorer: {ARBITRUM_ONE_EXPLORER_NAME}
          </span>
        </div>
      </section>

      <ArbitrumStatusPanel
        scan={scan}
        activeCount={activeCount}
        onRescan={scan.refetch}
      />

      {activeCount > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/65">
          <div className="border-b border-pulse-border/70 px-4 py-3">
            <p className="text-sm font-semibold text-pulse-text">
              Live-verified Arbitrum approvals
            </p>
            <p className="mt-1 text-xs leading-5 text-pulse-muted">
              These rows passed live reads on Arbitrum One. ERC-20 and NFT rows
              can show row-level revoke in this beta; batch revoke remains off.
            </p>
          </div>
          {erc20Approvals.length > 0 ? (
            <div className="border-b border-pulse-border/70">
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
                ERC-20 allowances
              </div>
              <ul className="divide-y divide-pulse-border/70">
                {erc20Approvals.map((approval) => (
                  <ArbitrumErc20Row
                    key={approval.key}
                    approval={approval}
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
                  <ArbitrumNftRow
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

      <ArbitrumCoverageNote scan={scan} />
      <ArbitrumDiagnosticsPanel
        enabled={debugMode}
        scan={scan}
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        erc20RowRevokeEnabled={erc20RowRevokeEnabled}
        erc20RowRevokeDisabledReason={erc20RowRevokeDisabledReason}
        nftRowRevokeEnabled={nftRowRevokeEnabled}
        nftRowRevokeDisabledReason={nftRowRevokeDisabledReason}
      />
    </div>
  );
}

function ArbitrumStatusPanel({
  scan,
  activeCount,
  onRescan,
}: {
  scan: ReturnType<typeof useArbitrumApprovalScan>;
  activeCount: number;
  onRescan: () => void;
}) {
  if (scan.status === "pending" || !scan.mapped) {
    return (
      <StateCard
        tone="info"
        title="Scanning Arbitrum approvals"
        body="Reading Arbitrum approval history and checking current allowance or approval state before showing rows."
      />
    );
  }

  const errors = scan.response?.errors ?? [];
  const warnings = scan.mapped.warnings ?? [];
  const missingConfig = scan.response?.missingConfig ?? [];

  if (scan.mapped.state === "config-missing") {
    return (
      <StateCard
        tone="warning"
        title="Arbitrum approval API not configured"
        body="The Arbitrum read-only API needs server-side RPC and Arbiscan API settings before it can verify approvals. This is not a clear result."
        details={[...missingConfig.map((item) => `Missing: ${item}`), ...errors]}
        onRescan={onRescan}
      />
    );
  }

  if (scan.mapped.state === "upstream-failure") {
    return (
      <StateCard
        tone="warning"
        title="Arbitrum discovery unavailable"
        body="The explorer or Arbitrum RPC failed during read-only discovery. This is not a clear result."
        details={[...errors, ...warnings]}
        onRescan={onRescan}
      />
    );
  }

  if (scan.mapped.state === "verification-incomplete" && activeCount === 0) {
    return (
      <StateCard
        tone="warning"
        title="Verification incomplete"
        body="Revoke.PLS found Arbitrum approval history or diagnostics that could not be fully verified. The app cannot call this wallet clear."
        details={[
          scan.mapped.incompleteReason ??
            "Arbitrum live validation or explorer discovery was incomplete.",
          ...warnings,
        ]}
        onRescan={onRescan}
      />
    );
  }

  if (scan.mapped.canShowClear) {
    return (
      <StateCard
        tone="success"
        title="No active Arbitrum approvals found"
        body="Discovery and live verification completed without finding active Arbitrum approvals for this scan target."
        onRescan={onRescan}
      />
    );
  }

  return (
    <StateCard
      tone={scan.mapped.state === "verification-incomplete" ? "warning" : "info"}
      title={`${activeCount} active Arbitrum approval${
        activeCount === 1 ? "" : "s"
      } found`}
      body={
        scan.mapped.state === "verification-incomplete"
          ? "Some discovered Arbitrum approvals could not be fully verified. Rows shown below passed live reads, but this is not a complete-clear result. Revoke remains unavailable for any row whose current state is not verified."
          : ARBITRUM_REVOKE_UNAVAILABLE_COPY
      }
      details={[
        ...(scan.mapped.incompleteReason ? [scan.mapped.incompleteReason] : []),
        ...warnings,
      ]}
      onRescan={onRescan}
    />
  );
}

function StateCard({
  title,
  body,
  details = [],
  tone = "info",
  onRescan,
}: {
  title: string;
  body: string;
  details?: readonly string[];
  tone?: "info" | "success" | "warning";
  onRescan?: () => void;
}) {
  const styles =
    tone === "success"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : tone === "warning"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan";

  return (
    <section className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-pulse-muted">{body}</p>
        </div>
        {onRescan ? (
          <button
            type="button"
            onClick={onRescan}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-current/35 bg-pulse-bg/40 px-3 py-1.5 text-xs font-semibold transition hover:bg-pulse-bg/65"
          >
            Rescan
          </button>
        ) : null}
      </div>
      {details.length > 0 ? (
        <ul className="mt-3 grid gap-1 text-xs leading-5 text-pulse-muted">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function ArbitrumErc20Row({
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
  return (
    <li className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1.2fr_0.9fr_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-pulse-text">
          {approval.tokenSymbol}
        </p>
        <ExplorerLink
          href={explorerTokenUrl(ARBITRUM_ONE_CLIENT_CHAIN_ID, approval.tokenAddress)}
          label={approval.tokenName ?? approval.tokenAddress}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.spenderLabel}
        </p>
        <ExplorerLink
          href={explorerAddressUrl(
            ARBITRUM_ONE_CLIENT_CHAIN_ID,
            approval.spenderAddress,
          )}
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
      <ArbitrumErc20Action
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

function ArbitrumErc20Action({
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
    approval.chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID &&
    approval.rawAllowance > 0n;
  const canRevoke = rowRevokeEnabled && rowIsVerifiedActive;
  const revoke = useRevokeApproval({
    target: {
      chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
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
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    chainName: ARBITRUM_ONE_DISPLAY_NAME,
    assetLabel: "Token",
    assetValue: (
      <ReceiptExplorerLink
        href={explorerTokenUrl(
          ARBITRUM_ONE_CLIENT_CHAIN_ID,
          approval.tokenAddress,
        )}
      >
        {approval.tokenSymbol}
      </ReceiptExplorerLink>
    ),
    counterpartyLabel: "Spender",
    counterpartyValue: (
      <ReceiptExplorerLink
        href={explorerAddressUrl(
          ARBITRUM_ONE_CLIENT_CHAIN_ID,
          approval.spenderAddress,
        )}
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
        <ArbitrumErc20Confirm
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

function ArbitrumErc20Confirm({
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
  status: ReturnType<typeof useRevokeApproval>["status"];
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
      <p className="font-semibold text-pulse-text">Review Arbitrum revoke</p>
      <p className="mt-1 leading-5">
        This calls approve(spender, 0). Gas is paid in{" "}
        {ARBITRUM_ONE_NATIVE_SYMBOL}.
      </p>
      <p className="mt-1 leading-5">{WALLET_PROMPT_SAFETY_COPY}</p>
      <ArbitrumPreflightNotice
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
          className="rounded-lg border border-pulse-border bg-white/5 px-2.5 py-1.5 font-semibold text-pulse-muted transition hover:bg-white/10"
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
          className="rounded-lg bg-pulse-gradient px-2.5 py-1.5 font-semibold text-pulse-bg shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "wallet" ? "Wallet open" : "Confirm revoke"}
        </button>
      </div>
    </div>
  );
}

function ArbitrumPreflightNotice({
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
          <DebugRow label="Chain ID" value={preflight.chainId?.toString() ?? "42161"} />
          <DebugRow
            label="Gas estimate attempted"
            value={preflight.gasEstimateAttempted ? "Yes" : "No"}
          />
        </dl>
      ) : null}
    </div>
  );
}

function ArbitrumNftRow({
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
          href={explorerAddressUrl(
            ARBITRUM_ONE_CLIENT_CHAIN_ID,
            approval.collectionAddress,
          )}
          label={approval.collectionAddress}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-pulse-text">
          {approval.operatorLabel}
        </p>
        <ExplorerLink
          href={explorerAddressUrl(
            ARBITRUM_ONE_CLIENT_CHAIN_ID,
            approval.operatorAddress,
          )}
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
      <ArbitrumNftAction
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

function ArbitrumNftAction({
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
    approval.chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID &&
    (approval.kind === "approvalForAll" || approval.tokenId !== undefined);
  const canRevoke = rowRevokeEnabled && rowIsVerifiedActive;
  const revoke = useRevokeNftApproval({
    target: approval,
    ownerAddress: owner,
    onSuccess: onRevoked,
  });
  const receiptDetails: RevokeReceiptDetails = {
    kind: approval.kind === "approvalForAll" ? "nft-operator" : "nft-token",
    chainId: ARBITRUM_ONE_CLIENT_CHAIN_ID,
    chainName: ARBITRUM_ONE_DISPLAY_NAME,
    assetLabel: "Collection / token",
    assetValue: (
      <ReceiptExplorerLink
        href={explorerAddressUrl(
          ARBITRUM_ONE_CLIENT_CHAIN_ID,
          approval.collectionAddress,
        )}
      >
        {formatNftAssetLabel(approval)}
      </ReceiptExplorerLink>
    ),
    counterpartyLabel: "Operator",
    counterpartyValue: (
      <ReceiptExplorerLink
        href={explorerAddressUrl(
          ARBITRUM_ONE_CLIENT_CHAIN_ID,
          approval.operatorAddress,
        )}
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
        <ArbitrumNftConfirm
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

function ArbitrumNftConfirm({
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
      <p className="font-semibold text-pulse-text">Review Arbitrum NFT revoke</p>
      <p className="mt-1 leading-5">
        This calls {nftRevokeMethodLabel(approval)}. Gas is paid in{" "}
        {ARBITRUM_ONE_NATIVE_SYMBOL}.
      </p>
      <p className="mt-1 leading-5">{WALLET_PROMPT_SAFETY_COPY}</p>
      <ArbitrumNftPreflightNotice
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
          className="rounded-lg border border-pulse-border bg-white/5 px-2.5 py-1.5 font-semibold text-pulse-muted transition hover:bg-white/10"
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
          className="rounded-lg bg-pulse-gradient px-2.5 py-1.5 font-semibold text-pulse-bg shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "wallet" ? "Wallet open" : "Confirm revoke"}
        </button>
      </div>
    </div>
  );
}

function ArbitrumNftPreflightNotice({
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
          <DebugRow label="Chain ID" value={preflight.chainId?.toString() ?? "42161"} />
          <DebugRow
            label="Gas estimate attempted"
            value={preflight.gasEstimateAttempted ? "Yes" : "No"}
          />
        </dl>
      ) : null}
    </div>
  );
}

function UnavailableRowPill({ reason }: { reason: string }) {
  return (
    <div className="flex flex-wrap gap-2 md:justify-end">
      <span className="rounded-full border border-pulse-green/35 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
        Live verified
      </span>
      <span
        title={reason}
        className="rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200"
      >
        Revoke unavailable
      </span>
    </div>
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
  const collection = approval.collectionName ?? shortenAddress(approval.collectionAddress);
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
      className="mt-1 block truncate font-mono text-xs text-pulse-cyan underline-offset-2 hover:underline"
    >
      {label.startsWith("0x") ? shortenAddress(label) : label}
    </a>
  );
}

function ArbitrumCoverageNote({
  scan,
}: {
  scan: ReturnType<typeof useArbitrumApprovalScan>;
}) {
  const diagnostics = scan.response?.diagnostics;
  return (
    <p className="text-xs leading-5 text-pulse-muted">
      Arbitrum discovery uses the server read-only API, Etherscan-compatible
      logs with chainid=42161, and live RPC validation.{" "}
      {diagnostics?.discoveryTruncated
        ? "Explorer discovery reported truncation. "
        : ""}
      {diagnostics?.candidateCapHit
        ? "The live-read candidate cap was reached. "
        : ""}
      {diagnostics?.requestTimedOut ? "The request timed out. " : ""}
      {ARBITRUM_REVOKE_UNAVAILABLE_COPY}{" "}
      {ARBITRUM_NFT_REVOKE_UNAVAILABLE_COPY}{" "}
      {ARBITRUM_BATCH_REVOKE_UNAVAILABLE_COPY}
    </p>
  );
}

function ArbitrumDiagnosticsPanel({
  enabled,
  scan,
  owner,
  connectedAddress,
  walletChainId,
  wagmiChainId,
  erc20RowRevokeEnabled,
  erc20RowRevokeDisabledReason,
  nftRowRevokeEnabled,
  nftRowRevokeDisabledReason,
}: {
  enabled: boolean;
  scan: ReturnType<typeof useArbitrumApprovalScan>;
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  erc20RowRevokeEnabled: boolean;
  erc20RowRevokeDisabledReason: string;
  nftRowRevokeEnabled: boolean;
  nftRowRevokeDisabledReason: string;
}) {
  if (!enabled) return null;

  const response = scan.response;
  const diagnostics = response?.diagnostics;
  const walletMatchesScanTarget = addressesEqual(owner, connectedAddress);
  const scanMode = walletMatchesScanTarget
    ? "connected-wallet-matches-scanned-address"
    : connectedAddress
      ? "address-only"
      : "address-only";
  const rows: [string, string][] = [
    ["Scan mode", scanMode],
    ["Scan target address", owner],
    ["Connected wallet", connectedAddress ?? "None"],
    ["Wallet matches scan target", walletMatchesScanTarget ? "Yes" : "No"],
    ["Wallet chain ID", walletChainId?.toString() ?? "None"],
    ["Wagmi chain ID", wagmiChainId?.toString() ?? "None"],
    ["API route", "/api/arbitrum/approvals"],
    ["API status", response?.status ?? scan.status],
    ["Global/batch revoke enabled", "No"],
    ["ERC-20 row revoke enabled", erc20RowRevokeEnabled ? "Yes" : "No"],
    [
      "ERC-20 row revoke reason",
      erc20RowRevokeEnabled
        ? "Verified ERC-20 row; revoke available"
        : erc20RowRevokeDisabledReason,
    ],
    ["NFT row revoke enabled", nftRowRevokeEnabled ? "Yes" : "No"],
    [
      "NFT row revoke reason",
      nftRowRevokeEnabled
        ? "Verified NFT row; revoke available"
        : nftRowRevokeDisabledReason,
    ],
    ["NFT global revoke enabled", "No"],
    ["NFT global revoke reason", ARBITRUM_NFT_REVOKE_UNAVAILABLE_COPY],
    ["Batch revoke enabled", "No"],
    ["Batch revoke reason", ARBITRUM_BATCH_REVOKE_UNAVAILABLE_COPY],
    ["Chain ID", diagnostics?.chainId.toString() ?? "42161"],
    ["RPC configured", diagnostics?.rpcConfigured ? "Yes" : "No / unknown"],
    [
      "Explorer/API configured",
      diagnostics?.explorerConfigured ? "Yes" : "No / unknown",
    ],
    [
      "Raw approval logs",
      diagnostics?.rawApprovalLogCount.toString() ?? "Not returned",
    ],
    [
      "Decoded ERC-20 approvals",
      diagnostics?.decodedErc20ApprovalCount.toString() ?? "Not returned",
    ],
    [
      "Decoded NFT approvals",
      diagnostics?.decodedNftApprovalCount.toString() ?? "Not returned",
    ],
    [
      "Live read successes",
      diagnostics?.liveReadSuccessCount.toString() ?? "Not returned",
    ],
    [
      "Live read failures",
      diagnostics?.liveReadFailureCount.toString() ?? "Not returned",
    ],
    [
      "Incomplete checks",
      diagnostics?.incompleteVerificationCount.toString() ?? "Not returned",
    ],
    [
      "Skipped approvals",
      diagnostics?.skippedApprovalCount.toString() ?? "Not returned",
    ],
    [
      "Skipped reasons",
      diagnostics
        ? formatSkippedReasonBreakdown(diagnostics.skippedReasons)
        : "Not returned",
    ],
    [
      "Discovery truncated",
      diagnostics ? yesNo(diagnostics.discoveryTruncated) : "Unknown",
    ],
    ["Request timed out", diagnostics ? yesNo(diagnostics.requestTimedOut) : "Unknown"],
    ["Rate limited", diagnostics ? yesNo(diagnostics.rateLimited) : "Unknown"],
    [
      "Candidate cap hit",
      diagnostics ? yesNo(diagnostics.candidateCapHit) : "Unknown",
    ],
    [
      "Live-read cap",
      diagnostics?.liveReadCandidateCap.toString() ?? "Not returned",
    ],
    [
      "Live-read candidates",
      diagnostics?.liveReadCandidatesTotal.toString() ?? "Not returned",
    ],
    [
      "Live-read processed",
      diagnostics?.liveReadCandidatesProcessed.toString() ?? "Not returned",
    ],
    [
      "RPC read concurrency",
      diagnostics?.rpcReadConcurrency.toString() ?? "Not returned",
    ],
    [
      "Incomplete reasons",
      diagnostics?.incompleteReasons.join("; ") || "None",
    ],
  ];

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4">
      <p className="text-sm font-semibold text-pulse-text">
        Arbitrum API diagnostics
      </p>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        This panel reports the read-only API response and never prints secret
        RPC URLs or API keys.
      </p>
      <dl className="mt-4 grid gap-2 text-xs md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/50 p-3"
          >
            <dt className="font-semibold uppercase tracking-[0.12em] text-pulse-muted">
              {label}
            </dt>
            <dd className="mt-1 break-words font-mono text-pulse-text">
              {formatMaybeAddress(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function sortApprovals(approvals: readonly Approval[]): Approval[] {
  return [...approvals].sort((a, b) => {
    if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
    return a.tokenSymbol.localeCompare(b.tokenSymbol);
  });
}

function sortNftApprovals(approvals: readonly NftApproval[]): NftApproval[] {
  return [...approvals].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return (a.collectionName ?? a.collectionAddress).localeCompare(
      b.collectionName ?? b.collectionAddress,
    );
  });
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatSkippedReasonBreakdown(reasons: Record<string, number>): string {
  const entries = Object.entries(reasons).filter(([, count]) => count > 0);
  if (entries.length === 0) return "None";
  return entries.map(([reason, count]) => `${reason}: ${count}`).join(", ");
}

function formatMaybeAddress(value: string): string {
  return value.startsWith("0x") && value.length === 42
    ? shortenAddress(value)
    : value;
}
