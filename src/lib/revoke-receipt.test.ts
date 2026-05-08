import { describe, expect, it } from "vitest";

import {
  LIVE_VERIFICATION_CONFIRMED_COPY,
  LIVE_VERIFICATION_INCOMPLETE_COPY,
  TRANSACTION_SUBMITTED_INCOMPLETE_COPY,
  getRevokeReceiptCopy,
  revokeMethodLabel,
  revokeSummary,
} from "./revoke-receipt";

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
      LIVE_VERIFICATION_CONFIRMED_COPY,
      LIVE_VERIFICATION_INCOMPLETE_COPY,
      getRevokeReceiptCopy({ status: "error", kind: "erc20" }).body,
      getRevokeReceiptCopy({ status: "rejected", kind: "erc20" }).body,
    ].join(" ");

    expect(combined.toLowerCase()).not.toMatch(
      new RegExp(`\\b${forbidden}\\b`),
    );
  });
});
