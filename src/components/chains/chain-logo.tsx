"use client";

import {
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
} from "@/lib/chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "@/lib/optimism-approval-client";

type ChainLogoTone = "full" | "muted";

const CHAIN_LOGO_LABELS: Readonly<Record<number, string>> = {
  [ETHEREUM_MAINNET_CLIENT_CHAIN_ID]: "Ethereum",
  [ARBITRUM_ONE_CLIENT_CHAIN_ID]: "Arbitrum",
  [OPTIMISM_CLIENT_CHAIN_ID]: "Optimism",
  [HYPEREVM_CLIENT_CHAIN_ID]: "HyperEVM",
  [PULSECHAIN_CHAIN_ID]: "PulseChain",
  [BSC_CHAIN_ID]: "BNB Smart Chain",
  [BASE_CHAIN_ID]: "Base",
  [POLYGON_CHAIN_ID]: "Polygon",
  [AVALANCHE_CHAIN_ID]: "Avalanche C-Chain",
  [MANTLE_CHAIN_ID]: "Mantle",
};

export function chainLogoLabel(chainId: number): string {
  return CHAIN_LOGO_LABELS[chainId] ?? "Network";
}

export function ChainLogo({
  chainId,
  className = "h-6 w-6",
  tone = "full",
}: {
  chainId: number;
  className?: string;
  tone?: ChainLogoTone;
}) {
  const muted = tone === "muted";

  return (
    <svg
      aria-hidden
      viewBox="0 0 48 48"
      className={className}
      role="img"
    >
      {renderChainMark(chainId, muted)}
    </svg>
  );
}

export function ChainLogoBackdrop({
  chainId,
  className = "h-20 w-20",
}: {
  chainId: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-3 top-1/2 z-0 -translate-y-1/2 opacity-[0.13] transition-opacity group-hover:opacity-[0.18]"
    >
      <ChainLogo chainId={chainId} className={className} tone="muted" />
    </span>
  );
}

function renderChainMark(chainId: number, muted: boolean) {
  switch (chainId) {
    case ETHEREUM_MAINNET_CLIENT_CHAIN_ID:
      return <EthereumMark muted={muted} />;
    case ARBITRUM_ONE_CLIENT_CHAIN_ID:
      return <ArbitrumMark muted={muted} />;
    case OPTIMISM_CLIENT_CHAIN_ID:
      return <OptimismMark muted={muted} />;
    case HYPEREVM_CLIENT_CHAIN_ID:
      return <HyperEVMMark muted={muted} />;
    case PULSECHAIN_CHAIN_ID:
      return <PulseChainMark muted={muted} />;
    case BSC_CHAIN_ID:
      return <BnbMark muted={muted} />;
    case BASE_CHAIN_ID:
      return <BaseMark muted={muted} />;
    case POLYGON_CHAIN_ID:
      return <PolygonMark muted={muted} />;
    case AVALANCHE_CHAIN_ID:
      return <AvalancheMark muted={muted} />;
    case MANTLE_CHAIN_ID:
      return <MantleMark muted={muted} />;
    default:
      return <DefaultMark muted={muted} />;
  }
}

function EthereumMark({ muted }: { muted: boolean }) {
  const top = muted ? "currentColor" : "#8EA5FF";
  const bottom = muted ? "currentColor" : "#627EEA";

  return (
    <>
      <path d="M24 3 10 25l14-6 14 6L24 3Z" fill={top} />
      <path d="M10 27l14 18 14-18-14 8-14-8Z" fill={bottom} />
      <path d="M24 19v16l14-8-14-8Z" fill={muted ? "currentColor" : "#3D55C8"} />
    </>
  );
}

