"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import type { Address } from "viem";

import { ApprovalFilters } from "@/components/approvals/approval-filters";
import { ApprovalRow } from "@/components/approvals/approval-row";
import {
  BatchActionBar,
  BatchRevokePanel,
} from "@/components/approvals/batch-revoke-panel";
import { ChainLogo, ChainLogoBackdrop } from "@/components/chains/chain-logo";
import { ArbitrumReadOnlyScanner } from "@/components/sections/arbitrum-readonly-scanner";
import { EthereumReadOnlyScanner } from "@/components/sections/ethereum-readonly-scanner";
import { HyperEVMReadOnlyScanner } from "@/components/sections/hyperevm-readonly-scanner";
import { OptimismReadOnlyScanner } from "@/components/sections/optimism-readonly-scanner";
import { NftApprovalRow } from "@/components/approvals/nft-approval-row";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { ScannerDiagnosticsPanel } from "@/components/sections/scanner-diagnostics";
import { useApprovalDiscovery } from "@/hooks/use-approval-discovery";
import { useBatchRevoke } from "@/hooks/use-batch-revoke";
import { useNftApprovalDiscovery } from "@/hooks/use-nft-approval-discovery";
import { useTokenLogos } from "@/hooks/use-token-logos";
import { resolveActiveChain, scannerSessionKey } from "@/lib/active-chain";
import {
  addressOnlyScanOptions,
  getAddressOnlyActiveScanChainIds,
  getAddressOnlyScanOption,
  getSupportedAddressOnlyChainConfig,
  isAddressOnlyScanChainId,
  resolveDefaultAddressOnlyScanChainId,
  type AddressOnlyScanChainId,
} from "@/lib/address-only-scan";
import type { SupportedChainConfig } from "@/lib/chains";
import {
  ARBITRUM_ONE_CLIENT_CHAIN_ID,
  resolveArbitrumReadOnlyChainId,
} from "@/lib/arbitrum-approval-client";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  resolveEthereumReadOnlyChainId,
} from "@/lib/ethereum-approval-client";
import {
  OPTIMISM_CLIENT_CHAIN_ID,
  resolveOptimismReadOnlyChainId,
} from "@/lib/optimism-approval-client";
import {
  HYPEREVM_CLIENT_CHAIN_ID,
  resolveHyperEVMReadOnlyChainId,
} from "@/lib/hyperevm-approval-client";
import { explorerAddressUrl } from "@/lib/explorer";
import { shortenAddress } from "@/lib/format";
import type { NftApproval } from "@/lib/nft-approvals";
import {
  filterAndSortScoredApprovals,
  scoreApprovals,
  type ApprovalFilter,
  type ApprovalSort,
  type ScoredApproval,
} from "@/lib/risk";
import {
  getErc20ResultState,
  getRevokeDisabledNoticeCopy,
  getScanRevokeDisabledReason,
} from "@/lib/scanner-result-state";
import {
  ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY,
  WALLET_MISMATCH_SCAN_TARGET_COPY,
  addressesEqual,
  getScanTargetRevokeDisabledReason,
  normalizeScanInputAddress,
  resolveScanTarget,
  scanTargetSessionKey,
  type ScanMode,
  type ScanTarget,
} from "@/lib/scan-target";
import {
  getPipelineHealthDisplay,
  getScanPhaseDisplay,
  getScannerModeDisplay,
  type PipelineHealthDisplay,
  type ScannerDisplayTone,
  type ScannerModeDisplay,
} from "@/lib/scanner-display";
import { LIVE_SUPPORTED_CHAIN_COMPACT_LIST } from "@/lib/supported-chain-copy";
import { tokenLogoAddressKey } from "@/lib/token-logos";

/**
 * Connected-wallet approval scanner for the shared PulseChain/BSC/Base/Polygon lane.
 * Ethereum, Arbitrum, Optimism, and HyperEVM are routed through read-only
 * scanner lanes in this component before verified rows can expose revoke
 * actions.
 *
 * Uses `useApprovalDiscovery` to pull historical `Approval` events from the
 * configured explorer, re-validate every `(token, spender)` pair live via
 * Multicall3, and enrich matches from the curated registry. The registry-
 * only `useApprovalScan` hook is preserved under `@/hooks/use-approval-scan`
 * as a secondary option for future registry-constrained modes.
 */
export function ApprovalScanner() {
  const {
    address,
    chainId: walletChainId,
    isConnected,
    status: accountStatus,
  } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const activeChain = resolveActiveChain({
    isConnected,
    walletChainId,
    wagmiChainId,
  });
  const debugMode = useDebugModeFromQuery();
  const defaultAddressOnlyChainId = useMemo(
    () =>
      resolveDefaultAddressOnlyScanChainId({
        walletChainId,
        wagmiChainId,
      }),
    [walletChainId, wagmiChainId],
  );
  const [preferredAddressOnlyChainId, setPreferredAddressOnlyChainId] =
    useState<AddressOnlyScanChainId>(defaultAddressOnlyChainId);
  const [networkSwitchError, setNetworkSwitchError] = useState<string | null>(
    null,
  );
  const [scanInputAddress, setScanInputAddress] = useState("");
  const [activeAddressOnlyAddress, setActiveAddressOnlyAddress] =
    useState<Address | null>(null);
  const [scanInputError, setScanInputError] = useState<string | null>(null);
  const scanTarget = useMemo(
    () =>
      resolveScanTarget({
        connectedWalletAddress: address,
        activeAddressOnlyAddress,
      }),
    [address, activeAddressOnlyAddress],
  );
  const selectedPageNetworkChainId = isAddressOnlyScanChainId(walletChainId)
    ? walletChainId
    : preferredAddressOnlyChainId;

  useEffect(() => {
    if (isAddressOnlyScanChainId(walletChainId)) {
      setPreferredAddressOnlyChainId(walletChainId);
      return;
    }
    if (!isConnected) {
      setPreferredAddressOnlyChainId(defaultAddressOnlyChainId);
    }
  }, [defaultAddressOnlyChainId, isConnected, walletChainId]);

  const onScanInputChange = useCallback(
    (value: string) => {
      setScanInputAddress(value);
      setScanInputError(null);
      if (!activeAddressOnlyAddress) return;

      const normalized = normalizeScanInputAddress(value);
      if (!normalized || !addressesEqual(normalized, activeAddressOnlyAddress)) {
        setActiveAddressOnlyAddress(null);
      }
    },
    [activeAddressOnlyAddress],
  );

  const onScanAddress = useCallback(() => {
    const normalized = normalizeScanInputAddress(scanInputAddress);
    if (!normalized) {
      setScanInputError("Enter a valid EVM wallet address.");
      setActiveAddressOnlyAddress(null);
      return;
    }
    setScanInputAddress(normalized);
    setActiveAddressOnlyAddress(normalized);
    setScanInputError(null);
  }, [scanInputAddress]);

  const onClearAddressScan = useCallback(() => {
    setScanInputAddress("");
    setActiveAddressOnlyAddress(null);
    setScanInputError(null);
  }, []);

  const onSelectPageNetwork = useCallback(
    (chainId: AddressOnlyScanChainId) => {
      setNetworkSwitchError(null);

      if (!isConnected) {
        setPreferredAddressOnlyChainId(chainId);
        return;
      }

      if (walletChainId === chainId) {
        setPreferredAddressOnlyChainId(chainId);
        return;
      }

      switchChain(
        { chainId },
        {
          onError: (error) => setNetworkSwitchError(error.message),
          onSuccess: () => setPreferredAddressOnlyChainId(chainId),
        },
      );
    },
    [isConnected, switchChain, walletChainId],
  );

  return (
    <section
      id="scanner"
      className="relative bg-gradient-to-b from-pulse-bg via-pulse-panel/20 to-pulse-bg py-7 sm:py-10"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Scanner controls
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-pulse-text sm:text-3xl">
            Choose a wallet to review
          </h2>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            Paste an address for read-only review, or connect the matching
            wallet when you are ready to revoke verified approvals.
          </p>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-2xl border border-pulse-border bg-pulse-panel/80 shadow-glow">
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pulse-cyan/70 to-transparent"
            aria-hidden
          />
          <div className="p-4 sm:p-6 lg:p-8">
            <ScannerWorkflowStrip />
            <PageNetworkSelector
              selectedChainId={selectedPageNetworkChainId}
              walletChainId={walletChainId}
              isConnected={isConnected}
              isSwitching={isSwitchingChain}
              error={networkSwitchError}
              onSelect={onSelectPageNetwork}
            />
            <AddressScanPanel
              inputAddress={scanInputAddress}
              activeAddress={activeAddressOnlyAddress}
              scanTarget={scanTarget}
              inputError={scanInputError}
              onInputChange={onScanInputChange}
              onScan={onScanAddress}
              onClear={onClearAddressScan}
            />
            <ScannerBody
              accountStatus={accountStatus}
              address={address}
              walletChainId={walletChainId}
              wagmiChainId={wagmiChainId}
              activeChainId={activeChain.activeChainId}
              isConnected={isConnected}
              chainConfig={activeChain.activeChainConfig}
              onSupportedChain={activeChain.status === "supported"}
              walletMatchesActiveChain={activeChain.walletMatchesActiveChain}
              preferredAddressOnlyChainId={preferredAddressOnlyChainId}
              onPreferredAddressOnlyChainChange={
                setPreferredAddressOnlyChainId
              }
              scanTarget={scanTarget}
              debugMode={debugMode}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function useDebugModeFromQuery() {
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(
      params.get("debug") === "1" ||
        params.get("debug")?.toLowerCase() === "true",
    );
  }, []);

  return debugMode;
}

