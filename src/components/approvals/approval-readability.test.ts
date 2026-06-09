import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  CURRENT_APPROVAL_STATE_UNVERIFIED_BODY,
  CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE,
  ZERO_ADDRESS_EXPLANATION_BODY,
  ZERO_ADDRESS_EXPLANATION_TITLE,
  getCurrentApprovalStateCopy,
  isCurrentApprovalStateUnverifiedReason,
} from "../../lib/approval-verification-copy";

describe("approval row readability copy", () => {
  const erc20Source = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "approval-row.tsx"),
    "utf8",
  );
  const nftSource = readFileSync(
    join(process.cwd(), "src", "components", "approvals", "nft-approval-row.tsx"),
    "utf8",
  );
  const helperSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "approvals",
      "approval-readability.tsx",
    ),
    "utf8",
  );
  const ethereumSource = readFileSync(
    join(
      process.cwd(),
      "src",
      "components",
      "sections",
      "ethereum-readonly-scanner.tsx",
    ),
    "utf8",
  );

  it("explains ERC-20 approval permission and recommended action", () => {
    expect(helperSource).toContain("What this approval means");
    expect(erc20Source).toContain(
      "This spender can use an unlimited amount of this token from your wallet.",
    );
    expect(erc20Source).toContain(
      "This spender can use up to ${approval.formattedAllowance} of this token from your wallet.",
    );
    expect(erc20Source).toContain("Unlimited approval");
    expect(erc20Source).toContain("Limited approval");
    expect(erc20Source).toContain(
      "Revoke if you do not recognize this spender or no longer use the connected app.",
    );
  });

  it("explains NFT approval permission and recommended action", () => {
    expect(nftSource).toContain("Collection / token");
    expect(nftSource).toContain(
      "This operator can manage all NFTs from this collection.",
    );
    expect(nftSource).toContain(
      "This operator can manage this NFT approval.",
    );
    expect(nftSource).toContain(
      "Revoke if you do not recognize this operator or no longer use the connected app.",
    );
  });

  it("renders the approval meaning panel as a collapsed details control", () => {
    expect(helperSource).toContain("<details");
    expect(helperSource).toContain("<summary");
    expect(helperSource).toContain("What this approval means");
    expect(helperSource).toContain("focus-visible:outline-pulse-cyan");
    expect(helperSource).toContain("group-open:rotate-45");
    expect(helperSource).not.toContain("<details open");
  });

  it("keeps approval meaning content available inside the collapsible panel", () => {
    expect(helperSource).toContain("<dl");
    expect(helperSource).toContain("{items.map((item)");
    expect(helperSource).toContain("Technical details");
    expect(erc20Source).toContain("<ApprovalMeaningPanel");
    expect(nftSource).toContain("<ApprovalMeaningPanel");
  });

  it("includes source-grounded protocol metadata labels", () => {
    expect(helperSource).toContain("Known protocol");
    expect(helperSource).toContain("Contract status");
    expect(helperSource).toContain("Current contract");
    expect(helperSource).toContain("Legacy contract");
    expect(helperSource).toContain("Documented asset");
    expect(helperSource).toContain("Source");
    expect(helperSource).toContain("Risk signals");
    expect(helperSource).toContain("riskSignalItems");
    expect(helperSource).toContain("metadata.protocolName");
    expect(helperSource).toContain("metadata.sourceLabel");
    expect(erc20Source).toContain(
      "protocolMetadataItems(approval.spenderProtocolMetadata)",
    );
    expect(erc20Source).toContain("riskSignalItems(approval.risk.drivers)");
    expect(nftSource).toContain(
      "protocolMetadataItems(approval.operatorProtocolMetadata)",
    );
    expect(nftSource).toContain("riskSignalItems(approval.risk.drivers)");
  });

  it("explains unverified ERC-20 current approval state", () => {
    const copy = getCurrentApprovalStateCopy("erc20");

    expect(copy.title).toBe(CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE);
    expect(copy.body).toBe(CURRENT_APPROVAL_STATE_UNVERIFIED_BODY);
    expect(copy.method).toBe(
      "To verify this row, the app must read allowance(owner, spender).",
    );
    expect(erc20Source).toContain("CurrentApprovalStateSummary kind=\"erc20\"");
    expect(erc20Source).toContain(
      'verificationKind={approval.approvalKind ?? "erc20"}',
    );
  });

  it("explains unverified NFT per-token and operator current approval state", () => {
    expect(getCurrentApprovalStateCopy("nft-token").method).toBe(
      "To verify this row, the app must read getApproved(tokenId).",
    );
    expect(getCurrentApprovalStateCopy("nft-operator").method).toBe(
      "To verify this row, the app must read isApprovedForAll(owner, operator).",
    );
    expect(nftSource).toContain("\"nft-token\"");
    expect(nftSource).toContain("\"nft-operator\"");
    expect(ethereumSource).toContain("\"nft-token\"");
    expect(ethereumSource).toContain("\"nft-operator\"");
  });

  it("explains zero-address NFT rows without changing row visibility", () => {
    expect(ZERO_ADDRESS_EXPLANATION_TITLE).toBe("Zero address shown");
    expect(ZERO_ADDRESS_EXPLANATION_BODY).toContain('"no approved address"');
    expect(ZERO_ADDRESS_EXPLANATION_BODY).toContain(
      "could not complete the required live read",
    );
    expect(nftSource).toContain("ZeroAddressInline");
    expect(nftSource).toContain("ZeroAddressSummary");
    expect(ethereumSource).toContain("ZERO_ADDRESS");
    expect(ethereumSource).toContain("ZeroAddressInline");
  });

  it("includes the technical verification explainer", () => {
    expect(helperSource).toContain("What needs to be verified?");
    expect(helperSource).toContain("allowance(owner, spender)");
    expect(helperSource).toContain("getApproved(tokenId)");
    expect(helperSource).toContain("isApprovedForAll(owner, operator)");
    expect(helperSource).toContain(
      "Pulse Revoke keeps revoke disabled instead of",
    );
    expect(erc20Source).toContain("VerificationTechnicalExplainer");
    expect(nftSource).toContain("VerificationTechnicalExplainer");
    expect(ethereumSource).toContain("VerificationTechnicalExplainer");
  });

  it("explains desktop beta Ethereum discovery without exposing a raw API failure", () => {
    expect(ethereumSource).toContain("Ethereum discovery is web-only in this beta");
    expect(ethereumSource).toContain("Hosted API unavailable in desktop beta");
    expect(ethereumSource).toContain(
      "Ethereum hosted approval discovery is not included in this desktop beta",
    );
  });

  it("detects only verification-related disabled reasons for row hints", () => {
    expect(
      isCurrentApprovalStateUnverifiedReason(
        "This row was not fully verified.",
      ),
    ).toBe(true);
    expect(
      isCurrentApprovalStateUnverifiedReason(
        "2 live reads failed - revoke unavailable until verification completes.",
      ),
    ).toBe(true);
    expect(
      isCurrentApprovalStateUnverifiedReason(
        "Verified row; revoke available.",
      ),
    ).toBe(false);
    expect(
      isCurrentApprovalStateUnverifiedReason(
        "Switch to Ethereum Mainnet to revoke.",
      ),
    ).toBe(false);
  });

  it("keeps existing revoke-disabled UI represented", () => {
    expect(erc20Source).toContain("Revoke unavailable");
    expect(nftSource).toContain("Revoke unavailable");
    expect(ethereumSource).toContain("ReadOnlyAction");
  });

  it("does not claim spenders or operators are safe", () => {
    const combined = `${erc20Source}\n${nftSource}\n${helperSource}`.toLowerCase();

    expect(combined).not.toContain("spender is safe");
    expect(combined).not.toContain("operator is safe");
    expect(combined).not.toContain("safe spender");
    expect(combined).not.toContain("safe operator");
  });

  it("does not introduce the word safe in verification-incomplete copy", () => {
    const verificationCopy = [
      CURRENT_APPROVAL_STATE_UNVERIFIED_TITLE,
      CURRENT_APPROVAL_STATE_UNVERIFIED_BODY,
      ZERO_ADDRESS_EXPLANATION_TITLE,
      ZERO_ADDRESS_EXPLANATION_BODY,
      getCurrentApprovalStateCopy("erc20").method,
      getCurrentApprovalStateCopy("nft-token").method,
      getCurrentApprovalStateCopy("nft-operator").method,
    ].join(" ");

    expect(verificationCopy.toLowerCase()).not.toMatch(/\bsafe\b/);
  });
});
