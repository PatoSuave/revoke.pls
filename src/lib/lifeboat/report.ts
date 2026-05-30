import {
  LIFEBOAT_ADDRESS_POISONING_DIAGNOSTIC_COPY,
  LIFEBOAT_CRITICAL_WARNINGS,
  LIFEBOAT_DUST_TRAP_DIAGNOSTIC_COPY,
  LIFEBOAT_EIP7702_DIAGNOSTIC_COPY,
  LIFEBOAT_GOOD_ACCOUNTING_ASSIST_COPY,
  LIFEBOAT_HEX_STAKE_DIAGNOSTIC_COPY,
  LIFEBOAT_NEXT_STEPS,
  LIFEBOAT_NOT_TO_DO,
  LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY,
  LIFEBOAT_PERMIT2_DIAGNOSTIC_COPY,
  LIFEBOAT_SMART_WALLET_DIAGNOSTIC_COPY,
  LIFEBOAT_SPENDER_RISK_DIAGNOSTIC_COPY,
  LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY,
  LIFEBOAT_TIMELINE_DIAGNOSTIC_COPY,
} from "@/lib/lifeboat/copy";
import { addressPoisoningRiskLabel } from "@/lib/lifeboat/address-poisoning";
import { dustTrapRiskLabel } from "@/lib/lifeboat/dust-trap";
import { eip7702RiskLabel } from "@/lib/lifeboat/eip7702";
import { goodAccountingAssistRiskLabel } from "@/lib/lifeboat/good-accounting";
import { hexStakeRiskLabel } from "@/lib/lifeboat/hex-stake";
import { pendingNonceRiskLabel } from "@/lib/lifeboat/pending-nonce";
import { permit2ExposureRiskLabel } from "@/lib/lifeboat/permit2-exposure";
import { smartWalletRiskLabel } from "@/lib/lifeboat/smart-wallet";
import { spenderRiskLabel } from "@/lib/lifeboat/spender-risk";
import { sweeperRiskLabel } from "@/lib/lifeboat/sweeper";
import { timelineRiskLabel } from "@/lib/lifeboat/timeline";
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

## Approval-to-drain timeline

${formatTimelineSection(report)}

## Address poisoning signals

${formatAddressPoisoningSection(report)}

## Spender contract risk

${formatSpenderRiskSection(report)}

## HEX stake status

${formatHexStakeSection(report)}

## Good Accounting Assist

${formatGoodAccountingSection(report)}

## Permit2 exposure

${formatPermit2ExposureSection(report)}

## EIP-7702 delegation

${formatEip7702Section(report)}

## Smart wallet / Safe configuration

${formatSmartWalletSection(report)}

## Token/NFT dust traps

${formatDustTrapSection(report)}

## What not to do

${LIFEBOAT_NOT_TO_DO.map((item) => `- ${item}`).join("\n")}

## Recommended next steps

