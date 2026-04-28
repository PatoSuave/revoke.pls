import type { UseApprovalDiscoveryResult } from "@/hooks/use-approval-discovery";
import type { UseNftApprovalDiscoveryResult } from "@/hooks/use-nft-approval-discovery";
import type { SupportedChainConfig } from "@/lib/chains";
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
      ? `ERC-20 discovery: ${erc20.diagnostics.discoveryError}`
      : null,
    nft?.diagnostics.discoveryError
      ? `NFT discovery: ${nft.diagnostics.discoveryError}`
      : null,
    erc20?.truncated ? "ERC-20 discovery reached the fetch cap." : null,
    nft?.truncated ? "NFT discovery reached the fetch cap." : null,
  ].filter(Boolean);

  const liveReadIssues = [
    erc20?.diagnostics.liveReadError
      ? `ERC-20 live reads: ${erc20.diagnostics.liveReadError}`
      : null,
    nft?.diagnostics.liveReadError
      ? `NFT live reads: ${nft.diagnostics.liveReadError}`
      : null,
    erc20 && erc20.diagnostics.liveReadFailureCount > 0
      ? `ERC-20 read failures inside multicall: ${erc20.diagnostics.liveReadFailureCount}`
      : null,
    nft && nft.diagnostics.liveReadFailureCount > 0
      ? `NFT read failures inside multicall: ${nft.diagnostics.liveReadFailureCount}`
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

        <DiagnosticCard title="ERC-20 pipeline">
          {erc20 ? (
            <DiagnosticRows
              rows={[
                ["Status", erc20.status],
                ["Raw approval logs", erc20.stats.rawCandidateLogs],
                ["Unique token/spender pairs", erc20.stats.candidates],
                ["Unique tokens", erc20.stats.uniqueTokens],
                ["Live allowances checked", erc20.stats.candidates],
                ["Nonzero allowances returned", erc20.stats.active],
                ["Explorer windows", erc20.stats.windows],
                ["Explorer requests", erc20.stats.requests],
                ["Fetch truncated", erc20.truncated ? "Yes" : "No"],
                ["Live read failures", erc20.diagnostics.liveReadFailureCount],
                ["Scan time", formatElapsed(erc20.diagnostics.timing.elapsedMs)],
              ]}
            />
          ) : (
            <p>Connect a supported wallet and network to start ERC-20 diagnostics.</p>
          )}
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
                ["Scan time", formatElapsed(nft.diagnostics.timing.elapsedMs)],
              ]}
            />
          ) : (
            <p>Connect a supported wallet and network to start NFT diagnostics.</p>
          )}
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

function formatElapsed(ms: number | null) {
  if (ms === null) return "Not completed";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}
