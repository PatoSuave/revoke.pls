import type { Address } from "viem";

import {
  buildTokenChairSnifferUrl,
  type TokenChairApiResponse,
  type TokenChairContractData,
  type TokenChairDextoolsData,
  type TokenChairLpControlSummary,
  type TokenChairSourceSignal,
} from "@/lib/token-chair-sniffer";

export type TokenChairRiskSeverity = "critical" | "warning" | "info";

export type TokenChairRiskCategory =
  | "control"
  | "liquidity"
  | "holders"
  | "source"
  | "market"
  | "coverage";

export interface TokenChairRiskItem {
  id: string;
  severity: TokenChairRiskSeverity;
  category: TokenChairRiskCategory;
  title: string;
  evidence: string;
  whyItMatters: string;
  manualReview: string;
  sourceLabel?: string;
  href?: string;
}

export interface TokenChairRiskCounts {
  critical: number;
  warning: number;
  info: number;
}

export type TokenChairRiskReadinessTone = "danger" | "warning" | "neutral" | "success";

export interface TokenChairRiskReadiness {
  label: string;
  detail: string;
  tone: TokenChairRiskReadinessTone;
  coverageGapCount: number;
}

export interface TokenChairRiskQueueInput {
  response: TokenChairApiResponse | null;
  lpControlSummary?: TokenChairLpControlSummary | null;
}

const HIGH_SOURCE_SIGNAL_IDS = new Set<TokenChairSourceSignal["key"]>([
  "blacklist",
  "trading-gates",
  "hidden-owner",
  "suspicious-functions",
]);

export function buildTokenChairRiskQueue({
  response,
  lpControlSummary = null,
}: TokenChairRiskQueueInput): TokenChairRiskItem[] {
  if (!response) {
    return [
      {
        id: "scan-not-run",
        severity: "info",
        category: "coverage",
        title: "Run a scan first",
        evidence: "No Token Chair scan result is loaded yet.",
        whyItMatters:
          "The review queue is built from visible market, holder, source, and read-only contract evidence.",
        manualReview: "Paste a PulseChain token address and run Token Chair before making a review decision.",
      },
    ];
  }

  const items: TokenChairRiskItem[] = [];
  const tokenAddress = response.tokenAddress;

  addResponseCoverageItems(items, response);
  addMarketItems(items, response);
  addDextoolsItems(items, response.dextools);
  addContractItems(items, response.contract);
  addSourceItems(items, response.contract);
  addHolderItems(items, response.contract);
  addLpControlItems(items, response.contract, lpControlSummary);
  addAggregateCoverageItems(items, response);
  addHoneypotCoverageItem(items);

  if (tokenAddress) {
    items.push({
      id: "shareable-report",
      severity: "info",
      category: "coverage",
      title: "Shareable report link ready",
      evidence: `Report URL: ${buildTokenChairSnifferUrl(tokenAddress)}`,
      whyItMatters:
        "A stable review link helps compare manual notes against the same token address.",
      manualReview:
        "Share the report with the reviewer, then verify the address matches the token shown on external sources.",
      href: buildTokenChairSnifferUrl(tokenAddress),
      sourceLabel: "Token Chair report",
    });
  }

  return dedupeRiskItems(items).sort(compareRiskItems);
}

export function getTokenChairRiskCounts(
  items: readonly TokenChairRiskItem[],
): TokenChairRiskCounts {
  return {
    critical: items.filter((item) => item.severity === "critical").length,
    warning: items.filter((item) => item.severity === "warning").length,
    info: items.filter((item) => item.severity === "info").length,
  };
}

