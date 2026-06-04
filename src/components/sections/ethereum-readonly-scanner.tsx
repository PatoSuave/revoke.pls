"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Address } from "viem";

import {
  CurrentApprovalStateInline,
  VerificationTechnicalExplainer,
  ZeroAddressInline,
  isCurrentApprovalStateUnverifiedReason,
  type ApprovalVerificationKind,
} from "@/components/approvals/approval-readability";
import {
  EthereumGasDisclosure,
  GasEstimateDebugDetails,
  GasEstimateDetails,
  GasWarningDetails,
} from "@/components/approvals/gas-estimate-details";
import {
  RevokeReceipt,
  type RevokeReceiptDetails,
} from "@/components/approvals/revoke-receipt";
import { AccountCodeDelegationCard } from "@/components/sections/account-code-delegation-card";
import { TokenAvatar } from "@/components/tokens/token-avatar";
import { useEthereumApprovalScan } from "@/hooks/use-ethereum-approval-scan";
import { useTokenLogos } from "@/hooks/use-token-logos";
import { useRevokeApproval } from "@/hooks/use-revoke-approval";
import { useRevokeNftApproval } from "@/hooks/use-revoke-nft-approval";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_EXPLORER_NAME,
  ETHEREUM_MAINNET_NATIVE_SYMBOL,
  ETHEREUM_LIVE_VERIFICATION_LABEL,
  canEnableEthereumWalletRevoke,
  canEnableEthereumWalletRowRevoke,
  ethereumApprovalDisplayAllowance,
  ethereumExplorerAddressUrl,
  ethereumExplorerTokenUrl,
  ethereumExplorerTxUrl,
  ethereumTokenDisplayDescription,
  ethereumTokenDisplaySymbol,
  ethereumWalletRowRevokeDisabledReason,
  ethereumWalletRevokeDisabledReason,
} from "@/lib/ethereum-approval-client";
import { shortenAddress } from "@/lib/format";
import { ZERO_ADDRESS, type NftApproval } from "@/lib/nft-approvals";
import type {
  Erc20PreflightResult,
  NftPreflightResult,
} from "@/lib/preflight";
import type { SpenderProtocolMetadata } from "@/lib/registry";
import {
  WALLET_PROMPT_SAFETY_COPY,
  requiresGasWarningAcknowledgement,
} from "@/lib/revoke-gas";
import { scoreApprovals, type RiskAssessment, type ScoredApproval } from "@/lib/risk";
import { addressesEqual } from "@/lib/scan-target";
import { tokenLogoAddressKey } from "@/lib/token-logos";

