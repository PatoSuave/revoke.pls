import { defineChain, type Chain, type Address } from "viem";

/**
 * Shared scanner chain registry.
 *
 * This is the single source of truth for the generic scan + revoke + batch
 * lane. Ethereum Mainnet, Arbitrum One, and Optimism are live product chains
 * with separate verified-row lanes, so they intentionally stay out of this
 * registry until their broader write paths are separately reviewed.
 */

export const PULSECHAIN_CHAIN_ID = 369;
export const BSC_CHAIN_ID = 56;
export const BASE_CHAIN_ID = 8453;
export const POLYGON_CHAIN_ID = 137;
export const SONIC_CHAIN_ID = 146;
export const AVALANCHE_CHAIN_ID = 43114;
export const MANTLE_CHAIN_ID = 5000;
export const LINEA_CHAIN_ID = 59144;
export const BLAST_CHAIN_ID = 81457;
export const BERACHAIN_CHAIN_ID = 80094;
export const CELO_CHAIN_ID = 42220;
export const GNOSIS_CHAIN_ID = 100;
export const UNICHAIN_CHAIN_ID = 130;
export const WORLDCHAIN_CHAIN_ID = 480;
export type SupportedChainId =
  | typeof PULSECHAIN_CHAIN_ID
  | typeof BSC_CHAIN_ID
  | typeof BASE_CHAIN_ID
  | typeof POLYGON_CHAIN_ID
  | typeof SONIC_CHAIN_ID
  | typeof AVALANCHE_CHAIN_ID
  | typeof MANTLE_CHAIN_ID
  | typeof LINEA_CHAIN_ID
  | typeof BLAST_CHAIN_ID
  | typeof BERACHAIN_CHAIN_ID
  | typeof CELO_CHAIN_ID
  | typeof GNOSIS_CHAIN_ID
  | typeof UNICHAIN_CHAIN_ID
  | typeof WORLDCHAIN_CHAIN_ID;

const PULSECHAIN_RPC_DEFAULT = "https://rpc.pulsechain.com";
const BSC_RPC_DEFAULT = "https://bsc-dataseed.bnbchain.org";
const BASE_RPC_DEFAULT = "https://mainnet.base.org";
const POLYGON_RPC_DEFAULT = "https://polygon.drpc.org";
const SONIC_RPC_DEFAULT = "https://rpc.soniclabs.com";
const AVALANCHE_RPC_DEFAULT = "https://api.avax.network/ext/bc/C/rpc";
const MANTLE_RPC_DEFAULT = "https://rpc.mantle.xyz";
const LINEA_RPC_DEFAULT = "https://rpc.linea.build";
const BLAST_RPC_DEFAULT = "https://rpc.blast.io";
const BERACHAIN_RPC_DEFAULT = "https://rpc.berachain.com";
const CELO_RPC_DEFAULT = "https://forno.celo.org";
const GNOSIS_RPC_DEFAULT = "https://rpc.gnosischain.com";
const UNICHAIN_RPC_DEFAULT = "https://mainnet.unichain.org";
const WORLDCHAIN_RPC_DEFAULT =
  "https://worldchain-mainnet.g.alchemy.com/public";

const PULSECHAIN_EXPLORER_BASE_URL = "https://scan.pulsechain.com";
const BSC_EXPLORER_BASE_URL = "https://bscscan.com";
const BASE_EXPLORER_BASE_URL = "https://basescan.org";
const POLYGON_EXPLORER_BASE_URL = "https://polygonscan.com";
const SONIC_EXPLORER_BASE_URL = "https://sonicscan.org";
const AVALANCHE_EXPLORER_BASE_URL = "https://snowscan.xyz";
const MANTLE_EXPLORER_BASE_URL = "https://explorer.mantle.xyz";
const LINEA_EXPLORER_BASE_URL = "https://lineascan.build";
const BLAST_EXPLORER_BASE_URL = "https://blastscan.io";
const BERACHAIN_EXPLORER_BASE_URL = "https://berascan.com";
const CELO_EXPLORER_BASE_URL = "https://celoscan.io";
const GNOSIS_EXPLORER_BASE_URL = "https://gnosisscan.io";
const UNICHAIN_EXPLORER_BASE_URL = "https://uniscan.xyz";
const WORLDCHAIN_EXPLORER_BASE_URL = "https://worldscan.org";

export const PULSECHAIN_EXPLORER_API_DEFAULT =
  "https://api.scan.pulsechain.com/api";
export const BSC_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const BASE_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const POLYGON_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const SONIC_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const AVALANCHE_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const MANTLE_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const LINEA_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const BLAST_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const BERACHAIN_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const CELO_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const GNOSIS_EXPLORER_API_DEFAULT = "https://api.etherscan.io/v2/api";
export const UNICHAIN_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const WORLDCHAIN_EXPLORER_API_DEFAULT =
  "https://api.etherscan.io/v2/api";
export const BSC_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.bscscan.com/api";
export const BASE_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.basescan.org/api";
export const POLYGON_DEPRECATED_V1_EXPLORER_API_URL =
  "https://api.polygonscan.com/api";
export const BSC_EXPLORER_CHAIN_ID_DEFAULT = BSC_CHAIN_ID.toString();
export const BASE_EXPLORER_CHAIN_ID_DEFAULT = BASE_CHAIN_ID.toString();
export const POLYGON_EXPLORER_CHAIN_ID_DEFAULT =
  POLYGON_CHAIN_ID.toString();
export const SONIC_EXPLORER_CHAIN_ID_DEFAULT = SONIC_CHAIN_ID.toString();
export const AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT =
  AVALANCHE_CHAIN_ID.toString();
export const MANTLE_EXPLORER_CHAIN_ID_DEFAULT = MANTLE_CHAIN_ID.toString();
export const LINEA_EXPLORER_CHAIN_ID_DEFAULT = LINEA_CHAIN_ID.toString();
export const BLAST_EXPLORER_CHAIN_ID_DEFAULT = BLAST_CHAIN_ID.toString();
export const BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT =
  BERACHAIN_CHAIN_ID.toString();
export const CELO_EXPLORER_CHAIN_ID_DEFAULT = CELO_CHAIN_ID.toString();
export const GNOSIS_EXPLORER_CHAIN_ID_DEFAULT = GNOSIS_CHAIN_ID.toString();
export const UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT =
  UNICHAIN_CHAIN_ID.toString();
export const WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT =
  WORLDCHAIN_CHAIN_ID.toString();
export const EIP_7825_MAX_TRANSACTION_GAS = 16_777_216n;
export const BSC_OSAKA_MAX_TRANSACTION_GAS = EIP_7825_MAX_TRANSACTION_GAS;
export const BSC_HIGH_GAS_WARNING_THRESHOLD = 1_000_000n;

