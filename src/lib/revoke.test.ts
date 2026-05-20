import { describe, expect, it } from "vitest";
import type { Address } from "viem";

import { buildRevokeCall, getWalletRevokeBlockReason } from "./revoke";
import { PERMIT2_ADDRESS } from "./permit2";

const OWNER = "0x1111111111111111111111111111111111111111" as Address;
const OTHER = "0x2222222222222222222222222222222222222222" as Address;
const TOKEN = "0x3333333333333333333333333333333333333333" as Address;
const SPENDER = "0x4444444444444444444444444444444444444444" as Address;

describe("ERC-20 revoke helpers", () => {
  it("builds an ERC-20 revoke with approve(spender, 0) against the token contract", () => {
    expect(
      buildRevokeCall({
        chainId: 369,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
      }),
    ).toMatchObject({
      address: TOKEN,
      functionName: "approve",
      args: [SPENDER, 0n],
    });
  });

  it("builds a Permit2 revoke against the Permit2 contract", () => {
    expect(
      buildRevokeCall({
        chainId: 1,
        tokenAddress: TOKEN,
        spenderAddress: SPENDER,
        approvalKind: "permit2",
      }),
    ).toMatchObject({
      address: PERMIT2_ADDRESS,
      functionName: "approve",
      args: [TOKEN, SPENDER, 0n, 0n],
    });
  });

  it("allows wallet revoke only when owner and chain match exactly", () => {
    expect(
      getWalletRevokeBlockReason({
        connectedAddress: OWNER,
        ownerAddress: OWNER,
        walletChainId: 369,
        targetChainId: 369,
      }),
    ).toBeNull();
  });

  it("blocks wallet revoke when the connected wallet does not match the scanned owner", () => {
    expect(
      getWalletRevokeBlockReason({
        connectedAddress: OTHER,
        ownerAddress: OWNER,
        walletChainId: 369,
        targetChainId: 369,
      }),
    ).toContain("does not match");
  });

  it("blocks wallet revoke when the connected wallet chain is wrong", () => {
    expect(
      getWalletRevokeBlockReason({
        connectedAddress: OWNER,
        ownerAddress: OWNER,
        walletChainId: 1,
        targetChainId: 369,
      }),
    ).toBe("Switch the connected wallet to chain 369 before revoking.");
  });
});
