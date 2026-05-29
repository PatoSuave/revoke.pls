import { describe, expect, it } from "vitest";

import { buildWalletLifeboatReportMarkdown } from "@/lib/lifeboat/report";
import type { LifeboatReport } from "@/lib/lifeboat/types";

const REPORT: LifeboatReport = {
  owner: "0x1111111111111111111111111111111111111111",
  generatedAt: "2026-05-29T19:00:00.000Z",
  status: "partial",
  warnings: [
    "Never enter your seed phrase or private key anywhere.",
    "Do not add gas to a wallet you believe is compromised until you review the risks.",
  ],
  completeness: {
    approvalsComplete: true,
    nftApprovalsComplete: false,
    sweeperCheckComplete: false,
    pendingNonceCheckComplete: true,
    timelineCheckComplete: true,
    hexCheckComplete: false,
    permit2Complete: false,
    eip7702Complete: false,
    visibleAssetsComplete: false,
  },
  chains: [
    {
      chainId: 369,
      chainName: "PulseChain",
      activeApprovalCount: 2,
      activeNftApprovalCount: 1,
      approvalsStatus: "complete",
      nftApprovalsStatus: "partial",
      sweeperStatus: "complete",
      sweeperRiskLevel: "possible",
      sweeperEvidence: [
        {
          inboundTxHash: "0xin",
          outboundTxHash: "0xout",
          inboundAt: "2026-05-29T18:00:00.000Z",
          outboundAt: "2026-05-29T18:01:00.000Z",
          secondsBetween: 60,
          amountNative: "1 PLS",
          possibleSweeperAddress: "0x2222222222222222222222222222222222222222",
        },
      ],
      pendingNonceStatus: "complete",
      pendingNonceRiskLevel: "possible",
      pendingNonceEvidence: [
        {
          latestNonce: "10",
          pendingNonce: "11",
          pendingTransactionCount: 1,
          checkedAt: "2026-05-29T18:02:00.000Z",
        },
      ],
      pendingNonceSummary: {
        latestNonce: "10",
        pendingNonce: "11",
        pendingTransactionCount: 1,
        checkedAt: "2026-05-29T18:02:00.000Z",
      },
      timelineStatus: "complete",
      timelineRiskLevel: "elevated",
      timelineEvents: [
        {
          id: "approval:0xapprove",
          kind: "approval",
          txHash: "0xapprove",
          timestamp: 1_779_999_000,
          occurredAt: "2026-05-29T18:03:00.000Z",
          blockNumber: 123,
          from: "0x1111111111111111111111111111111111111111",
          to: "0x3333333333333333333333333333333333333333",
          contractAddress: "0x3333333333333333333333333333333333333333",
          label: "Approval call: approve",
          amount: null,
          methodId: "0x095ea7b3",
          methodName: "approve",
          spender: "0x2222222222222222222222222222222222222222",
          explorerUrl: "https://scan.pulsechain.com/tx/0xapprove",
        },
      ],
      timelineEvidence: [
        {
          approvalTxHash: "0xapprove",
          movementTxHash: "0xmove",
          approvalAt: "2026-05-29T18:03:00.000Z",
          movementAt: "2026-05-29T18:04:00.000Z",
          secondsAfterApproval: 60,
          movementKind: "token_out",
          movementLabel: "PLS transfer out",
          movementAmount: "10 PLS",
          spender: "0x2222222222222222222222222222222222222222",
          recipient: "0x4444444444444444444444444444444444444444",
          approvalExplorerUrl: "https://scan.pulsechain.com/tx/0xapprove",
          movementExplorerUrl: "https://scan.pulsechain.com/tx/0xmove",
        },
      ],
      hexStatus: "planned",
      permit2Status: "planned",
      eip7702Status: "planned",
      visibleAssetsStatus: "planned",
      incompleteReasons: ["1 NFT live read failed"],
    },
  ],
};

describe("Wallet Lifeboat report", () => {
  it("exports address, timestamp, chains, warnings, and planned diagnostics", () => {
    const markdown = buildWalletLifeboatReportMarkdown(REPORT);

    expect(markdown).toContain("# Wallet Lifeboat Report");
    expect(markdown).toContain(REPORT.generatedAt);
    expect(markdown).toContain(REPORT.owner);
    expect(markdown).toContain("PulseChain");
    expect(markdown).toContain("Never enter your seed phrase or private key");
    expect(markdown).toContain("Do not add gas");
    expect(markdown).toContain("Planned diagnostic");
    expect(markdown).toContain("Possible pattern");
    expect(markdown).toContain("0xin");
    expect(markdown).toContain("0xout");
    expect(markdown).toContain("Pending nonce gap");
    expect(markdown).toContain("Latest nonce 10");
    expect(markdown).toContain("Approval-to-drain timeline");
    expect(markdown).toContain("0xapprove");
    expect(markdown).toContain("0xmove");
    expect(markdown).toContain("1 NFT live read failed");
  });

  it("does not claim recovery or include secret placeholders", () => {
    const markdown = buildWalletLifeboatReportMarkdown(REPORT).toLowerCase();

    expect(markdown).not.toContain("guaranteed recovery");
    expect(markdown).not.toContain("recover your wallet");
    expect(markdown).not.toContain("one-click rescue");
    expect(markdown).not.toContain("wallet password:");
    expect(markdown).not.toContain("private key:");
    expect(markdown).not.toContain("seed phrase:");
  });
});