${LIFEBOAT_NEXT_STEPS.map((item) => `- ${item}`).join("\n")}
`;
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

function formatTimelineSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.timelineEvidence.length > 0
          ? chain.timelineEvidence
              .map(
                (item) =>
                  `  - Approval ${item.approvalTxHash} then ${item.movementLabel} ${item.movementTxHash} after ${item.secondsAfterApproval}s${item.movementAmount ? ` (${item.movementAmount})` : ""}`,
              )
              .join("\n")
          : "  - No approval-to-outbound-movement sequence was found in the bounded recent-history window.";
      const recentEvents =
        chain.timelineEvents.length > 0
          ? chain.timelineEvents
              .slice(0, 5)
              .map(
                (item) =>
                  `  - ${item.occurredAt}: ${item.label} (${item.txHash})`,
              )
              .join("\n")
          : "  - No recent timeline events were available.";
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.timelineStatus,
      )}; ${timelineRiskLabel(chain.timelineRiskLevel)}
${evidence}
  Recent visible events:
${recentEvents}`;
    })
    .join("\n");

  return `${LIFEBOAT_TIMELINE_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatAddressPoisoningSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.addressPoisoningEvidence.length > 0
          ? chain.addressPoisoningEvidence
              .map(
                (item) =>
                  `  - Possible lookalike ${item.lookalikeAddress} resembles ${item.referenceAddress} in ${item.txHash} (${item.amount}; prefix ${item.comparedPrefix}, suffix ${item.comparedSuffix})`,
              )
              .join("\n")
          : "  - No inbound lookalike signal was found in the bounded recent-history window.";
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.addressPoisoningStatus,
      )}; ${addressPoisoningRiskLabel(chain.addressPoisoningRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_ADDRESS_POISONING_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatSpenderRiskSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.spenderRiskEvidence.length > 0
          ? chain.spenderRiskEvidence
              .map(
                (item) =>
                  `  - ${item.title}: ${item.address} - ${item.description}`,
              )
              .join("\n")
          : "  - No spender contract warning was found for the active approval spenders checked.";
      const spenderRows =
        chain.spenderRiskSpenders.length > 0
          ? chain.spenderRiskSpenders
              .slice(0, 8)
              .map((item) => {
                const registry = item.registryContext
                  ? `; registry: ${item.registryContext.label}`
                  : "";
                const contractName = item.contractName
                  ? `; contract: ${item.contractName}`
                  : "";
                return `  - ${item.address}: bytecode ${
                  item.hasBytecode === true
                    ? "present"
                    : item.hasBytecode === false
                      ? "not found"
                      : "unknown"
                }; source ${item.verifiedSource}; proxy ${
                  item.isProxy === true ? "yes" : item.isProxy === false ? "no" : "unknown"
                }${contractName}${registry}`;
              })
              .join("\n")
          : "  - No spender contract context rows were available.";
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.spenderRiskStatus,
      )}; ${spenderRiskLabel(chain.spenderRiskLevel)}
${evidence}
  Checked spenders:
${spenderRows}`;
    })
    .join("\n");

  return `${LIFEBOAT_SPENDER_RISK_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatHexStakeSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.hexStakeEvidence.length > 0
          ? chain.hexStakeEvidence
              .map(
                (item) =>
                  `  - ${item.title}: stake ${item.stakeId}; ${item.stakedHex}; locked day ${item.lockedDay}; end day ${item.endDay}; days late ${item.daysLate}. ${item.description}`,
              )
              .join("\n")
          : formatEmptyHexStakeEvidence(chain.hexStatus);
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.hexStatus,
      )}; ${hexStakeRiskLabel(chain.hexStakeRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_HEX_STAKE_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatGoodAccountingSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.goodAccountingEvidence.length > 0
          ? chain.goodAccountingEvidence
              .map(
                (item) =>
                  `  - ${item.title}: stake ${item.stakeId}; ${item.stakedHex}; end day ${item.endDay}; days late ${item.daysLate}. ${item.description}`,
              )
              .join("\n")
          : formatEmptyGoodAccountingEvidence(chain.goodAccountingStatus);
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.goodAccountingStatus,
      )}; ${goodAccountingAssistRiskLabel(chain.goodAccountingRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_GOOD_ACCOUNTING_ASSIST_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatEmptyGoodAccountingEvidence(
  status: LifeboatReport["chains"][number]["goodAccountingStatus"],
): string {
  if (status === "complete") {
    return "  - No Good Accounting candidate was found in the checked visible open HEX stake rows. This is not a historical ended-stake inventory.";
  }
  if (status === "unsupported") {
    return "  - This network is not marked supported for Good Accounting Assist.";
  }
  if (status === "upstream_unavailable" || status === "partial") {
    return "  - Good Accounting Assist is incomplete because the HEX stake diagnostic did not fully complete.";
  }
  return "  - Good Accounting Assist was not checked.";
}

function formatEmptyHexStakeEvidence(
  status: LifeboatReport["chains"][number]["hexStatus"],
): string {
  if (status === "complete") {
    return "  - No visible open HEX stake rows were found by the completed read. This is not a historical ended-stake inventory.";
  }
  if (status === "unsupported") {
    return "  - This network is not marked supported for the HEX stake diagnostic.";
  }
  if (status === "upstream_unavailable" || status === "partial") {
    return "  - The HEX stake check did not fully complete. Do not treat this as proof that no active, mature, late, or historical stakes exist.";
  }
  return "  - HEX stake status was not checked.";
}

function formatPermit2ExposureSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.permit2Evidence.length > 0
          ? chain.permit2Evidence
              .map((item) => {
                const expiration = item.expiration.iso
                  ? `expires ${item.expiration.iso}`
                  : "expiration unknown";
                const allowance = item.unlimited
                  ? `unlimited ${item.tokenSymbol}`
                  : item.formattedAllowance;
                return `  - ${item.tokenSymbol}: ${allowance} delegated to ${item.spenderAddress} (${expiration})`;
              })
              .join("\n")
          : "  - No active Permit2 delegated allowance row was found by the completed approval scan.";
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.permit2Status,
      )}; ${permit2ExposureRiskLabel(chain.permit2RiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_PERMIT2_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatEip7702Section(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.eip7702Evidence.length > 0
          ? chain.eip7702Evidence
              .map((item) => {
                const delegate = item.delegationAddress
                  ? ` delegate ${item.delegationAddress}`
                  : "";
                return `  - ${item.classification}: ${item.codeLengthBytes} bytes${delegate}. ${item.description}`;
              })
              .join("\n")
          : formatEmptyEip7702Evidence(chain.eip7702Status);
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.eip7702Status,
      )}; ${eip7702RiskLabel(chain.eip7702RiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_EIP7702_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatSmartWalletSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.smartWalletEvidence.length > 0
          ? chain.smartWalletEvidence
              .map((item) => {
                const owners = item.safeOwners.length
                  ? ` owners ${item.safeOwners.join(", ")}`
                  : "";
                const modules = item.safeModules.length
                  ? ` modules ${item.safeModules.join(", ")}`
                  : "";
                const threshold =
                  item.safeThreshold === null
                    ? ""
                    : ` threshold ${item.safeThreshold}`;
                return `  - ${item.title}: ${item.codeLengthBytes} code bytes${threshold}${owners}${modules}. ${item.description}`;
              })
              .join("\n")
          : formatEmptySmartWalletEvidence(chain.smartWalletStatus);
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.smartWalletStatus,
      )}; ${smartWalletRiskLabel(chain.smartWalletRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_SMART_WALLET_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatDustTrapSection(report: LifeboatReport): string {
  const rows = report.chains
    .map((chain) => {
      const evidence =
        chain.dustTrapEvidence.length > 0
          ? chain.dustTrapEvidence
              .map((item) => {
                const tokenId = item.tokenId ? ` tokenId ${item.tokenId}` : "";
                return `  - ${item.title}: ${item.displayName}${tokenId}; ${item.amount}; contract ${item.contractAddress}; tx ${item.txHash}. ${item.description}`;
              })
              .join("\n")
          : formatEmptyDustTrapEvidence(chain.dustTrapStatus);
      return `- ${chain.chainName}: ${formatModuleStatus(
        chain.dustTrapStatus,
      )}; ${dustTrapRiskLabel(chain.dustTrapRiskLevel)}
