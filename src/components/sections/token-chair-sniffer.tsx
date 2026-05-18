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
  buildTokenChairSnifferUrl,
  buildContractSniffCards,
  buildPairCandidateRows,
  buildQuickSniffRows,
  buildSourceSignalDetailRows,
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
  type TokenChairMarketData,
  type TokenChairPairCandidateRow,
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
};

const NAV_ITEMS = [
  { label: "Sniffer", href: "#sniffer", active: true },
  { label: "Approval scanner", href: "/app#scanner", active: false },
  { label: "Security", href: "/security", active: false },
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
            />
            <VerdictPanel
              verdict={verdict}
              state={state}
              response={response}
              requestError={requestError}
            />
          </section>

          <StatusStrip response={response} state={state} contract={contract} />
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
          <HolderChairIntel rows={concentrationRows} contract={contract} />
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
}: {
  input: string;
  hasInput: boolean;
  inlineError: string | null;
  state: SnifferUiState;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onInputChange: (value: string) => void;
  onInputBlur: () => void;
}) {
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
          disabled={state === "loading" || !hasInput}
          className="inline-flex min-h-14 items-center justify-center rounded-lg border border-amber-300/70 bg-[linear-gradient(135deg,#ffcf4a,#ff9b1a)] px-5 py-3 text-sm font-bold text-[#170d02] shadow-[0_0_30px_rgba(255,157,18,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {state === "loading" ? "Sniffing..." : "Sniff Token"}
        </button>
      </form>
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
              Mode
            </p>
            <p className="mt-1 font-semibold text-pulse-text">
              Read-only, no wallet
            </p>
          </div>
        </div>
      </div>
    </section>
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
    <div className="grid gap-3 px-3 py-3 transition hover:bg-pulse-panel/25 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
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
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 md:grid-cols-2 2xl:grid-cols-4">
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
    <div className="min-w-0 rounded-lg border border-pulse-border/60 bg-[#0a1016] px-2 py-1.5">
      <p className="uppercase tracking-[0.12em] text-pulse-muted/70">{label}</p>
      <p className="mt-1 truncate font-semibold text-pulse-text">{value}</p>
    </div>
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
        Tax, honeypot, hidden-owner, and obfuscation checks are not live yet.
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
          className="rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 font-mono text-xs font-semibold text-amber-200"
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

function HolderChairIntel({
  rows,
  contract,
}: {
  rows: readonly TokenChairConcentrationDetailRow[];
  contract: TokenChairContractData | null;
}) {
  if (!contract) return null;

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
      <PanelHeader icon="H" title="Holder Chair Intel" meta={holderStatus} />
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
        Holder concentration is visible explorer context only. Burn/dead holder
        labels are not proof of an LP lock, and indexed holder data can change.
      </p>
    </section>
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
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <HolderMetric label="Percent" value={row.percentLabel} />
        <HolderMetric label="Holders" value={row.holderCountLabel} />
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
    ["Roles", formatAccessControlSignal(contract, fallback)],
    ["Tax getters", formatTaxGetterSignal(contract, fallback)],
  ] as const;

  return (
    <div className="mt-4 grid gap-2 rounded-lg border border-pulse-border/70 bg-[#070b10] p-3 sm:grid-cols-3 xl:grid-cols-9">
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

function formatProxySignal(
  contract: TokenChairContractData | null,
  fallback: string,
): string {
  if (!contract) return fallback;
  if (contract.proxy.detected === true) return "Signal found";
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
    .map((message) => message.trim())
    .filter(Boolean);
  const uniqueMessages = [...new Set(messages)];

  if (uniqueMessages.length === 0) {
    return [
      "Visible market data returned, but tax and honeypot checks are still not live in this pass.",
    ];
  }

  return uniqueMessages.slice(0, 5);
}
