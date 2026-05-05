"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Address } from "viem";

import { useEthereumApprovalScan } from "@/hooks/use-ethereum-approval-scan";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import { useRevokeNftApproval } from "@/hooks/use-revoke-nft-approval";
import {
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_EXPLORER_NAME,
  ETHEREUM_MAINNET_NATIVE_SYMBOL,
  ETHEREUM_READ_ONLY_MODE_LABEL,
  canEnableEthereumWalletRevoke,
  ethereumApprovalDisplayAllowance,
  ethereumExplorerAddressUrl,
  ethereumExplorerTokenUrl,
  ethereumExplorerTxUrl,
  ethereumTokenDisplayDescription,
  ethereumTokenDisplaySymbol,
  ethereumWalletRevokeDisabledReason,
} from "@/lib/ethereum-approval-client";
import { shortenAddress } from "@/lib/format";
import type { NftApproval } from "@/lib/nft-approvals";
import type {
  Erc20PreflightResult,
  NftPreflightResult,
} from "@/lib/preflight";
import { scoreApprovals, type RiskAssessment, type ScoredApproval } from "@/lib/risk";

export function EthereumReadOnlyScanner({
  owner,
  walletChainId,
  wagmiChainId,
  debugMode,
}: {
  owner: Address;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  debugMode: boolean;
}) {
  const scan = useEthereumApprovalScan({ owner });
  const scoredErc20 = useMemo(
    () => sortScoredApprovals(scoreApprovals(scan.mapped?.approvals.erc20 ?? [])),
    [scan.mapped?.approvals.erc20],
  );
  const sortedNft = useMemo(
    () => sortNftApprovals(scan.mapped?.approvals.nft ?? []),
    [scan.mapped?.approvals.nft],
  );
  const activeCount = scoredErc20.length + sortedNft.length;
  const revokeEnabled = canEnableEthereumWalletRevoke({
    mapping: scan.mapped,
    walletChainId,
  });
  const revokeDisabledReason = ethereumWalletRevokeDisabledReason({
    mapping: scan.mapped,
    walletChainId,
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-xs font-semibold text-pulse-cyan">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-cyan"
                aria-hidden
              />
              {revokeEnabled
                ? "Ethereum wallet revoke mode"
                : ETHEREUM_READ_ONLY_MODE_LABEL}
            </span>
            <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-xs text-pulse-muted">
              {shortenAddress(owner)}
            </span>
            <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
              {revokeEnabled
                ? "Wallet-side revoke enabled"
                : "Read-only Ethereum scan"}
            </span>
          </div>

          <button
            type="button"
            onClick={scan.refetch}
            disabled={scan.isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {scan.isFetching ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </section>

      <ReadOnlyNotice
        revokeEnabled={revokeEnabled}
        revokeDisabledReason={revokeDisabledReason}
      />

      <EthereumScanContent
        scan={scan}
        owner={owner}
        erc20={scoredErc20}
        nft={sortedNft}
        activeCount={activeCount}
        revokeEnabled={revokeEnabled}
        revokeDisabledReason={revokeDisabledReason}
      />

      <EthereumCoverageNote scan={scan} />

      <EthereumDiagnostics
        enabled={debugMode}
        owner={owner}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        scan={scan}
        revokeEnabled={revokeEnabled}
        revokeDisabledReason={revokeDisabledReason}
      />
    </div>
  );
}

function ReadOnlyNotice({
  revokeEnabled,
  revokeDisabledReason,
}: {
  revokeEnabled: boolean;
  revokeDisabledReason: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
        {revokeEnabled ? "Ethereum wallet-side revoke" : "Ethereum gated mode"}
      </p>
      <p className="mt-2 leading-6 text-pulse-muted">
        {revokeEnabled
          ? "Ethereum revoke is enabled only for approvals that the read-only API live-validated. Transactions are requested from the connected wallet on Ethereum Mainnet; the API still cannot sign, submit, or move funds."
          : `Ethereum Mainnet approval discovery is connected through a read-only API. ${revokeDisabledReason} This view does not request signatures, submit transactions, or move funds.`}
      </p>
    </div>
  );
}

function EthereumScanContent({
  scan,
  owner,
  erc20,
  nft,
  activeCount,
  revokeEnabled,
  revokeDisabledReason,
}: {
  scan: ReturnType<typeof useEthereumApprovalScan>;
  owner: Address;
  erc20: readonly ScoredApproval[];
  nft: readonly NftApproval[];
  activeCount: number;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
}) {
  if (scan.status === "pending" || !scan.mapped) {
    return <EthereumScannerSkeleton />;
  }

  const errors = scan.response?.errors ?? [];
  const missingConfig = scan.response?.missingConfig ?? [];
  const warnings = scan.mapped.warnings ?? [];

  if (scan.mapped.state === "config-missing") {
    return (
      <StatePanel
        tone="warning"
        eyebrow="Configuration needed"
        title="Ethereum approval discovery is not configured"
        body="The Ethereum read-only API needs server-side RPC and Etherscan API settings before it can verify approvals. This is not a clear result."
      >
        <DetailList
          title="Missing configuration"
          items={
            missingConfig.length > 0
              ? missingConfig
              : ["MAINNET_RPC_URL or ETHEREUM_RPC_URL", "ETHERSCAN_API_KEY"]
          }
        />
      </StatePanel>
    );
  }

  if (scan.mapped.state === "upstream-failure") {
    return (
      <StatePanel
        tone="error"
        eyebrow="Temporary failure"
        title="Ethereum approval discovery could not finish"
        body="The explorer or Ethereum RPC failed during read-only discovery. This is not a clear result."
      >
        <DetailList
          title="Reported issue"
          items={errors.length > 0 ? errors : ["Ethereum approval API request failed."]}
        />
      </StatePanel>
    );
  }

  if (scan.mapped.state === "verification-incomplete" && activeCount === 0) {
    return (
      <StatePanel
        tone="warning"
        eyebrow="Verification incomplete"
        title="No verified active Ethereum approvals were found"
        body="Some discovery or live validation work did not complete, so this wallet is not shown as clear. Retry later or verify directly on Etherscan."
      >
        <DetailList
          title="Why this is incomplete"
          items={
            warnings.length > 0
              ? warnings
              : ["Ethereum live validation or explorer discovery was incomplete."]
          }
        />
      </StatePanel>
    );
  }

  if (scan.mapped.canShowClear) {
    return (
      <StatePanel
        tone="success"
        eyebrow="Clear for now"
        title="No active Ethereum approvals found"
        body="Historical approvals were checked through the Ethereum API and live validation completed without reported failures."
      />
    );
  }

  return (
    <div className="space-y-5">
      {scan.mapped.state === "verification-incomplete" ? (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
          <p className="font-semibold text-amber-200">
            Ethereum verification is incomplete.
          </p>
          <p className="mt-1 leading-6 text-pulse-muted">
            Active approvals below were returned by the API, but at least one
            discovery or live-read check did not complete. This is not a clear
            wallet state.
          </p>
        </div>
      ) : null}

      {erc20.length > 0 ? (
        <ReadOnlyErc20Table
          approvals={erc20}
          owner={owner}
          revokeEnabled={revokeEnabled}
          revokeDisabledReason={revokeDisabledReason}
          onRevoked={scan.refetch}
        />
      ) : (
        <EmptyReadOnlyGroup label="ERC-20 approvals" />
      )}

      {nft.length > 0 ? (
        <ReadOnlyNftTable
          approvals={nft}
          owner={owner}
          revokeEnabled={revokeEnabled}
          revokeDisabledReason={revokeDisabledReason}
          onRevoked={scan.refetch}
        />
      ) : (
        <EmptyReadOnlyGroup label="ERC-721 / ERC-1155 approvals" />
      )}
    </div>
  );
}

function ReadOnlyErc20Table({
  approvals,
  owner,
  revokeEnabled,
  revokeDisabledReason,
  onRevoked,
}: {
  approvals: readonly ScoredApproval[];
  owner: Address;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
  onRevoked: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
      <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
        <div>Token</div>
        <div>Spender</div>
        <div>Exposure / Risk</div>
        <div className="text-right">Action</div>
      </div>
      <ul>
        {approvals.map((approval) => (
          <li
            key={approval.key}
            className="grid grid-cols-1 gap-4 border-b border-pulse-border/60 px-4 py-4 last:border-b-0 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:items-center sm:gap-4"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-pulse-text">
                  {ethereumTokenDisplaySymbol(approval.tokenSymbol)}
                </p>
                <RiskBadge risk={approval.risk} />
              </div>
              <a
                href={ethereumExplorerTokenUrl(approval.tokenAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                title={approval.tokenAddress}
              >
                {ethereumTokenDisplayDescription(
                  approval.tokenName,
                  approval.tokenAddress,
                )}
              </a>
            </div>

            <div className="min-w-0 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
              <p className="truncate text-sm font-medium text-pulse-text">
                {approval.spenderLabel}
              </p>
              <a
                href={ethereumExplorerAddressUrl(approval.spenderAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                title={approval.spenderAddress}
              >
                {shortenAddress(approval.spenderAddress)}
              </a>
              <p className="mt-1 text-[11px] text-pulse-muted">
                {approval.trusted ? "Registry label" : "Unknown spender"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-1.5 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
              {approval.unlimited ? (
                <span className="inline-flex items-center rounded-full border border-pulse-red/40 bg-pulse-red/10 px-2.5 py-1 text-xs font-semibold text-pulse-red">
                  Unlimited
                </span>
              ) : (
                <span className="font-mono text-sm text-pulse-text">
                  {ethereumApprovalDisplayAllowance({
                    formattedAllowance: approval.formattedAllowance,
                    unlimited: approval.unlimited,
                  })}
                </span>
              )}
            </div>

            <EthereumErc20Action
              approval={approval}
              owner={owner}
              revokeEnabled={revokeEnabled}
              revokeDisabledReason={revokeDisabledReason}
              onRevoked={onRevoked}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadOnlyNftTable({
  approvals,
  owner,
  revokeEnabled,
  revokeDisabledReason,
  onRevoked,
}: {
  approvals: readonly NftApproval[];
  owner: Address;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
  onRevoked: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
      <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
        <div>Collection</div>
        <div>Operator</div>
        <div>Permission / Risk</div>
        <div className="text-right">Action</div>
      </div>
      <ul>
        {approvals.map((approval) => (
          <li
            key={approval.key}
            className="grid grid-cols-1 gap-4 border-b border-pulse-border/60 px-4 py-4 last:border-b-0 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:items-center sm:gap-4"
          >
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-pulse-text">
                  {approval.collectionName ?? "Unnamed collection"}
                </p>
                <RiskBadge risk={approval.risk} />
              </div>
              <a
                href={ethereumExplorerAddressUrl(approval.collectionAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                title={approval.collectionAddress}
              >
                {shortenAddress(approval.collectionAddress)}
              </a>
            </div>

            <div className="min-w-0 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
              <p className="truncate text-sm font-medium text-pulse-text">
                {approval.operatorLabel}
              </p>
              <a
                href={ethereumExplorerAddressUrl(approval.operatorAddress)}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                title={approval.operatorAddress}
              >
                {shortenAddress(approval.operatorAddress)}
              </a>
              <p className="mt-1 text-[11px] text-pulse-muted">
                {approval.trusted ? "Registry label" : "Unknown operator"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-1.5 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
              <span className="text-xs text-pulse-muted">
                {approval.kind === "approvalForAll"
                  ? "Collection-wide"
                  : `Single NFT #${approval.tokenId?.toString() ?? "unknown"}`}
              </span>
              <span className="inline-flex rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted">
                {approval.standard === "erc1155" ? "ERC-1155" : "ERC-721"}
              </span>
            </div>

            <EthereumNftAction
              approval={approval}
              owner={owner}
              revokeEnabled={revokeEnabled}
              revokeDisabledReason={revokeDisabledReason}
              onRevoked={onRevoked}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EthereumErc20Action({
  approval,
  owner,
  revokeEnabled,
  revokeDisabledReason,
  onRevoked,
}: {
  approval: ScoredApproval;
  owner: Address;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
  onRevoked: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const revoke = useRevokeApproval({
    target: {
      chainId: approval.chainId,
      tokenAddress: approval.tokenAddress,
      spenderAddress: approval.spenderAddress,
    },
    ownerAddress: owner,
    tokenSymbol: approval.tokenSymbol,
    tokenDecimals: approval.tokenDecimals,
    onSuccess: () => {
      setConfirming(false);
      onRevoked();
    },
  });

  if (!revokeEnabled) {
    return <ReadOnlyAction title={revokeDisabledReason} />;
  }

  return (
    <EthereumActionShell
      status={revoke.status}
      hash={revoke.hash}
      errorMessage={revoke.errorMessage}
      isBusy={revoke.isBusy}
      confirming={confirming}
      onStart={() => {
        setConfirming(true);
        void revoke.refreshPreflight();
      }}
      onCancel={() => setConfirming(false)}
      onRetry={() => {
        revoke.reset();
        setConfirming(true);
        void revoke.refreshPreflight();
      }}
      onDismiss={revoke.reset}
    >
      {confirming ? (
        <EthereumErc20Confirm
          approval={approval}
          preflight={revoke.preflight}
          isRefreshing={revoke.isRefreshingApproval}
          onRefresh={() => void revoke.refreshPreflight()}
          onConfirm={() => void revoke.revoke()}
        />
      ) : null}
    </EthereumActionShell>
  );
}

function EthereumNftAction({
  approval,
  owner,
  revokeEnabled,
  revokeDisabledReason,
  onRevoked,
}: {
  approval: NftApproval;
  owner: Address;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
  onRevoked: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const revoke = useRevokeNftApproval({
    target: approval,
    ownerAddress: owner,
    onSuccess: () => {
      setConfirming(false);
      onRevoked();
    },
  });

  if (!revokeEnabled) {
    return <ReadOnlyAction title={revokeDisabledReason} />;
  }

  return (
    <EthereumActionShell
      status={revoke.status}
      hash={revoke.hash}
      errorMessage={revoke.errorMessage}
      isBusy={revoke.isBusy}
      confirming={confirming}
      onStart={() => {
        setConfirming(true);
        void revoke.refreshPreflight();
      }}
      onCancel={() => setConfirming(false)}
      onRetry={() => {
        revoke.reset();
        setConfirming(true);
        void revoke.refreshPreflight();
      }}
      onDismiss={revoke.reset}
    >
      {confirming ? (
        <EthereumNftConfirm
          approval={approval}
          preflight={revoke.preflight}
          isRefreshing={revoke.isRefreshingApproval}
          onRefresh={() => void revoke.refreshPreflight()}
          onConfirm={() => void revoke.revoke()}
        />
      ) : null}
    </EthereumActionShell>
  );
}

function EthereumActionShell({
  status,
  hash,
  errorMessage,
  isBusy,
  confirming,
  onStart,
  onCancel,
  onRetry,
  onDismiss,
  children,
}: {
  status: ReturnType<typeof useRevokeApproval>["status"];
  hash?: `0x${string}`;
  errorMessage?: string;
  isBusy: boolean;
  confirming: boolean;
  onStart: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  children?: ReactNode;
}) {
  const base =
    "inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed sm:w-auto";

  let action: ReactNode;
  if (status === "refreshing") {
    action = (
      <span className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}>
        Checking...
      </span>
    );
  } else if (status === "wallet") {
    action = (
      <span className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}>
        Confirm in wallet...
      </span>
    );
  } else if (status === "pending") {
    action = (
      <span className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}>
        Confirming...
        {hash ? <EthereumTxLink hash={hash} /> : null}
      </span>
    );
  } else if (status === "success") {
    action = (
      <span className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}>
        Revoked
        {hash ? <EthereumTxLink hash={hash} /> : null}
      </span>
    );
  } else if (status === "error") {
    action = (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} border border-pulse-red/40 bg-pulse-red/10 text-pulse-red hover:bg-pulse-red/20`}
      >
        Retry
      </button>
    );
  } else if (status === "rejected") {
    action = (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} border border-pulse-border bg-white/5 text-pulse-text hover:bg-white/10`}
      >
        Try again
      </button>
    );
  } else if (confirming) {
    action = (
      <button
        type="button"
        onClick={onCancel}
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted hover:bg-white/10`}
      >
        Cancel
      </button>
    );
  } else {
    action = (
      <button
        type="button"
        onClick={onStart}
        disabled={isBusy}
        className={`${base} bg-pulse-gradient text-pulse-bg shadow-glow hover:brightness-110 active:brightness-95`}
      >
        Revoke
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      {action}
      {children}
      {errorMessage && status === "error" ? (
        <p className="max-w-[16rem] text-xs leading-5 text-pulse-red">
          {errorMessage}
        </p>
      ) : null}
      {status === "success" ? (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function EthereumErc20Confirm({
  approval,
  preflight,
  isRefreshing,
  onRefresh,
  onConfirm,
}: {
  approval: ScoredApproval;
  preflight: Erc20PreflightResult | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = preflight?.status === "active" && !isRefreshing;
  return (
    <div className="w-full max-w-xs rounded-xl border border-pulse-border/70 bg-pulse-bg/60 p-3 text-xs leading-5 text-pulse-muted sm:text-right">
      <p className="font-semibold text-pulse-text">Review Ethereum revoke</p>
      <p className="mt-1">
        Sets allowance to zero with{" "}
        <span className="font-mono text-pulse-text">
          approve({shortenAddress(approval.spenderAddress)}, 0)
        </span>
        . Gas is paid in {ETHEREUM_MAINNET_NATIVE_SYMBOL}.
      </p>
      <EthereumPreflightNotice
        activeLabel={
          preflight?.currentLabel
            ? `Current allowance: ${preflight.currentLabel}.`
            : "Current allowance is still active."
        }
        clearedLabel="Already cleared. No transaction is needed."
        preflight={preflight}
        isRefreshing={isRefreshing}
      />
      <div className="mt-3 flex gap-2 sm:justify-end">
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
          Confirm revoke
        </button>
      </div>
    </div>
  );
}

function EthereumNftConfirm({
  approval,
  preflight,
  isRefreshing,
  onRefresh,
  onConfirm,
}: {
  approval: NftApproval;
  preflight: NftPreflightResult | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
}) {
  const canConfirm = preflight?.status === "active" && !isRefreshing;
  const call =
    approval.kind === "approvalForAll"
      ? `setApprovalForAll(${shortenAddress(approval.operatorAddress)}, false)`
      : `approve(0x0, ${approval.tokenId?.toString() ?? "tokenId"})`;
  return (
    <div className="w-full max-w-xs rounded-xl border border-pulse-border/70 bg-pulse-bg/60 p-3 text-xs leading-5 text-pulse-muted sm:text-right">
      <p className="font-semibold text-pulse-text">Review Ethereum NFT revoke</p>
      <p className="mt-1">
        Sends <span className="font-mono text-pulse-text">{call}</span>. Gas is
        paid in {ETHEREUM_MAINNET_NATIVE_SYMBOL}.
      </p>
      <EthereumPreflightNotice
        activeLabel="Current approval is still active."
        clearedLabel={
          approval.kind === "approvalForAll"
            ? "Already cleared. The operator is no longer approved."
            : "Already cleared. The token approval no longer points to this operator."
        }
        preflight={preflight}
        isRefreshing={isRefreshing}
      />
      <div className="mt-3 flex gap-2 sm:justify-end">
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
          Confirm revoke
        </button>
      </div>
    </div>
  );
}

function EthereumPreflightNotice({
  activeLabel,
  clearedLabel,
  preflight,
  isRefreshing,
}: {
  activeLabel: string;
  clearedLabel: string;
  preflight: Erc20PreflightResult | NftPreflightResult | null;
  isRefreshing: boolean;
}) {
  if (isRefreshing || !preflight) {
    return (
      <p className="mt-2 rounded-lg border border-pulse-cyan/35 bg-pulse-cyan/10 p-2 text-pulse-cyan">
        Checking live approval before the wallet opens.
      </p>
    );
  }

  if (preflight.status === "active") {
    return (
      <p className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        {activeLabel}
      </p>
    );
  }

  if (preflight.status === "cleared") {
    return (
      <p className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        {clearedLabel}
      </p>
    );
  }

  return (
    <p className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-amber-200">
      Live verification failed
      {preflight.error ? ` (${preflight.error})` : ""}. Revoke is disabled.
    </p>
  );
}

function ReadOnlyAction({ title }: { title?: string }) {
  return (
    <div className="flex justify-stretch sm:justify-end">
      <span className="inline-flex w-full items-center justify-center rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-muted sm:w-auto">
        <span title={title}>Revoke disabled</span>
      </span>
    </div>
  );
}

function EthereumTxLink({ hash }: { hash: `0x${string}` }) {
  return (
    <a
      href={ethereumExplorerTxUrl(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-1 underline-offset-2 hover:text-pulse-cyan hover:underline"
    >
      Etherscan
    </a>
  );
}

function EmptyReadOnlyGroup({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm text-pulse-muted">
      No active {label} returned by the Ethereum API.
    </div>
  );
}

function EthereumCoverageNote({
  scan,
}: {
  scan: ReturnType<typeof useEthereumApprovalScan>;
}) {
  const diagnostics = scan.response?.diagnostics;
  return (
    <p className="text-xs leading-5 text-pulse-muted">
      Ethereum discovery uses the server read-only API, Etherscan API V2, and
      live Ethereum RPC validation before results are displayed. Gas on Ethereum
      is paid in {ETHEREUM_MAINNET_NATIVE_SYMBOL}. Explorer links open{" "}
      {ETHEREUM_MAINNET_EXPLORER_NAME}. Revoke transactions, when enabled, are
      wallet-side only and require a fresh live-read preflight before the wallet
      opens.
      {diagnostics?.discoveryTruncated
        ? " Discovery reported truncation, so this is not a complete clear state."
        : ""}
    </p>
  );
}

function EthereumDiagnostics({
  enabled,
  owner,
  walletChainId,
  wagmiChainId,
  scan,
  revokeEnabled,
  revokeDisabledReason,
}: {
  enabled: boolean;
  owner: Address;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  scan: ReturnType<typeof useEthereumApprovalScan>;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
}) {
  if (!enabled) return null;

  const response = scan.response;
  const diagnostics = response?.diagnostics;
  const rows: readonly [string, string][] = [
    ["Wallet", shortenAddress(owner)],
    ["Connected wallet chain ID", walletChainId?.toString() ?? "Unknown"],
    ["Wagmi state chain ID", wagmiChainId?.toString() ?? "Unknown"],
    ["Active scan mode", ETHEREUM_MAINNET_DISPLAY_NAME],
    ["API route", "/api/ethereum/approvals"],
    ["API status", response?.status ?? scan.status],
    ["Wallet-side revoke enabled", revokeEnabled ? "Yes" : "No"],
    ["Revoke disabled reason", revokeEnabled ? "None" : revokeDisabledReason],
    ["Chain ID", diagnostics?.chainId.toString() ?? "1"],
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
      "Incomplete verification",
      diagnostics?.incompleteVerificationCount.toString() ?? "Not returned",
    ],
    [
      "Discovery truncated",
      diagnostics ? (diagnostics.discoveryTruncated ? "Yes" : "No") : "Unknown",
    ],
  ];

  return (
    <section className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4 text-xs text-pulse-muted">
      <p className="font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
        Ethereum API diagnostics
      </p>
      <p className="mt-1 max-w-2xl leading-5">
        Enabled by <span className="font-mono text-pulse-text">?debug=1</span>.
        This panel reports the read-only API response and never prints secret
        values.
      </p>
      <dl className="mt-4 grid gap-2 lg:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 sm:grid-cols-[1fr_1.3fr]">
            <dt>{label}</dt>
            <dd className="break-words font-mono text-pulse-text">{value}</dd>
          </div>
        ))}
      </dl>
      {response?.missingConfig?.length ? (
        <DetailList title="Missing config" items={response.missingConfig} />
      ) : null}
      {response?.errors?.length ? (
        <DetailList title="Errors" items={response.errors} />
      ) : null}
      {response?.warnings?.length ? (
        <DetailList title="Warnings" items={response.warnings} />
      ) : null}
    </section>
  );
}

function StatePanel({
  tone,
  eyebrow,
  title,
  body,
  children,
}: {
  tone: "success" | "warning" | "error";
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  const toneClass = {
    success: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    error: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
  return (
    <div className={`rounded-2xl border p-6 text-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">
        {eyebrow}
      </p>
      <p className="mt-2 text-lg font-semibold text-pulse-text">{title}</p>
      <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">{body}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function DetailList({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs text-pulse-muted">
      <p className="font-semibold uppercase tracking-[0.14em] text-pulse-text">
        {title}
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item} className="break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EthereumScannerSkeleton() {
  return (
    <div className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan"
          aria-hidden
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Ethereum scan in progress
          </p>
          <p className="mt-1 text-sm text-pulse-muted">
            Reading the Ethereum approvals API and waiting for live validation
            diagnostics.
          </p>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskAssessment }) {
  const styles = {
    low: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    medium: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    high: "border-pulse-red/50 bg-pulse-red/15 text-pulse-red",
  }[risk.level];
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}
      title={risk.reason}
    >
      {risk.level} risk
    </span>
  );
}

function riskRank(level: RiskAssessment["level"]): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function sortScoredApprovals(
  approvals: readonly ScoredApproval[],
): ScoredApproval[] {
  return [...approvals].sort((a, b) => {
    const risk = riskRank(b.risk.level) - riskRank(a.risk.level);
    if (risk !== 0) return risk;
    if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
    return a.tokenSymbol.localeCompare(b.tokenSymbol);
  });
}

function sortNftApprovals(approvals: readonly NftApproval[]): NftApproval[] {
  return [...approvals].sort((a, b) => {
    const risk = riskRank(b.risk.level) - riskRank(a.risk.level);
    if (risk !== 0) return risk;
    if (a.kind !== b.kind) return a.kind === "approvalForAll" ? -1 : 1;
    return (a.collectionName ?? a.collectionAddress).localeCompare(
      b.collectionName ?? b.collectionAddress,
    );
  });
}