function ArbitrumMark({ muted }: { muted: boolean }) {
  return (
    <>
      <path
        d="M24 3 42 13.5v21L24 45 6 34.5v-21L24 3Z"
        fill={muted ? "currentColor" : "#183B73"}
      />
      <path
        d="M17 34 29 11h5L22 34h-5Z"
        fill={muted ? "currentColor" : "#28A0F0"}
      />
      <path
        d="M26 34 35 17l3 5-6.5 12H26Z"
        fill={muted ? "currentColor" : "#FFFFFF"}
      />
    </>
  );
}

function OptimismMark({ muted }: { muted: boolean }) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#FF0420"} />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontSize="13"
        fontWeight="800"
        fill={muted ? "#0B0A14" : "#FFFFFF"}
      >
        OP
      </text>
    </>
  );
}

function HyperEVMMark({ muted }: { muted: boolean }) {
  return (
    <>
      <path
        d="M8 31c4-13 9-18 15-14 3 2 4 5 7 5 4 0 6-5 10-8-2 13-7 19-14 15-3-2-4-5-7-5-4 0-7 4-11 7Z"
        fill={muted ? "currentColor" : "#47E6A2"}
      />
      <path
        d="M7 18c6-6 12-8 18-5 6 4 9 4 16-3-5 12-12 16-20 11-4-2-8-2-14-3Z"
        fill={muted ? "currentColor" : "#18C7B8"}
        opacity="0.9"
      />
    </>
  );
}

function PulseChainMark({ muted }: { muted: boolean }) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#7839EE"} />
      <path
        d="M8 24h10l4-9 6 20 4-11h8"
        fill="none"
        stroke={muted ? "#0B0A14" : "#D8C8FF"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
    </>
  );
}

function BnbMark({ muted }: { muted: boolean }) {
  const fill = muted ? "currentColor" : "#F3BA2F";
  return (
    <>
      <path d="M24 4 34 14 24 24 14 14 24 4Z" fill={fill} />
      <path d="M8 24 18 14l6 6-10 10L8 24Z" fill={fill} />
      <path d="M40 24 30 14l-6 6 10 10 6-6Z" fill={fill} />
      <path d="M24 44 14 34l10-10 10 10-10 10Z" fill={fill} />
      <path d="M24 18 30 24 24 30 18 24 24 18Z" fill={muted ? "#0B0A14" : "#111318"} />
    </>
  );
}

function BaseMark({ muted }: { muted: boolean }) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#0052FF"} />
      <path
        d="M14 24h21"
        stroke={muted ? "#0B0A14" : "#FFFFFF"}
        strokeLinecap="round"
        strokeWidth="7"
      />
    </>
  );
}

function PolygonMark({ muted }: { muted: boolean }) {
  return (
    <path
      d="M17 18 24 14l7 4v8l-7 4-7-4v-8Zm14 0 7-4 7 4v8l-7 4-7-4m-14 0-7 4-7-4v-8l7-4 7 4"
      fill="none"
      stroke={muted ? "currentColor" : "#8247E5"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4"
    />
  );
}

function AvalancheMark({ muted }: { muted: boolean }) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#E84142"} />
      <path
        d="M24 10 12 34h8l4-8 4 8h8L24 10Z"
        fill={muted ? "#0B0A14" : "#FFFFFF"}
      />
      <path
        d="M34 34h6l-5-10-3 6 2 4Z"
        fill={muted ? "#0B0A14" : "#FFFFFF"}
        opacity="0.9"
      />
    </>
  );
}

function MantleMark({ muted }: { muted: boolean }) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#111827"} />
      <path
        d="M12 33V15h6l6 9 6-9h6v18h-6V25l-4 6h-4l-4-6v8h-6Z"
        fill={muted ? "#0B0A14" : "#FFFFFF"}
      />
      <path
        d="M15 12h18"
        stroke={muted ? "#0B0A14" : "#67E8F9"}
        strokeLinecap="round"
        strokeWidth="3"
      />
    </>
  );
}

function DefaultMark({ muted }: { muted: boolean }) {
  return (
    <circle
      cx="24"
      cy="24"
      r="20"
      fill={muted ? "currentColor" : "#31D6FF"}
    />
  );
}