export function EthereumReadOnlyScanner({
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
  const rowRevokeEnabled = canEnableEthereumWalletRowRevoke({
    mapping: scan.mapped,
    walletChainId,
    ownerAddress: owner,
    connectedAddress,
  });
  const rowRevokeDisabledReason = ethereumWalletRowRevokeDisabledReason({
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
      <section className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-xs font-semibold text-pulse-cyan">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-cyan"
                aria-hidden
              />
              {revokeEnabled
                ? "Ethereum revoke ready"
                : rowRevokeEnabled
                  ? "Ethereum verified rows available"
                : ETHEREUM_LIVE_VERIFICATION_LABEL}
            </span>
            <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-xs text-pulse-muted">
              {shortenAddress(owner)}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                revokeEnabled
                  ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
                  : rowRevokeEnabled
                    ? "border-pulse-green/30 bg-pulse-green/10 text-pulse-green"
                  : "border-pulse-border bg-pulse-panel/70 text-pulse-muted"
              }`}
            >
              {revokeEnabled
                ? "Wallet revoke available"
                : rowRevokeEnabled
                  ? "Verified row revoke available"
                : "Read-only scan"}
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
        rowRevokeEnabled={rowRevokeEnabled}
        revokeDisabledReason={revokeDisabledReason}
      />

      <AccountCodeDelegationCard
        owner={owner}
        chainId={ETHEREUM_MAINNET_CLIENT_CHAIN_ID}
        chainName={ETHEREUM_MAINNET_DISPLAY_NAME}
      />

      <EthereumScanContent
        scan={scan}
        owner={owner}
        erc20={scoredErc20}
        nft={sortedNft}
        activeCount={activeCount}
        revokeDisabledReason={revokeDisabledReason}
        rowRevokeEnabled={rowRevokeEnabled}
        rowRevokeDisabledReason={rowRevokeDisabledReason}
        debugMode={debugMode}
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
        rowRevokeEnabled={rowRevokeEnabled}
        rowRevokeDisabledReason={rowRevokeDisabledReason}
        connectedAddress={connectedAddress}
      />
    </div>
  );
}

function ReadOnlyNotice({
  revokeEnabled,
  rowRevokeEnabled,
  revokeDisabledReason,
}: {
  revokeEnabled: boolean;
  rowRevokeEnabled: boolean;
  revokeDisabledReason: string;
}) {
  const noticeClass = revokeEnabled || rowRevokeEnabled
    ? "border-pulse-green/35 bg-pulse-green/10"
    : "border-pulse-cyan/35 bg-pulse-cyan/10";
  const headingClass =
    revokeEnabled || rowRevokeEnabled ? "text-pulse-green" : "text-pulse-cyan";

  return (
    <div className={`rounded-2xl border p-4 text-sm ${noticeClass}`}>
      <p
        className={`text-xs font-semibold uppercase tracking-[0.16em] ${headingClass}`}
      >
        {revokeEnabled
          ? "Ethereum live verification complete"
          : rowRevokeEnabled
            ? "Ethereum verified rows available"
          : "Ethereum live verification"}
      </p>
      <p className="mt-2 leading-6 text-pulse-muted">
        {revokeEnabled
          ? "These Ethereum approvals were live-validated before revoke became available. Transactions still come from your connected wallet on Ethereum Mainnet; the API cannot sign, submit, or move funds."
          : rowRevokeEnabled
            ? `Ethereum verification is incomplete because some live contract reads failed or discovery did not finish. Rows that were individually confirmed by a live read can still be revoked one at a time from your connected wallet. Global scan status: ${formatGlobalScanReason(revokeDisabledReason)}`
          : `Ethereum approvals are checked through a read-only API and live RPC validation. ${revokeDisabledReason} Revoke stays disabled until current approval state can be confirmed.`}
      </p>
    </div>
  );
}

function formatGlobalScanReason(reason: string): string {
  return reason.replace(" - revoke unavailable.", ".");
}

function EthereumScanContent({
  scan,
  owner,
  erc20,
  nft,
  activeCount,
  revokeDisabledReason,
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  debugMode,
}: {
  scan: ReturnType<typeof useEthereumApprovalScan>;
  owner: Address;
  erc20: readonly ScoredApproval[];
  nft: readonly NftApproval[];
  activeCount: number;
  revokeDisabledReason: string;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  debugMode: boolean;
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
        title="Current approval state could not be fully confirmed"
        body="Pulse Revoke found approval history, but some live contract reads failed or discovery did not finish. The app could not confirm whether those approvals are active right now, so revoke stays disabled. Try rescanning; if the message remains, the contract or RPC may be temporarily unavailable or failing live approval reads."
      >
        <DetailList
          title="Technical detail"
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
            Verification incomplete - current approval state could not be fully confirmed.
          </p>
          <p className="mt-1 leading-6 text-pulse-muted">
            Pulse Revoke found approval history, but some live contract reads
            failed or discovery did not finish. Rows that were individually
            confirmed by a live read can still be revoked one at a time; rows
            whose current approval state could not be confirmed remain
            unavailable.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-100">
            Global scan status: {formatGlobalScanReason(revokeDisabledReason)}
          </p>
        </div>
      ) : null}

      {erc20.length > 0 ? (
        <ReadOnlyErc20Table
          approvals={erc20}
          owner={owner}
          rowRevokeEnabled={rowRevokeEnabled}
          rowRevokeDisabledReason={rowRevokeDisabledReason}
          onRevoked={scan.refetch}
          debugMode={debugMode}
        />
      ) : (
        <EmptyReadOnlyGroup label="ERC-20 approvals" />
      )}

      {nft.length > 0 ? (
        <ReadOnlyNftTable
          approvals={nft}
          owner={owner}
          rowRevokeEnabled={rowRevokeEnabled}
          rowRevokeDisabledReason={rowRevokeDisabledReason}
          onRevoked={scan.refetch}
          debugMode={debugMode}
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
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approvals: readonly ScoredApproval[];
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
}) {
  const tokenLogoAddresses = useMemo(
    () => approvals.map((approval) => approval.tokenAddress),
    [approvals],
  );
  const tokenLogos = useTokenLogos({
    chainId: ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
    tokenAddresses: tokenLogoAddresses,
  });

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
            <div className="flex min-w-0 items-center gap-3">
              <TokenAvatar
                symbol={ethereumTokenDisplaySymbol(approval.tokenSymbol)}
                logoUrl={
                  tokenLogos.logos[tokenLogoAddressKey(approval.tokenAddress)]
                    ?.imageUrl
                }
              />
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
              <ProtocolMetadataSummary
                metadata={approval.spenderProtocolMetadata}
              />
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
              <EthereumErc20ProofDetails approval={approval} owner={owner} />
            </div>

            <EthereumErc20Action
              approval={approval}
              owner={owner}
              rowRevokeEnabled={rowRevokeEnabled}
              rowRevokeDisabledReason={rowRevokeDisabledReason}
              onRevoked={onRevoked}
              debugMode={debugMode}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProtocolMetadataSummary({
  metadata,
}: {
  metadata?: SpenderProtocolMetadata;
}) {
  if (!metadata) return null;

  return (
    <dl className="mt-2 grid gap-1 rounded-lg border border-pulse-border/60 bg-pulse-bg/45 p-2 text-[11px] leading-5 text-pulse-muted">
      <MetadataRow label="Known protocol" value={metadata.protocolName} />
      <MetadataRow
        label="Contract status"
        value={
          metadata.contractStatus === "legacy"
            ? "Legacy contract"
            : "Current contract"
        }
      />
      <div className="grid gap-0.5">
        <dt className="font-semibold uppercase tracking-[0.12em]">Source</dt>
        <dd>
          <a
            href={metadata.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-pulse-cyan underline underline-offset-2 hover:text-pulse-text"
          >
            {metadata.sourceLabel}
          </a>
        </dd>
      </div>
      {metadata.assetLabel ? (
        <MetadataRow label="Documented asset" value={metadata.assetLabel} />
      ) : null}
      {metadata.note ? <MetadataRow label="Note" value={metadata.note} /> : null}
    </dl>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="font-semibold uppercase tracking-[0.12em]">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function ReadOnlyNftTable({
  approvals,
  owner,
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approvals: readonly NftApproval[];
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
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
              {approval.operatorAddress.toLowerCase() === ZERO_ADDRESS ? (
                <ZeroAddressInline className="mt-2" />
              ) : null}
              <p className="mt-1 text-[11px] text-pulse-muted">
                {approval.trusted ? "Registry label" : "Unknown operator"}
              </p>
              <ProtocolMetadataSummary
                metadata={approval.operatorProtocolMetadata}
              />
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
              <EthereumNftProofDetails approval={approval} owner={owner} />
            </div>

            <EthereumNftAction
              approval={approval}
              owner={owner}
              rowRevokeEnabled={rowRevokeEnabled}
              rowRevokeDisabledReason={rowRevokeDisabledReason}
              onRevoked={onRevoked}
              debugMode={debugMode}
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
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  onRevoked,
  debugMode,
}: {
  approval: ScoredApproval;
  owner: Address;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
  onRevoked: () => void;
  debugMode: boolean;
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

  if (!rowRevokeEnabled) {
    return (
      <ReadOnlyAction
        title={rowRevokeDisabledReason}
        verificationKind="erc20"
      />
    );
  }

  return (
    <EthereumActionShell
      status={revoke.status}
      hash={revoke.hash}
      errorMessage={revoke.errorMessage}
      receiptDetails={{
        kind: "erc20",
        chainId: approval.chainId,
        chainName: ETHEREUM_MAINNET_DISPLAY_NAME,
        assetLabel: "Token",
        assetValue: ethereumTokenDisplaySymbol(approval.tokenSymbol),
        counterpartyLabel: "Spender",
        counterpartyValue: approval.spenderLabel,
        verificationState: revoke.postRevokeVerificationState,
      }}
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
          debugMode={debugMode}
          onRefresh={() => void revoke.refreshPreflight()}
          onConfirm={() => void revoke.revoke()}
          onConfirmHighGas={() =>
            void revoke.revoke({ allowHighGasWarning: true })
          }
        />
      ) : null}
    </EthereumActionShell>
  );
}

function EthereumNftAction({
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
  const revoke = useRevokeNftApproval({
    target: approval,
    ownerAddress: owner,
    onSuccess: () => {
      setConfirming(false);
      onRevoked();
    },
  });

  if (!rowRevokeEnabled) {
    return (
      <ReadOnlyAction
        title={rowRevokeDisabledReason}
        verificationKind={
          approval.kind === "approvalForAll" ? "nft-operator" : "nft-token"
        }
      />
    );
  }

  return (
    <EthereumActionShell
      status={revoke.status}
      hash={revoke.hash}
      errorMessage={revoke.errorMessage}
      receiptDetails={{
        kind:
          approval.kind === "approvalForAll" ? "nft-operator" : "nft-token",
        chainId: approval.chainId,
        chainName: ETHEREUM_MAINNET_DISPLAY_NAME,
        assetLabel: "Collection / token",
        assetValue: ethereumNftReceiptAssetValue(approval),
        counterpartyLabel: "Operator",
        counterpartyValue: approval.operatorLabel,
        verificationState: revoke.postRevokeVerificationState,
      }}
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
          debugMode={debugMode}
          onRefresh={() => void revoke.refreshPreflight()}
          onConfirm={() => void revoke.revoke()}
          onConfirmHighGas={() =>
            void revoke.revoke({ allowHighGasWarning: true })
          }
        />
      ) : null}
    </EthereumActionShell>
  );
}

function ethereumNftReceiptAssetValue(approval: NftApproval): string {
  const collection = approval.collectionName ?? "Unnamed collection";
  if (approval.kind !== "tokenApproval") return collection;
  return `${collection} #${approval.tokenId?.toString() ?? "unknown"}`;
}

function EthereumActionShell({
  status,
  hash,
  errorMessage,
  receiptDetails,
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
  receiptDetails: RevokeReceiptDetails;
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
      <span className={`${base} border border-pulse-border bg-pulse-text/5 text-pulse-muted`}>
        Confirm in wallet...
      </span>
    );
  } else if (status === "pending") {
    action = (
      <span className={`${base} border border-pulse-border bg-pulse-text/5 text-pulse-muted`}>
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
        className={`${base} border border-pulse-border bg-pulse-text/5 text-pulse-text hover:bg-pulse-text/10`}
      >
        Try again
      </button>
    );
  } else if (confirming) {
    action = (
      <button
        type="button"
        onClick={onCancel}
        className={`${base} border border-pulse-border bg-pulse-text/5 text-pulse-muted hover:bg-pulse-text/10`}
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
        title="Verified row; revoke available"
        className={`${base} bg-pulse-gradient text-pulse-on-gradient shadow-glow hover:brightness-110 active:brightness-95`}
      >
        Revoke
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      {action}
      {children}
      {isReceiptStatus(status) ? (
        <div className="w-full min-w-0 sm:max-w-sm">
          <RevokeReceipt
            status={status}
            hash={hash}
            errorMessage={errorMessage}
            details={receiptDetails}
            onDismiss={status === "pending" ? undefined : onDismiss}
          />
        </div>
      ) : null}
    </div>
  );
}

function isReceiptStatus(
  status: ReturnType<typeof useRevokeApproval>["status"],
): status is "pending" | "success" | "rejected" | "error" {
  return (
    status === "pending" ||
    status === "success" ||
    status === "rejected" ||
    status === "error"
  );
}

function EthereumErc20Confirm({
  approval,
  preflight,
  isRefreshing,
  debugMode,
  onRefresh,
  onConfirm,
  onConfirmHighGas,
}: {
  approval: ScoredApproval;
  preflight: Erc20PreflightResult | null;
  isRefreshing: boolean;
  debugMode: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
  onConfirmHighGas: () => void;
}) {
  const [gasAcknowledged, setGasAcknowledged] = useState(false);
  const highGasWarning = preflight?.status === "highGasWarning";
  const needsGasAcknowledgement = requiresGasWarningAcknowledgement(
    preflight?.gasWarningLevel,
  );
  const canConfirm =
    (preflight?.status === "active" || highGasWarning) &&
    !isRefreshing &&
    (!needsGasAcknowledgement || gasAcknowledged);
  return (
    <div className="w-full max-w-xs rounded-xl border border-pulse-border/70 bg-pulse-bg/60 p-3 text-xs leading-5 text-pulse-muted sm:text-right">
      <p className="font-semibold text-pulse-text">Review transaction</p>
      <p className="mt-1">
        Sets allowance to zero with{" "}
        <span className="font-mono text-pulse-text">
          approve({shortenAddress(approval.spenderAddress)}, 0)
        </span>
        . Gas is paid in {ETHEREUM_MAINNET_NATIVE_SYMBOL}.
      </p>
      <EthereumGasDisclosure />
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        {WALLET_PROMPT_SAFETY_COPY}
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
        debugMode={debugMode}
      />
      {needsGasAcknowledgement ? (
        <label className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 p-2 text-left text-amber-100">
          <input
            type="checkbox"
            checked={gasAcknowledged}
            onChange={(event) => setGasAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 accent-amber-300"
          />
          <span>
            I understand this revoke has an unusually high gas estimate and I
            will cancel if the wallet prompt shows a transfer or unreasonable
            fee.
          </span>
        </label>
      ) : null}
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
          onClick={highGasWarning ? onConfirmHighGas : onConfirm}
          disabled={!canConfirm}
          className="rounded-lg bg-pulse-gradient px-2.5 py-1.5 font-semibold text-pulse-on-gradient shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {highGasWarning ? "Continue to wallet anyway" : "Confirm revoke"}
        </button>
      </div>
    </div>
  );
}

function EthereumNftConfirm({
  approval,
  preflight,
  isRefreshing,
  debugMode,
  onRefresh,
  onConfirm,
  onConfirmHighGas,
}: {
  approval: NftApproval;
  preflight: NftPreflightResult | null;
  isRefreshing: boolean;
  debugMode: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
  onConfirmHighGas: () => void;
}) {
  const [gasAcknowledged, setGasAcknowledged] = useState(false);
  const highGasWarning = preflight?.status === "highGasWarning";
  const needsGasAcknowledgement = requiresGasWarningAcknowledgement(
    preflight?.gasWarningLevel,
  );
  const canConfirm =
    (preflight?.status === "active" || highGasWarning) &&
    !isRefreshing &&
    (!needsGasAcknowledgement || gasAcknowledged);
  const call =
    approval.kind === "approvalForAll"
      ? `setApprovalForAll(${shortenAddress(approval.operatorAddress)}, false)`
      : `approve(0x0, ${approval.tokenId?.toString() ?? "tokenId"})`;
  return (
    <div className="w-full max-w-xs rounded-xl border border-pulse-border/70 bg-pulse-bg/60 p-3 text-xs leading-5 text-pulse-muted sm:text-right">
      <p className="font-semibold text-pulse-text">Review transaction</p>
      <p className="mt-1">
        Sends <span className="font-mono text-pulse-text">{call}</span>. Gas is
        paid in {ETHEREUM_MAINNET_NATIVE_SYMBOL}.
      </p>
      <EthereumGasDisclosure />
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        {WALLET_PROMPT_SAFETY_COPY}
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
        debugMode={debugMode}
      />
      {needsGasAcknowledgement ? (
        <label className="mt-2 flex items-start gap-2 rounded-lg border border-amber-400/35 bg-amber-400/10 p-2 text-left text-amber-100">
          <input
            type="checkbox"
            checked={gasAcknowledged}
            onChange={(event) => setGasAcknowledged(event.target.checked)}
            className="mt-1 h-4 w-4 accent-amber-300"
          />
          <span>
            I understand this revoke has an unusually high gas estimate and I
            will cancel if the wallet prompt shows a transfer or unreasonable
            fee.
          </span>
        </label>
      ) : null}
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
          onClick={highGasWarning ? onConfirmHighGas : onConfirm}
          disabled={!canConfirm}
          className="rounded-lg bg-pulse-gradient px-2.5 py-1.5 font-semibold text-pulse-on-gradient shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
        >
          {highGasWarning ? "Continue to wallet anyway" : "Confirm revoke"}
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
  debugMode,
}: {
  activeLabel: string;
  clearedLabel: string;
  preflight: Erc20PreflightResult | NftPreflightResult | null;
  isRefreshing: boolean;
  debugMode: boolean;
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
      <div className="mt-2 rounded-lg border border-pulse-green/40 bg-pulse-green/10 p-2 text-pulse-green">
        <p>{activeLabel}</p>
        <GasEstimateDetails
          preflight={preflight}
          chainName={ETHEREUM_MAINNET_DISPLAY_NAME}
          nativeSymbol={ETHEREUM_MAINNET_NATIVE_SYMBOL}
        />
        <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
      </div>
    );
  }

  if (preflight.status === "highGasWarning") {
    return (
      <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-amber-200">
        <GasWarningDetails
          preflight={preflight}
          chainName={ETHEREUM_MAINNET_DISPLAY_NAME}
        />
        <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
      </div>
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
    <div className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 p-2 text-amber-200">
      <p>
        Revoke preflight failed
        {preflight.error ? ` (${preflight.error})` : ""}. Revoke is
        unavailable.
      </p>
      <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
    </div>
  );
}

function EthereumErc20ProofDetails({
  approval,
  owner,
}: {
  approval: ScoredApproval;
  owner: Address;
}) {
  const allowance = ethereumApprovalDisplayAllowance({
    formattedAllowance: approval.formattedAllowance,
    unlimited: approval.unlimited,
  });

  return (
    <details className="mt-2 text-left text-[11px] leading-5 text-pulse-muted">
      <summary className="cursor-pointer font-semibold text-pulse-cyan">
        Why is this approval shown?
      </summary>
      <div className="mt-2 rounded-lg border border-pulse-border/70 bg-pulse-bg/45 p-2">
        <p>
          This approval was discovered from historical approval events and
          confirmed with a live RPC read. Other approval tools may use different
          indexes, filters, token lists, or spam protections.
        </p>
        <VerificationTechnicalExplainer />
        <dl className="mt-2 grid gap-1 font-mono">
          <ProofRow label="Type" value="ERC-20 approve allowance" />
          <ProofRow label="Token" value={approval.tokenAddress} />
          <ProofRow label="Owner" value={owner} />
          <ProofRow label="Spender" value={approval.spenderAddress} />
          <ProofRow label="Live allowance" value={allowance} />
          <ProofRow label="Live verification" value="allowance(owner, spender) > 0" />
          <ProofRow
            label="Candidate source"
            value="Historical Approval events via Ethereum API"
          />
        </dl>
      </div>
    </details>
  );
}

function EthereumNftProofDetails({
  approval,
  owner,
}: {
  approval: NftApproval;
  owner: Address;
}) {
  const type =
    approval.kind === "approvalForAll"
      ? `${approval.standard === "erc1155" ? "ERC-1155" : "ERC-721"} setApprovalForAll`
      : "ERC-721 approve token";
  const liveState =
    approval.kind === "approvalForAll"
      ? "isApprovedForAll(owner, operator) == true"
      : `getApproved(${approval.tokenId?.toString() ?? "tokenId"}) == operator`;

  return (
    <details className="mt-2 text-left text-[11px] leading-5 text-pulse-muted">
      <summary className="cursor-pointer font-semibold text-pulse-cyan">
        Why is this approval shown?
      </summary>
      <div className="mt-2 rounded-lg border border-pulse-border/70 bg-pulse-bg/45 p-2">
        <p>
          This approval was discovered from historical approval events and
          confirmed with a live RPC read. Other approval tools may use different
          indexes, filters, token lists, or spam protections.
        </p>
        <VerificationTechnicalExplainer />
        <dl className="mt-2 grid gap-1 font-mono">
          <ProofRow label="Type" value={type} />
          <ProofRow label="Collection" value={approval.collectionAddress} />
          <ProofRow label="Owner" value={owner} />
          <ProofRow label="Operator" value={approval.operatorAddress} />
          <ProofRow label="Live approval state" value={liveState} />
          <ProofRow
            label="Candidate source"
            value="Historical Approval events via Ethereum API"
          />
        </dl>
      </div>
    </details>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-pulse-muted">{label}</dt>
      <dd className="break-words text-pulse-text">{value}</dd>
    </div>
  );
}

function ReadOnlyAction({
  title,
  verificationKind,
}: {
  title?: string;
  verificationKind?: ApprovalVerificationKind;
}) {
  const showVerificationHint =
    verificationKind !== undefined &&
    isCurrentApprovalStateUnverifiedReason(title);

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <span className="inline-flex w-full items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-3 py-2 text-xs font-semibold text-pulse-muted sm:w-auto">
        <span title={title}>Revoke unavailable</span>
      </span>
      {showVerificationHint && verificationKind ? (
        <CurrentApprovalStateInline
          kind={verificationKind}
          className="sm:text-right"
        />
      ) : null}
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
      {diagnostics?.candidateCapHit
        ? " The public API candidate cap was reached, so this is not a complete clear state."
        : ""}
      {diagnostics?.requestTimedOut
        ? " The request timed out before all checks completed, so this is not a complete clear state."
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
  rowRevokeEnabled,
  rowRevokeDisabledReason,
  connectedAddress,
}: {
  enabled: boolean;
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  scan: ReturnType<typeof useEthereumApprovalScan>;
  revokeEnabled: boolean;
  revokeDisabledReason: string;
  rowRevokeEnabled: boolean;
  rowRevokeDisabledReason: string;
}) {
  if (!enabled) return null;

  const response = scan.response;
  const diagnostics = response?.diagnostics;
  const skippedReasons = diagnostics?.skippedReasons ?? {};
  const walletMatchesScanTarget = connectedAddress
    ? addressesEqual(connectedAddress, owner)
    : null;
  const scanMode = walletMatchesScanTarget
    ? "connected-wallet-matches-scanned-address"
    : "address-only";
  const rows: readonly [string, string][] = [
    ["Scan mode", scanMode],
    ["Scan target address", shortenAddress(owner)],
    ["Wallet connected", connectedAddress ? "Yes" : "No"],
    ["Wallet", connectedAddress ? shortenAddress(connectedAddress) : "Not connected"],
    [
      "Wallet matches scan target",
      walletMatchesScanTarget === null
        ? "Not connected"
        : walletMatchesScanTarget
          ? "Yes"
          : "No",
    ],
    ["Connected wallet chain ID", walletChainId?.toString() ?? "Unknown"],
    ["Wagmi state chain ID", wagmiChainId?.toString() ?? "Unknown"],
    ["Discovery target chain", ETHEREUM_MAINNET_DISPLAY_NAME],
    ["API route", "/api/ethereum/approvals"],
    ["API status", response?.status ?? scan.status],
    ["Global scan revoke enabled", revokeEnabled ? "Yes" : "No"],
    ["Revoke unavailable reason", revokeEnabled ? "None" : revokeDisabledReason],
    ["Verified row revoke enabled", rowRevokeEnabled ? "Yes" : "No"],
    [
      "Row revoke reason",
      rowRevokeEnabled ? "Verified row; revoke available" : rowRevokeDisabledReason,
    ],
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
      "Decoded Permit2 approvals",
      diagnostics?.decodedPermit2ApprovalCount?.toString() ?? "Not returned",
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
      "ERC-20 live read failures",
      diagnostics
        ? (skippedReasons["erc20-live-read-failure"] ?? 0).toString()
        : "Not returned",
    ],
    [
      "Permit2 live read failures",
      diagnostics
        ? (skippedReasons["permit2-live-read-failure"] ?? 0).toString()
        : "Not returned",
    ],
    [
      "NFT live read failures",
      diagnostics
        ? (skippedReasons["nft-live-read-failure"] ?? 0).toString()
        : "Not returned",
    ],
    [
      "Incomplete verification",
      diagnostics?.incompleteVerificationCount.toString() ?? "Not returned",
    ],
    [
      "Skipped approvals",
      diagnostics?.skippedApprovalCount.toString() ?? "Not returned",
    ],
    [
      "Skipped reason breakdown",
      diagnostics
        ? formatSkippedReasonBreakdown(diagnostics.skippedReasons)
        : "Not returned",
    ],
    [
      "Discovery truncated",
      diagnostics ? (diagnostics.discoveryTruncated ? "Yes" : "No") : "Unknown",
    ],
    [
      "Request timed out",
      diagnostics ? (diagnostics.requestTimedOut ? "Yes" : "No") : "Unknown",
    ],
    ["Rate limited", diagnostics ? (diagnostics.rateLimited ? "Yes" : "No") : "Unknown"],
    [
      "Candidate cap hit",
      diagnostics ? (diagnostics.candidateCapHit ? "Yes" : "No") : "Unknown",
    ],
    [
      "Live-read candidate cap",
      diagnostics?.liveReadCandidateCap.toString() ?? "Not returned",
    ],
    [
      "Live-read candidates total",
      diagnostics?.liveReadCandidatesTotal.toString() ?? "Not returned",
    ],
    [
      "Live-read candidates checked",
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

function formatSkippedReasonBreakdown(reasons: Record<string, number>): string {
  const entries = Object.entries(reasons).filter(([, count]) => count > 0);
  if (entries.length === 0) return "None";
  return entries
    .map(([reason, count]) => `${reason}: ${count}`)
    .join("; ");
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