export function getTokenChairRiskReadiness(
  items: readonly TokenChairRiskItem[],
): TokenChairRiskReadiness {
  const counts = getTokenChairRiskCounts(items);
  const coverageGapCount = items.filter(isCoverageGapItem).length;

  if (items.some((item) => item.id === "scan-not-run")) {
    return {
      label: "Run scan",
      detail:
        "Paste a PulseChain token address to build the review queue and evidence checklist.",
      tone: "neutral",
      coverageGapCount,
    };
  }

  if (counts.critical > 0) {
    return {
      label: "Critical review first",
      detail:
        "Critical queue items need manual review before using the checklist as an acceptance record.",
      tone: "danger",
      coverageGapCount,
    };
  }

  if (counts.warning > 0) {
    return {
      label: coverageGapCount > 0 ? "Warnings and gaps" : "Warnings to review",
      detail:
        coverageGapCount > 0
          ? "The scan returned warning-level items and unresolved coverage gaps. Review both before making a manual decision."
          : "Warning-level items are present. Review the evidence and record a manual decision.",
      tone: "warning",
      coverageGapCount,
    };
  }

  return {
    label: "Ready for manual decision",
    detail:
      "No critical or warning queue items are currently prioritized. This is still not a safety verdict.",
    tone: "success",
    coverageGapCount,
  };
}

function addResponseCoverageItems(
  items: TokenChairRiskItem[],
  response: TokenChairApiResponse,
) {
  if (!response.ok || response.status !== "success") {
    items.push({
      id: `response-${response.status}`,
      severity: response.status === "bad-request" ? "info" : "warning",
      category: "coverage",
      title: "Scan did not fully complete",
      evidence: `API status: ${response.status}`,
      whyItMatters:
        "Incomplete scan responses can hide missing market, contract, holder, or source context.",
      manualReview:
        "Rerun the scan, then manually inspect the token on PulseScan and the active DEX before interacting.",
    });
  }

  if (response.warnings.length > 0) {
    items.push({
      id: "response-warnings",
      severity: "warning",
      category: "coverage",
      title: "Scanner returned warnings",
      evidence: response.warnings.slice(0, 2).join(" "),
      whyItMatters:
        "Warnings often indicate bounded reads, rate limits, or partial upstream data.",
      manualReview:
        "Open the detailed panels and confirm which evidence rows were partial or capped.",
    });
  }
}

function addMarketItems(items: TokenChairRiskItem[], response: TokenChairApiResponse) {
  const market = response.market;
  if (!market) {
    items.push({
      id: "market-missing",
      severity: "warning",
      category: "market",
      title: "Primary market pair missing",
      evidence: "DEX Screener did not return a selected PulseChain pair.",
      whyItMatters:
        "Without a visible pair, liquidity, age, volume, and quote-token context are limited.",
      manualReview:
        "Search the token on PulseChain DEX tools and verify whether a real trading pair exists.",
    });
    return;
  }

  if (market.liquidityUsd !== null && market.liquidityUsd < 10_000) {
    items.push({
      id: "low-liquidity",
      severity: "warning",
      category: "market",
      title: "Low visible liquidity",
      evidence: `Selected pair liquidity is ${formatRiskUsd(market.liquidityUsd)}.`,
      whyItMatters:
        "Low visible liquidity can make exits fragile and can amplify price impact.",
      manualReview:
        "Inspect the selected pair, recent volume, and whether liquidity is concentrated in one holder.",
      href: market.dexScreenerUrl ?? undefined,
      sourceLabel: "DEX Screener",
    });
  }

  if (market.pairCount > 1) {
    items.push({
      id: "multiple-pairs",
      severity: "info",
      category: "market",
      title: "Multiple market pairs returned",
      evidence: `${market.pairCount.toLocaleString("en-US")} DEX Screener pairs were returned.`,
      whyItMatters:
        "Multiple pairs can split liquidity and make the selected pair only part of the market picture.",
      manualReview:
        "Review the Pair Candidates section and compare liquidity, quote token, pair age, and volume.",
      href: market.dexScreenerUrl ?? undefined,
      sourceLabel: "DEX Screener",
    });
  }

  if (response.pairContract?.status === "success" && response.pairContract.containsScannedToken === false) {
    items.push({
      id: "pair-contract-mismatch",
      severity: "critical",
      category: "market",
      title: "Selected pair contract mismatch",
      evidence:
        "Read-only pair contract checks did not confirm the scanned token in token0 or token1.",
      whyItMatters:
        "A market pair that does not contain the scanned token can make liquidity and LP context unreliable.",
      manualReview:
        "Open the selected pair contract and verify token0/token1 directly before using market or LP evidence.",
      href: market.dexScreenerUrl ?? undefined,
      sourceLabel: "DEX Screener",
    });
  } else if (response.pairContract?.status && response.pairContract.status !== "success") {
    items.push({
      id: `pair-contract-${response.pairContract.status}`,
      severity: "warning",
      category: "coverage",
      title: "Selected pair contract read incomplete",
      evidence: `Pair contract read status: ${response.pairContract.status}.`,
      whyItMatters:
        "Pair token and reserve checks help confirm the selected market pair matches the scanned token.",
      manualReview:
        "Open the selected pair contract and verify token0, token1, reserves, and LP supply manually.",
      href: market.dexScreenerUrl ?? undefined,
      sourceLabel: "DEX Screener",
    });
  }
}