${evidence}`;
    })
    .join("\n");

  return `${LIFEBOAT_DUST_TRAP_DIAGNOSTIC_COPY.body}

${rows || "No network scan has been added to this report yet."}`;
}

function formatEmptySmartWalletEvidence(
  status: LifeboatReport["chains"][number]["smartWalletStatus"],
): string {
  if (status === "complete") {
    return "  - No account code was found at latest block. This is not proof that the wallet secret is uncompromised.";
  }
  if (status === "unsupported") {
    return "  - This network is not marked supported for smart-wallet configuration diagnostics.";
  }
  if (status === "upstream_unavailable" || status === "partial") {
    return "  - The smart-wallet configuration check did not fully complete. Do not treat this as proof that no Safe, module, guard, or session-key risk exists.";
  }
  return "  - Smart wallet / Safe configuration was not checked.";
}

function formatEmptyDustTrapEvidence(
  status: LifeboatReport["chains"][number]["dustTrapStatus"],
): string {
  if (status === "complete") {
    return "  - No dust/bait signal was found in the bounded inbound token/NFT history. This is not a full asset inventory.";
  }
  if (status === "unsupported") {
    return "  - This network is not marked supported for the dust-trap diagnostic.";
  }
  if (status === "upstream_unavailable" || status === "partial") {
    return "  - The dust-trap check did not fully complete. Do not treat this as proof that no suspicious dust exists.";
  }
  return "  - Token/NFT dust traps were not checked.";
}

function formatEmptyEip7702Evidence(
  status: LifeboatReport["chains"][number]["eip7702Status"],
): string {
  if (status === "complete") {
    return "  - No EIP-7702 delegation designator was found by the completed account-code check.";
  }
  if (status === "unsupported") {
    return "  - This network is not marked supported for the EIP-7702 diagnostic.";
  }
  if (status === "upstream_unavailable" || status === "partial") {
    return "  - The account-code check did not fully complete. Do not treat this as proof that no delegation exists.";
  }
  return "  - EIP-7702 delegation was not checked.";
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
