import {
  LIFEBOAT_CRITICAL_WARNINGS,
  LIFEBOAT_NEXT_STEPS,
  LIFEBOAT_NOT_TO_DO,
  LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY,
  LIFEBOAT_PLANNED_MODULES,
  LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY,
} from "@/lib/lifeboat/copy";
import { pendingNonceRiskLabel } from "@/lib/lifeboat/pending-nonce";
import { sweeperRiskLabel } from "@/lib/lifeboat/sweeper";
import type { LifeboatReport } from "@/lib/lifeboat/types";

export function buildWalletLifeboatReportMarkdown(
  report: LifeboatReport,
): string {
  const chains = report.chains.map((chain) => chain.chainName).join(", ");
  const warnings =
    report.warnings.length > 0 ? report.warnings : LIFEBOAT_CRITICAL_WARNINGS;
  const chainSections = report.chains
    .map(
      (chain) => `### ${chain.chainName} (chainId ${chain.chainId})

- Active token approvals: ${chain.activeApprovalCount}
- Active NFT approvals: ${chain.activeNftApprovalCount}
- Token approval status: ${formatModuleStatus(chain.approvalsStatus)}
- NFT approval status: ${formatModuleStatus(chain.nftApprovalsStatus)}
- Report notes: ${formatIncompleteReasons(chain.incompleteReasons)}
`,
    )
    .join("\n");

  return `# Wallet Lifeboat Report

Generated: ${report.generatedAt}
Scanned address: ${report.owner}
Network(s): ${chains}
Overall status: ${formatScanStatus(report.status)}

## Critical warnings

${warnings.map((warning) => `- ${warning}`).join("\n")}

## Visible approval risk

${chainSections || "No network scan has been added to this report yet."}

## NFT permission risk

Review the NFT approval counts above. Collection-wide approvals can expose every NFT in a collection if the operator remains active.

## Possible gas-sweeper activity

${formatSweeperSection(report)}

## Pending transaction / nonce activity

${formatPendingNonceSection(report)}

## HEX stake status

${plannedDiagnosticCopy("hex")}

## Permit2 / signature approvals

${plannedDiagnosticCopy("permit2")}

## EIP-7702 delegation

${plannedDiagnosticCopy("eip7702")}

## What not to do

${LIFEBOAT_NOT_TO_DO.map((item) => `- ${item}`).join("\n")}

## Recommended next steps

${LIFEBOAT_NEXT_STEPS.map((item) => `- ${item}`).join("\n")}
`;
}

function plannedDiagnosticCopy(id: string): string {
  const body =
    LIFEBOAT_PLANNED_MODULES.find((module) => module.id === id)?.body ??
    "This diagnostic is planned and not active in this version.";
  return `Status: Planned diagnostic. ${body}`;
}

function formatSweeperSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.sweeperEvidence.length > 0
          ? chain.sweeperEvidence
              .map(
                (item) =>
                  `  - Inbound ${item.inboundTxHash} then outbound ${item.outboundTxHash} after ${item.secondsBetween}s to ${item.possibleSweeperAddress} (${item.amountNative})`,
              )
              .join("\n")
          : "  - No quick native-drain evidence in the bounded recent-history window.";
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.sweeperStatus,
      )}; ${sweeperRiskLabel(chain.sweeperRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatPendingNonceSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.pendingNonceEvidence.length > 0
          ? chain.pendingNonceEvidence
              .map(
                (item) =>
                  `  - Latest nonce ${item.latestNonce}; pending nonce ${item.pendingNonce}; pending gap ${item.pendingTransactionCount} at ${item.checkedAt}`,
              )
              .join("\n")
          : "  - No pending nonce gap was reported by the selected RPC.";
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.pendingNonceStatus,
      )}; ${pendingNonceRiskLabel(chain.pendingNonceRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatScanStatus(status: LifeboatReport["status"]): string {
  switch (status) {
    case "scanning":
      return "Scanning";
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "failed":
      return "Failed";
    case "idle":
    default:
      return "Not scanned";
  }
}

function formatModuleStatus(
  status: LifeboatReport["chains"][number]["approvalsStatus"],
): string {
  switch (status) {
    case "scanning":
      return "Scanning";
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "planned":
      return "Planned diagnostic";
    case "unsupported":
      return "Unsupported";
    case "upstream_unavailable":
      return "Upstream unavailable";
    case "not_scanned":
    default:
      return "Not scanned";
  }
}

function formatIncompleteReasons(reasons: readonly string[]): string {
  return reasons.length > 0 ? reasons.join("; ") : "No incomplete diagnostics reported.";
}