function addDextoolsItems(
  items: TokenChairRiskItem[],
  dextools: TokenChairDextoolsData | null,
) {
  if (!dextools || dextools.status === "not-configured") {
    items.push({
      id: "dextools-not-configured",
      severity: "info",
      category: "coverage",
      title: "DEXTools enrichment not configured",
      evidence: "Optional DEXTools score/profile enrichment did not run.",
      whyItMatters:
        "This does not block Token Chair, but it leaves one external market/profile source out of the review.",
      manualReview:
        "If DEXTools context matters for this token, open the pair manually and compare external profile data.",
    });
    return;
  }

  if (dextools.status === "partial" || dextools.status === "rate-limited" || dextools.status === "unable-to-verify") {
    items.push({
      id: `dextools-${dextools.status}`,
      severity: "info",
      category: "coverage",
      title: "DEXTools enrichment incomplete",
      evidence: `DEXTools status: ${dextools.status}.`,
      whyItMatters:
        "External score/profile context may be missing or stale when the enrichment is incomplete.",
      manualReview:
        "Open the DEXTools token or pair URL directly and compare against Token Chair market data.",
      href: dextools.pairUrl ?? dextools.tokenUrl ?? undefined,
      sourceLabel: "DEXTools",
    });
  }
}

function addContractItems(
  items: TokenChairRiskItem[],
  contract: TokenChairContractData | null,
) {
  if (!contract) {
    items.push({
      id: "contract-missing",
      severity: "warning",
      category: "coverage",
      title: "Contract reads missing",
      evidence: "Token Chair did not return read-only contract context.",
      whyItMatters:
        "Ownership, proxy, public getters, source, and holder checks depend on contract context.",
      manualReview:
        "Open the token contract on PulseScan and verify source, owner, proxy, holders, and public controls manually.",
    });
    return;
  }

  if (contract.status !== "success") {
    items.push({
      id: `contract-${contract.status}`,
      severity: "warning",
      category: "coverage",
      title: "Contract reads incomplete",
      evidence: `Contract read status: ${contract.status}.`,
      whyItMatters:
        "Partial contract reads can leave ownership, getter, or proxy controls unresolved.",
      manualReview:
        "Review the Contract Sniff and Quick Sniff panels, then confirm missing controls on PulseScan.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan",
    });
  }

  if (contract.ownerAddress && contract.ownershipRenounced !== true) {
    items.push({
      id: "owner-not-renounced",
      severity: "warning",
      category: "control",
      title: "Owner control still visible",
      evidence: `Owner getter returned ${shortRiskAddress(contract.ownerAddress)}.`,
      whyItMatters:
        "A visible owner can sometimes change settings, transfer ownership, or call privileged functions.",
      manualReview:
        "Open the owner address and verified source to identify what owner-only functions can still do.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan source",
    });
  }

  const pendingOwner = contract.pendingOwner;
  if (pendingOwner?.address) {
    items.push({
      id: "pending-owner",
      severity: "warning",
      category: "control",
      title: "Pending owner/admin address visible",
      evidence: `${pendingOwner.functionName ?? "pending owner"} returned ${shortRiskAddress(pendingOwner.address)}.`,
      whyItMatters:
        "Pending ownership can indicate a control handoff that may not be visible from the current owner alone.",
      manualReview:
        "Check whether the pending address can accept ownership or admin control.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan source",
    });
  }

  if (contract.adminGetters?.length) {
    const labels = contract.adminGetters
      .slice(0, 3)
      .map((getter) => `${getter.functionName}() -> ${shortRiskAddress(getter.address)}`)
      .join(", ");
    items.push({
      id: "admin-getters",
      severity: "warning",
      category: "control",
      title: "Public control-address getters found",
      evidence: labels,
      whyItMatters:
        "Admin, operator, router, fee-wallet, or treasury getters can reveal active control surfaces.",
      manualReview:
        "Open each address and inspect source permissions before treating ownership as settled.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan source",
    });
  }

  if (contract.proxy.detected || contract.proxy.implementationAddress || contract.proxy.adminAddress) {
    items.push({
      id: "proxy-detected",
      severity: "critical",
      category: "control",
      title: "Proxy or upgrade surface detected",
      evidence: proxyEvidence(contract),
      whyItMatters:
        "Proxy patterns can allow behavior to change through implementation or admin controls.",
      manualReview:
        "Verify implementation, admin, beacon, and public proxy getter addresses on PulseScan before interacting.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan source",
    });
  }

  if (contract.accessControl?.detected) {
    items.push({
      id: "access-control",
      severity: "warning",
      category: "control",
      title: "Role-based controls detected",
      evidence: "Common AccessControl role functions were detected.",
      whyItMatters:
        "Role-based admin permissions can exist even when a simple owner getter looks harmless.",
      manualReview:
        "Review role admins, granted roles, and recent role events on the contract.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan source",
    });
  }

  for (const tax of [
    ["buy", contract.taxes?.buy] as const,
    ["sell", contract.taxes?.sell] as const,
  ]) {
    const [kind, signal] = tax;
    if (signal?.status === "found" && signal.valueRaw && signal.valueRaw !== "0") {
      items.push({
        id: `${kind}-tax-getter`,
        severity: "warning",
        category: "control",
        title: `Public ${kind} tax getter returned a value`,
        evidence: `${signal.functionName ?? `${kind} tax getter`} returned raw ${signal.valueRaw}.`,
        whyItMatters:
          "A public getter is not a trade simulation, but non-zero fee settings deserve source review.",
        manualReview:
          "Check whether taxes are bounded, changeable, excluded by address, or enforced dynamically.",
        href: contract.explorer?.explorerTokenUrl,
        sourceLabel: "PulseScan source",
      });
    }
  }
}

