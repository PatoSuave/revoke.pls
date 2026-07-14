"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ChainLogo } from "@/components/chains/chain-logo";
import {
  explorerAddressUrl,
  explorerTokenUrl,
  explorerTxUrl,
} from "@/lib/explorer";
import {
  normalizeTokenContractReportAddress,
  TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS,
  type TokenContractAiNarrative,
  type TokenContractCriticalCheck,
  type TokenContractFinding,
  type TokenContractReportModule,
  type TokenContractReportResponse,
  type TokenContractReportStreamEvent,
} from "@/lib/token-contract-report";

type SubmitStatus = "idle" | "loading" | "complete" | "error";

interface ReportRequest {
  chainId: number;
  contractAddress: string;
  includeAi: boolean;
}

interface StreamReadResult {
  reportSeen: boolean;
  report: TokenContractReportResponse | null;
  error: string | null;
  fallbackAllowed: boolean;
}

const MAX_STREAM_BYTES = 2 * 1024 * 1024;
const MAX_STREAM_LINE_CHARS = 512 * 1024;
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pulse-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-pulse-bg";

export function TokenContractReportClient() {
  const [chainId, setChainId] = useState(
    TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS[0]?.chainId ?? 369,
  );
  const [contractAddress, setContractAddress] = useState("");
  const [includeAi, setIncludeAi] = useState(true);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [report, setReport] = useState<TokenContractReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState("");
  const activeRequestRef = useRef<AbortController | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const hasFocusedResultRef = useRef(false);

  const selectedChain = useMemo(
    () =>
      TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.find(
        (chain) => chain.chainId === chainId,
      ) ?? TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS[0],
    [chainId],
  );
  const trimmedAddress = contractAddress.trim();
  const normalizedAddress = normalizeTokenContractReportAddress(trimmedAddress);
  const explorerUrl =
    normalizedAddress && selectedChain
      ? explorerTokenUrl(selectedChain.chainId, normalizedAddress)
      : null;

  useEffect(() => {
    return () => activeRequestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!report || status === "loading" || hasFocusedResultRef.current) return;
    hasFocusedResultRef.current = true;
    const frame = window.requestAnimationFrame(() => resultRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [report, status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    activeRequestRef.current?.abort();

    if (!normalizedAddress) {
      setStatus("error");
      setError(
        "Enter a valid EVM contract address, including a valid checksum for mixed-case addresses.",
      );
      setReport(null);
      setProgressMessage("");
      addressInputRef.current?.focus();
      return;
    }

    const controller = new AbortController();
    activeRequestRef.current = controller;
    hasFocusedResultRef.current = false;
    setStatus("loading");
    setError(null);
    setReport(null);
    setProgressMessage("Starting the bounded evidence scan…");

    const payload: ReportRequest = {
      chainId,
      contractAddress: normalizedAddress,
      includeAi,
    };
    const isCurrentRequest = () =>
      activeRequestRef.current === controller && !controller.signal.aborted;

    try {
      const streamResult = await readTokenContractReportStream({
        payload,
        signal: controller.signal,
        onEvent(event) {
          if (!isCurrentRequest()) return;
          if (event.type === "base" || event.type === "final") {
            setReport(event.report);
            setProgressMessage(
              event.type === "final"
                ? "All available modules finished."
                : "Base contract evidence received.",
            );
            return;
          }
          if (event.type === "module") {
            setProgressMessage(
              event.module.label + ": " + moduleStatusLabel(event.module.status) + ".",
            );
            setReport((current) => {
              const next = event.report ?? current;
              if (!next) return null;
              return {
                ...next,
                modules: {
                  ...next.modules,
                  [event.module.id]: event.module,
                },
              };
            });
          }
        },
      });

      if (!isCurrentRequest()) return;

      if (streamResult.reportSeen && streamResult.report) {
        setReport(streamResult.report);
        const streamReportFailed =
          !streamResult.report.ok || !streamResult.report.contract;
        setStatus(streamReportFailed ? "error" : "complete");
        setError(
          streamResult.error ??
            (streamReportFailed
              ? streamResult.report.errors[0] ?? "Token contract report failed."
              : null),
        );
        setProgressMessage(
          streamResult.error
            ? "The stream ended with a partial report."
            : "Report ready.",
        );
        return;
      }

      if (!streamResult.fallbackAllowed) {
        setStatus("error");
        setError(
          streamResult.error ??
            "The progressive report request was rejected before scanning.",
        );
        setProgressMessage("The report request was not started.");
        return;
      }

      setProgressMessage(
        "Progressive results were unavailable. Requesting the JSON report…",
      );
      const response = await fetch("/api/token-contract-report", {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const value: unknown = await response.json();
      if (!isTokenContractReportResponse(value)) {
        throw new Error("The report API returned an invalid response.");
      }
      if (!isCurrentRequest()) return;
      setReport(value);
      setStatus(response.ok && value.ok && value.contract ? "complete" : "error");
      setError(
        response.ok && value.ok && value.contract
          ? null
          : value.errors[0] ??
              streamResult.error ??
              "Token contract report failed.",
      );
      setProgressMessage(response.ok ? "Report ready." : "The report request failed.");
    } catch (requestError) {
      if (controller.signal.aborted || !isCurrentRequest()) return;
      setStatus("error");
      setError(errorMessage(requestError));
      setProgressMessage("The report request failed.");
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }

  function onClear() {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    hasFocusedResultRef.current = false;
    setContractAddress("");
    setReport(null);
    setError(null);
    setStatus("idle");
    setProgressMessage("");
    addressInputRef.current?.focus();
  }

  const liveMessage =
    status === "loading"
      ? progressMessage || "Reading contract evidence…"
      : status === "complete"
        ? report
          ? "Token contract report ready. Server verdict: " + report.verdict.label + "."
          : "Token contract report ready."
        : status === "error"
          ? error ?? "The token contract report failed."
          : "";

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6">
        <div className="rounded-2xl border border-pulse-border/80 bg-pulse-panel/45 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
                Read-only deep scan
              </p>
              <h2 className="mt-1 text-lg font-bold tracking-tight text-pulse-text">
                Generate a token contract report
              </h2>
            </div>
            <p className="text-xs leading-5 text-pulse-muted">
              No wallet connection, signature, or transaction.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="grid gap-3 lg:grid-cols-[minmax(12rem,0.75fr)_minmax(20rem,1.7fr)_minmax(13rem,0.85fr)_auto] lg:items-end"
          >
            <div>
              <label
                htmlFor="token-report-chain"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-muted"
              >
                Chain
              </label>
              <div className="mt-2 grid min-h-11 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-pulse-border bg-pulse-bg/70 px-3 py-1">
                {selectedChain ? (
                  <ChainLogo
                    chainId={selectedChain.chainId}
                    className="h-5 w-5 shrink-0"
                  />
                ) : null}
                <select
                  id="token-report-chain"
                  value={chainId}
                  onChange={(event) => setChainId(Number(event.target.value))}
                  className={
                    "min-h-9 w-full rounded bg-transparent text-sm font-semibold text-pulse-text " +
                    FOCUS_RING
                  }
                >
                  {TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.map((chain) => (
                    <option
                      key={chain.chainId}
                      value={chain.chainId}
                      className="bg-pulse-bg text-pulse-text"
                    >
                      {chain.name} ({chain.chainId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="token-report-address"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-muted"
              >
                Contract address
              </label>
              <input
                ref={addressInputRef}
                id="token-report-address"
                value={contractAddress}
                onChange={(event) => setContractAddress(event.target.value)}
                placeholder="0x…"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(trimmedAddress && !normalizedAddress)}
                aria-describedby="token-report-address-help"
                className={
                  "mt-2 min-h-11 w-full rounded-xl border border-pulse-border bg-pulse-bg/80 px-3 py-2 font-mono text-sm text-pulse-text transition placeholder:text-pulse-muted/60 focus:border-pulse-cyan/60 " +
                  FOCUS_RING
                }
              />
            </div>

            <label
              className={
                "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-pulse-border/70 bg-pulse-bg/35 px-3 py-2 text-xs leading-5 text-pulse-muted " +
                FOCUS_RING
              }
            >
              <input
                type="checkbox"
                checked={includeAi}
                onChange={(event) => setIncludeAi(event.target.checked)}
                className={
                  "h-4 w-4 shrink-0 rounded border-pulse-border bg-pulse-bg text-pulse-cyan " +
                  FOCUS_RING
                }
              />
              <span>Include the secondary DeepSeek explanation</span>
            </label>

            <div className="flex gap-2 lg:justify-end">
              <button
                type="submit"
                disabled={status === "loading" || !normalizedAddress}
                className={
                  "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none " +
                  FOCUS_RING
                }
              >
                {status === "loading" ? "Scanning…" : "Generate report"}
              </button>
              <button
                type="button"
                onClick={onClear}
                className={
                  "inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-4 py-2 text-xs font-semibold text-pulse-muted transition hover:bg-pulse-text/10 " +
                  FOCUS_RING
                }
              >
                Clear
              </button>
            </div>
          </form>

          <div className="mt-2 flex min-h-5 flex-wrap items-start justify-between gap-2">
            <p
              id="token-report-address-help"
              className={
                "text-xs leading-5 " +
                (trimmedAddress && !normalizedAddress
                  ? "font-semibold text-amber-200"
                  : "text-pulse-muted")
              }
            >
              {trimmedAddress && !normalizedAddress
                ? "That address is incomplete or has an invalid mixed-case checksum."
                : "Use the deployed token or collection contract—not a wallet address."}
            </p>
            {explorerUrl ? (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer"
                className={
                  "text-xs font-semibold text-pulse-cyan transition hover:text-pulse-text " +
                  FOCUS_RING
                }
              >
                Open contract on explorer
              </a>
            ) : null}
          </div>

          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {liveMessage}
          </p>
          {status === "loading" ? (
            <div className="mt-3 rounded-xl border border-pulse-cyan/25 bg-pulse-cyan/5 px-3 py-2">
              <p className="text-xs font-semibold text-pulse-cyan">
                {progressMessage || "Reading contract evidence…"}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pulse-panel/90">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-pulse-cyan" />
              </div>
            </div>
          ) : null}
          {error ? (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-pulse-red/35 bg-pulse-red/10 px-3 py-2 text-sm font-semibold text-pulse-red"
            >
              {error}
            </div>
          ) : null}
        </div>

        <div
          ref={resultRef}
          tabIndex={-1}
          aria-busy={status === "loading"}
          aria-label="Token contract report results"
          className={"rounded-2xl " + FOCUS_RING}
        >
          <ReportOutput report={report} status={status} />
        </div>
      </div>
    </section>
  );
}

function ReportOutput({
  report,
  status,
}: {
  report: TokenContractReportResponse | null;
  status: SubmitStatus;
}) {
  if (!report) return <EmptyReportState status={status} />;
  if (!report.contract && report.errors.length > 0) {
    return <ReportFailureState report={report} />;
  }

  const observedConcerns = report.findings.filter(
    (finding) =>
      finding.state === "confirmed" && finding.severity !== "info",
  );
  const reviewClues = report.findings.filter(
    (finding) =>
      finding.state === "review-clue" || finding.state === "unresolved",
  );
  const untestedChecks = report.audit.criticalChecks.filter((check) =>
    ["needs_review", "not_collected", "unknown"].includes(check.status),
  );
  const incompleteModules = Object.values(report.modules).filter(
    (module) => module.id !== "ai" && module.status !== "complete",
  );
  const tokenHeading = report.token.symbol || report.token.name || "Contract report";
  const tokenSubheading =
    report.token.symbol && report.token.name
      ? report.token.name
      : report.chain?.name ?? "Selected chain";

  return (
    <div className="space-y-4">
      <VerdictPanel
        report={report}
        tokenHeading={tokenHeading}
        tokenSubheading={tokenSubheading}
      />

      <RiskOverview
        observedConcerns={observedConcerns}
        reviewClues={reviewClues}
        untestedChecks={untestedChecks}
        incompleteModules={incompleteModules}
      />

      {report.warnings.length > 0 ? (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 sm:p-5">
          <SectionHeading
            eyebrow="Actionable warnings"
            title="Items to review before interacting"
            meta={report.warnings.length + " warning" + (report.warnings.length === 1 ? "" : "s")}
            tone="amber"
          />
          <ul className="mt-3 divide-y divide-amber-200/15 text-sm leading-6 text-amber-100">
            {report.warnings.map((warning) => (
              <li key={warning} className="py-2 first:pt-0 last:pb-0">
                {warning}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AiExplanation ai={report.ai} />

      <TechnicalEvidence report={report} />

      {report.errors.length > 0 ? (
        <section
          role="alert"
          className="rounded-2xl border border-pulse-red/35 bg-pulse-red/10 p-4 sm:p-5"
        >
          <SectionHeading
            eyebrow="Provider failures"
            title="Some report work could not finish"
            meta={report.errors.length + " error" + (report.errors.length === 1 ? "" : "s")}
          />
          <ul className="mt-3 space-y-2 text-sm leading-6 text-pulse-red">
            {report.errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.reportBoundaries.length > 0 ? (
        <section className="rounded-2xl border border-pulse-border/75 bg-pulse-bg/40 p-4 sm:p-5">
          <SectionHeading
            eyebrow="Report boundaries"
            title="What this report does not prove"
            meta="not counted as warnings"
          />
          <ul className="mt-3 space-y-2 text-sm leading-6 text-pulse-muted">
            {report.reportBoundaries.map((boundary) => (
              <li key={boundary} className="border-l border-pulse-border pl-3">
                {boundary}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function VerdictPanel({
  report,
  tokenHeading,
  tokenSubheading,
}: {
  report: TokenContractReportResponse;
  tokenHeading: string;
  tokenSubheading: string;
}) {
  const generatedAt = formatTimestamp(report.generatedAt);
  const totalChecks = report.audit.totalChecks || report.audit.criticalChecks.length;
  const formattedSupply = formattedTokenSupply(report);

  return (
    <section
      aria-labelledby="token-report-conclusion"
      className={
        "overflow-hidden rounded-2xl border shadow-[inset_0_1px_0_rgb(255_255_255/0.03)] " +
        verdictPanelClass(report.verdict.severity)
      }
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Server-owned conclusion · deterministic evidence
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerdictBadge severity={report.verdict.severity} label={report.verdict.label} />
              <StatusBadge status={report.status} ok={report.ok} />
            </div>
            <h2
              id="token-report-conclusion"
              className="mt-4 break-words text-2xl font-bold tracking-tight text-pulse-text sm:text-3xl"
            >
              {tokenHeading}
            </h2>
            <p className="mt-1 text-sm font-semibold text-pulse-muted">
              {tokenSubheading} · {report.chain?.name ?? "Selected chain"}
            </p>
            <p className="mt-4 max-w-4xl text-base leading-7 text-pulse-text">
              {report.verdict.summary}
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 lg:w-80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
              Contract
            </p>
            <p className="mt-1 break-all font-mono text-xs leading-5 text-pulse-text">
              {report.contract?.address ?? "Unavailable"}
            </p>
            {report.contract?.address ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <CopyButton value={report.contract.address} label="Copy address" />
                <ExternalLink href={report.contract.explorerUrl} label="Open explorer" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <ReportMetric
            label="Severity"
            value={humanize(report.verdict.severity)}
            tone={severityMetricTone(report.verdict.severity)}
          />
          <ReportMetric
            label="Evidence confidence"
            value={report.verdict.confidence + "% · " + report.verdict.confidenceLabel}
            tone={report.verdict.confidence >= 70 ? "good" : "caution"}
          />
          <ReportMetric
            label="Coverage"
            value={
              report.audit.completedChecks + " of " + totalChecks + " completed"
            }
            tone={report.audit.coveragePercent >= 80 ? "good" : "caution"}
          />
          <ReportMetric
            label="Open warnings"
            value={String(report.warnings.length)}
            tone={report.warnings.length > 0 ? "caution" : "good"}
          />
          <ReportMetric
            label="Total supply"
            value={formattedSupply ?? "Unknown"}
            tone="neutral"
          />
        </div>

        <AuditCoverage audit={report.audit} />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs leading-5 text-pulse-muted">
          <p>
            Severity comes from confirmed capabilities. Confidence reflects evidence quality;
            coverage reflects completed questions.
          </p>
          <p>Generated {generatedAt}</p>
        </div>
      </div>
    </section>
  );
}

function RiskOverview({
  observedConcerns,
  reviewClues,
  untestedChecks,
  incompleteModules,
}: {
  observedConcerns: TokenContractFinding[];
  reviewClues: TokenContractFinding[];
  untestedChecks: TokenContractCriticalCheck[];
  incompleteModules: TokenContractReportModule[];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-pulse-red/25 bg-pulse-bg/40 p-4 sm:p-5">
        <SectionHeading
          eyebrow="Observed concerns"
          title="Confirmed by deterministic evidence"
          meta={observedConcerns.length + " confirmed"}
        />
        <div className="mt-3 space-y-3">
          {observedConcerns.length > 0 ? (
            observedConcerns.map((finding) => (
              <FindingCard key={finding.id} finding={finding} />
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-pulse-border/70 bg-pulse-bg/35 p-3 text-sm leading-6 text-pulse-muted">
              No confirmed non-informational concern was returned in the collected evidence.
              This is not an all-clear result; review the untested areas beside it.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-400/25 bg-pulse-bg/40 p-4 sm:p-5">
        <SectionHeading
          eyebrow="Untested and unresolved"
          title="Areas that cannot support a safety claim"
          meta={
            reviewClues.length + untestedChecks.length + incompleteModules.length +
            " open"
          }
          tone="amber"
        />
        <div className="mt-3 space-y-3">
          {reviewClues.map((finding) => (
            <FindingCard key={finding.id} finding={finding} compact />
          ))}
          {untestedChecks.map((check) => (
            <article
              key={check.question}
              className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-bold leading-5 text-pulse-text">
                  {check.question}
                </h4>
                <CheckStatus check={check} />
              </div>
              <p className="mt-2 text-xs leading-5 text-pulse-muted">{check.evidence}</p>
            </article>
          ))}
          {incompleteModules.map((module) => (
            <article
              key={module.id}
              className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-pulse-text">{module.label}</h4>
                <ModuleStatus status={module.status} />
              </div>
              <p className="mt-2 text-xs leading-5 text-pulse-muted">{module.summary}</p>
            </article>
          ))}
          {reviewClues.length === 0 &&
          untestedChecks.length === 0 &&
          incompleteModules.length === 0 ? (
            <p className="rounded-xl border border-pulse-green/25 bg-pulse-green/5 p-3 text-sm leading-6 text-pulse-muted">
              All required deterministic modules and critical questions report complete.
              This still does not prove future behavior or token safety.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FindingCard({
  finding,
  compact = false,
}: {
  finding: TokenContractFinding;
  compact?: boolean;
}) {
  return (
    <article className="rounded-xl border border-pulse-border/70 bg-pulse-panel/35 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-pulse-muted">
            {humanize(finding.category)} · {finding.id}
          </p>
          <h4 className="mt-1 text-sm font-bold leading-5 text-pulse-text">
            {finding.title}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity={finding.severity} />
          <FindingStateBadge state={finding.state} />
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-pulse-muted">{finding.summary}</p>
      <p className="mt-2 text-xs leading-5 text-pulse-text">
        <span className="font-bold">Practical effect:</span> {finding.practicalEffect}
      </p>
      {!compact && finding.recommendation ? (
        <p className="mt-2 text-xs leading-5 text-pulse-muted">
          <span className="font-semibold text-pulse-text">Recommended check:</span>{" "}
          {finding.recommendation}
        </p>
      ) : null}
      {finding.evidence.length > 0 ? (
        <details className="mt-3 rounded-lg border border-pulse-border/60 bg-pulse-bg/45">
          <summary
            className={
              "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold text-pulse-cyan " +
              FOCUS_RING
            }
          >
            {finding.evidence.length} typed evidence reference
            {finding.evidence.length === 1 ? "" : "s"}
          </summary>
          <div className="space-y-2 border-t border-pulse-border/60 p-3">
            {finding.evidence.map((reference) => (
              <div key={reference.id} className="text-xs leading-5 text-pulse-muted">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-pulse-text">{reference.id}</span>
                  <span className="rounded-full border border-pulse-border px-2 py-0.5 uppercase tracking-[0.1em]">
                    {reference.type}
                  </span>
                  <CopyButton value={reference.id} label="Copy evidence ID" compact />
                </div>
                <p className="mt-1">{reference.summary}</p>
                {reference.file ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-pulse-text">
                    {sourceLocation(reference.file, reference.startLine, reference.endLine)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function AuditCoverage({
  audit,
}: {
  audit: TokenContractReportResponse["audit"];
}) {
  const percentage = clampPercentage(audit.coveragePercent);
  const total = audit.totalChecks || audit.criticalChecks.length;

  return (
    <div className="mt-5 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
            Evidence coverage
          </p>
          <p className="mt-1 text-xl font-bold text-pulse-text">{percentage}%</p>
        </div>
        <p className="text-xs leading-5 text-pulse-muted">
          {audit.completedChecks} completed · {audit.reviewChecks} review ·{" "}
          {audit.notEvaluatedChecks} not evaluated · {total} total
        </p>
      </div>
      <div
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-pulse-panel/90"
        role="progressbar"
        aria-label="Deterministic evidence coverage"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-pulse-cyan to-pulse-green transition-[width]"
          style={{ width: percentage + "%" }}
        />
      </div>
    </div>
  );
}

function AiExplanation({ ai }: { ai: TokenContractReportResponse["ai"] }) {
  const aiValue =
    ai.status === "generated" && ai.model
      ? ai.model
      : ai.reason
        ? aiReasonLabel(ai.reason)
        : ai.status;

  return (
    <details className="rounded-2xl border border-pulse-cyan/25 bg-pulse-cyan/5">
      <summary
        className={
          "cursor-pointer rounded-2xl p-4 sm:p-5 " + FOCUS_RING
        }
      >
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
          Secondary AI reviewer
        </span>
        <span className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <span className="text-base font-bold text-pulse-text">
            Explanation of scanner evidence.
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-pulse-muted">
            {aiValue}
          </span>
        </span>
      </summary>
      <div className="border-t border-pulse-cyan/20 p-4 sm:p-5">
        <p className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted">
          DeepSeek explains cited scanner evidence and suggests follow-up checks. It cannot
          set or change the server verdict, severity, confidence, score, or evidence state.
          AI-only observations remain review clues until deterministic evidence corroborates
          them.
        </p>
        {ai.narrative ? (
          <AiNarrative narrative={ai.narrative} />
        ) : ai.markdown ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-pulse-muted">
            {ai.markdown}
          </p>
        ) : (
          <p className="mt-4 text-sm leading-6 text-pulse-muted">
            The deterministic report remains authoritative. The AI explanation is{" "}
            <span className="font-semibold text-pulse-text">
              {ai.reason ? aiReasonDescription(ai.reason) : ai.status}
            </span>
            .
          </p>
        )}
      </div>
    </details>
  );
}

function AiNarrative({ narrative }: { narrative: TokenContractAiNarrative }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/55 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pulse-cyan">
          Reviewer bottom line
        </p>
        <p className="mt-2 text-sm leading-6 text-pulse-text">
          {narrative.bottomLine}
        </p>
      </div>

      {narrative.mainRisks.length > 0 ? (
        <NarrativeList title="Evidence the reviewer highlighted" items={narrative.mainRisks} />
      ) : null}

      {narrative.detailedFindings.length > 0 ? (
        <div>
          <h4 className="text-sm font-bold text-pulse-text">
            Source-cited reviewer observations
          </h4>
          <div className="mt-2 space-y-2">
            {narrative.detailedFindings.map((finding, index) => (
              <article
                key={finding.heading + "-" + index}
                className="rounded-xl border border-pulse-border/70 bg-pulse-panel/35 p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h5 className="text-sm font-bold leading-5 text-pulse-text">
                    {finding.heading}
                  </h5>
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-amber-200">
                    review clue · {finding.severity}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-pulse-muted">
                  {finding.description}
                </p>
                {finding.evidence.length > 0 ? (
                  <ul className="mt-2 space-y-1 border-l border-pulse-cyan/25 pl-3 font-mono text-xs leading-5 text-pulse-text">
                    {finding.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-xs leading-5 text-pulse-muted">
                  <span className="font-semibold text-pulse-text">Practical effect:</span>{" "}
                  {finding.practicalEffect}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <NarrativeList title="Not confirmed" items={narrative.whatNotSeen} />
        <NarrativeList title="Recommended on-chain checks" items={narrative.whatToCheckOnChain} />
      </div>

      {narrative.selectorWatchlist.length > 0 ? (
        <NarrativeList
          title="Selector review clues"
          items={narrative.selectorWatchlist}
          mono
        />
      ) : null}
    </div>
  );
}

function TechnicalEvidence({ report }: { report: TokenContractReportResponse }) {
  const source = report.contract?.source;
  const creation = report.contract?.creation;
  const implementation = source?.implementation;
  const ownerValue =
    report.controls.ownershipStatus === "found" && report.controls.ownerAddress
      ? report.controls.ownerAddress
      : report.controls.ownershipStatus === "zero_address" ||
          report.controls.ownershipStatus === "renounced"
        ? "Zero address returned by the owner getter"
        : report.controls.ownershipStatus === "conflicting"
          ? "Conflicting owner getters"
          : "Unavailable";
  const ownerDetail =
    report.controls.ownershipStatus === "conflicting"
      ? "owner(): " +
        (report.controls.ownerCandidates.owner ?? "unreadable") +
        "; getOwner(): " +
        (report.controls.ownerCandidates.getOwner ?? "unreadable") +
        ". No single owner was accepted."
      : report.controls.ownerMethod
        ? "Read from " +
          report.controls.ownerMethod +
          "(); independent controllers and proxy admins are evaluated separately."
        : "No single unambiguous standard owner address was established.";
  const ownerUrl =
    report.controls.ownerAddress && report.chain
      ? explorerAddressUrl(report.chain.chainId, report.controls.ownerAddress)
      : null;
  const creationDetail =
    creation?.lookupStatus === "found"
      ? [
          creation.blockNumber ? "Block " + creation.blockNumber : null,
          creation.timestamp ? formatTimestamp(creation.timestamp) : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Explorer creation metadata unavailable";

  return (
    <section aria-label="Technical evidence" className="space-y-2">
      <div className="px-1">
        <SectionHeading
          eyebrow="Technical evidence"
          title="Inspect the underlying scanner record"
          meta="collapsed by default"
        />
      </div>

      <TechnicalDetails
        title="Contract identity, ownership, supply, and standards"
        meta={source?.verified ?? "unknown source"}
      >
        <div className="divide-y divide-pulse-border/60 rounded-xl border border-pulse-border/60 bg-pulse-bg/40">
          <ReportDataRow
            label="Contract"
            value={report.contract?.address ?? "Unavailable"}
            href={report.contract?.explorerUrl ?? null}
            copyValue={report.contract?.address ?? null}
          />
          <ReportDataRow
            label="Deployer"
            value={creation?.deployerAddress ?? "Unavailable"}
            href={creation?.deployerUrl ?? null}
            copyValue={creation?.deployerAddress ?? null}
          />
          {source?.implementationAddress ? (
            <ReportDataRow
              label="Implementation"
              value={source.implementationAddress}
              href={
                report.chain
                  ? explorerAddressUrl(report.chain.chainId, source.implementationAddress)
                  : null
              }
              copyValue={source.implementationAddress}
              detail={
                implementation
                  ? (implementation.contractName ?? "Implementation") +
                    " · source " +
                    implementation.verified
                  : "Implementation address reported; source metadata unavailable"
              }
            />
          ) : null}
          <ReportDataRow
            label="Owner getter"
            value={ownerValue}
            href={ownerUrl}
            copyValue={report.controls.ownerAddress}
            detail={ownerDetail}
          />
          <ReportDataRow
            label="Creation transaction"
            value={creation?.transactionHash ?? "Unavailable"}
            href={creation?.transactionUrl ?? null}
            copyValue={creation?.transactionHash ?? null}
            detail={creationDetail}
          />
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetadataCell label="Name" value={report.token.name ?? "Unknown"} />
          <MetadataCell label="Symbol" value={report.token.symbol ?? "Unknown"} />
          <MetadataCell
            label="Decimals"
            value={report.token.decimals === null ? "Unknown" : String(report.token.decimals)}
          />
          <MetadataCell
            label="Formatted total supply"
            value={formattedTokenSupply(report) ?? "Unknown"}
          />
          <MetadataCell
            label="Raw total-supply units"
            value={report.token.totalSupply ?? "Unknown"}
            mono
            copyValue={report.token.totalSupply}
          />
          <MetadataCell label="Compiler" value={source?.compilerVersion ?? "Unknown"} />
          <MetadataCell
            label="ABI functions"
            value={source?.abiFunctionCount === null || source?.abiFunctionCount === undefined
              ? "Unknown"
              : String(source.abiFunctionCount)}
          />
          <MetadataCell
            label="Effective controllers"
            value={String(report.controls.effectiveControllerAddresses.length)}
          />
        </div>

        {report.controls.effectiveControllerAddresses.length > 0 ? (
          <div className="mt-3 rounded-xl border border-pulse-border/60 bg-pulse-bg/40 p-3">
            <h4 className="text-xs font-bold uppercase tracking-[0.13em] text-pulse-muted">
              Effective controller addresses
            </h4>
            <div className="mt-2 space-y-2">
              {report.controls.effectiveControllerAddresses.map((address) => (
                <div key={address} className="flex flex-wrap items-center gap-2">
                  <span className="break-all font-mono text-xs text-pulse-text">{address}</span>
                  <CopyButton value={address} label="Copy" compact />
                  {report.chain ? (
                    <ExternalLink
                      href={explorerAddressUrl(report.chain.chainId, address)}
                      label="Explorer"
                      compact
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <StandardPill
            label="ERC-20-like"
            state={report.standards.erc20Like ? "detected" : "not detected"}
            tone={report.standards.erc20Like ? "active" : "muted"}
          />
          <StandardPill
            label="ERC-721"
            state={report.standards.erc721 ? "detected" : "not detected"}
            tone={report.standards.erc721 ? "active" : "muted"}
          />
          <StandardPill
            label="ERC-1155"
            state={report.standards.erc1155 ? "detected" : "not detected"}
            tone={report.standards.erc1155 ? "active" : "muted"}
          />
          <StandardPill
            label="ERC-4626"
            state={report.standards.erc4626 ? "detected" : "not detected"}
            tone={report.standards.erc4626 ? "active" : "muted"}
          />
          <StandardPill
            label="ERC-6909"
            state={humanize(report.standards.erc6909)}
            tone={
              report.standards.erc6909 === "detected"
                ? "active"
                : report.standards.erc6909 === "limited"
                  ? "caution"
                  : "muted"
            }
          />
          <StandardPill
            label="Hybrid"
            state={report.standards.hybrid ? "detected" : "not detected"}
            tone={report.standards.hybrid ? "caution" : "muted"}
          />
        </div>
      </TechnicalDetails>

      <TechnicalDetails
        title="Critical questions and deterministic read signals"
        meta={report.audit.criticalChecks.length + report.signals.length + " checks"}
      >
        <div className="space-y-2">
          {report.audit.criticalChecks.map((check) => (
            <article
              key={check.question}
              className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-bold leading-5 text-pulse-text">
                  {check.question}
                </h4>
                <CheckStatus check={check} />
              </div>
              <p className="mt-2 text-xs leading-5 text-pulse-muted">{check.evidence}</p>
            </article>
          ))}
          {report.signals.map((signal) => (
            <SignalItem key={signal.id} signal={signal} />
          ))}
          {report.audit.criticalChecks.length === 0 && report.signals.length === 0 ? (
            <p className="text-sm text-pulse-muted">No read signals were returned.</p>
          ) : null}
        </div>
      </TechnicalDetails>

      <TechnicalDetails
        title="Evidence module status"
        meta={Object.values(report.modules).filter((module) => module.status === "complete").length +
          " of " + Object.keys(report.modules).length + " complete"}
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Object.values(report.modules).map((module) => (
            <article
              key={module.id}
              className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-pulse-text">{module.label}</h4>
                <ModuleStatus status={module.status} />
              </div>
              <p className="mt-2 text-xs leading-5 text-pulse-muted">{module.summary}</p>
              <p className="mt-2 text-xs font-semibold text-pulse-text">
                {module.evidenceCount} evidence reference
                {module.evidenceCount === 1 ? "" : "s"}
              </p>
              {module.warnings.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-200">
                  {module.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </TechnicalDetails>

      <TechnicalDetails
        title="All structured findings and typed references"
        meta={
          report.findings.length +
          " finding" +
          (report.findings.length === 1 ? "" : "s")
        }
      >
        <div className="space-y-2">
          {report.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} compact />
          ))}
          {report.findings.length === 0 ? (
            <p className="text-sm text-pulse-muted">
              No structured findings were returned.
            </p>
          ) : null}
        </div>
      </TechnicalDetails>

      <BytecodeAndSupplyEvidence report={report} />
      <SelectorEvidence report={report} />
      <HistoryEvidence report={report} />
      <SimulationEvidence report={report} />
      <LiquidityEvidence report={report} />
    </section>
  );
}

function BytecodeAndSupplyEvidence({
  report,
}: {
  report: TokenContractReportResponse;
}) {
  return (
    <TechnicalDetails
      title="Deployment fingerprints, supply history, and sampled holders"
      meta={report.holders.sampled.length + " balances checked"}
    >
      <div className="grid gap-2 md:grid-cols-2">
        {(["runtime", "creation"] as const).map((kind) => {
          const artifact = report.bytecode[kind];
          return (
            <article
              key={kind}
              className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h4 className="text-sm font-bold capitalize text-pulse-text">
                  {kind} bytecode
                </h4>
                <span className="rounded-full border border-pulse-border bg-pulse-bg/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-pulse-muted">
                  {artifact.available ? artifact.byteLength + " bytes" : "unavailable"}
                </span>
              </div>
              {artifact.hash ? (
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pulse-muted">
                      Full hash
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-pulse-text">
                      {artifact.hash}
                    </p>
                    <CopyButton value={artifact.hash} label="Copy hash" compact />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pulse-muted">
                      Metadata-stripped hash
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-pulse-text">
                      {artifact.hashWithoutMetadata}
                    </p>
                  </div>
                  <p className="text-xs leading-5 text-pulse-muted">
                    Source: {artifact.source ?? "unavailable"}; metadata {artifact.metadataDetected ? "detected" : "not detected"}; {artifact.embeddedAddresses.length} embedded address constant{artifact.embeddedAddresses.length === 1 ? "" : "s"}.
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-5 text-pulse-muted">
                  No bounded fingerprint was available.
                </p>
              )}
              <Limitations items={artifact.limitations} />
            </article>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetadataCell
          label="Initial mint raw units"
          value={report.supplyHistory.initialMintAmount ?? "Unavailable"}
          mono
          copyValue={report.supplyHistory.initialMintAmount}
        />
        <MetadataCell
          label="Initial mint block"
          value={report.supplyHistory.initialMintBlockNumber === null
            ? "Unavailable"
            : String(report.supplyHistory.initialMintBlockNumber)}
        />
        <MetadataCell
          label="Deployer current share"
          value={report.holders.deployerPercent === null
            ? "Unavailable"
            : report.holders.deployerPercent.toFixed(4) + "%"}
        />
        <MetadataCell
          label="Sampled supply share"
          value={report.holders.sampledSupplyPercent === null
            ? "Unavailable"
            : report.holders.sampledSupplyPercent.toFixed(4) + "%"}
        />
      </div>

      <div className="mt-3 space-y-2">
        {report.holders.sampled.map((holder) => (
          <article
            key={holder.address}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs font-bold text-pulse-text">
                  {holder.address}
                </p>
                <p className="mt-1 text-xs leading-5 text-pulse-muted">
                  Sources: {holder.sources.map(humanize).join(", ")}
                </p>
              </div>
              <p className="text-sm font-bold text-pulse-text">
                {holder.percentageOfSupply === null
                  ? "Share unavailable"
                  : holder.percentageOfSupply.toFixed(4) + "%"}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all font-mono text-[11px] text-pulse-muted">
                balanceOf {holder.balance}
              </code>
              <CopyButton value={holder.address} label="Copy address" compact />
              {report.chain ? (
                <ExternalLink
                  href={explorerAddressUrl(report.chain.chainId, holder.address)}
                  label="Explorer"
                  compact
                />
              ) : null}
            </div>
          </article>
        ))}
        {report.holders.sampled.length === 0 ? (
          <p className="text-sm text-pulse-muted">No holder balances were sampled.</p>
        ) : null}
      </div>
      <Limitations
        items={[...report.holders.limitations, ...report.supplyHistory.limitations]}
      />
    </TechnicalDetails>
  );
}

function SelectorEvidence({ report }: { report: TokenContractReportResponse }) {
  return (
    <TechnicalDetails
      title="Resolved runtime selectors"
      meta={report.selectors.length + " selector" + (report.selectors.length === 1 ? "" : "s")}
    >
      <p className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-pulse-muted">
        Resolution is structural: verified ABI signatures are exact; local-watchlist labels
        are known candidates; 4byte.directory results can be ambiguous. A selector name by
        itself never confirms function behavior.
      </p>
      <div className="space-y-2">
        {report.selectors.map((selector) => (
          <article
            key={selector.selector}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="font-mono text-sm font-bold text-pulse-cyan">
                    {selector.selector}
                  </code>
                  <CopyButton value={selector.selector} label="Copy selector" compact />
                </div>
                <p className="mt-1 break-all font-mono text-xs text-pulse-text">
                  {selector.signature ?? selector.label ?? "Unresolved signature"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SelectorClassBadge classification={selector.classification} />
                <span className="rounded-full border border-pulse-border bg-pulse-bg/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-pulse-muted">
                  {humanize(selector.resolution)} · {selector.confidence}
                </span>
              </div>
            </div>
            {selector.candidates.length > 0 ? (
              <div className="mt-3 border-l border-pulse-border pl-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pulse-muted">
                  Candidate signatures
                </p>
                <ul className="mt-1 space-y-1 break-all font-mono text-xs leading-5 text-pulse-text">
                  {selector.candidates.map((candidate) => (
                    <li key={candidate}>{candidate}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
        {report.selectors.length === 0 ? (
          <p className="text-sm text-pulse-muted">No runtime selectors were resolved.</p>
        ) : null}
      </div>
    </TechnicalDetails>
  );
}

function HistoryEvidence({ report }: { report: TokenContractReportResponse }) {
  return (
    <TechnicalDetails
      title="Recent contract history"
      meta={report.history.inspectedTransactions + " calls inspected"}
    >
      <p className="mb-3 text-xs leading-5 text-pulse-muted">
        Post-owner-zero activity:{" "}
        <span className="font-semibold text-pulse-text">
          {report.history.postOwnershipZeroActivity === null
            ? "unresolved"
            : report.history.postOwnershipZeroActivity
              ? "observed"
              : "not observed in the inspected window"}
        </span>
      </p>
      {report.history.ownershipTransfers.length > 0 ? (
        <div className="mb-3 space-y-2">
          {report.history.ownershipTransfers.map((event) => (
            <article
              key={event.transactionHash + "-" + (event.blockNumber ?? "unknown")}
              className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-pulse-text">
                    Ownership transferred{event.renounced ? " to the zero address" : ""}
                  </h4>
                  <p className="mt-1 break-all font-mono text-xs leading-5 text-pulse-muted">
                    {event.previousOwner ?? "unknown"} to {event.newOwner ?? "unknown"}
                  </p>
                </div>
                <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-pulse-muted">
                  {event.blockNumber === null ? "block unavailable" : "block " + event.blockNumber}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="break-all font-mono text-[11px] text-pulse-muted">
                  {event.transactionHash}
                </code>
                <CopyButton value={event.transactionHash} label="Copy tx" compact />
                {report.chain ? (
                  <ExternalLink
                    href={explorerTxUrl(report.chain.chainId, event.transactionHash)}
                    label="Explorer"
                    compact
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {report.history.decodedCalls.map((call) => (
          <article
            key={call.transactionHash + "-" + (call.selector ?? "unknown")}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-all font-mono text-xs font-bold text-pulse-text">
                  {call.signature ?? call.selector ?? "Unresolved call"}
                </p>
                <p className="mt-1 text-xs leading-5 text-pulse-muted">
                  {call.timestamp ? formatTimestamp(call.timestamp) : "Time unavailable"}
                  {call.blockNumber ? " · block " + call.blockNumber : ""}
                </p>
              </div>
              <CallStatus success={call.success} afterOwnershipZero={call.afterOwnershipZero} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="break-all font-mono text-[11px] text-pulse-muted">
                {call.transactionHash}
              </code>
              <CopyButton value={call.transactionHash} label="Copy tx" compact />
              {report.chain ? (
                <ExternalLink
                  href={explorerTxUrl(report.chain.chainId, call.transactionHash)}
                  label="Explorer"
                  compact
                />
              ) : null}
            </div>
          </article>
        ))}
        {report.history.decodedCalls.length === 0 ? (
          <p className="text-sm text-pulse-muted">No privileged calls were decoded.</p>
        ) : null}
      </div>
      <Limitations items={report.history.limitations} />
    </TechnicalDetails>
  );
}

function SimulationEvidence({ report }: { report: TokenContractReportResponse }) {
  return (
    <TechnicalDetails
      title="Bounded eth_call simulations"
      meta={report.simulation.attempts.length + " attempt" +
        (report.simulation.attempts.length === 1 ? "" : "s")}
    >
      <p className="mb-3 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted">
        Calls were read-only at captured block{" "}
        {report.simulation.blockNumber ?? "unknown"}. A successful simulation proves only
        that the tested call path succeeded at that block. No transaction was submitted,
        signed, funded, or relayed.
      </p>
      <div className="space-y-2">
        {report.simulation.attempts.map((attempt) => (
          <article
            key={attempt.id}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-pulse-text">{attempt.label}</h4>
                <p className="mt-1 break-all font-mono text-xs text-pulse-muted">
                  {attempt.functionSignature}
                </p>
              </div>
              <SimulationStatus status={attempt.status} />
            </div>
            <p className="mt-2 text-xs leading-5 text-pulse-muted">{attempt.detail}</p>
            <p className="mt-2 break-all font-mono text-[11px] leading-5 text-pulse-muted">
              from {attempt.from ?? "ordinary account unavailable"} · to {attempt.to}
            </p>
          </article>
        ))}
        {report.simulation.attempts.length === 0 ? (
          <p className="text-sm text-pulse-muted">No simulation attempts were available.</p>
        ) : null}
      </div>
      <Limitations items={report.simulation.limitations} />
    </TechnicalDetails>
  );
}

function LiquidityEvidence({ report }: { report: TokenContractReportResponse }) {
  return (
    <TechnicalDetails
      title="Discovered DEX liquidity"
      meta={report.liquidity.pairs.length + " pair" +
        (report.liquidity.pairs.length === 1 ? "" : "s")}
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {report.liquidity.pairs.map((pair) => (
          <article
            key={pair.pairAddress}
            className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pulse-muted">
                  {pair.dexId ?? "Unknown DEX"} · {pair.chainSlug}
                </p>
                <p className="mt-1 break-all font-mono text-xs font-bold text-pulse-text">
                  {pair.pairAddress}
                </p>
              </div>
              <p className="text-sm font-bold text-pulse-text">
                {pair.liquidityUsd === null
                  ? "Liquidity unknown"
                  : formatUsd(pair.liquidityUsd)}
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <CopyButton value={pair.pairAddress} label="Copy pair" compact />
              {pair.url ? <ExternalLink href={pair.url} label="Open pair" compact /> : null}
            </div>
          </article>
        ))}
        {report.liquidity.pairs.length === 0 ? (
          <p className="text-sm text-pulse-muted">No supported DEX pair was returned.</p>
        ) : null}
      </div>
      <Limitations items={report.liquidity.limitations} />
    </TechnicalDetails>
  );
}

function TechnicalDetails({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <details className="rounded-2xl border border-pulse-border/75 bg-pulse-bg/40">
      <summary
        className={
          "cursor-pointer rounded-2xl p-4 text-sm font-bold text-pulse-text sm:p-5 " +
          FOCUS_RING
        }
      >
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>{title}</span>
          {meta ? (
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-pulse-muted">
              {meta}
            </span>
          ) : null}
        </span>
      </summary>
      <div className="border-t border-pulse-border/60 p-4 sm:p-5">{children}</div>
    </details>
  );
}

function ReportFailureState({ report }: { report: TokenContractReportResponse }) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-pulse-red/35 bg-pulse-red/10 p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-red">
        Report unavailable
      </p>
      <h2 className="mt-2 text-xl font-bold tracking-tight text-pulse-text">
        This request could not be completed
      </h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-pulse-muted">
        {report.errors.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}

function EmptyReportState({ status }: { status: SubmitStatus }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-pulse-border/75 bg-pulse-bg/40 text-sm leading-6 text-pulse-muted shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]">
      <div className="p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          Full-width report
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-pulse-text">
          Evidence will appear here
        </h2>
        <p className="mt-2 max-w-3xl">
          The server-owned conclusion arrives first, followed by observed concerns,
          untested areas, evidence coverage, and collapsed technical records. Incomplete
          analysis never means a contract is safe.
        </p>
      </div>
      <div className="grid border-t border-pulse-border/60 sm:grid-cols-3">
        <MetadataCell label="Deterministic" value="source, bytecode, history" />
        <MetadataCell label="Read-only" value="storage and eth_call simulations" />
        <MetadataCell label="Secondary" value="optional cited AI explanation" />
      </div>
      {status === "loading" ? (
        <p className="border-t border-pulse-border/60 px-4 py-3 font-semibold text-pulse-cyan sm:px-5">
          Reading bounded contract evidence…
        </p>
      ) : null}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  meta,
  tone = "muted",
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  tone?: "amber" | "cyan" | "muted";
}) {
  const eyebrowClass =
    tone === "amber"
      ? "text-amber-200"
      : tone === "cyan"
        ? "text-pulse-cyan"
        : "text-pulse-muted";

  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p
          className={
            "text-xs font-semibold uppercase tracking-[0.16em] " + eyebrowClass
          }
        >
          {eyebrow}
        </p>
        <h3 className="mt-1 text-base font-bold tracking-tight text-pulse-text">
          {title}
        </h3>
      </div>
      {meta ? (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pulse-muted">
          {meta}
        </p>
      ) : null}
    </div>
  );
}

function ReportMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "caution" | "danger" | "good" | "neutral";
}) {
  const valueClass =
    tone === "good"
      ? "text-pulse-green"
      : tone === "caution"
        ? "text-amber-200"
        : tone === "danger"
          ? "text-pulse-red"
          : "text-pulse-text";

  return (
    <div className="rounded-xl border border-pulse-border/65 bg-pulse-bg/45 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </p>
      <p className={"mt-1 break-words text-sm font-bold leading-5 " + valueClass}>
        {value}
      </p>
    </div>
  );
}

function ReportDataRow({
  label,
  value,
  href,
  detail,
  copyValue,
}: {
  label: string;
  value: string;
  href: string | null;
  detail?: string;
  copyValue?: string | null;
}) {
  return (
    <div className="grid gap-2 px-3 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-start sm:gap-4">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </span>
      <span className="min-w-0">
        <span className="block break-all font-mono text-xs font-semibold leading-5 text-pulse-text">
          {value}
        </span>
        {detail ? (
          <span className="mt-1 block text-xs leading-5 text-pulse-muted">{detail}</span>
        ) : null}
      </span>
      <span className="flex flex-wrap gap-2 sm:justify-end">
        {copyValue ? <CopyButton value={copyValue} label="Copy" compact /> : null}
        {href && value !== "Unavailable" ? (
          <ExternalLink href={href} label="Explorer" compact />
        ) : null}
      </span>
    </div>
  );
}

function MetadataCell({
  label,
  value,
  mono = false,
  copyValue,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyValue?: string | null;
}) {
  return (
    <div className="rounded-xl border border-pulse-border/60 bg-pulse-bg/40 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </p>
      <p
        className={
          "mt-1 break-words text-sm font-semibold leading-5 text-pulse-text " +
          (mono ? "break-all font-mono text-xs" : "")
        }
      >
        {value}
      </p>
      {copyValue ? (
        <div className="mt-2">
          <CopyButton value={copyValue} label="Copy raw value" compact />
        </div>
      ) : null}
    </div>
  );
}

function SignalItem({
  signal,
}: {
  signal: TokenContractReportResponse["signals"][number];
}) {
  return (
    <article className="rounded-xl border border-pulse-border/70 bg-pulse-panel/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-pulse-muted">{signal.id}</p>
          <h4 className="mt-1 text-sm font-bold leading-5 text-pulse-text">
            {signal.label}
          </h4>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <SeverityBadge severity={signal.severity} />
          {signal.status === "incomplete" ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
              incomplete
            </span>
          ) : (
            <span className="rounded-full border border-pulse-green/30 bg-pulse-green/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-pulse-green">
              complete
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-pulse-muted">{signal.evidence}</p>
    </article>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: TokenContractFinding["severity"];
}) {
  const className =
    severity === "critical" || severity === "high"
      ? "border-pulse-red/35 bg-pulse-red/10 text-pulse-red"
      : severity === "medium"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : severity === "low"
          ? "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan"
          : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";

  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] " +
        className
      }
    >
      {severity}
    </span>
  );
}

function FindingStateBadge({ state }: { state: TokenContractFinding["state"] }) {
  const className =
    state === "confirmed"
      ? "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan"
      : state === "review-clue" || state === "unresolved"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";
  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] " +
        className
      }
    >
      {humanize(state)}
    </span>
  );
}

function CheckStatus({ check }: { check: TokenContractCriticalCheck }) {
  const className = checkStatusClass(check);
  const label =
    check.status === "confirmed" && check.disposition
      ? humanize(check.disposition) + " confirmed"
      : humanize(check.status);
  return (
    <span
      className={
        "w-fit shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] " +
        className
      }
    >
      {label}
    </span>
  );
}

function ModuleStatus({
  status,
}: {
  status: TokenContractReportModule["status"];
}) {
  const className =
    status === "complete"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : status === "partial"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";
  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] " +
        className
      }
    >
      {status}
    </span>
  );
}

function StandardPill({
  label,
  state,
  tone,
}: {
  label: string;
  state: string;
  tone: "active" | "caution" | "muted";
}) {
  const className =
    tone === "active"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : tone === "caution"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-border bg-pulse-panel/55 text-pulse-muted";

  return (
    <span
      className={
        "inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold " +
        className
      }
    >
      <span>{label}</span>
      <span className="min-w-0 break-words opacity-80">{state}</span>
    </span>
  );
}

function StatusBadge({ status, ok }: { status: string; ok: boolean }) {
  const className =
    status === "complete" && ok
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : status === "partial"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-red/35 bg-pulse-red/10 text-pulse-red";
  return (
    <span
      className={
        "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold " + className
      }
    >
      Report {humanize(status)}
    </span>
  );
}

function VerdictBadge({
  severity,
  label,
}: {
  severity: TokenContractReportResponse["verdict"]["severity"];
  label: TokenContractReportResponse["verdict"]["label"];
}) {
  const className =
    severity === "critical" || severity === "high"
      ? "border-pulse-red/45 bg-pulse-red/15 text-pulse-red"
      : severity === "medium"
        ? "border-amber-400/45 bg-amber-400/15 text-amber-100"
        : severity === "low"
          ? "border-pulse-green/45 bg-pulse-green/15 text-pulse-green"
          : "border-pulse-border bg-pulse-bg/70 text-pulse-text";
  return (
    <span
      className={
        "inline-flex w-fit rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] " +
        className
      }
    >
      {label}
    </span>
  );
}

function SelectorClassBadge({
  classification,
}: {
  classification: TokenContractReportResponse["selectors"][number]["classification"];
}) {
  const className =
    classification === "dangerous"
      ? "border-pulse-red/35 bg-pulse-red/10 text-pulse-red"
      : classification === "admin"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : classification === "standard"
          ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
          : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";
  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] " +
        className
      }
    >
      {classification}
    </span>
  );
}

function SimulationStatus({
  status,
}: {
  status: TokenContractReportResponse["simulation"]["attempts"][number]["status"];
}) {
  const className =
    status === "succeeded"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : status === "reverted"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";
  return (
    <span
      className={
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] " +
        className
      }
    >
      {status}
    </span>
  );
}

function CallStatus({
  success,
  afterOwnershipZero,
}: {
  success: boolean | null;
  afterOwnershipZero: boolean | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span
        className={
          "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] " +
          (success === true
            ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
            : success === false
              ? "border-pulse-red/35 bg-pulse-red/10 text-pulse-red"
              : "border-pulse-border bg-pulse-bg/70 text-pulse-muted")
        }
      >
        {success === null ? "status unknown" : success ? "succeeded" : "failed"}
      </span>
      {afterOwnershipZero ? (
        <span className="rounded-full border border-pulse-red/35 bg-pulse-red/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-pulse-red">
          after owner zero
        </span>
      ) : null}
    </div>
  );
}

function CopyButton({
  value,
  label,
  compact = false,
}: {
  value: string;
  label: string;
  compact?: boolean;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), 1800);
  }

  const visibleLabel =
    copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={copy}
      className={
        "inline-flex items-center justify-center rounded-lg border border-pulse-border bg-pulse-text/5 font-semibold text-pulse-muted transition hover:border-pulse-cyan/35 hover:text-pulse-text " +
        (compact ? "min-h-7 px-2 py-1 text-[11px]" : "min-h-8 px-3 py-1 text-xs") +
        " " +
        FOCUS_RING
      }
      aria-label={label}
    >
      <span aria-live="polite">{visibleLabel}</span>
    </button>
  );
}

function ExternalLink({
  href,
  label,
  compact = false,
}: {
  href: string;
  label: string;
  compact?: boolean;
}) {
  const safeHref = safeExternalUrl(href);
  if (!safeHref) return null;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noreferrer"
      className={
        "inline-flex items-center justify-center rounded-lg border border-pulse-cyan/25 bg-pulse-cyan/5 font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/10 " +
        (compact ? "min-h-7 px-2 py-1 text-[11px]" : "min-h-8 px-3 py-1 text-xs") +
        " " +
        FOCUS_RING
      }
    >
      {label}
    </a>
  );
}

function NarrativeList({
  title,
  items,
  mono = false,
}: {
  title: string;
  items: string[];
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3">
      <h4 className="text-sm font-bold text-pulse-text">{title}</h4>
      {items.length > 0 ? (
        <ul
          className={
            "mt-2 space-y-2 text-sm leading-5 text-pulse-muted " +
            (mono ? "break-all font-mono text-xs" : "")
          }
        >
          {items.map((item) => (
            <li key={item} className="border-l border-pulse-border pl-3">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm leading-5 text-pulse-muted">None returned.</p>
      )}
    </div>
  );
}

function Limitations({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
        Limitations
      </p>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-pulse-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

async function readTokenContractReportStream({
  payload,
  signal,
  onEvent,
}: {
  payload: ReportRequest;
  signal: AbortSignal;
  onEvent: (event: TokenContractReportStreamEvent) => void;
}): Promise<StreamReadResult> {
  let reportSeen = false;
  let report: TokenContractReportResponse | null = null;
  let streamError: string | null = null;

  try {
    const response = await fetch("/api/token-contract-report/stream", {
      method: "POST",
      cache: "no-store",
      headers: {
        accept: "application/x-ndjson",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal,
    });
    if (response.status === 400 || response.status === 429) {
      let message =
        response.status === 429
          ? "The deep-audit limit is active or another audit is already running."
          : "The progressive report request was rejected.";
      try {
        const body: unknown = await response.json();
        if (isRecord(body) && Array.isArray(body.errors)) {
          const first = body.errors.find(
            (item): item is string => typeof item === "string",
          );
          if (first) message = first;
        }
      } catch {
        // Keep the status-derived message.
      }
      return {
        reportSeen: false,
        report: null,
        error: message,
        fallbackAllowed: false,
      };
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_STREAM_BYTES) {
      throw new Error("The progressive report exceeded the client size limit.");
    }
    if (!response.body) {
      return {
        reportSeen,
        report,
        fallbackAllowed: true,
        error: response.ok
          ? "The progressive report returned no readable stream."
          : "The progressive endpoint returned HTTP " + response.status + ".",
      };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    let buffer = "";

    const processLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.length > MAX_STREAM_LINE_CHARS) {
        throw new Error("A progressive report event exceeded the client size limit.");
      }
      const event = parseStreamEvent(trimmed);
      if (!event) return;
      if (event.type === "base" || event.type === "final") {
        reportSeen = true;
        report = event.report;
      } else if (event.type === "module") {
        if (event.report) {
          reportSeen = true;
          report = event.report;
        }
        if (report) {
          report = {
            ...report,
            modules: {
              ...report.modules,
              [event.module.id]: event.module,
            },
          };
        }
      } else if (event.type === "error") {
        streamError = event.error;
      }
      onEvent(event);
    };

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        totalBytes += chunk.value.byteLength;
        if (totalBytes > MAX_STREAM_BYTES) {
          throw new Error("The progressive report exceeded the client size limit.");
        }
        buffer += decoder.decode(chunk.value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          processLine(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
        }
        if (buffer.length > MAX_STREAM_LINE_CHARS) {
          throw new Error("A progressive report event exceeded the client size limit.");
        }
      }
      buffer += decoder.decode();
      processLine(buffer);
    } finally {
      reader.releaseLock();
    }

    if (!response.ok && !streamError) {
      streamError = "The progressive endpoint returned HTTP " + response.status + ".";
    }
    return { reportSeen, report, error: streamError, fallbackAllowed: true };
  } catch (streamFailure) {
    if (signal.aborted) throw streamFailure;
    return {
      reportSeen,
      report,
      error: streamError ?? errorMessage(streamFailure),
      fallbackAllowed: true,
    };
  }
}

function parseStreamEvent(line: string): TokenContractReportStreamEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new Error("The progressive report returned malformed NDJSON.");
  }
  if (!isRecord(value) || typeof value.type !== "string") return null;
  if (value.type === "base" || value.type === "final") {
    if (!isTokenContractReportResponse(value.report)) return null;
    return { type: value.type, report: value.report };
  }
  if (value.type === "module") {
    if (!isTokenContractReportModule(value.module)) return null;
    if (value.report !== undefined && !isTokenContractReportResponse(value.report)) {
      return null;
    }
    return {
      type: "module",
      module: value.module,
      ...(value.report ? { report: value.report } : {}),
    };
  }
  if (value.type === "error" && typeof value.error === "string") {
    return { type: "error", error: value.error };
  }
  return null;
}

function isTokenContractReportResponse(
  value: unknown,
): value is TokenContractReportResponse {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 2 &&
    typeof value.generatedAt === "string" &&
    typeof value.ok === "boolean" &&
    typeof value.status === "string" &&
    isRecord(value.verdict) &&
    isRecord(value.audit) &&
    isRecord(value.modules) &&
    Array.isArray(value.findings) &&
    Array.isArray(value.selectors) &&
    Array.isArray(value.warnings) &&
    Array.isArray(value.reportBoundaries) &&
    Array.isArray(value.errors)
  );
}

function isTokenContractReportModule(
  value: unknown,
): value is TokenContractReportModule {
  if (!isRecord(value)) return false;
  return (
    ["source", "bytecode", "history", "simulation", "liquidity", "ai"].includes(
      String(value.id),
    ) &&
    typeof value.label === "string" &&
    ["complete", "partial", "unavailable", "skipped"].includes(
      String(value.status),
    ) &&
    typeof value.evidenceCount === "number" &&
    typeof value.summary === "string" &&
    Array.isArray(value.warnings)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function moduleStatusLabel(status: TokenContractReportModule["status"]): string {
  if (status === "complete") return "complete";
  if (status === "partial") return "partial evidence received";
  if (status === "skipped") return "skipped";
  return "unavailable";
}

function checkStatusClass(check: TokenContractCriticalCheck): string {
  if (check.status === "confirmed") {
    if (check.disposition === "concern") {
      return "border-pulse-red/35 bg-pulse-red/10 text-pulse-red";
    }
    if (check.disposition === "protective") {
      return "border-pulse-green/35 bg-pulse-green/10 text-pulse-green";
    }
    return "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan";
  }
  if (check.status === "not_detected") {
    return check.disposition === "concern"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";
  }
  if (check.status === "needs_review" || check.status === "unknown") {
    return "border-amber-400/35 bg-amber-400/10 text-amber-200";
  }
  return "border-pulse-border bg-pulse-bg/70 text-pulse-muted";
}

function verdictPanelClass(
  severity: TokenContractReportResponse["verdict"]["severity"],
): string {
  if (severity === "critical" || severity === "high") {
    return "border-pulse-red/40 bg-pulse-red/5";
  }
  if (severity === "medium") return "border-amber-400/35 bg-amber-400/5";
  if (severity === "low") return "border-pulse-green/30 bg-pulse-green/5";
  return "border-pulse-border/75 bg-pulse-bg/45";
}

function severityMetricTone(
  severity: TokenContractReportResponse["verdict"]["severity"],
): "caution" | "danger" | "good" | "neutral" {
  if (severity === "critical" || severity === "high") return "danger";
  if (severity === "medium") return "caution";
  if (severity === "low") return "good";
  return "neutral";
}

function formattedTokenSupply(report: TokenContractReportResponse): string | null {
  const symbol = report.token.symbol?.trim() ?? "";
  const supplied = report.token.formattedTotalSupply?.trim();
  if (supplied) return appendSymbol(supplied, symbol);
  const raw = report.token.totalSupply;
  const decimals = report.token.decimals;
  if (!raw || decimals === null || decimals < 0 || !/^\d+$/.test(raw)) return null;
  const padded = raw.padStart(decimals + 1, "0");
  const integerPart = decimals === 0 ? padded : padded.slice(0, -decimals);
  const fractionalPart =
    decimals === 0 ? "" : padded.slice(-decimals).replace(/0+$/, "");
  const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return appendSymbol(grouped + (fractionalPart ? "." + fractionalPart : ""), symbol);
}

function appendSymbol(value: string, symbol: string): string {
  if (!symbol) return value;
  if (value.toLocaleUpperCase().endsWith(" " + symbol.toLocaleUpperCase())) {
    return value;
  }
  return value + " " + symbol;
}

function formatTimestamp(value: string): string {
  const numeric = /^\d+$/.test(value) ? Number(value) : Number.NaN;
  const date = Number.isFinite(numeric)
    ? new Date(value.length <= 10 ? numeric * 1000 : numeric)
    : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function humanize(value: string): string {
  return value.replace(/[_-]+/g, " ");
}

function sourceLocation(
  file: string,
  startLine: number | undefined,
  endLine: number | undefined,
): string {
  if (startLine === undefined) return file;
  if (endLine === undefined || endLine === startLine) return file + ":" + startLine;
  return file + ":" + startLine + "–" + endLine;
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : "Token contract report failed.";
}

function aiReasonLabel(
  reason: NonNullable<TokenContractReportResponse["ai"]["reason"]>,
) {
  if (reason === "not-configured") return "not configured";
  if (reason === "rate-limited") return "rate limited";
  if (reason === "insufficient-balance") return "balance required";
  if (reason === "authentication") return "authentication failed";
  if (reason === "timeout") return "timed out";
  if (reason === "oversized-output") return "response too large";
  return "unavailable";
}

function aiReasonDescription(
  reason: NonNullable<TokenContractReportResponse["ai"]["reason"]>,
) {
  const descriptions: Record<
    NonNullable<TokenContractReportResponse["ai"]["reason"]>,
    string
  > = {
    "not-configured": "not configured for this deployment",
    "request-aborted": "unavailable because the request was cancelled",
    timeout: "unavailable because the provider timed out",
    authentication: "unavailable because provider authentication failed",
    "insufficient-balance": "unavailable because the provider account needs balance",
    "rate-limited": "temporarily rate limited",
    "provider-error": "temporarily unavailable from the provider",
    "empty-output": "unavailable because the provider returned an empty result",
    "oversized-output": "unavailable because the provider response exceeded the size limit",
    "truncated-output": "unavailable because the provider response was truncated",
    "invalid-output": "unavailable because the provider result failed validation",
  };
  return descriptions[reason];
}
