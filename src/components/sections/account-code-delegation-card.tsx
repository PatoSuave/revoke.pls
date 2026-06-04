"use client";

import type { Address } from "viem";

import { useLifeboatEip7702Scan } from "@/hooks/use-lifeboat-eip7702-scan";
import type { LifeboatEip7702ApiResponse } from "@/lib/lifeboat/eip7702";

export function AccountCodeDelegationCard({
  owner,
  chainId,
  chainName,
}: {
  owner: Address;
  chainId: number;
  chainName: string;
}) {
  const { response, status, isFetching, refetch } = useLifeboatEip7702Scan({
    owner,
    chainId,
    chainName,
    enabled: true,
  });
  const display = accountCodeDisplay(response, isFetching || status === "pending");

  return (
    <section
      className={`rounded-2xl border p-4 text-sm ${display.className}`}
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">
            Account code / delegation
          </p>
          <h3 className="mt-1 text-base font-semibold text-pulse-text">
            {display.title}
          </h3>
          <p className="mt-2 max-w-3xl leading-6 text-pulse-muted">
            {display.body}
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={isFetching}
          className="inline-flex min-h-9 items-center justify-center rounded-xl border border-current/30 bg-pulse-bg/35 px-3 py-1.5 text-xs font-semibold transition hover:bg-pulse-bg/55 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isFetching ? "Checking..." : "Recheck"}
        </button>
      </div>
      {display.detail ? (
        <p className="mt-3 rounded-xl border border-current/15 bg-pulse-bg/35 p-3 font-mono text-xs leading-5 text-pulse-text">
          {display.detail}
        </p>
      ) : null}
    </section>
  );
}

function accountCodeDisplay(
  response: LifeboatEip7702ApiResponse,
  scanning: boolean,
): {
  title: string;
  body: string;
  detail?: string;
  className: string;
} {
  if (scanning || response.status === "scanning" || response.status === "idle") {
    return {
      title: "Checking account code",
      body: "Pulse Revoke is reading latest account code for this address without connecting a wallet or requesting a transaction.",
      className: "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan",
    };
  }

  if (response.status === "unsupported") {
    return {
      title: "Account-code check not available",
      body: "This network is not currently checked for account-code delegation in the main scanner. Do not treat this as a complete account authorization review.",
      className: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    };
  }

  if (response.status !== "complete") {
    return {
      title: "Account-code check incomplete",
      body: "The delegation check could not be completed. This scan cannot rule out account-code or delegation risk.",
      className: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    };
  }

  const evidence = response.evidence[0];
  if (!evidence || response.summary.classification === "empty") {
    return {
      title: "No delegation detected",
      body: "No account code or EIP-7702 delegation was detected by the latest RPC check. This does not review signatures, session keys, or off-chain authorization risk.",
      className: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
    };
  }

  if (evidence.classification === "eip7702_delegation") {
    return {
      title: "Active EOA delegation",
      body: "This wallet appears to have EIP-7702 delegation active. Revoking token approvals does not remove delegated account code.",
      detail: evidence.delegationAddress
        ? `Delegate: ${evidence.delegationAddress}`
        : undefined,
      className: "border-pulse-red/40 bg-pulse-red/10 text-pulse-red",
    };
  }

  if (evidence.classification === "invalid_delegation") {
    return {
      title: "Delegation-like code review",
      body: "This address has account code beginning with the EIP-7702 prefix, but it does not match the expected designator length. Review it before assuming normal wallet behavior.",
      detail: `Code bytes: ${evidence.codeLengthBytes}`,
      className: "border-amber-400/35 bg-amber-400/10 text-amber-200",
    };
  }

  return {
    title: "Account code detected",
    body: "This address has account code or an unrecognized delegation pattern. Review it before assuming it behaves like a normal EOA.",
    detail: `Code bytes: ${evidence.codeLengthBytes}`,
    className: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  };
}