function addSourceItems(
  items: TokenChairRiskItem[],
  contract: TokenChairContractData | null,
) {
  const explorer = contract?.explorer;
  if (!contract || !explorer) return;

  if (explorer.sourceVerified === false) {
    items.push({
      id: "source-not-verified",
      severity: "critical",
      category: "source",
      title: "Source not verified",
      evidence: "PulseScan did not return verified source code.",
      whyItMatters:
        "Without verified source, reviewers cannot easily inspect privileged paths or hidden transfer behavior.",
      manualReview:
        "Treat source review as unresolved and inspect bytecode/transactions with external tooling if needed.",
      href: explorer.explorerAddressUrl,
      sourceLabel: "PulseScan",
    });
  }

  if (explorer.status !== "success" || explorer.abiAvailable === false || explorer.sourceCodeAvailable === false) {
    items.push({
      id: "source-metadata-incomplete",
      severity: "warning",
      category: "source",
      title: "Source or ABI metadata incomplete",
      evidence: `Explorer status: ${explorer.status}. ABI: ${formatRiskBoolean(explorer.abiAvailable)}. Source: ${formatRiskBoolean(explorer.sourceCodeAvailable)}.`,
      whyItMatters:
        "Missing source or ABI data weakens source-signal and public-getter coverage.",
      manualReview:
        "Open PulseScan directly and confirm whether source, ABI, and proxy implementation source are available.",
      href: explorer.explorerAddressUrl,
      sourceLabel: "PulseScan",
    });
  }

  for (const signal of explorer.sourceSignals) {
    if (signal.found !== true) continue;
    const critical = signal.severity === "high" || HIGH_SOURCE_SIGNAL_IDS.has(signal.key);
    items.push({
      id: `source-${signal.key}`,
      severity: critical ? "critical" : "warning",
      category: "source",
      title: `${signal.label} source signal`,
      evidence: signal.matches.length
        ? `Matched terms: ${signal.matches.slice(0, 6).join(", ")}.`
        : signal.detail,
      whyItMatters: sourceSignalWhyItMatters(signal),
      manualReview:
        "Open the verified source and confirm whether the matched terms affect transfers, approvals, fees, ownership, or trading.",
      href: explorer.explorerAddressUrl,
      sourceLabel: "PulseScan source",
    });
  }
}

