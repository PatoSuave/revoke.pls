import { describe, expect, it } from "vitest";

import {
  analyzeApprovalDrainTimeline,
  parseApprovalCall,
  timelineRiskLabel,
  type TimelineHistoryEvent,
} from "@/lib/lifeboat/timeline";

const OWNER = "0x1111111111111111111111111111111111111111";
const SPENDER = "0x2222222222222222222222222222222222222222";
const RECIPIENT = "0x3333333333333333333333333333333333333333";
const TOKEN = "0x4444444444444444444444444444444444444444";

function event(
  overrides: Partial<TimelineHistoryEvent> & {
    id: string;
    kind: TimelineHistoryEvent["kind"];
    txHash: string;
    timestamp: number;
  },
): TimelineHistoryEvent {
  return {
    occurredAt: new Date(overrides.timestamp * 1000).toISOString(),
    blockNumber: null,
    from: OWNER,
    to: null,
    contractAddress: null,
    label: overrides.kind,
    amount: null,
    methodId: null,
    methodName: null,
    spender: null,
    explorerUrl: null,
    ...overrides,
  };
}

describe("Wallet Lifeboat approval-to-drain timeline heuristic", () => {
  it("flags a close approval followed by outbound token movement", () => {
    const result = analyzeApprovalDrainTimeline({
      owner: OWNER,
      events: [
        event({
          id: "approval:0xaaa",
          kind: "approval",
          txHash: "0xaaa",
          timestamp: 100,
          to: TOKEN,
          contractAddress: TOKEN,
          label: "approve",
          methodId: "0x095ea7b3",
          methodName: "approve",
          spender: SPENDER,
        }),
        event({
          id: "token_out:0xbbb",
          kind: "token_out",
          txHash: "0xbbb",
          timestamp: 190,
          to: RECIPIENT,
          contractAddress: TOKEN,
          label: "Token transfer out",
          amount: "100 TEST",
        }),
      ],
    });

    expect(result.riskLevel).toBe("elevated");
    expect(result.summary.possibleSequenceCount).toBe(1);
    expect(result.evidence[0]).toMatchObject({
      approvalTxHash: "0xaaa",
      movementTxHash: "0xbbb",
      secondsAfterApproval: 90,
      movementKind: "token_out",
      spender: SPENDER,
      recipient: RECIPIENT,
    });
  });

  it("keeps no visible sequence wording conservative", () => {
    const result = analyzeApprovalDrainTimeline({
      owner: OWNER,
      events: [
        event({
          id: "approval:0xaaa",
          kind: "approval",
          txHash: "0xaaa",
          timestamp: 100,
          to: TOKEN,
          contractAddress: TOKEN,
          label: "approve",
          spender: SPENDER,
        }),
        event({
          id: "native_in:0xccc",
          kind: "native_in",
          txHash: "0xccc",
          timestamp: 200,
          from: RECIPIENT,
          to: OWNER,
          label: "Native transfer in",
          amount: "1 ETH",
        }),
      ],
    });

    expect(result.riskLevel).toBe("none_detected");
    expect(result.evidence).toEqual([]);
    expect(timelineRiskLabel(result.riskLevel)).toBe(
      "No visible sequence found",
    );
    expect(result.warnings.join(" ").toLowerCase()).not.toContain("all clear");
  });

  it("keeps sparse history as insufficient data", () => {
    const result = analyzeApprovalDrainTimeline({
      owner: OWNER,
      events: [
        event({
          id: "approval:0xaaa",
          kind: "approval",
          txHash: "0xaaa",
          timestamp: 100,
          label: "approve",
          spender: SPENDER,
        }),
      ],
    });

    expect(result.riskLevel).toBe("insufficient_data");
    expect(result.summary.checkedEventCount).toBe(1);
  });

  it("parses spender addresses from known approval calldata", () => {
    const input = `0x095ea7b3000000000000000000000000${SPENDER.slice(
      2,
    )}ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff`;

    expect(parseApprovalCall(input)).toMatchObject({
      methodId: "0x095ea7b3",
      methodName: "approve",
      approvalKind: "token_allowance",
      spender: SPENDER,
    });
  });
});
