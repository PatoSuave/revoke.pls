"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Address } from "viem";

import { shortenAddress } from "@/lib/format";
import {
  TOKEN_CHAIR_API_ROUTE,
  TOKEN_CHAIR_CHAIN_LABEL,
  TOKEN_CHAIR_DISCLAIMER,
  buildConcentrationDetailRows,
  buildContractSniffCards,
  buildDextoolsDetailRows,
  buildEventHistoryDetailRows,
  buildLpControlSummary,
  buildPairCandidateRows,
  buildQuickSniffRows,
  buildSourceSignalDetailRows,
  buildTokenChairSnifferUrl,
  classifyTokenChairAddress,
  formatCompactNumber,
  formatPriceUsd,
  formatTxns24h,
  formatUsd,
  normalizeTokenChairAddress,
  type ContractSniffCard,
  type SniffSignalRow,
  type SniffRowStatus,
  type TokenChairApiResponse,
  type TokenChairConcentrationDetailRow,
  type TokenChairContractData,
  type TokenChairDextoolsData,
  type TokenChairDextoolsDetailRow,
  type TokenChairEventHistoryDetailRow,
  type TokenChairHolderDistributionRow,
  type TokenChairLpLockRecord,
  type TokenChairLpControlEvidenceRow,
  type TokenChairLpControlSummary,
  type TokenChairMarketData,
  type TokenChairPairCandidateRow,
  type TokenChairPairContractData,
  type TokenChairPulseXPairData,
  type TokenChairSourceSignalDetailRow,
  type TokenChairVerdict,
} from "@/lib/token-chair-sniffer";

type SnifferUiState = "idle" | "loading" | "settled" | "error";

const INVALID_ADDRESS_COPY =
  "Enter a valid EVM-style token address: 0x followed by 40 hex characters.";

const DEFAULT_VERDICT: TokenChairVerdict = {
  kind: "unable-to-fully-verify",
  label: "Unable to fully verify",
  displayLabel: "Chair Verdict: Nose Blocked, Could Not Verify",
  tone: "neutral",
  notes: [
    "Paste a token address to read visible PulseChain market data.",
  ],
  reasons: [
    {
      severity: "info",
      label: "Waiting for token",
      detail: "Paste a token address to read visible PulseChain market data.",
    },
  ],
};

const NAV_ITEMS = [
  { label: "Sniffer", href: "#sniffer", active: true },
  { label: "Approval scanner", href: "/app#scanner", active: false },
  { label: "Security", href: "/security", active: false },
] as const;

const TOKEN_CHAIR_SAMPLE_TOKENS = [
  {
    label: "PLSX",
    address: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as Address,
    detail: "Ecosystem token",
  },
  {
    label: "WPLS",
    address: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as Address,
    detail: "Wrapped native",
  },
  {
    label: "INC",
    address: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d" as Address,
    detail: "Incentive",
  },
  {
    label: "HEX",
    address: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as Address,
    detail: "Ecosystem token",
  },
] as const;

export function TokenChairSniffer({
  initialTokenAddress = null,
  initialResponse = null,
}: {
  initialTokenAddress?: Address | null;
  initialResponse?: TokenChairApiResponse | null;
}) {
  const initialScanRef = useRef<Address | null>(
    initialResponse?.tokenAddress ?? null,
  );
  const [input, setInput] = useState(
    initialResponse?.tokenAddress ?? initialTokenAddress ?? "",
  );
  const [inputTouched, setInputTouched] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [state, setState] = useState<SnifferUiState>(
    initialResponse ? "settled" : "idle",
  );
  const [response, setResponse] = useState<TokenChairApiResponse | null>(
    initialResponse,
  );
  const [requestError, setRequestError] = useState<string | null>(null);

  const normalizedAddress = useMemo(
    () => normalizeTokenChairAddress(input),
    [input],
  );
  const hasInput = input.trim().length > 0;
  const inlineError =
    inputError ??
    (inputTouched && hasInput && !normalizedAddress ? INVALID_ADDRESS_COPY : null);
  const unableToVerify =
    response?.status === "upstream-unavailable" ||
    response?.status === "malformed-response";
  const contract = response?.contract ?? null;
  const quickRows = useMemo(
    () => buildQuickSniffRows({ unableToVerify, contract }),
    [unableToVerify, contract],
  );
  const sourceSignalRows = useMemo(
    () => buildSourceSignalDetailRows({ contract }),
    [contract],
  );
  const concentrationRows = useMemo(
    () => buildConcentrationDetailRows({ contract }),
    [contract],
  );
  const eventHistoryRows = useMemo(
    () => buildEventHistoryDetailRows({ contract }),
    [contract],
  );
  const lpControlSummary = useMemo(
    () => buildLpControlSummary({ contract }),
    [contract],
  );
  const contractCards = useMemo(
    () => buildContractSniffCards({ unableToVerify, contract }),
    [unableToVerify, contract],
  );
  const market = response?.market ?? null;
  const verdict = response?.verdict ?? DEFAULT_VERDICT;

  const runSniff = useCallback(
    async (
      tokenAddress: Address,
      options: { updateUrl?: boolean } = {},
    ) => {
      setInput(tokenAddress);
      setInputError(null);
      setRequestError(null);
      setResponse(null);
      setState("loading");
      if (options.updateUrl) replaceTokenChairUrl(tokenAddress);

      try {
        const apiResponse = await fetchTokenChairMarket(tokenAddress);
        setResponse(apiResponse);
        setState("settled");
      } catch (error) {
        setResponse(null);
        setRequestError(
          error instanceof Error
            ? error.message
            : "Token Chair Sniffer could not read the local API route.",
        );
        setState("error");
      }
    },
    [],
  );

  useEffect(() => {
    if (!initialTokenAddress) return;
    if (initialScanRef.current === initialTokenAddress) return;
    initialScanRef.current = initialTokenAddress;
    setInputTouched(true);
    void runSniff(initialTokenAddress);
  }, [initialTokenAddress, runSniff]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInputTouched(true);

    const tokenAddress = normalizeTokenChairAddress(input);
    if (!tokenAddress) {
      setInputError(INVALID_ADDRESS_COPY);
      setResponse(null);
      setState("idle");
      return;
    }

    await runSniff(tokenAddress, { updateUrl: true });
  }

  return (
    <div className="min-h-dvh bg-[#05070a] text-pulse-text">
      <div className="mx-auto flex w-full max-w-[1600px] gap-4 p-3 sm:p-4">
        <FeatureRail />
        <main id="sniffer" className="min-w-0 flex-1 space-y-4">
          <MobileRail />
          <section className="grid gap-4 rounded-lg border border-pulse-border/80 bg-[#080d12] p-4 shadow-glow lg:grid-cols-[250px_minmax(0,1fr)_360px] lg:p-5">
            <ChairHeroArt />
            <HeroSearch
              input={input}
              hasInput={hasInput}
              inlineError={inlineError}
              state={state}
              onSubmit={onSubmit}
              onInputChange={(value) => {
                setInput(value);
                setInputError(null);
              }}
              onInputBlur={() => setInputTouched(true)}
              onPresetSelect={(tokenAddress) => {
                setInputTouched(true);
                void runSniff(tokenAddress, { updateUrl: true });
              }}
            />
            <VerdictPanel
              verdict={verdict}
              state={state}
              response={response}
              requestError={requestError}
            />
          </section>

          <StatusStrip response={response} state={state} contract={contract} />
          <ScanReport
            response={response}
            state={state}
            requestError={requestError}
            market={market}
            contract={contract}
            verdict={verdict}
            quickRows={quickRows}
            sourceSignalRows={sourceSignalRows}
            concentrationRows={concentrationRows}
            eventHistoryRows={eventHistoryRows}
            lpControlSummary={lpControlSummary}
          />
          <TokenInformationSummary
            response={response}
            state={state}
            market={market}
            contract={contract}
            verdict={verdict}
          />
          <SignalDetailsPanel
            response={response}
            state={state}
            requestError={requestError}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
            <QuickSniffRows rows={quickRows} />
            <MarketChairIntel
              state={state}
              response={response}
              market={market}
            />
          </div>

          <SourceSignalDetails rows={sourceSignalRows} contract={contract} />

          <ContractSniffCards
            cards={contractCards}
            contract={contract}
            state={state}
          />
          <EventHistoryPanel
            rows={eventHistoryRows}
            contract={contract}
            state={state}
          />
          <HolderChairIntel
            rows={concentrationRows}
            contract={contract}
            lpControlSummary={lpControlSummary}
          />
          <DisclaimerPanel />
        </main>
      </div>
    </div>
  );
}

async function fetchTokenChairMarket(
  tokenAddress: Address,
): Promise<TokenChairApiResponse> {
  const response = await fetch(
    `${TOKEN_CHAIR_API_ROUTE}?token=${encodeURIComponent(tokenAddress)}`,
    {
      method: "GET",
      cache: "no-store",
      headers: { accept: "application/json" },
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("Token Chair Sniffer API returned a non-JSON response.");
  }

  const body = (await response.json()) as TokenChairApiResponse;
  if (!body || typeof body.status !== "string") {
    throw new Error("Token Chair Sniffer API returned a malformed response.");
  }

  return body;
}

function replaceTokenChairUrl(tokenAddress: Address) {
  if (typeof window === "undefined") return;
  window.history.replaceState(
    null,
    "",
    buildTokenChairSnifferUrl(tokenAddress),
  );
}

function FeatureRail() {
  return (
    <aside className="sticky top-4 hidden h-[calc(100dvh-2rem)] w-44 shrink-0 flex-col rounded-lg border border-pulse-border/80 bg-[#070b10] p-3 lg:flex">
      <Link
        href="/app"
        className="flex items-center gap-2 px-2 py-3 text-sm font-semibold text-pulse-text"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-pulse-green/45 bg-pulse-green/10 text-pulse-green">
          R
        </span>
        <span>Revoke.PLS</span>
      </Link>
      <div className="my-4 h-px bg-pulse-border/80" />
      <nav className="grid gap-2 text-sm">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg border px-3 py-3 transition ${
              item.active
                ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green shadow-[0_0_28px_rgb(var(--pulse-green)/0.12)]"
                : "border-transparent text-pulse-muted hover:border-pulse-border hover:bg-pulse-panel/35 hover:text-pulse-text"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[10px]">
              {item.label.charAt(0)}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="mt-auto grid gap-3">
        <RailInfoCard label="Network" value={TOKEN_CHAIR_CHAIN_LABEL} tone="purple" />
        <RailInfoCard label="Mode" value="Read-only" tone="green" />
      </div>
    </aside>
  );
}

function MobileRail() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-pulse-border/80 bg-[#070b10] p-3 lg:hidden">
      <Link href="/app" className="flex min-w-0 items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-pulse-green/45 bg-pulse-green/10 text-sm font-semibold text-pulse-green">
          R
        </span>
        <span className="truncate text-sm font-semibold">Revoke.PLS</span>
      </Link>
      <Link
        href="/app#scanner"
        className="shrink-0 rounded-lg border border-pulse-border bg-pulse-panel/55 px-3 py-2 text-xs font-semibold text-pulse-muted"
      >
        Approval scanner
      </Link>
    </div>
  );
}

function RailInfoCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "purple";
}) {
  const toneClass =
    tone === "green"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : "border-pulse-purple/40 bg-pulse-purple/15 text-violet-300";

  return (
    <div className="rounded-lg border border-pulse-border bg-pulse-panel/30 p-3">
      <p className="text-[11px] text-pulse-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-pulse-text">{value}</p>
      <span className={`mt-2 block h-1.5 w-1.5 rounded-full ${toneClass}`} />
    </div>
  );
}

