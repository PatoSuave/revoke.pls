"use client";

import { useMemo, useState } from "react";

import { ChainLogo } from "@/components/chains/chain-logo";
import { explorerTokenUrl } from "@/lib/explorer";
import {
  TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS,
  type TokenContractReportResponse,
} from "@/lib/token-contract-report";

type SubmitStatus = "idle" | "loading" | "complete" | "error";

export function TokenContractReportClient() {
  const [chainId, setChainId] = useState(
    TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS[0]?.chainId ?? 369,
  );
  const [contractAddress, setContractAddress] = useState("");
  const [includeAi, setIncludeAi] = useState(true);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [report, setReport] = useState<TokenContractReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedChain = useMemo(
    () =>
      TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS.find(
        (chain) => chain.chainId === chainId,
      ) ?? TOKEN_CONTRACT_REPORT_CHAIN_OPTIONS[0],
    [chainId],
  );
  const trimmedAddress = contractAddress.trim();
  const explorerUrl =
    /^0x[a-fA-F0-9]{40}$/.test(trimmedAddress) && selectedChain
      ? explorerTokenUrl(selectedChain.chainId, trimmedAddress)
      : null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setReport(null);

    try {
      const response = await fetch("/api/token-contract-report", {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          chainId,
          contractAddress: trimmedAddress,
          includeAi,
        }),
      });
      const body = (await response.json()) as TokenContractReportResponse;
      setReport(body);
      setStatus(response.ok ? "complete" : "error");
      if (!response.ok) {
        setError(body.errors?.[0] ?? "Token contract report failed.");
      }
    } catch (requestError) {
      setStatus("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Token contract report failed.",
      );
    }
  }

  function onClear() {
    setContractAddress("");
    setReport(null);
    setError(null);
    setStatus("idle");
  }

  return (
    <section className="py-6 sm:py-8">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="rounded-2xl border border-pulse-border/80 bg-pulse-panel/45 p-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.035)] sm:p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="token-report-chain"
                className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-muted"
              >
                Chain
              </label>
              <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-xl border border-pulse-border bg-pulse-bg/70 px-3 py-2">
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
                  className="min-h-9 w-full bg-transparent text-sm font-semibold text-pulse-text outline-none"
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
                id="token-report-address"
                value={contractAddress}
                onChange={(event) => setContractAddress(event.target.value)}
                placeholder="0x..."
                autoComplete="off"
                spellCheck={false}
                className="mt-2 min-h-11 w-full rounded-xl border border-pulse-border bg-pulse-bg/80 px-3 py-2 font-mono text-sm text-pulse-text outline-none transition placeholder:text-pulse-muted/60 focus:border-pulse-cyan/60"
              />
              {explorerUrl ? (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex text-xs font-semibold text-pulse-cyan transition hover:text-pulse-text"
                >
                  Open contract on explorer
                </a>
              ) : null}
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-pulse-border/70 bg-pulse-bg/35 p-3 text-sm text-pulse-muted">
              <input
                type="checkbox"
                checked={includeAi}
                onChange={(event) => setIncludeAi(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-pulse-border bg-pulse-bg text-pulse-cyan"
              />
              <span>
                Include DeepSeek narrative when server-side API settings are
                configured.
              </span>
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "loading" ? "Generating..." : "Generate report"}
              </button>
              <button
                type="button"
                onClick={onClear}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-4 py-2 text-xs font-semibold text-pulse-muted transition hover:bg-pulse-text/10"
              >
                Clear
              </button>
            </div>
          </form>
          {error ? (
            <p className="mt-4 rounded-xl border border-pulse-red/35 bg-pulse-red/10 px-3 py-2 text-sm font-semibold text-pulse-red">
              {error}
            </p>
          ) : null}
        </div>

        <ReportOutput report={report} status={status} />
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
  if (!report) {
    return <EmptyReportState status={status} />;
  }

  const sourceStatus = report.contract?.source.verified ?? "unknown";
  const creation = report.contract?.creation;
  const tokenHeading =
    report.token.symbol || report.token.name || "Contract report";
  const tokenSubheading =
    report.token.symbol && report.token.name
      ? report.token.name
      : (report.chain?.name ?? "Selected chain");
  const creationDetail =
    creation?.lookupStatus === "found"
      ? [
          creation.blockNumber ? `Block ${creation.blockNumber}` : null,
          creation.timestamp,
        ]
          .filter(Boolean)
          .join(" / ")
      : "Explorer creation metadata unavailable";
  const aiValue =
    report.ai.status === "generated" && report.ai.model
      ? report.ai.model
      : report.ai.status;
  const erc6909Tone =
    report.standards.erc6909 === "detected"
      ? "active"
      : report.standards.erc6909 === "limited"
        ? "caution"
        : "muted";

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-pulse-border/75 bg-pulse-bg/45 shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]">
        <div className="border-b border-pulse-border/60 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
                {report.chain?.name ?? "Selected chain"}
              </p>
              <h2 className="mt-2 break-words text-2xl font-bold tracking-tight text-pulse-text">
                {tokenHeading}
              </h2>
              <p className="mt-1 text-sm font-semibold text-pulse-muted">
                {tokenSubheading}
              </p>
            </div>
            <StatusBadge status={report.status} ok={report.ok} />
          </div>
          <p className="mt-4 break-all font-mono text-xs leading-5 text-pulse-muted">
            {report.contract?.address}
          </p>
        </div>

        <div className="grid border-b border-pulse-border/60 sm:grid-cols-4">
          <ReportMetric
            label="Source"
            value={sourceStatus}
            tone={sourceStatus === "verified" ? "good" : "neutral"}
          />
          <ReportMetric
            label="Evidence"
            value={`${report.signals.length} signals`}
          />
          <ReportMetric
            label="Warnings"
            value={
              report.warnings.length > 0
                ? `${report.warnings.length} open`
                : "0 open"
            }
            tone={report.warnings.length > 0 ? "caution" : "good"}
          />
          <ReportMetric label="AI" value={aiValue} />
        </div>

        <div className="divide-y divide-pulse-border/60">
          <ReportDataRow
            label="Contract"
            value={report.contract?.address ?? "Unavailable"}
            href={report.contract?.explorerUrl ?? null}
          />
          <ReportDataRow
            label="Deployer"
            value={creation?.deployerAddress ?? "Unavailable"}
            href={creation?.deployerUrl ?? null}
          />
          <ReportDataRow
            label="Creation tx"
            value={creation?.transactionHash ?? "Unavailable"}
            href={creation?.transactionUrl ?? null}
            detail={creationDetail}
          />
        </div>

        <div className="grid border-t border-pulse-border/60 sm:grid-cols-4">
          <MetadataCell label="Name" value={report.token.name ?? "Unknown"} />
          <MetadataCell
            label="Symbol"
            value={report.token.symbol ?? "Unknown"}
          />
          <MetadataCell
            label="Decimals"
            value={
              report.token.decimals === null
                ? "Unknown"
                : report.token.decimals.toString()
            }
          />
          <MetadataCell
            label="Total supply"
            value={report.token.totalSupply ?? "Unknown"}
            mono
          />
        </div>
      </section>

      <section className="rounded-2xl border border-pulse-border/75 bg-pulse-bg/40 p-4 sm:p-5">
        <SectionHeading
          eyebrow="Signals"
          title="Detected standards"
          meta="read-only probes"
        />
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
            state={report.standards.erc6909.replace(/_/g, " ")}
            tone={erc6909Tone}
          />
          <StandardPill
            label="Hybrid"
            state={report.standards.hybrid ? "detected" : "not detected"}
            tone={report.standards.hybrid ? "caution" : "muted"}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-pulse-border/75 bg-pulse-bg/40 p-4 sm:p-5">
        <SectionHeading
          eyebrow="Evidence"
          title="Contract read results"
          meta={`${report.signals.length} checks`}
        />
        <div className="mt-3 space-y-2">
          {report.signals.length > 0 ? (
            report.signals.map((signal) => (
              <SignalItem key={signal.id} signal={signal} />
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-pulse-border/70 bg-pulse-bg/35 p-3 text-sm text-pulse-muted">
              No deterministic evidence was returned for this request.
            </p>
          )}
        </div>
      </section>

      <section
        className={`rounded-2xl border p-4 sm:p-5 ${
          report.ai.markdown
            ? "border-pulse-cyan/30 bg-pulse-cyan/5"
            : "border-pulse-border/75 bg-pulse-bg/40"
        }`}
      >
        <SectionHeading
          eyebrow="AI narrative"
          title={
            report.ai.markdown
              ? "DeepSeek contract intelligence"
              : "Narrative unavailable"
          }
          meta={aiValue}
          tone={report.ai.markdown ? "cyan" : "muted"}
        />
        {report.ai.markdown ? (
          <pre className="mt-3 max-h-[36rem] overflow-auto whitespace-pre-wrap break-words border-t border-pulse-cyan/20 pt-3 font-sans text-sm leading-6 text-pulse-text">
            {report.ai.markdown}
          </pre>
        ) : (
          <p className="mt-3 border-t border-pulse-border/60 pt-3 text-sm leading-6 text-pulse-muted">
            The deterministic evidence above is still available. AI status is{" "}
            <span className="font-semibold text-pulse-text">
              {report.ai.status}
            </span>
            .
          </p>
        )}
      </section>

      {report.warnings.length > 0 ? (
        <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 sm:p-5">
          <SectionHeading
            eyebrow="Warnings"
            title="Report boundaries"
            meta={`${report.warnings.length} warnings`}
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
    </div>
  );
}

function EmptyReportState({ status }: { status: SubmitStatus }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-pulse-border/75 bg-pulse-bg/40 text-sm leading-6 text-pulse-muted shadow-[inset_0_1px_0_rgb(255_255_255/0.03)]">
      <div className="p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          Report
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-pulse-text">
          Evidence will appear here
        </h2>
        <p className="mt-2">
          The report reads public chain and explorer data only. It does not
          connect a wallet, sign transactions, or claim that a contract is safe.
        </p>
      </div>
      <div className="grid border-t border-pulse-border/60 sm:grid-cols-3">
        <MetadataCell label="Reads" value="bytecode, source, standards" />
        <MetadataCell label="Addresses" value="contract, deployer, tx" />
        <MetadataCell label="Output" value="evidence plus optional AI" />
      </div>
      {status === "loading" ? (
        <p className="border-t border-pulse-border/60 px-4 py-3 font-semibold text-pulse-cyan sm:px-5">
          Reading contract evidence...
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
          className={`text-xs font-semibold uppercase tracking-[0.16em] ${eyebrowClass}`}
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
  tone?: "caution" | "good" | "neutral";
}) {
  const valueClass =
    tone === "good"
      ? "text-pulse-green"
      : tone === "caution"
        ? "text-amber-200"
        : "text-pulse-text";

  return (
    <div className="border-b border-pulse-border/60 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-bold leading-5 ${valueClass}`}
      >
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
}: {
  label: string;
  value: string;
  href: string | null;
  detail?: string;
}) {
  const content = (
    <>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </span>
      <span className="min-w-0">
        <span className="block break-all font-mono text-xs font-semibold leading-5 text-pulse-text">
          {value}
        </span>
        {detail ? (
          <span className="mt-1 block text-xs leading-5 text-pulse-muted">
            {detail}
          </span>
        ) : null}
      </span>
    </>
  );
  const className =
    "grid gap-1 px-4 py-3 transition sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-4";

  if (!href || value === "Unavailable") {
    return <div className={className}>{content}</div>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className} hover:bg-pulse-cyan/5`}
    >
      {content}
    </a>
  );
}

function MetadataCell({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="border-b border-pulse-border/60 px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </p>
      <p
        className={`mt-1 break-words text-sm font-semibold leading-5 text-pulse-text ${
          mono ? "break-all font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SignalItem({
  signal,
}: {
  signal: TokenContractReportResponse["signals"][number];
}) {
  return (
    <article className="rounded-xl border border-pulse-border/70 bg-pulse-panel/35 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h4 className="min-w-0 text-sm font-bold leading-5 text-pulse-text">
          {signal.label}
        </h4>
        <div className="flex shrink-0 flex-wrap gap-2">
          <SeverityBadge severity={signal.severity} />
          {signal.status === "incomplete" ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-200">
              incomplete
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-sm leading-6 text-pulse-muted">
        {signal.evidence}
      </p>
    </article>
  );
}

function SeverityBadge({
  severity,
}: {
  severity: TokenContractReportResponse["signals"][number]["severity"];
}) {
  const className =
    severity === "high"
      ? "border-pulse-red/35 bg-pulse-red/10 text-pulse-red"
      : severity === "medium"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : severity === "low"
          ? "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan"
          : "border-pulse-border bg-pulse-bg/70 text-pulse-muted";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {severity}
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
      className={`inline-flex min-h-8 max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      <span>{label}</span>
      <span className="min-w-0 break-words opacity-80">{state}</span>
    </span>
  );
}

function StatusBadge({ status, ok }: { status: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
        ok
          ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
          : "border-amber-400/35 bg-amber-400/10 text-amber-200"
      }`}
    >
      {status}
    </span>
  );
}