function addHolderItems(
  items: TokenChairRiskItem[],
  contract: TokenChairContractData | null,
) {
  const holders = contract?.holders;
  if (!contract || !holders) return;

  if (holders.status !== "success") {
    items.push({
      id: `holders-${holders.status}`,
      severity: "warning",
      category: "holders",
      title: "Holder distribution incomplete",
      evidence: `Holder read status: ${holders.status}.`,
      whyItMatters:
        "Partial holder data can hide concentration, burn/dead balances, or selected-pair balances.",
      manualReview:
        "Open the holder distribution on PulseScan and compare top holders against the sampled rows.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan holders",
    });
  }

  const tokenPercent = holders.distribution?.top1Percent ?? holders.token.percent;
  if (tokenPercent !== null && tokenPercent >= 20) {
    items.push({
      id: "top-holder-concentration",
      severity: tokenPercent >= 50 ? "critical" : "warning",
      category: "holders",
      title: "High top-holder concentration",
      evidence: `Largest visible token holder has ${formatRiskPercent(tokenPercent)} of sampled supply.`,
      whyItMatters:
        "Large holder concentration can create sell-pressure, governance, or control concerns depending on the address.",
      manualReview:
        "Classify the top holder address, confirm whether it is a wallet, contract, pair, bridge, or known protocol, and compare with full holder pages.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan holders",
    });
  }

  const top10Percent = holders.distribution?.top10Percent ?? null;
  if (top10Percent !== null && top10Percent >= 50) {
    items.push({
      id: "top-10-concentration",
      severity: top10Percent >= 80 ? "critical" : "warning",
      category: "holders",
      title: "Top-10 holders are concentrated",
      evidence: `Top 10 sampled holders have ${formatRiskPercent(top10Percent)} of sampled supply.`,
      whyItMatters:
        "A broad-looking holder count can still be concentrated among a small number of addresses.",
      manualReview:
        "Review the top-holder table and classify whether the addresses are wallets, contracts, exchanges, or protocol-owned.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan holders",
    });
  }

  if (holders.distribution?.maxPagesReached || holders.lpDistribution?.maxPagesReached) {
    items.push({
      id: "holder-sample-capped",
      severity: "info",
      category: "coverage",
      title: "Holder sample was capped",
      evidence: "Token Chair capped one or more holder crawls for response time.",
      whyItMatters:
        "Sampled holder data is useful context but not a full ownership audit.",
      manualReview:
        "Use PulseScan holder pages for deeper holder review before relying on concentration percentages.",
      href: contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan holders",
    });
  }
}

