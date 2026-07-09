import {
  createPublicClient,
  erc20Abi,
  getAddress,
  http,
  isAddress,
  keccak256,
  parseAbi,
  type Abi,
  type Address,
  type Chain,
} from "viem";

import {
  ARBITRUM_EXPLORER_API_DEFAULT,
  ARBITRUM_EXPLORER_CHAIN_ID_DEFAULT,
  ARBITRUM_ONE_CHAIN_ID,
} from "@/lib/arbitrum-approval-api";
import {
  ARBITRUM_ONE_DISPLAY_NAME,
  ARBITRUM_ONE_EXPLORER_BASE_URL,
  ARBITRUM_ONE_EXPLORER_NAME,
  ARBITRUM_ONE_PUBLIC_RPC_URL,
  arbitrumOneWalletChain,
} from "@/lib/arbitrum-approval-client";
import {
  ETHEREUM_EXPLORER_API_DEFAULT,
  ETHEREUM_EXPLORER_CHAIN_ID_DEFAULT,
  ETHEREUM_MAINNET_CHAIN_ID,
} from "@/lib/ethereum-approval-api";
import {
  ETHEREUM_MAINNET_DISPLAY_NAME,
  ETHEREUM_MAINNET_EXPLORER_BASE_URL,
  ETHEREUM_MAINNET_EXPLORER_NAME,
  ETHEREUM_MAINNET_PUBLIC_RPC_URL,
  ethereumMainnetWalletChain,
} from "@/lib/ethereum-approval-client";
import {
  HYPEREVM_CHAIN_ID,
  HYPEREVM_EXPLORER_API_DEFAULT,
  HYPEREVM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/hyperevm-approval-api";
import {
  HYPEREVM_DISPLAY_NAME,
  HYPEREVM_EXPLORER_BASE_URL,
  HYPEREVM_EXPLORER_NAME,
  HYPEREVM_PUBLIC_RPC_URL,
  hyperevmWalletChain,
} from "@/lib/hyperevm-approval-client";
import {
  OPTIMISM_CHAIN_ID,
  OPTIMISM_EXPLORER_API_DEFAULT,
  OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
} from "@/lib/optimism-approval-api";
import {
  OPTIMISM_DISPLAY_NAME,
  OPTIMISM_EXPLORER_BASE_URL,
  OPTIMISM_EXPLORER_NAME,
  OPTIMISM_PUBLIC_RPC_URL,
  optimismWalletChain,
} from "@/lib/optimism-approval-client";
import {
  getChainConfig,
  type DiscoverySourceConfig,
  type SupportedChainConfig,
} from "@/lib/chains";
import {
  explorerAddressUrl,
  explorerTokenUrl,
  explorerTxUrl,
} from "@/lib/explorer";
import {
  getTokenContractReportChainOption,
  isTokenContractReportChainId,
  markdownText,
  normalizeTokenContractReportAddress,
  supportedTokenContractReportChainSummary,
  type Erc6909DetectionStatus,
  type TokenContractReportResponse,
  type TokenContractReportSignal,
} from "@/lib/token-contract-report";

const TOKEN_REPORT_READ_TIMEOUT_MS = 8_000;
const TOKEN_REPORT_SOURCE_TIMEOUT_MS = 8_000;
const TOKEN_REPORT_CREATION_TIMEOUT_MS = 8_000;
const TOKEN_REPORT_DEEPSEEK_TIMEOUT_MS = 18_000;
const TOKEN_REPORT_DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const TOKEN_REPORT_DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-pro";
const TOKEN_REPORT_DEEPSEEK_MAX_TOKENS = 2_200;
const TOKEN_REPORT_SCANNER_VERSION = "token-contract-report-v1";
const TOKEN_REPORT_DEEP_AUDIT_PROMPT_VERSION = "deep-audit-evidence-v1";

const erc165Abi = parseAbi([
  "function supportsInterface(bytes4 interfaceId) view returns (bool)",
]);
const erc4626Abi = parseAbi([
  "function asset() view returns (address)",
  "function totalAssets() view returns (uint256)",
]);

const INTERFACE_ID_ERC721 = "0x80ac58cd";
const INTERFACE_ID_ERC1155 = "0xd9b67a26";

const SELECTOR_WATCHLIST = {
  "0x01ffc9a7": {
    signature: "supportsInterface(bytes4)",
    bucket: "standard",
    label: "ERC-165 interface probe",
  },
  "0x06fdde03": {
    signature: "name()",
    bucket: "standard",
    label: "ERC-20/ERC-721 metadata",
  },
  "0x095ea7b3": {
    signature: "approve(address,uint256)",
    bucket: "standard",
    label: "ERC-20 approval",
  },
  "0x18160ddd": {
    signature: "totalSupply()",
    bucket: "standard",
    label: "ERC-20 supply",
  },
  "0x23b872dd": {
    signature: "transferFrom(address,address,uint256)",
    bucket: "standard",
    label: "ERC-20 allowance spend",
  },
  "0x313ce567": {
    signature: "decimals()",
    bucket: "standard",
    label: "ERC-20 metadata",
  },
  "0x40c10f19": {
    signature: "mint(address,uint256)",
    bucket: "dangerous",
    label: "Mint selector clue",
  },
  "0x42966c68": {
    signature: "burn(uint256)",
    bucket: "dangerous",
    label: "Burn selector clue",
  },
  "0x52d1902d": {
    signature: "proxiableUUID()",
    bucket: "admin",
    label: "UUPS proxy selector clue",
  },
  "0x5c60da1b": {
    signature: "implementation()",
    bucket: "admin",
    label: "Proxy implementation selector clue",
  },
  "0x5c975abb": {
    signature: "paused()",
    bucket: "dangerous",
    label: "Pause-state selector clue",
  },
  "0x70a08231": {
    signature: "balanceOf(address)",
    bucket: "standard",
    label: "Token balance",
  },
  "0x715018a6": {
    signature: "renounceOwnership()",
    bucket: "admin",
    label: "Ownership control",
  },
  "0x79cc6790": {
    signature: "burnFrom(address,uint256)",
    bucket: "dangerous",
    label: "Third-party burn selector clue",
  },
  "0x8da5cb5b": {
    signature: "owner()",
    bucket: "admin",
    label: "Owner getter",
  },
  "0x95d89b41": {
    signature: "symbol()",
    bucket: "standard",
    label: "ERC-20/ERC-721 metadata",
  },
  "0xa0712d68": {
    signature: "mint(uint256)",
    bucket: "dangerous",
    label: "Mint selector clue",
  },
  "0xa9059cbb": {
    signature: "transfer(address,uint256)",
    bucket: "standard",
    label: "ERC-20 transfer",
  },
  "0xaaf10f42": {
    signature: "changeAdmin(address)",
    bucket: "admin",
    label: "Proxy admin change selector clue",
  },
  "0xbaa2abde": {
    signature: "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)",
    bucket: "dangerous",
    label: "Liquidity removal selector clue",
  },
  "0xd0febe4c": {
    signature: "public mint/faucet-style selector",
    bucket: "dangerous",
    label: "Public mint template selector clue",
  },
  "0xdd62ed3e": {
    signature: "allowance(address,address)",
    bucket: "standard",
    label: "ERC-20 allowance",
  },
  "0xf2fde38b": {
    signature: "transferOwnership(address)",
    bucket: "admin",
    label: "Ownership control",
  },
  "0xf851a440": {
    signature: "admin()",
    bucket: "admin",
    label: "Proxy/admin getter",
  },
} as const satisfies Record<
  string,
  {
    signature: string;
    bucket: "admin" | "dangerous" | "standard";
    label: string;
  }
>;

type ExplorerApiKind = "etherscan-v2" | "blockscout-compatible";

interface TokenContractReportReadClient {
  getBytecode(args: { address: Address }): Promise<`0x${string}` | undefined>;
  readContract(args: {
    address: Address;
    abi: Abi;
    functionName: string;
    args?: readonly unknown[];
  }): Promise<unknown>;
}

interface ResolvedTokenReportChain {
  chainId: number;
  name: string;
  nativeSymbol: string;
  chain: Chain;
  rpcUrl: string;
  explorerName: string;
  explorerBaseUrl: string;
  apiUrl: string;
  apiKind: ExplorerApiKind;
  apiChainId?: string;
  apiKey?: string;
  apiKeyRequired: boolean;
  apiKeyEnvNames: readonly string[];
  standardLabels: {
    fungible: string;
    nft: string;
    multiToken: string;
  };
}

interface SourceMetadata {
  verified: "verified" | "unverified" | "unknown";
  contractName: string | null;
  isProxy: boolean | null;
  implementationAddress: Address | null;
  abiFunctionNames: string[];
  warnings: string[];
}

interface CreationMetadata {
  transactionHash: `0x${string}` | null;
  deployerAddress: Address | null;
  blockNumber: number | null;
  timestamp: string | null;
  warnings: string[];
}

interface ExplorerSourceResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface ExplorerCreationResponse {
  status?: string;
  message?: string;
  result?: unknown;
}

interface ExplorerSourceRow {
  SourceCode?: string;
  ABI?: string;
  ContractName?: string;
  Proxy?: string;
  Implementation?: string;
}

interface ExplorerCreationRow {
  blockNumber?: unknown;
  contractAddress?: unknown;
  contractCreator?: unknown;
  creatorAddressHash?: unknown;
  timestamp?: unknown;
  transactionHash?: unknown;
  txHash?: unknown;
}

interface ProbeResult<T> {
  ok: boolean;
  value: T | null;
  error: string | null;
}

interface FeatureFinding {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: number;
  evidence: Array<{
    type: string;
    value: string;
    meaning: string;
  }>;
  description: string;
  practicalEffect: string;
  recommendation: string;
}

export interface BuildTokenContractReportOptions {
  chainId: number;
  contractAddress: string;
  includeAi?: boolean;
  env?: NodeJS.ProcessEnv;
  fetcher?: typeof fetch;
  reader?: TokenContractReportReadClient;
  signal?: AbortSignal;
}

export async function buildTokenContractReport({
  chainId,
  contractAddress,
  includeAi = true,
  env = process.env,
  fetcher = fetch,
  reader,
  signal,
}: BuildTokenContractReportOptions): Promise<TokenContractReportResponse> {
  const normalizedAddress =
    normalizeTokenContractReportAddress(contractAddress);
  const chain = resolveTokenReportChain(chainId, env);

  if (!Number.isInteger(chainId) || !isTokenContractReportChainId(chainId)) {
    return emptyReport({
      status: "bad-request",
      errors: [
        `Token contract reports currently support ${supportedTokenContractReportChainSummary()}.`,
      ],
    });
  }
  if (!normalizedAddress) {
    return emptyReport({
      status: "bad-request",
      errors: ["Provide a valid EVM contract address."],
      chain,
    });
  }
  if (!chain) {
    return emptyReport({
      status: "config-missing",
      errors: ["Selected chain configuration could not be resolved."],
    });
  }

  const readClient =
    reader ??
    (createPublicClient({
      chain: chain.chain,
      transport: http(chain.rpcUrl),
    }) as unknown as TokenContractReportReadClient);

  const warnings: string[] = [];
  const errors: string[] = [];
  const signals: TokenContractReportSignal[] = [];

  const bytecodeProbe = await readProbe(
    () =>
      readClient.getBytecode({
        address: normalizedAddress,
      }),
    "contract bytecode",
  );

  const hasBytecode = Boolean(
    bytecodeProbe.ok &&
      bytecodeProbe.value &&
      bytecodeProbe.value !== "0x",
  );
  const runtimeBytecode =
    hasBytecode && bytecodeProbe.value ? bytecodeProbe.value : null;
  if (!bytecodeProbe.ok && bytecodeProbe.error) {
    errors.push(bytecodeProbe.error);
  }

  const [source, creation] = await Promise.all([
    fetchSourceMetadata({
      contractAddress: normalizedAddress,
      chain,
      fetcher,
      signal,
    }),
    fetchCreationMetadata({
      contractAddress: normalizedAddress,
      chain,
      fetcher,
      signal,
    }),
  ]);
  warnings.push(...source.warnings, ...creation.warnings);

  const creationLookupStatus: "found" | "unavailable" =
    creation.transactionHash && creation.deployerAddress
      ? "found"
      : "unavailable";
  const baseContract = {
    address: normalizedAddress,
    explorerUrl: explorerTokenUrl(chain.chainId, normalizedAddress),
    hasBytecode,
    source: {
      verified: source.verified,
      contractName: source.contractName,
      isProxy: source.isProxy,
      implementationAddress: source.implementationAddress,
    },
    creation: {
      transactionHash: creation.transactionHash,
      transactionUrl: creation.transactionHash
        ? explorerTxUrl(chain.chainId, creation.transactionHash)
        : null,
      deployerAddress: creation.deployerAddress,
      deployerUrl: creation.deployerAddress
        ? explorerAddressUrl(chain.chainId, creation.deployerAddress)
        : null,
      blockNumber: creation.blockNumber,
      timestamp: creation.timestamp,
      lookupStatus: creationLookupStatus,
    },
  };

  if (!hasBytecode) {
    return {
      ok: false,
      status: "unsupported-standard",
      chain: chainSummary(chain),
      contract: baseContract,
      standards: emptyStandards(),
      token: emptyToken(),
      signals: [
        signalItem({
          id: "no-bytecode",
          label: "No deployed bytecode",
          severity: "medium",
          evidence:
            "The selected address did not return deployed contract bytecode on this chain.",
        }),
      ],
      ai: emptyAi("skipped"),
      warnings,
      errors,
      missingConfig: [],
    };
  }

  signals.push(
    signalItem({
      id: "bytecode-present",
      label: "Contract bytecode found",
      severity: "info",
      evidence:
        "The selected address has deployed bytecode on the selected chain.",
    }),
  );

  addSourceSignals(signals, source);
  addCreationSignals(signals, creation);

  const erc20 = await readErc20Like(readClient, normalizedAddress);
  const erc721 = await readBooleanStandard(
    readClient,
    normalizedAddress,
    INTERFACE_ID_ERC721,
    "ERC-721",
  );
  const erc1155 = await readBooleanStandard(
    readClient,
    normalizedAddress,
    INTERFACE_ID_ERC1155,
    "ERC-1155",
  );
  const erc4626 = erc20.detected
    ? await readErc4626(readClient, normalizedAddress)
    : emptyErc4626Read();
  const erc6909 = detectErc6909(source);

  warnings.push(
    ...erc20.warnings,
    ...erc721.warnings,
    ...erc1155.warnings,
    ...erc4626.warnings,
  );

  const hybrid =
    (erc20.detected && (erc721.detected || erc1155.detected)) ||
    (erc721.detected && erc1155.detected);

  addStandardSignals(signals, {
    chain,
    erc20Like: erc20.detected,
    erc721: erc721.detected,
    erc1155: erc1155.detected,
    erc4626Detected: erc4626.detected,
    erc6909,
    hybrid,
    erc20,
    erc4626Read: erc4626,
  });

  const anyStandard =
    erc20.detected ||
    erc721.detected ||
    erc1155.detected ||
    erc4626.detected ||
    erc6909 === "detected";
  const status = anyStandard ? "complete" : "unsupported-standard";
  if (!anyStandard) {
    signals.push(
      signalItem({
        id: "unsupported-standard",
        label: "No supported token standard confirmed",
        severity: "medium",
        evidence:
          "Read probes did not confirm ERC-20-like, ERC-721, ERC-1155, ERC-4626, or ERC-6909 token behavior.",
        status: "incomplete",
      }),
    );
  }

  const baseReport: TokenContractReportResponse = {
    ok: status === "complete",
    status,
    chain: chainSummary(chain),
    contract: baseContract,
    standards: {
      erc20Like: erc20.detected,
      erc721: erc721.detected,
      erc1155: erc1155.detected,
      erc4626: erc4626.detected,
      erc6909,
      hybrid,
    },
    token: {
      name: erc20.name,
      symbol: erc20.symbol,
      decimals: erc20.decimals,
      totalSupply: erc20.totalSupply,
      vaultAssetAddress: erc4626.asset,
      totalAssets: erc4626.totalAssets,
    },
    signals,
    ai: emptyAi(includeAi ? "unavailable" : "skipped"),
    warnings: [
      ...warnings,
      "This report is read-only contract context. It is not a formal audit, financial advice, legal advice, or proof that a token is safe.",
    ],
    errors,
    missingConfig: [],
  };

  if (includeAi && status !== "unsupported-standard") {
    baseReport.ai = await generateDeepSeekReport({
      report: baseReport,
      runtimeBytecode,
      env,
      fetcher,
      signal,
    });
  }

  return baseReport;
}

function resolveTokenReportChain(
  chainId: number,
  env: NodeJS.ProcessEnv,
): ResolvedTokenReportChain | null {
  const option = getTokenContractReportChainOption(chainId);
  if (!option) return null;

  const generic = getChainConfig(chainId);
  if (generic) return resolveGenericChain(option.name, generic, env);

  if (chainId === ETHEREUM_MAINNET_CHAIN_ID) {
    return resolveSpecialChain({
      chainId,
      name: ETHEREUM_MAINNET_DISPLAY_NAME,
      nativeSymbol: "ETH",
      chain: ethereumMainnetWalletChain,
      rpcDefault: ETHEREUM_MAINNET_PUBLIC_RPC_URL,
      rpcEnvNames: ["MAINNET_RPC_URL", "ETHEREUM_RPC_URL"],
      explorerName: ETHEREUM_MAINNET_EXPLORER_NAME,
      explorerBaseUrl: ETHEREUM_MAINNET_EXPLORER_BASE_URL,
      apiUrlDefault: ETHEREUM_EXPLORER_API_DEFAULT,
      apiUrlEnvNames: ["ETHEREUM_EXPLORER_API_URL", "MAINNET_EXPLORER_API_URL"],
      apiKeyEnvNames: ["ETHERSCAN_API_KEY"],
      apiChainId: ETHEREUM_EXPLORER_CHAIN_ID_DEFAULT,
      env,
    });
  }
  if (chainId === ARBITRUM_ONE_CHAIN_ID) {
    return resolveSpecialChain({
      chainId,
      name: ARBITRUM_ONE_DISPLAY_NAME,
      nativeSymbol: "ETH",
      chain: arbitrumOneWalletChain,
      rpcDefault: ARBITRUM_ONE_PUBLIC_RPC_URL,
      rpcEnvNames: ["ARBITRUM_ONE_RPC_URL", "ARBITRUM_RPC_URL"],
      explorerName: ARBITRUM_ONE_EXPLORER_NAME,
      explorerBaseUrl: ARBITRUM_ONE_EXPLORER_BASE_URL,
      apiUrlDefault: ARBITRUM_EXPLORER_API_DEFAULT,
      apiUrlEnvNames: ["ARBITRUM_EXPLORER_API_URL"],
      apiKeyEnvNames: ["ARBISCAN_API_KEY", "ETHERSCAN_API_KEY"],
      apiChainId: ARBITRUM_EXPLORER_CHAIN_ID_DEFAULT,
      env,
    });
  }
  if (chainId === OPTIMISM_CHAIN_ID) {
    return resolveSpecialChain({
      chainId,
      name: OPTIMISM_DISPLAY_NAME,
      nativeSymbol: "ETH",
      chain: optimismWalletChain,
      rpcDefault: OPTIMISM_PUBLIC_RPC_URL,
      rpcEnvNames: [
        "OPTIMISM_RPC_URL",
        "OPTIMISM_MAINNET_RPC_URL",
        "OP_MAINNET_RPC_URL",
      ],
      explorerName: OPTIMISM_EXPLORER_NAME,
      explorerBaseUrl: OPTIMISM_EXPLORER_BASE_URL,
      apiUrlDefault: OPTIMISM_EXPLORER_API_DEFAULT,
      apiUrlEnvNames: ["OPTIMISM_EXPLORER_API_URL"],
      apiKeyEnvNames: [
        "OPTIMISM_EXPLORER_API_KEY",
        "OPTIMISTIC_ETHERSCAN_API_KEY",
        "ETHERSCAN_API_KEY",
      ],
      apiChainId: OPTIMISM_EXPLORER_CHAIN_ID_DEFAULT,
      env,
    });
  }
  if (chainId === HYPEREVM_CHAIN_ID) {
    return resolveSpecialChain({
      chainId,
      name: HYPEREVM_DISPLAY_NAME,
      nativeSymbol: "HYPE",
      chain: hyperevmWalletChain,
      rpcDefault: HYPEREVM_PUBLIC_RPC_URL,
      rpcEnvNames: [
        "HYPEREVM_RPC_URL",
        "HYPEREVM_MAINNET_RPC_URL",
        "HYPERLIQUID_EVM_RPC_URL",
      ],
      explorerName: HYPEREVM_EXPLORER_NAME,
      explorerBaseUrl: HYPEREVM_EXPLORER_BASE_URL,
      apiUrlDefault: HYPEREVM_EXPLORER_API_DEFAULT,
      apiUrlEnvNames: ["HYPEREVM_EXPLORER_API_URL"],
      apiKeyEnvNames: [
        "HYPEREVM_EXPLORER_API_KEY",
        "HYPEREVM_ETHERSCAN_API_KEY",
        "ETHERSCAN_API_KEY",
        "BSC_EXPLORER_API_KEY",
      ],
      apiChainId: HYPEREVM_EXPLORER_CHAIN_ID_DEFAULT,
      env,
    });
  }

  return null;
}

function resolveGenericChain(
  name: string,
  config: SupportedChainConfig,
  env: NodeJS.ProcessEnv,
): ResolvedTokenReportChain {
  const apiKeyEnvNames = apiKeyEnvNamesFor(config.discovery);
  const apiUrl = validHttpUrl(cleanEnv(env[config.discovery.apiUrlEnvVar])) ??
    config.discovery.apiUrl;
  const rpcUrl =
    validHttpUrl(cleanEnv(env[config.rpc.envVar])) ?? config.rpc.defaultUrl;

  return {
    chainId: config.chainId,
    name,
    nativeSymbol: config.nativeSymbol,
    chain: config.chain,
    rpcUrl,
    explorerName: config.explorer.name,
    explorerBaseUrl: config.explorer.baseUrl,
    apiUrl,
    apiKind: config.discovery.apiProviderKind ?? "blockscout-compatible",
    apiChainId:
      (config.discovery.apiChainIdEnvVar
        ? cleanEnv(env[config.discovery.apiChainIdEnvVar])
        : undefined) ?? config.discovery.apiChainId,
    apiKey: firstEnv(env, apiKeyEnvNames),
    apiKeyRequired: Boolean(config.discovery.requiresApiKey),
    apiKeyEnvNames,
    standardLabels: {
      fungible: config.standardLabels.fungible,
      nft: config.standardLabels.nft,
      multiToken: config.standardLabels.multiToken,
    },
  };
}

function resolveSpecialChain(args: {
  chainId: number;
  name: string;
  nativeSymbol: string;
  chain: Chain;
  rpcDefault: string;
  rpcEnvNames: readonly string[];
  explorerName: string;
  explorerBaseUrl: string;
  apiUrlDefault: string;
  apiUrlEnvNames: readonly string[];
  apiKeyEnvNames: readonly string[];
  apiChainId: string;
  env: NodeJS.ProcessEnv;
}): ResolvedTokenReportChain {
  return {
    chainId: args.chainId,
    name: args.name,
    nativeSymbol: args.nativeSymbol,
    chain: args.chain,
    rpcUrl: validHttpUrl(firstEnv(args.env, args.rpcEnvNames)) ??
      args.rpcDefault,
    explorerName: args.explorerName,
    explorerBaseUrl: args.explorerBaseUrl,
    apiUrl: validHttpUrl(firstEnv(args.env, args.apiUrlEnvNames)) ??
      args.apiUrlDefault,
    apiKind: "etherscan-v2",
    apiChainId: args.apiChainId,
    apiKey: firstEnv(args.env, args.apiKeyEnvNames),
    apiKeyRequired: true,
    apiKeyEnvNames: args.apiKeyEnvNames,
    standardLabels: {
      fungible: "ERC-20",
      nft: "ERC-721",
      multiToken: "ERC-1155",
    },
  };
}

function apiKeyEnvNamesFor(
  discovery: DiscoverySourceConfig,
): readonly string[] {
  if (discovery.apiKeyEnvVars?.length) return discovery.apiKeyEnvVars;
  return discovery.apiKeyEnvVar ? [discovery.apiKeyEnvVar] : [];
}

async function readErc20Like(
  client: TokenContractReportReadClient,
  address: Address,
) {
  const [name, symbol, decimals, totalSupply] = await Promise.all([
    readProbe(
      () =>
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "name",
        }),
      "ERC-20 name",
    ),
    readProbe(
      () =>
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "symbol",
        }),
      "ERC-20 symbol",
    ),
    readProbe(
      () =>
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      "ERC-20 decimals",
    ),
    readProbe(
      () =>
        client.readContract({
          address,
          abi: erc20Abi,
          functionName: "totalSupply",
        }),
      "ERC-20 totalSupply",
    ),
  ]);

  const detected = Boolean(
    symbol.ok ||
      decimals.ok ||
      totalSupply.ok ||
      (name.ok && typeof name.value === "string"),
  );
  const warnings = [name, symbol, decimals, totalSupply]
    .filter((probe) => probe.error)
    .map((probe) => probe.error!);

  return {
    detected,
    name: valueAsShortString(name.value),
    symbol: valueAsShortString(symbol.value),
    decimals:
      typeof decimals.value === "number"
        ? decimals.value
        : typeof decimals.value === "bigint"
          ? Number(decimals.value)
          : null,
    totalSupply:
      typeof totalSupply.value === "bigint" ? totalSupply.value.toString() : null,
    warnings: detected ? [] : warnings.slice(0, 2),
  };
}

