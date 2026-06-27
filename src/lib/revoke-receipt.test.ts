import { describe, expect, it } from "vitest";

import {
  LIVE_VERIFICATION_CONFIRMED_COPY,
  LIVE_VERIFICATION_INCOMPLETE_COPY,
  HYPEREVM_DUAL_BLOCK_TRANSACTION_COPY,
  PRECONFIRM_TRANSACTION_SEEN_COPY,
  ROLLUP_FINALITY_AWARE_TRANSACTION_COPY,
  TRANSACTION_SUBMITTED_INCOMPLETE_COPY,
  getRevokeReceiptCopy,
  revokeMethodLabel,
  revokeSummary,
} from "./revoke-receipt";
import {
  BASE_CHAIN_ID,
  BLAST_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  UNICHAIN_CHAIN_ID,
  WORLDCHAIN_CHAIN_ID,
} from "./chains";
import { HYPEREVM_CLIENT_CHAIN_ID } from "./hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "./optimism-approval-client";

describe("revoke receipt copy", () => {
  it("builds ERC-20 success receipt copy", () => {
    const copy = getRevokeReceiptCopy({
      status: "success",
      kind: "erc20",
    });

    expect(copy.title).toBe("Revoke confirmed");
    expect(copy.method).toBe("approve(spender, 0)");
    expect(copy.body).toBe(
      "This approval was revoked by setting the spender's allowance to zero.",
    );
    expect(copy.verification).toBe(LIVE_VERIFICATION_INCOMPLETE_COPY);
  });

  it("builds NFT operator success receipt copy", () => {
    const copy = getRevokeReceiptCopy({
      status: "success",
      kind: "nft-operator",
    });

    expect(copy.title).toBe("Revoke confirmed");
    expect(copy.method).toBe("setApprovalForAll(operator, false)");
    expect(copy.body).toBe("This operator approval was revoked.");
  });

  it("builds ERC-721 per-token success receipt copy", () => {
    const copy = getRevokeReceiptCopy({
      status: "success",
      kind: "nft-token",
    });

    expect(copy.title).toBe("Revoke confirmed");
    expect(copy.method).toBe("approve(address(0), tokenId)");
    expect(copy.body).toBe("This token-specific approval was revoked.");
  });

  it("separates submitted and verification-incomplete messaging", () => {
    const copy = getRevokeReceiptCopy({
      status: "pending",
      kind: "erc20",
    });

    expect(copy.title).toBe("Transaction submitted");
    expect(copy.body).toBe(TRANSACTION_SUBMITTED_INCOMPLETE_COPY);
    expect(copy.verification).toContain("Waiting for chain confirmation");
    expect(copy.verification).not.toContain("Confirmed cleared");
  });

  it("uses preconfirmation-aware pending copy on Base, Optimism, and Unichain", () => {
    for (const chainId of [
      BASE_CHAIN_ID,
      OPTIMISM_CLIENT_CHAIN_ID,
      UNICHAIN_CHAIN_ID,
    ]) {
      const copy = getRevokeReceiptCopy({
        status: "pending",
        kind: "erc20",
        chainId,
      });

      expect(copy.body).toBe(PRECONFIRM_TRANSACTION_SEEN_COPY);
      expect(copy.verification).toContain("standard confirmation");
      expect(copy.verification).not.toContain("Confirmed cleared");
    }
  });

  it("uses rollup finality-aware pending copy without marking rows cleared", () => {
    for (const chainId of [
      MANTLE_CHAIN_ID,
      LINEA_CHAIN_ID,
      BLAST_CHAIN_ID,
      WORLDCHAIN_CHAIN_ID,
    ]) {
      const copy = getRevokeReceiptCopy({
        status: "pending",
        kind: "erc20",
        chainId,
      });

      expect(copy.body).toBe(ROLLUP_FINALITY_AWARE_TRANSACTION_COPY);
      expect(copy.verification).toContain("live approval re-check");
      expect(copy.verification).not.toBe(LIVE_VERIFICATION_CONFIRMED_COPY);
    }
  });

  it("uses HyperEVM confirmation copy without marking rows cleared", () => {
    const copy = getRevokeReceiptCopy({
      status: "pending",
      kind: "erc20",
      chainId: HYPEREVM_CLIENT_CHAIN_ID,
    });

    expect(copy.body).toBe(HYPEREVM_DUAL_BLOCK_TRANSACTION_COPY);
    expect(copy.verification).toContain("HyperEVM EVM confirmation");
    expect(copy.verification).not.toBe(LIVE_VERIFICATION_CONFIRMED_COPY);
  });

  it("does not mark preconfirmation-aware success cleared before live re-check", () => {
    const copy = getRevokeReceiptCopy({
      status: "success",
      kind: "erc20",
      chainId: OPTIMISM_CLIENT_CHAIN_ID,
      verificationState: "pending",
    });

    expect(copy.verification).toContain("Re-checking approval state");
    expect(copy.verification).not.toBe(LIVE_VERIFICATION_CONFIRMED_COPY);
  });

  it("only says confirmed cleared when the caller supplies live verification", () => {
    expect(
      getRevokeReceiptCopy({
        status: "success",
        kind: "erc20",
        verificationState: "confirmed-cleared",
      }).verification,
    ).toBe(LIVE_VERIFICATION_CONFIRMED_COPY);

    expect(
      getRevokeReceiptCopy({
        status: "success",
        kind: "erc20",
        verificationState: "incomplete",
      }).verification,
    ).toBe(LIVE_VERIFICATION_INCOMPLETE_COPY);
  });

  it("shows pending live verification without saying confirmed cleared", () => {
    const copy = getRevokeReceiptCopy({
      status: "success",
      kind: "erc20",
      verificationState: "pending",
    });

    expect(copy.verification).toBe("Checking live approval state...");
    expect(copy.verification).not.toContain(LIVE_VERIFICATION_CONFIRMED_COPY);
  });

  it.each([
    { status: "pending", verificationState: "confirmed-cleared" },
    { status: "rejected", verificationState: "confirmed-cleared" },
    { status: "error", verificationState: "confirmed-cleared" },
    { status: "success", verificationState: "not-run" },
    { status: "success", verificationState: "pending" },
    { status: "success", verificationState: "incomplete" },
    { status: "success", verificationState: "failed" },
    { status: "success", verificationState: "mismatch" },
  ] as const)(
    "does not show confirmed cleared for $status / $verificationState",
    ({ status, verificationState }) => {
      expect(
        getRevokeReceiptCopy({
          status,
          kind: "erc20",
          verificationState,
        }).verification,
      ).not.toBe(LIVE_VERIFICATION_CONFIRMED_COPY);
    },
  );

  it("keeps failure and rejection wording calm and precise", () => {
    expect(
      getRevokeReceiptCopy({ status: "rejected", kind: "erc20" }).title,
    ).toBe("User rejected transaction");
    expect(getRevokeReceiptCopy({ status: "error", kind: "erc20" }).title).toBe(
      "Transaction failed",
    );
  });

  it("does not claim receipt outcomes have protected status", () => {
    const forbidden = ["sa", "fe"].join("");
    const combined = [
      revokeMethodLabel("erc20"),
      revokeMethodLabel("nft-operator"),
      revokeMethodLabel("nft-token"),
      revokeSummary("erc20"),
      revokeSummary("nft-operator"),
      revokeSummary("nft-token"),
      TRANSACTION_SUBMITTED_INCOMPLETE_COPY,
      PRECONFIRM_TRANSACTION_SEEN_COPY,
      ROLLUP_FINALITY_AWARE_TRANSACTION_COPY,
      HYPEREVM_DUAL_BLOCK_TRANSACTION_COPY,
      LIVE_VERIFICATION_CONFIRMED_COPY,
      LIVE_VERIFICATION_INCOMPLETE_COPY,
      getRevokeReceiptCopy({ status: "error", kind: "erc20" }).body,
      getRevokeReceiptCopy({ status: "rejected", kind: "erc20" }).body,
      getRevokeReceiptCopy({
        status: "success",
        kind: "erc20",
        verificationState: "mismatch",
      }).verification,
      getRevokeReceiptCopy({
        status: "success",
        kind: "erc20",
        verificationState: "failed",
      }).verification,
    ].join(" ");

    expect(combined.toLowerCase()).not.toMatch(
      new RegExp(`\\b${forbidden}\\b`),
    );
  });
});