function AddressScanPanel({
  inputAddress,
  activeAddress,
  scanTarget,
  inputError,
  onInputChange,
  onScan,
  onClear,
}: {
  inputAddress: string;
  activeAddress: Address | null;
  scanTarget: ScanTarget;
  inputError: string | null;
  onInputChange: (value: string) => void;
  onScan: () => void;
  onClear: () => void;
}) {
  const hasInput = inputAddress.trim().length > 0;
  const statusTone = activeAddress
    ? scanTarget.isConnectedWalletSameAsScanTarget
      ? "success"
      : scanTarget.connectedWalletAddress
        ? "warning"
        : "neutral"
    : "neutral";
  const statusCopy = activeAddress
    ? scanTarget.isConnectedWalletSameAsScanTarget
      ? "Wallet matches scan target"
      : scanTarget.connectedWalletAddress
        ? "Wallet mismatch"
        : "Connect matching wallet to revoke"
    : "No pasted address active";
  const modeDisplay = getScannerModeDisplay({
    scanMode: scanTarget.scanMode,
    walletConnected: Boolean(scanTarget.connectedWalletAddress),
    walletMatchesScanTarget: activeAddress
      ? scanTarget.isConnectedWalletSameAsScanTarget
      : scanTarget.connectedWalletAddress
        ? true
        : null,
    walletMatchesActiveChain: null,
  });

  return (
    <div className="mb-6 rounded-2xl border border-pulse-border/80 bg-pulse-bg/45 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Address scan
          </p>
          <h3 className="mt-1 text-lg font-semibold text-pulse-text">
            Review first. Connect only to revoke.
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pulse-muted">
            Paste any EVM wallet address for read-only approval review. Wallet
            connection is needed only when you choose a verified row to revoke.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ScannerModeBadge display={modeDisplay} />
          <ScanStatusPill tone={statusTone}>{statusCopy}</ScanStatusPill>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <form
          className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            onScan();
          }}
        >
          <label className="sr-only" htmlFor="address-scan-input">
            Wallet address to scan
          </label>
          <input
            id="address-scan-input"
            value={inputAddress}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="0x..."
            autoComplete="off"
            spellCheck={false}
            className="min-h-11 rounded-xl border border-pulse-border bg-pulse-bg/80 px-3 py-2 font-mono text-sm text-pulse-text outline-none transition placeholder:text-pulse-muted/60 focus:border-pulse-cyan/60"
          />
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-4 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
          >
            Scan address
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasInput && !activeAddress}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-pulse-border bg-pulse-text/5 px-4 py-2 text-xs font-semibold text-pulse-muted transition hover:bg-pulse-text/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </form>
        {activeAddress ? (
          <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-pulse-border bg-pulse-panel/45 px-3 py-2 text-xs text-pulse-muted">
            <span className="font-semibold uppercase tracking-[0.14em]">
              Target
            </span>
            <span className="font-mono">{shortenAddress(activeAddress)}</span>
            <AddressActions
              address={activeAddress}
              chainId={undefined}
              explorerLabel="Explorer"
            />
          </div>
        ) : null}
      </div>
      {inputError ? (
        <p className="mt-2 text-xs font-semibold text-pulse-red">
          {inputError}
        </p>
      ) : null}
    </div>
  );
}

function ScannerWorkflowStrip() {
  return (
    <div className="mb-4 grid gap-2 text-xs text-pulse-muted sm:grid-cols-3">
      <ScannerWorkflowStep
        label="1"
        title="Scan"
        body="Read public approval state."
      />
      <ScannerWorkflowStep
        label="2"
        title="Review"
        body="Check spender and risk cues."
      />
      <ScannerWorkflowStep
        label="3"
        title="Revoke"
        body="Connect the matching wallet."
      />
    </div>
  );
}

function ScannerWorkflowStep({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-pulse-border/70 bg-pulse-bg/35 p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-pulse-cyan/35 bg-pulse-cyan/10 font-mono text-[11px] font-semibold text-pulse-cyan">
        {label}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-pulse-text">{title}</span>
        <span className="mt-0.5 block leading-5">{body}</span>
      </span>
    </div>
  );
}

