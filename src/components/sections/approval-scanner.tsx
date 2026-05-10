"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import type { Address } from "viem";

import { ApprovalFilters } from "@/components/approvals/approval-filters";
import { ApprovalRow } from "@/components/approvals/approval-row";
import {
  BatchActionBar,
  BatchRevokePanel,
} from "@/components/approvals/batch-revoke-panel";
import { EthereumReadOnlyScanner } from "@/components/sections/ethereum-readonly-scanner";
import { NftApprovalRow } from "@/components/approvals/nft-approval-row";
import { ConnectWalletButton } from "@/components/connect-wallet-button";
import { ScannerDiagnosticsPanel } from "@/components/sections/scanner-diagnostics";
import { useApprovalDiscovery } from "@/hooks/use-approval-discovery";
import { useBatchRevoke } from "@/hooks/use-batch-revoke";
import { useNftApprovalDiscovery } from "@/hooks/use-nft-approval-discovery";
import { resolveActiveChain, scannerSessionKey } from "@/lib/active-chain";
import {
  addressOnlyScanOptions,
  getAddressOnlyActiveScanChainIds,
  getAddressOnlyScanOption,
  getSupportedAddressOnlyChainConfig,
  resolveDefaultAddressOnlyScanChainId,
  type AddressOnlyScanChainId,
} from "@/lib/address-only-scan";
import {
  getSupportedChainShortNames,
  type SupportedChainConfig,
} from "@/lib/chains";
import {
  ETHEREUM_MAINNET_CLIENT_CHAIN_ID,
  resolveEthereumReadOnlyChainId,
} from "@/lib/ethereum-approval-client";
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

