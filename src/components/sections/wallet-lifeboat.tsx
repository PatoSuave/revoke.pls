"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Address } from "viem";

import { ChainLogo } from "@/components/chains/chain-logo";
import { useApprovalDiscovery } from "@/hooks/use-approval-discovery";
import { useArbitrumApprovalScan } from "@/hooks/use-arbitrum-approval-scan";
import { useEthereumApprovalScan } from "@/hooks/use-ethereum-approval-scan";
import { useHyperEVMApprovalScan } from "@/hooks/use-hyperevm-approval-scan";
import { useLifeboatAddressPoisoningScan } from "@/hooks/use-lifeboat-address-poisoning-scan";
import { useLifeboatDustTrapScan } from "@/hooks/use-lifeboat-dust-trap-scan";
import { useLifeboatEip7702Scan } from "@/hooks/use-lifeboat-eip7702-scan";
import { useLifeboatErc4337Scan } from "@/hooks/use-lifeboat-erc4337-scan";
import { useLifeboatErc6909Scan } from "@/hooks/use-lifeboat-erc6909-scan";
import { useLifeboatHexStakeScan } from "@/hooks/use-lifeboat-hex-stake-scan";
import { useLifeboatPendingNonceScan } from "@/hooks/use-lifeboat-pending-nonce-scan";
import { useLifeboatSmartWalletScan } from "@/hooks/use-lifeboat-smart-wallet-scan";
import { useLifeboatSpenderRiskScan } from "@/hooks/use-lifeboat-spender-risk-scan";
import { useLifeboatSweeperScan } from "@/hooks/use-lifeboat-sweeper-scan";
import { useLifeboatTimelineScan } from "@/hooks/use-lifeboat-timeline-scan";
import { useNftApprovalDiscovery } from "@/hooks/use-nft-approval-discovery";
import { useOptimismApprovalScan } from "@/hooks/use-optimism-approval-scan";
import {
  addressOnlyScanOptions,
  getAddressOnlyScanOption,
  getSupportedAddressOnlyChainConfig,
  type AddressOnlyScanChainId,
  type AddressOnlyScanOption,
} from "@/lib/address-only-scan";
import { explorerAddressUrl, explorerTokenUrl, explorerTxUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import {
  LIFEBOAT_ADDRESS_POISONING_DIAGNOSTIC_COPY,
  LIFEBOAT_CRITICAL_WARNINGS,
  LIFEBOAT_DUST_TRAP_DIAGNOSTIC_COPY,
  LIFEBOAT_EIP7702_DIAGNOSTIC_COPY,
  LIFEBOAT_ERC4337_DIAGNOSTIC_COPY,
  LIFEBOAT_ERC6909_DIAGNOSTIC_COPY,
  LIFEBOAT_GOOD_ACCOUNTING_ASSIST_COPY,
  LIFEBOAT_HEX_STAKE_DIAGNOSTIC_COPY,
  LIFEBOAT_KNOWN_RISK_REGISTRY_COPY,
  LIFEBOAT_NEXT_STEPS,
  LIFEBOAT_NOT_TO_DO,
  LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY,
  LIFEBOAT_PERMIT2_DIAGNOSTIC_COPY,
  LIFEBOAT_SMART_WALLET_DIAGNOSTIC_COPY,
  LIFEBOAT_PLANNED_MODULES,
  LIFEBOAT_SPENDER_RISK_DIAGNOSTIC_COPY,
  LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY,
  LIFEBOAT_TIMELINE_DIAGNOSTIC_COPY,
  LIFEBOAT_VISIBLE_ASSETS_COPY,
} from "@/lib/lifeboat/copy";
import {
  addressPoisoningRiskLabel,
  type AddressPoisoningRiskLevel,
  type LifeboatAddressPoisoningApiResponse,
} from "@/lib/lifeboat/address-poisoning";
import {
  dustTrapRiskLabel,
  type DustTrapRiskLevel,
  type LifeboatDustTrapApiResponse,
} from "@/lib/lifeboat/dust-trap";
import {
  eip7702RiskLabel,
  type Eip7702RiskLevel,
  type LifeboatEip7702ApiResponse,
} from "@/lib/lifeboat/eip7702";
import {
  erc4337RiskLabel,
  type Erc4337RiskLevel,
  type LifeboatErc4337ApiResponse,
} from "@/lib/lifeboat/erc4337";
import {
  erc6909RiskLabel,
  type Erc6909RiskLevel,
  type LifeboatErc6909ApiResponse,
} from "@/lib/lifeboat/erc6909";
import {
  pendingNonceRiskLabel,
  type LifeboatPendingNonceApiResponse,
  type PendingNonceRiskLevel,
} from "@/lib/lifeboat/pending-nonce";
import {
  hexStakeRiskLabel,
  type HexStakeRiskLevel,
  type LifeboatHexStakeApiResponse,
} from "@/lib/lifeboat/hex-stake";
import {
  analyzeGoodAccountingAssist,
  goodAccountingAssistRiskLabel,
  type GoodAccountingAssistAnalysis,
  type GoodAccountingAssistRiskLevel,
} from "@/lib/lifeboat/good-accounting";
import {
  analyzePermit2Exposure,
  permit2ExposureRiskLabel,
  type Permit2ExposureAnalysis,
  type Permit2ExposureRiskLevel,
} from "@/lib/lifeboat/permit2-exposure";
import {
  analyzeKnownRiskRegistry,
  knownRiskRegistryRiskLabel,
  type KnownRiskRegistryAnalysis,
  type KnownRiskRegistryRiskLevel,
  type KnownRiskRegistrySubject,
  type KnownRiskRegistrySubjectRole,
} from "@/lib/lifeboat/known-risk-registry";
import {
  smartWalletRiskLabel,
  type LifeboatSmartWalletApiResponse,
  type SmartWalletRiskLevel,
} from "@/lib/lifeboat/smart-wallet";
import { buildWalletLifeboatReportMarkdown } from "@/lib/lifeboat/report";
import {
  spenderRiskLabel,
  type LifeboatSpenderRiskApiResponse,
  type SpenderRiskLevel,
} from "@/lib/lifeboat/spender-risk";
import {
  sweeperRiskLabel,
  type LifeboatSweeperApiResponse,
  type SweeperRiskLevel,
} from "@/lib/lifeboat/sweeper";
import {
  timelineRiskLabel,
  type LifeboatTimelineApiResponse,
  type TimelineRiskLevel,
} from "@/lib/lifeboat/timeline";
import {
  analyzeVisibleAssetsAtRisk,
  visibleAssetsRiskLabel,
  type VisibleAssetsAnalysis,
  type VisibleAssetsRiskLevel,
} from "@/lib/lifeboat/visible-assets";
import type {
  LifeboatChainReport,
  LifeboatModuleStatus,
  LifeboatReport,
  LifeboatScanSnapshot,
  LifeboatScanStatus,
} from "@/lib/lifeboat/types";
import type { NftApproval } from "@/lib/nft-approvals";
import { scoreApprovals, type RiskLevel, type ScoredApproval } from "@/lib/risk";
import { normalizeScanInputAddress } from "@/lib/scan-target";

const INITIAL_CHAIN_ID = addressOnlyScanOptions[0].chainId;

export function WalletLifeboat() {
  const [inputAddress, setInputAddress] = useState("");
  const [owner, setOwner] = useState<Address | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [selectedChainId, setSelectedChainId] =
    useState<AddressOnlyScanChainId>(INITIAL_CHAIN_ID);
  const selectedOption = getAddressOnlyScanOption(selectedChainId);
  const scan = useLifeboatScan({
    owner,
    selectedChainId,
    selectedOption,
  });
  const sweeper = useLifeboatSweeperScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const pendingNonce = useLifeboatPendingNonceScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const timeline = useLifeboatTimelineScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const addressPoisoning = useLifeboatAddressPoisoningScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const eip7702 = useLifeboatEip7702Scan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const smartWallet = useLifeboatSmartWalletScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const erc4337 = useLifeboatErc4337Scan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const erc6909 = useLifeboatErc6909Scan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const dustTrap = useLifeboatDustTrapScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const hexStake = useLifeboatHexStakeScan({
    owner: owner ?? undefined,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner),
  });
  const goodAccountingAssist = useMemo(
    () => analyzeGoodAccountingAssist(hexStake.response),
    [hexStake.response],
  );
  const approvalSpenderAddresses = useMemo(
    () => collectApprovalSpenderAddresses(scan.approvals, scan.nftApprovals),
    [scan.approvals, scan.nftApprovals],
  );
  const spenderRisk = useLifeboatSpenderRiskScan({
    spenderAddresses: approvalSpenderAddresses,
    chainId: selectedChainId,
    chainName: selectedOption.displayName,
    enabled: Boolean(owner) && approvalSpenderAddresses.length > 0,
  });
  const permit2Exposure = useMemo(
    () =>
      analyzePermit2Exposure({
        approvals: scan.approvals,
        approvalStatus: scan.approvalsStatus,
      }),
    [scan.approvals, scan.approvalsStatus],
  );
  const visibleAssets = useMemo(
    () =>
      analyzeVisibleAssetsAtRisk({
        approvals: scan.approvals,
        nftApprovals: scan.nftApprovals,
        approvalsStatus: scan.approvalsStatus,
        nftApprovalsStatus: scan.nftApprovalsStatus,
      }),
    [
      scan.approvals,
      scan.nftApprovals,
      scan.approvalsStatus,
      scan.nftApprovalsStatus,
    ],
  );
  const knownRiskRegistry = useMemo(
    () =>
      analyzeKnownRiskRegistry({
        enabled: Boolean(owner),
        chainId: selectedChainId,
        subjects: collectKnownRiskRegistrySubjects({
          owner,
          approvals: scan.approvals,
          nftApprovals: scan.nftApprovals,
          timeline: timeline.response,
          addressPoisoning: addressPoisoning.response,
          spenderRisk: spenderRisk.response,
          eip7702: eip7702.response,
          smartWallet: smartWallet.response,
          erc4337: erc4337.response,
          erc6909: erc6909.response,
          dustTrap: dustTrap.response,
        }),
      }),
    [
      owner,
      selectedChainId,
      scan.approvals,
      scan.nftApprovals,
      timeline.response,
      addressPoisoning.response,
      spenderRisk.response,
      eip7702.response,
      smartWallet.response,
      erc4337.response,
      erc6909.response,
      dustTrap.response,
    ],
  );
  const scoredApprovals = useMemo(
    () => sortScoredApprovals(scoreApprovals(scan.approvals)),
    [scan.approvals],
  );
  const sortedNftApprovals = useMemo(
    () => sortNftApprovals(scan.nftApprovals),
    [scan.nftApprovals],
  );
  const triageSignals = buildTriageSignals({
    scan,
    sweeper: sweeper.response,
    pendingNonce: pendingNonce.response,
    timeline: timeline.response,
    addressPoisoning: addressPoisoning.response,
    spenderRisk: spenderRisk.response,
    permit2Exposure,
    visibleAssets,
    knownRiskRegistry,
    eip7702: eip7702.response,
    smartWallet: smartWallet.response,
    erc4337: erc4337.response,
    erc6909: erc6909.response,
    dustTrap: dustTrap.response,
    hexStake: hexStake.response,
    goodAccountingAssist,
  });
  const triageSummary = summarizeTriageSignals(triageSignals);

  function scanAddress() {
    const normalized = normalizeScanInputAddress(inputAddress);
    if (!normalized) {
      setOwner(null);
      setInputError("Enter a valid EVM wallet address.");
      return;
    }
    setInputAddress(normalized);
    setOwner(normalized);
    setInputError(null);
  }

  function clearScan() {
    setInputAddress("");
    setOwner(null);
    setInputError(null);
  }

  return (
    <section className="bg-pulse-bg">
      <div className="border-b border-pulse-border/60 bg-pulse-bg">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
          <div className="max-w-4xl">
            <p className="text-sm font-semibold tracking-[0.12em] text-pulse-cyan">
              Wallet Lifeboat
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold text-pulse-text sm:text-5xl">
              Check a risky wallet before adding gas.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-pulse-muted sm:text-lg">
              Paste a wallet address to review approvals, NFT permissions,
              gas-sweeper signals, HEX stake status, and other visible risk
              indicators. Read-only first. No seed phrase. No private key.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-pulse-cyan/30 bg-pulse-cyan/10 px-3 py-1 text-sm font-semibold text-pulse-cyan">
                Read-only scan
              </span>
              <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-sm font-semibold text-pulse-muted">
                No wallet connection required
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="lg:col-span-7 xl:col-span-8">
            <LifeboatControls
              inputAddress={inputAddress}
              selectedChainId={selectedChainId}
              owner={owner}
              inputError={inputError}
              onInputAddressChange={(value) => {
                setInputAddress(value);
                setInputError(null);
              }}
              onSelectedChainIdChange={setSelectedChainId}
              onScan={scanAddress}
              onClear={clearScan}
            />
          </div>
          <div className="lg:col-span-5 xl:col-span-4">
            <SafetyPanel />
          </div>
        </div>

        <LifeboatChecksGrid />

        <GuidedTriageReport
          scan={scan}
          owner={owner}
          signals={triageSignals}
          summary={triageSummary}
        />

        <div className="mt-8 grid gap-8 xl:grid-cols-12 xl:items-start">
          <div className="space-y-6 xl:col-span-8">
            <section className="rounded-3xl border border-pulse-border bg-pulse-panel/55 p-5 sm:p-6">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
                  Diagnostic details
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-pulse-text">
                  Open the groups that need review.
                </h2>
                <p className="mt-2 text-base leading-7 text-pulse-muted">
                  The detailed modules stay lower on the page so the top of the
                  report stays readable. Groups with findings, incomplete
                  checks, or active scans open automatically.
                </p>
              </div>
              <div className="mt-5 space-y-4">
            <DiagnosticGroup
              title="Exposure"
              eyebrow="What can spend or move assets"
              description="Approvals, NFT permissions, visible asset exposure, and Permit2 context."
              modules={[
                diagnosticModule(
                  "Token approvals",
                  scan.approvalsStatus,
                  toneForModule(scan.approvalsStatus, scan.approvals.length),
                  scan.approvals.length,
                ),
                diagnosticModule(
                  "NFT approvals",
                  scan.nftApprovalsStatus,
                  toneForModule(
                    scan.nftApprovalsStatus,
                    scan.nftApprovals.length,
                  ),
                  scan.nftApprovals.length,
                ),
                diagnosticModule(
                  "Visible assets",
                  moduleStatusFromVisibleAssets(scan),
                  toneForVisibleAssets(visibleAssets.riskLevel),
                  visibleAssets.evidence.length,
                ),
                diagnosticModule(
                  "Permit2",
                  moduleStatusFromPermit2Exposure(scan.approvalsStatus),
                  toneForPermit2Exposure(permit2Exposure.riskLevel),
                  permit2Exposure.evidence.length,
                ),
              ]}
            >
              <LifeboatApprovalsSection
                approvals={scoredApprovals}
                status={scan.approvalsStatus}
                owner={owner}
                option={selectedOption}
                isScanning={scan.status === "scanning"}
              />
              <LifeboatNftApprovalsSection
                approvals={sortedNftApprovals}
                status={scan.nftApprovalsStatus}
                owner={owner}
                option={selectedOption}
                isScanning={scan.status === "scanning"}
              />
              <VisibleAssetsSection
                visibleAssets={visibleAssets}
                owner={owner}
                option={selectedOption}
                status={moduleStatusFromVisibleAssets(scan)}
              />
              <Permit2ExposureSection
                permit2Exposure={permit2Exposure}
                owner={owner}
                option={selectedOption}
                status={moduleStatusFromPermit2Exposure(scan.approvalsStatus)}
              />
            </DiagnosticGroup>

            <DiagnosticGroup
              title="Active compromise signals"
              eyebrow="Recent wallet behavior"
              description="Gas-sweeper patterns, pending nonce state, approval-to-drain timing, address poisoning, and dust traps."
              modules={[
                diagnosticModule(
                  "Gas sweeper",
                  moduleStatusFromSweeperResponse(sweeper.response),
                  toneForSweeper(sweeper.response.riskLevel),
                  sweeper.response.evidence.length,
                ),
                diagnosticModule(
                  "Pending nonce",
                  moduleStatusFromPendingNonceResponse(pendingNonce.response),
                  toneForPendingNonce(pendingNonce.response.riskLevel),
                  pendingNonce.response.evidence.length,
                ),
                diagnosticModule(
                  "Timeline",
                  moduleStatusFromTimelineResponse(timeline.response),
                  toneForTimeline(timeline.response.riskLevel),
                  timeline.response.evidence.length,
                ),
                diagnosticModule(
                  "Address poisoning",
                  moduleStatusFromAddressPoisoningResponse(
                    addressPoisoning.response,
                  ),
                  toneForAddressPoisoning(addressPoisoning.response.riskLevel),
                  addressPoisoning.response.evidence.length,
                ),
                diagnosticModule(
                  "Dust traps",
                  moduleStatusFromDustTrapResponse(dustTrap.response),
                  toneForDustTrap(dustTrap.response.riskLevel),
                  dustTrap.response.evidence.length,
                ),
              ]}
            >
              <SweeperActivitySection
                sweeper={sweeper.response}
                owner={owner}
                option={selectedOption}
                isScanning={sweeper.status === "pending"}
              />
              <PendingNonceActivitySection
                pendingNonce={pendingNonce.response}
                owner={owner}
                option={selectedOption}
                isScanning={pendingNonce.status === "pending"}
              />
              <TimelineActivitySection
                timeline={timeline.response}
                owner={owner}
                option={selectedOption}
                isScanning={timeline.status === "pending"}
              />
              <AddressPoisoningSection
                addressPoisoning={addressPoisoning.response}
                owner={owner}
                option={selectedOption}
                isScanning={addressPoisoning.status === "pending"}
              />
              <DustTrapSection
                dustTrap={dustTrap.response}
                owner={owner}
                option={selectedOption}
                isScanning={dustTrap.status === "pending"}
              />
            </DiagnosticGroup>

            <DiagnosticGroup
              title="Account and delegation risk"
              eyebrow="Contracts, registries, and account control"
              description="Spender contract context, known-risk registry matches, delegation, smart wallet, ERC-4337, and ERC-6909 signals."
              modules={[
                diagnosticModule(
                  "Spender risk",
                  moduleStatusFromSpenderRiskResponse(spenderRisk.response),
                  toneForSpenderRisk(spenderRisk.response.riskLevel),
                  spenderRisk.response.evidence.length,
                ),
                diagnosticModule(
                  "Known-risk registry",
                  moduleStatusFromKnownRiskRegistry(knownRiskRegistry),
                  toneForKnownRiskRegistry(knownRiskRegistry.riskLevel),
                  knownRiskRegistry.evidence.length,
                ),
                diagnosticModule(
                  "EIP-7702",
                  moduleStatusFromEip7702Response(eip7702.response),
                  toneForEip7702(eip7702.response.riskLevel),
                  eip7702.response.evidence.length,
                ),
                diagnosticModule(
                  "Smart wallet / Safe",
                  moduleStatusFromSmartWalletResponse(smartWallet.response),
                  toneForSmartWallet(smartWallet.response.riskLevel),
                  smartWallet.response.evidence.length,
                ),
                diagnosticModule(
                  "ERC-4337",
                  moduleStatusFromErc4337Response(erc4337.response),
                  toneForErc4337(erc4337.response.riskLevel),
                  erc4337.response.evidence.length,
                ),
                diagnosticModule(
                  "ERC-6909",
                  moduleStatusFromErc6909Response(erc6909.response),
                  toneForErc6909(erc6909.response.riskLevel),
                  erc6909.response.evidence.length,
                ),
              ]}
            >
              <SpenderRiskSection
                spenderRisk={spenderRisk.response}
                owner={owner}
                option={selectedOption}
                isScanning={spenderRisk.status === "pending"}
                activeSpenderCount={approvalSpenderAddresses.length}
              />
              <KnownRiskRegistrySection
                knownRiskRegistry={knownRiskRegistry}
                owner={owner}
                option={selectedOption}
              />
              <Eip7702DelegationSection
                eip7702={eip7702.response}
                owner={owner}
                option={selectedOption}
                isScanning={eip7702.status === "pending"}
              />
              <SmartWalletSection
                smartWallet={smartWallet.response}
                owner={owner}
                option={selectedOption}
                isScanning={smartWallet.status === "pending"}
              />
              <Erc4337Section
                erc4337={erc4337.response}
                owner={owner}
                option={selectedOption}
                isScanning={erc4337.status === "pending"}
              />
              <Erc6909Section
                erc6909={erc6909.response}
                owner={owner}
                option={selectedOption}
                isScanning={erc6909.status === "pending"}
              />
            </DiagnosticGroup>

            <DiagnosticGroup
              title="HEX and staking"
              eyebrow="Locked or time-sensitive value"
              description="Read-only HEX stake diagnostics and Good Accounting Assist context."
              modules={[
                diagnosticModule(
                  "HEX stake",
                  moduleStatusFromHexStakeResponse(hexStake.response),
                  toneForHexStake(hexStake.response.riskLevel),
                  hexStake.response.evidence.length,
                ),
                diagnosticModule(
                  "Good Accounting Assist",
                  moduleStatusFromGoodAccountingAssist(goodAccountingAssist),
                  toneForGoodAccountingAssist(goodAccountingAssist.riskLevel),
                  goodAccountingAssist.evidence.length,
                ),
              ]}
            >
              <HexStakeSection
                hexStake={hexStake.response}
                owner={owner}
                option={selectedOption}
                isScanning={hexStake.status === "pending"}
              />
              <GoodAccountingAssistSection
                goodAccountingAssist={goodAccountingAssist}
                hexStake={hexStake.response}
                owner={owner}
                option={selectedOption}
              />
            </DiagnosticGroup>
              </div>
            </section>

            <PlannedDiagnostics />
            <DetectionLimits />
          </div>
          <aside className="space-y-4 xl:sticky xl:top-24 xl:col-span-4">
            <ReportStatusCard
              owner={owner}
              scan={scan}
              summary={triageSummary}
            />
            <RecommendedNextSteps
              owner={owner}
              scan={scan}
              elevatedCount={triageSummary.needsAttentionCount}
              incompleteCount={triageSummary.incompleteCount}
            />
            <ReportExport
              scan={scan}
              owner={owner}
              sweeper={sweeper.response}
              pendingNonce={pendingNonce.response}
              timeline={timeline.response}
              addressPoisoning={addressPoisoning.response}
              spenderRisk={spenderRisk.response}
              permit2Exposure={permit2Exposure}
              visibleAssets={visibleAssets}
              knownRiskRegistry={knownRiskRegistry}
              eip7702={eip7702.response}
              smartWallet={smartWallet.response}
              erc4337={erc4337.response}
              erc6909={erc6909.response}
              dustTrap={dustTrap.response}
              hexStake={hexStake.response}
              goodAccountingAssist={goodAccountingAssist}
            />
            <CompletenessPanel
              summary={triageSummary}
              scan={scan}
              sweeper={sweeper.response}
              pendingNonce={pendingNonce.response}
              timeline={timeline.response}
              addressPoisoning={addressPoisoning.response}
              spenderRisk={spenderRisk.response}
              permit2Exposure={permit2Exposure}
              visibleAssets={visibleAssets}
              knownRiskRegistry={knownRiskRegistry}
              permit2Status={moduleStatusFromPermit2Exposure(scan.approvalsStatus)}
              eip7702={eip7702.response}
              smartWallet={smartWallet.response}
              erc4337={erc4337.response}
              erc6909={erc6909.response}
              dustTrap={dustTrap.response}
              hexStake={hexStake.response}
              goodAccountingAssist={goodAccountingAssist}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}

function LifeboatControls({
  inputAddress,
  selectedChainId,
  owner,
  inputError,
  onInputAddressChange,
  onSelectedChainIdChange,
  onScan,
  onClear,
}: {
  inputAddress: string;
  selectedChainId: AddressOnlyScanChainId;
  owner: Address | null;
  inputError: string | null;
  onInputAddressChange: (value: string) => void;
  onSelectedChainIdChange: (chainId: AddressOnlyScanChainId) => void;
  onScan: () => void;
  onClear: () => void;
}) {
  const selectedOption = getAddressOnlyScanOption(selectedChainId);
  return (
    <section className="h-full rounded-3xl border border-pulse-cyan/25 bg-pulse-panel/80 p-5 shadow-glow sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
            Wallet to inspect
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-pulse-text">
            Paste the address you want to inspect.
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-pulse-muted">
            Lifeboat reviews public signals for one wallet on one network at a
            time before you connect anything.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <span className="inline-flex w-fit rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-1 text-sm font-semibold text-pulse-cyan">
            Read-only scan
          </span>
          <span className="inline-flex w-fit rounded-full border border-pulse-border bg-pulse-bg/55 px-3 py-1 text-sm font-semibold text-pulse-muted">
            No wallet connection required
          </span>
        </div>
      </div>

      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onScan();
        }}
      >
        <label
          className="text-sm font-semibold text-pulse-muted"
          htmlFor="lifeboat-address-input"
        >
          Wallet address to inspect
        </label>
        <input
          id="lifeboat-address-input"
          value={inputAddress}
          onChange={(event) => onInputAddressChange(event.target.value)}
          placeholder="0x..."
          autoComplete="off"
          spellCheck={false}
          className="min-h-14 rounded-2xl border border-pulse-border bg-pulse-bg/85 px-4 py-3 font-mono text-base text-pulse-text outline-none transition placeholder:text-pulse-muted/60 focus:border-pulse-cyan/60"
        />
        {inputError ? (
          <p className="text-sm font-semibold text-pulse-red">{inputError}</p>
        ) : null}

        <label
          className="text-sm font-semibold text-pulse-muted"
          htmlFor="lifeboat-chain-select"
        >
          Network
        </label>
        <select
          id="lifeboat-chain-select"
          value={selectedChainId}
          onChange={(event) =>
            onSelectedChainIdChange(Number(event.target.value) as AddressOnlyScanChainId)
          }
          className="min-h-14 rounded-2xl border border-pulse-border bg-pulse-bg/85 px-4 py-3 text-base text-pulse-text outline-none transition focus:border-pulse-cyan/60"
        >
          {addressOnlyScanOptions.map((option) => (
            <option key={option.chainId} value={option.chainId}>
              {option.displayName} (ID {option.chainId})
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-pulse-gradient px-5 py-3 text-base font-semibold text-pulse-on-gradient shadow-glow transition hover:brightness-110"
          >
            Scan wallet
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!owner && !inputAddress}
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-pulse-border bg-pulse-text/5 px-5 py-3 text-base font-semibold text-pulse-muted transition hover:bg-pulse-text/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-2xl border border-pulse-border/70 bg-pulse-bg/45 p-4 text-sm leading-6 text-pulse-muted">
        <div className="flex items-center gap-2">
          <ChainLogo chainId={selectedOption.chainId} className="h-4 w-4" />
          <span className="font-semibold text-pulse-text">
            {selectedOption.displayName}
          </span>
        </div>
        <p className="mt-2">
          Wallet Lifeboat scans one network at a time in this first pass. Use
          the standard scanner for its full multi-network workflow when you are
          ready to continue.
        </p>
      </div>
    </section>
  );
}

function SafetyPanel() {
  return (
    <section className="h-full rounded-3xl border border-pulse-border bg-pulse-panel/70 p-5 sm:p-6">
      <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
        Before you do anything
      </p>
      <ul className="mt-4 grid gap-3 text-base leading-7 text-pulse-muted">
        <li className="flex gap-3">
          <span
            className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan"
            aria-hidden
          />
          <span>Do not add gas to a wallet you believe is compromised.</span>
        </li>
        <li className="flex gap-3">
          <span
            className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan"
            aria-hidden
          />
          <span>Never enter a seed phrase or private key.</span>
        </li>
        <li className="flex gap-3">
          <span
            className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan"
            aria-hidden
          />
          <span>
            Revoking approvals does not secure a wallet if the wallet itself is
            compromised.
          </span>
        </li>
      </ul>
      <p className="mt-5 rounded-2xl border border-pulse-border/70 bg-pulse-bg/45 p-4 text-sm leading-6 text-pulse-muted">
        This page is a read-only triage view. It helps you inspect visible
        signals before deciding what to review next.
      </p>
    </section>
  );
}

function LifeboatChecksGrid() {
  const checks = [
    {
      title: "Approvals",
      body: "Active token allowances and spender context from the existing scanner.",
    },
    {
      title: "NFT permissions",
      body: "Collection-wide and token-specific permission rows found in public data.",
    },
    {
      title: "Gas-sweeper signals",
      body: "Recent native-token movement patterns and pending nonce context.",
    },
    {
      title: "HEX stake status",
      body: "Read-only PulseChain stake diagnostics and Good Accounting context.",
    },
  ] as const;

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
            What Lifeboat checks
          </p>
          <p className="mt-1 text-base leading-7 text-pulse-muted">
            A quick view of the main read-only signals in this pass.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <article
            key={check.title}
            className="rounded-2xl border border-pulse-border bg-pulse-panel/55 p-4"
          >
            <h3 className="text-base font-semibold text-pulse-text">
              {check.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-pulse-muted">
              {check.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

type TriageTone = "neutral" | "success" | "warning" | "danger";

type TriageSignal = {
  label: string;
  value: string;
  tone: TriageTone;
  status: LifeboatModuleStatus;
  findingCount: number;
};

type TriageSummaryCounts = {
  needsAttentionCount: number;
  noIssueDetectedCount: number;
  incompleteCount: number;
};

type DiagnosticModuleSummary = {
  label: string;
  status: LifeboatModuleStatus;
  tone: TriageTone;
  findingCount: number;
};

type BuildTriageSignalsInput = {
  scan: LifeboatScanSnapshot;
  sweeper: LifeboatSweeperApiResponse;
  pendingNonce: LifeboatPendingNonceApiResponse;
  timeline: LifeboatTimelineApiResponse;
  addressPoisoning: LifeboatAddressPoisoningApiResponse;
  spenderRisk: LifeboatSpenderRiskApiResponse;
  permit2Exposure: Permit2ExposureAnalysis;
  visibleAssets: VisibleAssetsAnalysis;
  knownRiskRegistry: KnownRiskRegistryAnalysis;
  eip7702: LifeboatEip7702ApiResponse;
  smartWallet: LifeboatSmartWalletApiResponse;
  erc4337: LifeboatErc4337ApiResponse;
  erc6909: LifeboatErc6909ApiResponse;
  dustTrap: LifeboatDustTrapApiResponse;
  hexStake: LifeboatHexStakeApiResponse;
  goodAccountingAssist: GoodAccountingAssistAnalysis;
};

function buildTriageSignals({
  scan,
  sweeper,
  pendingNonce,
  timeline,
  addressPoisoning,
  spenderRisk,
  permit2Exposure,
  visibleAssets,
  knownRiskRegistry,
  eip7702,
  smartWallet,
  erc4337,
  erc6909,
  dustTrap,
  hexStake,
  goodAccountingAssist,
}: BuildTriageSignalsInput): TriageSignal[] {
  return [
    {
      label: "Visible approval risk",
      value: statusLabelForApprovals(scan.approvalsStatus, scan.approvals.length),
      tone: toneForModule(scan.approvalsStatus, scan.approvals.length),
      status: scan.approvalsStatus,
      findingCount: scan.approvals.length,
    },
    {
      label: "NFT permission risk",
      value: statusLabelForApprovals(
        scan.nftApprovalsStatus,
        scan.nftApprovals.length,
      ),
      tone: toneForModule(scan.nftApprovalsStatus, scan.nftApprovals.length),
      status: scan.nftApprovalsStatus,
      findingCount: scan.nftApprovals.length,
    },
    {
      label: "Visible assets at risk",
      value: statusLabelForVisibleAssets(visibleAssets),
      tone: toneForVisibleAssets(visibleAssets.riskLevel),
      status: moduleStatusFromVisibleAssets(scan),
      findingCount: visibleAssets.evidence.length,
    },
    {
      label: "Gas-sweeper pattern",
      value: statusLabelForSweeper(sweeper),
      tone: toneForSweeper(sweeper.riskLevel),
      status: moduleStatusFromSweeperResponse(sweeper),
      findingCount: sweeper.evidence.length,
    },
    {
      label: "Pending transaction activity",
      value: statusLabelForPendingNonce(pendingNonce),
      tone: toneForPendingNonce(pendingNonce.riskLevel),
      status: moduleStatusFromPendingNonceResponse(pendingNonce),
      findingCount: pendingNonce.evidence.length,
    },
    {
      label: "Approval-to-drain timeline",
      value: statusLabelForTimeline(timeline),
      tone: toneForTimeline(timeline.riskLevel),
      status: moduleStatusFromTimelineResponse(timeline),
      findingCount: timeline.evidence.length,
    },
    {
      label: "Address poisoning signals",
      value: statusLabelForAddressPoisoning(addressPoisoning),
      tone: toneForAddressPoisoning(addressPoisoning.riskLevel),
      status: moduleStatusFromAddressPoisoningResponse(addressPoisoning),
      findingCount: addressPoisoning.evidence.length,
    },
    {
      label: "Spender contract risk",
      value: statusLabelForSpenderRisk(spenderRisk),
      tone: toneForSpenderRisk(spenderRisk.riskLevel),
      status: moduleStatusFromSpenderRiskResponse(spenderRisk),
      findingCount: spenderRisk.evidence.length,
    },
    {
      label: "Permit2 exposure",
      value: statusLabelForPermit2Exposure(permit2Exposure),
      tone: toneForPermit2Exposure(permit2Exposure.riskLevel),
      status: moduleStatusFromPermit2Exposure(scan.approvalsStatus),
      findingCount: permit2Exposure.evidence.length,
    },
    {
      label: "Known-risk registry",
      value: statusLabelForKnownRiskRegistry(knownRiskRegistry),
      tone: toneForKnownRiskRegistry(knownRiskRegistry.riskLevel),
      status: moduleStatusFromKnownRiskRegistry(knownRiskRegistry),
      findingCount: knownRiskRegistry.evidence.length,
    },
    {
      label: "HEX stake status",
      value: statusLabelForHexStake(hexStake),
      tone: toneForHexStake(hexStake.riskLevel),
      status: moduleStatusFromHexStakeResponse(hexStake),
      findingCount: hexStake.evidence.length,
    },
    {
      label: "Good Accounting Assist",
      value: statusLabelForGoodAccountingAssist(goodAccountingAssist),
      tone: toneForGoodAccountingAssist(goodAccountingAssist.riskLevel),
      status: moduleStatusFromGoodAccountingAssist(goodAccountingAssist),
      findingCount: goodAccountingAssist.evidence.length,
    },
    {
      label: "EIP-7702 delegation",
      value: statusLabelForEip7702(eip7702),
      tone: toneForEip7702(eip7702.riskLevel),
      status: moduleStatusFromEip7702Response(eip7702),
      findingCount: eip7702.evidence.length,
    },
    {
      label: "Smart wallet / Safe",
      value: statusLabelForSmartWallet(smartWallet),
      tone: toneForSmartWallet(smartWallet.riskLevel),
      status: moduleStatusFromSmartWalletResponse(smartWallet),
      findingCount: smartWallet.evidence.length,
    },
    {
      label: "ERC-4337 / session keys",
      value: statusLabelForErc4337(erc4337),
      tone: toneForErc4337(erc4337.riskLevel),
      status: moduleStatusFromErc4337Response(erc4337),
      findingCount: erc4337.evidence.length,
    },
    {
      label: "ERC-6909 approvals",
      value: statusLabelForErc6909(erc6909),
      tone: toneForErc6909(erc6909.riskLevel),
      status: moduleStatusFromErc6909Response(erc6909),
      findingCount: erc6909.evidence.length,
    },
    {
      label: "Token/NFT dust traps",
      value: statusLabelForDustTrap(dustTrap),
      tone: toneForDustTrap(dustTrap.riskLevel),
      status: moduleStatusFromDustTrapResponse(dustTrap),
      findingCount: dustTrap.evidence.length,
    },
    {
      label: "Report completeness",
      value:
        scan.status === "complete"
          ? "Scan complete"
          : scan.status === "partial"
            ? "Incomplete diagnostics"
            : scan.status === "failed"
              ? "Upstream unavailable"
              : scan.status === "scanning"
                ? "Scanning"
              : "Not scanned",
      tone:
        scan.status === "complete"
          ? "success"
          : scan.status === "partial" || scan.status === "failed"
            ? "warning"
            : "neutral",
      status:
        scan.status === "complete"
          ? "complete"
          : scan.status === "partial"
            ? "partial"
            : scan.status === "failed"
              ? "upstream_unavailable"
              : scan.status === "scanning"
                ? "scanning"
                : "not_scanned",
      findingCount: scan.incompleteReasons.length,
    },
  ];
}

function summarizeTriageSignals(
  signals: readonly TriageSignal[],
): TriageSummaryCounts {
  return {
    needsAttentionCount: signals.filter(
      (signal) => signal.tone === "danger" || signal.tone === "warning",
    ).length,
    noIssueDetectedCount: signals.filter(
      (signal) =>
        signal.label !== "Report completeness" &&
        signal.status === "complete" &&
        signal.tone === "success",
    ).length,
    incompleteCount: signals.filter((signal) =>
      isIncompleteModuleStatus(signal.status),
    ).length,
  };
}

function GuidedTriageReport({
  scan,
  owner,
  signals,
  summary,
}: {
  scan: LifeboatScanSnapshot;
  owner: Address | null;
  signals: readonly TriageSignal[];
  summary: TriageSummaryCounts;
}) {
  const prioritySignals = priorityTriageSignals(signals);

  return (
    <section className="mt-8 rounded-3xl border border-pulse-border bg-pulse-panel/65 p-5 shadow-glow sm:p-6 lg:p-7">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
            Scan summary
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-pulse-text">
            Start with what needs attention.
          </h2>
          <p className="mt-2 max-w-3xl text-base leading-7 text-pulse-muted">
            This card summarizes the scan before the full diagnostic modules.
            It does not certify the wallet or replace manual review.
          </p>
        </div>
        <p className="font-mono text-sm text-pulse-muted">
          {owner ? shortenAddress(owner) : "No wallet scanned"}
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <QuickStatusMetric
          label="Needs attention"
          value={
            owner ? summary.needsAttentionCount.toString() : "Not scanned"
          }
        />
        <QuickStatusMetric
          label="No issue detected"
          value={
            owner ? summary.noIssueDetectedCount.toString() : "Not scanned"
          }
        />
        <QuickStatusMetric
          label="Incomplete checks"
          value={owner ? summary.incompleteCount.toString() : "Not scanned"}
        />
        <QuickStatusMetric
          label="Token approvals"
          value={owner ? scan.approvals.length.toString() : "Not scanned"}
        />
        <QuickStatusMetric
          label="NFT approvals"
          value={owner ? scan.nftApprovals.length.toString() : "Not scanned"}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-pulse-text">
              Top priority findings
            </h3>
            <p className="mt-1 text-sm leading-6 text-pulse-muted">
              The highest-signal checks are shown first. Open diagnostic
              details for the full context.
            </p>
          </div>
          <span className="text-sm font-semibold text-pulse-muted">
            {scanStatusLabel(scan.status)}
          </span>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {prioritySignals.map((signal) => (
            <PriorityFinding key={signal.label} signal={signal} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStatusMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pulse-border/70 bg-pulse-bg/45 p-4">
      <p className="text-sm font-semibold text-pulse-muted">
        {label}
      </p>
      <p className="mt-1 break-words text-xl font-semibold text-pulse-text">
        {value}
      </p>
    </div>
  );
}

function PriorityFinding({ signal }: { signal: TriageSignal }) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClassForTriage(signal.tone)}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {signal.label}
          </p>
          <p className="mt-1 text-lg font-semibold text-pulse-text">
            {signal.value}
          </p>
        </div>
        <span className="inline-flex w-fit rounded-full border border-current/30 px-3 py-1 text-xs font-semibold">
          {calmSignalStatusLabel(signal)}
        </span>
      </div>
    </div>
  );
}

function ReportStatusCard({
  owner,
  scan,
  summary,
}: {
  owner: Address | null;
  scan: LifeboatScanSnapshot;
  summary: TriageSummaryCounts;
}) {
  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/65 p-5">
      <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
        Report status
      </p>
      <h2 className="mt-1 text-xl font-semibold text-pulse-text">
        {scanStatusLabel(scan.status)}
      </h2>
      <p className="mt-2 break-all font-mono text-sm text-pulse-muted">
        {owner ? shortenAddress(owner) : "No wallet scanned"}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <CompactMetric
          label="Needs attention"
          value={
            owner ? summary.needsAttentionCount.toString() : "-"
          }
        />
        <CompactMetric
          label="No issue detected"
          value={
            owner ? summary.noIssueDetectedCount.toString() : "-"
          }
        />
        <CompactMetric
          label="Incomplete"
          value={owner ? summary.incompleteCount.toString() : "-"}
        />
      </div>
    </section>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pulse-border/70 bg-pulse-bg/45 p-3">
      <p className="text-lg font-semibold text-pulse-text">{value}</p>
      <p className="mt-1 text-xs leading-4 text-pulse-muted">{label}</p>
    </div>
  );
}

function RecommendedNextSteps({
  owner,
  scan,
  elevatedCount,
  incompleteCount,
}: {
  owner: Address | null;
  scan: LifeboatScanSnapshot;
  elevatedCount: number;
  incompleteCount: number;
}) {
  const steps = recommendedNextSteps({ owner, scan, elevatedCount, incompleteCount });
  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/65 p-5">
      <h3 className="text-base font-semibold text-pulse-text">
        Recommended next steps
      </h3>
      <ol className="mt-3 grid gap-2 text-sm leading-6 text-pulse-muted">
        {steps.map((step) => (
          <li key={step} className="flex gap-2">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan"
              aria-hidden
            />
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function DiagnosticGroup({
  title,
  eyebrow,
  description,
  modules,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  modules: readonly DiagnosticModuleSummary[];
  children: React.ReactNode;
}) {
  const defaultOpen = modules.some(shouldOpenDiagnosticGroup);
  const priorityCount = modules.filter((module) =>
    module.tone === "danger" || module.tone === "warning"
  ).length;
  const findingCount = modules.reduce(
    (total, module) => total + module.findingCount,
    0,
  );
  const summary =
    priorityCount > 0
      ? `${priorityCount} priority`
      : findingCount > 0
        ? `${findingCount} finding${findingCount === 1 ? "" : "s"}`
        : "Review details";

  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-pulse-border/70 bg-pulse-bg/35 p-4 [&>summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 rounded-xl outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pulse-cyan sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-pulse-text">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-pulse-muted">
            {description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm font-semibold text-pulse-muted">
          <span className="rounded-full border border-pulse-border bg-pulse-bg/50 px-3 py-1">
            {summary}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-bg/50 px-2.5 py-1 transition group-open:rotate-45">
            +
          </span>
        </div>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function diagnosticModule(
  label: string,
  status: LifeboatModuleStatus,
  tone: TriageTone,
  findingCount: number,
): DiagnosticModuleSummary {
  return { label, status, tone, findingCount };
}

function shouldOpenDiagnosticGroup(module: DiagnosticModuleSummary): boolean {
  return (
    module.status === "scanning" ||
    isIncompleteModuleStatus(module.status) ||
    module.tone === "danger" ||
    module.tone === "warning" ||
    module.findingCount > 0
  );
}

function isIncompleteModuleStatus(status: LifeboatModuleStatus): boolean {
  return (
    status === "partial" ||
    status === "upstream_unavailable" ||
    status === "unsupported"
  );
}

function priorityTriageSignals(signals: readonly TriageSignal[]): TriageSignal[] {
  const prioritized = signals
    .filter((signal) => shouldPrioritizeSignal(signal))
    .sort((a, b) => triageSignalRank(a) - triageSignalRank(b));

  if (prioritized.length > 0) return prioritized.slice(0, 5);

  return signals
    .filter((signal) =>
      [
        "Visible approval risk",
        "NFT permission risk",
        "Gas-sweeper pattern",
        "Report completeness",
      ].includes(signal.label),
    )
    .slice(0, 4);
}

function shouldPrioritizeSignal(signal: TriageSignal): boolean {
  return (
    signal.status === "scanning" ||
    isIncompleteModuleStatus(signal.status) ||
    signal.tone === "danger" ||
    signal.tone === "warning" ||
    signal.findingCount > 0
  );
}

function triageSignalRank(signal: TriageSignal): number {
  if (signal.tone === "danger") return 0;
  if (signal.tone === "warning") return 1;
  if (signal.status === "scanning") return 2;
  if (signal.findingCount > 0) return 3;
  if (signal.tone === "success") return 4;
  return 5;
}

function toneClassForTriage(tone: TriageTone): string {
  return {
    neutral: "border-pulse-border bg-pulse-bg/45 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function scanStatusLabel(status: LifeboatScanStatus): string {
  if (status === "idle") return "Not scanned";
  if (status === "scanning") return "Scanning";
  if (status === "partial") return "Verification incomplete";
  if (status === "failed") return "Upstream unavailable";
  return "Scan complete";
}

function calmSignalStatusLabel(signal: TriageSignal): string {
  if (signal.status === "scanning") return "Scanning";
  if (signal.status === "upstream_unavailable") return "Upstream unavailable";
  if (isIncompleteModuleStatus(signal.status)) return "Verification incomplete";
  if (signal.tone === "danger") return "Needs review";
  if (signal.tone === "warning") return "Possible risk";
  if (signal.tone === "success") return "No issue detected";
  return "Review manually";
}

function recommendedNextSteps({
  owner,
  scan,
  elevatedCount,
  incompleteCount,
}: {
  owner: Address | null;
  scan: LifeboatScanSnapshot;
  elevatedCount: number;
  incompleteCount: number;
}): string[] {
  if (!owner) {
    return [
      "Paste a public wallet address and choose one network to start.",
      "Read the warnings before adding gas to a wallet you believe is compromised.",
      "Connect a wallet only in the standard scanner when you are ready to revoke.",
    ];
  }

  if (scan.status === "scanning") {
    return [
      "Wait for in-progress diagnostics before acting on the report.",
      "Treat missing or pending rows as incomplete context.",
      "Export the read-only snapshot after the scan settles.",
    ];
  }

  if (elevatedCount > 0) {
    return [
      "Review the priority findings before adding gas or signing anything.",
      "Open the highlighted diagnostic groups and verify important addresses on the explorer.",
      "Use the standard scanner only when you are ready to revoke from the matching wallet and chain.",
    ];
  }

  if (incompleteCount > 0) {
    return [
      "Review incomplete diagnostics and provider warnings before deciding what to do next.",
      "Do not treat missing rows as proof that no exposure exists.",
      "Export the report so the unresolved context is preserved.",
    ];
  }

  return [
    "Review the Exposure group first, then any account or staking context that applies.",
    "Export the report if you need to compare results later.",
    "Use the standard scanner only when you are ready to review revoke actions.",
  ];
}

function LifeboatApprovalsSection({
  approvals,
  status,
  owner,
  option,
  isScanning,
}: {
  approvals: readonly ScoredApproval[];
  status: LifeboatModuleStatus;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  return (
    <ReportSection
      title="Active token approvals"
      eyebrow="Visible approval risk"
      status={status}
      count={approvals.length}
      emptyCopy="No active rows found for this network scan."
      owner={owner}
      option={option}
      isScanning={isScanning}
    >
      {approvals.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {approvals.map((approval) => (
              <li
                key={approval.key}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-pulse-text">
                    {approval.tokenSymbol}
                  </p>
                  <a
                    href={tokenUrlFor(option, approval.tokenAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={approval.tokenAddress}
                  >
                    {approval.tokenName ?? shortenAddress(approval.tokenAddress)}
                  </a>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-pulse-text">
                    {approval.spenderLabel}
                  </p>
                  <a
                    href={addressUrlFor(option, approval.spenderAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={approval.spenderAddress}
                  >
                    {shortenAddress(approval.spenderAddress)}
                  </a>
                  <p className="mt-1 text-[11px] text-pulse-muted">
                    {approval.trusted ? "Known spender label" : "Unknown spender"}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <RiskBadge level={approval.risk.level} />
                  <span className="rounded-full border border-pulse-border bg-pulse-panel/60 px-2.5 py-1 text-xs font-semibold text-pulse-muted">
                    {approval.unlimited
                      ? "Unlimited"
                      : approval.formattedAllowance}
                  </span>
                  <span className="rounded-full border border-pulse-border bg-pulse-panel/60 px-2.5 py-1 text-xs font-semibold text-pulse-muted">
                    Read-only row
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ReportSection>
  );
}

function LifeboatNftApprovalsSection({
  approvals,
  status,
  owner,
  option,
  isScanning,
}: {
  approvals: readonly NftApproval[];
  status: LifeboatModuleStatus;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  return (
    <ReportSection
      title="NFT approvals"
      eyebrow="NFT permission risk"
      status={status}
      count={approvals.length}
      emptyCopy="No active rows found for this network scan."
      owner={owner}
      option={option}
      isScanning={isScanning}
    >
      {approvals.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {approvals.map((approval) => (
              <li
                key={approval.key}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-pulse-text">
                    {approval.collectionName ??
                      shortenAddress(approval.collectionAddress)}
                  </p>
                  <a
                    href={tokenUrlFor(option, approval.collectionAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={approval.collectionAddress}
                  >
                    {shortenAddress(approval.collectionAddress)}
                  </a>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-pulse-text">
                    {approval.operatorLabel}
                  </p>
                  <a
                    href={addressUrlFor(option, approval.operatorAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={approval.operatorAddress}
                  >
                    {shortenAddress(approval.operatorAddress)}
                  </a>
                  <p className="mt-1 text-[11px] text-pulse-muted">
                    {approval.trusted ? "Known operator label" : "Unknown operator"}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                  <RiskBadge level={approval.risk.level} />
                  <span className="rounded-full border border-pulse-border bg-pulse-panel/60 px-2.5 py-1 text-xs font-semibold text-pulse-muted">
                    {approval.kind === "approvalForAll"
                      ? "Collection-wide"
                      : `Token ${approval.tokenId?.toString() ?? ""}`}
                  </span>
                  <span className="rounded-full border border-pulse-border bg-pulse-panel/60 px-2.5 py-1 text-xs font-semibold text-pulse-muted">
                    Read-only row
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ReportSection>
  );
}

function VisibleAssetsSection({
  visibleAssets,
  owner,
  option,
  status,
}: {
  visibleAssets: VisibleAssetsAnalysis;
  owner: Address | null;
  option: AddressOnlyScanOption;
  status: LifeboatModuleStatus;
}) {
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_VISIBLE_ASSETS_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Assets exposed by active approvals
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} token and NFT approval rows are grouped by exposed asset without fetching balances.`
              : "Paste a wallet address to summarize assets exposed by active approval rows."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForVisibleAssets(
            visibleAssets.riskLevel,
          )}`}
        >
          {visibleAssetsRiskLabel(visibleAssets.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_VISIBLE_ASSETS_COPY.body}
      </p>

      {owner && (status === "complete" || status === "partial") ? (
        <VisibleAssetsSummary visibleAssets={visibleAssets} />
      ) : null}

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This context is incomplete because one or more source approval scans
          did not fully complete. Do not treat missing asset rows as proof that
          the wallet has no exposure.
        </div>
      ) : null}

      {owner && visibleAssets.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {visibleAssets.evidence.map((item) => (
              <li
                key={`${item.assetAddress}-${item.spenderAddress}-${item.exposureKind}-${item.tokenId ?? "all"}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <a
                    href={tokenUrlFor(option, item.assetAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-semibold text-pulse-text underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.assetAddress}
                  >
                    {item.assetLabel}
                  </a>
                  <p className="mt-1 truncate font-mono text-xs text-pulse-muted">
                    {shortenAddress(item.assetAddress)}
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={addressUrlFor(option, item.spenderAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.spenderAddress}
                  >
                    {shortenAddress(item.spenderAddress)}
                  </a>
                  <p className="mt-1 text-sm font-semibold text-pulse-text">
                    {item.spenderLabel}
                  </p>
                  <p className="mt-1 text-[11px] text-pulse-muted">
                    {item.trustedSpender
                      ? "Known spender label"
                      : "Unknown spender"}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>{visibleAssetExposureLabel(item.exposureKind)}</p>
                  <p>{item.amount ?? "approval exposure"}</p>
                  {item.tokenId ? <p>Token ID {item.tokenId}</p> : null}
                  <p className="uppercase tracking-wide">
                    {item.riskLevel} context
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No asset exposure rows were found from the completed approval scans.
          This is not proof that the wallet has no assets, hidden approvals, or
          off-chain authorization risk.
        </div>
      ) : null}
    </section>
  );
}

function VisibleAssetsSummary({
  visibleAssets,
}: {
  visibleAssets: VisibleAssetsAnalysis;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Assets"
        value={visibleAssets.summary.uniqueAssetCount.toString()}
      />
      <SweeperMetric
        label="Spenders"
        value={visibleAssets.summary.uniqueSpenderCount.toString()}
      />
      <SweeperMetric
        label="Unlimited"
        value={visibleAssets.summary.unlimitedTokenApprovalCount.toString()}
      />
      <SweeperMetric
        label="NFT-wide"
        value={visibleAssets.summary.collectionWideNftApprovalCount.toString()}
      />
      {visibleAssets.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {visibleAssets.warnings.join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function ReportSection({
  title,
  eyebrow,
  status,
  count,
  emptyCopy,
  owner,
  option,
  isScanning,
  children,
}: {
  title: string;
  eyebrow: string;
  status: LifeboatModuleStatus;
  count: number;
  emptyCopy: string;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
  children: React.ReactNode;
}) {
  const showEmpty = owner && status === "complete" && count === 0;
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} rows are shown without revoke controls.`
              : "Paste a wallet address to start a read-only scan."}
          </p>
        </div>
        <StatusPill status={status} count={count} isScanning={isScanning} />
      </div>
      <div className="mt-4">
        {showEmpty ? (
          <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm text-pulse-muted">
            {emptyCopy}
          </div>
        ) : status === "partial" || status === "upstream_unavailable" ? (
          <div className="rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
            This scan is incomplete. Do not treat missing rows as proof that
            the wallet has no exposure.
          </div>
        ) : null}
        {children}
      </div>
      {owner ? (
        <div className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted">
          Need to revoke later? Open the standard scanner and paste the same
          address. Lifeboat does not render wallet write controls.{" "}
          <Link
            href="/app#scanner"
            className="font-semibold text-pulse-cyan underline underline-offset-2 hover:text-pulse-text"
          >
            Go to scanner
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function StatusPill({
  status,
  count,
  isScanning,
}: {
  status: LifeboatModuleStatus;
  count: number;
  isScanning: boolean;
}) {
  const label = isScanning
    ? "Scanning"
    : statusLabelForApprovals(status, count);
  const tone = toneForModule(status, count);
  const toneClass = {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

function SweeperActivitySection({
  sweeper,
  owner,
  option,
  isScanning,
}: {
  sweeper: LifeboatSweeperApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromSweeperResponse(sweeper);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Recent native-gas movement
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} recent normal transactions are checked without connecting or funding the wallet.`
              : "Paste a wallet address to check for a bounded sweeper-like activity pattern."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForSweeper(
            sweeper.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : sweeperRiskLabel(sweeper.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_SWEEPER_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing sweeper evidence
          as proof that the wallet has no sweeper-like activity.
        </div>
      ) : null}

      {owner && status === "complete" ? (
        <SweeperSummary sweeper={sweeper} option={option} />
      ) : null}

      {owner && sweeper.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {sweeper.evidence.map((item) => (
              <li
                key={`${item.inboundTxHash}-${item.outboundTxHash}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    Gas deposit then outbound transfer
                  </p>
                  <p className="mt-1 text-xs text-pulse-muted">
                    {item.secondsBetween}s between transactions
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={txUrlFor(option, item.inboundTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.inboundTxHash}
                  >
                    In: {shortHash(item.inboundTxHash)}
                  </a>
                  <a
                    href={txUrlFor(option, item.outboundTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.outboundTxHash}
                  >
                    Out: {shortHash(item.outboundTxHash)}
                  </a>
                </div>
                <div className="min-w-0 lg:text-right">
                  <p className="text-xs font-semibold text-pulse-text">
                    {item.amountNative}
                  </p>
                  <a
                    href={addressUrlFor(option, item.possibleSweeperAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.possibleSweeperAddress}
                  >
                    {shortenAddress(item.possibleSweeperAddress)}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {owner && status === "complete" && sweeper.evidence.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No quick native-gas drain pattern was found in the bounded recent
          normal-transaction window. This is not proof that the wallet is
          uncompromised.
        </div>
      ) : null}
    </section>
  );
}

function SweeperSummary({
  sweeper,
  option,
}: {
  sweeper: LifeboatSweeperApiResponse;
  option: AddressOnlyScanOption;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Checked"
        value={`${sweeper.summary.checkedTransactionCount} tx`}
      />
      <SweeperMetric
        label="Inbound native"
        value={sweeper.summary.inboundNativeTransferCount.toString()}
      />
      <SweeperMetric
        label="Quick drains"
        value={sweeper.summary.quickDrainCount.toString()}
      />
      <SweeperMetric
        label="Window"
        value={`${sweeper.summary.windowSeconds}s`}
      />
      {sweeper.errors.length > 0 || sweeper.missingConfig.length > 0 ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 sm:col-span-2 lg:col-span-4">
          {[...sweeper.errors, ...sweeper.missingConfig].join(" ")}
        </div>
      ) : null}
      {sweeper.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {sweeper.warnings.join(" ")} Verify activity on {option.displayName}
          {" "}before taking action.
        </div>
      ) : null}
    </dl>
  );
}

function SweeperMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-pulse-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-pulse-text">{value}</dd>
    </div>
  );
}

function PendingNonceActivitySection({
  pendingNonce,
  owner,
  option,
  isScanning,
}: {
  pendingNonce: LifeboatPendingNonceApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromPendingNonceResponse(pendingNonce);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Latest vs pending nonce
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} RPC nonce state is checked without connecting or signing.`
              : "Paste a wallet address to check whether the selected RPC reports pending wallet activity."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForPendingNonce(
            pendingNonce.riskLevel,
          )}`}
        >
          {isScanning
            ? "Scanning"
            : pendingNonceRiskLabel(pendingNonce.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_PENDING_NONCE_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat a missing pending nonce
          result as proof that the wallet has no pending or private
          transactions.
        </div>
      ) : null}

      {owner && status === "complete" ? (
        <PendingNonceSummary pendingNonce={pendingNonce} option={option} />
      ) : null}

      {owner && pendingNonce.evidence.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          <p className="font-semibold text-pulse-text">
            Pending nonce gap detected
          </p>
          <p className="mt-2">
            The selected RPC reported {pendingNonce.summary.pendingTransactionCount}{" "}
            pending transaction
            {pendingNonce.summary.pendingTransactionCount === 1 ? "" : "s"} for
            this wallet. Review the wallet and explorer carefully before adding
            gas or signing anything.
          </p>
        </div>
      ) : null}

      {owner && status === "complete" && pendingNonce.evidence.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No pending nonce gap was reported by the selected RPC. This is not
          proof that the wallet has no private, dropped, replaced, or unindexed
          transactions.
        </div>
      ) : null}
    </section>
  );
}

function PendingNonceSummary({
  pendingNonce,
  option,
}: {
  pendingNonce: LifeboatPendingNonceApiResponse;
  option: AddressOnlyScanOption;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-3">
      <SweeperMetric
        label="Latest nonce"
        value={pendingNonce.summary.latestNonce ?? "Unknown"}
      />
      <SweeperMetric
        label="Pending nonce"
        value={pendingNonce.summary.pendingNonce ?? "Unknown"}
      />
      <SweeperMetric
        label="Pending gap"
        value={pendingNonce.summary.pendingTransactionCount.toString()}
      />
      {pendingNonce.errors.length > 0 || pendingNonce.missingConfig.length > 0 ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 sm:col-span-3">
          {[...pendingNonce.errors, ...pendingNonce.missingConfig].join(" ")}
        </div>
      ) : null}
      {pendingNonce.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-3">
          {pendingNonce.warnings.join(" ")} Verify activity on{" "}
          {option.displayName} before taking action.
        </div>
      ) : null}
    </dl>
  );
}

function TimelineActivitySection({
  timeline,
  owner,
  option,
  isScanning,
}: {
  timeline: LifeboatTimelineApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromTimelineResponse(timeline);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_TIMELINE_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Visible event ordering
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} explorer history is checked without connecting, signing, or funding the wallet.`
              : "Paste a wallet address to build a bounded read-only approval and movement timeline."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForTimeline(
            timeline.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : timelineRiskLabel(timeline.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_TIMELINE_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing timeline events
          as proof that the wallet has no suspicious approval-to-movement
          sequence.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <TimelineSummary timeline={timeline} option={option} />
      ) : null}

      {owner && timeline.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {timeline.evidence.map((item) => (
              <li
                key={`${item.approvalTxHash}-${item.movementTxHash}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    Approval followed by outbound movement
                  </p>
                  <p className="mt-1 text-xs text-pulse-muted">
                    {item.secondsAfterApproval}s after approval
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={item.approvalExplorerUrl ?? txUrlFor(option, item.approvalTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.approvalTxHash}
                  >
                    Approval: {shortHash(item.approvalTxHash)}
                  </a>
                  <a
                    href={item.movementExplorerUrl ?? txUrlFor(option, item.movementTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.movementTxHash}
                  >
                    Move: {shortHash(item.movementTxHash)}
                  </a>
                </div>
                <div className="min-w-0 lg:text-right">
                  <p className="text-xs font-semibold text-pulse-text">
                    {item.movementAmount ?? item.movementLabel}
                  </p>
                  {item.recipient ? (
                    <a
                      href={addressUrlFor(option, item.recipient)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                      title={item.recipient}
                    >
                      {shortenAddress(item.recipient)}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {owner && timeline.events.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {timeline.events.slice(0, 6).map((item) => (
              <li
                key={item.id}
                className="grid gap-3 border-b border-pulse-border/60 p-4 last:border-b-0 sm:grid-cols-[1fr_0.75fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs text-pulse-muted">
                    {new Date(item.occurredAt).toLocaleString()}
                  </p>
                </div>
                <div className="min-w-0 sm:text-right">
                  <a
                    href={item.explorerUrl ?? txUrlFor(option, item.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.txHash}
                  >
                    {shortHash(item.txHash)}
                  </a>
                  <p className="mt-1 truncate text-xs text-pulse-muted">
                    {item.amount ?? eventKindLabel(item.kind)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {owner && status === "complete" && timeline.evidence.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No approval-to-outbound-movement sequence was found in the bounded
          recent-history window. This is not proof that the wallet is
          uncompromised.
        </div>
      ) : null}
    </section>
  );
}

function TimelineSummary({
  timeline,
  option,
}: {
  timeline: LifeboatTimelineApiResponse;
  option: AddressOnlyScanOption;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Checked"
        value={`${timeline.summary.checkedEventCount} events`}
      />
      <SweeperMetric
        label="Approvals"
        value={timeline.summary.approvalEventCount.toString()}
      />
      <SweeperMetric
        label="Outbound moves"
        value={timeline.summary.outboundMovementCount.toString()}
      />
      <SweeperMetric
        label="Sequences"
        value={timeline.summary.possibleSequenceCount.toString()}
      />
      {timeline.errors.length > 0 || timeline.missingConfig.length > 0 ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 sm:col-span-2 lg:col-span-4">
          {[...timeline.errors, ...timeline.missingConfig].join(" ")}
        </div>
      ) : null}
      {timeline.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {timeline.warnings.join(" ")} Verify activity on {option.displayName}
          {" "}before taking action.
        </div>
      ) : null}
    </dl>
  );
}

function AddressPoisoningSection({
  addressPoisoning,
  owner,
  option,
  isScanning,
}: {
  addressPoisoning: LifeboatAddressPoisoningApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromAddressPoisoningResponse(addressPoisoning);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_ADDRESS_POISONING_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Recent lookalike addresses
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} recent inbound transfers are compared against outbound addresses without changing contacts or preparing transactions.`
              : "Paste a wallet address to check for possible lookalike-address history poisoning."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForAddressPoisoning(
            addressPoisoning.riskLevel,
          )}`}
        >
          {isScanning
            ? "Scanning"
            : addressPoisoningRiskLabel(addressPoisoning.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_ADDRESS_POISONING_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing lookalike signals
          as proof that the wallet has no address-poisoning risk.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <AddressPoisoningSummary
          addressPoisoning={addressPoisoning}
          option={option}
        />
      ) : null}

      {owner && addressPoisoning.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {addressPoisoning.evidence.map((item) => (
              <li
                key={`${item.txHash}-${item.lookalikeAddress}-${item.referenceAddress}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    Possible lookalike transfer
                  </p>
                  <p className="mt-1 text-xs text-pulse-muted">
                    Shares {item.sharedPrefixLength} prefix and{" "}
                    {item.sharedSuffixLength} suffix characters.
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={addressUrlFor(option, item.lookalikeAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.lookalikeAddress}
                  >
                    Lookalike: {shortenAddress(item.lookalikeAddress)}
                  </a>
                  <a
                    href={addressUrlFor(option, item.referenceAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.referenceAddress}
                  >
                    Compared with: {shortenAddress(item.referenceAddress)}
                  </a>
                  <p className="mt-1 text-[11px] text-pulse-muted">
                    Prefix {item.comparedPrefix}; suffix {item.comparedSuffix}
                  </p>
                </div>
                <div className="min-w-0 lg:text-right">
                  <p className="text-xs font-semibold text-pulse-text">
                    {item.amount}
                  </p>
                  <a
                    href={item.explorerUrl ?? txUrlFor(option, item.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.txHash}
                  >
                    {shortHash(item.txHash)}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {owner && status === "complete" && addressPoisoning.evidence.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No inbound lookalike signal was found in the bounded recent-history
          window. This is not proof that the wallet is free of phishing or
          address-poisoning attempts.
        </div>
      ) : null}
    </section>
  );
}

function AddressPoisoningSummary({
  addressPoisoning,
  option,
}: {
  addressPoisoning: LifeboatAddressPoisoningApiResponse;
  option: AddressOnlyScanOption;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Checked"
        value={`${addressPoisoning.summary.checkedEventCount} events`}
      />
      <SweeperMetric
        label="Inbound"
        value={addressPoisoning.summary.inboundEventCount.toString()}
      />
      <SweeperMetric
        label="References"
        value={addressPoisoning.summary.outboundReferenceCount.toString()}
      />
      <SweeperMetric
        label="Lookalikes"
        value={addressPoisoning.summary.possiblePoisoningCount.toString()}
      />
      {addressPoisoning.errors.length > 0 ||
      addressPoisoning.missingConfig.length > 0 ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 sm:col-span-2 lg:col-span-4">
          {[...addressPoisoning.errors, ...addressPoisoning.missingConfig].join(
            " ",
          )}
        </div>
      ) : null}
      {addressPoisoning.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {addressPoisoning.warnings.join(" ")} Verify copied addresses on{" "}
          {option.displayName} before taking action.
        </div>
      ) : null}
    </dl>
  );
}

function SpenderRiskSection({
  spenderRisk,
  owner,
  option,
  isScanning,
  activeSpenderCount,
}: {
  spenderRisk: LifeboatSpenderRiskApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
  activeSpenderCount: number;
}) {
  const status = moduleStatusFromSpenderRiskResponse(spenderRisk);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_SPENDER_RISK_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Approval spender context
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} active approval spenders are checked for public contract context without blocking actions or making scam claims.`
              : "Paste a wallet address to check active approval spenders for public contract context."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForSpenderRisk(
            spenderRisk.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : spenderRiskLabel(spenderRisk.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_SPENDER_RISK_DIAGNOSTIC_COPY.body}
      </p>

      {owner && activeSpenderCount === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No active approval spender rows are available yet. This module runs
          after the visible approval scan finds token or NFT approvals.
        </div>
      ) : null}

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing spender warnings
          as proof that active approval spenders are benign.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <SpenderRiskSummary spenderRisk={spenderRisk} />
      ) : null}

      {owner && spenderRisk.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {spenderRisk.evidence.map((item) => (
              <li
                key={`${item.address}-${item.title}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-pulse-muted">
                    {item.description}
                  </p>
                </div>
                <div className="min-w-0 lg:text-right">
                  <a
                    href={item.explorerUrl ?? addressUrlFor(option, item.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.address}
                  >
                    {shortenAddress(item.address)}
                  </a>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-pulse-muted">
                    {item.riskLevel} signal
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {owner && spenderRisk.spenders.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {spenderRisk.spenders.map((spender) => (
              <li
                key={spender.address}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <a
                    href={spender.explorerUrl ?? addressUrlFor(option, spender.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={spender.address}
                  >
                    {shortenAddress(spender.address)}
                  </a>
                  <p className="mt-1 text-sm font-semibold text-pulse-text">
                    {spender.registryContext?.label ??
                      spender.contractName ??
                      "Unknown spender"}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>
                    Bytecode:{" "}
                    {spender.hasBytecode === true
                      ? "present"
                      : spender.hasBytecode === false
                        ? "not found"
                        : "unknown"}
                  </p>
                  <p>Source: {spender.verifiedSource}</p>
                  <p>
                    Proxy:{" "}
                    {spender.isProxy === true
                      ? "reported"
                      : spender.isProxy === false
                        ? "not reported"
                        : "unknown"}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>
                    Registry:{" "}
                    {spender.registryContext
                      ? spender.registryContext.protocol
                      : "no reviewed match"}
                  </p>
                  {spender.registryContext?.source ? (
                    <a
                      href={spender.registryContext.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:text-pulse-cyan hover:underline"
                    >
                      Source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function SpenderRiskSummary({
  spenderRisk,
}: {
  spenderRisk: LifeboatSpenderRiskApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Checked"
        value={`${spenderRisk.summary.checkedSpenderCount} spenders`}
      />
      <SweeperMetric
        label="Contracts"
        value={spenderRisk.summary.contractSpenderCount.toString()}
      />
      <SweeperMetric
        label="No bytecode"
        value={spenderRisk.summary.eoaSpenderCount.toString()}
      />
      <SweeperMetric
        label="Registry matches"
        value={spenderRisk.summary.registryMatchCount.toString()}
      />
      {spenderRisk.errors.length > 0 || spenderRisk.missingConfig.length > 0 ? (
        <div className="rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100 sm:col-span-2 lg:col-span-4">
          {[...spenderRisk.errors, ...spenderRisk.missingConfig].join(" ")}
        </div>
      ) : null}
      {spenderRisk.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {spenderRisk.warnings.join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function Permit2ExposureSection({
  permit2Exposure,
  owner,
  option,
  status,
}: {
  permit2Exposure: Permit2ExposureAnalysis;
  owner: Address | null;
  option: AddressOnlyScanOption;
  status: LifeboatModuleStatus;
}) {
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_PERMIT2_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Delegated Permit2 allowances
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} Permit2 rows are derived from the live-read approval scan for the pasted address.`
              : "Paste a wallet address to check for active Permit2 delegated allowances where the selected scan supports them."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForPermit2Exposure(
            permit2Exposure.riskLevel,
          )}`}
        >
          {status === "scanning"
            ? "Scanning"
            : permit2ExposureRiskLabel(permit2Exposure.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_PERMIT2_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete because the underlying approval scan did
          not fully complete. Do not treat missing Permit2 rows as proof that no
          Permit2 or signature-based exposure exists.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <Permit2ExposureSummary permit2Exposure={permit2Exposure} />
      ) : null}

      {owner && permit2Exposure.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {permit2Exposure.evidence.map((item) => (
              <li
                key={`${item.tokenAddress}-${item.spenderAddress}-${item.nonce ?? "none"}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <a
                    href={tokenUrlFor(option, item.tokenAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-sm font-semibold text-pulse-text underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.tokenAddress}
                  >
                    {item.tokenSymbol}
                  </a>
                  <p className="mt-1 truncate font-mono text-xs text-pulse-muted">
                    {shortenAddress(item.tokenAddress)}
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={addressUrlFor(option, item.spenderAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.spenderAddress}
                  >
                    {shortenAddress(item.spenderAddress)}
                  </a>
                  <p className="mt-1 text-sm font-semibold text-pulse-text">
                    {item.spenderLabel}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>
                    Allowance:{" "}
                    {item.unlimited
                      ? `unlimited ${item.tokenSymbol}`
                      : item.formattedAllowance}
                  </p>
                  <p>Expires: {formatPermit2Expiration(item.expiration.iso)}</p>
                  <p>Nonce: {item.nonce ?? "unknown"}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No active Permit2 delegated allowance row was found by the completed
          approval scan. This is not an all-clear for off-chain signatures or
          unsupported data sources.
        </div>
      ) : null}
    </section>
  );
}

function Permit2ExposureSummary({
  permit2Exposure,
}: {
  permit2Exposure: Permit2ExposureAnalysis;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Active rows"
        value={permit2Exposure.summary.activePermit2Count.toString()}
      />
      <SweeperMetric
        label="Unlimited"
        value={permit2Exposure.summary.unlimitedPermit2Count.toString()}
      />
      <SweeperMetric
        label="Expiring"
        value={permit2Exposure.summary.expiringPermit2Count.toString()}
      />
      <SweeperMetric
        label="Unknown expiry"
        value={permit2Exposure.summary.unknownExpirationCount.toString()}
      />
      {permit2Exposure.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {permit2Exposure.warnings.join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function KnownRiskRegistrySection({
  knownRiskRegistry,
  owner,
  option,
}: {
  knownRiskRegistry: KnownRiskRegistryAnalysis;
  owner: Address | null;
  option: AddressOnlyScanOption;
}) {
  const status = moduleStatusFromKnownRiskRegistry(knownRiskRegistry);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_KNOWN_RISK_REGISTRY_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Reviewed address context
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} approval, event, and diagnostic addresses are compared against a local reviewed registry.`
              : "Paste a wallet address to compare discovered counterparties against the reviewed local registry."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForKnownRiskRegistry(
            knownRiskRegistry.riskLevel,
          )}`}
        >
          {knownRiskRegistryRiskLabel(knownRiskRegistry.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_KNOWN_RISK_REGISTRY_COPY.body}
      </p>

      {owner && status === "complete" ? (
        <KnownRiskRegistrySummary knownRiskRegistry={knownRiskRegistry} />
      ) : null}

      {owner && knownRiskRegistry.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {knownRiskRegistry.evidence.map((item) => (
              <li
                key={`${item.entryId}-${item.address}-${item.subjectRole}-${item.sourceModule}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-pulse-muted">
                    {item.summary}
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={addressUrlFor(option, item.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.address}
                  >
                    {shortenAddress(item.address)}
                  </a>
                  <p className="mt-1 text-xs leading-5 text-pulse-muted">
                    {registryRoleLabel(item.subjectRole)} from{" "}
                    {item.sourceModule}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>{item.confidence} confidence</p>
                  <p>Reviewed {formatReviewedDate(item.reviewedAt)}</p>
                  <p>{item.expired ? "Expired entry" : "Current review"}</p>
                  {item.sources[0] ? (
                    <a
                      href={item.sources[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-2 hover:text-pulse-cyan hover:underline"
                    >
                      Source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No reviewed registry match was found for the checked address context.
          This is not proof that the wallet, spenders, recipients, contracts, or
          counterparties are benign.
        </div>
      ) : null}
    </section>
  );
}

function KnownRiskRegistrySummary({
  knownRiskRegistry,
}: {
  knownRiskRegistry: KnownRiskRegistryAnalysis;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Checked"
        value={`${knownRiskRegistry.summary.checkedSubjectCount} addresses`}
      />
      <SweeperMetric
        label="Unique"
        value={knownRiskRegistry.summary.uniqueAddressCount.toString()}
      />
      <SweeperMetric
        label="Matches"
        value={knownRiskRegistry.summary.matchCount.toString()}
      />
      <SweeperMetric
        label="Sources"
        value={knownRiskRegistry.summary.reviewedSourceCount.toString()}
      />
      {knownRiskRegistry.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {knownRiskRegistry.warnings.join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function Eip7702DelegationSection({
  eip7702,
  owner,
  option,
  isScanning,
}: {
  eip7702: LifeboatEip7702ApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromEip7702Response(eip7702);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_EIP7702_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Account-code delegation
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} latest account code is checked for the EIP-7702 delegation designator where this diagnostic is supported.`
              : "Paste a wallet address to check whether supported networks report EIP-7702 delegation code."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForEip7702(
            eip7702.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : eip7702RiskLabel(eip7702.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_EIP7702_DIAGNOSTIC_COPY.body}
      </p>

      {owner && status === "unsupported" ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          {eip7702.warnings[0] ??
            "This network is not marked supported for this diagnostic yet."}
        </div>
      ) : null}

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing EIP-7702 evidence
          as proof that the wallet is secure or that no delegation exists.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <Eip7702Summary eip7702={eip7702} />
      ) : null}

      {owner && eip7702.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {eip7702.evidence.map((item) => (
              <li
                key={`${item.accountAddress}-${item.classification}-${item.delegationAddress ?? "none"}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {eip7702ClassificationLabel(item.classification)}
                  </p>
                  <a
                    href={item.explorerUrl ?? addressUrlFor(option, item.accountAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.accountAddress}
                  >
                    {shortenAddress(item.accountAddress)}
                  </a>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>{item.description}</p>
                  {item.delegationAddress ? (
                    <a
                      href={
                        item.delegationExplorerUrl ??
                        addressUrlFor(option, item.delegationAddress)
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block truncate font-mono underline-offset-2 hover:text-pulse-cyan hover:underline"
                      title={item.delegationAddress}
                    >
                      Delegate: {shortenAddress(item.delegationAddress)}
                    </a>
                  ) : null}
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>Code bytes: {item.codeLengthBytes}</p>
                  <p>Code prefix: {shortCodePrefix(item.code)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No EIP-7702 delegation designator was found at latest block on this
          network. This is not an all-clear for other compromise paths.
        </div>
      ) : null}
    </section>
  );
}

function Eip7702Summary({
  eip7702,
}: {
  eip7702: LifeboatEip7702ApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Code"
        value={eip7702.summary.hasCode ? "present" : "empty"}
      />
      <SweeperMetric
        label="Bytes"
        value={eip7702.summary.codeLengthBytes.toString()}
      />
      <SweeperMetric
        label="Delegation"
        value={eip7702.summary.hasDelegation ? "found" : "not found"}
      />
      <SweeperMetric
        label="Support"
        value={eip7702.supported ? "marked" : "unsupported"}
      />
      {[...eip7702.warnings, ...eip7702.supportNotes].length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {[...eip7702.warnings, ...eip7702.supportNotes].join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function SmartWalletSection({
  smartWallet,
  owner,
  option,
  isScanning,
}: {
  smartWallet: LifeboatSmartWalletApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromSmartWalletResponse(smartWallet);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_SMART_WALLET_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Account and Safe configuration
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} latest account code and Safe-compatible view methods are checked without connecting or signing.`
              : "Paste a wallet address to check whether this address looks like a smart wallet or Safe-compatible account."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForSmartWallet(
            smartWallet.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : smartWalletRiskLabel(smartWallet.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_SMART_WALLET_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing smart-wallet
          evidence as proof that no Safe, module, guard, or session-key risk
          exists.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <SmartWalletSummary smartWallet={smartWallet} />
      ) : null}

      {owner && smartWallet.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {smartWallet.evidence.map((item) => (
              <li
                key={`${item.accountAddress}-${item.title}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1.1fr_0.9fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.title}
                  </p>
                  <a
                    href={item.explorerUrl ?? addressUrlFor(option, item.accountAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.accountAddress}
                  >
                    {shortenAddress(item.accountAddress)}
                  </a>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>{item.description}</p>
                  {item.safeOwners.length > 0 ? (
                    <p className="mt-1">
                      Owners: {item.safeOwners.map(shortenAddress).join(", ")}
                    </p>
                  ) : null}
                  {item.safeModules.length > 0 ? (
                    <p className="mt-1">
                      Modules: {item.safeModules.map(shortenAddress).join(", ")}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>Code bytes: {item.codeLengthBytes}</p>
                  <p>
                    Threshold:{" "}
                    {item.safeThreshold === null ? "unknown" : item.safeThreshold}
                  </p>
                  <p>Safe nonce: {item.safeNonce ?? "unknown"}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No account code was found at latest block on this network. This is
          not proof that the wallet secret is uncompromised or that no off-chain
          authorization risk exists.
        </div>
      ) : null}
    </section>
  );
}

function SmartWalletSummary({
  smartWallet,
}: {
  smartWallet: LifeboatSmartWalletApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Code"
        value={smartWallet.summary.hasCode ? "present" : "empty"}
      />
      <SweeperMetric
        label="Safe-like"
        value={smartWallet.summary.isSafeLike ? "yes" : "not detected"}
      />
      <SweeperMetric
        label="Owners"
        value={smartWallet.summary.ownerCount.toString()}
      />
      <SweeperMetric
        label="Modules"
        value={smartWallet.summary.moduleCount.toString()}
      />
      {[...smartWallet.warnings, ...smartWallet.supportNotes].length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {[...smartWallet.warnings, ...smartWallet.supportNotes].join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function Erc4337Section({
  erc4337,
  owner,
  option,
  isScanning,
}: {
  erc4337: LifeboatErc4337ApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromErc4337Response(erc4337);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_ERC4337_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Account-abstraction activity
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} recent EntryPoint UserOperationEvent logs are checked without bundler calls, signatures, or transaction submission.`
              : "Paste a wallet address to check for recent ERC-4337 EntryPoint activity where supported."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForErc4337(
            erc4337.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : erc4337RiskLabel(erc4337.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_ERC4337_DIAGNOSTIC_COPY.body}
      </p>

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing UserOperation
          evidence as proof that no account-abstraction, paymaster, factory, or
          session-key risk exists.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <Erc4337Summary erc4337={erc4337} />
      ) : null}

      {owner && erc4337.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {erc4337.evidence.map((item) => (
              <li
                key={`${item.event.entryPointAddress}-${item.event.userOpHash}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1.1fr_0.9fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.title}
                  </p>
                  <a
                    href={item.event.explorerUrl ?? txUrlFor(option, item.event.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.event.transactionHash}
                  >
                    {shortHash(item.event.transactionHash)}
                  </a>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>{item.description}</p>
                  <p className="mt-1">
                    EntryPoint {item.event.entryPointVersion}:{" "}
                    {shortenAddress(item.event.entryPointAddress)}
                  </p>
                  {item.event.paymaster ? (
                    <p className="mt-1">
                      Paymaster: {shortenAddress(item.event.paymaster)}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>Block: {item.event.blockNumber}</p>
                  <p>Nonce: {item.event.nonce}</p>
                  <p>Success: {item.event.success ? "yes" : "no"}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No recent UserOperationEvent logs were found in the bounded
          EntryPoint window. This is not proof that no session keys, modules,
          delegations, or off-chain authorizations exist.
        </div>
      ) : null}
    </section>
  );
}

function Erc4337Summary({
  erc4337,
}: {
  erc4337: LifeboatErc4337ApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="UserOps"
        value={erc4337.summary.userOperationCount.toString()}
      />
      <SweeperMetric
        label="Failed"
        value={erc4337.summary.failedUserOperationCount.toString()}
      />
      <SweeperMetric
        label="Paymaster"
        value={erc4337.summary.paymasterUserOperationCount.toString()}
      />
      <SweeperMetric
        label="Block window"
        value={erc4337.summary.checkedBlockRange.toString()}
      />
      {[...erc4337.warnings, ...erc4337.supportNotes].length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {[...erc4337.warnings, ...erc4337.supportNotes].join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function Erc6909Section({
  erc6909,
  owner,
  option,
  isScanning,
}: {
  erc6909: LifeboatErc6909ApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromErc6909Response(erc6909);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_ERC6909_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Multi-token allowance activity
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} recent ERC-6909 Approval and OperatorSet logs are checked without revoke preparation or transaction submission.`
              : "Paste a wallet address to check for recent ERC-6909 multi-token permission events where supported."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForErc6909(
            erc6909.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : erc6909RiskLabel(erc6909.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_ERC6909_DIAGNOSTIC_COPY.body}
      </p>

      {owner &&
      (status === "partial" ||
        status === "upstream_unavailable" ||
        status === "unsupported") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete or unsupported by the selected network
          or RPC. Do not treat missing ERC-6909 event evidence as proof that no
          multi-token allowance, operator, wrapper, or historical approval risk
          exists.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <Erc6909Summary erc6909={erc6909} />
      ) : null}

      {owner && erc6909.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {erc6909.evidence.map((item) => (
              <li
                key={`${item.event.contractAddress}-${item.event.transactionHash}-${item.title}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1.1fr_0.9fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.title}
                  </p>
                  <a
                    href={item.event.explorerUrl ?? txUrlFor(option, item.event.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.event.transactionHash}
                  >
                    {shortHash(item.event.transactionHash)}
                  </a>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>{item.description}</p>
                  <p className="mt-1">
                    Contract: {shortenAddress(item.event.contractAddress)}
                  </p>
                  <p className="mt-1">
                    Spender: {shortenAddress(item.event.spender)}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>Block: {item.event.blockNumber}</p>
                  {item.event.kind === "approval" ? (
                    <>
                      <p>Token ID: {item.event.tokenId}</p>
                      <p>
                        Allowance:{" "}
                        {item.event.unlimited ? "infinite" : item.event.amount}
                      </p>
                    </>
                  ) : (
                    <p>Operator: {item.event.approved ? "enabled" : "disabled"}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No recent ERC-6909 Approval or OperatorSet events were found in the
          bounded owner-topic window. This is not proof that no historical or
          current multi-token approval exposure exists.
        </div>
      ) : null}
    </section>
  );
}

function Erc6909Summary({
  erc6909,
}: {
  erc6909: LifeboatErc6909ApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Events"
        value={erc6909.summary.permissionEventCount.toString()}
      />
      <SweeperMetric
        label="Allowances"
        value={erc6909.summary.nonzeroApprovalEventCount.toString()}
      />
      <SweeperMetric
        label="Operators"
        value={erc6909.summary.activeOperatorEventCount.toString()}
      />
      <SweeperMetric
        label="Block window"
        value={erc6909.summary.checkedBlockRange.toString()}
      />
      {[...erc6909.warnings, ...erc6909.supportNotes].length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {[...erc6909.warnings, ...erc6909.supportNotes].join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function HexStakeSection({
  hexStake,
  owner,
  option,
  isScanning,
}: {
  hexStake: LifeboatHexStakeApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromHexStakeResponse(hexStake);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_HEX_STAKE_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Visible open stake rows
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} HEX stake reads are checked where this diagnostic is supported.`
              : "Paste a wallet address to check visible open HEX stake rows on supported networks."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForHexStake(
            hexStake.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : hexStakeRiskLabel(hexStake.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_HEX_STAKE_DIAGNOSTIC_COPY.body}
      </p>

      {owner && status === "unsupported" ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          HEX stake diagnostics are currently enabled for PulseChain only. Do
          not treat unsupported networks as proof that no stake exists.
        </div>
      ) : null}

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing HEX stake rows as
          proof that the wallet has no active, mature, late, or historical
          stakes.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <HexStakeSummary hexStake={hexStake} />
      ) : null}

      {owner && hexStake.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {hexStake.evidence.map((item) => (
              <li
                key={`${item.stakeId}-${item.status}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-pulse-muted">
                    Stake {item.stakeId}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>{item.stakedHex}</p>
                  <p>
                    Day {item.lockedDay} to {item.endDay}
                  </p>
                  {item.explorerUrl ? (
                    <a
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate underline-offset-2 hover:text-pulse-cyan hover:underline"
                    >
                      HEX contract
                    </a>
                  ) : null}
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>{item.daysRemaining} days remaining</p>
                  <p>{item.daysLate} days late</p>
                  <p className="uppercase tracking-wide">{item.riskLevel} signal</p>
                </div>
                <p className="text-xs leading-5 text-pulse-muted lg:col-span-3">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No visible open HEX stake rows were found by the completed read. This
          is not a historical ended-stake inventory.
        </div>
      ) : null}
    </section>
  );
}

function HexStakeSummary({
  hexStake,
}: {
  hexStake: LifeboatHexStakeApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Open rows"
        value={`${hexStake.summary.checkedStakeCount}/${hexStake.summary.totalOpenStakeCount}`}
      />
      <SweeperMetric
        label="Active"
        value={hexStake.summary.activeStakeCount.toString()}
      />
      <SweeperMetric
        label="Mature"
        value={hexStake.summary.matureStakeCount.toString()}
      />
      <SweeperMetric
        label="Late"
        value={(
          hexStake.summary.lateStakeCount +
          hexStake.summary.goodAccountingCandidateCount
        ).toString()}
      />
      {[...hexStake.warnings, ...hexStake.errors, ...hexStake.missingConfig].length >
      0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {[...hexStake.warnings, ...hexStake.errors, ...hexStake.missingConfig].join(
            " ",
          )}
        </div>
      ) : null}
    </dl>
  );
}

function GoodAccountingAssistSection({
  goodAccountingAssist,
  hexStake,
  owner,
  option,
}: {
  goodAccountingAssist: GoodAccountingAssistAnalysis;
  hexStake: LifeboatHexStakeApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
}) {
  const status = moduleStatusFromGoodAccountingAssist(goodAccountingAssist);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_GOOD_ACCOUNTING_ASSIST_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Clean-wallet review context
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} Good Accounting Assist uses the read-only HEX stake diagnostic for candidate context.`
              : "Paste a wallet address to check whether visible late HEX stake rows may need manual Good Accounting review."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForGoodAccountingAssist(
            goodAccountingAssist.riskLevel,
          )}`}
        >
          {goodAccountingAssistRiskLabel(goodAccountingAssist.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_GOOD_ACCOUNTING_ASSIST_COPY.body}
      </p>

      {owner && status === "unsupported" ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          Good Accounting Assist is currently available only when the
          PulseChain HEX stake diagnostic is supported and completed.
        </div>
      ) : null}

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This assist view is incomplete because the HEX stake diagnostic did
          not fully complete. Do not treat missing candidates as proof that no
          Good Accounting review is relevant.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <GoodAccountingAssistSummary
          goodAccountingAssist={goodAccountingAssist}
          hexStake={hexStake}
        />
      ) : null}

      {owner && goodAccountingAssist.candidates.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {goodAccountingAssist.candidates.map((candidate) => (
              <li
                key={candidate.stakeId}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    Possible Good Accounting candidate
                  </p>
                  <p className="mt-1 truncate font-mono text-xs text-pulse-muted">
                    Stake {candidate.stakeId}
                  </p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted">
                  <p>{candidate.stakedHex}</p>
                  <p>
                    End day {candidate.endDay}; {candidate.daysLate} days late
                  </p>
                  <p>{candidate.reason}</p>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>Clean wallet only</p>
                  <p>No transaction prepared</p>
                </div>
                <p className="text-xs leading-5 text-pulse-muted lg:col-span-3">
                  {candidate.cleanWalletNote}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No Good Accounting candidate was found in the checked visible open
          HEX stake rows. This is not a historical ended-stake inventory.
        </div>
      ) : null}
    </section>
  );
}

function GoodAccountingAssistSummary({
  goodAccountingAssist,
  hexStake,
}: {
  goodAccountingAssist: GoodAccountingAssistAnalysis;
  hexStake: LifeboatHexStakeApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Candidates"
        value={goodAccountingAssist.summary.candidateCount.toString()}
      />
      <SweeperMetric
        label="Stake rows"
        value={`${goodAccountingAssist.summary.checkedStakeCount}/${hexStake.summary.totalOpenStakeCount}`}
      />
      <SweeperMetric
        label="Source"
        value={goodAccountingAssist.summary.sourceComplete ? "complete" : "incomplete"}
      />
      <SweeperMetric label="Execution" value="none" />
      {goodAccountingAssist.warnings.length > 0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {goodAccountingAssist.warnings.join(" ")}
        </div>
      ) : null}
    </dl>
  );
}

function DustTrapSection({
  dustTrap,
  owner,
  option,
  isScanning,
}: {
  dustTrap: LifeboatDustTrapApiResponse;
  owner: Address | null;
  option: AddressOnlyScanOption;
  isScanning: boolean;
}) {
  const status = moduleStatusFromDustTrapResponse(dustTrap);
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            {LIFEBOAT_DUST_TRAP_DIAGNOSTIC_COPY.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-pulse-text">
            Suspicious inbound assets
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            {owner
              ? `${option.displayName} inbound token and NFT history is checked for dust, bait wording, and URL-like metadata.`
              : "Paste a wallet address to check bounded inbound token and NFT history for dust or bait signals."}
          </p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${toneClassForDustTrap(
            dustTrap.riskLevel,
          )}`}
        >
          {isScanning ? "Scanning" : dustTrapRiskLabel(dustTrap.riskLevel)}
        </span>
      </div>

      <p className="mt-4 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-sm leading-6 text-pulse-muted">
        {LIFEBOAT_DUST_TRAP_DIAGNOSTIC_COPY.body}
      </p>

      {owner && status === "unsupported" ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This network is not marked supported for the dust-trap diagnostic yet.
        </div>
      ) : null}

      {owner && (status === "partial" || status === "upstream_unavailable") ? (
        <div className="mt-4 rounded-xl border border-amber-400/35 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          This diagnostic is incomplete. Do not treat missing dust or bait
          evidence as proof that the wallet has no suspicious inbound assets.
        </div>
      ) : null}

      {owner && (status === "complete" || status === "partial") ? (
        <DustTrapSummary dustTrap={dustTrap} />
      ) : null}

      {owner && dustTrap.evidence.length > 0 ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <ul>
            {dustTrap.evidence.map((item) => (
              <li
                key={`${item.txHash}-${item.contractAddress}-${item.title}-${item.tokenId ?? "none"}`}
                className="grid gap-4 border-b border-pulse-border/60 p-4 last:border-b-0 lg:grid-cols-[1fr_1fr_0.8fr]"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-pulse-text">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-pulse-muted">
                    {item.displayName}
                    {item.displaySymbol ? ` (${item.displaySymbol})` : ""}
                  </p>
                </div>
                <div className="min-w-0">
                  <a
                    href={item.tokenExplorerUrl ?? tokenUrlFor(option, item.contractAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.contractAddress}
                  >
                    {shortenAddress(item.contractAddress)}
                  </a>
                  <a
                    href={item.txExplorerUrl ?? txUrlFor(option, item.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block truncate font-mono text-xs text-pulse-muted underline-offset-2 hover:text-pulse-cyan hover:underline"
                    title={item.txHash}
                  >
                    Tx {shortHash(item.txHash)}
                  </a>
                </div>
                <div className="min-w-0 text-xs leading-5 text-pulse-muted lg:text-right">
                  <p>{item.amount}</p>
                  <p>{item.assetType === "nft" ? "NFT" : "Token"}</p>
                  <p className="uppercase tracking-wide">{item.riskLevel} signal</p>
                </div>
                <p className="text-xs leading-5 text-pulse-muted lg:col-span-3">
                  {item.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : owner && status === "complete" ? (
        <div className="mt-4 rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-4 text-sm leading-6 text-pulse-muted">
          No dust/bait signal was found in the bounded inbound token/NFT
          history. Do not treat this as a full asset inventory.
        </div>
      ) : null}
    </section>
  );
}

function DustTrapSummary({
  dustTrap,
}: {
  dustTrap: LifeboatDustTrapApiResponse;
}) {
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SweeperMetric
        label="Checked"
        value={`${dustTrap.summary.checkedTransferCount} transfers`}
      />
      <SweeperMetric
        label="Tokens"
        value={dustTrap.summary.inboundTokenCount.toString()}
      />
      <SweeperMetric
        label="NFTs"
        value={dustTrap.summary.inboundNftCount.toString()}
      />
      <SweeperMetric
        label="URL metadata"
        value={dustTrap.summary.urlMetadataCount.toString()}
      />
      {[...dustTrap.warnings, ...dustTrap.errors, ...dustTrap.missingConfig].length >
      0 ? (
        <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3 text-xs leading-5 text-pulse-muted sm:col-span-2 lg:col-span-4">
          {[...dustTrap.warnings, ...dustTrap.errors, ...dustTrap.missingConfig].join(
            " ",
          )}
        </div>
      ) : null}
    </dl>
  );
}

function PlannedDiagnostics() {
  if (LIFEBOAT_PLANNED_MODULES.length === 0) return null;

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
        Planned diagnostics
      </p>
      <h2 className="mt-1 text-xl font-semibold text-pulse-text">
        Future read-only modules
      </h2>
      <div className="mt-4 grid gap-3">
        {LIFEBOAT_PLANNED_MODULES.map((module) => (
          <section
            key={module.id}
            className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-4"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="font-semibold text-pulse-text">{module.title}</h3>
              <span className="inline-flex w-fit rounded-full border border-pulse-border bg-pulse-panel/60 px-2.5 py-1 text-xs font-semibold text-pulse-muted">
                {module.status}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-pulse-muted">
              {module.body}
            </p>
          </section>
        ))}
      </div>
    </section>
  );
}

function DetectionLimits() {
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/65 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
        Limits
      </p>
      <h2 className="mt-1 text-xl font-semibold text-pulse-text">
        What this scan can and cannot detect
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Checklist title="Can help with" items={LIFEBOAT_NEXT_STEPS} />
        <Checklist title="Do not do" items={LIFEBOAT_NOT_TO_DO} />
      </div>
    </section>
  );
}

function Checklist({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-4">
      <h3 className="text-sm font-semibold text-pulse-text">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-pulse-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-cyan"
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompletenessPanel({
  summary,
  scan,
  sweeper,
  pendingNonce,
  timeline,
  addressPoisoning,
  spenderRisk,
  permit2Exposure,
  visibleAssets,
  knownRiskRegistry,
  permit2Status,
  eip7702,
  smartWallet,
  erc4337,
  erc6909,
  dustTrap,
  hexStake,
  goodAccountingAssist,
}: {
  summary: TriageSummaryCounts;
  scan: LifeboatScanSnapshot;
  sweeper: LifeboatSweeperApiResponse;
  pendingNonce: LifeboatPendingNonceApiResponse;
  timeline: LifeboatTimelineApiResponse;
  addressPoisoning: LifeboatAddressPoisoningApiResponse;
  spenderRisk: LifeboatSpenderRiskApiResponse;
  permit2Exposure: Permit2ExposureAnalysis;
  visibleAssets: VisibleAssetsAnalysis;
  knownRiskRegistry: KnownRiskRegistryAnalysis;
  permit2Status: LifeboatModuleStatus;
  eip7702: LifeboatEip7702ApiResponse;
  smartWallet: LifeboatSmartWalletApiResponse;
  erc4337: LifeboatErc4337ApiResponse;
  erc6909: LifeboatErc6909ApiResponse;
  dustTrap: LifeboatDustTrapApiResponse;
  hexStake: LifeboatHexStakeApiResponse;
  goodAccountingAssist: GoodAccountingAssistAnalysis;
}) {
  const rows = [
    {
      label: "Token approvals",
      value: statusLabelForApprovals(scan.approvalsStatus, scan.approvals.length),
    },
    {
      label: "NFT approvals",
      value: statusLabelForApprovals(
        scan.nftApprovalsStatus,
        scan.nftApprovals.length,
      ),
    },
    {
      label: "Gas-sweeper pattern",
      value: statusLabelForSweeper(sweeper),
    },
    {
      label: "Pending nonce",
      value: statusLabelForPendingNonce(pendingNonce),
    },
    {
      label: "Approval-to-drain timeline",
      value: statusLabelForTimeline(timeline),
    },
    {
      label: "Address poisoning signals",
      value: statusLabelForAddressPoisoning(addressPoisoning),
    },
    {
      label: "Spender contract risk",
      value: statusLabelForSpenderRisk(spenderRisk),
    },
    {
      label: "Permit2 exposure",
      value: statusLabelForPermit2Exposure(permit2Exposure, permit2Status),
    },
    {
      label: "Visible assets at risk",
      value: statusLabelForVisibleAssets(visibleAssets),
    },
    {
      label: "Known-risk registry",
      value: statusLabelForKnownRiskRegistry(knownRiskRegistry),
    },
    {
      label: "HEX stake status",
      value: statusLabelForHexStake(hexStake),
    },
    {
      label: "Good Accounting Assist",
      value: statusLabelForGoodAccountingAssist(goodAccountingAssist),
    },
    {
      label: "EIP-7702 delegation",
      value: statusLabelForEip7702(eip7702),
    },
    {
      label: "Smart wallet / Safe",
      value: statusLabelForSmartWallet(smartWallet),
    },
    {
      label: "ERC-4337 / session keys",
      value: statusLabelForErc4337(erc4337),
    },
    {
      label: "ERC-6909 approvals",
      value: statusLabelForErc6909(erc6909),
    },
    {
      label: "Token/NFT dust traps",
      value: statusLabelForDustTrap(dustTrap),
    },
  ];

  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/65 p-5">
      <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
        Compact completeness summary
      </p>
      <h2 className="mt-1 text-xl font-semibold text-pulse-text">
        Diagnostic coverage
      </h2>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <CompactMetric
          label="Needs attention"
          value={summary.needsAttentionCount.toString()}
        />
        <CompactMetric
          label="No issue detected"
          value={summary.noIssueDetectedCount.toString()}
        />
        <CompactMetric
          label="Incomplete"
          value={summary.incompleteCount.toString()}
        />
      </div>
      <details className="group mt-4 rounded-2xl border border-pulse-border/70 bg-pulse-bg/45 p-3 [&>summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-pulse-text">
          <span>Full diagnostic coverage</span>
          <span className="rounded-full border border-pulse-border px-2 py-0.5 text-pulse-muted transition group-open:rotate-45">
            +
          </span>
        </summary>
        <dl className="mt-3 grid gap-2 text-sm">
          {rows.map((row) => (
            <CompletenessRow
              key={row.label}
              label={row.label}
              value={row.value}
            />
          ))}
        </dl>
      </details>
      {scan.incompleteReasons.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-3 text-xs leading-5 text-amber-100">
          <p className="font-semibold">Known incomplete diagnostics</p>
          <ul className="mt-2 grid gap-1">
            {scan.incompleteReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CompletenessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-xl border border-pulse-border/70 bg-pulse-bg/45 p-3">
      <dt className="text-xs font-semibold text-pulse-muted">
        {label}
      </dt>
      <dd className="text-pulse-text">{value}</dd>
    </div>
  );
}

function ReportExport({
  scan,
  owner,
  sweeper,
  pendingNonce,
  timeline,
  addressPoisoning,
  spenderRisk,
  permit2Exposure,
  visibleAssets,
  knownRiskRegistry,
  eip7702,
  smartWallet,
  erc4337,
  erc6909,
  dustTrap,
  hexStake,
  goodAccountingAssist,
}: {
  scan: LifeboatScanSnapshot;
  owner: Address | null;
  sweeper: LifeboatSweeperApiResponse;
  pendingNonce: LifeboatPendingNonceApiResponse;
  timeline: LifeboatTimelineApiResponse;
  addressPoisoning: LifeboatAddressPoisoningApiResponse;
  spenderRisk: LifeboatSpenderRiskApiResponse;
  permit2Exposure: Permit2ExposureAnalysis;
  visibleAssets: VisibleAssetsAnalysis;
  knownRiskRegistry: KnownRiskRegistryAnalysis;
  eip7702: LifeboatEip7702ApiResponse;
  smartWallet: LifeboatSmartWalletApiResponse;
  erc4337: LifeboatErc4337ApiResponse;
  erc6909: LifeboatErc6909ApiResponse;
  dustTrap: LifeboatDustTrapApiResponse;
  hexStake: LifeboatHexStakeApiResponse;
  goodAccountingAssist: GoodAccountingAssistAnalysis;
}) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const disabled = !owner;

  function createMarkdown() {
    if (!owner) return "";
    return buildWalletLifeboatReportMarkdown(
      buildReportFromSnapshot(
        scan,
        owner,
        new Date().toISOString(),
        sweeper,
        pendingNonce,
        timeline,
        addressPoisoning,
        spenderRisk,
        permit2Exposure,
        visibleAssets,
        knownRiskRegistry,
        eip7702,
        smartWallet,
        erc4337,
        erc6909,
        dustTrap,
        hexStake,
        goodAccountingAssist,
      ),
    );
  }

  async function copyReport() {
    const markdown = createMarkdown();
    if (!markdown || !navigator.clipboard) {
      setCopyState("failed");
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function downloadReport() {
    const markdown = createMarkdown();
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wallet-lifeboat-${owner?.slice(0, 10) ?? "report"}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-3xl border border-pulse-border bg-pulse-panel/65 p-5">
      <p className="text-sm font-semibold tracking-[0.08em] text-pulse-cyan">
        Export actions
      </p>
      <h2 className="mt-1 text-xl font-semibold text-pulse-text">
        Save or share this report
      </h2>
      <p className="mt-3 text-sm leading-6 text-pulse-muted">
        Keep a read-only snapshot of visible risks, approvals, stakes, and
        unresolved checks before you decide what to review next.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={copyReport}
          disabled={disabled}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-sm font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Copy Markdown
        </button>
        <button
          type="button"
          onClick={downloadReport}
          disabled={disabled}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-3 py-2 text-sm font-semibold text-pulse-text transition hover:bg-pulse-text/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Download .md
        </button>
      </div>
      {copyState === "copied" ? (
        <p className="mt-3 text-xs font-semibold text-pulse-green">
          Report copied.
        </p>
      ) : copyState === "failed" ? (
        <p className="mt-3 text-xs font-semibold text-pulse-red">
          Copy failed. Use Download instead.
        </p>
      ) : null}
    </section>
  );
}

function useLifeboatScan({
  owner,
  selectedChainId,
  selectedOption,
}: {
  owner: Address | null;
  selectedChainId: AddressOnlyScanChainId;
  selectedOption: AddressOnlyScanOption;
}): LifeboatScanSnapshot {
  const enabled = Boolean(owner);
  const supportedConfig =
    selectedOption.kind === "supported"
      ? getSupportedAddressOnlyChainConfig(selectedChainId)
      : undefined;
  const genericApprovalScan = useApprovalDiscovery({
    owner: owner ?? undefined,
    chainId: supportedConfig?.chainId,
    enabled: enabled && selectedOption.kind === "supported",
  });
  const genericNftScan = useNftApprovalDiscovery({
    owner: owner ?? undefined,
    chainId: supportedConfig?.chainId,
    enabled: enabled && selectedOption.kind === "supported",
  });
  const ethereumScan = useEthereumApprovalScan({
    owner: owner ?? undefined,
    enabled: enabled && selectedOption.kind === "ethereum",
  });
  const arbitrumScan = useArbitrumApprovalScan({
    owner: owner ?? undefined,
    enabled: enabled && selectedOption.kind === "arbitrum",
  });
  const optimismScan = useOptimismApprovalScan({
    owner: owner ?? undefined,
    enabled: enabled && selectedOption.kind === "optimism",
  });
  const hyperevmScan = useHyperEVMApprovalScan({
    owner: owner ?? undefined,
    enabled: enabled && selectedOption.kind === "hyperevm",
  });

  if (!owner) {
    return emptySnapshot(selectedOption);
  }

  if (selectedOption.kind === "supported") {
    const approvalsStatus = moduleStatusFromDiscovery({
      status: genericApprovalScan.status,
      truncated: genericApprovalScan.truncated,
      liveReadFailureCount: genericApprovalScan.diagnostics.liveReadFailureCount,
      error: genericApprovalScan.error,
    });
    const nftApprovalsStatus = moduleStatusFromDiscovery({
      status: genericNftScan.status,
      truncated: genericNftScan.truncated,
      liveReadFailureCount: genericNftScan.diagnostics.liveReadFailureCount,
      error: genericNftScan.error,
    });
    return {
      owner,
      chainId: selectedOption.chainId,
      chainName: selectedOption.displayName,
      status: combineScanStatus(approvalsStatus, nftApprovalsStatus),
      approvals: genericApprovalScan.approvals,
      nftApprovals: genericNftScan.approvals,
      approvalsStatus,
      nftApprovalsStatus,
      incompleteReasons: [
        ...genericIncompleteReasons("Token approvals", {
          truncated: genericApprovalScan.truncated,
          liveReadFailureCount:
            genericApprovalScan.diagnostics.liveReadFailureCount,
          error:
            genericApprovalScan.diagnostics.discoveryError ??
            genericApprovalScan.diagnostics.liveReadError,
        }),
        ...genericIncompleteReasons("NFT approvals", {
          truncated: genericNftScan.truncated,
          liveReadFailureCount: genericNftScan.diagnostics.liveReadFailureCount,
          error:
            genericNftScan.diagnostics.discoveryError ??
            genericNftScan.diagnostics.liveReadError,
        }),
      ],
    };
  }

  const apiScan =
    selectedOption.kind === "ethereum"
      ? ethereumScan
      : selectedOption.kind === "arbitrum"
        ? arbitrumScan
        : selectedOption.kind === "optimism"
          ? optimismScan
          : hyperevmScan;
  const approvalsStatus = moduleStatusFromApi(apiScan.status, apiScan.mapped?.state);
  const nftApprovalsStatus = approvalsStatus;
  return {
    owner,
    chainId: selectedOption.chainId,
    chainName: selectedOption.displayName,
    status: combineScanStatus(approvalsStatus, nftApprovalsStatus),
    approvals: apiScan.mapped?.approvals.erc20 ?? [],
    nftApprovals: apiScan.mapped?.approvals.nft ?? [],
    approvalsStatus,
    nftApprovalsStatus,
    incompleteReasons: apiIncompleteReasons(apiScan.response, apiScan.mapped?.warnings),
  };
}

function emptySnapshot(option: AddressOnlyScanOption): LifeboatScanSnapshot {
  return {
    owner: null,
    chainId: option.chainId,
    chainName: option.displayName,
    status: "idle",
    approvals: [],
    nftApprovals: [],
    approvalsStatus: "not_scanned",
    nftApprovalsStatus: "not_scanned",
    incompleteReasons: [],
  };
}

function moduleStatusFromDiscovery({
  status,
  truncated,
  liveReadFailureCount,
  error,
}: {
  status: "idle" | "pending" | "success" | "error";
  truncated: boolean;
  liveReadFailureCount: number;
  error: Error | null;
}): LifeboatModuleStatus {
  if (status === "idle") return "not_scanned";
  if (status === "pending") return "scanning";
  if (status === "error" || error) return "upstream_unavailable";
  if (truncated || liveReadFailureCount > 0) return "partial";
  return "complete";
}

function moduleStatusFromApi(
  status: "idle" | "pending" | "success" | "error",
  state:
    | "active"
    | "complete-clear"
    | "verification-incomplete"
    | "config-missing"
    | "upstream-failure"
    | undefined,
): LifeboatModuleStatus {
  if (status === "idle") return "not_scanned";
  if (status === "pending") return "scanning";
  if (status === "error") return "upstream_unavailable";
  if (state === "config-missing" || state === "upstream-failure") {
    return "upstream_unavailable";
  }
  if (state === "verification-incomplete") return "partial";
  return "complete";
}

function combineScanStatus(
  approvalsStatus: LifeboatModuleStatus,
  nftApprovalsStatus: LifeboatModuleStatus,
): LifeboatScanStatus {
  if (approvalsStatus === "not_scanned" && nftApprovalsStatus === "not_scanned") {
    return "idle";
  }
  if (approvalsStatus === "scanning" || nftApprovalsStatus === "scanning") {
    return "scanning";
  }
  if (
    approvalsStatus === "upstream_unavailable" &&
    nftApprovalsStatus === "upstream_unavailable"
  ) {
    return "failed";
  }
  if (
    approvalsStatus === "partial" ||
    nftApprovalsStatus === "partial" ||
    approvalsStatus === "upstream_unavailable" ||
    nftApprovalsStatus === "upstream_unavailable"
  ) {
    return "partial";
  }
  return "complete";
}

function genericIncompleteReasons(
  label: string,
  input: {
    truncated: boolean;
    liveReadFailureCount: number;
    error: string | null;
  },
): string[] {
  return [
    input.truncated ? `${label}: discovery was truncated` : null,
    input.liveReadFailureCount > 0
      ? `${label}: ${input.liveReadFailureCount} live read check${
          input.liveReadFailureCount === 1 ? "" : "s"
        } failed`
      : null,
    input.error ? `${label}: ${input.error}` : null,
  ].filter((reason): reason is string => Boolean(reason));
}

function apiIncompleteReasons(
  response: { diagnostics?: { incompleteReasons?: string[] }; missingConfig?: string[] } | null,
  warnings: readonly string[] | undefined,
): string[] {
  return [
    ...(response?.diagnostics?.incompleteReasons ?? []),
    ...(response?.missingConfig?.map((item) => `Missing config: ${item}`) ?? []),
    ...(warnings ?? []),
  ];
}

function buildReportFromSnapshot(
  scan: LifeboatScanSnapshot,
  owner: Address,
  generatedAt: string,
  sweeper: LifeboatSweeperApiResponse,
  pendingNonce: LifeboatPendingNonceApiResponse,
  timeline: LifeboatTimelineApiResponse,
  addressPoisoning: LifeboatAddressPoisoningApiResponse,
  spenderRisk: LifeboatSpenderRiskApiResponse,
  permit2Exposure: Permit2ExposureAnalysis,
  visibleAssets: VisibleAssetsAnalysis,
  knownRiskRegistry: KnownRiskRegistryAnalysis,
  eip7702: LifeboatEip7702ApiResponse,
  smartWallet: LifeboatSmartWalletApiResponse,
  erc4337: LifeboatErc4337ApiResponse,
  erc6909: LifeboatErc6909ApiResponse,
  dustTrap: LifeboatDustTrapApiResponse,
  hexStake: LifeboatHexStakeApiResponse,
  goodAccountingAssist: GoodAccountingAssistAnalysis,
): LifeboatReport {
  const chain: LifeboatChainReport = {
    chainId: scan.chainId,
    chainName: scan.chainName,
    activeApprovalCount: scan.approvals.length,
    activeNftApprovalCount: scan.nftApprovals.length,
    approvalsStatus: scan.approvalsStatus,
    nftApprovalsStatus: scan.nftApprovalsStatus,
    sweeperStatus: moduleStatusFromSweeperResponse(sweeper),
    sweeperRiskLevel: sweeper.riskLevel,
    sweeperEvidence: sweeper.evidence,
    pendingNonceStatus: moduleStatusFromPendingNonceResponse(pendingNonce),
    pendingNonceRiskLevel: pendingNonce.riskLevel,
    pendingNonceEvidence: pendingNonce.evidence,
    pendingNonceSummary: pendingNonce.summary,
    timelineStatus: moduleStatusFromTimelineResponse(timeline),
    timelineRiskLevel: timeline.riskLevel,
    timelineEvents: timeline.events,
    timelineEvidence: timeline.evidence,
    addressPoisoningStatus:
      moduleStatusFromAddressPoisoningResponse(addressPoisoning),
    addressPoisoningRiskLevel: addressPoisoning.riskLevel,
    addressPoisoningEvidence: addressPoisoning.evidence,
    addressPoisoningEvents: addressPoisoning.events,
    spenderRiskStatus: moduleStatusFromSpenderRiskResponse(spenderRisk),
    spenderRiskLevel: spenderRisk.riskLevel,
    spenderRiskEvidence: spenderRisk.evidence,
    spenderRiskSpenders: spenderRisk.spenders,
    hexStatus: moduleStatusFromHexStakeResponse(hexStake),
    hexStakeRiskLevel: hexStake.riskLevel,
    hexStakeEvidence: hexStake.evidence,
    hexStakeRows: hexStake.stakes,
    goodAccountingStatus:
      moduleStatusFromGoodAccountingAssist(goodAccountingAssist),
    goodAccountingRiskLevel: goodAccountingAssist.riskLevel,
    goodAccountingEvidence: goodAccountingAssist.evidence,
    goodAccountingCandidates: goodAccountingAssist.candidates,
    permit2Status: moduleStatusFromPermit2Exposure(scan.approvalsStatus),
    permit2RiskLevel: permit2Exposure.riskLevel,
    permit2Evidence: permit2Exposure.evidence,
    knownRiskRegistryStatus:
      moduleStatusFromKnownRiskRegistry(knownRiskRegistry),
    knownRiskRegistryRiskLevel: knownRiskRegistry.riskLevel,
    knownRiskRegistryEvidence: knownRiskRegistry.evidence,
    knownRiskRegistrySubjects: knownRiskRegistry.subjects,
    eip7702Status: moduleStatusFromEip7702Response(eip7702),
    eip7702RiskLevel: eip7702.riskLevel,
    eip7702Evidence: eip7702.evidence,
    smartWalletStatus: moduleStatusFromSmartWalletResponse(smartWallet),
    smartWalletRiskLevel: smartWallet.riskLevel,
    smartWalletEvidence: smartWallet.evidence,
    erc4337Status: moduleStatusFromErc4337Response(erc4337),
    erc4337RiskLevel: erc4337.riskLevel,
    erc4337Evidence: erc4337.evidence,
    erc4337Events: erc4337.events,
    erc6909Status: moduleStatusFromErc6909Response(erc6909),
    erc6909RiskLevel: erc6909.riskLevel,
    erc6909Evidence: erc6909.evidence,
    erc6909Events: erc6909.events,
    dustTrapStatus: moduleStatusFromDustTrapResponse(dustTrap),
    dustTrapRiskLevel: dustTrap.riskLevel,
    dustTrapEvidence: dustTrap.evidence,
    dustTrapTransfers: dustTrap.transfers,
    visibleAssetsStatus: moduleStatusFromVisibleAssets(scan),
    visibleAssetsRiskLevel: visibleAssets.riskLevel,
    visibleAssetsEvidence: visibleAssets.evidence,
    visibleAssetsSummary: visibleAssets.summary,
    incompleteReasons: [...scan.incompleteReasons],
  };

  return {
    owner,
    chains: [chain],
    generatedAt,
    status: scan.status,
    warnings: [...LIFEBOAT_CRITICAL_WARNINGS],
    completeness: {
      approvalsComplete: scan.approvalsStatus === "complete",
      nftApprovalsComplete: scan.nftApprovalsStatus === "complete",
      sweeperCheckComplete: sweeper.status === "complete",
      pendingNonceCheckComplete: pendingNonce.status === "complete",
      timelineCheckComplete: timeline.status === "complete",
      addressPoisoningCheckComplete: addressPoisoning.status === "complete",
      spenderRiskCheckComplete: spenderRisk.status === "complete",
      hexStakeCheckComplete: hexStake.status === "complete",
      goodAccountingAssistComplete:
        goodAccountingAssist.summary.sourceComplete,
      knownRiskRegistryComplete: knownRiskRegistry.status === "complete",
      permit2Complete: scan.approvalsStatus === "complete",
      eip7702Complete: eip7702.status === "complete",
      smartWalletComplete: smartWallet.status === "complete",
      erc4337Complete: erc4337.status === "complete",
      erc6909Complete: erc6909.status === "complete",
      dustTrapCheckComplete: dustTrap.status === "complete",
      visibleAssetsComplete: moduleStatusFromVisibleAssets(scan) === "complete",
    },
  };
}

function moduleStatusFromSweeperResponse(
  sweeper: LifeboatSweeperApiResponse,
): LifeboatModuleStatus {
  if (sweeper.status === "idle") return "not_scanned";
  if (sweeper.status === "scanning") return "scanning";
  if (sweeper.status === "complete") return "complete";
  if (sweeper.status === "unsupported") return "unsupported";
  if (
    sweeper.status === "config-missing" ||
    sweeper.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromPendingNonceResponse(
  pendingNonce: LifeboatPendingNonceApiResponse,
): LifeboatModuleStatus {
  if (pendingNonce.status === "idle") return "not_scanned";
  if (pendingNonce.status === "scanning") return "scanning";
  if (pendingNonce.status === "complete") return "complete";
  if (pendingNonce.status === "unsupported") return "unsupported";
  if (
    pendingNonce.status === "config-missing" ||
    pendingNonce.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromTimelineResponse(
  timeline: LifeboatTimelineApiResponse,
): LifeboatModuleStatus {
  if (timeline.status === "idle") return "not_scanned";
  if (timeline.status === "scanning") return "scanning";
  if (timeline.status === "complete") return "complete";
  if (timeline.status === "partial") return "partial";
  if (timeline.status === "unsupported") return "unsupported";
  if (
    timeline.status === "config-missing" ||
    timeline.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromAddressPoisoningResponse(
  addressPoisoning: LifeboatAddressPoisoningApiResponse,
): LifeboatModuleStatus {
  if (addressPoisoning.status === "idle") return "not_scanned";
  if (addressPoisoning.status === "scanning") return "scanning";
  if (addressPoisoning.status === "complete") return "complete";
  if (addressPoisoning.status === "partial") return "partial";
  if (addressPoisoning.status === "unsupported") return "unsupported";
  if (
    addressPoisoning.status === "config-missing" ||
    addressPoisoning.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromSpenderRiskResponse(
  spenderRisk: LifeboatSpenderRiskApiResponse,
): LifeboatModuleStatus {
  if (spenderRisk.status === "idle") return "not_scanned";
  if (spenderRisk.status === "scanning") return "scanning";
  if (spenderRisk.status === "complete") return "complete";
  if (spenderRisk.status === "partial") return "partial";
  if (spenderRisk.status === "unsupported") return "unsupported";
  if (spenderRisk.status === "upstream-failure") {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromEip7702Response(
  eip7702: LifeboatEip7702ApiResponse,
): LifeboatModuleStatus {
  if (eip7702.status === "idle") return "not_scanned";
  if (eip7702.status === "scanning") return "scanning";
  if (eip7702.status === "complete") return "complete";
  if (eip7702.status === "unsupported") return "unsupported";
  if (
    eip7702.status === "config-missing" ||
    eip7702.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromSmartWalletResponse(
  smartWallet: LifeboatSmartWalletApiResponse,
): LifeboatModuleStatus {
  if (smartWallet.status === "idle") return "not_scanned";
  if (smartWallet.status === "scanning") return "scanning";
  if (smartWallet.status === "complete") return "complete";
  if (smartWallet.status === "unsupported") return "unsupported";
  if (
    smartWallet.status === "config-missing" ||
    smartWallet.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromErc4337Response(
  erc4337: LifeboatErc4337ApiResponse,
): LifeboatModuleStatus {
  if (erc4337.status === "idle") return "not_scanned";
  if (erc4337.status === "scanning") return "scanning";
  if (erc4337.status === "complete") return "complete";
  if (erc4337.status === "unsupported") return "unsupported";
  if (
    erc4337.status === "config-missing" ||
    erc4337.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromErc6909Response(
  erc6909: LifeboatErc6909ApiResponse,
): LifeboatModuleStatus {
  if (erc6909.status === "idle") return "not_scanned";
  if (erc6909.status === "scanning") return "scanning";
  if (erc6909.status === "complete") return "complete";
  if (erc6909.status === "unsupported") return "unsupported";
  if (
    erc6909.status === "config-missing" ||
    erc6909.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromDustTrapResponse(
  dustTrap: LifeboatDustTrapApiResponse,
): LifeboatModuleStatus {
  if (dustTrap.status === "idle") return "not_scanned";
  if (dustTrap.status === "scanning") return "scanning";
  if (dustTrap.status === "complete") return "complete";
  if (dustTrap.status === "partial") return "partial";
  if (dustTrap.status === "unsupported") return "unsupported";
  if (
    dustTrap.status === "config-missing" ||
    dustTrap.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromHexStakeResponse(
  hexStake: LifeboatHexStakeApiResponse,
): LifeboatModuleStatus {
  if (hexStake.status === "idle") return "not_scanned";
  if (hexStake.status === "scanning") return "scanning";
  if (hexStake.status === "complete") return "complete";
  if (hexStake.status === "partial") return "partial";
  if (hexStake.status === "unsupported") return "unsupported";
  if (
    hexStake.status === "config-missing" ||
    hexStake.status === "upstream-failure"
  ) {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromGoodAccountingAssist(
  goodAccountingAssist: GoodAccountingAssistAnalysis,
): LifeboatModuleStatus {
  const sourceStatus = goodAccountingAssist.summary.sourceStatus;
  if (sourceStatus === "idle") return "not_scanned";
  if (sourceStatus === "scanning") return "scanning";
  if (sourceStatus === "complete") return "complete";
  if (sourceStatus === "partial") return "partial";
  if (sourceStatus === "unsupported") return "unsupported";
  if (sourceStatus === "config-missing" || sourceStatus === "upstream-failure") {
    return "upstream_unavailable";
  }
  return "partial";
}

function moduleStatusFromPermit2Exposure(
  approvalStatus: LifeboatModuleStatus,
): LifeboatModuleStatus {
  if (approvalStatus === "scanning") return "scanning";
  if (approvalStatus === "complete") return "complete";
  if (approvalStatus === "partial") return "partial";
  if (approvalStatus === "unsupported") return "unsupported";
  if (approvalStatus === "upstream_unavailable") return "upstream_unavailable";
  return "not_scanned";
}

function moduleStatusFromVisibleAssets(
  scan: LifeboatScanSnapshot,
): LifeboatModuleStatus {
  const statuses = [scan.approvalsStatus, scan.nftApprovalsStatus];
  if (statuses.every((status) => status === "not_scanned")) return "not_scanned";
  if (statuses.some((status) => status === "scanning")) return "scanning";
  if (statuses.every((status) => status === "unsupported")) return "unsupported";
  if (statuses.every((status) => status === "upstream_unavailable")) {
    return "upstream_unavailable";
  }
  if (
    statuses.some(
      (status) =>
        status === "partial" ||
        status === "upstream_unavailable" ||
        status === "not_scanned",
    )
  ) {
    return "partial";
  }
  return "complete";
}

function moduleStatusFromKnownRiskRegistry(
  knownRiskRegistry: KnownRiskRegistryAnalysis,
): LifeboatModuleStatus {
  return knownRiskRegistry.status === "complete" ? "complete" : "not_scanned";
}

function statusLabelForApprovals(
  status: LifeboatModuleStatus,
  count: number,
): string {
  if (status === "scanning") return "Scanning";
  if (status === "partial") return "Incomplete verification";
  if (status === "upstream_unavailable") return "Upstream unavailable";
  if (status === "complete") {
    return count > 0 ? "Needs review" : "No issue detected";
  }
  return "Not scanned";
}

function statusLabelForSweeper(sweeper: LifeboatSweeperApiResponse): string {
  if (sweeper.status === "scanning") return "Scanning";
  return sweeperRiskLabel(sweeper.riskLevel);
}

function statusLabelForPendingNonce(
  pendingNonce: LifeboatPendingNonceApiResponse,
): string {
  if (pendingNonce.status === "scanning") return "Scanning";
  return pendingNonceRiskLabel(pendingNonce.riskLevel);
}

function statusLabelForTimeline(timeline: LifeboatTimelineApiResponse): string {
  if (timeline.status === "scanning") return "Scanning";
  return timelineRiskLabel(timeline.riskLevel);
}

function statusLabelForAddressPoisoning(
  addressPoisoning: LifeboatAddressPoisoningApiResponse,
): string {
  if (addressPoisoning.status === "scanning") return "Scanning";
  return addressPoisoningRiskLabel(addressPoisoning.riskLevel);
}

function statusLabelForSpenderRisk(
  spenderRisk: LifeboatSpenderRiskApiResponse,
): string {
  if (spenderRisk.status === "scanning") return "Scanning";
  return spenderRiskLabel(spenderRisk.riskLevel);
}

function statusLabelForEip7702(eip7702: LifeboatEip7702ApiResponse): string {
  if (eip7702.status === "scanning") return "Scanning";
  return eip7702RiskLabel(eip7702.riskLevel);
}

function statusLabelForSmartWallet(
  smartWallet: LifeboatSmartWalletApiResponse,
): string {
  if (smartWallet.status === "scanning") return "Scanning";
  return smartWalletRiskLabel(smartWallet.riskLevel);
}

function statusLabelForErc4337(
  erc4337: LifeboatErc4337ApiResponse,
): string {
  if (erc4337.status === "scanning") return "Scanning";
  return erc4337RiskLabel(erc4337.riskLevel);
}

function statusLabelForErc6909(
  erc6909: LifeboatErc6909ApiResponse,
): string {
  if (erc6909.status === "scanning") return "Scanning";
  return erc6909RiskLabel(erc6909.riskLevel);
}

function statusLabelForDustTrap(dustTrap: LifeboatDustTrapApiResponse): string {
  if (dustTrap.status === "scanning") return "Scanning";
  return dustTrapRiskLabel(dustTrap.riskLevel);
}

function statusLabelForHexStake(hexStake: LifeboatHexStakeApiResponse): string {
  if (hexStake.status === "scanning") return "Scanning";
  return hexStakeRiskLabel(hexStake.riskLevel);
}

function statusLabelForGoodAccountingAssist(
  goodAccountingAssist: GoodAccountingAssistAnalysis,
): string {
  if (goodAccountingAssist.summary.sourceStatus === "scanning") return "Scanning";
  return goodAccountingAssistRiskLabel(goodAccountingAssist.riskLevel);
}

function statusLabelForPermit2Exposure(
  permit2Exposure: Permit2ExposureAnalysis,
  status?: LifeboatModuleStatus,
): string {
  if (status === "scanning") return "Scanning";
  return permit2ExposureRiskLabel(permit2Exposure.riskLevel);
}

function statusLabelForVisibleAssets(
  visibleAssets: VisibleAssetsAnalysis,
): string {
  return visibleAssetsRiskLabel(visibleAssets.riskLevel);
}

function statusLabelForKnownRiskRegistry(
  knownRiskRegistry: KnownRiskRegistryAnalysis,
): string {
  return knownRiskRegistryRiskLabel(knownRiskRegistry.riskLevel);
}

function toneForModule(
  status: LifeboatModuleStatus,
  count: number,
): "neutral" | "success" | "warning" | "danger" {
  if (status === "complete" && count > 0) return "danger";
  if (status === "complete") return "success";
  if (status === "partial" || status === "upstream_unavailable") return "warning";
  return "neutral";
}

function toneForSweeper(
  riskLevel: SweeperRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "strong") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForPendingNonce(
  riskLevel: PendingNonceRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForTimeline(
  riskLevel: TimelineRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForAddressPoisoning(
  riskLevel: AddressPoisoningRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForSpenderRisk(
  riskLevel: SpenderRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForEip7702(
  riskLevel: Eip7702RiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForPermit2Exposure(
  riskLevel: Permit2ExposureRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForVisibleAssets(
  riskLevel: VisibleAssetsRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForKnownRiskRegistry(
  riskLevel: KnownRiskRegistryRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  return "neutral";
}

function toneForSmartWallet(
  riskLevel: SmartWalletRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForErc4337(
  riskLevel: Erc4337RiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForErc6909(
  riskLevel: Erc6909RiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForDustTrap(
  riskLevel: DustTrapRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForHexStake(
  riskLevel: HexStakeRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneForGoodAccountingAssist(
  riskLevel: GoodAccountingAssistRiskLevel,
): "neutral" | "success" | "warning" | "danger" {
  if (riskLevel === "elevated") return "danger";
  if (riskLevel === "possible") return "warning";
  if (riskLevel === "none_detected") return "success";
  if (riskLevel === "informational") return "neutral";
  if (
    riskLevel === "insufficient_data" ||
    riskLevel === "upstream_unavailable" ||
    riskLevel === "unsupported"
  ) {
    return "warning";
  }
  return "neutral";
}

function toneClassForSweeper(riskLevel: SweeperRiskLevel): string {
  const tone = toneForSweeper(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForPendingNonce(riskLevel: PendingNonceRiskLevel): string {
  const tone = toneForPendingNonce(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForTimeline(riskLevel: TimelineRiskLevel): string {
  const tone = toneForTimeline(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForAddressPoisoning(
  riskLevel: AddressPoisoningRiskLevel,
): string {
  const tone = toneForAddressPoisoning(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForSpenderRisk(riskLevel: SpenderRiskLevel): string {
  const tone = toneForSpenderRisk(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForEip7702(riskLevel: Eip7702RiskLevel): string {
  const tone = toneForEip7702(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForSmartWallet(riskLevel: SmartWalletRiskLevel): string {
  const tone = toneForSmartWallet(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForErc4337(riskLevel: Erc4337RiskLevel): string {
  const tone = toneForErc4337(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForErc6909(riskLevel: Erc6909RiskLevel): string {
  const tone = toneForErc6909(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForPermit2Exposure(riskLevel: Permit2ExposureRiskLevel): string {
  const tone = toneForPermit2Exposure(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForVisibleAssets(riskLevel: VisibleAssetsRiskLevel): string {
  const tone = toneForVisibleAssets(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForKnownRiskRegistry(
  riskLevel: KnownRiskRegistryRiskLevel,
): string {
  const tone = toneForKnownRiskRegistry(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForDustTrap(riskLevel: DustTrapRiskLevel): string {
  const tone = toneForDustTrap(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForHexStake(riskLevel: HexStakeRiskLevel): string {
  const tone = toneForHexStake(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function toneClassForGoodAccountingAssist(
  riskLevel: GoodAccountingAssistRiskLevel,
): string {
  const tone = toneForGoodAccountingAssist(riskLevel);
  return {
    neutral: "border-pulse-border bg-pulse-bg/50 text-pulse-muted",
    success: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    danger: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
  }[tone];
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const styles = {
    low: "border-pulse-green/40 bg-pulse-green/10 text-pulse-green",
    medium: "border-amber-400/40 bg-amber-400/10 text-amber-300",
    high: "border-pulse-red/50 bg-pulse-red/15 text-pulse-red",
  }[level];
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${styles}`}
    >
      {level} risk
    </span>
  );
}

function sortScoredApprovals(
  approvals: readonly ScoredApproval[],
): ScoredApproval[] {
  return [...approvals].sort((a, b) => {
    const risk = riskRank(b.risk.level) - riskRank(a.risk.level);
    if (risk !== 0) return risk;
    if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
    return a.tokenSymbol.localeCompare(b.tokenSymbol);
  });
}

function collectApprovalSpenderAddresses(
  approvals: LifeboatScanSnapshot["approvals"],
  nftApprovals: LifeboatScanSnapshot["nftApprovals"],
): Address[] {
  const addresses: Address[] = [];
  const seen = new Set<string>();
  for (const approval of approvals) {
    const key = approval.spenderAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(approval.spenderAddress);
  }
  for (const approval of nftApprovals) {
    const key = approval.operatorAddress.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    addresses.push(approval.operatorAddress);
  }
  return addresses.sort((a, b) => a.localeCompare(b));
}

function collectKnownRiskRegistrySubjects({
  owner,
  approvals,
  nftApprovals,
  timeline,
  addressPoisoning,
  spenderRisk,
  eip7702,
  smartWallet,
  erc4337,
  erc6909,
  dustTrap,
}: {
  owner: Address | null;
  approvals: LifeboatScanSnapshot["approvals"];
  nftApprovals: LifeboatScanSnapshot["nftApprovals"];
  timeline: LifeboatTimelineApiResponse;
  addressPoisoning: LifeboatAddressPoisoningApiResponse;
  spenderRisk: LifeboatSpenderRiskApiResponse;
  eip7702: LifeboatEip7702ApiResponse;
  smartWallet: LifeboatSmartWalletApiResponse;
  erc4337: LifeboatErc4337ApiResponse;
  erc6909: LifeboatErc6909ApiResponse;
  dustTrap: LifeboatDustTrapApiResponse;
}): KnownRiskRegistrySubject[] {
  const subjects: KnownRiskRegistrySubject[] = [];
  const seen = new Set<string>();

  for (const approval of approvals) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: approval.spenderAddress,
      role: "approval-spender",
      label: approval.spenderLabel || "Approval spender",
      sourceModule: "approval-scan",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: approval.tokenAddress,
      role: "approval-token",
      label: approval.tokenSymbol || "Approval token",
      sourceModule: "approval-scan",
    });
  }

  for (const approval of nftApprovals) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: approval.operatorAddress,
      role: "nft-operator",
      label: approval.operatorLabel || "NFT operator",
      sourceModule: "nft-approval-scan",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: approval.collectionAddress,
      role: "nft-collection",
      label: approval.collectionName || "NFT collection",
      sourceModule: "nft-approval-scan",
    });
  }

  for (const event of timeline.events) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.spender,
      role: "timeline-spender",
      label: "Timeline approval spender",
      sourceModule: "approval-to-drain-timeline",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.to,
      role: "timeline-recipient",
      label: "Timeline recipient",
      sourceModule: "approval-to-drain-timeline",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.contractAddress,
      role: "timeline-contract",
      label: "Timeline contract",
      sourceModule: "approval-to-drain-timeline",
    });
  }

  for (const item of timeline.evidence) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: item.spender,
      role: "timeline-spender",
      label: "Timeline approval spender",
      sourceModule: "approval-to-drain-timeline",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: item.recipient,
      role: "timeline-recipient",
      label: "Timeline outbound recipient",
      sourceModule: "approval-to-drain-timeline",
    });
  }

  for (const item of addressPoisoning.evidence) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: item.lookalikeAddress,
      role: "address-poisoning-lookalike",
      label: "Address-poisoning lookalike",
      sourceModule: "address-poisoning",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: item.referenceAddress,
      role: "address-poisoning-reference",
      label: "Address-poisoning reference",
      sourceModule: "address-poisoning",
    });
  }

  for (const spender of spenderRisk.spenders) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: spender.address,
      role: "spender-risk-spender",
      label: spender.registryContext?.label ?? spender.contractName ?? "Spender",
      sourceModule: "spender-contract-risk",
    });
  }

  for (const item of eip7702.evidence) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: item.delegationAddress,
      role: "eip7702-delegate",
      label: "EIP-7702 delegate",
      sourceModule: "eip7702",
    });
  }

  for (const item of smartWallet.evidence) {
    for (const safeOwner of item.safeOwners) {
      addKnownRiskSubject(subjects, seen, owner, {
        address: safeOwner,
        role: "safe-owner",
        label: "Safe owner",
        sourceModule: "smart-wallet",
      });
    }
    for (const safeModule of item.safeModules) {
      addKnownRiskSubject(subjects, seen, owner, {
        address: safeModule,
        role: "safe-module",
        label: "Safe module",
        sourceModule: "smart-wallet",
      });
    }
  }

  for (const event of erc4337.events) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.paymaster,
      role: "erc4337-paymaster",
      label: "ERC-4337 paymaster",
      sourceModule: "erc4337",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.entryPointAddress,
      role: "erc4337-entry-point",
      label: "ERC-4337 EntryPoint",
      sourceModule: "erc4337",
    });
  }

  for (const event of erc6909.events) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.contractAddress,
      role: "erc6909-contract",
      label: "ERC-6909 contract",
      sourceModule: "erc6909",
    });
    addKnownRiskSubject(subjects, seen, owner, {
      address: event.spender,
      role: "erc6909-spender",
      label: "ERC-6909 spender",
      sourceModule: "erc6909",
    });
  }

  for (const item of dustTrap.evidence) {
    addKnownRiskSubject(subjects, seen, owner, {
      address: item.contractAddress,
      role: item.assetType === "nft" ? "dust-nft-collection" : "dust-token",
      label: item.displayName,
      sourceModule: "dust-trap",
    });
  }

  return subjects;
}

function addKnownRiskSubject(
  subjects: KnownRiskRegistrySubject[],
  seen: Set<string>,
  owner: Address | null,
  subject: {
    address: Address | null | undefined;
    role: KnownRiskRegistrySubjectRole;
    label: string;
    sourceModule: string;
  },
) {
  if (!subject.address) return;
  if (owner && subject.address.toLowerCase() === owner.toLowerCase()) return;
  const key = [
    subject.address.toLowerCase(),
    subject.role,
    subject.sourceModule.toLowerCase(),
  ].join(":");
  if (seen.has(key)) return;
  seen.add(key);
  subjects.push({
    address: subject.address,
    role: subject.role,
    label: subject.label,
    sourceModule: subject.sourceModule,
  });
}

function sortNftApprovals(approvals: readonly NftApproval[]): NftApproval[] {
  return [...approvals].sort((a, b) => {
    const risk = riskRank(b.risk.level) - riskRank(a.risk.level);
    if (risk !== 0) return risk;
    if (a.kind !== b.kind) return a.kind === "approvalForAll" ? -1 : 1;
    return (a.collectionName ?? a.collectionAddress).localeCompare(
      b.collectionName ?? b.collectionAddress,
    );
  });
}

function riskRank(level: RiskLevel): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function addressUrlFor(option: AddressOnlyScanOption, address: Address): string {
  if (option.kind === "hyperevm") {
    return `${explorerBaseUrlFor(option)}/address/${address}`;
  }
  return explorerAddressUrl(option.chainId, address);
}

function tokenUrlFor(option: AddressOnlyScanOption, address: Address): string {
  if (option.kind === "hyperevm") {
    return `${explorerBaseUrlFor(option)}/token/${address}`;
  }
  return explorerTokenUrl(option.chainId, address);
}

function txUrlFor(option: AddressOnlyScanOption, hash: string): string {
  if (option.kind === "hyperevm") {
    return `${explorerBaseUrlFor(option)}/tx/${hash}`;
  }
  return explorerTxUrl(option.chainId, hash);
}

function shortHash(hash: string): string {
  return hash.length > 14 ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;
}

function formatReviewedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
}

function registryRoleLabel(role: KnownRiskRegistrySubjectRole): string {
  return role.replaceAll("-", " ");
}

function visibleAssetExposureLabel(
  exposureKind: VisibleAssetsAnalysis["evidence"][number]["exposureKind"],
): string {
  switch (exposureKind) {
    case "unlimited-token-allowance":
      return "Unlimited token allowance";
    case "finite-token-allowance":
      return "Token allowance";
    case "permit2-token-allowance":
      return "Permit2 allowance";
    case "collection-wide-nft-approval":
      return "Collection-wide NFT approval";
    case "single-nft-approval":
      return "Single NFT approval";
  }
}

function shortCodePrefix(code: string): string {
  return code.length > 18 ? `${code.slice(0, 10)}...${code.slice(-6)}` : code;
}

function eip7702ClassificationLabel(
  classification: LifeboatEip7702ApiResponse["evidence"][number]["classification"],
): string {
  switch (classification) {
    case "eip7702_delegation":
      return "Delegation designator";
    case "invalid_delegation":
      return "Malformed delegation prefix";
    case "other_code":
      return "Other account code";
    case "empty":
    default:
      return "No account code";
  }
}

function formatPermit2Expiration(iso: string | null): string {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventKindLabel(kind: LifeboatTimelineApiResponse["events"][number]["kind"]): string {
  switch (kind) {
    case "approval":
      return "Approval call";
    case "native_in":
      return "Native in";
    case "native_out":
      return "Native out";
    case "token_in":
      return "Token in";
    case "token_out":
      return "Token out";
    default:
      return "Timeline event";
  }
}

function explorerBaseUrlFor(option: AddressOnlyScanOption): string {
  switch (option.kind) {
    case "ethereum":
      return "https://etherscan.io";
    case "arbitrum":
      return "https://arbiscan.io";
    case "optimism":
      return "https://optimistic.etherscan.io";
    case "hyperevm":
      return "https://hyperevmscan.io";
    case "supported":
    default:
      return "https://pulserevoke.com";
  }
}
