import {
  CANDIDATE_DOMAIN_REGISTRY,
  findCandidateDomainMatches,
  type CandidateDomainEntry,
} from "@/lib/security/candidate-domain-registry";
import {
  OFFICIAL_DOMAIN_REGISTRY,
  findOfficialDomainMatch,
  findOfficialParentDomain,
  normalizeRegistryHostname,
  type OfficialDomainEntry,
} from "@/lib/security/official-domain-registry";

export type LinkCheckStatus =
  | "official-match"
  | "likely-lookalike"
  | "suspicious-patterns"
  | "unknown-domain"
  | "invalid-input";

export type LinkRiskSignal = {
  id: string;
  severity: "info" | "low" | "medium" | "high";
  title: string;
  description: string;
};

export type LinkCheckResult = {
  input: string;
  normalizedUrl?: string;
  hostname?: string;
  registrableDomain?: string;
  protocol?: string;
  path?: string;
  usesHttps?: boolean;
  status: LinkCheckStatus;
  matchedOfficialDomain?: OfficialDomainEntry;
  closestOfficialDomain?: OfficialDomainEntry;
  closestCandidateDomain?: CandidateDomainEntry;
  candidateDomainMatches: CandidateDomainEntry[];
  signals: LinkRiskSignal[];
  userMessage: string;
};

const DRAINER_KEYWORDS = [
  "airdrop",
  "claim",
  "bonus",
  "free",
  "wallet-verify",
  "walletverify",
  "seed",
  "recovery",
  "connect-wallet",
  "connectwallet",
  "reward",
  "support",
  "urgent",
] as const;

const HIGH_RISK_KEYWORDS = new Set(["seed", "recovery"]);

const SHORTENER_DOMAINS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "shorturl.at",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
  "ow.ly",
]);

const STATUS_MESSAGES: Record<LinkCheckStatus, string> = {
  "official-match":
    "This domain matches a domain in the Pulse Revoke official-domain registry. Still verify your wallet prompt before signing.",
  "likely-lookalike":
    "This domain looks similar to a known official domain. Treat it as high risk unless you can verify it from an official source.",
  "suspicious-patterns":
    "This link contains patterns commonly seen in phishing attempts. Do not connect a wallet or sign anything unless independently verified.",
  "unknown-domain":
    "This domain is not in the registry. Unknown does not automatically mean malicious, but you should verify it before connecting a wallet.",
  "invalid-input": "This does not look like a valid URL or domain.",
};

export function checkCryptoLink(input: string): LinkCheckResult {
  const rawInput = input.trim();

  if (!rawInput) {
    return invalidResult(input);
  }

  const parsed = parseCandidate(rawInput);
  if (!parsed) {
    return invalidResult(input);
  }

  const hostname = normalizeRegistryHostname(parsed.hostname);
  if (!isDomainLike(hostname)) {
    return invalidResult(input);
  }

  const protocol = parsed.protocol.replace(":", "");
  const registrableDomain = getApproximateRegistrableDomain(hostname);
  const signals = collectSignals(parsed, hostname, registrableDomain);
  const matchedOfficialDomain = findOfficialDomainMatch(hostname);
  const closestOfficialDomain = findClosestOfficialDomain(
    hostname,
    registrableDomain,
  );
  const candidateDomainMatches = findCandidateDomainMatches(hostname);
  const closestCandidateDomain =
    candidateDomainMatches.length === 0
      ? findClosestCandidateDomain(hostname, registrableDomain)
      : undefined;

  const status = classifyResult({
    matchedOfficialDomain,
    closestOfficialDomain,
    closestCandidateDomain,
    signals,
  });

  return {
    input,
    normalizedUrl: parsed.href,
    hostname,
    registrableDomain,
    protocol,
    path: `${parsed.pathname}${parsed.search}${parsed.hash}`,
    usesHttps: parsed.protocol === "https:",
    status,
    matchedOfficialDomain,
    closestOfficialDomain,
    closestCandidateDomain,
    candidateDomainMatches,
    signals,
    userMessage: getUserMessage({
      status,
      candidateDomainMatches,
      closestCandidateDomain,
    }),
  };
}

export function getLinkCheckStatusLabel(status: LinkCheckStatus): string {
  switch (status) {
    case "official-match":
      return "Official match";
    case "likely-lookalike":
      return "Lookalike risk";
    case "suspicious-patterns":
      return "Suspicious pattern";
    case "unknown-domain":
      return "Unknown domain";
    case "invalid-input":
      return "Invalid input";
  }
}

function invalidResult(input: string): LinkCheckResult {
  return {
    input,
    status: "invalid-input",
    candidateDomainMatches: [],
    signals: [
      {
        id: "invalid-input",
        severity: "medium",
        title: "Input could not be parsed",
        description:
          "Paste a full URL or a normal domain name, then verify the result against official sources.",
      },
    ],
    userMessage: STATUS_MESSAGES["invalid-input"],
  };
}

