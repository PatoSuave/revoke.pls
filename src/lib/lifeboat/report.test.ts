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