export type SupportedChainKey =
  | "pulsechain"
  | "bsc"
  | "base"
  | "polygon"
  | "sonic"
  | "avalanche"
  | "mantle"
  | "linea"
  | "blast"
  | "berachain"
  | "celo"
  | "gnosis"
  | "unichain"
  | "worldchain";

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanApiKey(value: string | undefined): string | undefined {
  const cleaned = cleanEnv(value);
  if (!cleaned) return undefined;
  if (cleaned === "PASTE_YOUR_BSCSCAN_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_POLYGONSCAN_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_SONIC_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_AVALANCHE_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_MANTLE_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_LINEA_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_BLAST_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_BERACHAIN_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_CELO_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_GNOSIS_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_UNICHAIN_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_WORLDCHAIN_EXPLORER_KEY_HERE") return undefined;
  if (cleaned === "PASTE_YOUR_ETHERSCAN_V2_KEY_HERE") return undefined;
  if (cleaned === "your_bscscan_key") return undefined;
  if (cleaned === "your_polygonscan_key") return undefined;
  if (cleaned === "your_sonic_explorer_key") return undefined;
  if (cleaned === "your_avalanche_explorer_key") return undefined;
  if (cleaned === "your_mantle_explorer_key") return undefined;
  if (cleaned === "your_linea_explorer_key") return undefined;
  if (cleaned === "your_blast_explorer_key") return undefined;
  if (cleaned === "your_berachain_explorer_key") return undefined;
  if (cleaned === "your_celo_explorer_key") return undefined;
  if (cleaned === "your_gnosis_explorer_key") return undefined;
  if (cleaned === "your_unichain_explorer_key") return undefined;
  if (cleaned === "your_worldchain_explorer_key") return undefined;
  if (cleaned === "YOUR_ETHERSCAN_V2_KEY") return undefined;
  return cleaned;
}

function withNoTrailingSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function isDeprecatedBscV1ApiUrl(value: string | undefined): boolean {
  return (
    withNoTrailingSlash(value ?? "").toLowerCase() ===
    BSC_DEPRECATED_V1_EXPLORER_API_URL
  );
}

function isDeprecatedBaseV1ApiUrl(value: string | undefined): boolean {
  return (
    withNoTrailingSlash(value ?? "").toLowerCase() ===
    BASE_DEPRECATED_V1_EXPLORER_API_URL
  );
}

function isDeprecatedPolygonV1ApiUrl(value: string | undefined): boolean {
  return (
    withNoTrailingSlash(value ?? "").toLowerCase() ===
    POLYGON_DEPRECATED_V1_EXPLORER_API_URL
  );
}

const pulsechainRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_PULSECHAIN_RPC_URL);
const bscRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_BSC_RPC_URL);
const baseRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_BASE_RPC_URL);
const polygonRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_POLYGON_RPC_URL);
const sonicRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_SONIC_RPC_URL);
const avalancheRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL);
const mantleRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_MANTLE_RPC_URL);
const lineaRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_LINEA_RPC_URL);
const blastRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_BLAST_RPC_URL);
const berachainRpcEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BERACHAIN_RPC_URL,
);
const celoRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_CELO_RPC_URL);
const gnosisRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_GNOSIS_RPC_URL);
const unichainRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_UNICHAIN_RPC_URL);
const worldchainRpcEnv = cleanEnv(process.env.NEXT_PUBLIC_WORLDCHAIN_RPC_URL);
const pulsechainExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_PULSECHAIN_EXPLORER_API,
);
const bscExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_API_URL,
);
const baseExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BASE_EXPLORER_API_URL,
);
const polygonExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_POLYGON_EXPLORER_API_URL,
);
const sonicExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_SONIC_EXPLORER_API_URL,
);
const avalancheExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_API_URL,
);
const mantleExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_API_URL,
);
const lineaExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_LINEA_EXPLORER_API_URL,
);
const blastExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BLAST_EXPLORER_API_URL,
);
const berachainExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BERACHAIN_EXPLORER_API_URL,
);
const celoExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_CELO_EXPLORER_API_URL,
);
const gnosisExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_GNOSIS_EXPLORER_API_URL,
);
const unichainExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_UNICHAIN_EXPLORER_API_URL,
);
const worldchainExplorerApiEnv = cleanEnv(
  process.env.NEXT_PUBLIC_WORLDCHAIN_EXPLORER_API_URL,
);
const bscExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID,
);
const baseExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID,
);
const polygonExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID,
);
const sonicExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID,
);
const avalancheExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID,
);
const mantleExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID,
);
const lineaExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID,
);
const blastExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID,
);
const berachainExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID,
);
const celoExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID,
);
const gnosisExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID,
);
const unichainExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID,
);
const worldchainExplorerChainIdEnv = cleanEnv(
  process.env.NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID,
);
const bscPreferredApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_BSC_EXPLORER_API_KEY,
);
const bscScanApiKeyEnv = cleanApiKey(process.env.NEXT_PUBLIC_BSCSCAN_API_KEY);
const baseExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_BASE_EXPLORER_API_KEY,
);
const polygonExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY,
);
const sonicExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_SONIC_EXPLORER_API_KEY,
);
const avalancheExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY,
);
const mantleExplorerApiKeyEnv = cleanApiKey(
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY,
);
const bscDeprecatedV1ApiConfigured = isDeprecatedBscV1ApiUrl(bscExplorerApiEnv);
const baseDeprecatedV1ApiConfigured =
  isDeprecatedBaseV1ApiUrl(baseExplorerApiEnv);
const polygonDeprecatedV1ApiConfigured =
  isDeprecatedPolygonV1ApiUrl(polygonExplorerApiEnv);
const bscExplorerChainId =
  bscExplorerChainIdEnv === BSC_EXPLORER_CHAIN_ID_DEFAULT
    ? bscExplorerChainIdEnv
    : BSC_EXPLORER_CHAIN_ID_DEFAULT;
const baseExplorerChainId =
  baseExplorerChainIdEnv === BASE_EXPLORER_CHAIN_ID_DEFAULT
    ? baseExplorerChainIdEnv
    : BASE_EXPLORER_CHAIN_ID_DEFAULT;
const polygonExplorerChainId =
  polygonExplorerChainIdEnv === POLYGON_EXPLORER_CHAIN_ID_DEFAULT
    ? polygonExplorerChainIdEnv
    : POLYGON_EXPLORER_CHAIN_ID_DEFAULT;
const sonicExplorerChainId =
  sonicExplorerChainIdEnv === SONIC_EXPLORER_CHAIN_ID_DEFAULT
    ? sonicExplorerChainIdEnv
    : SONIC_EXPLORER_CHAIN_ID_DEFAULT;
const avalancheExplorerChainId =
  avalancheExplorerChainIdEnv === AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT
    ? avalancheExplorerChainIdEnv
    : AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT;
const mantleExplorerChainId =
  mantleExplorerChainIdEnv === MANTLE_EXPLORER_CHAIN_ID_DEFAULT
    ? mantleExplorerChainIdEnv
    : MANTLE_EXPLORER_CHAIN_ID_DEFAULT;
