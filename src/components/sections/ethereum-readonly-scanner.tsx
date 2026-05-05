"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Address } from "viem";

import { useEthereumApprovalScan } from "@/hooks/use-ethereum-approval-scan";
import {
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_EXPLORER_NAME,
  ETHEREUM_MAINNET_NATIVE_SYMBOL,
  ETHEREUM_READ_ONLY_MODE_LABEL,
  ethereumExplorerAddressUrl,
  ethereumExplorerTokenUrl,
  ethereumTokenDisplayDescription,
} from "@/lib/ethereum-approval-client";
import { shortenAddress } from "@/lib/format";
import type { NftApproval } from "@/lib/nft-approvals";
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
              {ETHEREUM_READ_ONLY_MODE_LABEL}
            </span>
            <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-xs text-pulse-muted">
              {shortenAddress(owner)}
            </span>
            <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Read-only Ethereum scan
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

      <ReadOnlyNotice />

      <EthereumScanContent
        scan={scan}
        erc20={scoredErc20}
        nft={sortedNft}
        activeCount={activeCount}
      />

      <EthereumCoverageNote scan={scan} />

      <EthereumDiagnostics
        enabled={debugMode}
        owner={owner}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        scan={scan}
      />
    </div>
  );
}

function ReadOnlyNotice() {
  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
        Ethereum gated mode
      </p>
      <p className="mt-2 leading-6 text-pulse-muted">
        Ethereum Mainnet approval discovery is connected through a read-only API.
        Revoke transactions are not enabled in this branch. This view does not
        request signatures, submit transactions, or move funds.
      </p>
    </div>
  );
}

function EthereumScanContent({
  scan,
  erc20,
  nft,
  activeCount,
}: {
  scan: ReturnType<typeof useEthereumApprovalScan>;
  erc20: readonly ScoredApproval[];
  nft: readonly NftApproval[];
  activeCount: number;
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
        <ReadOnlyErc20Table approvals={erc20} />
      ) : (
        <EmptyReadOnlyGroup label="ERC-20 approvals" />
      )}

      {nft.length > 0 ? (
        <ReadOnlyNftTable approvals={nft} />
      ) : (
        <EmptyReadOnlyGroup label="ERC-721 / ERC-1155 approvals" />
      )}
    </div>
  );
}

function ReadOnlyErc20Table({
  approvals,
}: {
  approvals: readonly ScoredApproval[];
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
                  {approval.tokenSymbol}
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
                  {approval.formattedAllowance}
                </span>
              )}
            </div>

            <ReadOnlyAction />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadOnlyNftTable({ approvals }: { approvals: readonly NftApproval[] }) {
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

            <ReadOnlyAction />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadOnlyAction() {
  return (
    <div className="flex justify-stretch sm:justify-end">
      <span className="inline-flex w-full items-center justify-center rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-muted sm:w-auto">
        Revoke disabled
      </span>
    </div>
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
      {ETHEREUM_MAINNET_EXPLORER_NAME}. Revoke transactions are intentionally
      disabled for this gated integration.
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
}: {
  enabled: boolean;
  owner: Address;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  scan: ReturnType<typeof useEthereumApprovalScan>;
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
    ["Revoke enabled", "No"],
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