async function readBooleanStandard(
  client: TokenContractReportReadClient,
  address: Address,
  interfaceId: `0x${string}`,
  label: string,
) {
  const probe = await readProbe(
    () =>
      client.readContract({
        address,
        abi: erc165Abi,
        functionName: "supportsInterface",
        args: [interfaceId],
      }),
    `${label} supportsInterface`,
  );

  return {
    detected: probe.value === true,
    warnings: probe.ok ? [] : [],
  };
}

async function readErc4626(
  client: TokenContractReportReadClient,
  address: Address,
) {
  const [asset, totalAssets] = await Promise.all([
    readProbe(
      () =>
        client.readContract({
          address,
          abi: erc4626Abi,
          functionName: "asset",
        }),
      "ERC-4626 asset",
    ),
    readProbe(
      () =>
        client.readContract({
          address,
          abi: erc4626Abi,
          functionName: "totalAssets",
        }),
      "ERC-4626 totalAssets",
    ),
  ]);

  const assetAddress =
    typeof asset.value === "string" && isAddress(asset.value)
      ? getAddress(asset.value)
      : null;

  return {
    detected: Boolean(assetAddress || totalAssets.ok),
    asset: assetAddress,
    totalAssets:
      typeof totalAssets.value === "bigint" ? totalAssets.value.toString() : null,
    warnings: [],
  };
}