const lineaExplorerChainId =
  lineaExplorerChainIdEnv === LINEA_EXPLORER_CHAIN_ID_DEFAULT
    ? lineaExplorerChainIdEnv
    : LINEA_EXPLORER_CHAIN_ID_DEFAULT;
const blastExplorerChainId =
  blastExplorerChainIdEnv === BLAST_EXPLORER_CHAIN_ID_DEFAULT
    ? blastExplorerChainIdEnv
    : BLAST_EXPLORER_CHAIN_ID_DEFAULT;
const berachainExplorerChainId =
  berachainExplorerChainIdEnv === BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT
    ? berachainExplorerChainIdEnv
    : BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT;
const celoExplorerChainId =
  celoExplorerChainIdEnv === CELO_EXPLORER_CHAIN_ID_DEFAULT
    ? celoExplorerChainIdEnv
    : CELO_EXPLORER_CHAIN_ID_DEFAULT;
const gnosisExplorerChainId =
  gnosisExplorerChainIdEnv === GNOSIS_EXPLORER_CHAIN_ID_DEFAULT
    ? gnosisExplorerChainIdEnv
    : GNOSIS_EXPLORER_CHAIN_ID_DEFAULT;
const unichainExplorerChainId =
  unichainExplorerChainIdEnv === UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT
    ? unichainExplorerChainIdEnv
    : UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT;
const worldchainExplorerChainId =
  worldchainExplorerChainIdEnv === WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT
    ? worldchainExplorerChainIdEnv
    : WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT;
