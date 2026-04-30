import type { UseApprovalDiscoveryResult } from "@/hooks/use-approval-discovery";
import type { UseNftApprovalDiscoveryResult } from "@/hooks/use-nft-approval-discovery";
import type { SupportedChainConfig } from "@/lib/chains";
import { FUNGIBLE_APPROVAL_SHAPE_COPY } from "@/lib/diagnostic-copy";
import { shortenAddress } from "@/lib/format";

interface ScannerDiagnosticsPanelProps {
  enabled: boolean;
  owner: `0x${string}` | undefined;
  chainId: number | undefined;
  chainConfig: SupportedChainConfig | undefined;
  onSupportedChain: boolean;
  isConnected: boolean;
  erc20?: UseApprovalDiscoveryResult;
  nft?: UseNftApprovalDiscoveryResult;
}

export function ScannerDiagnosticsPanel({
  enabled,
  owner,
  chainId,
  chainConfig,
  onSupportedChain,
  isConnected,
  erc20,
  nft,
}: ScannerDiagnosticsPanelProps) {
  if (!enabled) return null;

  const sourceName =
    erc20?.sourceMeta?.name ?? nft?.sourceMeta?.name ?? chainConfig?.discovery.name;
  const sourceId =
    erc20?.sourceMeta?.id ?? nft?.sourceMeta?.id ?? chainConfig?.discovery.id;
  const sourceUrl =
    erc20?.sourceMeta?.url ?? nft?.sourceMeta?.url ?? chainConfig?.discovery.url;

  const explorerIssues = [
    erc20?.diagnostics.discoveryError
      ? `ERC-20/PRC-20 discovery: ${erc20.diagnostics.discoveryError}`
      : null,
    nft?.diagnostics.discoveryError
      ? `NFT discovery: ${nft.diagnostics.discoveryError}`
      : null,
    erc20?.truncated
      ? "ERC-20/PRC-20 discovery reached the fetch cap."
      : null,
    nft?.truncated ? "NFT discovery reached the fetch cap." : null,
  ].filter(Boolean);
  const erc20Parse = erc20?.diagnostics.parse;
  const erc20DecodeFailures = erc20Parse
    ? erc20Parse.missingTopics +
      erc20Parse.unsupportedTopicShape +
      erc20Parse.missingTokenAddress +
      erc20Parse.invalidTokenAddress +
      erc20Parse.missingSpenderTopic +
      erc20Parse.invalidSpenderTopic
    : 0;
  const erc20ShapeExplanation =
    erc20Parse &&
    erc20Parse.rawLogs > 0 &&
    erc20Parse.uniquePairs === 0 &&
    erc20Parse.erc20TopicShape === 0
      ? "Raw Approval-topic logs were found, but none had the 3-topic ERC-20/PRC-20 fungible-token shape. These were ERC-721 token-specific approval logs and are handled by the NFT pipeline."
      : null;
  const nftReadFailures = nft?.diagnostics.liveReadFailures;
  const erc20ReadFailures = erc20?.diagnostics.liveReadFailures;
  const nftFailureExplanation =
    nftReadFailures && nftReadFailures.getApproved > 0
      ? `${nftReadFailures.getApproved} historical ERC-721 token approval${
          nftReadFailures.getApproved === 1 ? "" : "s"
        } could not be verified with getApproved(tokenId). This can happen when a token was burned, no longer exists, uses a nonstandard contract, or the RPC/multicall read failed. These are not counted as validated live approvals.`
      : nft && nft.diagnostics.liveReadFailureCount > 0
      ? "Some historical NFT approvals can fail live reads when a token was burned, a token ID no longer exists, a contract is nonstandard, or the RPC/multicall read returned an error. Review them, but they do not automatically mean the scanner is unsafe."
      : null;

  const liveReadIssues = [
    erc20?.diagnostics.liveReadError
      ? `ERC-20/PRC-20 live reads failed globally: ${erc20.diagnostics.liveReadError}`
      : null,
    nft?.diagnostics.liveReadError
      ? `NFT live reads: ${nft.diagnostics.liveReadError}`
      : null,
    erc20 && erc20.diagnostics.liveReadFailureCount > 0
      ? `ERC-20/PRC-20 read failures inside multicall: ${erc20.diagnostics.liveReadFailureCount} (${formatErc20FailureBreakdown(erc20.diagnostics.liveReadFailures)})`
      : null,
    nft && nft.diagnostics.liveReadFailureCount > 0
      ? `NFT read failures inside multicall: ${nft.diagnostics.liveReadFailureCount} (${formatNftFailureBreakdown(nft.diagnostics.liveReadFailures)})`
      : null,
  ].filter(Boolean);

  return (
    <section className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4 text-xs text-pulse-muted">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Read-only scanner diagnostics
          </p>
          <p className="mt-1 max-w-2xl leading-5">
            Enabled by <span className="font-mono text-pulse-text">?debug=1</span>.
            This panel only reports scan state; it does not request signatures or
            add write paths.
          </p>
        </div>
        <span className="rounded-full border border-pulse-cyan/35 bg-pulse-bg/70 px-3 py-1 font-semibold text-pulse-cyan">
          debug active
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <DiagnosticCard title="Wallet and source">
          <DiagnosticRows
            rows={[
              ["Wallet", isConnected && owner ? shortenAddress(owner) : "Not connected"],
              ["Chain ID", chainId?.toString() ?? "Unknown"],
              ["Chain", chainConfig?.displayName ?? "Unsupported / unknown"],
              ["Supported", onSupportedChain ? "Yes" : "No"],
              ["Explorer source", sourceName ?? "Unavailable"],
              ["Source ID", sourceId ?? "Unavailable"],
              [
                "Source URL",
                sourceUrl ? (
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pulse-cyan underline-offset-4 hover:underline"
                  >
                    {sourceUrl}
                  </a>
                ) : (
                  "Unavailable"
                ),
              ],
            ]}
          />
        </DiagnosticCard>

        <DiagnosticCard title="ERC-20 / PRC-20 pipeline">
          {erc20 ? (
            <DiagnosticRows
              rows={[
                ["Status", erc20.status],
                ["Raw shared Approval-topic logs", erc20.stats.rawCandidateLogs],
                ["Decode attempts", erc20Parse?.decodeAttempts ?? 0],
                [
                  "ERC-20/PRC-20-shaped logs",
                  erc20Parse?.erc20TopicShape ?? 0,
                ],
                [
                  "ERC-721-shaped logs skipped",
                  erc20Parse?.erc721TokenApprovalShape ?? 0,
                ],
                ["Other skipped logs", erc20DecodeFailures],
                ["Decoded token/spender pairs", erc20Parse?.decodedPairs ?? 0],
                ["Unique token/spender pairs", erc20.stats.candidates],
                ["Unique tokens", erc20.stats.uniqueTokens],
                ["Live allowances checked", erc20.stats.candidates],
                [
                  "Allowance validation",
                  formatAllowanceValidation(erc20.diagnostics.liveReadFailures),
                ],
                ["Nonzero allowances returned", erc20.stats.active],
                [
                  "Sample decoded pairs",
                  <SamplePairs
                    key="erc20-samples"
                    pairs={erc20Parse?.samplePairs ?? []}
                  />,
                ],
                ["Explorer windows", erc20.stats.windows],
                ["Explorer requests", erc20.stats.requests],
                ["Fetch truncated", erc20.truncated ? "Yes" : "No"],
                ["Live read failures", erc20.diagnostics.liveReadFailureCount],
                [
                  "Failed allowance reads",
                  erc20ReadFailures?.allowance ?? 0,
                ],
                ["Failed symbol reads", erc20ReadFailures?.symbol ?? 0],
                ["Failed name reads", erc20ReadFailures?.name ?? 0],
                ["Failed decimals reads", erc20ReadFailures?.decimals ?? 0],
                ["Other failed reads", erc20ReadFailures?.other ?? 0],
                [
                  "Sample failed reads",
                  <Erc20FailureSamples
                    key="erc20-failure-samples"
                    samples={erc20ReadFailures?.samples ?? []}
                  />,
                ],
                ["Scan time", formatElapsed(erc20.diagnostics.timing.elapsedMs)],
              ]}
            />
          ) : (
            <p>
              Connect a supported wallet and network to start ERC-20/PRC-20
              diagnostics.
            </p>
          )}
          <p className="mt-3 leading-5">
            {FUNGIBLE_APPROVAL_SHAPE_COPY}
          </p>
          {erc20ShapeExplanation ? (
            <p className="mt-3 rounded-lg border border-pulse-cyan/30 bg-pulse-cyan/5 p-2 leading-5 text-pulse-cyan">
              {erc20ShapeExplanation}
            </p>
          ) : null}
        </DiagnosticCard>

        <DiagnosticCard title="NFT pipeline">
          {nft ? (
            <DiagnosticRows
              rows={[
                ["Status", nft.status],
                ["Raw NFT approval logs", nft.stats.rawCandidateLogs],
                ["Unique NFT candidates", nft.stats.candidates],
                ["Unique collections", nft.stats.uniqueCollections],
                ["Live NFT checks run", nft.stats.candidates],
                ["Live NFT approvals validated", nft.stats.active],
                ["Explorer windows", nft.stats.windows],
                ["Explorer requests", nft.stats.requests],
                ["Fetch truncated", nft.truncated ? "Yes" : "No"],
                ["Live read failures", nft.diagnostics.liveReadFailureCount],
                [
                  "Failed supportsInterface reads",
                  nftReadFailures?.supportsInterface ?? 0,
                ],
                ["Failed name reads", nftReadFailures?.name ?? 0],
                [
                  "Failed isApprovedForAll reads",
                  nftReadFailures?.isApprovedForAll ?? 0,
                ],
                ["Failed getApproved reads", nftReadFailures?.getApproved ?? 0],
                ["Other failed reads", nftReadFailures?.other ?? 0],
                [
                  "Sample failed reads",
                  <NftFailureSamples
                    key="nft-failure-samples"
                    samples={nftReadFailures?.samples ?? []}
                  />,
                ],
                ["Scan time", formatElapsed(nft.diagnostics.timing.elapsedMs)],
              ]}
            />
          ) : (
            <p>Connect a supported wallet and network to start NFT diagnostics.</p>
          )}
          {nftFailureExplanation ? (
            <p className="mt-3 rounded-lg border border-pulse-cyan/25 bg-pulse-cyan/5 p-2 leading-5 text-pulse-text">
              {nftFailureExplanation}
            </p>
          ) : null}
        </DiagnosticCard>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <IssueCard
          title="Explorer/API issues"
          empty="No explorer errors, truncation, pagination caps, or rate-limit errors reported."
          issues={explorerIssues}
        />
        <IssueCard
          title="RPC/live-read issues"
          empty="No RPC, multicall, or live-read errors reported."
          issues={liveReadIssues}
        />
      </div>
    </section>
  );
}

function DiagnosticCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-pulse-border bg-pulse-bg/55 p-3">
      <h3 className="font-semibold uppercase tracking-[0.14em] text-pulse-text">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DiagnosticRows({
  rows,
}: {
  rows: readonly [string, React.ReactNode][];
}) {
  return (
    <dl className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid gap-1 sm:grid-cols-[1fr_1.3fr]">
          <dt className="text-pulse-muted">{label}</dt>
          <dd className="break-words font-mono text-pulse-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IssueCard({
  title,
  empty,
  issues,
}: {
  title: string;
  empty: string;
  issues: readonly (string | null | undefined)[];
}) {
  const filtered = issues.filter((issue): issue is string => Boolean(issue));

  return (
    <div className="rounded-xl border border-pulse-border bg-pulse-bg/55 p-3">
      <h3 className="font-semibold uppercase tracking-[0.14em] text-pulse-text">
        {title}
      </h3>
      {filtered.length === 0 ? (
        <p className="mt-3 leading-5">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((issue) => (
            <li key={issue} className="leading-5 text-pulse-red">
              {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SamplePairs({
  pairs,
}: {
  pairs: readonly {
    tokenAddress: `0x${string}`;
    spenderAddress: `0x${string}`;
  }[];
}) {
  if (pairs.length === 0) return "None decoded";

  return (
    <ul className="space-y-1">
      {pairs.map((pair) => (
        <li
          key={`${pair.tokenAddress}-${pair.spenderAddress}`}
          className="break-normal"
        >
          {shortenAddress(pair.tokenAddress)} /{" "}
          {shortenAddress(pair.spenderAddress)}
        </li>
      ))}
    </ul>
  );
}

function NftFailureSamples({
  samples,
}: {
  samples: readonly {
    kind: string;
    collectionAddress: `0x${string}`;
    tokenId?: string;
  }[];
}) {
  if (samples.length === 0) return "None";

  return (
    <ul className="space-y-1">
      {samples.map((sample, index) => (
        <li
          key={`${sample.kind}-${sample.collectionAddress}-${sample.tokenId ?? index}`}
          className="break-normal"
        >
          {sample.kind} {shortenAddress(sample.collectionAddress)}
          {sample.tokenId ? ` #${sample.tokenId}` : ""}
        </li>
      ))}
    </ul>
  );
}

function Erc20FailureSamples({
  samples,
}: {
  samples: readonly {
    kind: string;
    tokenAddress: `0x${string}`;
    spenderAddress?: `0x${string}`;
    error: string;
  }[];
}) {
  if (samples.length === 0) return "None";

  return (
    <ul className="space-y-1">
      {samples.map((sample, index) => (
        <li
          key={`${sample.kind}-${sample.tokenAddress}-${sample.spenderAddress ?? index}`}
          className="break-normal"
        >
          {sample.kind} {shortenAddress(sample.tokenAddress)}
          {sample.spenderAddress
            ? ` / ${shortenAddress(sample.spenderAddress)}`
            : ""}{" "}
          ({sample.error})
        </li>
      ))}
    </ul>
  );
}

function formatAllowanceValidation(failures: {
  allowanceSucceeded: number;
  allowanceFailed: number;
  allowanceTotal: number;
}) {
  if (failures.allowanceTotal === 0) return "Not run";
  if (failures.allowanceFailed === 0) {
    return `All ${failures.allowanceTotal} allowance reads succeeded`;
  }
  if (failures.allowanceFailed === failures.allowanceTotal) {
    return `All ${failures.allowanceTotal} allowance reads failed`;
  }
  return `${failures.allowanceSucceeded}/${failures.allowanceTotal} allowance reads succeeded; ${failures.allowanceFailed} failed`;
}

function formatErc20FailureBreakdown(failures: {
  allowance: number;
  symbol: number;
  name: number;
  decimals: number;
  other: number;
}) {
  const parts = [
    ["allowance", failures.allowance],
    ["symbol", failures.symbol],
    ["name", failures.name],
    ["decimals", failures.decimals],
    ["other", failures.other],
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => `${label}: ${count}`);

  return parts.length > 0 ? parts.join(", ") : "no failed read type reported";
}

function formatNftFailureBreakdown(failures: {
  supportsInterface: number;
  name: number;
  isApprovedForAll: number;
  getApproved: number;
  other: number;
}) {
  const parts = [
    ["supportsInterface", failures.supportsInterface],
    ["name", failures.name],
    ["isApprovedForAll", failures.isApprovedForAll],
    ["getApproved", failures.getApproved],
    ["other", failures.other],
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => `${label}: ${count}`);

  return parts.length > 0 ? parts.join(", ") : "no failed read type reported";
}

function formatElapsed(ms: number | null) {
  if (ms === null) return "Not completed";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