function emptyErc4626Read() {
  return {
    detected: false,
    asset: null,
    totalAssets: null,
    warnings: [] as string[],
  };
}

function detectErc6909(source: SourceMetadata): Erc6909DetectionStatus {
  const names = new Set(source.abiFunctionNames.map((name) => name.toLowerCase()));
  if (
    names.has("setoperator") &&
    names.has("isoperator") &&
    (names.has("allowance") || names.has("approve"))
  ) {
    return "detected";
  }
  if (source.verified === "unknown") return "limited";
  return "not_detected";
}

async function fetchSourceMetadata({
  contractAddress,
  chain,
  fetcher,
  signal,
}: {
  contractAddress: Address;
  chain: ResolvedTokenReportChain;
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<SourceMetadata> {
  if (chain.apiKind === "etherscan-v2" && chain.apiKeyRequired && !chain.apiKey) {
    return {
      ...emptySourceMetadata(),
      warnings: [
        `${chain.name} source-code lookup requires ${chain.apiKeyEnvNames.join(
          " or ",
        )} server-side; source status is unknown.`,
      ],
    };
  }

  try {
    const response = await withTimeout(
      fetcher(buildSourceCodeUrl(contractAddress, chain), {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      }),
      TOKEN_REPORT_SOURCE_TIMEOUT_MS,
      `${chain.name} source-code lookup timed out`,
    );
    if (!response.ok) {
      return {
        ...emptySourceMetadata(),
        warnings: [
          `${chain.name} explorer returned HTTP ${response.status} for source-code lookup.`,
        ],
      };
    }

    const body = (await response.json()) as ExplorerSourceResponse;
    const rows = Array.isArray(body.result) ? body.result : [];
    const row = rows[0] as ExplorerSourceRow | undefined;
    if (!row) {
      return {
        ...emptySourceMetadata(),
        warnings: [
          `${chain.name} explorer did not return source-code metadata for this contract.`,
        ],
      };
    }

    const sourceCode = cleanEnv(row.SourceCode);
    const abi = cleanEnv(row.ABI);
    const verified =
      sourceCode || (abi && !/not verified/i.test(abi))
        ? "verified"
        : "unverified";
    const implementation = cleanEnv(row.Implementation);

    return {
      verified,
      contractName: cleanEnv(row.ContractName)?.slice(0, 80) ?? null,
      isProxy:
        cleanEnv(row.Proxy) === "1"
          ? true
          : cleanEnv(row.Proxy) === "0"
            ? false
            : null,
      implementationAddress:
        implementation && isAddress(implementation)
          ? getAddress(implementation)
          : null,
      abiFunctionNames: summarizeAbiFunctionNames(abi),
      warnings: [],
    };
  } catch (error) {
    return {
      ...emptySourceMetadata(),
      warnings: [
        `${chain.name} source-code metadata could not be read: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
    };
  }
}

function buildSourceCodeUrl(
  contractAddress: Address,
  chain: ResolvedTokenReportChain,
): string {
  const url = new URL(chain.apiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getsourcecode");
  url.searchParams.set("address", contractAddress);
  if (chain.apiKind === "etherscan-v2" && chain.apiChainId) {
    url.searchParams.set("chainid", chain.apiChainId);
  }
  if (chain.apiKey) url.searchParams.set("apikey", chain.apiKey);
  return url.toString();
}

async function fetchCreationMetadata({
  contractAddress,
  chain,
  fetcher,
  signal,
}: {
  contractAddress: Address;
  chain: ResolvedTokenReportChain;
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<CreationMetadata> {
  if (chain.apiKind === "etherscan-v2" && chain.apiKeyRequired && !chain.apiKey) {
    return {
      ...emptyCreationMetadata(),
      warnings: [
        `${chain.name} contract-creation lookup requires ${chain.apiKeyEnvNames.join(
          " or ",
        )} server-side; deployer and creation transaction are unavailable.`,
      ],
    };
  }

  try {
    const response = await withTimeout(
      fetcher(buildContractCreationUrl(contractAddress, chain), {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      }),
      TOKEN_REPORT_CREATION_TIMEOUT_MS,
      `${chain.name} contract-creation lookup timed out`,
    );
    if (!response.ok) {
      return {
        ...emptyCreationMetadata(),
        warnings: [
          `${chain.name} explorer returned HTTP ${response.status} for contract-creation lookup.`,
        ],
      };
    }

    const body = (await response.json()) as ExplorerCreationResponse;
    const rows = Array.isArray(body.result) ? body.result : [];
    const row = rows
      .filter((item): item is ExplorerCreationRow =>
        typeof item === "object" && item !== null,
      )
      .find((item) => {
        const rowAddress = normalizedAddressFromUnknown(item.contractAddress);
        return !rowAddress || rowAddress === contractAddress;
      });

    if (!row) {
      return {
        ...emptyCreationMetadata(),
        warnings: [
          `${chain.name} explorer did not return contract-creation metadata for this contract.`,
        ],
      };
    }

    const transactionHash = normalizedTxHashFromUnknown(
      row.txHash ?? row.transactionHash,
    );
    const deployerAddress = normalizedAddressFromUnknown(
      row.contractCreator ?? row.creatorAddressHash,
    );

    if (!transactionHash || !deployerAddress) {
      return {
        ...emptyCreationMetadata(),
        transactionHash,
        deployerAddress,
        blockNumber: integerFromUnknown(row.blockNumber),
        timestamp: timestampFromUnknown(row.timestamp),
        warnings: [
          `${chain.name} explorer returned incomplete contract-creation metadata for this contract.`,
        ],
      };
    }

    return {
      transactionHash,
      deployerAddress,
      blockNumber: integerFromUnknown(row.blockNumber),
      timestamp: timestampFromUnknown(row.timestamp),
      warnings: [],
    };
  } catch (error) {
    return {
      ...emptyCreationMetadata(),
      warnings: [
        `${chain.name} contract-creation metadata could not be read: ${redactSensitiveErrorText(
          error instanceof Error ? error.message : String(error),
        )}`,
      ],
    };
  }
}

function buildContractCreationUrl(
  contractAddress: Address,
  chain: ResolvedTokenReportChain,
): string {
  const url = new URL(chain.apiUrl);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getcontractcreation");
  url.searchParams.set("contractaddresses", contractAddress);
  if (chain.apiKind === "etherscan-v2" && chain.apiChainId) {
    url.searchParams.set("chainid", chain.apiChainId);
  }
  if (chain.apiKey) url.searchParams.set("apikey", chain.apiKey);
  return url.toString();
}

async function generateDeepSeekReport({
  report,
  runtimeBytecode,
  env,
  fetcher,
  signal,
}: {
  report: TokenContractReportResponse;
  runtimeBytecode: `0x${string}` | null;
  env: NodeJS.ProcessEnv;
  fetcher: typeof fetch;
  signal?: AbortSignal;
}): Promise<TokenContractReportResponse["ai"]> {
  const apiKey = cleanEnv(env.DEEPSEEK_API_KEY);
  if (!apiKey) return emptyAi("unavailable");

  const baseUrl =
    validHttpUrl(cleanEnv(env.DEEPSEEK_BASE_URL)) ??
    TOKEN_REPORT_DEFAULT_DEEPSEEK_BASE_URL;
  const model =
    cleanEnv(env.DEEPSEEK_MODEL) ?? TOKEN_REPORT_DEFAULT_DEEPSEEK_MODEL;
  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const evidence = JSON.stringify(deepAuditFeatureReport(report, runtimeBytecode));

  try {
    const response = await withTimeout(
      fetcher(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "You generate cautious read-only token contract risk reports for Pulse Revoke from deterministic scanner evidence. Do not call the report a formal audit. Do not say a token is safe. Do not provide financial or legal advice. Treat missing extraction, missing source, and missing simulation as unresolved risk, not as clearance.",
            },
            {
              role: "user",
              content: `Generate a token contract report from deterministic scanner evidence.

Rules:
1. Do not claim the contract is safe unless the feature report directly supports that, and this v1 scanner normally does not prove safety.
2. Separate severity from confidence.
3. Do not rely on selector names alone. Say when a finding is selector-only or bytecode-pattern-only.
4. Explain practical effects in plain English.
5. Focus on minting, blacklist, taxes, transfer restrictions, ownership, proxy, liquidity, and simulation results.
6. If source is unverified, say confidence is reduced but do not ignore bytecode evidence.
7. If scanner extraction is shallow or a critical check is not_collected, say risk is unknown or unresolved, not safe.
8. Include contract address, token name, symbol, decimals, total supply, owner, deployer, and risk score when present. If absent, say unavailable.
9. Include a bottom-line verdict.
10. Include a selector watchlist if dangerous selectors are present.

Return only JSON using this schema:
{
  "title": "Token Contract Report",
  "contractAddress": "0x...",
  "tokenName": "...",
  "tokenSymbol": "...",
  "overallVerdict": "unknown risk",
  "confidence": 0,
  "confidenceReason": "...",
  "mainRisks": [],
  "detailedFindings": [
    {
      "severity": "critical|high|medium|low|info",
      "heading": "...",
      "evidence": [],
      "description": "...",
      "practicalEffect": "..."
    }
  ],
  "whatNotSeen": [],
  "selectorWatchlist": [],
  "whatToCheckOnChain": [],
  "bottomLine": "..."
}

Feature report JSON:
${evidence}`,
            },
          ],
          max_tokens: TOKEN_REPORT_DEEPSEEK_MAX_TOKENS,
          response_format: { type: "json_object" },
          temperature: 0.1,
          thinking: { type: "disabled" },
        }),
        signal,
      }),
      TOKEN_REPORT_DEEPSEEK_TIMEOUT_MS,
      "DeepSeek report generation timed out",
    );
    if (!response.ok) return emptyAi("unavailable", model);
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const markdown = body.choices?.[0]?.message?.content;
    if (typeof markdown !== "string" || !markdown.trim()) {
      return emptyAi("unavailable", model);
    }
    const parsed = parseDeepSeekAuditJson(markdown);
    return {
      status: "generated",
      model,
      markdown: parsed
        ? renderDeepSeekAuditMarkdown(parsed, report)
        : markdownText(markdown.trim()),
    };
  } catch {
    return emptyAi("unavailable", model);
  }
}

function deepAuditFeatureReport(
  report: TokenContractReportResponse,
  runtimeBytecode: `0x${string}` | null,
) {
  const selectors = summarizeSelectors(runtimeBytecode);
  const risk = summarizeFeatureRisk(report);

  return {
    scannerVersion: TOKEN_REPORT_SCANNER_VERSION,
    promptVersion: TOKEN_REPORT_DEEP_AUDIT_PROMPT_VERSION,
    createdAt: new Date().toISOString(),
    dataBoundary: {
      rawSourceCodeSent: false,
      rawRuntimeBytecodeSent: false,
      privateWalletDataSent: false,
      note:
        "DeepSeek receives normalized evidence, hashes, selectors, strings, and bounded risk signals. It does not receive raw verified source code or raw runtime bytecode.",
    },
    contractAddress: report.contract?.address ?? null,
    chainId: report.chain?.chainId ?? null,
    networkName: report.chain?.name ?? null,
    creationTxHash: report.contract?.creation.transactionHash ?? null,
    deployer: report.contract?.creation.deployerAddress ?? null,
    creationBlock: report.contract?.creation.blockNumber ?? null,
    creationTimestamp: report.contract?.creation.timestamp ?? null,
    bytecode: summarizeRuntimeBytecode(runtimeBytecode),
    source: {
      verified: report.contract?.source.verified === "verified",
      status: report.contract?.source.verified ?? "unknown",
      provider: report.chain?.explorerName ?? null,
      contractName: markdownText(report.contract?.source.contractName),
      compilerVersion: null,
      abiFunctionCount: null,
      confidencePenalty:
        report.contract?.source.verified === "verified"
          ? 0
          : report.contract?.source.verified === "unverified"
            ? 15
            : 10,
    },
    classification: {
      isToken: report.status === "complete",
      tokenStandard: classifyTokenStandard(report),
      isProxy: report.contract?.source.isProxy === true,
      proxyType: report.contract?.source.isProxy ? "explorer-reported" : null,
      implementationAddress:
        report.contract?.source.implementationAddress ?? null,
      isRouterOrExecutor: false,
      isPairOrLp: false,
      confidence: risk.confidence,
    },
    token: {
      name: markdownText(report.token.name),
      symbol: markdownText(report.token.symbol),
      decimals: report.token.decimals,
      totalSupply: report.token.totalSupply,
      vaultAssetAddress: report.token.vaultAssetAddress,
      totalAssets: report.token.totalAssets,
      owner: null,
      deployer: report.contract?.creation.deployerAddress ?? null,
    },
    selectors,
    revertStrings: extractPrintableStrings(runtimeBytecode),
    hardcodedAddresses: extractPush20Addresses(runtimeBytecode),
    ownership: {
      owner: null,
      renounced: null,
      ownerGetterFound: selectors.admin.some(
        (selector) => selector.selector === "0x8da5cb5b",
      ),
      hiddenAdminSuspected: null,
      adminMappingsSuspected: null,
      dangerousFunctionsOutsideOwner: [],
      evidenceStatus: "not_collected",
    },
    supply: {
      deployerInitialPercent: null,
      deployerCurrentPercent: null,
      contractCurrentPercent: null,
      topHolders: [],
      mintFunctionsDetected: selectors.dangerous.some((selector) =>
        selector.signature.toLowerCase().includes("mint"),
      ),
      ownerMintDetected: null,
      publicMintDetected: selectors.dangerous.some(
        (selector) => selector.selector === "0xd0febe4c",
      ),
      fakeBurnMintDetected: null,
      maxSupplyDetected: null,
      evidenceStatus: "selector_watchlist_only",
    },
    transferControls: {
      tradingGateDetected: null,
      pauseDetected: selectors.dangerous.some(
        (selector) => selector.selector === "0x5c975abb",
      ),
      blacklistDetected: null,
      whitelistDetected: null,
      lpSellBlockSuspected: null,
      cooldownDetected: null,
      holdTimeDetected: null,
      maxTxDetected: null,
      maxWalletDetected: null,
      ownerExemptionsDetected: null,
      evidenceStatus: "not_collected",
    },
    fees: {
      feeLogicDetected: null,
      ownerCanChangeFees: null,
      maxFeeDetectedBps: null,
      buyFeeBps: null,
      sellFeeBps: null,
      transferFeeBps: null,
      feeExemptionsDetected: null,
      feeRecipients: [],
      evidenceStatus: "not_collected",
    },
    dex: {
      pairsFound: [],
      routersFound: [],
      factoriesFound: [],
      lpLocked: null,
      lpBurned: null,
      removeLiquidityFunctionDetected: selectors.dangerous.some(
        (selector) => selector.selector === "0xbaa2abde",
      ),
      contractCanRemoveLiquidity: null,
      evidenceStatus: "not_collected",
    },
    simulation: {
      buy: null,
      sell: null,
      walletTransfer: null,
      transferToPair: null,
      approveRouter: null,
      honeypotSuspected: null,
      sellTaxBps: null,
      buyTaxBps: null,
      evidenceStatus: "not_collected",
    },
    findings: buildFeatureFindings(report, selectors),
    criticalChecks: buildCriticalChecks(report, selectors),
    risk,
    warnings: report.warnings.map(markdownText),
    errors: report.errors.map(markdownText),
  };
}

function summarizeRuntimeBytecode(runtimeBytecode: `0x${string}` | null) {
  if (!runtimeBytecode) {
    return {
      runtimeSize: 0,
      runtimeHash: null,
      runtimeHashNoMetadata: null,
      metadataDetected: false,
      metadataLength: null,
      metadataHashType: "none",
      compilerVersion: null,
    };
  }

  const metadata = stripSolidityMetadata(runtimeBytecode);
  return {
    runtimeSize: hexByteLength(runtimeBytecode),
    runtimeHash: keccak256(runtimeBytecode),
    runtimeHashNoMetadata: keccak256(metadata.stripped),
    metadataDetected: metadata.metadataDetected,
    metadataLength: metadata.metadataLength,
    metadataHashType: metadata.metadataHashType,
    compilerVersion: metadata.compilerVersion,
  };
}

function stripSolidityMetadata(bytecode: `0x${string}`): {
  stripped: `0x${string}`;
  metadataHex: string | null;
  metadataLength: number | null;
  metadataDetected: boolean;
  metadataHashType: "bzzr0" | "bzzr1" | "ipfs" | "none" | "unknown";
  compilerVersion: string | null;
} {
  const hex = bytecode.slice(2).toLowerCase();
  if (hex.length < 8) {
    return {
      stripped: bytecode,
      metadataHex: null,
      metadataLength: null,
      metadataDetected: false,
      metadataHashType: "none",
      compilerVersion: null,
    };
  }

  const metadataLength = Number.parseInt(hex.slice(-4), 16);
  const metadataStart = hex.length - 4 - metadataLength * 2;
  if (
    !Number.isFinite(metadataLength) ||
    metadataLength <= 0 ||
    metadataStart < 0
  ) {
    return {
      stripped: bytecode,
      metadataHex: null,
      metadataLength: null,
      metadataDetected: false,
      metadataHashType: "none",
      compilerVersion: null,
    };
  }

  const metadataHex = hex.slice(metadataStart, hex.length - 4);
  const cborMapPrefix = metadataHex.slice(0, 2);
  const metadataDetected = cborMapPrefix === "a1" || cborMapPrefix === "a2";
  if (!metadataDetected) {
    return {
      stripped: bytecode,
      metadataHex: null,
      metadataLength: null,
      metadataDetected: false,
      metadataHashType: "none",
      compilerVersion: null,
    };
  }

  return {
    stripped: `0x${hex.slice(0, metadataStart)}`,
    metadataHex,
    metadataLength,
    metadataDetected: true,
    metadataHashType: detectMetadataHashType(metadataHex),
    compilerVersion: detectSolcVersion(metadataHex),
  };
}

function detectMetadataHashType(
  metadataHex: string,
): "bzzr0" | "bzzr1" | "ipfs" | "none" | "unknown" {
  if (metadataHex.includes("69706673")) return "ipfs";
  if (metadataHex.includes("627a7a7230")) return "bzzr0";
  if (metadataHex.includes("627a7a7231")) return "bzzr1";
  return metadataHex ? "unknown" : "none";
}

function detectSolcVersion(metadataHex: string): string | null {
  const solcMarker = "64736f6c6343";
  const markerIndex = metadataHex.indexOf(solcMarker);
  const versionStart = markerIndex + solcMarker.length;
  if (markerIndex < 0 || metadataHex.length < versionStart + 6) return null;
  const major = Number.parseInt(metadataHex.slice(versionStart, versionStart + 2), 16);
  const minor = Number.parseInt(
    metadataHex.slice(versionStart + 2, versionStart + 4),
    16,
  );
  const patch = Number.parseInt(
    metadataHex.slice(versionStart + 4, versionStart + 6),
    16,
  );
  if ([major, minor, patch].some((value) => Number.isNaN(value))) return null;
  return `${major}.${minor}.${patch}`;
}

function summarizeSelectors(runtimeBytecode: `0x${string}` | null) {
  const all = extractPush4Selectors(runtimeBytecode);
  const mapped = all.map((selector) => {
    const known =
      selector in SELECTOR_WATCHLIST
        ? SELECTOR_WATCHLIST[selector as keyof typeof SELECTOR_WATCHLIST]
        : undefined;
    return {
      selector,
      possibleSignatures: known ? [known.signature] : [],
      signature: known?.signature ?? "unknown",
      source: ["push4"],
      classification: known?.bucket ?? "unknown",
      label: known?.label ?? "Unknown PUSH4 selector",
      confidence: known ? 55 : 30,
    };
  });

  return {
    all: mapped.slice(0, 120),
    standard: mapped.filter((item) => item.classification === "standard"),
    admin: mapped.filter((item) => item.classification === "admin"),
    dangerous: mapped.filter((item) => item.classification === "dangerous"),
    unknown: mapped.filter((item) => item.classification === "unknown"),
    externalCallSelectors: [],
    evidenceNote:
      "Selectors are extracted from PUSH4 constants in runtime bytecode. They are clues only until behavior is confirmed.",
  };
}

function extractPush4Selectors(runtimeBytecode: `0x${string}` | null): string[] {
  if (!runtimeBytecode) return [];
  const hex = runtimeBytecode.slice(2).toLowerCase();
  const selectors = new Set<string>();

  for (let index = 0; index <= hex.length - 10; index += 2) {
    if (hex.slice(index, index + 2) === "63") {
      selectors.add(`0x${hex.slice(index + 2, index + 10)}`);
    }
  }

  return Array.from(selectors).sort();
}

function extractPush20Addresses(runtimeBytecode: `0x${string}` | null) {
  if (!runtimeBytecode) return [];
  const hex = runtimeBytecode.slice(2).toLowerCase();
  const addresses = new Set<Address>();

  for (let index = 0; index <= hex.length - 42; index += 2) {
    if (hex.slice(index, index + 2) !== "73") continue;
    const candidate = `0x${hex.slice(index + 2, index + 42)}`;
    if (isAddress(candidate)) addresses.add(getAddress(candidate));
  }

  return Array.from(addresses)
    .slice(0, 80)
    .map((address) => ({
      address,
      source: "runtime-push20",
      classification: classifyHardcodedAddress(address),
      knownLabel: null,
      risk: classifyHardcodedAddress(address) === "burn" ? "low" : "unknown",
    }));
}

function classifyHardcodedAddress(address: Address): "burn" | "unknown" {
  const lower = address.toLowerCase();
  if (
    lower === "0x0000000000000000000000000000000000000000" ||
    lower === "0x000000000000000000000000000000000000dead"
  ) {
    return "burn";
  }
  return "unknown";
}

function extractPrintableStrings(runtimeBytecode: `0x${string}` | null): string[] {
  if (!runtimeBytecode) return [];
  const hex = runtimeBytecode.slice(2);
  const strings = new Set<string>();
  let current = "";

  for (let index = 0; index <= hex.length - 2; index += 2) {
    const byte = Number.parseInt(hex.slice(index, index + 2), 16);
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= 4) strings.add(current.slice(0, 120));
      current = "";
    }
  }
  if (current.length >= 4) strings.add(current.slice(0, 120));

  return Array.from(strings)
    .filter((value) =>
      /trading|blacklist|bot|cooldown|max|wallet|transaction|sell|authorized|owner|paused|blocked|hold|fee|limit|mint|burn/i.test(
        value,
      ),
    )
    .slice(0, 40)
    .map(markdownText);
}

function classifyTokenStandard(report: TokenContractReportResponse): string {
  if (report.standards.hybrid) return "hybrid";
  if (report.standards.erc4626) return "erc4626";
  if (report.standards.erc20Like) return "erc20";
  if (report.standards.erc721) return "erc721";
  if (report.standards.erc1155) return "erc1155";
  if (report.standards.erc6909 === "detected") return "erc6909_limited";
  return report.contract?.hasBytecode ? "unknown" : "not_contract";
}

function buildFeatureFindings(
  report: TokenContractReportResponse,
  selectors: ReturnType<typeof summarizeSelectors>,
) {
  const findings: FeatureFinding[] = report.signals
    .filter(
      (signal) =>
        signal.severity !== "info" ||
        signal.status === "incomplete" ||
        signal.id === "source-status",
    )
    .map((signal) => ({
      id: signal.id,
      title: markdownText(signal.label),
      category: findingCategory(signal.id),
      severity: signal.severity,
      confidence: signalConfidence(signal),
      evidence: [
        {
          type: signal.status === "incomplete" ? "missing-evidence" : "report-signal",
          value: markdownText(signal.evidence),
          meaning: signal.status,
        },
      ],
      description: markdownText(signal.evidence),
      practicalEffect: practicalEffectForSignal(signal),
      recommendation:
        signal.status === "incomplete"
          ? "Treat this area as unresolved until deeper bytecode or simulation checks are available."
          : "Review the supporting evidence on-chain before trusting the contract.",
    }));

  for (const selector of selectors.dangerous) {
    findings.push({
      id: `selector-${selector.selector}`,
      title: `${selector.label}: ${selector.signature}`,
      category: "selector-watchlist",
      severity: "medium",
      confidence: 45,
      evidence: [
        {
          type: "selector",
          value: selector.selector,
          meaning:
            "Runtime bytecode contains this PUSH4 selector. Selector names can collide and require behavior confirmation.",
        },
      ],
      description: `${selector.signature} appears in the runtime selector set.`,
      practicalEffect:
        "This may indicate mint, burn, pause, proxy, or liquidity-removal behavior, but v1 has not confirmed the execution path.",
      recommendation:
        "Confirm behavior with source review, storage reads, or simulation before treating the selector as confirmed.",
    });
  }

  return findings;
}

function buildCriticalChecks(
  report: TokenContractReportResponse,
  selectors: ReturnType<typeof summarizeSelectors>,
) {
  const hasSelector = (needle: string) =>
    selectors.dangerous.some((selector) => selector.selector === needle) ||
    selectors.admin.some((selector) => selector.selector === needle);
  const mintSelector = selectors.dangerous.find((selector) =>
    selector.signature.toLowerCase().includes("mint"),
  );
  const sourceStatus = report.contract?.source.verified ?? "unknown";

  return [
    criticalCheck(
      "Can anyone mint?",
      mintSelector?.selector === "0xd0febe4c" ? "needs_review" : "not_collected",
      mintSelector
        ? `Mint-like selector ${mintSelector.selector} was found, but v1 has not confirmed permissions or behavior.`
        : "Mint bytecode behavior and public mint permissions are not collected in v1.",
    ),
    criticalCheck(
      "Can owner mint?",
      mintSelector ? "needs_review" : "not_collected",
      mintSelector
        ? `Mint-like selector ${mintSelector.selector} was found, but owner gating was not confirmed.`
        : "Owner mint behavior is not collected in v1.",
    ),
    criticalCheck(
      "Can a fake burn mint?",
      hasSelector("0x42966c68") || hasSelector("0x79cc6790")
        ? "needs_review"
        : "not_collected",
      "Burn selector clues do not prove supply decreases or fake-burn behavior; v1 does not simulate burn paths.",
    ),
    criticalCheck(
      "Can owner blacklist wallets?",
      "not_collected",
      "Blacklist mapping and transfer-path analysis are not collected in v1.",
    ),
    criticalCheck(
      "Can owner block the LP pair?",
      "not_collected",
      "LP-pair block analysis requires transfer-path and DEX-pair detection, which are not collected in v1.",
    ),
    criticalCheck(
      "Can normal users sell after buying?",
      "not_collected",
      "Buy/sell simulation is not collected in v1.",
    ),
    criticalCheck(
      "Can owner sell when users cannot?",
      "not_collected",
      "Owner-vs-user sell simulation is not collected in v1.",
    ),
    criticalCheck(
      "Can owner set fees very high?",
      "not_collected",
      "Fee setter and fee math extraction are not collected in v1.",
    ),
    criticalCheck(
      "Can owner pause or freeze transfers?",
      hasSelector("0x5c975abb") ? "needs_review" : "not_collected",
      hasSelector("0x5c975abb")
        ? "Pause-state selector was found, but pause control and transfer effects are not confirmed."
        : "Pause/freeze transfer-path behavior is not collected in v1.",
    ),
    criticalCheck(
      "Does renounce actually remove dangerous control?",
      "not_collected",
      "Hidden-admin and post-renounce control analysis are not collected in v1.",
    ),
    criticalCheck(
      "Is the contract upgradeable?",
      report.contract?.source.isProxy === true
        ? "confirmed"
        : report.contract?.source.isProxy === false
          ? "not_detected"
          : hasSelector("0x3659cfe6") || hasSelector("0x5c60da1b")
            ? "needs_review"
            : "unknown",
      report.contract?.source.isProxy === true
        ? "Explorer metadata reports a proxy-like contract."
        : "Upgradeable proxy status is based on explorer metadata and selector clues only.",
    ),
    criticalCheck(
      "Is there hidden admin outside owner()?",
      "not_collected",
      "Owner-like storage and hidden admin mapping analysis are not collected in v1.",
    ),
    criticalCheck(
      "Is LP locked or removable?",
      hasSelector("0xbaa2abde") ? "needs_review" : "not_collected",
      hasSelector("0xbaa2abde")
        ? "removeLiquidity selector clue found; LP ownership and call path are not confirmed."
        : "LP ownership, locks, burns, and remover paths are not collected in v1.",
    ),
    criticalCheck(
      "Does the contract have a removeLiquidity wrapper?",
      hasSelector("0xbaa2abde") ? "needs_review" : "not_collected",
      "Selector evidence is a clue only; wrapper behavior is not confirmed in v1.",
    ),
    criticalCheck(
      "Are there hardcoded fee-exempt or blocked wallets?",
      "not_collected",
      "Hardcoded PUSH20 addresses are extracted, but their fee/block roles are not classified in v1.",
    ),
    criticalCheck(
      "Does source verification exist?",
      sourceStatus === "verified"
        ? "confirmed"
        : sourceStatus === "unverified"
          ? "not_detected"
          : "unknown",
      `Explorer source verification status is ${sourceStatus}.`,
    ),
    criticalCheck(
      "Does bytecode match a known risky template?",
      "not_collected",
      "Template fingerprint matching is not collected in v1.",
    ),
  ];
}

function criticalCheck(
  question: string,
  status: "confirmed" | "needs_review" | "not_collected" | "not_detected" | "unknown",
  evidence: string,
) {
  return { question, status, evidence };
}

function summarizeFeatureRisk(report: TokenContractReportResponse) {
  let score = 0;
  const reasons: string[] = [];

  for (const signal of report.signals) {
    if (signal.severity === "high") score += 30;
    if (signal.severity === "medium") score += 15;
    if (signal.severity === "low") score += 5;
    if (signal.status === "incomplete") score += 10;
  }
  if (report.contract?.source.verified === "unverified") {
    score += 10;
    reasons.push("source is unverified");
  }
  if (report.contract?.source.isProxy) {
    score += 20;
    reasons.push("explorer reports proxy-like behavior");
  }
  if (report.status !== "complete") {
    score += 20;
    reasons.push("supported token behavior was not fully confirmed");
  }
  if (report.warnings.length > 1) {
    score += 5;
    reasons.push("report has unresolved warnings");
  }

  const boundedScore = Math.min(score, 100);
  const confidence = featureConfidence(report);
  const shallow = report.status !== "complete" || confidence < 55;

  return {
    overallSeverity: shallow ? "unknown" : severityFromScore(boundedScore),
    overallScore: boundedScore,
    confidence,
    confidenceReason:
      reasons.length > 0
        ? reasons.join("; ")
        : "v1 confidence is based on bytecode presence, source metadata, and standard getter reads only.",
  };
}

function featureConfidence(report: TokenContractReportResponse): number {
  let confidence = report.contract?.hasBytecode ? 45 : 20;
  if (report.contract?.source.verified === "verified") confidence += 15;
  if (report.contract?.source.verified === "unverified") confidence -= 10;
  if (report.status === "complete") confidence += 15;
  if (report.standards.erc20Like) confidence += 10;
  if (report.standards.erc721 || report.standards.erc1155) confidence += 8;
  confidence -= report.signals.filter((signal) => signal.status === "incomplete").length * 5;
  return Math.max(0, Math.min(confidence, 85));
}

function severityFromScore(score: number): "critical" | "high" | "low" | "medium" {
  if (score >= 70) return "critical";
  if (score >= 40) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function signalConfidence(signal: TokenContractReportSignal): number {
  const base =
    signal.severity === "high"
      ? 80
      : signal.severity === "medium"
        ? 70
        : signal.severity === "low"
          ? 55
          : 90;
  return signal.status === "incomplete" ? Math.max(30, base - 20) : base;
}

function findingCategory(id: string): string {
  if (id.includes("source")) return "verification";
  if (id.includes("proxy")) return "proxy";
  if (id.includes("erc") || id.includes("standard")) return "classification";
  if (id.includes("hybrid")) return "classification";
  return "evidence";
}

function practicalEffectForSignal(signal: TokenContractReportSignal): string {
  if (signal.id === "source-status" && signal.severity !== "info") {
    return "Without verified source, confidence is reduced and bytecode/simulation checks matter more.";
  }
  if (signal.id.includes("proxy")) {
    return "Implementation behavior may change if an authorized proxy admin can upgrade the contract.";
  }
  if (signal.status === "incomplete") {
    return "This area needs deeper extraction before risk can be cleared.";
  }
  return "This is context for manual review; it is not proof that the token is safe.";
}

function parseDeepSeekAuditJson(content: string): Record<string, unknown> | null {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(jsonText) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function renderDeepSeekAuditMarkdown(
  payload: Record<string, unknown>,
  report: TokenContractReportResponse,
): string {
  const lines: string[] = [];
  const title = shortText(payload.title) ?? "Token Contract Report";
  const verdict = shortText(payload.overallVerdict) ?? "unknown risk";
  const confidence = numericValue(payload.confidence);
  const confidenceReason = shortText(payload.confidenceReason);

  lines.push(`## ${markdownText(title)}`);
  lines.push("");
  lines.push(`**Overall verdict:** ${markdownText(verdict)}`);
  if (confidence !== null) {
    lines.push(`**Confidence:** ${confidence}/100`);
  }
  if (confidenceReason) {
    lines.push(`**Confidence reason:** ${markdownText(confidenceReason)}`);
  }
  lines.push("");
  lines.push("### Token Identity");
  lines.push(`- Contract: ${markdownText(report.contract?.address ?? "Unavailable")}`);
  lines.push(`- Chain: ${markdownText(report.chain?.name ?? "Unavailable")}`);
  lines.push(
    `- Deployer: ${markdownText(
      report.contract?.creation.deployerAddress ?? "Unavailable",
    )}`,
  );
  lines.push(
    `- Creation tx: ${markdownText(
      report.contract?.creation.transactionHash ?? "Unavailable",
    )}`,
  );
  lines.push(`- Name: ${markdownText(shortText(payload.tokenName) ?? report.token.name ?? "Unavailable")}`);
  lines.push(`- Symbol: ${markdownText(shortText(payload.tokenSymbol) ?? report.token.symbol ?? "Unavailable")}`);
  lines.push(
    `- Decimals: ${report.token.decimals === null ? "Unavailable" : report.token.decimals}`,
  );
  lines.push(`- Total supply: ${markdownText(report.token.totalSupply ?? "Unavailable")}`);

  appendListSection(lines, "Main Risks", stringList(payload.mainRisks));
  appendFindingSection(lines, payload.detailedFindings);
  appendListSection(lines, "What Was Not Seen", stringList(payload.whatNotSeen));
  appendListSection(
    lines,
    "Selector Watchlist",
    stringList(payload.selectorWatchlist),
  );
  appendListSection(
    lines,
    "What To Verify On-Chain",
    stringList(payload.whatToCheckOnChain),
  );

  const bottomLine = shortText(payload.bottomLine);
  if (bottomLine) {
    lines.push("");
    lines.push("### Bottom Line");
    lines.push(markdownText(bottomLine));
  }

  return lines.join("\n").trim();
}

function appendListSection(lines: string[], title: string, values: string[]) {
  if (values.length === 0) return;
  lines.push("");
  lines.push(`### ${title}`);
  for (const value of values.slice(0, 12)) {
    lines.push(`- ${markdownText(value)}`);
  }
}

function appendFindingSection(lines: string[], value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return;
  lines.push("");
  lines.push("### Detailed Findings");
  for (const item of value.slice(0, 8)) {
    if (!item || typeof item !== "object") continue;
    const finding = item as Record<string, unknown>;
    const severity = shortText(finding.severity) ?? "info";
    const heading = shortText(finding.heading) ?? "Finding";
    lines.push(`- **${markdownText(severity.toUpperCase())}: ${markdownText(heading)}**`);
    for (const evidence of stringList(finding.evidence).slice(0, 4)) {
      lines.push(`  Evidence: ${markdownText(evidence)}`);
    }
    const description = shortText(finding.description);
    if (description) lines.push(`  Detail: ${markdownText(description)}`);
    const practicalEffect = shortText(finding.practicalEffect);
    if (practicalEffect) {
      lines.push(`  Practical effect: ${markdownText(practicalEffect)}`);
    }
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 20);
}

function shortText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

function numericValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(Math.round(value), 100));
}

function hexByteLength(value: `0x${string}`): number {
  return Math.max(0, Math.floor((value.length - 2) / 2));
}

function addSourceSignals(
  signals: TokenContractReportSignal[],
  source: SourceMetadata,
) {
  signals.push(
    signalItem({
      id: "source-status",
      label: "Explorer source status",
      severity:
        source.verified === "verified"
          ? "info"
          : source.verified === "unverified"
            ? "medium"
            : "low",
      evidence:
        source.verified === "verified"
          ? `Explorer source metadata is verified${source.contractName ? ` for ${source.contractName}` : ""}.`
          : source.verified === "unverified"
            ? "Explorer source metadata is not verified for this contract."
            : "Explorer source metadata was not available from the configured source.",
      status: source.verified === "unknown" ? "incomplete" : "complete",
    }),
  );

  if (source.isProxy === true) {
    signals.push(
      signalItem({
        id: "proxy-contract",
        label: "Proxy-like contract",
        severity: "medium",
        evidence: source.implementationAddress
          ? `Explorer metadata reports a proxy with implementation ${source.implementationAddress}.`
          : "Explorer metadata reports this contract as proxy-like.",
      }),
    );
  }
}

function addCreationSignals(
  signals: TokenContractReportSignal[],
  creation: CreationMetadata,
) {
  if (creation.transactionHash && creation.deployerAddress) {
    signals.push(
      signalItem({
        id: "contract-creation",
        label: "Contract creation metadata",
        severity: "info",
        evidence: `Explorer metadata reports deployer ${creation.deployerAddress} and creation transaction ${creation.transactionHash}.`,
      }),
    );
    return;
  }

  signals.push(
    signalItem({
      id: "contract-creation-unavailable",
      label: "Contract creation metadata unavailable",
      severity: "low",
      evidence:
        "Explorer metadata did not provide both a deployer wallet and creation transaction for this contract.",
      status: "incomplete",
    }),
  );
}

function addStandardSignals(
  signals: TokenContractReportSignal[],
  input: {
    chain: ResolvedTokenReportChain;
    erc20Like: boolean;
    erc721: boolean;
    erc1155: boolean;
    erc4626Detected: boolean;
    erc6909: Erc6909DetectionStatus;
    hybrid: boolean;
    erc20: Awaited<ReturnType<typeof readErc20Like>>;
    erc4626Read:
      | ReturnType<typeof emptyErc4626Read>
      | Awaited<ReturnType<typeof readErc4626>>;
  },
) {
  if (input.erc20Like) {
    signals.push(
      signalItem({
        id: "erc20-like",
        label: `${input.chain.standardLabels.fungible} compatible reads`,
        severity: "info",
        evidence: `Fungible token reads returned ${[
          input.erc20.name ? `name ${input.erc20.name}` : null,
          input.erc20.symbol ? `symbol ${input.erc20.symbol}` : null,
          input.erc20.decimals !== null ? `decimals ${input.erc20.decimals}` : null,
          input.erc20.totalSupply ? "totalSupply" : null,
        ]
          .filter(Boolean)
          .join(", ")}.`,
      }),
    );
  }
  if (input.erc721) {
    signals.push(
      signalItem({
        id: "erc721",
        label: `${input.chain.standardLabels.nft} interface`,
        severity: "info",
        evidence: "supportsInterface returned true for ERC-721.",
      }),
    );
  }
  if (input.erc1155) {
    signals.push(
      signalItem({
        id: "erc1155",
        label: `${input.chain.standardLabels.multiToken} interface`,
        severity: "info",
        evidence: "supportsInterface returned true for ERC-1155.",
      }),
    );
  }
  if (input.erc4626Detected) {
    signals.push(
      signalItem({
        id: "erc4626",
        label: "ERC-4626 vault signals",
        severity: "medium",
        evidence: input.erc4626Read.asset
          ? `Vault asset read returned ${input.erc4626Read.asset}.`
          : "Vault-style reads returned data.",
      }),
    );
  }
  if (input.erc6909 === "detected") {
    signals.push(
      signalItem({
        id: "erc6909",
        label: "ERC-6909-like function surface",
        severity: "medium",
        evidence:
          "Verified ABI summary includes ERC-6909-style operator or allowance functions. Current allowance coverage is limited.",
      }),
    );
  } else if (input.erc6909 === "limited") {
    signals.push(
      signalItem({
        id: "erc6909-limited",
        label: "ERC-6909 coverage limited",
        severity: "low",
        evidence:
          "Source/ABI metadata was unavailable, so ERC-6909 detection is limited.",
        status: "incomplete",
      }),
    );
  }
  if (input.hybrid) {
    signals.push(
      signalItem({
        id: "hybrid-token",
        label: "Hybrid token signals",
        severity: "medium",
        evidence:
          "Multiple token-standard probes returned positive results. Review the contract behavior directly before relying on labels.",
      }),
    );
  }
}

function signalItem(input: {
  id: string;
  label: string;
  severity: TokenContractReportSignal["severity"];
  evidence: string;
  status?: TokenContractReportSignal["status"];
}): TokenContractReportSignal {
  return {
    id: input.id,
    label: input.label,
    severity: input.severity,
    evidence: input.evidence,
    status: input.status ?? "complete",
  };
}

async function readProbe<T>(
  action: () => Promise<T>,
  label: string,
): Promise<ProbeResult<T>> {
  try {
    const value = await withTimeout(
      action(),
      TOKEN_REPORT_READ_TIMEOUT_MS,
      `${label} timed out`,
    );
    return { ok: true, value, error: null };
  } catch (error) {
    return {
      ok: false,
      value: null,
      error: `${label} read failed: ${redactSensitiveErrorText(
        error instanceof Error ? error.message : String(error),
      )}`,
    };
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timeout) clearTimeout(timeout);
    }),
    new Promise<T>((_, reject) => {
      timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function emptySourceMetadata(): SourceMetadata {
  return {
    verified: "unknown",
    contractName: null,
    isProxy: null,
    implementationAddress: null,
    abiFunctionNames: [],
    warnings: [],
  };
}

function emptyCreationMetadata(): CreationMetadata {
  return {
    transactionHash: null,
    deployerAddress: null,
    blockNumber: null,
    timestamp: null,
    warnings: [],
  };
}

function summarizeAbiFunctionNames(abi: string | undefined): string[] {
  if (!abi || /not verified/i.test(abi)) return [];
  try {
    const parsed = JSON.parse(abi) as unknown;
    if (!Array.isArray(parsed)) return [];
    const names = parsed
      .filter(
        (item): item is { type?: string; name?: string } =>
          typeof item === "object" && item !== null,
      )
      .filter((item) => item.type === "function" && typeof item.name === "string")
      .map((item) => item.name!)
      .slice(0, 80);
    return Array.from(new Set(names));
  } catch {
    return [];
  }
}

function valueAsShortString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}

function normalizedAddressFromUnknown(value: unknown): Address | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return null;
  return getAddress(trimmed);
}

function normalizedTxHashFromUnknown(value: unknown): `0x${string}` | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(trimmed)) return null;
  return trimmed as `0x${string}`;
}

