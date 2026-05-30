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
    addressPoisoningCheckComplete: true,
    spenderRiskCheckComplete: true,
    hexStakeCheckComplete: true,
    goodAccountingAssistComplete: true,
    knownRiskRegistryComplete: true,
    permit2Complete: true,
    eip7702Complete: true,
    smartWalletComplete: true,
    erc4337Complete: true,
    erc6909Complete: true,
    dustTrapCheckComplete: true,
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
      addressPoisoningStatus: "complete",
      addressPoisoningRiskLevel: "possible",
      addressPoisoningEvidence: [
        {
          txHash: "0xpoison",
          occurredAt: "2026-05-29T18:05:00.000Z",
          lookalikeAddress: "0xabcdef99999999999999999999999999deadbeef",
          referenceAddress: "0xabcdef12345678900000000000000000deadbeef",
          comparedPrefix: "0xabcdef",
          comparedSuffix: "deadbeef",
          sharedPrefixLength: 6,
          sharedSuffixLength: 8,
          assetType: "token",
          amount: "0 TEST",
          tokenSymbol: "TEST",
          explorerUrl: "https://scan.pulsechain.com/tx/0xpoison",
        },
      ],
      addressPoisoningEvents: [],
      spenderRiskStatus: "complete",
      spenderRiskLevel: "possible",
      spenderRiskEvidence: [
        {
          address: "0x5555555555555555555555555555555555555555",
          title: "Verified source unavailable",
          description:
            "The explorer did not report verified source code for this spender contract.",
          riskLevel: "possible",
          explorerUrl:
            "https://scan.pulsechain.com/address/0x5555555555555555555555555555555555555555",
        },
      ],
      spenderRiskSpenders: [
        {
          address: "0x5555555555555555555555555555555555555555",
          hasBytecode: true,
          verifiedSource: "unverified",
          contractName: null,
          isProxy: false,
          implementationAddress: null,
          registryContext: null,
          explorerUrl:
            "https://scan.pulsechain.com/address/0x5555555555555555555555555555555555555555",
          warnings: [],
        },
      ],
      hexStatus: "complete",
      hexStakeRiskLevel: "possible",
      hexStakeEvidence: [
        {
          stakeId: "123",
          status: "mature",
          title: "Mature stake at end day",
          description:
            "This visible open stake appears mature or recently past its end day. Lifeboat does not run or prepare End Stake.",
          riskLevel: "possible",
          stakedHex: "100 HEX",
          lockedDay: 1000,
          stakedDays: 100,
          endDay: 1100,
          daysRemaining: 0,
          daysLate: 0,
          explorerUrl:
            "https://scan.pulsechain.com/token/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
        },
      ],
      hexStakeRows: [
        {
          stakeId: "123",
          stakedHearts: "10000000000",
          stakedHex: "100 HEX",
          stakeShares: "1000000",
          lockedDay: 1000,
          stakedDays: 100,
          endDay: 1100,
          unlockedDay: 0,
          isAutoStake: false,
          servedDays: 100,
          daysRemaining: 0,
          daysLate: 0,
          status: "mature",
        },
      ],
      goodAccountingStatus: "complete",
      goodAccountingRiskLevel: "elevated",
      goodAccountingEvidence: [
        {
          stakeId: "456",
          title: "Possible Good Accounting candidate",
          description:
            "This visible open stake is late enough for Good Accounting review from a clean wallet. Lifeboat does not execute or prepare Good Accounting.",
          riskLevel: "elevated",
          stakedHex: "50 HEX",
          endDay: 1000,
          daysLate: 30,
        },
      ],
      goodAccountingCandidates: [
        {
          stakeId: "456",
          stakedHex: "50 HEX",
          lockedDay: 900,
          stakedDays: 100,
          endDay: 1000,
          daysLate: 30,
          owner: "0x1111111111111111111111111111111111111111",
          reason:
            "The visible open stake is past the normal grace window in the read-only HEX stake diagnostic.",
          cleanWalletNote:
            "A clean wallet may be able to review Good Accounting manually; Lifeboat does not create or submit that transaction.",
        },
      ],
      knownRiskRegistryStatus: "complete",
      knownRiskRegistryRiskLevel: "elevated",
      knownRiskRegistryEvidence: [
        {
          entryId: "reviewed-risk-context-1",
          address: "0x5555555555555555555555555555555555555555",
          chainId: 369,
          subjectRole: "approval-spender",
          subjectLabel: "Approval spender",
          sourceModule: "approval-scan",
          label: "Reviewed risk context",
          category: "reported-risk-spender",
          confidence: "high",
          reviewedAt: "2026-05-29T00:00:00.000Z",
          summary:
            "Reviewed public source context links this address to wallet-drain risk reports.",
          sources: [
            {
              title: "Reviewed public report",
              url: "https://example.com/reviewed-report",
              publishedAt: "2026-05-28T00:00:00.000Z",
            },
          ],
          expired: false,
          riskLevel: "elevated",
        },
      ],
      knownRiskRegistrySubjects: [
        {
          address: "0x5555555555555555555555555555555555555555",
          role: "approval-spender",
          label: "Approval spender",
          sourceModule: "approval-scan",
        },
      ],
      permit2Status: "complete",
      permit2RiskLevel: "possible",
      permit2Evidence: [
        {
          tokenAddress: "0x6666666666666666666666666666666666666666",
          tokenSymbol: "PRM",
          tokenName: "Permit Token",
          spenderAddress: "0x7777777777777777777777777777777777777777",
          spenderLabel: "Permit spender",
          approvalContractAddress:
            "0x000000000022D473030F116dDEE9F6B43aC78BA3",
          formattedAllowance: "5 PRM",
          unlimited: false,
          expiration: {
            timestamp: 1_800_000_000,
            iso: "2027-01-15T08:00:00.000Z",
            status: "active",
          },
          nonce: 3,
        },
      ],
      eip7702Status: "complete",
      eip7702RiskLevel: "elevated",
      eip7702Evidence: [
        {
          accountAddress: "0x1111111111111111111111111111111111111111",
          code: "0xef01008888888888888888888888888888888888888888",
          codeLengthBytes: 23,
          delegationAddress: "0x8888888888888888888888888888888888888888",
          classification: "eip7702_delegation",
          explorerUrl:
            "https://scan.pulsechain.com/address/0x1111111111111111111111111111111111111111",
          delegationExplorerUrl:
            "https://scan.pulsechain.com/address/0x8888888888888888888888888888888888888888",
          description:
            "The account code matches the EIP-7702 delegation designator format.",
        },
      ],
      smartWalletStatus: "complete",
      smartWalletRiskLevel: "elevated",
      smartWalletEvidence: [
        {
          title: "Safe modules enabled",
          description:
            "The account responded to Safe-compatible reads and has one or more enabled modules.",
          riskLevel: "elevated",
          accountAddress: "0x1111111111111111111111111111111111111111",
          safeOwners: ["0x2222222222222222222222222222222222222222"],
          safeThreshold: 1,
          safeModules: ["0x3333333333333333333333333333333333333333"],
          safeNonce: "12",
          codeLengthBytes: 5,
          explorerUrl:
            "https://scan.pulsechain.com/address/0x1111111111111111111111111111111111111111",
        },
      ],
      erc4337Status: "complete",
      erc4337RiskLevel: "possible",
      erc4337Evidence: [
        {
          title: "UserOperation used a paymaster",
          description:
            "A recent UserOperation for this account recorded a paymaster address. Review the linked event before adding gas or connecting the wallet.",
          riskLevel: "possible",
          event: {
            entryPointVersion: "v0.7",
            entryPointAddress: "0x0000000071727de22E5E9d8BAf0edAc6f37da032",
            userOpHash:
              "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            sender: "0x1111111111111111111111111111111111111111",
            paymaster: "0x2222222222222222222222222222222222222222",
            nonce: "7",
            success: true,
            actualGasCostWei: "100000",
            actualGasUsed: "50000",
            blockNumber: 123456,
            transactionHash:
              "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            explorerUrl:
              "https://scan.pulsechain.com/tx/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          },
        },
      ],
      erc4337Events: [
        {
          entryPointVersion: "v0.7",
          entryPointAddress: "0x0000000071727de22E5E9d8BAf0edAc6f37da032",
          userOpHash:
            "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          sender: "0x1111111111111111111111111111111111111111",
          paymaster: "0x2222222222222222222222222222222222222222",
          nonce: "7",
          success: true,
          actualGasCostWei: "100000",
          actualGasUsed: "50000",
          blockNumber: 123456,
          transactionHash:
            "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          explorerUrl:
            "https://scan.pulsechain.com/tx/0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        },
      ],
      erc6909Status: "complete",
      erc6909RiskLevel: "elevated",
      erc6909Evidence: [
        {
          title: "Operator permission enabled",
          description:
            "Spender 0x2222222222222222222222222222222222222222 was recorded as an ERC-6909 operator for all token IDs in contract 0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.",
          riskLevel: "elevated",
          event: {
            kind: "operator",
            contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            owner: "0x1111111111111111111111111111111111111111",
            spender: "0x2222222222222222222222222222222222222222",
            approved: true,
            blockNumber: 123457,
            transactionHash:
              "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            explorerUrl:
              "https://scan.pulsechain.com/tx/0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            contractExplorerUrl:
              "https://scan.pulsechain.com/address/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        },
      ],
      erc6909Events: [
        {
          kind: "operator",
          contractAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          owner: "0x1111111111111111111111111111111111111111",
          spender: "0x2222222222222222222222222222222222222222",
          approved: true,
          blockNumber: 123457,
          transactionHash:
            "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          explorerUrl:
            "https://scan.pulsechain.com/tx/0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
          contractExplorerUrl:
            "https://scan.pulsechain.com/address/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ],
      dustTrapStatus: "complete",
      dustTrapRiskLevel: "elevated",
      dustTrapEvidence: [
        {
          assetType: "token",
          contractAddress: "0x9999999999999999999999999999999999999999",
          tokenId: null,
          txHash: "0xdust",
          occurredAt: "2026-05-29T18:06:00.000Z",
          amount: "0.000001 CLM",
          displayName: "Claim [link removed]",
          displaySymbol: "CLM",
          title: "Metadata contained URL-like text",
          description:
            "URL-like text was stripped from this asset metadata. Treat token-provided links as phishing risk and verify only through trusted sources.",
          riskLevel: "elevated",
          tokenExplorerUrl:
            "https://scan.pulsechain.com/token/0x9999999999999999999999999999999999999999",
          txExplorerUrl: "https://scan.pulsechain.com/tx/0xdust",
        },
      ],
      dustTrapTransfers: [],
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
    expect(markdown).toContain("Possible pattern");
    expect(markdown).toContain("0xin");
    expect(markdown).toContain("0xout");
    expect(markdown).toContain("Pending nonce gap");
    expect(markdown).toContain("Latest nonce 10");
    expect(markdown).toContain("Approval-to-drain timeline");
    expect(markdown).toContain("0xapprove");
    expect(markdown).toContain("0xmove");
    expect(markdown).toContain("Address poisoning signals");
    expect(markdown).toContain("0xpoison");
    expect(markdown).toContain("Possible lookalike signal");
    expect(markdown).toContain("Spender contract risk");
    expect(markdown).toContain("Verified source unavailable");
    expect(markdown).toContain("0x5555555555555555555555555555555555555555");
    expect(markdown).toContain("HEX stake status");
    expect(markdown).toContain("Mature stake context");
    expect(markdown).toContain("stake 123");
    expect(markdown).toContain("Good Accounting Assist");
    expect(markdown).toContain("Good Accounting candidates");
    expect(markdown).toContain("stake 456");
    expect(markdown).toContain("Known-risk registry context");
    expect(markdown).toContain("Reviewed risk match");
    expect(markdown).toContain("reviewed 2026-05-29T00:00:00.000Z");
    expect(markdown).toContain("Permit2 exposure");
    expect(markdown).toContain("Active Permit2 exposure");
    expect(markdown).toContain("0x7777777777777777777777777777777777777777");
    expect(markdown).toContain("EIP-7702 delegation");
    expect(markdown).toContain("Active EIP-7702 delegation");
    expect(markdown).toContain("0x8888888888888888888888888888888888888888");
    expect(markdown).toContain("ERC-4337 / session-key signals");
    expect(markdown).toContain("UserOperation used a paymaster");
    expect(markdown).toContain("0x2222222222222222222222222222222222222222");
    expect(markdown).toContain("ERC-6909 multi-token approvals");
    expect(markdown).toContain("Operator permission enabled");
    expect(markdown).toContain("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(markdown).toContain("Token/NFT dust traps");
    expect(markdown).toContain("Multiple dust/bait signals");
    expect(markdown).toContain("Claim [link removed]");
    expect(markdown).toContain("0xdust");
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