function getUserMessage({
  status,
  candidateDomainMatches,
  closestCandidateDomain,
}: {
  status: LinkCheckStatus;
  candidateDomainMatches: readonly CandidateDomainEntry[];
  closestCandidateDomain?: CandidateDomainEntry;
}): string {
  if (status === "likely-lookalike" && closestCandidateDomain) {
    return "This domain looks similar to a domain in a candidate source list. Treat it as high risk unless you can verify it from the project's own channels.";
  }

  if (status === "unknown-domain" && candidateDomainMatches.length > 0) {
    return "This domain is not in the official registry. It appears in a candidate source list, which is context only and still needs independent verification before connecting a wallet.";
  }

  return STATUS_MESSAGES[status];
}

function parseCandidate(input: string): URL | null {
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(input);
  const candidate = hasProtocol ? input : `https://${input}`;

  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    if (!parsed.hostname) return null;
    return parsed;
  } catch {
    return null;
  }
}

function collectSignals(
  parsed: URL,
  hostname: string,
  registrableDomain: string,
): LinkRiskSignal[] {
  const signals: LinkRiskSignal[] = [];
  const combinedPathAndHost = `${hostname} ${parsed.pathname}`.toLowerCase();

  if (parsed.protocol !== "https:") {
    signals.push({
      id: "non-https",
      severity: "medium",
      title: "Connection is not HTTPS",
      description:
        "Crypto apps should use HTTPS. An HTTP link can be modified or observed in transit.",
    });
  }

  if (isIpHostname(hostname)) {
    signals.push({
      id: "ip-hostname",
      severity: "high",
      title: "Hostname is an IP address",
      description:
        "Wallet phishing pages often hide behind raw IP addresses instead of reviewable domains.",
    });
  }

  if (hostname.includes("xn--")) {
    signals.push({
      id: "punycode",
      severity: "high",
      title: "Internationalized domain encoding detected",
      description:
        "Punycode can be used to make a domain appear similar to a familiar brand.",
    });
  }

  if (parsed.username || parsed.password) {
    signals.push({
      id: "misleading-userinfo",
      severity: "high",
      title: "Misleading @ section detected",
      description:
        "Text before @ is not the real destination domain. Check the hostname after the @ symbol.",
    });
  }

  const subdomainDepth = getSubdomainDepth(hostname, registrableDomain);
  if (subdomainDepth > 2) {
    signals.push({
      id: "deep-subdomain",
      severity: "medium",
      title: "Unusual subdomain depth",
      description:
        "Long subdomain chains can be used to bury the real destination domain.",
    });
  }

  const officialParent = findOfficialParentDomain(hostname);
  if (officialParent && !findOfficialDomainMatch(hostname)) {
    signals.push({
      id: "unregistered-official-subdomain",
      severity: "medium",
      title: "Subdomain is not in the official registry",
      description:
        "This is under a known official domain, but this checker does not treat subdomains as official unless they are explicitly listed.",
    });
  }

  for (const keyword of DRAINER_KEYWORDS) {
    if (combinedPathAndHost.includes(keyword)) {
      signals.push({
        id: `keyword-${keyword}`,
        severity: HIGH_RISK_KEYWORDS.has(keyword) ? "high" : "medium",
        title: "Phishing-style keyword detected",
        description: `The link includes "${keyword}", a term often used in wallet-drainer lures.`,
      });
    }
  }

  if (parsed.href.length > 160) {
    signals.push({
      id: "long-url",
      severity: "low",
      title: "Long URL",
      description:
        "Very long URLs can make it harder to inspect the real domain and path before opening.",
    });
  }

  if (SHORTENER_DOMAINS.has(registrableDomain)) {
    signals.push({
      id: "shortener",
      severity: "medium",
      title: "URL shortener detected",
      description:
        "Short links hide the final destination. Verify the expanded destination before connecting a wallet.",
    });
  }

  return signals;
}

function classifyResult({
  matchedOfficialDomain,
  closestOfficialDomain,
  closestCandidateDomain,
  signals,
}: {
  matchedOfficialDomain?: OfficialDomainEntry;
  closestOfficialDomain?: OfficialDomainEntry;
  closestCandidateDomain?: CandidateDomainEntry;
  signals: readonly LinkRiskSignal[];
}): LinkCheckStatus {
  const hasElevatedSignal = signals.some(
    (signal) => signal.severity === "medium" || signal.severity === "high",
  );

  if (matchedOfficialDomain && !hasElevatedSignal) return "official-match";
  if (closestOfficialDomain || closestCandidateDomain) return "likely-lookalike";
  if (signals.length > 0) return "suspicious-patterns";
  return "unknown-domain";
}

