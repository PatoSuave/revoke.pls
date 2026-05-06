import type { ApprovalPreflightResult } from "@/lib/preflight";
import {
  ETHEREUM_GAS_PAID_TO_NETWORK_COPY,
  WALLET_ESTIMATE_MAY_DIFFER_COPY,
  WALLET_HIGHER_FEE_CANCEL_COPY,
  formatGasAmount,
  formatNativeFee,
  gasWarningBody,
  gasWarningTitle,
  requiresGasWarningAcknowledgement,
} from "@/lib/revoke-gas";

export function GasEstimateDetails({
  preflight,
  chainName,
  nativeSymbol,
}: {
  preflight: ApprovalPreflightResult | null;
  chainName: string;
  nativeSymbol?: string;
}) {
  if (!preflight) return null;

  const symbol = preflight.nativeSymbol ?? nativeSymbol;

  if (!preflight.estimatedGas) {
    return (
      <span className="text-pulse-muted">
        Gas estimate unavailable. Your wallet will estimate gas before signing,
        and the wallet estimate may differ.
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="font-mono text-[11px] text-pulse-muted">
        Estimated gas units: {formatGasAmount(preflight.estimatedGas)}
      </span>
      <span className="font-mono text-[11px] text-pulse-muted">
        Estimated network fee:{" "}
        {preflight.estimatedFeeWei !== undefined && symbol
          ? formatNativeFee(preflight.estimatedFeeWei, symbol)
          : symbol
            ? `Unavailable in ${symbol}`
            : "Unavailable"}
      </span>
      <span className="text-pulse-muted">
        {WALLET_ESTIMATE_MAY_DIFFER_COPY}{" "}
        {chainName === "Ethereum Mainnet"
          ? WALLET_HIGHER_FEE_CANCEL_COPY
          : "If your wallet shows an unreasonable fee, cancel."}
      </span>
    </span>
  );
}

export function GasWarningDetails({
  preflight,
  chainName,
}: {
  preflight: ApprovalPreflightResult;
  chainName: string;
}) {
  return (
    <>
      <span className="font-semibold text-pulse-text">
        {gasWarningTitle(preflight.gasWarningLevel)}
      </span>
      <span>{gasWarningBody({ level: preflight.gasWarningLevel, chainName })}</span>
      <GasEstimateDetails preflight={preflight} chainName={chainName} />
      {requiresGasWarningAcknowledgement(preflight.gasWarningLevel) ? (
        <span>
          This gas level requires an additional acknowledgement before the
          wallet prompt can open.
        </span>
      ) : null}
    </>
  );
}

export function EthereumGasDisclosure() {
  return (
    <>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        {ETHEREUM_GAS_PAID_TO_NETWORK_COPY}
      </p>
      <p className="mt-1 text-xs leading-5 text-pulse-muted">
        {WALLET_HIGHER_FEE_CANCEL_COPY}
      </p>
    </>
  );
}

export function GasEstimateDebugDetails({
  enabled,
  preflight,
}: {
  enabled: boolean;
  preflight: ApprovalPreflightResult | null;
}) {
  if (!enabled || !preflight) return null;

  const attempted =
    preflight.gasEstimateAttempted === undefined
      ? "No"
      : preflight.gasEstimateAttempted
        ? "Yes"
        : "No";
  const succeeded =
    preflight.gasEstimateSucceeded === undefined
      ? "Not attempted"
      : preflight.gasEstimateSucceeded
        ? "Yes"
        : "No";

  return (
    <div className="mt-2 rounded-lg border border-pulse-cyan/25 bg-pulse-cyan/5 p-2 text-left text-[11px] leading-5 text-pulse-muted">
      <p className="font-semibold uppercase tracking-[0.14em] text-pulse-cyan">
        Gas estimate diagnostics
      </p>
      <dl className="mt-1 grid gap-1">
        <DebugRow label="Attempted" value={attempted} />
        <DebugRow label="Succeeded" value={succeeded} />
        <DebugRow
          label="Estimated gas"
          value={
            preflight.estimatedGas
              ? formatGasAmount(preflight.estimatedGas)
              : "Unavailable"
          }
        />
        <DebugRow
          label="Warning level"
          value={preflight.gasWarningLevel ?? "unavailable"}
        />
        <DebugRow
          label="Failure reason"
          value={preflight.gasEstimateError ?? "None"}
        />
      </dl>
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[1fr_1.3fr]">
      <dt>{label}</dt>
      <dd className="break-words font-mono text-pulse-text">{value}</dd>
    </div>
  );
}