/**
 * Connected-wallet approval scanner (PulseChain + BSC + Base).
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
  const activeChain = resolveActiveChain({
    isConnected,
    walletChainId,
    wagmiChainId,
  });
  const debugMode = useDebugModeFromQuery();
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
  const statusCopy = activeAddress
    ? scanTarget.isConnectedWalletSameAsScanTarget
      ? "Connected wallet matches scanned address."
      : scanTarget.connectedWalletAddress
        ? WALLET_MISMATCH_SCAN_TARGET_COPY
        : ADDRESS_SCAN_CONNECT_MATCHING_WALLET_COPY
    : "Connected-wallet mode is used when no pasted address is active.";

  return (
    <div className="mb-6 rounded-2xl border border-pulse-cyan/25 bg-pulse-cyan/5 p-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
            Scan first. Connect only when ready to revoke.
          </p>
          <p className="mt-2 text-sm leading-6 text-pulse-muted">
            Paste any EVM wallet address to inspect public approvals without
            connecting. Connecting is only required when you choose to revoke.
          </p>
          <p className="mt-1 text-xs leading-5 text-pulse-muted">
            Revoke is available only when the connected wallet matches the
            scanned address.
          </p>
        </div>
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
            className="min-h-10 rounded-xl border border-pulse-border bg-pulse-bg/80 px-3 py-2 font-mono text-sm text-pulse-text outline-none transition placeholder:text-pulse-muted/60 focus:border-pulse-cyan/60"
          />
          <button
            type="submit"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15"
          >
            Scan address
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!hasInput && !activeAddress}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-muted transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </form>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full border px-2.5 py-1 font-semibold ${
            activeAddress
              ? scanTarget.isConnectedWalletSameAsScanTarget
                ? "border-pulse-green/35 bg-pulse-green/10 text-pulse-green"
                : "border-amber-400/35 bg-amber-400/10 text-amber-200"
              : "border-pulse-border bg-pulse-bg/60 text-pulse-muted"
          }`}
        >
          {statusCopy}
        </span>
        {activeAddress ? (
          <span className="rounded-full border border-pulse-border bg-pulse-bg/60 px-2.5 py-1 font-mono text-pulse-muted">
            Scanning {shortenAddress(activeAddress)}
          </span>
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
          title="Connect to review live approvals"
          body="The scan reads public wallet history and on-chain state. It does not move funds, request signatures, or send transactions."
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

  if (!onSupportedChain || !chainConfig) {
    const names = getSupportedChainShortNames();
    return (
      <div className="space-y-5">
        <ScannerState
          tone="warning"
          eyebrow="Unsupported network"
          title={`Switch to ${names}`}
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
  debugMode,
}: {
  owner: Address;
  connectedAddress: Address | undefined;
  walletChainId: number | undefined;
  wagmiChainId: number | undefined;
  debugMode: boolean;
}) {
  const walletMatchesOwner = addressesEqual(connectedAddress, owner);
  const walletMatchesScanTarget = connectedAddress ? walletMatchesOwner : null;
  const scanMode: ScanMode = walletMatchesOwner
    ? "connected-wallet-matches-scanned-address"
    : "address-only";
  const defaultChainId = useMemo(
    () =>
      resolveDefaultAddressOnlyScanChainId({
        walletChainId,
        wagmiChainId,
      }),
    [walletChainId, wagmiChainId],
  );
  const [selectedChainId, setSelectedChainId] =
    useState<AddressOnlyScanChainId>(defaultChainId);
  const [userSelectedChain, setUserSelectedChain] = useState(false);
  const [scanAllStarted, setScanAllStarted] = useState(false);
  const [scanAllIndex, setScanAllIndex] = useState(0);
  const previousOwnerRef = useRef(owner);

  useEffect(() => {
    if (previousOwnerRef.current === owner) return;
    previousOwnerRef.current = owner;
    setSelectedChainId(defaultChainId);
    setUserSelectedChain(false);
    setScanAllStarted(false);
    setScanAllIndex(0);
  }, [defaultChainId, owner]);

  useEffect(() => {
    if (!userSelectedChain && !scanAllStarted) {
      setSelectedChainId(defaultChainId);
    }
  }, [defaultChainId, scanAllStarted, userSelectedChain]);

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

  const selectChain = useCallback((chainId: AddressOnlyScanChainId) => {
    setSelectedChainId(chainId);
    setUserSelectedChain(true);
    setScanAllStarted(false);
    setScanAllIndex(0);
  }, []);

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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
          Address-only scan
        </p>
        <p className="mt-2 leading-6 text-pulse-muted">
          Approvals are public blockchain state. You do not need to connect a
          wallet to scan. Revoke buttons stay disabled until the connected
          wallet exactly matches the scanned address and the row chain.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-pulse-muted">
            {shortenAddress(owner)}
          </span>
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
              className={`inline-flex min-h-9 items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-pulse-green/40 bg-pulse-green/10 text-pulse-green"
                  : "border-pulse-border bg-white/5 text-pulse-muted hover:bg-white/10"
              }`}
              aria-pressed={selected}
            >
              {option.shortName}
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
        activeCount={scan.stats.active}
        candidateCount={scan.stats.candidates}
        highRiskCount={highRiskCount}
        status={scan.status}
        isFetching={scan.isFetching}
        incomplete={Boolean(scanRevokeDisabledReason)}
        batchActive={batchActive}
        onRescan={scan.refetch}
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
  activeCount,
  candidateCount,
  highRiskCount,
  status,
  isFetching,
  incomplete,
  batchActive,
  onRescan,
}: {
  owner: `0x${string}`;
  chainConfig: SupportedChainConfig;
  activeCount: number;
  candidateCount: number;
  highRiskCount: number;
  status: ReturnType<typeof useApprovalDiscovery>["status"];
  isFetching: boolean;
  incomplete: boolean;
  batchActive: boolean;
  onRescan: () => void;
}) {
  const summary =
    incomplete
      ? activeCount > 0
        ? `${activeCount} active / verification incomplete`
        : "Verification incomplete"
      : candidateCount > 0
      ? `${activeCount} active / ${candidateCount} checked`
      : status === "pending"
      ? "Searching wallet history"
      : `No active ${chainConfig.standardLabels.fungible} approvals`;

  return (
    <div className="rounded-2xl border border-pulse-border bg-pulse-bg/55 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-pulse-green/30 bg-pulse-green/10 px-3 py-1 text-xs font-semibold text-pulse-green">
            <span
              className="h-1.5 w-1.5 rounded-full bg-pulse-green"
              aria-hidden
            />
            {chainConfig.displayName}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 font-mono text-xs text-pulse-muted">
            {shortenAddress(owner)}
          </span>
          <span className="rounded-full border border-pulse-border bg-pulse-panel/70 px-3 py-1 text-xs font-medium text-pulse-muted">
            {summary}
          </span>
          {highRiskCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-pulse-red/40 bg-pulse-red/10 px-3 py-1 text-xs font-semibold text-pulse-red">
              <span
                className="h-1.5 w-1.5 rounded-full bg-pulse-red"
                aria-hidden
              />
              {highRiskCount} high-risk
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onRescan}
            disabled={isFetching || batchActive}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-pulse-cyan/35 bg-pulse-cyan/10 px-3 py-2 text-xs font-semibold text-pulse-cyan transition hover:bg-pulse-cyan/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? "Scanning..." : "Rescan"}
          </button>
        </div>
      </div>
    </div>
  );
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
            className="inline-flex items-center gap-2 rounded-xl border border-pulse-border bg-white/5 px-3 py-2 text-xs font-semibold text-pulse-text transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
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
      <div className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4 text-xs text-pulse-muted">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan" />{" "}
        {nft.stats.candidates > 0
          ? `Verifying ${nft.stats.candidates} NFT approval candidate${
              nft.stats.candidates === 1 ? "" : "s"
            } live on-chain...`
          : "Searching NFT approval history..."}
      </div>
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
        Revoke.PLS found approval history, but some live contract reads failed
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
          : "Revoke.PLS found approval history, but some live contract reads failed."}{" "}
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
}: {
  candidates: number;
  standardLabel: string;
}) {
  const status =
    candidates > 0
      ? `Re-validating ${candidates} historical approval candidate${
          candidates === 1 ? "" : "s"
        } with live on-chain reads.`
      : `Searching explorer logs for ${standardLabel} approval history.`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-pulse-cyan/30 bg-pulse-cyan/5 p-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-pulse-cyan"
            aria-hidden
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-cyan">
              Scan in progress
            </p>
            <p className="mt-1 text-sm text-pulse-muted">{status}</p>
            <p className="mt-1 text-xs text-pulse-muted/80">
              This step is read-only. Revoke transactions are requested only
              after you choose an approval and confirm it.
            </p>
          </div>
        </div>
      </div>
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