function findClosestOfficialDomain(
  hostname: string,
  registrableDomain: string,
): OfficialDomainEntry | undefined {
  const hostCandidate = stripCommonPrefix(hostname);
  const domainCandidate = stripCommonPrefix(registrableDomain);

  return OFFICIAL_DOMAIN_REGISTRY.find((entry) => {
    const officialDomain = normalizeRegistryHostname(entry.domain);
    const officialBase = officialDomain.split(".")[0] ?? officialDomain;
    const officialTld = officialDomain.split(".").at(-1);
    const candidateBase = domainCandidate.split(".")[0] ?? domainCandidate;
    const candidateTld = domainCandidate.split(".").at(-1);

    if (hostname === officialDomain) return false;
    if (hostCandidate.endsWith(`.${officialDomain}`)) return false;

    if (candidateBase === officialBase && candidateTld !== officialTld) {
      return true;
    }

    const foldedOfficial = foldDomainForComparison(officialBase);
    const foldedCandidate = foldDomainForComparison(candidateBase);

    return levenshteinDistance(foldedCandidate, foldedOfficial) <= 2;
  });
}

function findClosestCandidateDomain(
  hostname: string,
  registrableDomain: string,
): CandidateDomainEntry | undefined {
  const hostCandidate = stripCommonPrefix(hostname);
  const domainCandidate = stripCommonPrefix(registrableDomain);
  const inputBase = domainCandidate.split(".")[0] ?? domainCandidate;
  const inputTld = domainCandidate.split(".").at(-1);
  const foldedInput = foldDomainForComparison(inputBase);
  const scoredCandidates = CANDIDATE_DOMAIN_REGISTRY.flatMap((entry) => {
    const candidateHostname = normalizeRegistryHostname(entry.hostname);
    const comparableCandidateHostname = stripCommonPrefix(candidateHostname);
    const candidateRegistrableDomain = getApproximateRegistrableDomain(
      comparableCandidateHostname,
    );
    const candidateBase =
      candidateRegistrableDomain.split(".")[0] ?? candidateRegistrableDomain;
    const candidateTld = candidateRegistrableDomain.split(".").at(-1);

    if (hostCandidate === comparableCandidateHostname) return [];
    if (domainCandidate === candidateRegistrableDomain) return [];

    const foldedCandidateBase = foldDomainForComparison(candidateBase);
    const minLength = Math.min(foldedCandidateBase.length, foldedInput.length);
    const maxDistance = minLength >= 5 ? 2 : 1;
    const distance = levenshteinDistance(foldedInput, foldedCandidateBase);
    const isTldSwap =
      foldedCandidateBase === foldedInput && candidateTld !== inputTld;

    if (!isTldSwap && (minLength < 4 || distance > maxDistance)) return [];

    return [
      {
        entry,
        distance,
        isTldSwap,
        lengthDelta: Math.abs(foldedCandidateBase.length - foldedInput.length),
      },
    ];
  });

  return scoredCandidates.sort((left, right) => {
    if (left.isTldSwap !== right.isTldSwap) {
      return left.isTldSwap ? -1 : 1;
    }

    if (left.distance !== right.distance) return left.distance - right.distance;
    return left.lengthDelta - right.lengthDelta;
  })[0]?.entry;
}

function getApproximateRegistrableDomain(hostname: string): string {
  if (isIpHostname(hostname)) return hostname;

  const labels = hostname.split(".").filter(Boolean);
  if (labels.length <= 2) return hostname;
  return labels.slice(-2).join(".");
}

function getSubdomainDepth(hostname: string, registrableDomain: string): number {
  if (hostname === registrableDomain) return 0;
  if (!hostname.endsWith(`.${registrableDomain}`)) return 0;
  const subdomain = hostname.slice(0, -registrableDomain.length - 1);
  return subdomain.split(".").filter(Boolean).length;
}

function isDomainLike(hostname: string): boolean {
  if (isIpHostname(hostname)) return true;
  if (!hostname.includes(".")) return false;
  if (hostname.includes("..")) return false;
  return hostname
    .split(".")
    .every((label) => /^[a-z0-9-]+$/.test(label) && !label.startsWith("-") && !label.endsWith("-"));
}

function isIpHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, "").replace(/\]$/, "");
  const ipv4 =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(
      normalized,
    );
  const ipv6 = normalized.includes(":") && /^[0-9a-f:.]+$/i.test(normalized);
  return ipv4 || ipv6;
}

function stripCommonPrefix(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function foldDomainForComparison(value: string): string {
  return value.replaceAll("-", "").replaceAll("0", "o").replaceAll("1", "l");
}

function levenshteinDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1];

    for (let j = 0; j < b.length; j += 1) {
      const insertion = current[j] + 1;
      const deletion = previous[j + 1] + 1;
      const substitution = previous[j] + (a[i] === b[j] ? 0 : 1);
      current.push(Math.min(insertion, deletion, substitution));
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}
