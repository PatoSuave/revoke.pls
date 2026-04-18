import { type Address, getAddress } from "viem";

/**
 * Dev-time sanity checks for registry entries.
 *
 * These run at module initialization for both the token and spender
 * registries. The goal is to catch obvious maintenance mistakes early:
 *
 *   - malformed or duplicate addresses
 *   - empty required strings
 *   - obviously bogus decimals
 *
 * The checks throw in development/test and log in production — a malformed
 * registry should never ship, but a hot-path throw at import-time in a
 * deployed environment would turn a data bug into an outage.
 */

export class RegistryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryValidationError";
  }
}

function report(error: RegistryValidationError): void {
  if (process.env.NODE_ENV === "production") {
    console.error(`[registry] ${error.message}`);
    return;
  }
  throw error;
}

function parseableAddress(address: string): boolean {
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
}

export function validateAddresses<T extends { address: Address }>(
  entries: readonly T[],
  kind: string,
): void {
  const seen = new Map<string, T>();
  for (const entry of entries) {
    if (!parseableAddress(entry.address)) {
      report(
        new RegistryValidationError(
          `${kind}: "${entry.address}" is not a valid EVM address`,
        ),
      );
      continue;
    }
    const key = entry.address.toLowerCase();
    if (seen.has(key)) {
      report(
        new RegistryValidationError(
          `${kind}: duplicate address ${entry.address}`,
        ),
      );
    } else {
      seen.set(key, entry);
    }
  }
}

export function validateRequiredStrings(
  record: Record<string, unknown>,
  fields: readonly string[],
  kind: string,
  identifier: string,
): void {
  for (const f of fields) {
    const value = record[f];
    if (typeof value !== "string" || value.trim().length === 0) {
      report(
        new RegistryValidationError(
          `${kind} (${identifier}): field "${f}" must be a non-empty string`,
        ),
      );
    }
  }
}

export function validateDecimals(
  decimals: number,
  kind: string,
  identifier: string,
): void {
  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 36
  ) {
    report(
      new RegistryValidationError(
        `${kind} (${identifier}): decimals must be an integer in [0, 36], got ${decimals}`,
      ),
    );
  }
}