function ChairHeroArt() {
  return (
    <div className="relative hidden min-h-[260px] overflow-hidden rounded-lg border border-pulse-border/80 bg-[#05090d] sm:block">
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,229,160,0.12),transparent_46%),linear-gradient(40deg,rgba(255,150,18,0.18),transparent_52%)]" />
      <div className="absolute left-8 top-8 h-52 w-36 rounded-t-[48px] border border-amber-500/65 bg-[linear-gradient(150deg,rgba(255,165,18,0.2),rgba(8,13,18,0.92))] shadow-[0_0_40px_rgba(255,150,18,0.22)]" />
      <div className="absolute left-12 top-12 h-40 w-28 rounded-t-[34px] border border-pulse-green/40 bg-[linear-gradient(150deg,rgba(0,229,160,0.18),rgba(8,13,18,0.96))]" />
      <div className="absolute left-5 top-36 h-14 w-16 rounded-full border border-amber-500/50 bg-[#0b0f13]" />
      <div className="absolute left-[8.5rem] top-36 h-14 w-16 rounded-full border border-amber-500/50 bg-[#0b0f13]" />
      <div className="absolute left-11 top-[12.75rem] h-16 w-3 rounded-full bg-amber-500/45" />
      <div className="absolute left-36 top-[12.75rem] h-16 w-3 rounded-full bg-amber-500/45" />
      <ScentTrail className="left-36 top-8 rotate-[-12deg]" />
      <ScentTrail className="left-[10.5rem] top-16 rotate-[8deg] opacity-75" />
      <ScentTrail className="left-32 top-24 rotate-[-4deg] opacity-60" />
      <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-pulse-border/70 bg-[#070b10]/80 px-3 py-2 text-xs text-pulse-muted">
        Chair-forward, wallet-free token sniffing.
      </div>
    </div>
  );
}

function ScentTrail({ className }: { className: string }) {
  return (
    <div
      className={`absolute h-12 w-28 rounded-full border-t border-pulse-green/55 ${className}`}
      aria-hidden
    >
      <span className="absolute left-4 top-2 h-1.5 w-1.5 rounded-full bg-pulse-green shadow-[0_0_18px_rgb(var(--pulse-green))]" />
      <span className="absolute left-[3.75rem] top-0 h-1 w-1 rounded-full bg-pulse-green/80" />
      <span className="absolute left-24 top-4 h-1.5 w-1.5 rounded-full bg-pulse-green/70" />
    </div>
  );
}

function HeroSearch({
  input,
  hasInput,
  inlineError,
  state,
  onSubmit,
  onInputChange,
  onInputBlur,
  onPresetSelect,
}: {
  input: string;
  hasInput: boolean;
  inlineError: string | null;
  state: SnifferUiState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInputChange: (value: string) => void;
  onInputBlur: () => void;
  onPresetSelect: (tokenAddress: Address) => void;
}) {
  const loading = state === "loading";

  return (
    <div className="flex min-w-0 flex-col justify-center">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full border border-pulse-green/35 bg-pulse-green/10 px-3 py-1 text-pulse-green">
          {TOKEN_CHAIR_CHAIN_LABEL} only
        </span>
        <span className="rounded-full border border-pulse-border bg-pulse-panel/50 px-3 py-1 text-pulse-muted">
          No wallet connection
        </span>
        <span className="rounded-full border border-pulse-border bg-pulse-panel/50 px-3 py-1 text-pulse-muted">
          Read-only
        </span>
      </div>
      <h1 className="mt-5 text-4xl font-semibold text-pulse-text sm:text-5xl">
        Token Chair <span className="text-lime-300">Sniffer</span>
      </h1>
      <p className="mt-3 text-2xl font-semibold text-amber-400">
        Sniff before you ape.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-pulse-muted sm:text-base">
        Paste a PulseChain token address and check visible market, liquidity,
        ownership, and contract-risk signals before buying, approving, or
        interacting.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-7 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px]"
      >
        <div className="min-w-0">
          <label htmlFor="token-chair-address" className="sr-only">
            PulseChain token address
          </label>
          <div className="flex min-h-14 items-center gap-3 rounded-lg border border-pulse-border bg-[#0b1118] px-4 transition-colors focus-within:border-amber-400/70">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-pulse-border bg-pulse-panel/65 text-xs font-semibold text-pulse-muted">
              0x
            </span>
            <input
              id="token-chair-address"
              value={input}
              onBlur={onInputBlur}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Paste token address here..."
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm text-pulse-text outline-none placeholder:text-pulse-muted/60"
              aria-invalid={Boolean(inlineError)}
              aria-describedby={inlineError ? "token-chair-error" : undefined}
            />
          </div>
          {inlineError ? (
            <p id="token-chair-error" className="mt-2 text-xs font-semibold text-pulse-red">
              {inlineError}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading || !hasInput}
          className="inline-flex min-h-14 items-center justify-center rounded-lg border border-amber-300/70 bg-[linear-gradient(135deg,#ffcf4a,#ff9b1a)] px-5 py-3 text-sm font-bold text-[#170d02] shadow-[0_0_30px_rgba(255,157,18,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {loading ? "Sniffing..." : "Sniff Token"}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {TOKEN_CHAIR_SAMPLE_TOKENS.map((token) => (
          <button
            key={token.address}
            type="button"
            disabled={loading}
            onClick={() => onPresetSelect(token.address)}
            className="rounded-lg border border-pulse-border bg-pulse-panel/50 px-3 py-2 text-left text-xs transition hover:border-pulse-green/35 hover:bg-pulse-green/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="block font-semibold text-pulse-text">
              {token.label}
            </span>
            <span className="mt-0.5 block text-pulse-muted">
              {token.detail}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function VerdictPanel({
  verdict,
  state,
  response,
  requestError,
}: {
  verdict: TokenChairVerdict;
  state: SnifferUiState;
  response: TokenChairApiResponse | null;
  requestError: string | null;
}) {
  const headline = verdict.displayLabel.replace("Chair Verdict: ", "");
  const statusCopy = getVerdictStatusCopy(state, response, requestError);

  return (
    <aside className="relative overflow-hidden rounded-lg border border-amber-500/45 bg-[linear-gradient(135deg,rgba(255,157,18,0.12),rgba(8,8,10,0.96)_48%,rgba(255,157,18,0.08))] p-5 shadow-[0_0_42px_rgba(255,157,18,0.14)]">
      <div className="absolute right-5 top-5 h-40 w-40 rounded-full border border-amber-500/20" />
      <div className="absolute right-10 top-10 h-28 w-28 rounded-full border border-amber-500/25" />
      <div className="absolute right-[3.75rem] top-[3.75rem] h-16 w-16 rounded-full border border-amber-500/35" />
      <MiniChairIcon />
      <div className="relative">
        <p className="text-sm text-pulse-muted">Chair verdict</p>
        <h2 className="mt-3 max-w-72 text-3xl font-bold leading-tight text-amber-400">
          {headline}
        </h2>
        <p className="mt-5 max-w-72 text-sm leading-6 text-pulse-muted">
          {statusCopy}
        </p>
        <RiskMeter verdict={verdict} />
        <div className="mt-6 flex items-center justify-between gap-3 text-sm">
          <span className="text-pulse-muted">Visible risk</span>
          <span className={verdictToneText(verdict)}>
            {verdict.label}
          </span>
        </div>
      </div>
    </aside>
  );
}

function MiniChairIcon() {
  return (
    <div className="absolute right-10 top-[4.5rem] hidden h-20 w-20 sm:block" aria-hidden>
      <div className="absolute left-5 top-2 h-12 w-10 rounded-t-lg border border-amber-400 bg-amber-400/10 shadow-[0_0_24px_rgba(255,188,44,0.35)]" />
      <div className="absolute left-3 top-10 h-8 w-14 rounded-lg border border-amber-400 bg-amber-400/10" />
      <div className="absolute left-1 top-8 h-8 w-4 rounded-lg border border-amber-400/80" />
      <div className="absolute right-1 top-8 h-8 w-4 rounded-lg border border-amber-400/80" />
    </div>
  );
}

function RiskMeter({ verdict }: { verdict: TokenChairVerdict }) {
  const markerClass = {
    success: "left-[18%]",
    warning: "left-[54%]",
    danger: "left-[84%]",
    neutral: "left-[6%]",
  }[verdict.tone];

  return (
    <div className="relative mt-8 h-3 rounded-full bg-pulse-border">
      <div className="absolute inset-y-0 left-0 w-1/3 rounded-l-full bg-pulse-green" />
      <div className="absolute inset-y-0 left-1/3 w-1/3 bg-amber-400" />
      <div className="absolute inset-y-0 right-0 w-1/3 rounded-r-full bg-pulse-red" />
      <span
        className={`absolute -top-1 h-5 w-1 rounded-full bg-pulse-text shadow-[0_0_10px_rgba(255,255,255,0.45)] ${markerClass}`}
      />
    </div>
  );
}

function StatusStrip({
  response,
  state,
  contract,
}: {
  response: TokenChairApiResponse | null;
  state: SnifferUiState;
  contract: TokenChairContractData | null;
}) {
  const address = response?.tokenAddress ?? response?.market?.tokenAddress;
  const items = [
    ["Chain", TOKEN_CHAIR_CHAIN_LABEL],
    ["Route", TOKEN_CHAIR_API_ROUTE],
    ["Status", formatStatus(state, response)],
    ["Contract", formatContractStatus(state, contract)],
    ["Token", address ? shortenAddress(address) : "Waiting"],
  ] as const;

  return (
    <section className="grid gap-2 rounded-lg border border-pulse-border/75 bg-[#070b10] p-3 text-xs text-pulse-muted sm:grid-cols-5">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2">
          <p className="uppercase tracking-[0.14em] text-pulse-muted/80">{label}</p>
          <p className="mt-1 truncate font-semibold text-pulse-text">{value}</p>
        </div>
      ))}
    </section>
  );
}

function ScanReport({
  response,
  state,
  requestError,
  market,
  contract,
  verdict,
  quickRows,
  sourceSignalRows,
  concentrationRows,
  eventHistoryRows,
  lpControlSummary,
}: {
  response: TokenChairApiResponse | null;
  state: SnifferUiState;
  requestError: string | null;
  market: TokenChairMarketData | null;
  contract: TokenChairContractData | null;
  verdict: TokenChairVerdict;
  quickRows: readonly SniffSignalRow[];
  sourceSignalRows: readonly TokenChairSourceSignalDetailRow[];
  concentrationRows: readonly TokenChairConcentrationDetailRow[];
  eventHistoryRows: readonly TokenChairEventHistoryDetailRow[];
  lpControlSummary: TokenChairLpControlSummary | null;
}) {
  const [copied, setCopied] = useState(false);
  const tokenAddress =
    response?.tokenAddress ?? market?.tokenAddress ?? contract?.tokenAddress ?? null;
  const tokenLabel =
    market?.tokenSymbol ?? contract?.tokenSymbol ?? (state === "loading" ? "Loading" : "Waiting");
  const reportRisks = buildReportRiskRows({
    response,
    quickRows,
    sourceSignalRows,
    concentrationRows,
    eventHistoryRows,
    lpControlSummary,
    state,
    requestError,
  });
  const evidenceRows = buildEvidenceRows({
    response,
    state,
    contract,
    market,
    lpControlSummary,
  });
  const reviewRows = buildReviewRows({
    evidenceRows,
    reportRisks,
    tokenAddress,
    state,
  });
  const sharePath = tokenAddress ? buildTokenChairSnifferUrl(tokenAddress) : null;

  async function copyReportLink() {
    if (!sharePath || typeof window === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(new URL(sharePath, window.location.origin).toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
        <div className="min-w-0 rounded-lg border border-pulse-border/70 bg-[#070b10] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
                Scan Report
              </p>
              <h2 className="mt-2 break-words text-2xl font-semibold text-pulse-text">
                {tokenLabel} review summary
              </h2>
            </div>
            <span className={`rounded-full border px-3 py-1 text-sm ${verdictToneText(verdict)}`}>
              {verdict.label}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <ReportMetric
              label="Token"
              value={tokenAddress ? shortenAddress(tokenAddress, 6) : "Waiting"}
              detail={market?.tokenName ?? contract?.tokenName ?? "Paste a PulseChain token to start."}
            />
            <ReportMetric
              label="Market"
              value={market ? `${market.dexName}${market.quoteTokenSymbol ? ` / ${market.quoteTokenSymbol}` : ""}` : formatStatus(state, response)}
              detail={market ? `${formatUsd(market.liquidityUsd)} liquidity, ${formatTxns24h(market.txns24h)} in 24h` : requestError ?? "Market data has not returned yet."}
            />
            <ReportMetric
              label="LP control"
              value={lpControlSummary?.value ?? "Not checked yet"}
              detail={lpControlSummary?.detail ?? "LP holder and locker evidence appears here after a scan."}
            />
            <ReportMetric
              label="Source"
              value={formatSourceStatus(contract, state === "loading" ? "Loading..." : "Not checked yet")}
              detail={sourceSignalRows.length > 0
                ? `${sourceSignalRows.filter((row) => row.status === "danger" || row.status === "warning").length.toLocaleString("en-US")} source signal rows need review.`
                : "PulseScan source/ABI rows appear here when available."}
            />
          </div>

          <div className="mt-4 rounded-lg border border-pulse-border/60 bg-[#0a1016] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-pulse-text">
                Shareable report
              </p>
              <button
                type="button"
                disabled={!sharePath}
                onClick={() => void copyReportLink()}
                className="rounded-lg border border-pulse-border bg-pulse-panel/55 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:border-pulse-green/35 hover:text-pulse-green disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? "Copied" : "Copy report link"}
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-pulse-muted">
              {sharePath ?? "A scanned token creates a canonical report URL."}
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <ReportRiskList rows={reportRisks} />
          <EvidenceChecklist rows={evidenceRows} />
        </div>
      </div>

      <ReviewBeforeBuying rows={reviewRows} />
    </section>
  );
}

function ReportMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-pulse-text">
        {value}
      </p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-pulse-muted">
        {detail}
      </p>
    </div>
  );
}

