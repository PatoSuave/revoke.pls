import { getAddress, type Address } from "viem";

export type Erc4337EntryPointVersion = "v0.6" | "v0.7" | "v0.8";

export interface Erc4337EntryPointTarget {
  version: Erc4337EntryPointVersion;
  address: Address;
  source: string;
}

function entryPoint(
  version: Erc4337EntryPointVersion,
  address: string,
  source: string,
): Erc4337EntryPointTarget {
  return {
    version,
    address: getAddress(address),
    source,
  };
}

// Sources:
// - ERC-4337 docs describe the singleton EntryPoint role.
// - Alchemy account-abstraction docs list the v0.6, v0.7, and v0.8 EntryPoint addresses.
export const ERC4337_ENTRY_POINTS: readonly Erc4337EntryPointTarget[] = [
  entryPoint(
    "v0.6",
    "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
    "https://docs.erc4337.io/smart-accounts/entrypoint-explainer.html",
  ),
  entryPoint(
    "v0.7",
    "0x0000000071727de22E5E9d8BAf0edAc6f37da032",
    "https://www.alchemy.com/docs/wallets/reference/entrypoint-addresses",
  ),
  entryPoint(
    "v0.8",
    "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108",
    "https://www.alchemy.com/docs/wallets/reference/entrypoint-addresses",
  ),
];
