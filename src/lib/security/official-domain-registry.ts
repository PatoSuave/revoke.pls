export type OfficialDomainCategory =
  | "pulse-revoke"
  | "wallet"
  | "dex"
  | "bridge"
  | "explorer"
  | "docs"
  | "other";

export type OfficialDomainEntry = {
  domain: string;
  projectName: string;
  category: OfficialDomainCategory;
  sourceLabel: string;
  sourceUrl?: string;
  lastReviewedAt: string;
  allowSubdomains?: boolean;
};

export const OFFICIAL_DOMAIN_REGISTRY: readonly OfficialDomainEntry[] = [
  {
    domain: "pulserevoke.com",
    projectName: "Pulse Revoke",
    category: "pulse-revoke",
    sourceLabel: "Pulse Revoke production domain",
    sourceUrl: "https://pulserevoke.com/security",
    lastReviewedAt: "2026-05-30",
    allowSubdomains: false,
  },
] as const;

// Future PulseChain ecosystem domains must be added only after source review.
// Do not add third-party domains from memory, search snippets, social posts, or
// user-submitted URLs without a durable source packet.

export function findOfficialDomainMatch(
  hostname: string,
): OfficialDomainEntry | undefined {
  const normalizedHostname = normalizeRegistryHostname(hostname);

  return OFFICIAL_DOMAIN_REGISTRY.find((entry) => {
    const domain = normalizeRegistryHostname(entry.domain);
    if (normalizedHostname === domain) return true;
    return (
      entry.allowSubdomains === true &&
      normalizedHostname.endsWith(`.${domain}`)
    );
  });
}

export function findOfficialParentDomain(
  hostname: string,
): OfficialDomainEntry | undefined {
  const normalizedHostname = normalizeRegistryHostname(hostname);

  return OFFICIAL_DOMAIN_REGISTRY.find((entry) => {
    const domain = normalizeRegistryHostname(entry.domain);
    return normalizedHostname.endsWith(`.${domain}`);
  });
}

export function normalizeRegistryHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}