function ReportRiskList({ rows }: { rows: readonly SniffSignalRow[] }) {
  return (
    <div className="rounded-lg border border-pulse-border/70 bg-[#070b10] p-4">
      <PanelHeader icon="R" title="Top Review Items" meta={`${rows.length} shown`} />
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <article
            key={`${row.label}-${row.value}`}
            className="rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-pulse-text">
                {row.label}
              </p>
              <SniffValueBadge row={row} />
            </div>
            <p className="mt-2 text-xs leading-5 text-pulse-muted">{row.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function EvidenceChecklist({ rows }: { rows: readonly SniffSignalRow[] }) {
  return (
    <div className="rounded-lg border border-pulse-border/70 bg-[#070b10] p-4">
      <PanelHeader icon="E" title="Evidence Checklist" meta="Checked vs pending" />
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <article
            key={row.label}
            className="rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-pulse-text">
                {row.label}
              </p>
              <SniffValueBadge row={row} />
            </div>
            <p className="mt-2 text-xs leading-5 text-pulse-muted">{row.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReviewBeforeBuying({ rows }: { rows: readonly SniffSignalRow[] }) {
  return (
    <div className="mt-4 rounded-lg border border-pulse-border/70 bg-[#070b10] p-4">
      <PanelHeader icon="B" title="Review Before Buying" meta="Manual checklist" />
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm font-semibold text-pulse-text">
                {row.label}
              </p>
              <SniffValueBadge row={row} />
            </div>
            <p className="mt-2 text-xs leading-5 text-pulse-muted">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildReportRiskRows({
  response,
  quickRows,
  sourceSignalRows,
  concentrationRows,
  eventHistoryRows,
  lpControlSummary,
  state,
  requestError,
}: {
  response: TokenChairApiResponse | null;
  quickRows: readonly SniffSignalRow[];
  sourceSignalRows: readonly TokenChairSourceSignalDetailRow[];
  concentrationRows: readonly TokenChairConcentrationDetailRow[];
  eventHistoryRows: readonly TokenChairEventHistoryDetailRow[];
  lpControlSummary: TokenChairLpControlSummary | null;
  state: SnifferUiState;
  requestError: string | null;
}): SniffSignalRow[] {
  if (state === "loading") {
    return [
      {
        label: "Scan running",
        value: "Loading",
        status: "not-checked",
        detail:
          "Token Chair is reading market, contract, explorer, holder, and pair context.",
      },
    ];
  }

  if (state === "error") {
    return [
      {
        label: "Request failed",
        value: "Unable to verify",
        status: "unable-to-verify",
        detail: requestError ?? "The scan request did not complete.",
      },
    ];
  }

  if (!response) {
    return [
      {
        label: "Waiting for token",
        value: "Not checked yet",
        status: "not-checked",
        detail:
          "Paste a PulseChain token address to build a read-only review report.",
      },
    ];
  }

  const verdictRows = response.verdict.reasons.map((reason) => ({
    label: reason.label,
    value:
      reason.severity === "high"
        ? "High"
        : reason.severity === "warning"
          ? "Warning"
          : "Info",
    status:
      reason.severity === "high"
        ? "danger"
        : reason.severity === "warning"
          ? "warning"
          : "not-checked",
    detail: reason.detail,
  })) satisfies SniffSignalRow[];
  const supportingRows = [
    ...quickRows,
    ...sourceSignalRows,
    ...concentrationRows,
    ...eventHistoryRows,
    ...(lpControlSummary ? [lpControlSummary] : []),
  ].filter((row) => row.status === "danger" || row.status === "warning");
  const rows = dedupeReportRows([...verdictRows, ...supportingRows]);

  if (rows.length > 0) return rows.slice(0, 5);

  return [
    {
      label: "Read-only limits",
      value: "Review manually",
      status: "not-checked",
      detail:
        "No major visible warnings were returned, but this is still not a simulation, audit, or guarantee.",
    },
  ];
}

function buildEvidenceRows({
  response,
  state,
  contract,
  market,
  lpControlSummary,
}: {
  response: TokenChairApiResponse | null;
  state: SnifferUiState;
  contract: TokenChairContractData | null;
  market: TokenChairMarketData | null;
  lpControlSummary: TokenChairLpControlSummary | null;
}): SniffSignalRow[] {
  const loading = state === "loading";
  const marketStatus = response?.status ?? null;
  const explorer = contract?.explorer ?? null;
  const holders = contract?.holders ?? null;
  const pairContract = response?.pairContract ?? null;
  const pulsexPairs = response?.pulsexPairs ?? [];
  const dextools = response?.dextools ?? null;

  return [
    {
      label: "DEX Screener market",
      value: loading ? "Loading" : market ? "Returned" : marketStatus === "no-pair-found" ? "No pair" : "Not checked yet",
      status: loading ? "not-checked" : market ? "checked" : marketStatus ? "unable-to-verify" : "not-checked",
      detail: market
        ? `Selected ${market.dexName} pair by visible liquidity from ${market.pairCount.toLocaleString("en-US")} returned pair${market.pairCount === 1 ? "" : "s"}.`
        : "Primary market context comes from the read-only DEX Screener token-pairs endpoint.",
    },
    {
      label: "Selected pair contract",
      value: contractReadValue(pairContract?.status ?? null, loading),
      status: contractReadStatus(pairContract?.status ?? null, loading),
      detail:
        "Reads token0, token1, reserves, and LP supply from the selected pair contract when a pair is available.",
    },
    {
      label: "PulseX pair discovery",
      value: loading
        ? "Loading"
        : pulsexPairs.length > 0
          ? `${pulsexPairs.length.toLocaleString("en-US")} found`
          : response
            ? "No native pair found"
            : "Not checked yet",
      status: loading ? "not-checked" : response ? "checked" : "not-checked",
      detail:
        "Calls native PulseX V1/V2 factories for common quote-token pair existence and raw reserves.",
    },
    {
      label: "Contract reads",
      value: contractReadValue(contract?.status ?? null, loading),
      status: contractReadStatus(contract?.status ?? null, loading),
      detail:
        "Reads bytecode, token metadata, owner, proxy slots, public admin getters, tax getters, mechanics, and recent events.",
    },
    {
      label: "PulseScan source/ABI",
      value: loading
        ? "Loading"
        : explorer?.sourceVerified === true
          ? "Verified source"
          : explorer?.sourceVerified === false
            ? "Not verified"
            : explorer
              ? "Unable to verify"
              : "Not checked yet",
      status: loading
        ? "not-checked"
        : explorer?.sourceVerified === true
          ? "checked"
          : explorer
            ? "unable-to-verify"
            : "not-checked",
      detail:
        "Feeds the source-signal rows from returned ABI and source metadata. Missing source limits this part of the report.",
    },
    {
      label: "Holder distribution",
      value: contractReadValue(holders?.status ?? null, loading),
      status: contractReadStatus(holders?.status ?? null, loading),
      detail:
        "Uses sampled PulseScan holder pages for top-holder and LP-holder concentration buckets.",
    },
    {
      label: "LP lock/control evidence",
      value: lpControlSummary?.value ?? (loading ? "Loading" : "Not checked yet"),
      status: lpControlSummary?.status ?? (loading ? "not-checked" : "not-checked"),
      detail:
        lpControlSummary?.detail ??
        "Combines LP-holder classification, burn/dead sample context, and known locker reads when visible.",
    },
    {
      label: "DEXTools enrichment",
      value: loading
        ? "Loading"
        : dextools?.status === "not-configured"
          ? "Not configured"
          : dextools
            ? formatDextoolsStatus(dextools, "settled")
            : "Not checked yet",
      status: loading
        ? "not-checked"
        : dextools?.status === "success"
          ? "checked"
          : dextools?.status === "partial" || dextools?.status === "rate-limited"
            ? "warning"
            : "not-checked",
      detail:
        "Optional external market/score context. It is hidden when not configured and does not drive a safety claim.",
    },
    {
      label: "Honeypot simulation",
      value: "Not live",
      status: "not-checked",
      detail:
        "No buy/sell execution or simulation is run in this phase.",
    },
    {
      label: "Wallet actions",
      value: "Not used",
      status: "checked",
      detail:
        "Token Chair does not connect a wallet, request signatures, or send transactions.",
    },
  ];
}

function buildReviewRows({
  evidenceRows,
  reportRisks,
  tokenAddress,
  state,
}: {
  evidenceRows: readonly SniffSignalRow[];
  reportRisks: readonly SniffSignalRow[];
  tokenAddress: Address | null;
  state: SnifferUiState;
}): SniffSignalRow[] {
  const unavailableEvidence = evidenceRows.filter(
    (row) => row.status === "unable-to-verify" || row.status === "not-checked",
  ).length;
  const warningCount = reportRisks.filter(
    (row) => row.status === "warning" || row.status === "danger",
  ).length;

  return [
    {
      label: "Address",
      value: tokenAddress ? "Captured" : "Needed",
      status: tokenAddress ? "checked" : "not-checked",
      detail: tokenAddress
        ? "The report URL can be shared for this token address."
        : "Paste a token address before reviewing risk signals.",
    },
    {
      label: "Warnings",
      value: warningCount > 0 ? `${warningCount.toLocaleString("en-US")} visible` : state === "settled" ? "None surfaced" : "Pending",
      status: warningCount > 0 ? "warning" : state === "settled" ? "checked" : "not-checked",
      detail:
        "Visible warnings should be reviewed in context before buying or approving.",
    },
    {
      label: "Gaps",
      value: unavailableEvidence > 0 ? `${unavailableEvidence.toLocaleString("en-US")} pending` : "Reviewed",
      status: unavailableEvidence > 0 ? "not-checked" : "checked",
      detail:
        "Unavailable, not-configured, or not-live checks should be treated as open review gaps.",
    },
    {
      label: "Decision",
      value: "Manual",
      status: "not-checked",
      detail:
        "Use this report as visible evidence only. It is not a safety verdict, audit, or trading recommendation.",
    },
  ];
}

function contractReadValue(
  status: TokenChairContractData["status"] | null,
  loading: boolean,
): string {
  if (loading) return "Loading";
  if (status === "success") return "Returned";
  if (status === "partial") return "Partial";
  if (status === "unable-to-verify") return "Unable to verify";
  return "Not checked yet";
}

function contractReadStatus(
  status: TokenChairContractData["status"] | null,
  loading: boolean,
): SniffRowStatus {
  if (loading) return "not-checked";
  if (status === "success") return "checked";
  if (status === "partial") return "warning";
  if (status === "unable-to-verify") return "unable-to-verify";
  return "not-checked";
}

function dedupeReportRows(rows: readonly SniffSignalRow[]): SniffSignalRow[] {
  const seen = new Set<string>();
  const deduped: SniffSignalRow[] = [];

  for (const row of rows) {
    const key = `${row.label}:${row.value}:${row.detail}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped.sort((a, b) => riskRank(a.status) - riskRank(b.status));
}

function riskRank(status: SniffRowStatus): number {
  if (status === "danger") return 0;
  if (status === "warning") return 1;
  if (status === "unable-to-verify") return 2;
  if (status === "not-checked") return 3;
  return 4;
}

function TokenInformationSummary({
  response,
  state,
  market,
  contract,
  verdict,
}: {
  response: TokenChairApiResponse | null;
  state: SnifferUiState;
  market: TokenChairMarketData | null;
  contract: TokenChairContractData | null;
  verdict: TokenChairVerdict;
}) {
  const loading = state === "loading";
  const fallback = loading ? "Loading..." : "Not returned";
  const tokenAddress =
    response?.tokenAddress ?? market?.tokenAddress ?? contract?.tokenAddress ?? null;
  const tokenName = market?.tokenName ?? contract?.tokenName ?? fallback;
  const tokenSymbol = market?.tokenSymbol ?? contract?.tokenSymbol ?? fallback;
  const pairAddress = market?.pairAddress ?? null;
  const pairContract = response?.pairContract ?? null;
  const tokenHref = contract?.explorer?.explorerTokenUrl ?? null;
  const pairHref = pairAddress ? `https://scan.pulsechain.com/address/${pairAddress}` : null;
  const sourceStatus = formatSourceStatus(contract, fallback);
  const ownerStatus = formatOwnerSummary(contract, fallback);
  const proxyStatus = formatProxySignal(contract, fallback);
  const eventStatus = formatEventHistoryStatus(contract, state);
  const holderStatus = formatHolderSummary(contract, fallback);
  const marketStatus = market
    ? `${market.dexName}${market.quoteTokenSymbol ? ` / ${market.quoteTokenSymbol}` : ""}`
    : response?.status === "no-pair-found"
      ? "No DEX pair found"
      : fallback;

  const marketMetrics = [
    { label: "Price", value: formatPriceUsd(market?.priceUsd ?? null) },
    { label: "Liquidity", value: formatUsd(market?.liquidityUsd ?? null) },
    { label: "24h Volume", value: formatUsd(market?.volume24h ?? null) },
    { label: "24h Txns", value: formatTxns24h(market?.txns24h ?? null) },
    {
      label: "FDV / MCap",
      value: `${formatCompactNumber(market?.fdv ?? null)} / ${formatCompactNumber(
        market?.marketCap ?? null,
      )}`,
    },
    { label: "Pair Age", value: market?.pairAgeLabel ?? fallback },
  ];

  const contractMetrics = [
    { label: "Source", value: sourceStatus },
    { label: "Owner", value: ownerStatus },
    { label: "Admin", value: formatAdminGetterSummary(contract, fallback) },
    { label: "Proxy", value: proxyStatus },
    { label: "Holders", value: holderStatus },
    { label: "Events", value: eventStatus },
    { label: "Taxes", value: formatTaxGetterSignal(contract, fallback) },
  ];
  const pairContractMetrics = [
    { label: "Pair Check", value: formatPairContractStatus(pairContract, fallback) },
    { label: "Contains Token", value: formatPairContainsToken(pairContract, fallback) },
    {
      label: "Token0",
      value: formatPairTokenAddress(pairContract?.token0 ?? null, pairContract, fallback),
    },
    {
      label: "Token1",
      value: formatPairTokenAddress(pairContract?.token1 ?? null, pairContract, fallback),
    },
    {
      label: "Token Reserve",
      value: formatRawIntegerMagnitude(pairContract?.scannedTokenReserveRaw ?? null),
    },
    {
      label: "Quote Reserve",
      value: formatRawIntegerMagnitude(pairContract?.quoteTokenReserveRaw ?? null),
    },
    {
      label: "LP Supply",
      value: formatRawIntegerMagnitude(pairContract?.totalSupplyRaw ?? null),
    },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-pulse-border/80 bg-[#080d12]">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border-b border-pulse-border/70 bg-[#070b10] p-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse-cyan">
                Token Information
              </p>
              <h2 className="mt-2 break-words text-3xl font-semibold text-pulse-text">
                {tokenName}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-pulse-green/35 bg-pulse-green/10 px-3 py-1 text-sm font-semibold text-pulse-green">
                  {tokenSymbol}
                </span>
                <span className={`rounded-full border px-3 py-1 text-sm ${verdictToneText(verdict)}`}>
                  {verdict.label}
                </span>
              </div>
            </div>
            <span className="rounded-lg border border-pulse-border/70 bg-pulse-panel/45 px-3 py-2 text-xs font-semibold text-pulse-muted">
              {TOKEN_CHAIR_CHAIN_LABEL}
            </span>
          </div>

          <div className="mt-5 grid gap-2 text-sm">
            <TokenInfoAddressRow
              label="Token"
              address={tokenAddress}
              href={tokenHref}
              fallback={fallback}
            />
            <TokenInfoAddressRow
              label="Pair"
              address={pairAddress}
              href={pairHref}
              fallback={market ? "Pair returned" : fallback}
            />
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <TokenInfoMiniMetric label="Market" value={marketStatus} />
            <TokenInfoMiniMetric
              label="Pairs"
              value={market ? market.pairCount.toLocaleString("en-US") : fallback}
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-pulse-muted">
            This panel summarizes returned public data only. It is not a risk
            rating, simulation, or audit.
          </p>
        </div>

        <div className="grid gap-4 p-4">
          <TokenInfoMetricGroup title="Market Snapshot" metrics={marketMetrics} />
          <TokenInfoMetricGroup title="Pair Contract Snapshot" metrics={pairContractMetrics} />
          <TokenInfoMetricGroup title="Contract Snapshot" metrics={contractMetrics} />
        </div>
      </div>
    </section>
  );
}

function TokenInfoAddressRow({
  label,
  address,
  href,
  fallback,
}: {
  label: string;
  address: Address | string | null;
  href: string | null;
  fallback: string;
}) {
  const value = address ? shortenAddress(address, 6) : fallback;
  const className =
    "flex min-w-0 items-center justify-between gap-3 rounded-lg border border-pulse-border/65 bg-[#0a1016] px-3 py-2 transition";
  const content = (
    <>
      <span className="shrink-0 text-xs uppercase tracking-[0.14em] text-pulse-muted/75">
        {label}
      </span>
      <span className="truncate font-mono text-xs font-semibold text-pulse-text">
        {value}
      </span>
    </>
  );

  if (href && address) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} hover:border-pulse-green/35 hover:bg-pulse-green/5`}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

function TokenInfoMetricGroup({
  title,
  metrics,
}: {
  title: string;
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-pulse-text">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <TokenInfoMiniMetric
            key={`${title}-${metric.label}`}
            label={metric.label}
            value={metric.value}
          />
        ))}
      </div>
    </div>
  );
}

function TokenInfoMiniMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-pulse-border/65 bg-[#0a1016] px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-pulse-text">
        {value}
      </p>
    </div>
  );
}

function SignalDetailsPanel({
  response,
  state,
  requestError,
}: {
  response: TokenChairApiResponse | null;
  state: SnifferUiState;
  requestError: string | null;
}) {
  const details = buildSignalDetails(response, state, requestError);
  const visibleDextools =
    response?.dextools && response.dextools.status !== "not-configured"
      ? response.dextools
      : null;
  const dextoolsRows = buildDextoolsDetailRows({
    dextools: visibleDextools,
  });

  return (
    <section className="rounded-lg border border-pulse-border/75 bg-[#070b10] p-4">
      <PanelHeader
        icon="S"
        title="Signal Details"
        meta={response ? response.verdict.label : "Waiting"}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <ul className="grid gap-2">
          {details.map((detail) => (
            <li
              key={detail}
              className="rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2 text-sm leading-6 text-pulse-muted"
            >
              {detail}
            </li>
          ))}
        </ul>
        <div className="grid gap-2 rounded-lg border border-pulse-border/60 bg-[#0a1016] p-3 text-xs text-pulse-muted">
          <div>
            <p className="uppercase tracking-[0.14em] text-pulse-muted/75">
              Market
            </p>
            <p className="mt-1 font-semibold text-pulse-text">
              {response?.status ?? (state === "loading" ? "Loading" : "Not checked yet")}
            </p>
          </div>
          <div>
            <p className="uppercase tracking-[0.14em] text-pulse-muted/75">
              Explorer
            </p>
            <p className="mt-1 font-semibold text-pulse-text">
              {formatExplorerDataStatus(response, state)}
            </p>
          </div>
          <div>
            <p className="uppercase tracking-[0.14em] text-pulse-muted/75">
              Holders
            </p>
            <p className="mt-1 font-semibold text-pulse-text">
              {formatHolderDataStatus(response, state)}
            </p>
          </div>
          <div>
            <p className="uppercase tracking-[0.14em] text-pulse-muted/75">
              PulseX
            </p>
            <p className="mt-1 font-semibold text-pulse-text">
              {formatPulseXDiscoveryStatus(response, state)}
            </p>
          </div>
          {visibleDextools ? (
            <div>
              <p className="uppercase tracking-[0.14em] text-pulse-muted/75">
                DEXTools
              </p>
              <p className="mt-1 font-semibold text-pulse-text">
                {formatDextoolsStatus(visibleDextools, state)}
              </p>
            </div>
          ) : null}
          <div>
            <p className="uppercase tracking-[0.14em] text-pulse-muted/75">
              Mode
            </p>
            <p className="mt-1 font-semibold text-pulse-text">
              Read-only, no wallet
            </p>
          </div>
        </div>
      </div>
      {visibleDextools ? (
        <DextoolsSignalCard
          dextools={visibleDextools}
          rows={dextoolsRows}
        />
      ) : null}
      {response?.verdict.reasons.length ? (
        <div className="mt-3 rounded-lg border border-pulse-border/60 bg-[#0a1016] p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted/75">
            Why This Verdict
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {response.verdict.reasons.slice(0, 6).map((reason) => (
              <div
                key={`${reason.label}-${reason.detail}`}
                className="rounded-lg border border-pulse-border/60 bg-[#070b10] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-pulse-text">
                    {reason.label}
                  </p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${reasonToneClass(reason.severity)}`}>
                    {reason.severity === "high" ? "High" : reason.severity === "warning" ? "Warning" : "Info"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-pulse-muted">
                  {reason.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DextoolsSignalCard({
  dextools,
  rows,
}: {
  dextools: TokenChairDextoolsData;
  rows: readonly TokenChairDextoolsDetailRow[];
}) {
  const status = formatDextoolsStatus(dextools, "settled");
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pulse-text">
            DEXTools Context
          </p>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            External market and score context. DEXTScore is not a safety verdict,
            certification, or Token Chair audit result.
          </p>
        </div>
        <span className="rounded-full border border-pulse-border bg-pulse-panel/45 px-2.5 py-1 text-xs font-semibold text-pulse-muted">
          {status}
        </span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-3">
        {rows.map((row) => (
          <DextoolsSignalMetric key={row.label} row={row} />
        ))}
      </div>
      {dextools.pairUrl || dextools.tokenUrl || dextools.websiteUrl || dextools.socials.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {dextools.pairUrl ?? dextools.tokenUrl ? (
            <ExternalPill
              href={(dextools.pairUrl ?? dextools.tokenUrl)!}
              label="DEXTools"
            />
          ) : null}
          {dextools.websiteUrl ? (
            <ExternalPill href={dextools.websiteUrl} label="Website" />
          ) : null}
          {dextools.socials.map((social) => (
            <ExternalPill
              key={`${social.label}-${social.url}`}
              href={social.url}
              label={social.label}
            />
          ))}
        </div>
      ) : null}
    </>
  );

  return (
    <article className="mt-3 rounded-lg border border-pulse-border/60 bg-[#0a1016] p-3">
      {content}
    </article>
  );
}

function DextoolsSignalMetric({
  row,
}: {
  row: TokenChairDextoolsDetailRow;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#070b10] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold text-pulse-text">
          {row.label}
        </p>
        <SniffValueBadge row={row} />
      </div>
      <p className="mt-2 text-xs leading-5 text-pulse-muted">{row.detail}</p>
    </div>
  );
}

function ExternalPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-pulse-border/60 bg-[#070b10] px-2.5 py-1 text-xs font-semibold text-pulse-cyan transition hover:border-pulse-green/35 hover:text-pulse-green"
    >
      {label}
    </a>
  );
}

function MarketChairIntel({
  state,
  response,
  market,
}: {
  state: SnifferUiState;
  response: TokenChairApiResponse | null;
  market: TokenChairMarketData | null;
}) {
  const placeholder =
    state === "loading"
      ? "Loading..."
      : response?.status === "no-pair-found"
        ? "No pair found"
        : "Not returned";
  const cards = buildMarketCards(market, placeholder);
  const pairRows = buildPairCandidateRows(response?.pairs ?? []);
  const pulseXRows = response?.pulsexPairs ?? [];

  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <PanelHeader
        icon="M"
        title="Market Chair Intel"
        meta={market ? `${market.pairCount} pair${market.pairCount === 1 ? "" : "s"}` : "DEX Screener"}
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <IntelCard key={card.label} {...card} />
        ))}
      </div>
      <PairCandidateRows rows={pairRows} />
      <PulseXDiscoveryRows rows={pulseXRows} response={response} state={state} />
    </section>
  );
}

function buildMarketCards(
  market: TokenChairMarketData | null,
  placeholder: string,
): Array<{
  accent: "green" | "purple" | "cyan" | "pink" | "amber";
  icon: string;
  label: string;
  value: string;
  href?: string;
  detail?: string;
}> {
  if (!market) {
    return [
      { accent: "green", icon: "$", label: "Price", value: placeholder },
      { accent: "purple", icon: "L", label: "Liquidity", value: placeholder },
      { accent: "green", icon: "V", label: "24h Volume", value: placeholder },
      { accent: "cyan", icon: "T", label: "24h Txns", value: placeholder },
      { accent: "purple", icon: "F", label: "FDV / Market Cap", value: placeholder },
      { accent: "pink", icon: "D", label: "Main DEX", value: placeholder },
      { accent: "cyan", icon: "A", label: "Pair Age", value: placeholder },
      { accent: "amber", icon: "X", label: "DEX Screener", value: placeholder },
    ];
  }

  return [
    { accent: "green", icon: "$", label: "Price", value: formatPriceUsd(market.priceUsd) },
    { accent: "purple", icon: "L", label: "Liquidity", value: formatUsd(market.liquidityUsd) },
    { accent: "green", icon: "V", label: "24h Volume", value: formatUsd(market.volume24h) },
    {
      accent: "cyan",
      icon: "T",
      label: "24h Txns",
      value: formatTxns24h(market.txns24h),
      detail: market.txns24h
        ? `${market.txns24h.buys.toLocaleString("en-US")} buys / ${market.txns24h.sells.toLocaleString("en-US")} sells`
        : undefined,
    },
    {
      accent: "purple",
      icon: "F",
      label: "FDV / Market Cap",
      value: `${formatCompactNumber(market.fdv)} / ${formatCompactNumber(
        market.marketCap,
      )}`,
    },
    {
      accent: "pink",
      icon: "D",
      label: "Main DEX",
      value: market.dexName,
      detail: market.quoteTokenSymbol
        ? `Quoted against ${market.quoteTokenSymbol}${
            market.quoteTokenName ? ` (${market.quoteTokenName})` : ""
          }`
        : undefined,
    },
    { accent: "cyan", icon: "A", label: "Pair Age", value: market.pairAgeLabel },
    {
      accent: "amber",
      icon: "X",
      label: "DEX Screener",
      value: market.dexScreenerUrl ? "Open pair" : "Not returned",
      href: market.dexScreenerUrl ?? undefined,
    },
  ];
}

function IntelCard({
  accent,
  icon,
  label,
  value,
  detail,
  href,
}: {
  accent: "green" | "purple" | "cyan" | "pink" | "amber";
  icon: string;
  label: string;
  value: string;
  detail?: string;
  href?: string;
}) {
  const content = (
    <>
      <IconOrb accent={accent}>{icon}</IconOrb>
      <div className="min-w-0">
        <p className="text-sm text-pulse-muted">{label}</p>
        <p className="mt-1 break-words text-xl font-semibold text-pulse-text">
          {value}
        </p>
        {detail ? <p className="mt-1 text-xs text-pulse-green">{detail}</p> : null}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="grid min-h-28 grid-cols-[3rem_minmax(0,1fr)] items-center gap-4 rounded-lg border border-amber-400/35 bg-[#0a1016] p-4 transition hover:bg-amber-400/10"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="grid min-h-28 grid-cols-[3rem_minmax(0,1fr)] items-center gap-4 rounded-lg border border-pulse-border/80 bg-[#0a1016] p-4">
      {content}
    </div>
  );
}

function PairCandidateRows({
  rows,
}: {
  rows: readonly TokenChairPairCandidateRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-pulse-border/75 bg-[#070b10]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-pulse-border/70 px-3 py-2">
        <p className="text-sm font-semibold text-pulse-text">Pair Candidates</p>
        <p className="text-xs text-pulse-muted">
          Top {rows.length} by visible liquidity
        </p>
      </div>
      <ul className="divide-y divide-pulse-border/60">
        {rows.map((row) => (
          <li key={row.pairAddress}>
            <PairCandidateRow row={row} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PairCandidateRow({
  row,
}: {
  row: TokenChairPairCandidateRow;
}) {
  const badgeClass = {
    selected: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/45 bg-amber-400/10 text-amber-200",
    available: "border-pulse-border bg-pulse-panel/45 text-pulse-muted",
  }[row.status];
  const content = (
    <div className="grid gap-3 px-3 py-3 transition hover:bg-pulse-panel/25">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-pulse-border text-[11px] text-pulse-muted">
            {row.rank}
          </span>
          <p className="truncate text-sm font-semibold text-pulse-text">
            {row.dexName} {row.quoteLabel}
          </p>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
            {row.statusLabel}
          </span>
        </div>
        <p className="mt-2 truncate font-mono text-xs text-pulse-muted">
          {row.pairLabel}
        </p>
        <p className="mt-1 text-xs text-pulse-muted">{row.detail}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <PairMetric label="Liq" value={row.liquidityUsd} />
        <PairMetric label="Vol" value={row.volume24h} />
        <PairMetric label="Txns" value={row.txns24h} />
        <PairMetric label="Age" value={row.pairAgeLabel} />
      </div>
    </div>
  );

  if (!row.dexScreenerUrl) return content;

  return (
    <a href={row.dexScreenerUrl} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
}

function PairMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#0a1016] px-3 py-2">
      <p className="uppercase tracking-[0.12em] text-pulse-muted/70">{label}</p>
      <p
        className="mt-1 break-words text-[13px] font-semibold leading-5 text-pulse-text"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function PulseXDiscoveryRows({
  rows,
  response,
  state,
}: {
  rows: readonly TokenChairPulseXPairData[];
  response: TokenChairApiResponse | null;
  state: SnifferUiState;
}) {
  if (!response && state !== "loading") return null;
  const loading = state === "loading";

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-pulse-border/75 bg-[#070b10]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-pulse-border/70 px-3 py-2">
        <p className="text-sm font-semibold text-pulse-text">
          Native PulseX Pairs
        </p>
        <p className="text-xs text-pulse-muted">
          {loading
            ? "Checking factories"
            : rows.length
              ? `${rows.length} found`
              : "No matches"}
        </p>
      </div>
      {loading ? (
        <p className="px-3 py-3 text-xs leading-5 text-pulse-muted">
          Checking PulseX V1/V2 factories for pairs against WPLS, PLSX, INC,
          HEX, DAI, USDC, and USDT.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-3 py-3 text-xs leading-5 text-pulse-muted">
          No native PulseX V1/V2 pair was returned for the checked quote tokens.
          This does not rule out pairs on other DEXs or against unlisted quotes.
        </p>
      ) : (
        <ul className="divide-y divide-pulse-border/60">
          {rows.map((row) => (
            <li key={`${row.version}-${row.pairAddress}-${row.quoteTokenAddress}`}>
              <PulseXDiscoveryRow row={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PulseXDiscoveryRow({ row }: { row: TokenChairPulseXPairData }) {
  const pair = row.pairAddress;
  const status =
    row.status === "success"
      ? "Factory pair"
      : row.status === "partial"
        ? "Partial read"
        : "Unable";
  const badgeClass =
    row.status === "success"
      ? "border-pulse-green/40 bg-pulse-green/10 text-pulse-green"
      : "border-amber-400/45 bg-amber-400/10 text-amber-200";
  const content = (
    <div className="grid gap-3 px-3 py-3 transition hover:bg-pulse-panel/25">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-pulse-text">
            {row.label} / {row.quoteTokenSymbol}
          </p>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeClass}`}>
            {status}
          </span>
        </div>
        <p className="mt-2 truncate font-mono text-xs text-pulse-muted">
          {pair ? shortenAddress(pair, 6) : "Pair not returned"}
        </p>
        <p className="mt-1 text-xs text-pulse-muted">
          Found by PulseX factory getPair; raw reserves are read-only context,
          not USD liquidity or a swap simulation.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <PairMetric
          label="Token"
          value={formatRawIntegerMagnitude(row.scannedTokenReserveRaw)}
        />
        <PairMetric
          label={row.quoteTokenSymbol}
          value={formatRawIntegerMagnitude(row.quoteTokenReserveRaw)}
        />
        <PairMetric
          label="LP"
          value={formatRawIntegerMagnitude(row.totalSupplyRaw)}
        />
        <PairMetric
          label="Check"
          value={row.containsScannedToken === true ? "Matched" : "Partial"}
        />
      </div>
    </div>
  );

  if (!pair) return content;

  return (
    <a
      href={`https://scan.pulsechain.com/address/${pair}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  );
}

function QuickSniffRows({ rows }: { rows: readonly SniffSignalRow[] }) {
  const midpoint = Math.ceil(rows.length / 2);
  const columns = [rows.slice(0, midpoint), rows.slice(midpoint)];

  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <PanelHeader
        icon="Q"
        title="Quick Sniff"
        meta={`${rows.length} checks queued`}
      />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {columns.map((column, index) => (
          <ul
            key={index}
            className="overflow-hidden rounded-lg border border-pulse-border/75 bg-[#0a1016]"
          >
            {column.map((row) => (
              <li
                key={row.label}
                className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-pulse-border/60 px-3 py-2 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-pulse-muted/45 text-[11px] text-pulse-muted">
                    i
                  </span>
                  <span className="truncate text-sm text-pulse-text" title={row.detail}>
                    {row.label}
                  </span>
                </div>
                <SniffValueBadge row={row} />
              </li>
            ))}
          </ul>
        ))}
      </div>
      <p className="mt-4 text-xs text-pulse-muted">
        Honeypot simulation and full bytecode checks are not live yet. Source/ABI rows are lightweight signal checks.
        Source rows use lightweight PulseScan ABI/source keyword signals only.
      </p>
    </section>
  );
}

function SourceSignalDetails({
  rows,
  contract,
}: {
  rows: readonly TokenChairSourceSignalDetailRow[];
  contract: TokenChairContractData | null;
}) {
  if (!contract) return null;

  const sourceMeta = contract.explorer?.sourceVerified === true
    ? "PulseScan source/ABI"
    : contract.explorer?.sourceVerified === false
      ? "Source not verified"
      : "Source metadata";

  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <PanelHeader
        icon="D"
        title="Source Signal Details"
        meta={sourceMeta}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <SourceSignalDetailCard key={row.label} row={row} />
          ))
        ) : (
          <div className="rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4 text-sm leading-6 text-pulse-muted">
            PulseScan source details are not checked yet for this token.
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-pulse-muted">
        Source details are lightweight keyword and ABI-name signals from returned
        PulseScan data. They are not bytecode analysis, tax simulation, or a full
        audit.
      </p>
    </section>
  );
}

function SourceSignalDetailCard({
  row,
}: {
  row: TokenChairSourceSignalDetailRow;
}) {
  return (
    <article className="rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-pulse-text">
            {row.label}
          </p>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            {row.detail}
          </p>
        </div>
        <SniffValueBadge row={row} />
      </div>
      <MatchedTerms terms={row.matches} status={row.status} />
    </article>
  );
}

function MatchedTerms({
  terms,
  status,
}: {
  terms: readonly string[];
  status: SniffRowStatus;
}) {
  if (terms.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-pulse-border/60 bg-[#070b10] px-3 py-2 text-xs text-pulse-muted">
        {status === "checked"
          ? "No matching terms were flagged by this lightweight source scan."
          : "No terms available to display."}
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {terms.map((term) => (
        <span
          key={term}
          className={`rounded-full border px-2.5 py-1 font-mono text-xs font-semibold ${
            status === "danger"
              ? "border-pulse-red/35 bg-pulse-red/10 text-pulse-red"
              : "border-amber-400/35 bg-amber-400/10 text-amber-200"
          }`}
        >
          {term}
        </span>
      ))}
    </div>
  );
}

function ContractSniffCards({
  cards,
  contract,
  state,
}: {
  cards: readonly ContractSniffCard[];
  contract: TokenChairContractData | null;
  state: SnifferUiState;
}) {
  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <PanelHeader
        icon="C"
        title="Contract Sniff"
        meta={formatContractStatus(state, contract)}
      />
      <ContractMetadataStrip contract={contract} state={state} />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, index) => (
          <ContractSniffCardTile
            key={card.label}
            card={card}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}

function ContractSniffCardTile({
  card,
  index,
}: {
  card: ContractSniffCard;
  index: number;
}) {
  const baseClassName =
    "min-h-32 rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4";
  const className = card.href
    ? `${baseClassName} transition hover:border-pulse-green/35 hover:bg-pulse-green/5`
    : baseClassName;
  const content = (
    <>
      <IconOrb accent={contractAccent(index)}>
        {card.label.charAt(0)}
      </IconOrb>
      <p className="mt-4 text-sm text-pulse-muted">{card.label}</p>
      <p className="mt-2 break-words font-semibold text-pulse-text">{card.value}</p>
      <p className="mt-2 text-xs leading-5 text-pulse-muted">{card.detail}</p>
    </>
  );

  if (card.href) {
    return (
      <a
        href={card.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return <div className={className}>{content}</div>;
}

function EventHistoryPanel({
  rows,
  contract,
  state,
}: {
  rows: readonly TokenChairEventHistoryDetailRow[];
  contract: TokenChairContractData | null;
  state: SnifferUiState;
}) {
  if (!contract) return null;

  const eventHistory = contract.eventHistory;
  const windowLabel = eventHistory
    ? `${Number(eventHistory.lookbackBlocks).toLocaleString("en-US")} blocks`
    : state === "loading"
      ? "Loading"
      : "Not checked yet";

  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <PanelHeader
        icon="E"
        title="Recent Events"
        meta={formatEventHistoryStatus(contract, state)}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="rounded-lg border border-pulse-border/70 bg-[#070b10] p-3 text-sm leading-6 text-pulse-muted">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
            Window
          </p>
          <p className="mt-1 font-semibold text-pulse-text">{windowLabel}</p>
          <p className="mt-2">
            Bounded recent-log reads only. No matching logs in this window does
            not rule out older ownership, role, pause, or unpause events.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {rows.map((row) => (
            <article
              key={row.eventName}
              className="min-h-32 rounded-lg border border-pulse-border/75 bg-[#0a1016] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-pulse-text">{row.label}</p>
                <SniffValueBadge row={row} />
              </div>
              <p className="mt-3 text-xs leading-5 text-pulse-muted">
                {row.detail}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function HolderChairIntel({
  rows,
  contract,
  lpControlSummary,
}: {
  rows: readonly TokenChairConcentrationDetailRow[];
  contract: TokenChairContractData | null;
  lpControlSummary: TokenChairLpControlSummary | null;
}) {
  if (!contract) return null;

  const distribution = contract.holders?.distribution ?? null;
  const holderStatus =
    contract.holders?.status === "success"
      ? "PulseScan holders"
      : contract.holders?.status === "partial"
        ? "Partial holder data"
        : contract.holders
          ? "Unable to verify"
          : "Not checked yet";

  return (
    <section className="rounded-lg border border-pulse-border/80 bg-[#080d12] p-4">
      <PanelHeader icon="H" title="Holder Distribution" meta={holderStatus} />
      {distribution ? (
        <HolderDistributionSummary
          contract={contract}
          lpControlSummary={lpControlSummary}
        />
      ) : (
        <div className="mt-4 rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4 text-sm leading-6 text-pulse-muted">
          PulseScan holder distribution buckets have not been returned yet.
        </div>
      )}
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {rows.length > 0 ? (
          rows.map((row) => <HolderIntelCard key={row.kind} row={row} />)
        ) : (
          <div className="rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4 text-sm leading-6 text-pulse-muted">
            PulseScan holder concentration has not been checked yet.
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-pulse-muted">
        Holder distribution uses the visible PulseScan holder page returned during
        the read-only scan. Burn/dead labels are not proof of an LP lock, pair
        balances can move, and sampled top-holder data can change.
      </p>
    </section>
  );
}

function HolderDistributionSummary({
  contract,
  lpControlSummary,
}: {
  contract: TokenChairContractData;
  lpControlSummary: TokenChairLpControlSummary | null;
}) {
  const distribution = contract.holders?.distribution;
  if (!distribution) return null;
  const lpDistribution = contract.holders?.lpDistribution ?? null;

  const metrics = [
    {
      label: "Top 1",
      value: formatOptionalPercent(distribution.top1Percent),
      detail: "Largest visible token holder.",
    },
    {
      label: "Top 5",
      value: formatOptionalPercent(distribution.top5Percent),
      detail: "Combined first five sampled holders.",
    },
    {
      label: "Top 10",
      value: formatOptionalPercent(distribution.top10Percent),
      detail: "Combined first ten sampled holders.",
    },
    {
      label: "Pair balance",
      value: formatOptionalPercent(distribution.selectedPairPercent),
      detail: "Token supply held by the selected pair, if visible in the sample.",
    },
    {
      label: "Burn/dead",
      value: formatOptionalPercent(distribution.burnDeadPercent),
      detail: "Zero and common dead-address balances visible in the sample.",
    },
    {
      label: "Holders",
      value: distribution.holdersCount === null
        ? "Not returned"
        : distribution.holdersCount.toLocaleString("en-US"),
      detail: sampledRowsDetail(distribution),
    },
  ];

  return (
    <div className="mt-4 grid gap-3">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <HolderDistributionMetric key={metric.label} {...metric} />
          ))}
        </div>
        <TopHolderTable
          title="Token holders"
          rows={distribution.topHolders}
          contract={contract}
        />
      </div>
      {distribution.maxPagesReached ? (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
          Token-holder crawl was capped at {distribution.sampledHolderCount.toLocaleString("en-US")} rows for response time. Percent buckets are based on the sampled pages returned.
        </p>
      ) : null}
      {lpDistribution ? (
        <LpControlSummary
          distribution={lpDistribution}
          contract={contract}
          lpControlSummary={lpControlSummary}
        />
      ) : (
        <div className="rounded-lg border border-pulse-border/65 bg-[#0a1016] p-3 text-sm leading-6 text-pulse-muted">
          LP-token holder distribution was not returned for the selected pair.
        </div>
      )}
    </div>
  );
}

function LpControlSummary({
  distribution,
  contract,
  lpControlSummary,
}: {
  distribution: NonNullable<TokenChairContractData["holders"]>["lpDistribution"];
  contract: TokenChairContractData;
  lpControlSummary: TokenChairLpControlSummary | null;
}) {
  if (!distribution) return null;

  const metrics = [
    {
      label: "LP Top 1",
      value: formatOptionalPercent(distribution.top1Percent),
      detail: "Largest visible holder of the selected pair token.",
    },
    {
      label: "LP Top 5",
      value: formatOptionalPercent(distribution.top5Percent),
      detail: "Combined first five sampled LP-token holders.",
    },
    {
      label: "LP Top 10",
      value: formatOptionalPercent(distribution.top10Percent),
      detail: "Combined first ten sampled LP-token holders.",
    },
    {
      label: "LP Burn/dead",
      value: formatOptionalPercent(distribution.burnDeadPercent),
      detail: "Zero and common dead-address LP-token balances in the sample.",
    },
    {
      label: "LP holders",
      value: distribution.holdersCount === null
        ? "Not returned"
        : distribution.holdersCount.toLocaleString("en-US"),
      detail: sampledRowsDetail(distribution),
    },
  ];

  return (
    <div className="grid gap-3 rounded-lg border border-pulse-border/65 bg-[#070b10] p-3 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-pulse-text">
            LP Token Control
          </h3>
          <span className="text-xs text-pulse-muted">
            Selected pair token
          </span>
        </div>
        {lpControlSummary ? (
          <LpControlInterpretation summary={lpControlSummary} />
        ) : null}
        <LockerRecordsPanel contract={contract} />
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <HolderDistributionMetric key={metric.label} {...metric} />
          ))}
        </div>
        {distribution.maxPagesReached ? (
          <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
            LP-holder crawl was capped at {distribution.sampledHolderCount.toLocaleString("en-US")} rows for response time. Review the pair token on PulseScan for deeper liquidity-control context.
          </p>
        ) : null}
      </div>
      <TopHolderTable
        title="LP holders"
        rows={distribution.topHolders}
        contract={contract}
      />
    </div>
  );
}

function LpControlInterpretation({
  summary,
}: {
  summary: TokenChairLpControlSummary;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pulse-text">
            {summary.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            {summary.detail}
          </p>
        </div>
        <SniffValueBadge row={summary} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <HolderMetric label="Top LP holder" value={summary.holderPercentLabel} />
        <HolderMetric label="Holder address" value={summary.holderAddressLabel} />
        <HolderMetric label="Holder type" value={summary.holderLabel} />
        <HolderMetric label="Context source" value={summary.holderSourceLabel} />
        <HolderMetric label="Burn/dead LP" value={summary.burnDeadPercentLabel} />
        <HolderMetric label="Sample" value={summary.sampledRowsLabel} />
        <HolderMetric label="Locker status" value={summary.lockerStatusLabel} />
        <HolderMetric label="Next unlock" value={summary.lockerUnlockLabel} />
      </div>
      <LpEvidenceRows rows={summary.evidenceRows} />
    </>
  );

  if (summary.href) {
    return (
      <a
        href={summary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-3 block rounded-lg border border-pulse-border/65 bg-[#0a1016] p-3 transition hover:border-pulse-green/35 hover:bg-pulse-green/5"
      >
        {content}
      </a>
    );
  }

  return (
    <article className="mb-3 rounded-lg border border-pulse-border/65 bg-[#0a1016] p-3">
      {content}
    </article>
  );
}

function LpEvidenceRows({
  rows,
}: {
  rows: readonly TokenChairLpControlEvidenceRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#070b10] px-3 py-2"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pulse-muted/75">
              {row.label}
            </p>
            <SniffValueBadge row={row} />
          </div>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            {row.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

function LockerRecordsPanel({
  contract,
}: {
  contract: TokenChairContractData;
}) {
  const locker = contract.lpLocker;
  if (!locker || locker.status === "not-applicable") return null;

  const rows = [
    ...locker.activeLocks.map((record) => ({
      record,
      statusLabel: "Active",
      status: "checked" as SniffRowStatus,
    })),
    ...locker.withdrawableLocks.map((record) => ({
      record,
      statusLabel: "Unlockable",
      status: "warning" as SniffRowStatus,
    })),
    ...locker.matchedLocks
      .filter(
        (record) =>
          !locker.activeLocks.some((active) => active.lockId === record.lockId) &&
          !locker.withdrawableLocks.some((withdrawable) => withdrawable.lockId === record.lockId),
      )
      .map((record) => ({
        record,
        statusLabel: record.withdrawn ? "Withdrawn" : "Inactive",
        status: "unable-to-verify" as SniffRowStatus,
      })),
  ];
  const meta = [
    locker.totalLocks ? `${locker.totalLocks} total locks` : null,
    locker.checkedLockCount > 0
      ? `${locker.checkedLockCount.toLocaleString("en-US")} checked`
      : null,
  ].filter(Boolean).join(" / ");

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-pulse-border/65 bg-[#0a1016]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-pulse-border/65 px-3 py-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pulse-text">
            Locker Records
          </p>
          <p className="mt-1 truncate text-[11px] text-pulse-muted">
            {locker.lockerLabel ?? "Matched locker"}{meta ? ` / ${meta}` : ""}
          </p>
        </div>
        {locker.lockerAddress ? (
          <a
            href={`https://scan.pulsechain.com/address/${locker.lockerAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-pulse-border/70 px-2 py-1 text-[11px] font-semibold text-pulse-green transition hover:border-pulse-green/60 hover:bg-pulse-green/10"
          >
            PulseScan
          </a>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <div className="min-w-full overflow-x-auto">
          <div className="grid min-w-[760px] grid-cols-[70px_minmax(130px,1fr)_minmax(120px,0.8fr)_110px_130px_96px] gap-2 border-b border-pulse-border/65 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
            <span>ID</span>
            <span>Owner</span>
            <span>Raw amount</span>
            <span>LP supply</span>
            <span>Unlock</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-pulse-border/55">
            {rows.map((row) => (
              <LockerRecordRow
                key={row.record.lockId}
                record={row.record}
                statusLabel={row.statusLabel}
                status={row.status}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="px-3 py-3 text-xs leading-5 text-pulse-muted">
          No selected-pair locker records were returned in the bounded locker scan.
        </p>
      )}
      {locker.warnings.length > 0 ? (
        <div className="space-y-2 border-t border-pulse-border/65 px-3 py-3">
          {locker.warnings.slice(0, 2).map((warning) => (
            <p
              key={warning}
              className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100"
            >
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LockerRecordRow({
  record,
  statusLabel,
  status,
}: {
  record: TokenChairLpLockRecord;
  statusLabel: string;
  status: SniffRowStatus;
}) {
  const ownerLabel = shortenAddress(record.ownerAddress);
  const row = {
    label: "Locker record",
    value: statusLabel,
    status,
    detail: "",
  } satisfies SniffSignalRow;

  return (
    <div className="grid min-w-[760px] grid-cols-[70px_minmax(130px,1fr)_minmax(120px,0.8fr)_110px_130px_96px] items-center gap-2 px-3 py-2 text-xs">
      <span className="font-mono font-semibold text-pulse-text">
        #{record.lockId}
      </span>
      <a
        href={`https://scan.pulsechain.com/address/${record.ownerAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 truncate font-mono font-semibold text-pulse-green transition hover:text-pulse-green/80"
        title={record.ownerAddress}
      >
        {ownerLabel}
      </a>
      <span className="min-w-0 truncate font-mono text-pulse-text" title={record.amountRaw}>
        {record.amountRaw}
      </span>
      <span className="font-semibold text-pulse-text">
        {formatOptionalPercent(record.lpSupplyPercent)}
      </span>
      <span className="text-pulse-text">
        {formatLockerRecordDate(record.unlockDateIso)}
      </span>
      <span className="justify-self-start">
        <SniffValueBadge row={row} />
      </span>
    </div>
  );
}

function HolderDistributionMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-pulse-border/65 bg-[#0a1016] p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-pulse-text">{value}</p>
      <p className="mt-2 text-xs leading-5 text-pulse-muted">{detail}</p>
    </div>
  );
}

function TopHolderTable({
  title,
  rows,
  contract,
}: {
  title: string;
  rows: readonly TokenChairHolderDistributionRow[];
  contract: TokenChairContractData;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4 text-sm leading-6 text-pulse-muted">
        PulseScan did not return top-holder rows for this token.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-pulse-border/75 bg-[#0a1016]">
      <div className="border-b border-pulse-border/65 px-3 py-2 text-sm font-semibold text-pulse-text">
        {title}
      </div>
      <div className="grid grid-cols-[48px_minmax(0,1fr)_76px] gap-2 border-b border-pulse-border/65 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
        <span>Rank</span>
        <span>Holder</span>
        <span className="text-right">Supply</span>
      </div>
      <div className="divide-y divide-pulse-border/55">
        {rows.map((row) => (
          <TopHolderTableRow
            key={`${row.rank}-${row.address ?? "unknown"}`}
            row={row}
            contract={contract}
          />
        ))}
      </div>
    </div>
  );
}

function TopHolderTableRow({
  row,
  contract,
}: {
  row: TokenChairHolderDistributionRow;
  contract: TokenChairContractData;
}) {
  const classification = classifyHolderRow(row, contract);
  const addressLabel = row.address ? shortenAddress(row.address) : "Not returned";
  const content = (
    <>
      <span className="font-semibold text-pulse-text">#{row.rank}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-pulse-text">
          {addressLabel}
        </span>
        <span className="block truncate text-[11px] text-pulse-muted">
          {classification?.label ?? (row.isContract ? "Contract" : "Wallet or unknown")}
        </span>
      </span>
      <span className="text-right font-semibold text-pulse-text">
        {formatOptionalPercent(row.percent)}
      </span>
    </>
  );

  if (classification?.explorerUrl) {
    return (
      <a
        href={classification.explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={classification.detail}
        className="grid grid-cols-[48px_minmax(0,1fr)_76px] gap-2 px-3 py-2 text-xs transition hover:bg-pulse-green/5"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_76px] gap-2 px-3 py-2 text-xs">
      {content}
    </div>
  );
}

function HolderIntelCard({
  row,
}: {
  row: TokenChairConcentrationDetailRow;
}) {
  const content = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-pulse-text">{row.label}</p>
          <p className="mt-2 text-xs leading-5 text-pulse-muted">
            {row.detail}
          </p>
        </div>
        <SniffValueBadge row={row} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <HolderMetric label="Percent" value={row.percentLabel} />
        <HolderMetric label="Holders" value={row.holderCountLabel} />
        <HolderMetric label="Context source" value={row.classificationSourceLabel} />
        <HolderMetric
          label="Address"
          value={row.address ? shortenAddress(row.address) : "Not returned"}
        />
      </div>
      <div className="mt-3 rounded-lg border border-pulse-border/60 bg-[#070b10] px-3 py-2">
        <p className="text-xs font-semibold text-pulse-text">
          {row.classificationLabel}
        </p>
        <p className="mt-1 text-xs leading-5 text-pulse-muted">
          {row.classificationDetail}
        </p>
      </div>
    </>
  );

  if (row.href) {
    return (
      <a
        href={row.href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4 transition hover:border-pulse-green/35 hover:bg-pulse-green/5"
      >
        {content}
      </a>
    );
  }

  return (
    <article className="rounded-lg border border-pulse-border/75 bg-[#0a1016] p-4">
      {content}
    </article>
  );
}

function HolderMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#070b10] px-3 py-2">
      <p className="uppercase tracking-[0.12em] text-pulse-muted/70">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-pulse-text">
        {value}
      </p>
    </div>
  );
}

function classifyHolderRow(
  row: TokenChairHolderDistributionRow,
  contract: TokenChairContractData,
) {
  return classifyTokenChairAddress(row.address, {
    tokenAddress: contract.tokenAddress,
    pairAddress: contract.holders?.lp.pairAddress ?? null,
    ownerAddress: contract.ownerAddress,
    deployerAddress: contract.explorer?.deployerAddress ?? null,
    proxyAdminAddress:
      contract.proxy.adminAddress ?? contract.proxy.publicAdminAddress ?? null,
    proxyImplementationAddress:
      contract.proxy.implementationAddress ??
      contract.proxy.publicImplementationAddress ??
      contract.proxy.minimalProxyTarget ??
      null,
    adminGetterAddresses: contract.adminGetters?.map((getter) => getter.address) ?? [],
    isContract: row.isContract,
  });
}

function ContractMetadataStrip({
  contract,
  state,
}: {
  contract: TokenChairContractData | null;
  state: SnifferUiState;
}) {
  const loading = state === "loading";
  const fallback = loading ? "Loading..." : "Not checked yet";
  const items = [
    ["Name", contract?.tokenName ?? fallback],
    ["Symbol", contract?.tokenSymbol ?? fallback],
    ["Decimals", contract?.decimals !== null && contract?.decimals !== undefined
      ? contract.decimals.toString()
      : fallback],
    ["Source", formatSourceStatus(contract, fallback)],
    ["ABI", formatAbiStatus(contract, fallback)],
    ["Proxy", formatProxySignal(contract, fallback)],
    ["Pending", formatPendingOwnerSignal(contract, fallback)],
    ["Admin", formatAdminGetterSummary(contract, fallback)],
    ["Roles", formatAccessControlSignal(contract, fallback)],
    ["Tax getters", formatTaxGetterSignal(contract, fallback)],
    ["Events", formatEventHistoryStatus(contract, state)],
  ] as const;

  return (
    <div className="mt-4 grid gap-2 rounded-lg border border-pulse-border/70 bg-[#070b10] p-3 sm:grid-cols-3 xl:grid-cols-11">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-pulse-muted/75">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-pulse-text">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function PanelHeader({
  icon,
  title,
  meta,
}: {
  icon: string;
  title: string;
  meta: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-pulse-green/35 bg-pulse-green/10 text-sm font-semibold text-pulse-green">
          {icon}
        </span>
        <h2 className="truncate text-xl font-semibold text-pulse-text">{title}</h2>
      </div>
      <span className="shrink-0 text-sm text-pulse-muted">{meta}</span>
    </div>
  );
}

function IconOrb({
  accent,
  children,
}: {
  accent: "green" | "purple" | "cyan" | "pink" | "amber";
  children: ReactNode;
}) {
  const classes = {
    green: "border-pulse-green/45 bg-pulse-green/10 text-pulse-green",
    purple: "border-pulse-purple/55 bg-pulse-purple/15 text-violet-300",
    cyan: "border-sky-400/55 bg-sky-400/10 text-sky-300",
    pink: "border-pulse-pink/55 bg-pulse-pink/10 text-pulse-pink",
    amber: "border-amber-400/55 bg-amber-400/10 text-amber-300",
  }[accent];

  return (
    <span className={`grid h-12 w-12 place-items-center rounded-full border text-lg font-semibold ${classes}`}>
      {children}
    </span>
  );
}

function SniffValueBadge({
  row,
}: {
  row: Pick<SniffSignalRow, "status" | "value">;
}) {
  const toneClass = {
    checked: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/45 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/45 bg-pulse-red/10 text-pulse-red",
    "unable-to-verify": "border-amber-400/40 bg-amber-400/10 text-amber-200",
    "not-checked": "border-pulse-border bg-pulse-panel/45 text-pulse-muted",
  }[row.status];

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
    >
      {row.value}
    </span>
  );
}

function DisclaimerPanel() {
  return (
    <aside className="flex flex-col gap-2 rounded-lg border border-pulse-border/80 bg-[#070b10] p-4 text-center text-sm leading-6 text-pulse-muted sm:flex-row sm:items-center sm:justify-center">
      <span className="mx-auto grid h-7 w-7 shrink-0 place-items-center rounded-full border border-pulse-border text-xs sm:mx-0">
        R
      </span>
      <span>{TOKEN_CHAIR_DISCLAIMER}</span>
    </aside>
  );
}

function getVerdictStatusCopy(
  state: SnifferUiState,
  response: TokenChairApiResponse | null,
  requestError: string | null,
): string {
  if (state === "loading") {
    return "Reading visible market data through the local server route.";
  }
  if (state === "error") {
    return requestError ?? "The request could not be completed.";
  }
  if (!response) {
    return "No token has been sniffed yet. Contract checks remain pending.";
  }
  if (response.status === "no-pair-found") {
    return "No PulseChain DEX Screener pair was found for this token. This does not prove anything about contract risk. It means market data is currently unavailable from this source.";
  }
  if (response.status === "upstream-unavailable") {
    return "Market data could not be loaded right now. Token Chair Sniffer cannot fully verify this token.";
  }
  if (response.status === "malformed-response") {
    return firstMessage(response.errors) ?? "DEX Screener returned an unexpected response.";
  }

  return response.verdict.notes[0] ?? "Visible market data returned.";
}

function formatStatus(
  state: SnifferUiState,
  response: TokenChairApiResponse | null,
): string {
  if (state === "loading") return "Loading";
  if (state === "error") return "Request failed";
  return response?.status ?? "Idle";
}

function formatContractStatus(
  state: SnifferUiState,
  contract: TokenChairContractData | null,
): string {
  if (state === "loading") return "Loading";
  if (!contract) return "Not checked yet";
  if (contract.status === "success") return "Read-only checks returned";
  if (contract.status === "partial") return "Partially checked";
  return "Unable to verify";
}

function formatExplorerDataStatus(
  response: TokenChairApiResponse | null,
  state: SnifferUiState,
): string {
  if (state === "loading") return "Loading";
  const explorer = response?.contract?.explorer;
  if (!response || !explorer) return "Not checked yet";
  if (explorer.status === "success") return "Returned";
  if (explorer.status === "partial") return "Partial";
  if (hasRateLimitMessage([...explorer.warnings, ...explorer.errors])) {
    return "Rate-limited";
  }
  return "Unable to verify";
}

function formatHolderDataStatus(
  response: TokenChairApiResponse | null,
  state: SnifferUiState,
): string {
  if (state === "loading") return "Loading";
  const holders = response?.contract?.holders;
  if (!response || !holders) return "Not checked yet";
  if (holders.status === "success") return "Returned";
  if (hasRateLimitMessage([...holders.warnings, ...holders.errors])) {
    return "Rate-limited";
  }
  if (holders.status === "partial") return "Partial";
  return "Unable to verify";
}

function formatPulseXDiscoveryStatus(
  response: TokenChairApiResponse | null,
  state: SnifferUiState,
): string {
  if (state === "loading") return "Loading";
  if (!response) return "Not checked yet";
  if (response.pulsexPairs.length === 0) return "No native pair found";
  return `${response.pulsexPairs.length.toLocaleString("en-US")} found`;
}

function formatDextoolsStatus(
  dextools: TokenChairDextoolsData | null,
  state: SnifferUiState,
): string {
  if (state === "loading") return "Loading";
  if (!dextools) return "Not checked yet";
  if (dextools.status === "not-configured") return "Not configured";
  if (dextools.status === "success") return "Returned";
  if (dextools.status === "partial") return "Partial";
  if (dextools.status === "rate-limited") return "Rate-limited";
  return "Unable to verify";
}

function formatPairContractStatus(
  pairContract: TokenChairPairContractData | null,
  fallback: string,
): string {
  if (!pairContract) return fallback;
  if (pairContract.status === "success") return "Verified on-chain";
  if (pairContract.status === "partial") return "Partially checked";
  return "Unable to verify";
}

function formatPairContainsToken(
  pairContract: TokenChairPairContractData | null,
  fallback: string,
): string {
  if (!pairContract) return fallback;
  if (pairContract.containsScannedToken === true) return "Yes";
  if (pairContract.containsScannedToken === false) return "No";
  return "Unable to verify";
}

function formatPairTokenAddress(
  address: Address | null,
  pairContract: TokenChairPairContractData | null,
  fallback: string,
): string {
  if (!pairContract) return fallback;
  if (address) return shortenAddress(address, 4);
  return pairContract.status === "unable-to-verify" ? "Unable to verify" : "Not returned";
}

function formatRawIntegerMagnitude(value: string | null): string {
  if (!value) return "Not returned";
  if (!/^\d+$/.test(value)) return value;
  const normalized = value.replace(/^0+(?=\d)/, "");
  if (normalized.length <= 6) {
    return Number(normalized).toLocaleString("en-US");
  }

  const suffixes = [
    { suffix: "Q", digits: 15 },
    { suffix: "T", digits: 12 },
    { suffix: "B", digits: 9 },
    { suffix: "M", digits: 6 },
    { suffix: "K", digits: 3 },
  ];
  const unit = suffixes.find((item) => normalized.length > item.digits);
  if (!unit) return normalized;

  const wholeLength = normalized.length - unit.digits;
  const whole = normalized.slice(0, wholeLength);
  const fraction = normalized.slice(wholeLength, wholeLength + 2);
  const trimmedFraction = fraction.replace(/0+$/, "");
  return `${whole}${trimmedFraction ? `.${trimmedFraction}` : ""}${unit.suffix} raw`;
}

function formatOwnerSummary(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  if (!contract) return fallback;
  if (contract.ownershipRenounced === true) return "Appears renounced";
  if (contract.ownerAddress) return shortenAddress(contract.ownerAddress);
  if (contract.status === "unable-to-verify") return "Unable to verify";
  return "Not returned";
}

function formatHolderSummary(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  const holders = contract?.holders;
  if (!contract || !holders) return fallback;
  if (holders.status === "unable-to-verify") return "Unable to verify";
  if (holders.token.percent === null) return "Not returned";
  return `${holders.token.percent.toLocaleString("en-US", {
    maximumFractionDigits: holders.token.percent < 1 ? 2 : 1,
  })}% top`;
}

function formatOptionalPercent(value: number | null): string {
  if (value === null) return "Not returned";
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: value < 1 ? 2 : 1,
  })}%`;
}

function formatLockerRecordDate(value: string | null): string {
  if (!value) return "Not returned";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not returned";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function sampledRowsDetail({
  sampledHolderCount,
  pageCount,
}: {
  sampledHolderCount: number;
  pageCount: number;
}): string {
  const pageLabel = pageCount === 1 ? "page" : "pages";
  return `${sampledHolderCount.toLocaleString("en-US")} sampled rows across ${pageCount.toLocaleString("en-US")} ${pageLabel}.`;
}

function formatEventHistoryStatus(
  contract: TokenChairContractData | null,
  state: SnifferUiState,
): string {
  if (state === "loading") return "Loading";
  const eventHistory = contract?.eventHistory;
  if (!eventHistory) return "Not checked yet";
  if (eventHistory.status === "unable-to-verify") return "Unable to verify";

  const count =
    eventHistory.ownershipTransferred.count +
    eventHistory.roleGranted.count +
    eventHistory.roleRevoked.count +
    eventHistory.paused.count +
    eventHistory.unpaused.count;

  if (count > 0) return `${count} recent event${count === 1 ? "" : "s"}`;
  if (eventHistory.status === "partial") return "Partially checked";
  return "No recent events";
}

function formatProxySignal(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  if (!contract) return fallback;
  if (contract.proxy.detected === true) {
    return contract.proxy.detectedKinds?.length
      ? contract.proxy.detectedKinds.join(", ")
      : "Signal found";
  }
  if (contract.proxy.detected === false) return "Common signal not found";
  return "Unable to verify";
}

function formatPendingOwnerSignal(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  const pendingOwner = contract?.pendingOwner;
  if (!contract || !pendingOwner) return fallback;
  if (pendingOwner.address) return shortenAddress(pendingOwner.address);
  return "Common signal not found";
}

function formatAccessControlSignal(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  const detected = contract?.accessControl?.detected;
  if (detected === true) return "Role signal found";
  if (detected === false) return "Common signal not found";
  return contract ? "Unable to verify" : fallback;
}

function formatAdminGetterSummary(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  if (!contract) return fallback;
  const count = contract.adminGetters?.length ?? 0;
  if (count > 0) return `${count} visible getter${count === 1 ? "" : "s"}`;
  if (contract.status === "unable-to-verify") return "Unable to verify";
  return "Common getter not found";
}

function formatTaxGetterSignal(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  const taxes = contract?.taxes;
  if (!contract || !taxes) return fallback;
  const found = [taxes.buy, taxes.sell].filter((tax) => tax.status === "found");
  if (found.length > 0) return `${found.length} getter${found.length === 1 ? "" : "s"}`;
  if ([taxes.buy, taxes.sell].some((tax) => tax.status === "unable-to-verify")) {
    return "Unable to verify";
  }
  return "Common getter not found";
}

function formatSourceStatus(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  const verified = contract?.explorer?.sourceVerified;
  if (verified === true) return "Verified";
  if (verified === false) return "Not verified";
  return fallback;
}

function formatAbiStatus(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  const available = contract?.explorer?.abiAvailable;
  if (available === true) return "Returned";
  if (available === false) return "Not returned";
  return fallback;
}

function verdictToneText(verdict: TokenChairVerdict): string {
  return {
    success: "font-semibold text-pulse-green",
    warning: "font-semibold text-amber-300",
    danger: "font-semibold text-pulse-red",
    neutral: "font-semibold text-pulse-muted",
  }[verdict.tone];
}

function reasonToneClass(
  severity: TokenChairVerdict["reasons"][number]["severity"],
): string {
  return {
    info: "border-pulse-border bg-pulse-panel text-pulse-muted",
    warning: "border-amber-400/45 bg-amber-400/10 text-amber-300",
    high: "border-pulse-red/45 bg-pulse-red/10 text-pulse-red",
  }[severity];
}

function contractAccent(
  index: number,
): "green" | "purple" | "cyan" | "pink" | "amber" {
  return (["green", "amber", "purple", "cyan", "pink"] as const)[
    index % 5
  ];
}

function firstMessage(messages: readonly string[]): string | null {
  return messages.find((message) => message.trim().length > 0) ?? null;
}

function buildSignalDetails(
  response: TokenChairApiResponse | null,
  state: SnifferUiState,
  requestError: string | null,
): string[] {
  if (state === "loading") {
    return [
      "Sniffing visible data from DEX Screener, PulseChain RPC, and PulseScan read-only endpoints.",
    ];
  }

  if (state === "error") {
    return [
      requestError ??
        "The local Token Chair Sniffer API route could not complete this read.",
    ];
  }

  if (!response) {
    return [
      "Waiting for a PulseChain token address. This feature does not connect a wallet, request signatures, or submit transactions.",
    ];
  }

  const messages = [
    ...response.verdict.notes,
    ...response.warnings,
    ...response.errors,
  ]
    .map((message) => normalizeSignalDetailMessage(message))
    .filter(Boolean);
  const uniqueMessages = [...new Set(messages)];

  if (uniqueMessages.length === 0) {
    return [
      "Visible market data returned, but bytecode-level hidden-owner review and honeypot checks are still not live in this pass.",
    ];
  }

  return uniqueMessages.slice(0, 5);
}

function normalizeSignalDetailMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return "";
  if (/rate-limited .*explorer metadata/i.test(trimmed)) {
    return "PulseScan rate-limited explorer metadata. Market and pair-contract data may still be available, but source and deployer checks are temporarily unavailable.";
  }
  if (/rate-limited .*holder data/i.test(trimmed)) {
    return "PulseScan rate-limited holder data. Market and pair-contract data may still be available, but holder and LP distribution checks are temporarily unavailable.";
  }
  return trimmed;
}

function hasRateLimitMessage(messages: readonly string[]): boolean {
  return messages.some((message) => /rate-limited|HTTP 429/i.test(message));
}