function PageNetworkSelector({
  selectedChainId,
  walletChainId,
  isConnected,
  isSwitching,
  error,
  onSelect,
}: {
  selectedChainId: AddressOnlyScanChainId;
  walletChainId: number | undefined;
  isConnected: boolean;
  isSwitching: boolean;
  error: string | null;
  onSelect: (chainId: AddressOnlyScanChainId) => void;
}) {
  const selectedOption = getAddressOnlyScanOption(selectedChainId);
  const walletOnListedNetwork = isAddressOnlyScanChainId(walletChainId);
  const helper = isConnected
    ? walletOnListedNetwork
      ? `Wallet network: ${selectedOption.displayName}. Selecting another network opens a wallet switch prompt.`
      : "Your wallet is connected on an unsupported network. Select a network below to ask the wallet to switch."
    : `Address-only scans will start on ${selectedOption.displayName}. Connect a wallet only when you are ready to revoke.`;

  return (
    <div className="mb-4 rounded-2xl border border-pulse-border/80 bg-pulse-bg/45 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Network
          </p>
          <h3 className="mt-1 text-lg font-semibold text-pulse-text">
            Select the network to review
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-pulse-muted">
            {helper}
          </p>
          {error ? (
            <p className="mt-2 max-w-3xl text-xs font-semibold text-pulse-red">
              {error}
            </p>
          ) : null}
        </div>
        <ScanStatusPill
          tone={
            isConnected
              ? walletOnListedNetwork
                ? "success"
                : "warning"
              : "neutral"
          }
        >
          {isConnected
            ? walletOnListedNetwork
              ? selectedOption.shortName
              : "Unsupported network"
            : `${selectedOption.shortName} selected`}
        </ScanStatusPill>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {addressOnlyScanOptions.map((option) => {
          const selected = selectedChainId === option.chainId;
          return (
            <button
              key={option.chainId}
              type="button"
              onClick={() => onSelect(option.chainId)}
              disabled={isSwitching || (isConnected && selected)}
              className={`group relative inline-flex min-h-10 items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-1.5 pr-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-pulse-green/40 bg-pulse-green/10 text-pulse-green"
                  : "border-pulse-border bg-pulse-text/5 text-pulse-muted hover:bg-pulse-text/10"
              }`}
              aria-pressed={selected}
            >
              <ChainLogoBackdrop chainId={option.chainId} className="h-14 w-14" />
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-pulse-green/40 bg-pulse-green/15"
                    : "border-pulse-border/70 bg-pulse-bg/55"
                }`}
              >
                <ChainLogo chainId={option.chainId} className="h-4 w-4" />
              </span>
              <span className="relative z-10">
                {isSwitching && !selected ? "Switching..." : option.shortName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScanStatusPill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
      : tone === "warning"
        ? "border-amber-400/35 bg-amber-400/10 text-amber-200"
        : "border-pulse-border bg-pulse-panel/55 text-pulse-muted";

  return (
    <span
      className={`inline-flex max-w-full shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${toneClass}`}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

function ScannerBody({
  accountStatus,
  address,
  walletChainId,
  wagmiChainId,
  activeChainId,
  isConnected,
  chainConfig,
  onSupportedChain,
  walletMatchesActiveChain,
  preferredAddressOnlyChainId,
  onPreferredAddressOnlyChainChange,
  scanTarget,
  debugMode,
}: {
  accountStatus: ReturnType<typeof useAccount>["status"];
  address: `0x${string}` | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  activeChainId: number | undefined;
  isConnected: boolean;
  chainConfig: SupportedChainConfig | undefined;
  onSupportedChain: boolean;
  walletMatchesActiveChain: boolean | null;
  preferredAddressOnlyChainId: AddressOnlyScanChainId;
  onPreferredAddressOnlyChainChange: (chainId: AddressOnlyScanChainId) => void;
  scanTarget: ScanTarget;
  debugMode: boolean;
}) {
  if (
    scanTarget.scanMode !== "connected-wallet" &&
    scanTarget.scanTargetAddress
  ) {
    return (
      <AddressOnlyScanResults
        key={scanTargetSessionKey(scanTarget)}
        owner={scanTarget.scanTargetAddress}
        connectedAddress={scanTarget.connectedWalletAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        preferredChainId={preferredAddressOnlyChainId}
        onPreferredChainChange={onPreferredAddressOnlyChainChange}
        debugMode={debugMode}
      />
    );
  }

  if (accountStatus === "reconnecting" || accountStatus === "connecting") {
    return (
      <div className="space-y-5">
        <ScannerState
          eyebrow="Step 1"
          title="Reconnecting to your wallet"
          body="Waiting for your wallet to finish reconnecting..."
          action={null}
        />
        <ScannerDiagnosticsPanel
          enabled={debugMode}
          owner={address}
          walletChainId={walletChainId}
          wagmiChainId={wagmiChainId}
          activeChainId={activeChainId}
          chainConfig={chainConfig}
          onSupportedChain={onSupportedChain}
          walletMatchesActiveChain={walletMatchesActiveChain}
          isConnected={isConnected}
        />
      </div>
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="space-y-5">
        <ScannerState
          eyebrow="Step 1"
          title="Connect when you want wallet-led review"
          body="You can scan a pasted address without connecting. Connect only when you want to review the connected wallet directly or revoke verified approvals."
          action={<ConnectWalletButton />}
        />
        <ScannerDiagnosticsPanel
          enabled={debugMode}
          owner={address}
          walletChainId={walletChainId}
          wagmiChainId={wagmiChainId}
          activeChainId={activeChainId}
          chainConfig={chainConfig}
          onSupportedChain={onSupportedChain}
          walletMatchesActiveChain={walletMatchesActiveChain}
          isConnected={isConnected}
        />
      </div>
    );
  }

  const ethereumReadOnlyChainId = resolveEthereumReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });

  if (ethereumReadOnlyChainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return (
      <EthereumReadOnlyScanner
        owner={address}
        connectedAddress={address}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
      />
    );
  }

  const arbitrumReadOnlyChainId = resolveArbitrumReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });

  if (arbitrumReadOnlyChainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return (
      <ArbitrumReadOnlyScanner
        owner={address}
        connectedAddress={address}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
      />
    );
  }

  const optimismReadOnlyChainId = resolveOptimismReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });

  if (optimismReadOnlyChainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return (
      <OptimismReadOnlyScanner
        owner={address}
        connectedAddress={address}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
      />
    );
  }

  const hyperevmReadOnlyChainId = resolveHyperEVMReadOnlyChainId({
    walletChainId,
    wagmiChainId,
  });

  if (hyperevmReadOnlyChainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return (
      <HyperEVMReadOnlyScanner
        owner={address}
        connectedAddress={address}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
      />
    );
  }

  if (!onSupportedChain || !chainConfig) {
    const names = LIVE_SUPPORTED_CHAIN_COMPACT_LIST;
    return (
      <div className="space-y-5">
        <ScannerState
          tone="warning"
          eyebrow="Unsupported network"
          title="Switch to a live supported network"
          body={`Pulse Revoke supports ${names}. Switch networks in your wallet to continue. Your wallet stays connected, and no transaction is requested.`}
          action={<ConnectWalletButton variant="ghost" />}
        />
        <ScannerDiagnosticsPanel
          enabled={debugMode}
          owner={address}
          walletChainId={walletChainId}
          wagmiChainId={wagmiChainId}
          activeChainId={activeChainId}
          chainConfig={chainConfig}
          onSupportedChain={onSupportedChain}
          walletMatchesActiveChain={walletMatchesActiveChain}
          isConnected={isConnected}
        />
      </div>
    );
  }

  return (
    <ConnectedScanner
      // Remount the scanner session when wallet or chain changes so old
      // approvals, selections, batch state, and diagnostics cannot bleed into
      // the newly active wallet chain.
      key={scannerSessionKey(address, chainConfig.chainId)}
      owner={address}
      connectedAddress={address}
      chainConfig={chainConfig}
      walletChainId={walletChainId}
      wagmiChainId={wagmiChainId}
      walletMatchesActiveChain={walletMatchesActiveChain}
      walletMatchesScanTarget={true}
      scanMode="connected-wallet"
      isConnected={isConnected}
      debugMode={debugMode}
    />
  );
}

function AddressOnlyScanResults({
  owner,
  connectedAddress,
  walletChainId,
  wagmiChainId,
  preferredChainId,
  onPreferredChainChange,
  debugMode,
}: {
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  preferredChainId: AddressOnlyScanChainId;
  onPreferredChainChange: (chainId: AddressOnlyScanChainId) => void;
  debugMode: boolean;
}) {
  const walletMatchesOwner = addressesEqual(connectedAddress, owner);
  const walletMatchesScanTarget = connectedAddress ? walletMatchesOwner : null;
  const scanMode: ScanMode = walletMatchesOwner
    ? "connected-wallet-matches-scanned-address"
    : "address-only";
  const [selectedChainId, setSelectedChainId] =
    useState<AddressOnlyScanChainId>(preferredChainId);
  const [scanAllStarted, setScanAllStarted] = useState(false);
  const [scanAllIndex, setScanAllIndex] = useState(0);
  const previousOwnerRef = useRef(owner);

  useEffect(() => {
    if (previousOwnerRef.current === owner) return;
    previousOwnerRef.current = owner;
    setSelectedChainId(preferredChainId);
    setScanAllStarted(false);
    setScanAllIndex(0);
  }, [owner, preferredChainId]);

  useEffect(() => {
    setSelectedChainId(preferredChainId);
    setScanAllStarted(false);
    setScanAllIndex(0);
  }, [preferredChainId]);

  const status = !connectedAddress
    ? ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY
    : walletMatchesOwner
      ? "Connected wallet matches scanned address."
      : WALLET_MISMATCH_SCAN_TARGET_COPY;
  const activeChainIds = getAddressOnlyActiveScanChainIds({
    selectedChainId,
    scanAllStarted,
    scanAllIndex,
  });
  const selectedOption = getAddressOnlyScanOption(selectedChainId);
  const modeDisplay = getScannerModeDisplay({
    scanMode,
    walletConnected: Boolean(connectedAddress),
    walletMatchesScanTarget,
    walletMatchesActiveChain:
      connectedAddress && walletMatchesOwner ? walletChainId === selectedChainId : null,
  });

  const selectChain = useCallback((chainId: AddressOnlyScanChainId) => {
    setSelectedChainId(chainId);
    setScanAllStarted(false);
    setScanAllIndex(0);
    onPreferredChainChange(chainId);
  }, [onPreferredChainChange]);

  const startScanAll = useCallback(() => {
    setScanAllStarted(true);
    setScanAllIndex(0);
  }, []);

  const onAddressOnlyChainSettled = useCallback(
    (chainId: AddressOnlyScanChainId) => {
      if (!scanAllStarted) return;
      const currentChainId = addressOnlyScanOptions[scanAllIndex]?.chainId;
      if (chainId !== currentChainId) return;
      setScanAllIndex((current) =>
        Math.min(current + 1, addressOnlyScanOptions.length - 1),
      );
    },
    [scanAllIndex, scanAllStarted],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4 text-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Address-only scan
            </p>
            <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
              Approvals are public blockchain state. You do not need to connect
              a wallet to scan. Revoke buttons stay disabled until the connected
              wallet exactly matches the scanned address and the row chain.
            </p>
          </div>
          <ScannerModeBadge display={modeDisplay} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-pulse-muted">
            {shortenAddress(owner)}
          </span>
          <AddressActions
            address={owner}
            chainId={selectedChainId}
            explorerLabel={selectedOption.shortName}
          />
          <span
            className={`rounded-full border px-3 py-1 font-semibold ${
              walletMatchesOwner
                ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
                : "border-amber-400/35 bg-amber-400/10 text-amber-200"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      <AddressOnlyChainSelector
        selectedChainId={selectedChainId}
        selectedLabel={selectedOption.displayName}
        scanAllStarted={scanAllStarted}
        scanAllIndex={scanAllIndex}
        onSelect={selectChain}
        onScanAll={startScanAll}
      />

      {activeChainIds.map((chainId) => (
        <AddressOnlyChainScan
          key={`${owner}-${chainId}`}
          chainId={chainId}
          owner={owner}
          connectedAddress={connectedAddress}
          walletChainId={walletChainId}
          wagmiChainId={wagmiChainId}
          walletMatchesOwner={walletMatchesOwner}
          walletMatchesScanTarget={walletMatchesScanTarget}
          scanMode={scanMode}
          debugMode={debugMode}
          onScanSettled={onAddressOnlyChainSettled}
        />
      ))}
    </div>
  );
}

function AddressOnlyChainSelector({
  selectedChainId,
  selectedLabel,
  scanAllStarted,
  scanAllIndex,
  onSelect,
  onScanAll,
}: {
  selectedChainId: AddressOnlyScanChainId;
  selectedLabel: string;
  scanAllStarted: boolean;
  scanAllIndex: number;
  onSelect: (chainId: AddressOnlyScanChainId) => void;
  onScanAll: () => void;
}) {
  const scanAllComplete =
    scanAllStarted && scanAllIndex >= addressOnlyScanOptions.length - 1;
  const scanAllStatus = scanAllStarted
    ? scanAllComplete
      ? "All networks have been started one at a time."
      : `Scanning network ${scanAllIndex + 1} of ${addressOnlyScanOptions.length}.`
    : `Scanning ${selectedLabel}.`;

  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4 text-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Select network
          </p>
          <p className="mt-1 text-sm leading-6 text-pulse-muted">
            Address-only mode scans one network by default. Multi-network scans
            start only after you request them.
          </p>
          <p className="mt-1 text-xs text-pulse-muted">{scanAllStatus}</p>
        </div>
        <button
          type="button"
          onClick={onScanAll}
          disabled={scanAllStarted && !scanAllComplete}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Scan all supported networks
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {addressOnlyScanOptions.map((option) => {
          const selected = selectedChainId === option.chainId && !scanAllStarted;
          return (
            <button
              key={option.chainId}
              type="button"
              onClick={() => onSelect(option.chainId)}
              className={`group relative inline-flex min-h-10 items-center gap-2 overflow-hidden rounded-xl border px-2.5 py-1.5 pr-3 text-xs font-semibold transition ${
                selected
                  ? "border-pulse-green/40 bg-pulse-green/10 text-pulse-green"
                  : "border-pulse-border bg-pulse-text/5 text-pulse-muted hover:bg-pulse-text/10"
              }`}
              aria-pressed={selected}
            >
              <ChainLogoBackdrop chainId={option.chainId} className="h-14 w-14" />
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  selected
                    ? "border-pulse-green/40 bg-pulse-green/15"
                    : "border-pulse-border/70 bg-pulse-bg/55"
                }`}
              >
                <ChainLogo chainId={option.chainId} className="h-4 w-4" />
              </span>
              <span className="relative z-10">{option.shortName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AddressOnlyChainScan({
  chainId,
  owner,
  connectedAddress,
  walletChainId,
  wagmiChainId,
  walletMatchesOwner,
  walletMatchesScanTarget,
  scanMode,
  debugMode,
  onScanSettled,
}: {
  chainId: AddressOnlyScanChainId;
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  walletMatchesOwner: boolean;
  walletMatchesScanTarget: boolean | null;
  scanMode: ScanMode;
  debugMode: boolean;
  onScanSettled: (chainId: AddressOnlyScanChainId) => void;
}) {
  const handleScanSettled = useCallback(
    () => onScanSettled(chainId),
    [chainId, onScanSettled],
  );

  if (chainId === ETHEREUM_MAINNET_CLIENT_CHAIN_ID) {
    return (
      <EthereumReadOnlyScanner
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
        onScanSettled={handleScanSettled}
      />
    );
  }

  if (chainId === ARBITRUM_ONE_CLIENT_CHAIN_ID) {
    return (
      <ArbitrumReadOnlyScanner
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
        onScanSettled={handleScanSettled}
      />
    );
  }

  if (chainId === OPTIMISM_CLIENT_CHAIN_ID) {
    return (
      <OptimismReadOnlyScanner
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
        onScanSettled={handleScanSettled}
      />
    );
  }

  if (chainId === HYPEREVM_CLIENT_CHAIN_ID) {
    return (
      <HyperEVMReadOnlyScanner
        owner={owner}
        connectedAddress={connectedAddress}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        debugMode={debugMode}
        onScanSettled={handleScanSettled}
      />
    );
  }

  const chainConfig = getSupportedAddressOnlyChainConfig(chainId);
  if (!chainConfig) return null;

  return (
    <ConnectedScanner
      key={scannerSessionKey(owner, chainConfig.chainId)}
      owner={owner}
      connectedAddress={connectedAddress}
      chainConfig={chainConfig}
      walletChainId={walletChainId}
      wagmiChainId={wagmiChainId}
      walletMatchesActiveChain={
        connectedAddress
          ? walletChainId === chainConfig.chainId && walletMatchesOwner
          : null
      }
      walletMatchesScanTarget={walletMatchesScanTarget}
      scanMode={scanMode}
      isConnected={Boolean(connectedAddress)}
      debugMode={debugMode}
      onScanSettled={handleScanSettled}
    />
  );
}

function ConnectedScanner({
  owner,
  connectedAddress,
  chainConfig,
  walletChainId,
  wagmiChainId,
  walletMatchesActiveChain,
  walletMatchesScanTarget,
  scanMode,
  isConnected,
  debugMode,
  onScanSettled,
}: {
  owner: `0x${string}`;
  connectedAddress: Address | undefined;
  chainConfig: SupportedChainConfig;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  walletMatchesActiveChain: boolean | null;
  walletMatchesScanTarget: boolean | null;
  scanMode: ScanMode;
  isConnected: boolean;
  debugMode: boolean;
  onScanSettled?: () => void;
}) {
  const scan = useApprovalDiscovery({ owner, chainId: chainConfig.chainId });
  const nft = useNftApprovalDiscovery({ owner, chainId: chainConfig.chainId });
  const scanRevokeDisabledReason = getScanRevokeDisabledReason({
    status: scan.status,
    failedLiveReads: scan.diagnostics.liveReadFailureCount,
    discoveryTruncated: scan.truncated,
    approvalLabel: chainConfig.standardLabels.fungible,
  });
  const walletRevokeDisabledReason = getScanTargetRevokeDisabledReason({
    scanTargetAddress: owner,
    connectedWalletAddress: connectedAddress,
    walletChainId,
    rowChainId: chainConfig.chainId,
    chainName: chainConfig.displayName,
  });
  const erc20RevokeDisabledReason =
    scanRevokeDisabledReason ?? walletRevokeDisabledReason;

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ApprovalSort>("risk");
  const [filter, setFilter] = useState<ApprovalFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const scored = useMemo(
    () => scoreApprovals(scan.approvals),
    [scan.approvals],
  );

  const visibleApprovals = useMemo(
    () => filterAndSortScoredApprovals(scored, { query, sort, filter }),
    [scored, query, sort, filter],
  );

  const highRiskCount = useMemo(
    () => scored.filter((a) => a.risk.level === "high").length,
    [scored],
  );
  const nftHighRiskCount = useMemo(
    () => nft.approvals.filter((approval) => approval.risk.level === "high").length,
    [nft.approvals],
  );

  // Prune selections when the underlying scan loses an approval (e.g. after
  // a successful revoke triggers a rescan).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const keys = new Set(scored.map((a) => a.key));
      let changed = false;
      const next = new Set<string>();
      for (const k of prev) {
        if (keys.has(k)) next.add(k);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [scored]);

  const toggleSelect = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const allVisibleSelected = useMemo(
    () =>
      visibleApprovals.length > 0 &&
      visibleApprovals.every((a) => selected.has(a.key)),
    [visibleApprovals, selected],
  );

  const toggleSelectAllVisible = useCallback(() => {
    if (visibleApprovals.length === 0) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const a of visibleApprovals) next.delete(a.key);
      } else {
        for (const a of visibleApprovals) next.add(a.key);
      }
      return next;
    });
  }, [visibleApprovals, allVisibleSelected]);

  const batch = useBatchRevoke({ ownerAddress: owner, onComplete: scan.refetch });
  const batchActive =
    batch.state === "running" || batch.state === "stopping";

  useEffect(() => {
    const erc20Settled = scan.status === "success" || scan.status === "error";
    const nftSettled = nft.status === "success" || nft.status === "error";
    if (erc20Settled && nftSettled) onScanSettled?.();
  }, [nft.status, onScanSettled, scan.status]);

  const selectedApprovals = useMemo(
    () => scored.filter((a) => selected.has(a.key)),
    [scored, selected],
  );

  const selectedHighRisk = useMemo(
    () => selectedApprovals.filter((a) => a.risk.level === "high").length,
    [selectedApprovals],
  );
  const selectedUnlimited = useMemo(
    () => selectedApprovals.filter((a) => a.unlimited).length,
    [selectedApprovals],
  );

  const onReviewBatch = useCallback(() => {
    if (erc20RevokeDisabledReason) return;
    batch.beginConfirm(selectedApprovals);
  }, [batch, erc20RevokeDisabledReason, selectedApprovals]);

  return (
    <div className="space-y-6">
      <ScannerSummary
        owner={owner}
        chainConfig={chainConfig}
        erc20ActiveCount={scan.stats.active}
        nftActiveCount={nft.stats.active}
        candidateCount={scan.stats.candidates + nft.stats.candidates}
        highRiskCount={highRiskCount + nftHighRiskCount}
        status={scan.status}
        isFetching={scan.isFetching}
        incomplete={Boolean(scanRevokeDisabledReason)}
        batchActive={batchActive}
        scanMode={scanMode}
        isConnected={isConnected}
        walletMatchesScanTarget={walletMatchesScanTarget}
        walletMatchesActiveChain={walletMatchesActiveChain}
        completedAt={latestCompletedAt(
          scan.diagnostics.timing.completedAt,
          nft.diagnostics.timing.completedAt,
        )}
        elapsedMs={latestElapsedMs(
          scan.diagnostics.timing.elapsedMs,
          nft.diagnostics.timing.elapsedMs,
        )}
        onRescan={scan.refetch}
      />

      <ScannerDataHealthStrip
        scan={scan}
        nft={nft}
        chainConfig={chainConfig}
        scanMode={scanMode}
        isConnected={isConnected}
        walletMatchesScanTarget={walletMatchesScanTarget}
        walletMatchesActiveChain={walletMatchesActiveChain}
      />

      <ScanContent
        scan={scan}
        owner={owner}
        chainConfig={chainConfig}
        scored={scored}
        visibleApprovals={visibleApprovals}
        query={query}
        sort={sort}
        filter={filter}
        onQueryChange={setQuery}
        onSortChange={setSort}
        onFilterChange={setFilter}
        selected={selected}
        onToggleSelect={toggleSelect}
        onClearSelection={clearSelection}
        onToggleSelectAllVisible={toggleSelectAllVisible}
        allVisibleSelected={allVisibleSelected}
        selectedHighRisk={selectedHighRisk}
        selectedUnlimited={selectedUnlimited}
        onReviewBatch={onReviewBatch}
        revokeDisabledReason={erc20RevokeDisabledReason}
        batch={batch}
        debugMode={debugMode}
      />

      <CoverageNote scan={scan} chainConfig={chainConfig} />
      <ScannerDiagnosticsPanel
        enabled={debugMode}
        owner={owner}
        walletChainId={walletChainId}
        wagmiChainId={wagmiChainId}
        activeChainId={chainConfig.chainId}
        chainConfig={chainConfig}
        onSupportedChain
        walletMatchesActiveChain={walletMatchesActiveChain}
        scanMode={scanMode}
        scanTargetAddress={owner}
        connectedWalletAddress={connectedAddress}
        walletMatchesScanTarget={walletMatchesScanTarget}
        revokeDisabledReason={erc20RevokeDisabledReason}
        isConnected={isConnected}
        erc20={scan}
        nft={nft}
        batch={batch}
      />

      <NftSection
        nft={nft}
        owner={owner}
        chainConfig={chainConfig}
        walletRevokeDisabledReason={walletRevokeDisabledReason}
        debugMode={debugMode}
      />
    </div>
  );
}

function ScannerSummary({
  owner,
  chainConfig,
  erc20ActiveCount,
  nftActiveCount,
  candidateCount,
  highRiskCount,
  status,
  isFetching,
  incomplete,
  batchActive,
  scanMode,
  isConnected,
  walletMatchesScanTarget,
  walletMatchesActiveChain,
  completedAt,
  elapsedMs,
  onRescan,
}: {
  owner: `0x${string}`;
  chainConfig: SupportedChainConfig;
  erc20ActiveCount: number;
  nftActiveCount: number;
  candidateCount: number;
  highRiskCount: number;
  status: ReturnType<typeof useApprovalDiscovery>["status"];
  isFetching: boolean;
  incomplete: boolean;
  batchActive: boolean;
  scanMode: ScanMode;
  isConnected: boolean;
  walletMatchesScanTarget: boolean | null;
  walletMatchesActiveChain: boolean | null;
  completedAt: number | null;
  elapsedMs: number | null;
  onRescan: () => void;
}) {
  const totalActiveCount = erc20ActiveCount + nftActiveCount;
  const modeDisplay = getScannerModeDisplay({
    scanMode,
    walletConnected: isConnected,
    walletMatchesScanTarget,
    walletMatchesActiveChain,
  });
  const summary =
    incomplete
      ? totalActiveCount > 0
        ? `${totalActiveCount} active / verification incomplete`
        : "Verification incomplete"
      : candidateCount > 0
      ? `${totalActiveCount} active / ${candidateCount} checked`
      : status === "pending"
      ? "Searching wallet history"
      : "No active approvals";

  return (
    <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/55">
      <div className="border-b border-pulse-border/70 bg-pulse-panel/35 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-pulse-green/30 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-pulse-green"
                  aria-hidden
                />
                {chainConfig.displayName}
              </span>
              <ScannerModeBadge display={modeDisplay} />
              <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-xs font-medium text-pulse-muted">
                {summary}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-semibold text-pulse-text">
              Scan summary
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-pulse-muted">
              <span className="rounded-full border border-pulse-border bg-pulse-bg/60 px-3 py-1 font-mono">
                {shortenAddress(owner)}
              </span>
              <AddressActions
                address={owner}
                chainId={chainConfig.chainId}
                explorerLabel={chainConfig.explorer.name}
              />
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pulse-muted">
              {modeDisplay.body}
            </p>
          </div>

          <button
            type="button"
            onClick={onRescan}
            disabled={isFetching || batchActive}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          label="Active approvals"
          value={totalActiveCount.toString()}
          detail={`${erc20ActiveCount} token / ${nftActiveCount} NFT`}
          tone={totalActiveCount > 0 ? "warning" : "success"}
        />
        <SummaryMetric
          label="Checked candidates"
          value={candidateCount.toString()}
          detail="Historical approvals re-read live"
          tone="neutral"
        />
        <SummaryMetric
          label="High-risk"
          value={highRiskCount.toString()}
          detail="Unlimited or broad permissions"
          tone={highRiskCount > 0 ? "error" : "success"}
        />
        <SummaryMetric
          label="Last scan"
          value={isFetching ? "Scanning" : formatCompletedAt(completedAt)}
          detail={formatElapsedMs(elapsedMs)}
          tone={isFetching ? "info" : status === "error" ? "error" : "neutral"}
        />
      </div>
    </div>
  );
}

function ScannerDataHealthStrip({
  scan,
  nft,
  chainConfig,
  scanMode,
  isConnected,
  walletMatchesScanTarget,
  walletMatchesActiveChain,
}: {
  scan: ReturnType<typeof useApprovalDiscovery>;
  nft: ReturnType<typeof useNftApprovalDiscovery>;
  chainConfig: SupportedChainConfig;
  scanMode: ScanMode;
  isConnected: boolean;
  walletMatchesScanTarget: boolean | null;
  walletMatchesActiveChain: boolean | null;
}) {
  const modeDisplay = getScannerModeDisplay({
    scanMode,
    walletConnected: isConnected,
    walletMatchesScanTarget,
    walletMatchesActiveChain,
  });
  const items: readonly {
    title: string;
    status: string;
    detail: string;
    tone: ScannerDisplayTone;
  }[] = [
    {
      title: "Wallet authority",
      status: modeDisplay.label,
      detail: modeDisplay.body,
      tone: modeDisplay.tone,
    },
    {
      title: `${chainConfig.standardLabels.fungible} indexer`,
      ...healthAsItem(
        getPipelineHealthDisplay({
          status: scan.status,
          truncated: scan.truncated,
          failureCount: 0,
          error: scan.diagnostics.discoveryError,
          successDetail: `${scan.sourceMeta?.name ?? chainConfig.discovery.name} returned approval history.`,
        }),
      ),
    },
    {
      title: `${chainConfig.standardLabels.fungible} live reads`,
      ...healthAsItem(
        getPipelineHealthDisplay({
          status: scan.status,
          truncated: false,
          failureCount: scan.diagnostics.liveReadFailureCount,
          error: scan.diagnostics.liveReadError,
          successDetail: "Allowance reads are confirming current state.",
        }),
      ),
    },
    {
      title: "NFT pipeline",
      ...healthAsItem(
        getPipelineHealthDisplay({
          status: nft.status,
          truncated: nft.truncated,
          failureCount: nft.diagnostics.liveReadFailureCount,
          error: nft.diagnostics.discoveryError ?? nft.diagnostics.liveReadError,
          successDetail: "NFT approval discovery and live reads are reporting normally.",
        }),
      ),
    },
  ];

  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Data health
          </p>
          <p className="mt-1 text-sm leading-6 text-pulse-muted">
            Live status for the scanner data paths used by this scan.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <HealthItemCard key={item.title} item={item} />
        ))}
      </div>
    </section>
  );
}

function healthAsItem(health: PipelineHealthDisplay) {
  return {
    status: health.label,
    detail: health.detail,
    tone: health.tone,
  };
}

function HealthItemCard({
  item,
}: {
  item: {
    title: string;
    status: string;
    detail: string;
    tone: ScannerDisplayTone;
  };
}) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-panel/35 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
          {item.title}
        </p>
        <span
          className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${toneDotClass(
            item.tone,
          )}`}
          aria-hidden
        />
      </div>
      <p className={`mt-2 text-sm font-semibold ${toneTextClass(item.tone)}`}>
        {item.status}
      </p>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">{item.detail}</p>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: ScannerDisplayTone;
}) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-panel/35 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${toneTextClass(tone)}`}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">{detail}</p>
    </div>
  );
}

function AddressActions({
  address,
  chainId,
  explorerLabel,
}: {
  address: Address;
  chainId: number | undefined;
  explorerLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  const copyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      if (copiedTimerRef.current !== null) {
        window.clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [address]);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={copyAddress}
        className="inline-flex min-h-7 items-center rounded-lg border border-pulse-border bg-pulse-text/5 px-2.5 py-1 text-[11px] font-semibold text-pulse-muted transition hover:bg-pulse-text/10 hover:text-pulse-text"
        aria-label={`Copy ${address}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      <a
        href={explorerAddressUrl(chainId, address)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-7 items-center rounded-lg border border-pulse-border bg-pulse-text/5 px-2.5 py-1 text-[11px] font-semibold text-pulse-muted transition hover:bg-pulse-text/10 hover:text-pulse-cyan"
      >
        {explorerLabel}
      </a>
    </span>
  );
}

function ScannerModeBadge({ display }: { display: ScannerModeDisplay }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tonePillClass(
        display.tone,
      )}`}
      title={display.body}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />
      <span className="truncate">{display.label}</span>
    </span>
  );
}

function tonePillClass(tone: ScannerDisplayTone): string {
  if (tone === "success") {
    return "border-pulse-green/35 bg-pulse-green/10 text-pulse-green";
  }
  if (tone === "warning") {
    return "border-amber-400/35 bg-amber-400/10 text-amber-200";
  }
  if (tone === "error") {
    return "border-pulse-red/40 bg-pulse-red/10 text-pulse-red";
  }
  if (tone === "info") {
    return "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan";
  }
  return "border-pulse-border bg-pulse-panel/55 text-pulse-muted";
}

function toneDotClass(tone: ScannerDisplayTone): string {
  if (tone === "success") return "bg-pulse-green";
  if (tone === "warning") return "bg-amber-300";
  if (tone === "error") return "bg-pulse-red";
  if (tone === "info") return "bg-pulse-cyan";
  return "bg-pulse-muted";
}

function toneTextClass(tone: ScannerDisplayTone): string {
  if (tone === "success") return "text-pulse-green";
  if (tone === "warning") return "text-amber-200";
  if (tone === "error") return "text-pulse-red";
  if (tone === "info") return "text-pulse-cyan";
  return "text-pulse-text";
}

function latestCompletedAt(
  left: number | null,
  right: number | null,
): number | null {
  if (left === null) return right;
  if (right === null) return left;
  return Math.max(left, right);
}

function latestElapsedMs(left: number | null, right: number | null): number | null {
  if (left === null) return right;
  if (right === null) return left;
  return Math.max(left, right);
}

function formatCompletedAt(value: number | null): string {
  if (value === null) return "Not finished";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatElapsedMs(value: number | null): string {
  if (value === null) return "Elapsed time pending";
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(1)} seconds`;
}

function NftSection({
  nft,
  owner,
  chainConfig,
  walletRevokeDisabledReason,
  debugMode,
}: {
  nft: ReturnType<typeof useNftApprovalDiscovery>;
  owner: `0x${string}`;
  chainConfig: SupportedChainConfig;
  walletRevokeDisabledReason: string | null;
  debugMode: boolean;
}) {
  const sorted = useMemo(() => sortNftApprovals(nft.approvals), [nft.approvals]);
  const highRisk = sorted.filter((a) => a.risk.level === "high").length;
  const scanRevokeDisabledReason = getScanRevokeDisabledReason({
    status: nft.status,
    failedLiveReads: nft.diagnostics.liveReadFailureCount,
    discoveryTruncated: nft.truncated,
    approvalLabel: "NFT approval",
  });
  const revokeDisabledReason =
    scanRevokeDisabledReason ?? walletRevokeDisabledReason;

  return (
    <section className="space-y-4 rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 sm:p-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pulse-muted">
            Collection permissions
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-pulse-text">
            NFT approvals
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-pulse-muted">
            Review collection-wide operator approvals and per-token{" "}
            {chainConfig.standardLabels.nft} approvals. Collection-wide
            permissions are usually the highest priority to verify.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {highRisk > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-3 py-1 text-xs font-semibold text-pulse-red">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-red"
                aria-hidden
              />
              {highRisk} high-risk
            </span>
          ) : null}
          <button
            type="button"
            onClick={nft.refetch}
            disabled={nft.isFetching}
            className="inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-pulse-text/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-pulse-text/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nft.isFetching ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </header>

      <NftSectionBody
        nft={nft}
        owner={owner}
        sorted={sorted}
        chainConfig={chainConfig}
        scanRevokeDisabledReason={scanRevokeDisabledReason}
        revokeDisabledReason={revokeDisabledReason}
        debugMode={debugMode}
      />

      <p className="text-xs text-pulse-muted">
        Collection-wide operator approvals expose every NFT in the collection.
        NFT approvals are discovered via{" "}
        {nft.sourceMeta?.name ?? chainConfig.discovery.name}
        {nft.stats.windows > 1
          ? ` (${nft.stats.windows} block-range windows)`
          : ""}{" "}
        and re-verified live on-chain before display.
        {nft.truncated
          ? " A per-wallet fetch cap was reached, so very old approvals may be missing."
          : ""}{" "}
        Per-token approvals are {chainConfig.standardLabels.nft} only;{" "}
        {chainConfig.standardLabels.multiToken} exposes the operator pattern
        exclusively.
      </p>
    </section>
  );
}

function NftSectionBody({
  nft,
  owner,
  sorted,
  chainConfig,
  scanRevokeDisabledReason,
  revokeDisabledReason,
  debugMode,
}: {
  nft: ReturnType<typeof useNftApprovalDiscovery>;
  owner: `0x${string}`;
  sorted: NftApproval[];
  chainConfig: SupportedChainConfig;
  scanRevokeDisabledReason: string | null;
  revokeDisabledReason: string | null;
  debugMode: boolean;
}) {
  if (nft.status === "pending") {
    return (
      <ScanProgressPanel
        phase={getScanPhaseDisplay({
          status: "pending",
          candidateCount: nft.stats.candidates,
          standardLabel: "NFT",
        })}
        chainName={chainConfig.displayName}
        owner={owner}
        sourceName={nft.sourceMeta?.name ?? chainConfig.discovery.name}
        candidates={nft.stats.candidates}
        windows={nft.stats.windows}
        requests={nft.stats.requests}
      />
    );
  }

  if (nft.status === "error") {
    return (
      <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-red">
          NFT scan interrupted
        </p>
        <p className="mt-2 font-semibold text-pulse-text">
          We could not finish checking NFT approvals.
        </p>
        <p className="mt-1 text-pulse-muted">
          {nft.error?.message ??
            `Something went wrong reading NFT approvals from ${chainConfig.displayName}.`}
        </p>
        <button
          type="button"
          onClick={nft.refetch}
          className="mt-3 inline-flex items-center rounded-lg border border-pulse-red/40 bg-pulse-red/20 px-3 py-1.5 text-xs font-semibold text-pulse-red hover:bg-pulse-red/30"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sorted.length === 0) {
    if (scanRevokeDisabledReason) {
      return (
        <NftVerificationIncompleteState
          reason={scanRevokeDisabledReason}
          failedLiveReads={nft.diagnostics.liveReadFailureCount}
          discoveryTruncated={nft.truncated}
          explorerName={chainConfig.explorer.name}
        />
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/40 p-6 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-green">
          Clear for now
        </p>
        <p className="mt-2 text-lg font-semibold text-pulse-text">
          No active NFT approvals
        </p>
        <p className="mt-1 max-w-2xl leading-6 text-pulse-muted">
          {nft.stats.candidates === 0
            ? `We couldn't find any NFT approval history for this wallet on ${
                nft.sourceMeta?.name ?? chainConfig.discovery.name
              }.`
            : `${nft.stats.candidates} historical NFT approval${
                nft.stats.candidates === 1 ? "" : "s"
              } were checked on ${chainConfig.displayName}, but none are still active on-chain.`}
          {nft.truncated
            ? " A per-wallet fetch cap was reached; very old approvals may be missing."
            : ""}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {revokeDisabledReason ? (
        <ScanRevokeDisabledWarning reason={revokeDisabledReason} />
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
        <div className="hidden grid-cols-[1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
          <div>Collection</div>
          <div>Operator</div>
          <div>Permission / Risk</div>
          <div className="text-right">Action</div>
        </div>
        <ul>
          {sorted.map((approval) => (
            <NftApprovalRow
              key={approval.key}
              approval={approval}
              ownerAddress={owner}
              onRevoked={nft.refetch}
              revokeDisabledReason={revokeDisabledReason}
              debugMode={debugMode}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function riskRankNft(level: NftApproval["risk"]["level"]): number {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function sortNftApprovals(approvals: readonly NftApproval[]): NftApproval[] {
  return [...approvals].sort((a, b) => {
    const rank = riskRankNft(b.risk.level) - riskRankNft(a.risk.level);
    if (rank !== 0) return rank;
    if (a.kind !== b.kind) return a.kind === "approvalForAll" ? -1 : 1;
    const coll =
      (a.collectionName ?? a.collectionAddress).localeCompare(
        b.collectionName ?? b.collectionAddress,
      );
    if (coll !== 0) return coll;
    return a.operatorLabel.localeCompare(b.operatorLabel);
  });
}

function CoverageNote({
  scan,
  chainConfig,
}: {
  scan: ReturnType<typeof useApprovalDiscovery>;
  chainConfig: SupportedChainConfig;
}) {
  return (
    <p className="text-xs text-pulse-muted">
      Approvals are discovered from your wallet&rsquo;s historical{" "}
      {chainConfig.standardLabels.fungible} Approval events via{" "}
      {scan.sourceMeta?.name ?? chainConfig.discovery.name}
      {scan.stats.windows > 1
        ? ` (${scan.stats.windows} block-range windows)`
        : ""}{" "}
      and re-verified live on-chain before display.
      {scan.truncated
        ? ` A per-wallet fetch cap was reached, so very old approvals may be missing. Verify directly on ${chainConfig.explorer.name} if you suspect a legacy approval.`
        : ""}{" "}
      Protocol labels and trust badges come from the curated registry; unknown
      spenders stay unverified.
    </p>
  );
}

function ScanContent({
  scan,
  owner,
  chainConfig,
  scored,
  visibleApprovals,
  query,
  sort,
  filter,
  onQueryChange,
  onSortChange,
  onFilterChange,
  selected,
  onToggleSelect,
  onClearSelection,
  onToggleSelectAllVisible,
  allVisibleSelected,
  selectedHighRisk,
  selectedUnlimited,
  onReviewBatch,
  batch,
  revokeDisabledReason,
  debugMode,
}: {
  scan: ReturnType<typeof useApprovalDiscovery>;
  owner: `0x${string}`;
  chainConfig: SupportedChainConfig;
  scored: readonly ScoredApproval[];
  visibleApprovals: readonly ScoredApproval[];
  query: string;
  sort: ApprovalSort;
  filter: ApprovalFilter;
  onQueryChange: (v: string) => void;
  onSortChange: (v: ApprovalSort) => void;
  onFilterChange: (v: ApprovalFilter) => void;
  selected: Set<string>;
  onToggleSelect: (key: string) => void;
  onClearSelection: () => void;
  onToggleSelectAllVisible: () => void;
  allVisibleSelected: boolean;
  selectedHighRisk: number;
  selectedUnlimited: number;
  onReviewBatch: () => void;
  batch: ReturnType<typeof useBatchRevoke>;
  revokeDisabledReason: string | null;
  debugMode: boolean;
}) {
  const tokenLogoAddresses = useMemo(
    () => visibleApprovals.map((approval) => approval.tokenAddress),
    [visibleApprovals],
  );
  const tokenLogos = useTokenLogos({
    chainId: chainConfig.chainId,
    tokenAddresses: tokenLogoAddresses,
  });
  const batchActive = batch.state === "running" || batch.state === "stopping";
  const batchInteracting = batch.state !== "idle";
  const failedLiveReads = scan.diagnostics.liveReadFailureCount;
  const failedAllowanceReads = scan.diagnostics.liveReadFailures.allowance;
  const resultState = getErc20ResultState({
    activeApprovals: scored.length,
    failedAllowanceReads: failedLiveReads,
    discoveredPairs: scan.stats.candidates,
    discoveryTruncated: scan.truncated,
  });
  if (scan.status === "pending") {
    return (
      <ScannerSkeleton
        candidates={scan.stats.candidates}
        standardLabel={chainConfig.standardLabels.fungible}
        chainName={chainConfig.displayName}
        owner={owner}
        sourceName={scan.sourceMeta?.name ?? chainConfig.discovery.name}
        windows={scan.stats.windows}
        requests={scan.stats.requests}
      />
    );
  }

  if (scan.status === "error") {
    return (
      <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-5 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-red">
          Scan interrupted
        </p>
        <p className="mt-2 font-semibold text-pulse-text">
          We could not finish reading approval history.
        </p>
        <p className="mt-1 leading-6 text-pulse-muted">
          {scan.error?.message ??
            `Something went wrong reading allowances from ${chainConfig.displayName}.`}
        </p>
        <p className="mt-2 text-xs text-pulse-muted">
          This is a read-only step. Try again, switch RPC/explorer settings, or
          verify directly on {chainConfig.explorer.name} if the explorer is
          rate-limited.
        </p>
        <button
          type="button"
          onClick={scan.refetch}
          className="mt-3 inline-flex items-center rounded-lg border border-pulse-red/40 bg-pulse-red/20 px-3 py-1.5 text-xs font-semibold text-pulse-red hover:bg-pulse-red/30"
        >
          Retry
        </button>
      </div>
    );
  }

  if (resultState === "verification-incomplete") {
    return (
      <VerificationIncompleteState
        failedLiveReads={failedLiveReads}
        failedAllowanceReads={failedAllowanceReads}
        discoveryTruncated={scan.truncated}
        explorerName={chainConfig.explorer.name}
        standardLabel={chainConfig.standardLabels.fungible}
      />
    );
  }

  if (resultState === "clear" || resultState === "no-history") {
    const noHistory = resultState === "no-history";
    return (
      <div className="rounded-2xl border border-dashed border-pulse-border/80 bg-pulse-bg/45 p-6 text-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-green">
          {noHistory ? "No history found" : "Clear for now"}
        </p>
        <p className="mt-2 text-lg font-semibold text-pulse-text">
          {noHistory
            ? `No ${chainConfig.standardLabels.fungible} approval history found`
            : `No active ${chainConfig.standardLabels.fungible} approvals found`}
        </p>
        <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
          {noHistory
            ? `We couldn't find any fungible token approval history for this wallet on ${
                scan.sourceMeta?.name ?? chainConfig.discovery.name
              }. If you expect an approval is in place, verify directly on ${chainConfig.explorer.name}.`
            : `${scan.stats.candidates} historical approval${
                scan.stats.candidates === 1 ? "" : "s"
              } were checked on ${chainConfig.displayName}, but none currently hold a non-zero allowance on-chain.`}
          {scan.truncated
            ? " A per-wallet fetch cap was reached; very old approvals may be missing."
            : ""}
        </p>
        <div className="mt-4 grid gap-2 text-xs text-pulse-muted sm:grid-cols-3">
          <EmptyStateStep title="Check the network" body={chainConfig.displayName} />
          <EmptyStateStep title="Rescan later" body="Explorer APIs can lag." />
          <EmptyStateStep title="Verify labels" body="Use the explorer for anything suspicious." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GuidancePanel />

      {revokeDisabledReason ? (
        <ScanRevokeDisabledWarning reason={revokeDisabledReason} />
      ) : failedAllowanceReads > 0 ? (
        <AllowanceReadWarning
          count={failedAllowanceReads}
          explorerName={chainConfig.explorer.name}
        />
      ) : null}

      <ApprovalFilters
        query={query}
        onQueryChange={onQueryChange}
        sort={sort}
        onSortChange={onSortChange}
        filter={filter}
        onFilterChange={onFilterChange}
        count={visibleApprovals.length}
        candidateCount={scan.stats.candidates}
        disabled={scan.isFetching || batchInteracting}
      />

      <BatchActionBar
        selectedCount={selected.size}
        visibleCount={visibleApprovals.length}
        allVisibleSelected={allVisibleSelected}
        highRiskSelected={selectedHighRisk}
        unlimitedSelected={selectedUnlimited}
        onSelectAllVisible={onToggleSelectAllVisible}
        onClear={onClearSelection}
        onReview={onReviewBatch}
        disabled={batchInteracting || Boolean(revokeDisabledReason)}
      />

      <BatchRevokePanel batch={batch} />

      {visibleApprovals.length === 0 ? (
        <div className="rounded-2xl border border-pulse-border bg-pulse-bg/40 p-6 text-sm text-pulse-muted">
          No approvals match your filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-pulse-border bg-pulse-bg/40">
          <div className="hidden grid-cols-[auto_1.2fr_1.5fr_1fr_auto] gap-4 border-b border-pulse-border bg-pulse-bg/60 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-pulse-muted sm:grid">
            <div aria-hidden />
            <div>Token</div>
            <div>Spender</div>
            <div>Exposure / Risk</div>
            <div className="text-right">Action</div>
          </div>
          <ul>
            {visibleApprovals.map((approval) => (
              <ApprovalRow
                key={approval.key}
                approval={approval}
                tokenLogoUrl={
                  tokenLogos.logos[tokenLogoAddressKey(approval.tokenAddress)]
                    ?.imageUrl
                }
                ownerAddress={owner}
                onRevoked={scan.refetch}
                selected={selected.has(approval.key)}
                onToggleSelect={onToggleSelect}
                selectionDisabled={batchInteracting || Boolean(revokeDisabledReason)}
                batchActive={batchActive}
                batchResult={batch.results[approval.key]}
                revokeDisabledReason={revokeDisabledReason}
                debugMode={debugMode}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function GuidancePanel() {
  return (
    <div className="rounded-2xl border border-pulse-border/70 bg-pulse-bg/50 p-4 text-xs text-pulse-muted">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-pulse-text">
        How to read this scan
      </p>
      <ul className="grid gap-2 sm:grid-cols-3">
        <li>
          <span className="font-semibold text-pulse-text">Unlimited first.</span>{" "}
          Unlimited allowances expose your full token balance if the spender is
          ever compromised. Revoke or reduce when not actively used.
        </li>
        <li>
          <span className="font-semibold text-pulse-text">Unknown spenders.</span>{" "}
          Spenders outside the verified registry deserve extra caution. Confirm
          the address on the block explorer before leaving an approval in place.
        </li>
        <li>
          <span className="font-semibold text-pulse-text">Known is not risk-free.</span>{" "}
          Registry labels identify known addresses. You should still
          review every spender before signing a revoke or leaving access open.
        </li>
      </ul>
    </div>
  );
}

function AllowanceReadWarning({
  count,
  explorerName,
}: {
  count: number;
  explorerName: string;
}) {
  return (
    <div className="rounded-2xl border border-pulse-red/40 bg-pulse-red/10 p-4 text-sm text-pulse-text">
      <p className="font-semibold text-pulse-red">
        {count} allowance read{count === 1 ? "" : "s"} could not be verified live.
      </p>
      <p className="mt-1 leading-6 text-pulse-muted">
        Failed allowance reads are kept separate from confirmed results. Rescan
        with a healthier RPC, or verify the affected token/spender pairs
        directly on {explorerName}.
      </p>
    </div>
  );
}

function ScanRevokeDisabledWarning({ reason }: { reason: string }) {
  const notice = getRevokeDisabledNoticeCopy(reason);
  if (!notice) return null;

  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm">
      <p className="font-semibold text-amber-200">{notice.title}</p>
      <p className="mt-1 leading-6 text-pulse-muted">{notice.body}</p>
      {notice.detail ? (
        <p className="mt-2 font-mono text-xs text-amber-100">
          Technical detail: {notice.detail}
        </p>
      ) : null}
    </div>
  );
}

function NftVerificationIncompleteState({
  reason,
  failedLiveReads,
  discoveryTruncated,
  explorerName,
}: {
  reason: string;
  failedLiveReads: number;
  discoveryTruncated: boolean;
  explorerName: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-400/45 bg-amber-400/10 p-6 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
        Verification incomplete
      </p>
      <p className="mt-2 text-lg font-semibold text-pulse-text">
        Current NFT approval state could not be fully confirmed.
      </p>
      <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
        Pulse Revoke found approval history, but some live contract reads failed
        or discovery did not finish. NFT revoke actions stay disabled because
        the app could not confirm whether the approval is active right now.
      </p>
      <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
        Try rescanning. If the message remains, the NFT contract may be
        nonstandard, temporarily unavailable, or failing live approval reads.
        Technical detail: {reason} Verify directly on {explorerName} when you
        need another source.
      </p>
      <div className="mt-4 grid gap-2 text-xs text-pulse-muted sm:grid-cols-3">
        <EmptyStateStep
          title={discoveryTruncated ? "Discovery truncated" : "Live reads failed"}
          body={
            discoveryTruncated
              ? "History may be incomplete"
              : `${failedLiveReads} unverified`
          }
        />
        <EmptyStateStep
          title="Current state unknown"
          body="Revoke disabled until verified."
        />
        <EmptyStateStep title="Next step" body={`Retry or check ${explorerName}.`} />
      </div>
    </div>
  );
}

function VerificationIncompleteState({
  failedLiveReads,
  failedAllowanceReads,
  discoveryTruncated,
  explorerName,
  standardLabel,
}: {
  failedLiveReads: number;
  failedAllowanceReads: number;
  discoveryTruncated: boolean;
  explorerName: string;
  standardLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-400/45 bg-amber-400/10 p-6 text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
        Verification incomplete
      </p>
      <p className="mt-2 text-lg font-semibold text-pulse-text">
        Current {standardLabel} approval state could not be fully confirmed.
      </p>
      <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
        {discoveryTruncated
          ? "Discovery hit a per-wallet fetch cap before every current approval state could be confirmed."
          : "Pulse Revoke found approval history, but some live contract reads failed."}{" "}
        Revoke stays disabled because the app could not confirm whether the
        approval is active right now.
      </p>
      <p className="mt-2 max-w-2xl leading-6 text-pulse-muted">
        Try rescanning. If the message remains, the token contract may be
        nonstandard, temporarily unavailable, or failing live approval reads.
        Verify the affected token/spender pairs directly on {explorerName} when
        you need another source.
      </p>
      {failedAllowanceReads > 0 ? (
        <div className="mt-4">
          <AllowanceReadWarning
            count={failedAllowanceReads}
            explorerName={explorerName}
          />
        </div>
      ) : null}
      <div className="mt-4 grid gap-2 text-xs text-pulse-muted sm:grid-cols-3">
        <EmptyStateStep
          title={discoveryTruncated ? "Discovery truncated" : "Live reads failed"}
          body={
            discoveryTruncated
              ? "History may be incomplete"
              : `${failedLiveReads} unverified`
          }
        />
        <EmptyStateStep
          title="Current state unknown"
          body="Revoke disabled until verified."
        />
        <EmptyStateStep title="Next step" body={`Retry RPC or check ${explorerName}.`} />
      </div>
    </div>
  );
}

function EmptyStateStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-pulse-border/70 bg-pulse-panel/55 p-3">
      <p className="font-semibold text-pulse-text">{title}</p>
      <p className="mt-1 text-pulse-muted">{body}</p>
    </div>
  );
}

function ScannerSkeleton({
  candidates,
  standardLabel,
  chainName,
  owner,
  sourceName,
  windows,
  requests,
}: {
  candidates: number;
  standardLabel: string;
  chainName: string;
  owner: Address;
  sourceName: string;
  windows: number;
  requests: number;
}) {
  const phase = getScanPhaseDisplay({
    status: "pending",
    candidateCount: candidates,
    standardLabel,
  });

  return (
    <div className="space-y-4">
      <ScanProgressPanel
        phase={phase}
        chainName={chainName}
        owner={owner}
        sourceName={sourceName}
        candidates={candidates}
        windows={windows}
        requests={requests}
      />
      <div className="overflow-hidden rounded-2xl border border-pulse-border">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="grid grid-cols-1 items-center gap-3 border-b border-pulse-border/60 px-4 py-4 last:border-b-0 sm:grid-cols-[1.2fr_1.5fr_1fr_auto] sm:gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-pulse-panel2" />
              <div className="h-3 w-24 animate-pulse rounded bg-pulse-panel2" />
            </div>
            <div className="h-3 w-40 animate-pulse rounded bg-pulse-panel2" />
            <div className="h-3 w-20 animate-pulse rounded bg-pulse-panel2" />
            <div className="h-8 w-20 animate-pulse rounded bg-pulse-panel2 justify-self-end" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScanProgressPanel({
  phase,
  chainName,
  owner,
  sourceName,
  candidates,
  windows,
  requests,
}: {
  phase: PipelineHealthDisplay;
  chainName: string;
  owner: Address;
  sourceName: string;
  candidates: number;
  windows: number;
  requests: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan"
            aria-hidden
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Scan in progress
            </p>
            <p className="mt-1 text-base font-semibold text-pulse-text">
              {phase.label}
            </p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-pulse-muted">
              {phase.detail}
            </p>
            <p className="mt-1 text-xs leading-5 text-pulse-muted/85">
              This is read-only work. Wallet transactions are requested only
              after you choose an approval and confirm it.
            </p>
          </div>
        </div>
        <div className="grid gap-1.5 rounded-xl border border-pulse-border/70 bg-pulse-bg/55 p-3 text-xs text-pulse-muted sm:min-w-56">
          <ProgressRow label="Chain" value={chainName} />
          <ProgressRow label="Target" value={shortenAddress(owner)} />
          <ProgressRow label="Source" value={sourceName} />
        </div>
      </div>
      <div className="grid gap-2 border-t border-pulse-border/70 bg-pulse-bg/35 p-3 text-xs sm:grid-cols-3">
        <ProgressMetric label="Candidates" value={candidates.toString()} />
        <ProgressMetric label="Windows" value={windows.toString()} />
        <ProgressMetric label="Requests" value={requests.toString()} />
      </div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span>{label}</span>
      <span className="break-words text-right font-mono text-pulse-text">
        {value}
      </span>
    </div>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-pulse-border/60 bg-pulse-panel/40 p-3">
      <p className="font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </p>
      <p className="mt-1 font-mono text-lg text-pulse-text">{value}</p>
    </div>
  );
}

function ScannerState({
  eyebrow,
  title,
  body,
  action,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  body: string;
  action: React.ReactNode;
  tone?: "neutral" | "warning";
}) {
  const eyebrowClass =
    tone === "warning" ? "text-pulse-red" : "text-pulse-muted";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
      <div className="flex flex-col items-start gap-4 text-left">
        <span
          className={`text-xs font-semibold uppercase tracking-[0.18em] ${eyebrowClass}`}
        >
          {eyebrow}
        </span>
        <h3 className="max-w-xl text-2xl font-semibold text-pulse-text sm:text-3xl">
          {title}
        </h3>
        <p className="max-w-xl leading-6 text-pulse-muted">{body}</p>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="rounded-2xl border border-pulse-border bg-pulse-bg/50 p-4 text-xs text-pulse-muted">
        <p className="font-semibold uppercase tracking-[0.16em] text-pulse-text">
          Safety posture
        </p>
        <ul className="mt-3 space-y-2">
          <li>No private keys or seed phrases.</li>
          <li>Reads are public wallet and chain data.</li>
          <li>Write requests happen only after you click revoke.</li>
        </ul>
      </div>
    </div>
  );
}
