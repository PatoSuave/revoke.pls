import type { Address, PublicClient } from "viem";

import type { NftApproval } from "@/lib/nft-approvals";
import { ZERO_ADDRESS } from "@/lib/nft-approvals";
import {
  buildErc20PreflightRead,
  buildNftPreflightRead,
} from "@/lib/preflight";
import type { RevokeTarget } from "@/lib/revoke";

export type PostRevokeVerificationState =
  | "not-run"
  | "pending"
  | "confirmed-cleared"
  | "incomplete"
  | "failed"
  | "mismatch";

export interface PostRevokeVerificationResult {
  state: Exclude<PostRevokeVerificationState, "not-run" | "pending">;
  error?: string;
}

export type PostRevokeReadClient = Pick<PublicClient, "readContract">;

export const POST_REVOKE_VERIFICATION_TIMEOUT_MS = 15_000;

export async function verifyErc20PostRevokeCleared({
  client,
  ownerAddress,
  target,
  timeoutMs = POST_REVOKE_VERIFICATION_TIMEOUT_MS,
}: {
  client: PostRevokeReadClient;
  ownerAddress: Address;
  target: RevokeTarget;
  timeoutMs?: number;
}): Promise<PostRevokeVerificationResult> {
  try {
    const result = await readWithTimeout(
      client.readContract(buildErc20PreflightRead(ownerAddress, target)),
      timeoutMs,
    );

    if (typeof result !== "bigint") {
      return {
        state: "incomplete",
        error: "Unexpected allowance read result",
      };
    }

    return { state: result === 0n ? "confirmed-cleared" : "mismatch" };
  } catch (error) {
    return { state: "failed", error: safeVerificationError(error) };
  }
}

export async function verifyNftPostRevokeCleared({
  client,
  ownerAddress,
  target,
  timeoutMs = POST_REVOKE_VERIFICATION_TIMEOUT_MS,
}: {
  client: PostRevokeReadClient;
  ownerAddress: Address;
  target: NftApproval;
  timeoutMs?: number;
}): Promise<PostRevokeVerificationResult> {
  try {
    const result = await readWithTimeout(
      client.readContract(buildNftPreflightRead(ownerAddress, target)),
      timeoutMs,
    );

    if (target.kind === "approvalForAll") {
      if (typeof result !== "boolean") {
        return {
          state: "incomplete",
          error: "Unexpected operator approval read result",
        };
      }

      return { state: result ? "mismatch" : "confirmed-cleared" };
    }

    if (typeof result !== "string") {
      return {
        state: "incomplete",
        error: "Unexpected token approval read result",
      };
    }

    return {
      state:
        result.toLowerCase() === ZERO_ADDRESS
          ? "confirmed-cleared"
          : "mismatch",
    };
  } catch (error) {
    return { state: "failed", error: safeVerificationError(error) };
  }
}

async function readWithTimeout<T>(
  read: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Post-revoke live verification timed out")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([read, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function safeVerificationError(error: unknown): string {
  if (!error || typeof error !== "object") return "Read error";
  const name =
    "name" in error && typeof error.name === "string"
      ? error.name.trim()
      : "";
  if (name) return name.slice(0, 80);
  const code = "code" in error ? error.code : undefined;
  if (typeof code === "string" || typeof code === "number") {
    return `code ${String(code).slice(0, 48)}`;
  }
  return "Read error";
}
