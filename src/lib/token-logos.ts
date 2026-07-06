import { getAddress, isAddress, type Address } from "viem";

import {
  ABSTRACT_CHAIN_ID,
  APECHAIN_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BSC_CHAIN_ID,
  CELO_CHAIN_ID,
  FRAXTAL_CHAIN_ID,
  GNOSIS_CHAIN_ID,
  KATANA_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  MONAD_CHAIN_ID,
  MOONBEAM_CHAIN_ID,
  OPBNB_CHAIN_ID,
  PLASMA_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  ROBINHOOD_CHAIN_ID,
  SEI_CHAIN_ID,
  SONIC_CHAIN_ID,
  TAIKO_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
  XDC_CHAIN_ID,
} from "@/lib/chains";

export const ETHEREUM_TOKEN_LOGO_CHAIN_ID = 1;
export const OPTIMISM_TOKEN_LOGO_CHAIN_ID = 10;
export const ARBITRUM_TOKEN_LOGO_CHAIN_ID = 42161;
export const HYPEREVM_TOKEN_LOGO_CHAIN_ID = 999;
export const TOKEN_LOGO_MAX_ADDRESSES = 30;
export const TOKEN_LOGO_REQUEST_TIMEOUT_MS = 8_000;

const DEXSCREENER_CHAIN_SLUG_BY_CHAIN_ID: Readonly<Record<number, string>> = {
  [ETHEREUM_TOKEN_LOGO_CHAIN_ID]: "ethereum",
  [OPTIMISM_TOKEN_LOGO_CHAIN_ID]: "optimism",
  [PULSECHAIN_CHAIN_ID]: "pulsechain",
  [BSC_CHAIN_ID]: "bsc",
  [BASE_CHAIN_ID]: "base",
  [POLYGON_CHAIN_ID]: "polygon",
  [SONIC_CHAIN_ID]: "sonic",
  [AVALANCHE_CHAIN_ID]: "avalanche",
  [MANTLE_CHAIN_ID]: "mantle",
  [LINEA_CHAIN_ID]: "linea",
  [BLAST_CHAIN_ID]: "blast",
  [BERACHAIN_CHAIN_ID]: "berachain",
  [CELO_CHAIN_ID]: "celo",
  [GNOSIS_CHAIN_ID]: "gnosischain",
  [UNICHAIN_CHAIN_ID]: "unichain",
  [WORLDCHAIN_CHAIN_ID]: "worldchain",
  [ROBINHOOD_CHAIN_ID]: "robinhood",
  [MONAD_CHAIN_ID]: "monad",
  [KATANA_CHAIN_ID]: "katana",
  [SEI_CHAIN_ID]: "sei",
  [PLASMA_CHAIN_ID]: "plasma",
  [ABSTRACT_CHAIN_ID]: "abstract",
  [FRAXTAL_CHAIN_ID]: "fraxtal",
  [TAIKO_CHAIN_ID]: "taiko",
  [OPBNB_CHAIN_ID]: "opbnb",
  [MOONBEAM_CHAIN_ID]: "moonbeam",
  [APECHAIN_CHAIN_ID]: "apechain",
  [XDC_CHAIN_ID]: "xdc",
  [ARBITRUM_TOKEN_LOGO_CHAIN_ID]: "arbitrum",
  [HYPEREVM_TOKEN_LOGO_CHAIN_ID]: "hyperevm",
};

const NINEMM_TOKEN_LIST_URL_BY_CHAIN_ID: Readonly<Record<number, string>> = {
  [ETHEREUM_TOKEN_LOGO_CHAIN_ID]:
    "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/eth-tokenlist.json",
  [PULSECHAIN_CHAIN_ID]:
    "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/9mm-tokenlist.json",
  [BASE_CHAIN_ID]:
    "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/base-tokenlist.json",
  [SONIC_CHAIN_ID]:
    "https://raw.githubusercontent.com/9mm-exchange/app-tokens/main/sonic-tokenlist.json",
};

export type TokenLogoSource = "dexscreener" | "9mm-tokenlist";

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

export function getNineMmTokenListUrlForTokenLogos(
  chainId: number,
): string | null {
  return NINEMM_TOKEN_LIST_URL_BY_CHAIN_ID[chainId] ?? null;
}

export function supportedTokenLogoChainSummary(): string {
  return [
    "Ethereum chainId=1",
    "Optimism chainId=10",
    "BSC chainId=56",
    "Polygon chainId=137",
    "Sonic chainId=146",
    "Avalanche chainId=43114",
    "Mantle chainId=5000",
    "Linea chainId=59144",
    "Blast chainId=81457",
    "Berachain chainId=80094",
    "Celo chainId=42220",
    "Gnosis chainId=100",
    "Unichain chainId=130",
    "World Chain chainId=480",
    "Robinhood Chain chainId=4663",
    "Monad chainId=143",
    "Katana chainId=747474",
    "Sei chainId=1329",
    "Plasma chainId=9745",
    "Abstract chainId=2741",
    "Fraxtal chainId=252",
    "Taiko Mainnet chainId=167000",
    "opBNB chainId=204",
    "Moonbeam chainId=1284",
    "ApeChain chainId=33139",
    "XDC Network chainId=50",
    "PulseChain chainId=369",
    "Base chainId=8453",
    "Arbitrum chainId=42161",
    "HyperEVM chainId=999",
  ].join(", ");
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

const ALLOWED_TOKEN_LOGO_IMAGE_HOSTS = new Set([
  "cdn.dexscreener.com",
  "dd.dexscreener.com",
]);

const NINEMM_TOKEN_LIST_LOGO_HOST = "raw.githubusercontent.com";
const NINEMM_TOKEN_LIST_LOGO_PATH_PREFIX = "/9mm-exchange/app-tokens/";

export function isAllowedTokenLogoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (ALLOWED_TOKEN_LOGO_IMAGE_HOSTS.has(url.hostname)) return true;
    return (
      url.hostname === NINEMM_TOKEN_LIST_LOGO_HOST &&
      url.pathname.startsWith(NINEMM_TOKEN_LIST_LOGO_PATH_PREFIX)
    );
  } catch {
    return false;
  }
}

function isAllowedDexScreenerSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "dexscreener.com";
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
      typeof item.url === "string" && isAllowedDexScreenerSourceUrl(item.url)
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

export function extractTokenLogosFromNineMmTokenList({
  chainId,
  requestedAddresses,
  payload,
  sourceUrl,
}: {
  chainId: number;
  requestedAddresses: readonly Address[];
  payload: unknown;
  sourceUrl: string;
}): TokenLogoMap {
  if (!isRecord(payload) || !Array.isArray(payload.tokens)) return {};

  const requestedByKey = new Map(
    requestedAddresses.map((address) => [tokenLogoAddressKey(address), address]),
  );
  const logos: TokenLogoMap = {};

  for (const item of payload.tokens) {
    if (!isRecord(item)) continue;
    if (item.chainId !== chainId) continue;
    if (typeof item.address !== "string") continue;

    const tokenAddress = requestedByKey.get(tokenLogoAddressKey(item.address));
    if (!tokenAddress || logos[tokenLogoAddressKey(tokenAddress)]) continue;

    const imageUrl = typeof item.logoURI === "string" ? item.logoURI : null;
    if (!imageUrl || !isAllowedTokenLogoUrl(imageUrl)) continue;

    logos[tokenLogoAddressKey(tokenAddress)] = {
      chainId,
      tokenAddress,
      imageUrl,
      source: "9mm-tokenlist",
      sourceUrl,
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