const bscExplorerApiKeyEnv = bscPreferredApiKeyEnv ?? bscScanApiKeyEnv;
const bscDiscoveryWarnings = [
  bscDeprecatedV1ApiConfigured
    ? `NEXT_PUBLIC_BSC_EXPLORER_API_URL is set to the deprecated BscScan V1 endpoint (${BSC_DEPRECATED_V1_EXPLORER_API_URL}). BSC historical discovery uses ${BSC_EXPLORER_API_DEFAULT} with chainid=${BSC_EXPLORER_CHAIN_ID_DEFAULT}; update the Vercel env var to avoid confusion.`
    : null,
  bscExplorerChainIdEnv &&
  bscExplorerChainIdEnv !== BSC_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID must be ${BSC_EXPLORER_CHAIN_ID_DEFAULT} for BNB Smart Chain. The app is using chainid=${BSC_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
  !bscPreferredApiKeyEnv && bscScanApiKeyEnv
    ? "Using deprecated desktop/static fallback NEXT_PUBLIC_BSCSCAN_API_KEY. Prefer NEXT_PUBLIC_BSC_EXPLORER_API_KEY only for builds without API routes."
    : null,
].filter((warning): warning is string => Boolean(warning));
const baseDiscoveryWarnings = [
  baseDeprecatedV1ApiConfigured
    ? `NEXT_PUBLIC_BASE_EXPLORER_API_URL is set to the deprecated BaseScan V1 endpoint (${BASE_DEPRECATED_V1_EXPLORER_API_URL}). Base historical discovery uses ${BASE_EXPLORER_API_DEFAULT} with chainid=${BASE_EXPLORER_CHAIN_ID_DEFAULT}; update the Vercel env var to avoid confusion.`
    : null,
  baseExplorerChainIdEnv &&
  baseExplorerChainIdEnv !== BASE_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID must be ${BASE_EXPLORER_CHAIN_ID_DEFAULT} for Base Mainnet. The app is using chainid=${BASE_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const polygonDiscoveryWarnings = [
  polygonDeprecatedV1ApiConfigured
    ? `NEXT_PUBLIC_POLYGON_EXPLORER_API_URL is set to the deprecated PolygonScan V1 endpoint (${POLYGON_DEPRECATED_V1_EXPLORER_API_URL}). Polygon historical discovery uses ${POLYGON_EXPLORER_API_DEFAULT} with chainid=${POLYGON_EXPLORER_CHAIN_ID_DEFAULT}; update the Vercel env var to avoid confusion.`
    : null,
  polygonExplorerChainIdEnv &&
  polygonExplorerChainIdEnv !== POLYGON_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID must be ${POLYGON_EXPLORER_CHAIN_ID_DEFAULT} for Polygon Mainnet. The app is using chainid=${POLYGON_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const sonicDiscoveryWarnings = [
  sonicExplorerChainIdEnv &&
  sonicExplorerChainIdEnv !== SONIC_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID must be ${SONIC_EXPLORER_CHAIN_ID_DEFAULT} for Sonic Mainnet. The app is using chainid=${SONIC_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const avalancheDiscoveryWarnings = [
  avalancheExplorerChainIdEnv &&
  avalancheExplorerChainIdEnv !== AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID must be ${AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT} for Avalanche C-Chain. The app is using chainid=${AVALANCHE_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const mantleDiscoveryWarnings = [
  mantleExplorerChainIdEnv &&
  mantleExplorerChainIdEnv !== MANTLE_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID must be ${MANTLE_EXPLORER_CHAIN_ID_DEFAULT} for Mantle Mainnet. The app is using chainid=${MANTLE_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const lineaDiscoveryWarnings = [
  lineaExplorerChainIdEnv &&
  lineaExplorerChainIdEnv !== LINEA_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID must be ${LINEA_EXPLORER_CHAIN_ID_DEFAULT} for Linea Mainnet. The app is using chainid=${LINEA_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const blastDiscoveryWarnings = [
  blastExplorerChainIdEnv &&
  blastExplorerChainIdEnv !== BLAST_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID must be ${BLAST_EXPLORER_CHAIN_ID_DEFAULT} for Blast Mainnet. The app is using chainid=${BLAST_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const berachainDiscoveryWarnings = [
  berachainExplorerChainIdEnv &&
  berachainExplorerChainIdEnv !== BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID must be ${BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT} for Berachain Mainnet. The app is using chainid=${BERACHAIN_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const celoDiscoveryWarnings = [
  celoExplorerChainIdEnv &&
  celoExplorerChainIdEnv !== CELO_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID must be ${CELO_EXPLORER_CHAIN_ID_DEFAULT} for Celo Mainnet. The app is using chainid=${CELO_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const gnosisDiscoveryWarnings = [
  gnosisExplorerChainIdEnv &&
  gnosisExplorerChainIdEnv !== GNOSIS_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID must be ${GNOSIS_EXPLORER_CHAIN_ID_DEFAULT} for Gnosis. The app is using chainid=${GNOSIS_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const unichainDiscoveryWarnings = [
  unichainExplorerChainIdEnv &&
  unichainExplorerChainIdEnv !== UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID must be ${UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT} for Unichain Mainnet. The app is using chainid=${UNICHAIN_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));
const worldchainDiscoveryWarnings = [
  worldchainExplorerChainIdEnv &&
  worldchainExplorerChainIdEnv !== WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT
    ? `NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID must be ${WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT} for World Chain. The app is using chainid=${WORLDCHAIN_EXPLORER_CHAIN_ID_DEFAULT}.`
    : null,
].filter((warning): warning is string => Boolean(warning));

export const pulsechain = defineChain({
  id: PULSECHAIN_CHAIN_ID,
  name: "PulseChain",
  nativeCurrency: {
    name: "Pulse",
    symbol: "PLS",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [pulsechainRpcEnv ?? PULSECHAIN_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "PulseScan",
      url: PULSECHAIN_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const bsc = defineChain({
  id: BSC_CHAIN_ID,
  name: "BNB Smart Chain",
  nativeCurrency: {
    name: "BNB",
    symbol: "BNB",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [bscRpcEnv ?? BSC_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: BSC_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const base = defineChain({
  id: BASE_CHAIN_ID,
  name: "Base",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [baseRpcEnv ?? BASE_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "BaseScan",
      url: BASE_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const polygon = defineChain({
  id: POLYGON_CHAIN_ID,
  name: "Polygon",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [polygonRpcEnv ?? POLYGON_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "PolygonScan",
      url: POLYGON_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const sonic = defineChain({
  id: SONIC_CHAIN_ID,
  name: "Sonic Mainnet",
  nativeCurrency: {
    name: "Sonic",
    symbol: "S",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [sonicRpcEnv ?? SONIC_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "SonicScan",
      url: SONIC_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const avalanche = defineChain({
  id: AVALANCHE_CHAIN_ID,
  name: "Avalanche C-Chain",
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [avalancheRpcEnv ?? AVALANCHE_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "SnowScan",
      url: AVALANCHE_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const mantle = defineChain({
  id: MANTLE_CHAIN_ID,
  name: "Mantle",
  nativeCurrency: {
    name: "Mantle",
    symbol: "MNT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [mantleRpcEnv ?? MANTLE_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Mantle Explorer",
      url: MANTLE_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const linea = defineChain({
  id: LINEA_CHAIN_ID,
  name: "Linea",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [lineaRpcEnv ?? LINEA_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "LineaScan",
      url: LINEA_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const blast = defineChain({
  id: BLAST_CHAIN_ID,
  name: "Blast",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [blastRpcEnv ?? BLAST_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Blastscan",
      url: BLAST_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const berachain = defineChain({
  id: BERACHAIN_CHAIN_ID,
  name: "Berachain",
  nativeCurrency: {
    name: "BERA",
    symbol: "BERA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [berachainRpcEnv ?? BERACHAIN_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Berascan",
      url: BERACHAIN_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const celo = defineChain({
  id: CELO_CHAIN_ID,
  name: "Celo",
  nativeCurrency: {
    name: "CELO",
    symbol: "CELO",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [celoRpcEnv ?? CELO_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "CeloScan",
      url: CELO_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const gnosis = defineChain({
  id: GNOSIS_CHAIN_ID,
  name: "Gnosis",
  nativeCurrency: {
    name: "xDAI",
    symbol: "XDAI",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [gnosisRpcEnv ?? GNOSIS_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Gnosisscan",
      url: GNOSIS_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const unichain = defineChain({
  id: UNICHAIN_CHAIN_ID,
  name: "Unichain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [unichainRpcEnv ?? UNICHAIN_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Uniscan",
      url: UNICHAIN_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export const worldchain = defineChain({
  id: WORLDCHAIN_CHAIN_ID,
  name: "World Chain",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [worldchainRpcEnv ?? WORLDCHAIN_RPC_DEFAULT],
    },
  },
  blockExplorers: {
    default: {
      name: "Worldscan",
      url: WORLDCHAIN_EXPLORER_BASE_URL,
    },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
    },
  },
  testnet: false,
});

export interface DiscoverySourceConfig {
  /** Short machine-friendly identifier surfaced in dev/debug views. */
  id: string;
  /** Human-readable source name shown in coverage copy. */
  name: string;
  /** Provider behavior used by the request builder for API-specific params. */
  apiProviderKind?: "blockscout-compatible" | "etherscan-v2";
  /** API provider shown in diagnostics when it differs from explorer links. */
  apiProviderName?: string;
  /** Base URL the user can visit to learn more about the source. */
  url: string;
  /** Etherscan-compatible logs endpoint base URL. */
  apiUrl: string;
  /** Name of the public env var that can override `apiUrl`. */
  apiUrlEnvVar: string;
  /** Fixed Etherscan V2 chain ID query value for this discovery source. */
  apiChainId?: string;
  /** Env var name that can configure the explorer API chain ID. */
  apiChainIdEnvVar?: string;
  /** Public API key appended as `apikey` when configured. */
  apiKey?: string;
  /** Name of the public env var that contains the explorer API key. */
  apiKeyEnvVar?: string;
  /** Accepted API-key env vars in preference order. */
  apiKeyEnvVars?: readonly string[];
  /** Whether useful historical discovery requires an API key. */
  requiresApiKey?: boolean;
  /** Privacy-safe presence flag for diagnostics. Never print the key itself. */
  hasApiKey: boolean;
  /** Privacy-safe presence flag for diagnostics. */
  hasApiUrl: boolean;
  /** Whether the API URL came from the default baked-in value. */
  usesDefaultApiUrl: boolean;
  /**
   * Optional fixed query parameters appended to every discovery request.
   * Kept for explorer-specific compatibility when needed.
   */
  queryParams?: Record<string, string>;
  /** Public note used in docs/debug copy for cap/rate-limit expectations. */
  limitations: string;
  /** Source-specific API-key error. */
  missingApiKeyMessage?: string;
  /** Privacy-safe configuration warnings surfaced in diagnostics. */
  warnings?: readonly string[];
}

export interface ExplorerUrlBuilders {
  address: (address: Address | string) => string;
  token: (address: Address | string) => string;
  transaction: (hash: string) => string;
}

export interface ExplorerConfig {
  name: string;
  baseUrl: string;
  apiUrl: string;
  apiUrlEnvVar: string;
  apiKeyEnvVar?: string;
  urls: ExplorerUrlBuilders;
}

export interface RpcConfig {
  envVar: string;
  defaultUrl: string;
  url: string;
  usesDefault: boolean;
  hasEnvOverride: boolean;
}

export interface ChainStandardLabels {
  /** User-facing fungible token standard for this chain. */
  fungible: string;
  /** User-facing NFT single-token collection standard for this chain. */
  nft: string;
  /** User-facing multi-token NFT / semi-fungible standard for this chain. */
  multiToken: string;
  /** User-facing generic label for shared NFT operator approvals. */
  nftOperator: string;
}

export interface DiscoverySettings {
  sourceKind: "explorer-logs";
  providerName: string;
  approvalEventTopicMode: "topic0-topic1-owner";
  defaultFromBlock: string;
  defaultToBlock: string;
  pageSize: number;
  historicalRpcLogs: "disabled";
  capWarning: string;
}

export interface SupportedChainConfig {
  key: SupportedChainKey;
  chain: Chain;
  chainId: SupportedChainId;
  displayName: string;
  shortName: string;
  nativeSymbol: string;
  rpc: RpcConfig;
  explorer: ExplorerConfig;
  discovery: DiscoverySourceConfig;
  discoverySettings: DiscoverySettings;
  standardLabels: ChainStandardLabels;
  maxTransactionGas?: bigint;
  highGasWarningThreshold?: bigint;
}

function explorerUrls(baseUrl: string): ExplorerUrlBuilders {
  const base = withNoTrailingSlash(baseUrl);
  return {
    address: (address) => `${base}/address/${address}`,
    token: (address) => `${base}/token/${address}`,
    transaction: (hash) => `${base}/tx/${hash}`,
  };
}

function buildRpcConfig(
  envVar: string,
  defaultUrl: string,
  env: string | undefined,
): RpcConfig {
  return {
    envVar,
    defaultUrl,
    url: env ?? defaultUrl,
    usesDefault: !env,
    hasEnvOverride: Boolean(env),
  };
}

function buildDiscoveryConfig(args: {
  id: string;
  name: string;
  apiProviderKind?: DiscoverySourceConfig["apiProviderKind"];
  apiProviderName?: string;
  url: string;
  apiUrlEnvVar: string;
  apiUrlDefault: string;
  apiChainId?: string;
  apiChainIdEnvVar?: string;
  apiKeyEnvVar?: string;
  apiKeyEnvVars?: readonly string[];
  requiresApiKey?: boolean;
  queryParams?: Record<string, string>;
  limitations: string;
  missingApiKeyMessage?: string;
  warnings?: readonly string[];
  apiUrlEnv?: string;
  apiKeyEnv?: string;
}): DiscoverySourceConfig {
  const apiUrl = args.apiUrlEnv ?? args.apiUrlDefault;
  const apiKey = args.apiKeyEnv;

  return {
    id: args.id,
    name: args.name,
    apiProviderKind: args.apiProviderKind,
    apiProviderName: args.apiProviderName,
    url: args.url,
    apiUrl,
    apiUrlEnvVar: args.apiUrlEnvVar,
    apiChainId: args.apiChainId,
    apiChainIdEnvVar: args.apiChainIdEnvVar,
    apiKey,
    apiKeyEnvVar: args.apiKeyEnvVar,
    apiKeyEnvVars: args.apiKeyEnvVars,
    requiresApiKey: args.requiresApiKey,
    hasApiKey: Boolean(apiKey),
    hasApiUrl: Boolean(apiUrl),
    usesDefaultApiUrl: !args.apiUrlEnv,
    queryParams: args.queryParams,
    limitations: args.limitations,
    missingApiKeyMessage: args.missingApiKeyMessage,
    warnings: args.warnings,
  };
}

const pulsechainRpc = buildRpcConfig(
  "NEXT_PUBLIC_PULSECHAIN_RPC_URL",
  PULSECHAIN_RPC_DEFAULT,
  pulsechainRpcEnv,
);
const bscRpc = buildRpcConfig(
  "NEXT_PUBLIC_BSC_RPC_URL",
  BSC_RPC_DEFAULT,
  bscRpcEnv,
);
const baseRpc = buildRpcConfig(
  "NEXT_PUBLIC_BASE_RPC_URL",
  BASE_RPC_DEFAULT,
  baseRpcEnv,
);
const polygonRpc = buildRpcConfig(
  "NEXT_PUBLIC_POLYGON_RPC_URL",
  POLYGON_RPC_DEFAULT,
  polygonRpcEnv,
);
const sonicRpc = buildRpcConfig(
  "NEXT_PUBLIC_SONIC_RPC_URL",
  SONIC_RPC_DEFAULT,
  sonicRpcEnv,
);
const avalancheRpc = buildRpcConfig(
  "NEXT_PUBLIC_AVALANCHE_RPC_URL",
  AVALANCHE_RPC_DEFAULT,
  avalancheRpcEnv,
);
const mantleRpc = buildRpcConfig(
  "NEXT_PUBLIC_MANTLE_RPC_URL",
  MANTLE_RPC_DEFAULT,
  mantleRpcEnv,
);
const lineaRpc = buildRpcConfig(
  "NEXT_PUBLIC_LINEA_RPC_URL",
  LINEA_RPC_DEFAULT,
  lineaRpcEnv,
);
const blastRpc = buildRpcConfig(
  "NEXT_PUBLIC_BLAST_RPC_URL",
  BLAST_RPC_DEFAULT,
  blastRpcEnv,
);
const berachainRpc = buildRpcConfig(
  "NEXT_PUBLIC_BERACHAIN_RPC_URL",
  BERACHAIN_RPC_DEFAULT,
  berachainRpcEnv,
);
const celoRpc = buildRpcConfig(
  "NEXT_PUBLIC_CELO_RPC_URL",
  CELO_RPC_DEFAULT,
  celoRpcEnv,
);
const gnosisRpc = buildRpcConfig(
  "NEXT_PUBLIC_GNOSIS_RPC_URL",
  GNOSIS_RPC_DEFAULT,
  gnosisRpcEnv,
);
const unichainRpc = buildRpcConfig(
  "NEXT_PUBLIC_UNICHAIN_RPC_URL",
  UNICHAIN_RPC_DEFAULT,
  unichainRpcEnv,
);
const worldchainRpc = buildRpcConfig(
  "NEXT_PUBLIC_WORLDCHAIN_RPC_URL",
  WORLDCHAIN_RPC_DEFAULT,
  worldchainRpcEnv,
);

const pulsechainDiscovery = buildDiscoveryConfig({
  id: "blockscout-pulsescan",
  name: "PulseScan (Blockscout)",
  apiProviderKind: "blockscout-compatible",
  url: PULSECHAIN_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_PULSECHAIN_EXPLORER_API",
  apiUrlDefault: PULSECHAIN_EXPLORER_API_DEFAULT,
  apiUrlEnv: pulsechainExplorerApiEnv,
  limitations:
    "PulseScan log discovery is windowed and may report truncation when explorer caps are reached.",
});

const bscDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-bsc",
  name: "Etherscan API V2 (BSC logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: BSC_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_BSC_EXPLORER_API_URL",
  apiUrlDefault: BSC_EXPLORER_API_DEFAULT,
  apiChainId: bscExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_BSC_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
  apiKeyEnvVars: [
    "NEXT_PUBLIC_BSC_EXPLORER_API_KEY",
    "NEXT_PUBLIC_BSCSCAN_API_KEY",
  ],
  apiUrlEnv: bscDeprecatedV1ApiConfigured ? undefined : bscExplorerApiEnv,
  apiKeyEnv: bscExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: bscExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for BNB Smart Chain logs.",
  missingApiKeyMessage:
    "BSC historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_BSC_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use BSC_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: bscDiscoveryWarnings,
});

const baseDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-base",
  name: "Etherscan API V2 (Base logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: BASE_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_BASE_EXPLORER_API_URL",
  apiUrlDefault: BASE_EXPLORER_API_DEFAULT,
  apiChainId: baseExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_BASE_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_BASE_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_BASE_EXPLORER_API_KEY"],
  apiUrlEnv: baseDeprecatedV1ApiConfigured ? undefined : baseExplorerApiEnv,
  apiKeyEnv: baseExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: baseExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Base logs.",
  missingApiKeyMessage:
    "Base historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_BASE_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use BASE_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: baseDiscoveryWarnings,
});

const polygonDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-polygon",
  name: "Etherscan API V2 (Polygon logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: POLYGON_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_POLYGON_EXPLORER_API_URL",
  apiUrlDefault: POLYGON_EXPLORER_API_DEFAULT,
  apiChainId: polygonExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_POLYGON_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY"],
  apiUrlEnv: polygonDeprecatedV1ApiConfigured
    ? undefined
    : polygonExplorerApiEnv,
  apiKeyEnv: polygonExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: polygonExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Polygon logs.",
  missingApiKeyMessage:
    "Polygon historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_POLYGON_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use POLYGON_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: polygonDiscoveryWarnings,
});

const sonicDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-sonic",
  name: "Etherscan API V2 (Sonic logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: SONIC_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_SONIC_EXPLORER_API_URL",
  apiUrlDefault: SONIC_EXPLORER_API_DEFAULT,
  apiChainId: sonicExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_SONIC_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_SONIC_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_SONIC_EXPLORER_API_KEY"],
  apiUrlEnv: sonicExplorerApiEnv,
  apiKeyEnv: sonicExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: sonicExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Sonic logs.",
  missingApiKeyMessage:
    "Sonic historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_SONIC_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use SONIC_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: sonicDiscoveryWarnings,
});

const avalancheDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-avalanche",
  name: "Etherscan API V2 (Avalanche logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: AVALANCHE_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_URL",
  apiUrlDefault: AVALANCHE_EXPLORER_API_DEFAULT,
  apiChainId: avalancheExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_AVALANCHE_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY"],
  apiUrlEnv: avalancheExplorerApiEnv,
  apiKeyEnv: avalancheExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: avalancheExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Avalanche C-Chain logs.",
  missingApiKeyMessage:
    "Avalanche historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_AVALANCHE_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use AVALANCHE_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: avalancheDiscoveryWarnings,
});

const mantleDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-mantle",
  name: "Etherscan API V2 (Mantle logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: MANTLE_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_MANTLE_EXPLORER_API_URL",
  apiUrlDefault: MANTLE_EXPLORER_API_DEFAULT,
  apiChainId: mantleExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_MANTLE_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY",
  apiKeyEnvVars: ["NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY"],
  apiUrlEnv: mantleExplorerApiEnv,
  apiKeyEnv: mantleExplorerApiKeyEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: mantleExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Mantle logs.",
  missingApiKeyMessage:
    "Mantle historical discovery uses Etherscan API V2. Set NEXT_PUBLIC_MANTLE_EXPLORER_API_KEY only for desktop/static builds without API routes. Hosted web deployments should use MANTLE_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side.",
  warnings: mantleDiscoveryWarnings,
});

const lineaDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-linea",
  name: "Etherscan API V2 (Linea logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: LINEA_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_LINEA_EXPLORER_API_URL",
  apiUrlDefault: LINEA_EXPLORER_API_DEFAULT,
  apiChainId: lineaExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_LINEA_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "LINEA_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["LINEA_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: lineaExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: lineaExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Linea logs.",
  missingApiKeyMessage:
    "Linea historical discovery uses Etherscan API V2. Hosted web deployments should use LINEA_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: lineaDiscoveryWarnings,
});

const blastDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-blast",
  name: "Etherscan API V2 (Blast logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: BLAST_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_BLAST_EXPLORER_API_URL",
  apiUrlDefault: BLAST_EXPLORER_API_DEFAULT,
  apiChainId: blastExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_BLAST_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "BLAST_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["BLAST_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: blastExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: blastExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Blast logs.",
  missingApiKeyMessage:
    "Blast historical discovery uses Etherscan API V2. Hosted web deployments should use BLAST_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: blastDiscoveryWarnings,
});

const berachainDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-berachain",
  name: "Etherscan API V2 (Berachain logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: BERACHAIN_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_BERACHAIN_EXPLORER_API_URL",
  apiUrlDefault: BERACHAIN_EXPLORER_API_DEFAULT,
  apiChainId: berachainExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_BERACHAIN_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "BERACHAIN_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["BERACHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: berachainExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: berachainExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Berachain logs.",
  missingApiKeyMessage:
    "Berachain historical discovery uses Etherscan API V2. Hosted web deployments should use BERACHAIN_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: berachainDiscoveryWarnings,
});

const celoDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-celo",
  name: "Etherscan API V2 (Celo logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: CELO_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_CELO_EXPLORER_API_URL",
  apiUrlDefault: CELO_EXPLORER_API_DEFAULT,
  apiChainId: celoExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_CELO_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "CELO_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["CELO_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: celoExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: celoExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Celo logs.",
  missingApiKeyMessage:
    "Celo historical discovery uses Etherscan API V2. Hosted web deployments should use CELO_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: celoDiscoveryWarnings,
});

const gnosisDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-gnosis",
  name: "Etherscan API V2 (Gnosis logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: GNOSIS_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_GNOSIS_EXPLORER_API_URL",
  apiUrlDefault: GNOSIS_EXPLORER_API_DEFAULT,
  apiChainId: gnosisExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_GNOSIS_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "GNOSIS_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["GNOSIS_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: gnosisExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: gnosisExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Gnosis logs.",
  missingApiKeyMessage:
    "Gnosis historical discovery uses Etherscan API V2. Hosted web deployments should use GNOSIS_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: gnosisDiscoveryWarnings,
});

const unichainDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-unichain",
  name: "Etherscan API V2 (Unichain logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: UNICHAIN_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_UNICHAIN_EXPLORER_API_URL",
  apiUrlDefault: UNICHAIN_EXPLORER_API_DEFAULT,
  apiChainId: unichainExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_UNICHAIN_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "UNICHAIN_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["UNICHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: unichainExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: unichainExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for Unichain logs.",
  missingApiKeyMessage:
    "Unichain historical discovery uses Etherscan API V2. Hosted web deployments should use UNICHAIN_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: unichainDiscoveryWarnings,
});

const worldchainDiscovery = buildDiscoveryConfig({
  id: "etherscan-v2-worldchain",
  name: "Etherscan API V2 (World Chain logs)",
  apiProviderKind: "etherscan-v2",
  apiProviderName: "Etherscan API V2",
  url: WORLDCHAIN_EXPLORER_BASE_URL,
  apiUrlEnvVar: "NEXT_PUBLIC_WORLDCHAIN_EXPLORER_API_URL",
  apiUrlDefault: WORLDCHAIN_EXPLORER_API_DEFAULT,
  apiChainId: worldchainExplorerChainId,
  apiChainIdEnvVar: "NEXT_PUBLIC_WORLDCHAIN_EXPLORER_CHAIN_ID",
  apiKeyEnvVar: "WORLDCHAIN_EXPLORER_API_KEY / ETHERSCAN_API_KEY",
  apiKeyEnvVars: ["WORLDCHAIN_EXPLORER_API_KEY", "ETHERSCAN_API_KEY"],
  apiUrlEnv: worldchainExplorerApiEnv,
  requiresApiKey: true,
  queryParams: {
    chainid: worldchainExplorerChainId,
  },
  limitations:
    "Etherscan API V2 can rate-limit, cap responses, or require smaller block windows for World Chain logs.",
  missingApiKeyMessage:
    "World Chain historical discovery uses Etherscan API V2. Hosted web deployments should use WORLDCHAIN_EXPLORER_API_KEY or ETHERSCAN_API_KEY server-side; do not expose explorer keys through NEXT_PUBLIC variables.",
  warnings: worldchainDiscoveryWarnings,
});

export const supportedChainConfigs = {
  [PULSECHAIN_CHAIN_ID]: {
    key: "pulsechain",
    chain: pulsechain,
    chainId: PULSECHAIN_CHAIN_ID,
    displayName: "PulseChain",
    shortName: "PulseChain",
    nativeSymbol: "PLS",
    rpc: pulsechainRpc,
    explorer: {
      name: "PulseScan",
      baseUrl: PULSECHAIN_EXPLORER_BASE_URL,
      apiUrl: pulsechainDiscovery.apiUrl,
      apiUrlEnvVar: pulsechainDiscovery.apiUrlEnvVar,
      urls: explorerUrls(PULSECHAIN_EXPLORER_BASE_URL),
    },
    discovery: pulsechainDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "PulseScan",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "PulseScan can cap large log responses; the scanner reports truncation instead of showing a false clear state.",
    },
    standardLabels: {
      fungible: "PRC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [BSC_CHAIN_ID]: {
    key: "bsc",
    chain: bsc,
    chainId: BSC_CHAIN_ID,
    displayName: "BNB Smart Chain",
    shortName: "BSC",
    nativeSymbol: "BNB",
    rpc: bscRpc,
    explorer: {
      name: "BscScan",
      baseUrl: BSC_EXPLORER_BASE_URL,
      apiUrl: bscDiscovery.apiUrl,
      apiUrlEnvVar: bscDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: bscDiscovery.apiKeyEnvVar,
      urls: explorerUrls(BSC_EXPLORER_BASE_URL),
    },
    discovery: bscDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for BSC logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "BEP-20",
      nft: "BEP-721",
      multiToken: "BEP-1155",
      nftOperator: "BEP-721/BEP-1155",
    },
    maxTransactionGas: BSC_OSAKA_MAX_TRANSACTION_GAS,
    highGasWarningThreshold: BSC_HIGH_GAS_WARNING_THRESHOLD,
  },
  [BASE_CHAIN_ID]: {
    key: "base",
    chain: base,
    chainId: BASE_CHAIN_ID,
    displayName: "Base",
    shortName: "Base",
    nativeSymbol: "ETH",
    rpc: baseRpc,
    explorer: {
      name: "BaseScan",
      baseUrl: BASE_EXPLORER_BASE_URL,
      apiUrl: baseDiscovery.apiUrl,
      apiUrlEnvVar: baseDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: baseDiscovery.apiKeyEnvVar,
      urls: explorerUrls(BASE_EXPLORER_BASE_URL),
    },
    discovery: baseDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Base logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [POLYGON_CHAIN_ID]: {
    key: "polygon",
    chain: polygon,
    chainId: POLYGON_CHAIN_ID,
    displayName: "Polygon",
    shortName: "Polygon",
    nativeSymbol: "POL",
    rpc: polygonRpc,
    explorer: {
      name: "PolygonScan",
      baseUrl: POLYGON_EXPLORER_BASE_URL,
      apiUrl: polygonDiscovery.apiUrl,
      apiUrlEnvVar: polygonDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: polygonDiscovery.apiKeyEnvVar,
      urls: explorerUrls(POLYGON_EXPLORER_BASE_URL),
    },
    discovery: polygonDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Polygon logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [SONIC_CHAIN_ID]: {
    key: "sonic",
    chain: sonic,
    chainId: SONIC_CHAIN_ID,
    displayName: "Sonic Mainnet",
    shortName: "Sonic",
    nativeSymbol: "S",
    rpc: sonicRpc,
    explorer: {
      name: "SonicScan",
      baseUrl: SONIC_EXPLORER_BASE_URL,
      apiUrl: sonicDiscovery.apiUrl,
      apiUrlEnvVar: sonicDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: sonicDiscovery.apiKeyEnvVar,
      urls: explorerUrls(SONIC_EXPLORER_BASE_URL),
    },
    discovery: sonicDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Sonic logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [AVALANCHE_CHAIN_ID]: {
    key: "avalanche",
    chain: avalanche,
    chainId: AVALANCHE_CHAIN_ID,
    displayName: "Avalanche C-Chain",
    shortName: "Avalanche",
    nativeSymbol: "AVAX",
    rpc: avalancheRpc,
    explorer: {
      name: "SnowScan",
      baseUrl: AVALANCHE_EXPLORER_BASE_URL,
      apiUrl: avalancheDiscovery.apiUrl,
      apiUrlEnvVar: avalancheDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: avalancheDiscovery.apiKeyEnvVar,
      urls: explorerUrls(AVALANCHE_EXPLORER_BASE_URL),
    },
    discovery: avalancheDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Avalanche logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [MANTLE_CHAIN_ID]: {
    key: "mantle",
    chain: mantle,
    chainId: MANTLE_CHAIN_ID,
    displayName: "Mantle",
    shortName: "Mantle",
    nativeSymbol: "MNT",
    rpc: mantleRpc,
    explorer: {
      name: "Mantle Explorer",
      baseUrl: MANTLE_EXPLORER_BASE_URL,
      apiUrl: mantleDiscovery.apiUrl,
      apiUrlEnvVar: mantleDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: mantleDiscovery.apiKeyEnvVar,
      urls: explorerUrls(MANTLE_EXPLORER_BASE_URL),
    },
    discovery: mantleDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Mantle logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [LINEA_CHAIN_ID]: {
    key: "linea",
    chain: linea,
    chainId: LINEA_CHAIN_ID,
    displayName: "Linea",
    shortName: "Linea",
    nativeSymbol: "ETH",
    rpc: lineaRpc,
    explorer: {
      name: "LineaScan",
      baseUrl: LINEA_EXPLORER_BASE_URL,
      apiUrl: lineaDiscovery.apiUrl,
      apiUrlEnvVar: lineaDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: lineaDiscovery.apiKeyEnvVar,
      urls: explorerUrls(LINEA_EXPLORER_BASE_URL),
    },
    discovery: lineaDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Linea logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [BLAST_CHAIN_ID]: {
    key: "blast",
    chain: blast,
    chainId: BLAST_CHAIN_ID,
    displayName: "Blast",
    shortName: "Blast",
    nativeSymbol: "ETH",
    rpc: blastRpc,
    explorer: {
      name: "Blastscan",
      baseUrl: BLAST_EXPLORER_BASE_URL,
      apiUrl: blastDiscovery.apiUrl,
      apiUrlEnvVar: blastDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: blastDiscovery.apiKeyEnvVar,
      urls: explorerUrls(BLAST_EXPLORER_BASE_URL),
    },
    discovery: blastDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Blast logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [BERACHAIN_CHAIN_ID]: {
    key: "berachain",
    chain: berachain,
    chainId: BERACHAIN_CHAIN_ID,
    displayName: "Berachain",
    shortName: "Berachain",
    nativeSymbol: "BERA",
    rpc: berachainRpc,
    explorer: {
      name: "Berascan",
      baseUrl: BERACHAIN_EXPLORER_BASE_URL,
      apiUrl: berachainDiscovery.apiUrl,
      apiUrlEnvVar: berachainDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: berachainDiscovery.apiKeyEnvVar,
      urls: explorerUrls(BERACHAIN_EXPLORER_BASE_URL),
    },
    discovery: berachainDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Berachain logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [CELO_CHAIN_ID]: {
    key: "celo",
    chain: celo,
    chainId: CELO_CHAIN_ID,
    displayName: "Celo",
    shortName: "Celo",
    nativeSymbol: "CELO",
    rpc: celoRpc,
    explorer: {
      name: "CeloScan",
      baseUrl: CELO_EXPLORER_BASE_URL,
      apiUrl: celoDiscovery.apiUrl,
      apiUrlEnvVar: celoDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: celoDiscovery.apiKeyEnvVar,
      urls: explorerUrls(CELO_EXPLORER_BASE_URL),
    },
    discovery: celoDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Celo logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [GNOSIS_CHAIN_ID]: {
    key: "gnosis",
    chain: gnosis,
    chainId: GNOSIS_CHAIN_ID,
    displayName: "Gnosis",
    shortName: "Gnosis",
    nativeSymbol: "XDAI",
    rpc: gnosisRpc,
    explorer: {
      name: "Gnosisscan",
      baseUrl: GNOSIS_EXPLORER_BASE_URL,
      apiUrl: gnosisDiscovery.apiUrl,
      apiUrlEnvVar: gnosisDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: gnosisDiscovery.apiKeyEnvVar,
      urls: explorerUrls(GNOSIS_EXPLORER_BASE_URL),
    },
    discovery: gnosisDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Gnosis logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [UNICHAIN_CHAIN_ID]: {
    key: "unichain",
    chain: unichain,
    chainId: UNICHAIN_CHAIN_ID,
    displayName: "Unichain",
    shortName: "Unichain",
    nativeSymbol: "ETH",
    rpc: unichainRpc,
    explorer: {
      name: "Uniscan",
      baseUrl: UNICHAIN_EXPLORER_BASE_URL,
      apiUrl: unichainDiscovery.apiUrl,
      apiUrlEnvVar: unichainDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: unichainDiscovery.apiKeyEnvVar,
      urls: explorerUrls(UNICHAIN_EXPLORER_BASE_URL),
    },
    discovery: unichainDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for Unichain logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
  [WORLDCHAIN_CHAIN_ID]: {
    key: "worldchain",
    chain: worldchain,
    chainId: WORLDCHAIN_CHAIN_ID,
    displayName: "World Chain",
    shortName: "World",
    nativeSymbol: "ETH",
    rpc: worldchainRpc,
    explorer: {
      name: "Worldscan",
      baseUrl: WORLDCHAIN_EXPLORER_BASE_URL,
      apiUrl: worldchainDiscovery.apiUrl,
      apiUrlEnvVar: worldchainDiscovery.apiUrlEnvVar,
      apiKeyEnvVar: worldchainDiscovery.apiKeyEnvVar,
      urls: explorerUrls(WORLDCHAIN_EXPLORER_BASE_URL),
    },
    discovery: worldchainDiscovery,
    discoverySettings: {
      sourceKind: "explorer-logs",
      providerName: "Etherscan API V2",
      approvalEventTopicMode: "topic0-topic1-owner",
      defaultFromBlock: "0",
      defaultToBlock: "latest",
      pageSize: 1000,
      historicalRpcLogs: "disabled",
      capWarning:
        "Etherscan API V2 may rate-limit, cap pages, or require smaller windows for World Chain logs; incomplete discovery is surfaced to the user.",
    },
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
      nftOperator: "ERC-721/ERC-1155",
    },
  },
} as const satisfies Record<number, SupportedChainConfig>;

export const supportedChains = [
  pulsechain,
  bsc,
  base,
  polygon,
  sonic,
  avalanche,
  mantle,
  linea,
  blast,
  berachain,
  celo,
  gnosis,
  unichain,
  worldchain,
] as const;

export function isSupportedChainId(
  id: number | undefined,
): id is SupportedChainId {
  return typeof id === "number" && id in supportedChainConfigs;
}

/** Resolve the config for a supported chain, or `undefined` if unsupported. */
export function getChainConfig(
  chainId: number | undefined,
): SupportedChainConfig | undefined {
  if (!isSupportedChainId(chainId)) return undefined;
  return supportedChainConfigs[chainId];
}

/** Stable list of supported configs in UI display order. */
export const supportedChainConfigList = [
  supportedChainConfigs[PULSECHAIN_CHAIN_ID],
  supportedChainConfigs[BSC_CHAIN_ID],
  supportedChainConfigs[BASE_CHAIN_ID],
  supportedChainConfigs[POLYGON_CHAIN_ID],
  supportedChainConfigs[SONIC_CHAIN_ID],
  supportedChainConfigs[AVALANCHE_CHAIN_ID],
  supportedChainConfigs[MANTLE_CHAIN_ID],
  supportedChainConfigs[LINEA_CHAIN_ID],
  supportedChainConfigs[BLAST_CHAIN_ID],
  supportedChainConfigs[BERACHAIN_CHAIN_ID],
  supportedChainConfigs[CELO_CHAIN_ID],
  supportedChainConfigs[GNOSIS_CHAIN_ID],
  supportedChainConfigs[UNICHAIN_CHAIN_ID],
  supportedChainConfigs[WORLDCHAIN_CHAIN_ID],
] as const;

function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" or ");
  return `${names.slice(0, -1).join(", ")}, or ${names[names.length - 1]}`;
}

export function getSupportedChainNames(): string {
  return joinNames(supportedChainConfigList.map((c) => c.displayName));
}

export function getSupportedChainShortNames(): string {
  return joinNames(supportedChainConfigList.map((c) => c.shortName));
}