function addLpControlItems(
  items: TokenChairRiskItem[],
  contract: TokenChairContractData | null,
  lpControlSummary: TokenChairLpControlSummary | null,
) {
  const holders = contract?.holders;
  if (!contract || !holders) return;

  const lpPercent = holders.lp.percent;
  if (lpPercent === null) {
    items.push({
      id: "lp-holder-unavailable",
      severity: "warning",
      category: "liquidity",
      title: "LP holder concentration unavailable",
      evidence: "PulseScan did not return LP-token holder concentration for the selected pair.",
      whyItMatters:
        "Without LP holder context, liquidity-control review is unresolved.",
      manualReview:
        "Open the selected pair token holders on PulseScan and identify the largest LP-token holders.",
      href: lpControlSummary?.href ?? contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan LP holders",
    });
  } else if (lpPercent >= 50) {
    items.push({
      id: "lp-holder-concentration",
      severity: lpPercent >= 90 ? "critical" : "warning",
      category: "liquidity",
      title: "High LP-token holder concentration",
      evidence: `Largest visible LP-token holder has ${formatRiskPercent(lpPercent)} of sampled LP tokens.`,
      whyItMatters:
        "A dominant LP-token holder may be able to move or withdraw liquidity unless it is burned, locked, or otherwise constrained.",
      manualReview:
        "Classify the LP holder, verify lock/burn evidence, and review unlock dates or owner addresses when a locker is involved.",
      href: lpControlSummary?.href ?? contract.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan LP holders",
    });
  }

  if (contract.lpLocker?.withdrawableLocks.length) {
    items.push({
      id: "lp-lock-withdrawable",
      severity: "critical",
      category: "liquidity",
      title: "Locker record is withdrawable",
      evidence: `${contract.lpLocker.withdrawableLocks.length.toLocaleString("en-US")} matched locker record(s) appear withdrawable or expired.`,
      whyItMatters:
        "Withdrawable lock records can mean liquidity is no longer constrained by the locker schedule.",
      manualReview:
        "Open the locker contract, inspect lock owner addresses, and confirm current unlock state directly.",
      href: lpControlSummary?.href ?? contract.explorer?.explorerTokenUrl,
      sourceLabel: contract.lpLocker.lockerLabel ?? "Locker read",
    });
  } else if (contract.lpLocker?.activeLocks.length) {
    items.push({
      id: "lp-lock-active",
      severity: "info",
      category: "liquidity",
      title: "Readable LP lock found",
      evidence: `${contract.lpLocker.activeLocks.length.toLocaleString("en-US")} active selected-pair lock record(s) returned.`,
      whyItMatters:
        "A readable active lock is useful context, but it is still not a full liquidity or ownership audit.",
      manualReview:
        "Verify locked amount, owner address, and next unlock date directly in the locker contract.",
      href: lpControlSummary?.href ?? contract.explorer?.explorerTokenUrl,
      sourceLabel: contract.lpLocker.lockerLabel ?? "Locker read",
    });
  } else if (lpControlSummary?.status === "unable-to-verify") {
    items.push({
      id: "lp-control-unverified",
      severity: "warning",
      category: "liquidity",
      title: "LP control unresolved",
      evidence: lpControlSummary.detail,
      whyItMatters:
        "LP control determines who may be able to move the selected pair liquidity.",
      manualReview:
        "Open the LP holder address and selected pair token holder page for manual verification.",
      href: lpControlSummary.href,
      sourceLabel: "PulseScan LP holders",
    });
  }
}

function addAggregateCoverageItems(
  items: TokenChairRiskItem[],
  response: TokenChairApiResponse,
) {
  const contract = response.contract;
  const explorerDegraded =
    contract?.explorer?.status === "unable-to-verify" ||
    contract?.explorer?.sourceVerified === null ||
    contract?.explorer?.abiAvailable === null;
  const holdersDegraded =
    contract?.holders?.status === "unable-to-verify" ||
    contract?.holders?.status === "partial";
  const pairDegraded =
    response.pairContract?.status === "unable-to-verify" ||
    response.pairContract?.status === "partial";
  const warningText = response.warnings.join(" ").toLowerCase();
  const rateLimited =
    warningText.includes("rate-limit") ||
    warningText.includes("rate limited") ||
    warningText.includes("rate-limited");
  const degradedCount = [
    explorerDegraded,
    holdersDegraded,
    pairDegraded,
    rateLimited,
    response.status !== "success",
  ].filter(Boolean).length;

  if (degradedCount >= 2) {
    items.push({
      id: "multiple-data-sources-degraded",
      severity: "warning",
      category: "coverage",
      title: "Multiple evidence sources degraded",
      evidence:
        rateLimited
          ? "One or more upstream reads appear rate-limited, and additional evidence sources are incomplete."
          : "Two or more evidence sources did not fully return.",
      whyItMatters:
        "When multiple evidence sources degrade together, the queue can miss source, holder, pair, or LP context.",
      manualReview:
        "Rerun the scan, then open PulseScan and the selected DEX pair directly for unresolved source, holder, and LP evidence.",
      href: contract?.explorer?.explorerTokenUrl,
      sourceLabel: "PulseScan",
    });
  }
}

