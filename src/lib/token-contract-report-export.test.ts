import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { PDFDocument } from "pdf-lib";
import { getAddress } from "viem";
import { describe, expect, it } from "vitest";

import {
  TOKEN_CONTRACT_REPORT_EXPORT_SECTION_TITLES,
  TOKEN_CONTRACT_REPORT_PDF_MAX_PAGES,
  createTokenContractReportJsonExport,
  createTokenContractReportPdfExport,
  serializeTokenContractReport,
  tokenContractReportExportStem,
} from "@/lib/token-contract-report-export";
import {
  createEmptyTokenContractReportResponse,
  type TokenContractReportResponse,
} from "@/lib/token-contract-report";

const CONTRACT = getAddress("0xbbca9774331066948A6b2a68Bc7a51B0392aF9F1");
const DEPLOYER = getAddress("0x0000000000000000000000000000000000000011");

describe("token contract report exports", () => {
  it("serializes the exact final report and creates a safe descriptive filename", async () => {
    const report = sampleReport();
    const jsonExport = createTokenContractReportJsonExport(report);

    expect(JSON.parse(jsonExport.text)).toEqual(report);
    expect(jsonExport.text).toBe(serializeTokenContractReport(report));
    expect(await jsonExport.blob.text()).toBe(jsonExport.text);
    expect(jsonExport.filename).toBe(
      "pulse-revoke-token-audit-pulse-chain-posve-beta-bbca9774-2026-07-14.json",
    );
    expect(jsonExport.filename).not.toMatch(/[\\/:*?"<>|]/);
  });

  it("keeps a stable outline covering every report evidence family", () => {
    expect(TOKEN_CONTRACT_REPORT_EXPORT_SECTION_TITLES).toEqual([
      "Direct answers",
      "Priority findings and next checks",
      "Coverage, limits, and collection issues",
      "Optional AI-assisted explanation",
      "How to read the technical evidence",
      "All findings and typed evidence",
      "Contract and token profile",
      "Evidence modules and signals",
      "Selectors and bytecode",
      "Holders and supply history",
      "Contract history and simulations",
      "Liquidity evidence",
      "Complete structured report",
    ]);
  });

  it("creates a bounded, loadable PDF with the exact JSON embedded", async () => {
    const report = sampleReport();
    const pdfExport = await createTokenContractReportPdfExport(report);
    const loaded = await PDFDocument.load(pdfExport.bytes);

    expect(new TextDecoder().decode(pdfExport.bytes.slice(0, 5))).toBe("%PDF-");
    expect(pdfExport.filename).toBe(tokenContractReportExportStem(report) + ".pdf");
    expect(pdfExport.blob.type).toBe("application/pdf");
    expect(pdfExport.pageCount).toBeGreaterThan(1);
    expect(pdfExport.pageCount).toBeLessThanOrEqual(
      TOKEN_CONTRACT_REPORT_PDF_MAX_PAGES,
    );
    expect(loaded.getPageCount()).toBe(pdfExport.pageCount);
    expect(loaded.getTitle()).toContain("POSVE");
    expect(pdfExport.readableViewTruncated).toBe(false);

    if (process.env.WRITE_TOKEN_REPORT_PDF_FIXTURE === "1") {
      const outputDirectory = join(process.cwd(), "tmp", "pdfs");
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        join(outputDirectory, "token-contract-report-export-sample.pdf"),
        pdfExport.bytes,
      );
    }
  }, 20_000);

  it("marks an unusually large readable value as shortened without exceeding the page cap", async () => {
    const report = sampleReport();
    report.ai = {
      ...report.ai,
      status: "generated",
      model: "fixture-model",
      markdown: "Long provider narrative. ".repeat(4_000),
    };

    const pdfExport = await createTokenContractReportPdfExport(report);

    expect(pdfExport.readableViewTruncated).toBe(true);
    expect(pdfExport.pageCount).toBeLessThanOrEqual(
      TOKEN_CONTRACT_REPORT_PDF_MAX_PAGES,
    );
  }, 20_000);
});

function sampleReport(): TokenContractReportResponse {
  const base = createEmptyTokenContractReportResponse({
    status: "complete",
    errors: [],
  });
  return {
    ...base,
    generatedAt: "2026-07-14T15:30:00.000Z",
    ok: true,
    status: "complete",
    chain: {
      chainId: 369,
      name: "Pulse / Chain",
      explorerName: "PulseChain Scan",
    },
    contract: {
      address: CONTRACT,
      explorerUrl: `https://scan.pulsechain.com/address/${CONTRACT}`,
      hasBytecode: true,
      source: {
        verified: "verified",
        verificationProvider: "explorer+sourcify",
        verificationMatch: "exact-match",
        contractName: "POSVE Token",
        isProxy: false,
        implementationAddress: null,
        compilerVersion: "v0.8.20",
        abiFunctionCount: 12,
        controlSurface: {
          mint: ["transferToburn(uint256)"],
          admin: ["approver(address,bool)"],
          fees: [],
          transferRestrictions: ["approver(address,bool)"],
          liquidity: [],
        },
        implementation: null,
      },
      creation: {
        transactionHash: null,
        transactionUrl: null,
        deployerAddress: DEPLOYER,
        deployerUrl: `https://scan.pulsechain.com/address/${DEPLOYER}`,
        blockNumber: 20_000_000,
        timestamp: "2026-07-14T14:00:00.000Z",
        lookupStatus: "found",
      },
    },
    controls: {
      ...base.controls,
      ownerAddress: DEPLOYER,
      ownershipStatus: "found",
      ownerMethod: "owner",
      ownerCandidates: { owner: DEPLOYER, getOwner: null },
      effectiveControllerAddresses: [DEPLOYER],
      ownerZeroRemovesAllControl: false,
    },
    audit: {
      ...base.audit,
      coveragePercent: 82,
      classificationConfidence: 91,
      riskScore: 96,
      overallSeverity: "critical",
      resolvedQuestions: 14,
      completedChecks: 14,
      reviewChecks: 1,
      notEvaluatedChecks: 2,
      totalChecks: 17,
      coverageExplanation: {
        summary: "14 of 17 questions were resolved.",
        calculation: "Resolved questions receive one point and review clues receive half a point.",
        blockers: ["Two router-level paths could not be simulated."],
      },
      criticalChecks: [
        {
          question: "Can a privileged account increase supply?",
          status: "confirmed",
          disposition: "concern",
          evidence: "A verified function writes a positive amount to total supply.",
        },
      ],
    },
    verdict: {
      severity: "critical",
      label: "critical observed risk",
      confidence: 94,
      confidenceLabel: "high",
      summary: "Independent controller behavior and a privileged supply increase were confirmed.",
      basis: "deterministic",
    },
    standards: { ...base.standards, erc20Like: true },
    token: {
      ...base.token,
      name: "POSVE Beta / ../../unsafe",
      symbol: "POSVE Beta",
      decimals: 18,
      totalSupply: "1000000000000000000000000000",
      formattedTotalSupply: "1,000,000,000 POSVE",
    },
    signals: [
      {
        id: "verified-source",
        label: "Verified source",
        severity: "info",
        evidence: "Explorer and Sourcify exact match.",
        status: "complete",
      },
    ],
    findings: [
      {
        id: "supply-1",
        category: "supply",
        title: "Privileged supply increase",
        severity: "critical",
        state: "confirmed",
        confidence: 98,
        summary: "A privileged path can increase total supply after deployment.",
        practicalEffect: "The circulating supply can be diluted.",
        recommendation: "Treat the capability as active until control is provably removed.",
        evidence: [
          {
            id: "source-1",
            type: "source",
            summary: "Verified source assignment to total supply.",
            file: "POSVE.sol",
            startLine: 120,
            endLine: 128,
          },
        ],
      },
    ],
    selectors: [
      {
        selector: "0x0df88456",
        signature: "transferToburn(uint256)",
        candidates: ["transferToburn(uint256)"],
        resolution: "verified-abi",
        confidence: "exact",
        classification: "dangerous",
        riskCategory: "supply",
        evidenceState: "confirmed-signature",
        label: "transferToburn(uint256)",
      },
    ],
    holders: {
      ...base.holders,
      sampled: [
        {
          address: DEPLOYER,
          balance: "1000000000000000000000000000",
          percentageOfSupply: 100,
          sources: ["deployer", "explorer"],
        },
      ],
      deployerBalance: "1000000000000000000000000000",
      deployerPercent: 100,
      sampledSupplyPercent: 100,
    },
    history: {
      ...base.history,
      inspectedTransactions: 2,
      coverage: {
        complete: true,
        truncated: false,
        coveredRanges: [
          {
            scope: "transactions",
            provider: "blockscout-v2",
            fromBlock: 20_000_000,
            toBlock: 20_000_500,
            resultCount: 2,
          },
        ],
        gaps: [],
      },
    },
    simulation: {
      blockNumber: 20_000_500,
      attempts: [
        {
          id: "sell-v2",
          label: "Ordinary holder sell through PulseX V2",
          from: DEPLOYER,
          to: CONTRACT,
          recipient: null,
          amount: "1000000000000000000",
          functionSignature: "swapExactTokensForTokensSupportingFeeOnTransferTokens(...) ",
          status: "reverted",
          blockNumber: 20_000_500,
          detail: "The read-only router call reverted at the swap stage.",
          kind: "router-sell",
          routerVersion: "v2",
          routerAddress: DEPLOYER,
          pairAddress: null,
          stage: "swap-call",
          prerequisites: ["Router bytecode validated"],
          assumptions: ["Sampled holder balance was current at the captured block"],
        },
      ],
      limitations: [],
    },
    warnings: ["One secondary provider timed out."],
    reportBoundaries: [
      "This read-only report is not a formal audit or proof that a token is safe.",
    ],
  };
}
