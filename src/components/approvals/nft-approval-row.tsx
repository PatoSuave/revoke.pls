"use client";

import { useState } from "react";
import type { Address } from "viem";

import {
  ApprovalMeaningPanel,
  SummaryText,
  protocolMetadataItems,
} from "@/components/approvals/approval-readability";
import {
  GasEstimateDebugDetails,
  GasEstimateDetails,
  GasWarningDetails,
} from "@/components/approvals/gas-estimate-details";
import {
  RevokeReceipt,
  type RevokeReceiptDetails,
} from "@/components/approvals/revoke-receipt";
import { useRevokeNftApproval } from "@/hooks/use-revoke-nft-approval";
import { getChainConfig, type SupportedChainConfig } from "@/lib/chains";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import type { NftApproval, NftStandard } from "@/lib/nft-approvals";
import {
  BSC_GAS_CAP_BODY,
  BSC_GAS_CAP_HELPER,
  BSC_GAS_CAP_TITLE,
  type NftPreflightResult,
} from "@/lib/preflight";
import { requiresGasWarningAcknowledgement } from "@/lib/revoke-gas";
import type { RiskLevel } from "@/lib/risk";

export function NftApprovalRow({
  approval,
  ownerAddress,
  onRevoked,
  revokeDisabledReason,
  debugMode = false,
}: {
  approval: NftApproval;
  ownerAddress: Address;
  onRevoked?: (hash: `0x${string}`) => void;
  revokeDisabledReason?: string | null;
  debugMode?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  const {
    status,
    hash,
    errorMessage,
    isBusy,
    preflight,
    isRefreshingApproval,
    refreshPreflight,
    revoke,
    reset,
  } =
    useRevokeNftApproval({
      target: approval,
      ownerAddress,
      onSuccess: (h) => {
        setConfirming(false);
        onRevoked?.(h);
      },
    });

  const chainId = approval.chainId;
  const chainConfig = getChainConfig(chainId);
  const chainName = chainConfig?.displayName ?? "the network";
  const showConfirm =
    confirming &&
    (status === "idle" || status === "refreshing") &&
    !revokeDisabledReason;
  const showStatus = status !== "idle" && status !== "refreshing";

  const tokenIdLabel =
    approval.kind === "tokenApproval" && approval.tokenId !== undefined
      ? `#${approval.tokenId.toString()}`
      : null;

  return (
    <li className="border-b border-pulse-border/60 transition last:border-b-0 hover:bg-white/[0.025]">
      <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-[1.2fr_1.45fr_1fr_auto] sm:items-center sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <CollectionAvatar name={approval.collectionName ?? "NFT"} />
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-pulse-text">
                {approval.collectionName ?? "Unnamed collection"}
                {tokenIdLabel ? (
                  <span className="ml-1.5 font-mono text-xs text-pulse-muted">
                    {tokenIdLabel}
                  </span>
                ) : null}
              </p>
              <RiskBadge risk={approval.risk} compact />
            </div>
            <ExplorerLink chainId={chainId} address={approval.collectionAddress} />
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted sm:hidden">
            Operator
          </p>
          <p className="mt-1 truncate text-sm font-medium text-pulse-text sm:mt-0">
            {approval.operatorLabel}
          </p>
          <p className="truncate text-xs text-pulse-muted">
            <ExplorerLink chainId={chainId} address={approval.operatorAddress} inline />
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StandardBadge standard={approval.standard} chainConfig={chainConfig} />
            <KindBadge kind={approval.kind} />
            {approval.trusted ? (
              <TrustedBadge
                verificationMethod={approval.operatorVerificationMethod}
              />
            ) : (
              <UnverifiedBadge />
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-1.5 rounded-xl border border-pulse-border/60 bg-pulse-panel/35 p-3 sm:border-0 sm:bg-transparent sm:p-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted sm:hidden">
            Permission
          </p>
          <span className="text-[11px] text-pulse-muted">
            {approval.kind === "approvalForAll"
              ? "Collection-wide"
              : "Single NFT"}
          </span>
        </div>

        <div className="flex justify-stretch sm:justify-end">
          <RowAction
            status={status}
            hash={hash}
            chainId={chainId}
            isBusy={isBusy}
            confirming={confirming}
            onConfirmClick={() => {
              setConfirming(true);
              void refreshPreflight();
            }}
            onCancel={() => setConfirming(false)}
            onRetry={() => {
              reset();
              setConfirming(true);
              void refreshPreflight();
            }}
            revokeDisabledReason={revokeDisabledReason}
          />
        </div>
      </div>

      <ApprovalMeaningPanel
        items={[
          {
            label: "Collection / token",
            value: (
              <SummaryText
                primary={approval.collectionName ?? "Unnamed collection"}
                secondary={
                  tokenIdLabel
                    ? `Token ${tokenIdLabel}`
                    : approval.collectionAddress
                }
              />
            ),
          },
          {
            label: "Operator",
            value: (
              <SummaryText
                primary={approval.operatorLabel}
                secondary={
                  approval.trusted || approval.operatorProtocolMetadata
                    ? "Identified operator"
                    : "Unknown operator"
                }
              />
            ),
          },
          ...protocolMetadataItems(approval.operatorProtocolMetadata),
          {
            label: "Permission type",
            value: (
              <SummaryText
                primary={
                  approval.kind === "approvalForAll"
                    ? "Operator approval"
                    : "Per-token approval"
                }
                secondary={nftPermissionCopy(approval)}
              />
            ),
          },
          {
            label: "Risk level",
            value: (
              <SummaryText
                primary={riskLevelLabel(approval.risk.level)}
                secondary={approval.risk.reason}
              />
            ),
          },
          {
            label: "Recommended action",
            value:
              "Revoke if you do not recognize this operator or no longer use the connected app.",
          },
        ]}
        technicalDetails={
          <NftProofDetails
            approval={approval}
            ownerAddress={ownerAddress}
            chainName={chainName}
          />
        }
      />

      {showConfirm ? (
        <ConfirmPanel
          approval={approval}
          chainName={chainName}
          nativeSymbol={chainConfig?.nativeSymbol}
          onCancel={() => setConfirming(false)}
          preflight={preflight}
          isRefreshingApproval={isRefreshingApproval}
          debugMode={debugMode}
          onRefresh={() => void refreshPreflight()}
          onConfirm={() => void revoke()}
          onConfirmHighGas={() =>
            void revoke({ allowHighGasWarning: true })
          }
        />
      ) : null}

      {showStatus ? (
        <StatusPanel
          status={status}
          hash={hash}
          errorMessage={errorMessage}
          receiptDetails={{
            kind:
              approval.kind === "approvalForAll"
                ? "nft-operator"
                : "nft-token",
            chainId,
            chainName,
            assetLabel: "Collection / token",
            assetValue: nftReceiptAssetValue(approval, tokenIdLabel),
            counterpartyLabel: "Operator",
            counterpartyValue: approval.operatorLabel,
          }}
          onDismiss={reset}
        />
      ) : null}
    </li>
  );
}

function NftProofDetails({
  approval,
  ownerAddress,
  chainName,
}: {
  approval: NftApproval;
  ownerAddress: Address;
  chainName: string;
}) {
  const approvalType =
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
          confirmed with a live approval read before display.
        </p>
        <dl className="mt-2 grid gap-1 font-mono">
          <ProofRow label="Chain" value={chainName} />
          <ProofRow label="Type" value={approvalType} />
          <ProofRow label="Collection" value={approval.collectionAddress} />
          <ProofRow label="Owner" value={ownerAddress} />
          <ProofRow label="Operator" value={approval.operatorAddress} />
          <ProofRow label="Current live approval" value={liveState} />
          <ProofRow label="Live verification" value={liveState} />
          <ProofRow label="Candidate source" value="Historical Approval events" />
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

function nftPermissionCopy(approval: NftApproval): string {
  if (approval.kind === "approvalForAll") {
    return "This operator can manage all NFTs from this collection.";
  }

  return "This operator can manage this NFT approval.";
}

function nftReceiptAssetValue(
  approval: NftApproval,
  tokenIdLabel: string | null,
): string {
  const collection = approval.collectionName ?? "Unnamed collection";
  return tokenIdLabel ? `${collection} ${tokenIdLabel}` : collection;
}

function riskLevelLabel(level: RiskLevel): string {
  return `${level[0].toUpperCase()}${level.slice(1)} risk`;
}

const RISK_STYLES: Record<
  RiskLevel,
  { pill: string; dot: string; label: string }
> = {
  low: {
    pill: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    dot: "bg-pulse-green",
    label: "Low risk",
  },
  medium: {
    pill: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-300",
    label: "Medium risk",
  },
  high: {
    pill: "border-pulse-red/50 bg-pulse-red/15 text-pulse-red",
    dot: "bg-pulse-red",
    label: "High risk",
  },
};

function RiskBadge({
  risk,
  compact = false,
}: {
  risk: NftApproval["risk"];
  compact?: boolean;
}) {
  const style = RISK_STYLES[risk.level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-wide ${style.pill} ${
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
      }`}
      title={risk.reason}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
      {style.label}
    </span>
  );
}

function StandardBadge({
  standard,
  chainConfig,
}: {
  standard: NftStandard;
  chainConfig: SupportedChainConfig | undefined;
}) {
  const label =
    standard === "erc721"
      ? chainConfig?.standardLabels.nft ?? "NFT"
      : standard === "erc1155"
      ? chainConfig?.standardLabels.multiToken ?? "multi-token NFT"
      : "Standard unknown";
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title={
        standard === "unknown"
          ? "Collection did not report a known NFT standard."
          : "Detected through the standard NFT interface check."
      }
    >
      {label}
    </span>
  );
}

function KindBadge({ kind }: { kind: NftApproval["kind"] }) {
  const label = kind === "approvalForAll" ? "Operator (all)" : "Per-token";
  const title =
    kind === "approvalForAll"
      ? "ApprovalForAll — the operator can move every NFT in this collection."
      : "Per-token approve — the operator can move a single tokenId.";
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title={title}
    >
      {label}
    </span>
  );
}

function TrustedBadge({
  verificationMethod,
}: {
  verificationMethod?: string;
}) {
  const title = verificationMethod
    ? `Known operator — ${verificationMethod} This is not an absolute safety claim.`
    : "Operator address matches a manually verified entry in the Pulse Revoke registry. This is not an absolute safety claim.";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-pulse-cyan/40 bg-pulse-cyan/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-cyan"
      title={title}
    >
      Known
    </span>
  );
}

function UnverifiedBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full border border-pulse-border bg-pulse-bg/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse-muted"
      title="This operator is not in the verified registry. Verify the contract before leaving an approval in place."
    >
      Unverified
    </span>
  );
}

function RowAction({
  status,
  hash,
  chainId,
  isBusy,
  confirming,
  onConfirmClick,
  onCancel,
  onRetry,
  revokeDisabledReason,
}: {
  status: ReturnType<typeof useRevokeNftApproval>["status"];
  hash?: `0x${string}`;
  chainId: number;
  isBusy: boolean;
  confirming: boolean;
  onConfirmClick: () => void;
  onCancel: () => void;
  onRetry: () => void;
  revokeDisabledReason?: string | null;
}) {
  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed sm:w-auto";

  if (status === "refreshing") {
    return (
      <span
        className={`${base} border border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan`}
      >
        <Spinner /> Refreshing...
      </span>
    );
  }

  if (status === "wallet") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        <Spinner /> Confirm in wallet...
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted`}
      >
        <Spinner /> Confirming...
        {hash ? <TxLink chainId={chainId} hash={hash} /> : null}
      </span>
    );
  }
  if (status === "success") {
    return (
      <span
        className={`${base} border border-pulse-green/40 bg-pulse-green/10 text-pulse-green`}
      >
        Revoked
        {hash ? <TxLink chainId={chainId} hash={hash} tone="success" /> : null}
      </span>
    );
  }
  if (revokeDisabledReason) {
    return (
      <span
        className={`${base} border border-amber-400/40 bg-amber-400/10 text-amber-200`}
        title={revokeDisabledReason}
      >
        Revoke unavailable
      </span>
    );
  }
  if (status === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} border border-pulse-red/40 bg-pulse-red/10 text-pulse-red hover:bg-pulse-red/20`}
      >
        Retry
      </button>
    );
  }
  if (status === "rejected") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={`${base} border border-pulse-border bg-white/5 text-pulse-text hover:bg-white/10`}
      >
        Try again
      </button>
    );
  }
  if (confirming) {
    return (
      <button
        type="button"
        onClick={onCancel}
        className={`${base} border border-pulse-border bg-white/5 text-pulse-muted hover:bg-white/10`}
      >
        Cancel
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onConfirmClick}
      disabled={isBusy}
      className={`${base} bg-pulse-gradient text-pulse-bg shadow-glow hover:brightness-110 active:brightness-95`}
    >
      Review revoke
    </button>
  );
}

function ConfirmPanel({
  approval,
  chainName,
  nativeSymbol,
  onCancel,
  preflight,
  isRefreshingApproval,
  debugMode,
  onRefresh,
  onConfirm,
  onConfirmHighGas,
}: {
  approval: NftApproval;
  chainName: string;
  nativeSymbol?: string;
  onCancel: () => void;
  preflight: NftPreflightResult | null;
  isRefreshingApproval: boolean;
  debugMode: boolean;
  onRefresh: () => void;
  onConfirm: () => void;
  onConfirmHighGas: () => void;
}) {
  const [gasAcknowledged, setGasAcknowledged] = useState(false);
  const gas = nativeSymbol ? `Paid in ${nativeSymbol} gas.` : "Gas fees apply.";
  const highGasWarning = preflight?.status === "highGasWarning";
  const needsGasAcknowledgement = requiresGasWarningAcknowledgement(
    preflight?.gasWarningLevel,
  );
  const canConfirm =
    (preflight?.status === "active" || highGasWarning) &&
    !isRefreshingApproval &&
    (!needsGasAcknowledgement || gasAcknowledged);
  const summary =
    approval.kind === "approvalForAll"
      ? `Sends setApprovalForAll(${shortenAddress(
          approval.operatorAddress,
        )}, false) on ${chainName}. This clears collection-wide operator access. ${gas}`
      : `Sends approve(0x0, ${approval.tokenId?.toString()}) on ${chainName}. This clears the per-token approval. The call will revert if you no longer own the NFT. ${gas}`;

  return (
    <div className="border-t border-pulse-border/60 bg-pulse-bg/50 px-4 py-4 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
            Review transaction
          </p>
          <p className="mt-1 font-medium text-pulse-text">
            Revoke{" "}
            <span className="font-semibold">
              {approval.collectionName ?? shortenAddress(approval.collectionAddress)}
            </span>{" "}
            approval for{" "}
            <span className="font-semibold">{approval.operatorLabel}</span>?
          </p>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">{summary}</p>
          <p className="mt-1 text-xs leading-5 text-pulse-muted">
            Pulse Revoke cannot transfer NFTs. Your wallet shows the final
            transaction before you sign.
          </p>
          <NftPreflightNotice
            approval={approval}
            preflight={preflight}
            isRefreshingApproval={isRefreshingApproval}
            chainName={chainName}
            nativeSymbol={nativeSymbol}
            debugMode={debugMode}
          />
          <p className="mt-2 rounded-xl border border-pulse-border/70 bg-pulse-panel/45 p-3 text-xs leading-5 text-pulse-muted">
            {approval.risk.reason}
          </p>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 sm:flex-none"
          >
            Cancel
          </button>
          {canConfirm ? null : (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshingApproval}
              className="flex-1 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
            >
              {isRefreshingApproval ? "Refreshing..." : "Refresh"}
            </button>
          )}
          <button
            type="button"
            onClick={highGasWarning ? onConfirmHighGas : onConfirm}
            disabled={!canConfirm}
            className="flex-1 rounded-xl bg-pulse-gradient px-3 py-2 text-xs font-semibold text-pulse-bg shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {highGasWarning ? "Continue to wallet anyway" : "Confirm revoke"}
          </button>
        </div>
      </div>
      {needsGasAcknowledgement ? (
        <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
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
    </div>
  );
}

function NftPreflightNotice({
  approval,
  preflight,
  isRefreshingApproval,
  chainName,
  nativeSymbol,
  debugMode,
}: {
  approval: NftApproval;
  preflight: NftPreflightResult | null;
  isRefreshingApproval: boolean;
  chainName: string;
  nativeSymbol?: string;
  debugMode: boolean;
}) {
  if (isRefreshingApproval) {
    return (
      <PreflightBox tone="info">
        <span className="flex items-center gap-2">
          <Spinner /> Refreshing current approval...
        </span>
      </PreflightBox>
    );
  }

  if (!preflight) {
    return (
      <PreflightBox tone="info">
        Refreshing current approval before the wallet opens.
      </PreflightBox>
    );
  }

  if (preflight.status === "active") {
    return (
      <PreflightBox tone="success">
        <span>Current approval is still active.</span>
        <GasEstimateDetails
          preflight={preflight}
          chainName={chainName}
          nativeSymbol={nativeSymbol}
        />
        <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
      </PreflightBox>
    );
  }

  if (preflight.status === "highGasWarning") {
    return (
      <PreflightBox tone="warning">
        <GasWarningDetails preflight={preflight} chainName={chainName} />
        <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
      </PreflightBox>
    );
  }

  if (preflight.status === "cleared") {
    return (
      <PreflightBox tone="success">
        Already cleared.{" "}
        {approval.kind === "approvalForAll"
          ? "The operator is no longer approved for the collection."
          : "The token approval no longer points to this operator."}
      </PreflightBox>
    );
  }

  if (preflight.gasCapExceeded) {
    return (
      <PreflightBox tone="warning">
        <span className="font-semibold text-pulse-text">
          {BSC_GAS_CAP_TITLE}
        </span>
        <span>{BSC_GAS_CAP_BODY}</span>
        <GasEstimateDetails
          preflight={preflight}
          chainName={chainName}
          nativeSymbol={nativeSymbol}
        />
        <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
        <span>{BSC_GAS_CAP_HELPER}</span>
      </PreflightBox>
    );
  }

  return (
    <PreflightBox tone="warning">
      Could not complete revoke preflight
      {preflight.error ? ` (${preflight.error})` : ""}. No revoke transaction
      will be sent from this prompt.
      <GasEstimateDebugDetails enabled={debugMode} preflight={preflight} />
    </PreflightBox>
  );
}

function PreflightBox({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "info" | "success" | "warning";
}) {
  const toneClass = {
    info: "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan",
    success: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  }[tone];

  return (
    <div
      className={`mt-3 flex flex-col gap-1.5 rounded-xl border p-3 text-xs leading-5 ${toneClass}`}
    >
      {children}
    </div>
  );
}

function StatusPanel({
  status,
  hash,
  errorMessage,
  receiptDetails,
  onDismiss,
}: {
  status: ReturnType<typeof useRevokeNftApproval>["status"];
  hash?: `0x${string}`;
  errorMessage?: string;
  receiptDetails: RevokeReceiptDetails;
  onDismiss: () => void;
}) {
  if (status === "wallet") {
    return (
      <StatusRow tone="info">
        Open your wallet and review the NFT approval reset before signing.
      </StatusRow>
    );
  }
  if (status === "pending") {
    return (
      <RevokeReceipt
        status={status}
        hash={hash}
        details={receiptDetails}
      />
    );
  }
  if (status === "success") {
    return (
      <RevokeReceipt
        status={status}
        hash={hash}
        details={receiptDetails}
        onDismiss={onDismiss}
      />
    );
  }
  if (status === "rejected") {
    return (
      <RevokeReceipt
        status={status}
        hash={hash}
        errorMessage={errorMessage}
        details={receiptDetails}
        onDismiss={onDismiss}
      />
    );
  }
  if (status === "error") {
    return (
      <RevokeReceipt
        status={status}
        hash={hash}
        errorMessage={errorMessage}
        details={receiptDetails}
        onDismiss={onDismiss}
      />
    );
  }
  return null;
}

function StatusRow({
  children,
  tone,
  onDismiss,
}: {
  children: React.ReactNode;
  tone: "info" | "success" | "error" | "muted";
  onDismiss?: () => void;
}) {
  const toneClass = {
    info: "border-pulse-border/70 bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    error: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
    muted: "border-pulse-border/70 bg-pulse-bg/50 text-pulse-muted",
  }[tone];

  return (
    <div
      className={`flex items-start justify-between gap-3 border-t px-4 py-3 text-xs sm:px-6 ${toneClass}`}
    >
      <p className="flex-1">{children}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide hover:bg-white/5"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function TxLink({
  chainId,
  hash,
  tone = "muted",
}: {
  chainId: number;
  hash: `0x${string}`;
  tone?: "muted" | "success";
}) {
  const cls =
    tone === "success"
      ? "underline underline-offset-2 hover:text-pulse-green"
      : "underline underline-offset-2 hover:text-pulse-cyan";
  return (
    <a
      href={explorerTxUrl(chainId, hash)}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-[11px] font-semibold ${cls}`}
    >
      view tx
    </a>
  );
}

function CollectionAvatar({ name }: { name: string }) {
  const initials = name.slice(0, 3).toUpperCase();
  return (
    <div
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pulse-gradient text-[10px] font-bold text-pulse-bg"
    >
      {initials}
    </div>
  );
}

function ExplorerLink({
  chainId,
  address,
  inline,
}: {
  chainId: number;
  address: string;
  inline?: boolean;
}) {
  const text = shortenAddress(address);
  const base =
    "text-xs text-pulse-muted hover:text-pulse-cyan hover:underline underline-offset-2";
  return (
    <a
      href={explorerAddressUrl(chainId, address)}
      target="_blank"
      rel="noopener noreferrer"
      className={inline ? `${base} font-mono` : `truncate ${base} font-mono`}
      title={address}
    >
      {text}
    </a>
  );
}
