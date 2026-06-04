import { getAddress, isAddress, type Address } from "viem";

import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";

export type HyperEvmSystemContractCategory =
  | "system"
  | "wrapped-native-token";

export interface HyperEvmSystemContractMetadata {
  chainId: typeof HYPEREVM_CLIENT_CHAIN_ID;
  address: Address;
  label: string;
  category: HyperEvmSystemContractCategory;
  warning?: string;
}

export const HYPEREVM_CORE_WRITER_ADDRESS =
  "0x3333333333333333333333333333333333333333" as const;
export const HYPEREVM_HYPE_SYSTEM_ADDRESS =
  "0x2222222222222222222222222222222222222222" as const;
export const HYPEREVM_WHYPE_ADDRESS =
  "0x5555555555555555555555555555555555555555" as const;

export const HYPEREVM_SYSTEM_CONTRACTS: Record<
  string,
  HyperEvmSystemContractMetadata
> = {
  coreWriter: {
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    address: HYPEREVM_CORE_WRITER_ADDRESS,
    label: "HyperEVM CoreWriter",
    category: "system",
    warning:
      "CoreWriter can send actions to HyperCore. These actions may not appear as standard ERC-20 or NFT approvals.",
  },
  hypeSystem: {
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    address: HYPEREVM_HYPE_SYSTEM_ADDRESS,
    label: "HYPE System Address",
    category: "system",
  },
  whype: {
    chainId: HYPEREVM_CLIENT_CHAIN_ID,
    address: HYPEREVM_WHYPE_ADDRESS,
    label: "Wrapped HYPE",
    category: "wrapped-native-token",
  },
};

export function getHyperEvmSystemContractMetadata(
  address: string | undefined,
): HyperEvmSystemContractMetadata | undefined {
  const normalizedInput = address?.startsWith("0X")
    ? `0x${address.slice(2)}`
    : address;
  if (!normalizedInput || !isAddress(normalizedInput)) return undefined;
  const normalized = getAddress(normalizedInput);
  return Object.values(HYPEREVM_SYSTEM_CONTRACTS).find(
    (contract) => contract.address.toLowerCase() === normalized.toLowerCase(),
  );
}