function integerFromUnknown(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function timestampFromUnknown(value: unknown): string | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  const milliseconds = parsed > 10_000_000_000 ? parsed : parsed * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function chainSummary(chain: ResolvedTokenReportChain) {
  return {
    chainId: chain.chainId,
    name: chain.name,
    explorerName: chain.explorerName,
  };
}

function emptyStandards(): TokenContractReportResponse["standards"] {
  return {
    erc20Like: false,
    erc721: false,
    erc1155: false,
    erc4626: false,
    erc6909: "not_detected",
    hybrid: false,
  };
}

function emptyToken(): TokenContractReportResponse["token"] {
  return {
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
    vaultAssetAddress: null,
    totalAssets: null,
  };
}

function emptyAi(
  status: TokenContractReportResponse["ai"]["status"],
  model: string | null = null,
): TokenContractReportResponse["ai"] {
  return {
    status,
    model,
    markdown: null,
  };
}

function emptyReport({
  status,
  errors,
  chain = null,
}: {
  status: TokenContractReportResponse["status"];
  errors: string[];
  chain?: ResolvedTokenReportChain | null;
}): TokenContractReportResponse {
  return {
    ok: false,
    status,
    chain: chain ? chainSummary(chain) : null,
    contract: null,
    standards: emptyStandards(),
    token: emptyToken(),
    signals: [],
    ai: emptyAi("skipped"),
    warnings: [],
    errors,
    missingConfig: [],
  };
}

function firstEnv(
  env: NodeJS.ProcessEnv,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = cleanEnv(env[name]);
    if (value) return value;
  }
  return undefined;
}

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function validHttpUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return undefined;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function redactSensitiveErrorText(value: string): string {
  return value
    .replace(/([?&]apikey=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]api_key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/([?&]key=)[^&\s)]+/gi, "$1[redacted]")
    .replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]");
}