function addHoneypotCoverageItem(items: TokenChairRiskItem[]) {
  items.push({
    id: "honeypot-not-live",
    severity: "info",
    category: "coverage",
    title: "Honeypot simulation is not live",
    evidence: "Token Chair does not run buy/sell execution or simulation in this phase.",
    whyItMatters:
      "Read-only source and holder signals cannot prove a token can be bought or sold under live conditions.",
    manualReview:
      "Use separate simulation or controlled test tooling if execution behavior must be verified.",
  });
}

function isCoverageGapItem(item: TokenChairRiskItem): boolean {
  if (item.category === "coverage") return true;

  const text = `${item.id} ${item.title}`.toLowerCase();
  return (
    text.includes("missing") ||
    text.includes("incomplete") ||
    text.includes("unavailable") ||
    text.includes("unresolved") ||
    text.includes("not verified") ||
    text.includes("not configured") ||
    text.includes("not live")
  );
}

function dedupeRiskItems(items: readonly TokenChairRiskItem[]): TokenChairRiskItem[] {
  const seen = new Set<string>();
  const deduped: TokenChairRiskItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }

  return deduped;
}

function compareRiskItems(a: TokenChairRiskItem, b: TokenChairRiskItem): number {
  return severityRank(a.severity) - severityRank(b.severity) ||
    categoryRank(a.category) - categoryRank(b.category) ||
    a.title.localeCompare(b.title);
}

function severityRank(severity: TokenChairRiskSeverity): number {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

function categoryRank(category: TokenChairRiskCategory): number {
  if (category === "control") return 0;
  if (category === "liquidity") return 1;
  if (category === "holders") return 2;
  if (category === "source") return 3;
  if (category === "market") return 4;
  return 5;
}

function sourceSignalWhyItMatters(signal: TokenChairSourceSignal): string {
  if (signal.key === "hidden-owner") {
    return "Hidden-owner patterns can obscure who may have privileged authority.";
  }

  if (signal.key === "obfuscated-address") {
    return "Obfuscated address construction can make manual review harder and can hide important targets.";
  }

  if (signal.key === "blacklist" || signal.key === "trading-gates") {
    return "Transfer restrictions or trading gates can affect whether users can move or sell tokens.";
  }

  if (signal.key === "mintable") {
    return "Mint paths can change supply if callable by privileged roles or contract logic.";
  }

  if (signal.key === "transfer-pausable") {
    return "Pause controls can stop transfers if callable by an authorized party.";
  }

  return "Matched source terms are review signals, not final conclusions.";
}

function proxyEvidence(contract: TokenChairContractData): string {
  const parts = [
    contract.proxy.implementationAddress
      ? `implementation ${shortRiskAddress(contract.proxy.implementationAddress)}`
      : null,
    contract.proxy.adminAddress ? `admin ${shortRiskAddress(contract.proxy.adminAddress)}` : null,
    contract.proxy.beaconAddress ? `beacon ${shortRiskAddress(contract.proxy.beaconAddress)}` : null,
    contract.proxy.detectedKinds?.length
      ? `kinds ${contract.proxy.detectedKinds.join(", ")}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join("; ") : "Proxy-like surface was detected by read-only checks.";
}

function formatRiskBoolean(value: boolean | null): string {
  if (value === true) return "returned";
  if (value === false) return "missing";
  return "unknown";
}

function formatRiskPercent(value: number): string {
  return `${value.toLocaleString("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value < 10 ? 1 : 0,
  })}%`;
}

function formatRiskUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 1 ? 0 : 6,
  });
}

function shortRiskAddress(address: Address): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
