import { getAddress, isAddress, type Address } from "viem";

import { PULSECHAIN_CHAIN_ID } from "@/lib/chains";

export const TOKEN_LOGO_MAX_ADDRESSES = 30;
export const TOKEN_LOGO_REQUEST_TIMEOUT_MS = 8_000;

const DEXSCREENER_CHAIN_SLUG_BY_CHAIN_ID: Readonly<Record<number, string>> = {
  [PULSECHAIN_CHAIN_ID]: "pulsechain",
};

export type TokenLogoSource = "dexscreener";

export type TokenLogoMetadata = {
  chainId: number;
  tokenAddress: Address;
  imageUrl: string;
  source: TokenLogoSource;
  sourceUrl?: string;
};

export type TokenLogoMap = Record<string, TokenLogoMetadata>;

export function isTokenLogoSupportedChain(chainId: number): boolean {
  return chainId in DEXSCREENER_CHAIN_SLUG_BY_CHAIN_ID;
}

export function getDexScreenerChainSlugForTokenLogos(
  chainId: number,
): string | null {
  return DEXSCREENER_CHAIN_SLUG_BY_CHAIN_ID[chainId] ?? null;
}

export function normalizeLogoAddress(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || !isAddress(trimmed, { strict: false })) return null;

  try {
    return getAddress(trimmed);
  } catch {
    return null;
  }
}

export function normalizeLogoAddresses(
  values: readonly (string | null | undefined)[],
  max = TOKEN_LOGO_MAX_ADDRESSES,
): Address[] {
  const unique = new Map<string, Address>();

  for (const value of values) {
    const normalized = normalizeLogoAddress(value);
    if (!normalized) continue;

    unique.set(normalized.toLowerCase(), normalized);
    if (unique.size >= max) break;
  }

  return [...unique.values()];
}

export function tokenLogoAddressKey(address: string): string {
  return address.toLowerCase();
}

export function isAllowedTokenLogoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function extractTokenLogosFromDexScreenerPairs({
  chainId,
  requestedAddresses,
  payload,
}: {
  chainId: number;
  requestedAddresses: readonly Address[];
  payload: unknown;
}): TokenLogoMap {
  if (!Array.isArray(payload)) return {};

  const requestedByKey = new Map(
    requestedAddresses.map((address) => [tokenLogoAddressKey(address), address]),
  );
  const logos: TokenLogoMap = {};

  for (const item of payload) {
    if (!isRecord(item)) continue;

    const tokenAddress = findRequestedTokenAddress(item, requestedByKey);
    if (!tokenAddress || logos[tokenLogoAddressKey(tokenAddress)]) continue;

    const info = isRecord(item.info) ? item.info : null;
    const imageUrl = typeof info?.imageUrl === "string" ? info.imageUrl : null;
    if (!imageUrl || !isAllowedTokenLogoUrl(imageUrl)) continue;

    const sourceUrl =
      typeof item.url === "string" && isAllowedTokenLogoUrl(item.url)
        ? item.url
        : undefined;

    logos[tokenLogoAddressKey(tokenAddress)] = {
      chainId,
      tokenAddress,
      imageUrl,
      source: "dexscreener",
      ...(sourceUrl ? { sourceUrl } : {}),
    };
  }

  return logos;
}

function findRequestedTokenAddress(
  pair: Record<string, unknown>,
  requestedByKey: ReadonlyMap<string, Address>,
): Address | null {
  const baseToken = isRecord(pair.baseToken) ? pair.baseToken : null;
  const quoteToken = isRecord(pair.quoteToken) ? pair.quoteToken : null;
  const candidates = [baseToken?.address, quoteToken?.address];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;

    const requested = requestedByKey.get(tokenLogoAddressKey(candidate));
    if (requested) return requested;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
