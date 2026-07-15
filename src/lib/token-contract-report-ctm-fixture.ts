import { getAddress } from "viem";

import {
  createEmptyTokenContractReportResponse,
  type TokenContractReportResponse,
} from "@/lib/token-contract-report";
import { buildTokenContractReportPresentation } from "@/lib/token-contract-report-presentation";

const CTM = getAddress("0xc8Fb80fCc03f699C70ff0CC08C09106288888888");

export function createCtmTokenContractReportFixture(): TokenContractReportResponse {
  const report = createEmptyTokenContractReportResponse({
    status: "complete",
    errors: [],
  });
  report.generatedAt = "2026-07-15T12:00:00.000Z";
  report.ok = true;
  report.chain = {
    chainId: 1,
    name: "Ethereum Mainnet",
    explorerName: "Etherscan",
  };
  report.contract = {
    address: CTM,
    explorerUrl: `https://etherscan.io/address/${CTM}`,
    hasBytecode: true,
    source: {
      verified: "verified",
      verificationProvider: "explorer",
      verificationMatch: null,
      contractName: "CTM",
      isProxy: false,
      implementationAddress: null,
      compilerVersion: "v0.8.28",
      abiFunctionCount: 29,
      controlSurface: {
        mint: ["mint(address,uint256)", "MAX_SUPPLY()"],
        admin: [
          "MINTER_ROLE()",
          "DEFAULT_ADMIN_ROLE()",
          "getRoleAdmin(bytes32)",
          "grantRole(bytes32,address)",
          "revokeRole(bytes32,address)",
          "hasRole(bytes32,address)",
        ],
        fees: [],
        transferRestrictions: [],
        liquidity: [],
      },
      implementation: null,
    },
    creation: {
      transactionHash: null,
      transactionUrl: null,
      deployerAddress: null,
      deployerUrl: null,
      blockNumber: null,
      timestamp: null,
      lookupStatus: "unavailable",
    },
  };
  report.token = {
    ...report.token,
    name: "c8ntinuum",
    symbol: "CTM",
    decimals: 18,
    totalSupply: "296296296000000000000000000",
    formattedTotalSupply: "296,296,296 CTM",
  };
  report.supplyHistory = {
    initialMintAmount: "296296296000000000000000000",
    initialMintRecipients: [],
    initialMintTransactionHash: null,
    initialMintBlockNumber: null,
    currentSupplyDiffersFromInitialMint: false,
    limitations: ["Complete zero-address Transfer history was not collected."],
  };
  report.verdict = {
    severity: "high",
    label: "high observed risk",
    confidence: 78,
    confidenceLabel: "moderate",
    summary: "Legacy engine wording retained for backward compatibility.",
    basis: "deterministic",
  };
  report.audit = {
    ...report.audit,
    coveragePercent: 28,
    classificationConfidence: 78,
    riskScore: 72,
    overallSeverity: "high",
    criticalChecks: [],
    resolvedQuestions: 2,
    completedChecks: 2,
    reviewChecks: 6,
    notEvaluatedChecks: 10,
    totalChecks: 18,
    coverageExplanation: {
      summary: "2 resolved, 6 partial, and 10 not tested.",
      calculation: "Resolved checks receive one point and partial checks receive half a point.",
      blockers: ["Role holders, complete supply history, and router trading tests remain unresolved."],
    },
  };
  report.findings = [
    {
      id: "solidity.supply.mutable",
      category: "supply",
      title: "Mutable supply accounting",
      severity: "high",
      state: "confirmed",
      confidence: 82,
      summary: "Internal supply accounting can increase or decrease total supply.",
      practicalEffect: "An authorized entry point can change circulating supply.",
      recommendation: "Resolve current role holders and remaining cap before relying on supply assumptions.",
      evidence: [
        {
          id: "oz-increase",
          type: "source",
          summary: "_totalSupply += value",
          file: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
          startLine: 179,
          endLine: 179,
        },
        {
          id: "oz-decrease",
          type: "source",
          summary: "_totalSupply -= value",
          file: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
          startLine: 194,
          endLine: 194,
        },
      ],
    },
    {
      id: "solidity.supply.name-clue",
      category: "supply",
      title: "Mint and burn entry points",
      severity: "medium",
      state: "review-clue",
      confidence: 75,
      summary:
        "mint(address,uint256) uses onlyRole(MINTER_ROLE) and MAX_SUPPLY; burn(uint256) burns the caller and decreases supply.",
      practicalEffect: "Minting is role-gated and capped; self-burn reduces the caller's balance.",
      recommendation: "Read the role admin, current holders, cap, and complete supply events.",
      evidence: [
        {
          id: "ctm-mint",
          type: "source",
          summary:
            "mint(address,uint256) onlyRole(MINTER_ROLE) requires totalSupply + amount <= MAX_SUPPLY",
          file: "src/ctm.sol",
          startLine: 18,
          endLine: 21,
        },
        {
          id: "ctm-burn",
          type: "source",
          summary: "burn(uint256) burns the caller's tokens and decreases supply",
          file: "src/ctm.sol",
          startLine: 23,
          endLine: 25,
        },
      ],
    },
    {
      id: "solidity.access.roles",
      category: "access-control",
      title: "Role-based authorization detected",
      severity: "info",
      state: "confirmed",
      confidence: 90,
      summary:
        "AccessControl exposes DEFAULT_ADMIN_ROLE, MINTER_ROLE, getRoleAdmin, grantRole, revokeRole, and hasRole.",
      practicalEffect: "Role administration, not an Ownable owner, controls sensitive paths.",
      recommendation: "Resolve current and historical role holders.",
      evidence: [],
    },
  ];
  report.history = {
    inspectedTransactions: 50,
    decodedCalls: Array.from({ length: 50 }, (_, index) => ({
      transactionHash: (`0x${(index + 1).toString(16).padStart(64, "0")}`) as `0x${string}`,
      blockNumber: 20_000_000 + index,
      timestamp: null,
      from: null,
      selector: index < 40 ? "0x095ea7b3" : "0xa9059cbb",
      signature: index < 40 ? "approve(address,uint256)" : "transfer(address,uint256)",
      success: true,
      afterOwnershipZero: null,
    })),
    ownershipTransfers: [],
    postOwnershipZeroActivity: null,
    coverage: {
      complete: false,
      truncated: true,
      coveredRanges: [],
      gaps: ["Explorer history was capped at 50 transactions."],
    },
    limitations: ["This is a bounded sample, not complete contract history."],
  };
  report.simulation = {
    blockNumber: 20_000_049,
    attempts: [
      {
        id: "ctm-mint-ordinary",
        label: "mint from ordinary account",
        from: null,
        to: CTM,
        functionSignature: "mint(address,uint256)",
        status: "reverted",
        blockNumber: 20_000_049,
        detail: "Recorded call reverted.",
        rawCalldata:
          "0x40c10f19000000000000000000000000000000000004444c5dc75cb358380d",
      },
    ],
    limitations: ["The retained mint calldata is malformed and cannot test authorization."],
  };
  report.liquidity = {
    pairs: [],
    pairEvidence: [],
    limitations: ["No validated DEX pair was returned; buy and sell paths were not run."],
  };
  report.modules.source = {
    id: "source",
    label: "Verified source",
    status: "complete",
    evidenceCount: 4,
    summary: "Published source was collected; bytecode-match provenance remains unavailable.",
    warnings: [],
  };
  report.modules.bytecode.status = "complete";
  report.modules.history.status = "partial";
  report.modules.simulation.status = "partial";
  report.modules.liquidity.status = "complete";
  report.modules.ai = {
    id: "ai",
    label: "AI explanation",
    status: "unavailable",
    evidenceCount: 0,
    summary: "AI explanation timed out; deterministic evidence remains authoritative.",
    warnings: ["timeout"],
  };
  report.ai.reason = "timeout";
  report.warnings = [
    "Complete role-holder and supply-event reconstruction was not collected.",
  ];
  report.presentation = buildTokenContractReportPresentation(report, "final");
  return report;
}
