"use client";

import { useId } from "react";

import {
  AVALANCHE_CHAIN_ID,
  BERACHAIN_CHAIN_ID,
  BLAST_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  LINEA_CHAIN_ID,
  MANTLE_CHAIN_ID,
  POLYGON_CHAIN_ID,
  PULSECHAIN_CHAIN_ID,
  SONIC_CHAIN_ID,
} from "@/lib/chains";
import { ARBITRUM_ONE_CLIENT_CHAIN_ID } from "@/lib/arbitrum-approval-client";
import { ETHEREUM_MAINNET_CLIENT_CHAIN_ID } from "@/lib/ethereum-approval-client";
import { HYPEREVM_CLIENT_CHAIN_ID } from "@/lib/hyperevm-approval-client";
import { OPTIMISM_CLIENT_CHAIN_ID } from "@/lib/optimism-approval-client";

type ChainLogoTone = "full" | "muted";

const PULSECHAIN_LOGO_PATH =
  "M565.598765,372.951028 C565.598765,375.002407 565.123895,376.952504 564.22332,378.644848 L471.558363,539.145156 C467.628442,545.95198 460.365648,550.145156 452.505805,550.145156 L246.592961,550.145156 C238.733118,550.145156 231.470323,545.95198 227.540402,539.145156 L134.86679,378.629552 C133.968844,376.940022 133.5,374.999302 133.5,372.951028 C133.5,366.307901 138.885318,360.922583 145.528445,360.922583 L247.199342,360.922583 L272.965382,404.687949 L273.123755,404.949452 C276.56213,410.470142 283.796681,412.269462 289.433324,408.951035 L289.433324,408.951035 L289.725027,408.773687 C292.323961,407.142692 294.205446,404.576775 294.976025,401.597905 L294.976025,401.597905 L327.807505,274.677705 L355.998349,479.011885 L356.041062,479.296747 C357.082331,485.72482 363.072426,490.1783 369.557845,489.283548 L369.557845,489.283548 L369.85245,489.239203 C374.548041,488.473143 378.362876,485.004494 379.559058,480.380352 L379.559058,480.380352 L419.133013,327.39653 L435.381735,354.996566 L435.543066,355.262694 C437.735954,358.77701 441.59028,360.922583 445.747249,360.922583 L445.747249,360.922583 L553.57032,360.922583 L553.57032,360.922583 C560.213447,360.922583 565.598765,366.307901 565.598765,372.951028 Z " +
  "M452.505805,149.493649 C460.365648,149.493649 467.628442,153.686825 471.558363,160.493649 L564.229106,321.001259 C565.125282,322.691832 565.598765,324.640838 565.598765,326.687777 C565.598765,333.330904 560.213447,338.716222 553.57032,338.716222 L451.566328,338.716222 L425.800288,294.950856 L425.62294,294.659153 C423.991945,292.060218 421.426028,290.178734 418.447158,289.408155 L418.447158,289.408155 L418.167463,289.339295 C411.826545,287.85703 405.429227,291.702682 403.789645,298.040901 L403.789645,298.040901 L370.95724,424.960175 L342.767321,220.62692 L342.722976,220.332314 C341.956916,215.636723 338.488267,211.821889 333.864125,210.625707 C327.432698,208.962014 320.870306,212.827026 319.206612,219.258453 L319.206612,219.258453 L279.631731,372.24135 L263.383935,344.64224 L263.222604,344.376112 C261.029716,340.861796 257.17539,338.716222 253.018421,338.716222 L253.018421,338.716222 L145.528445,338.716222 L145.528445,338.716222 C138.885318,338.716222 133.5,333.330904 133.5,326.687777 C133.5,324.65653 133.956256,322.735416 134.837658,321.056157 L227.540402,160.493649 C231.470323,153.686825 238.733118,149.493649 246.592961,149.493649 L452.505805,149.493649 Z";

const CHAIN_LOGO_LABELS: Readonly<Record<number, string>> = {
  [ETHEREUM_MAINNET_CLIENT_CHAIN_ID]: "Ethereum",
  [ARBITRUM_ONE_CLIENT_CHAIN_ID]: "Arbitrum",
  [OPTIMISM_CLIENT_CHAIN_ID]: "Optimism",
  [HYPEREVM_CLIENT_CHAIN_ID]: "HyperEVM",
  [PULSECHAIN_CHAIN_ID]: "PulseChain",
  [BSC_CHAIN_ID]: "BNB Smart Chain",
  [BASE_CHAIN_ID]: "Base",
  [POLYGON_CHAIN_ID]: "Polygon",
  [SONIC_CHAIN_ID]: "Sonic Mainnet",
  [AVALANCHE_CHAIN_ID]: "Avalanche C-Chain",
  [MANTLE_CHAIN_ID]: "Mantle",
  [LINEA_CHAIN_ID]: "Linea",
  [BLAST_CHAIN_ID]: "Blast",
  [BERACHAIN_CHAIN_ID]: "Berachain",
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
    case SONIC_CHAIN_ID:
      return <SonicMark muted={muted} />;
    case AVALANCHE_CHAIN_ID:
      return <AvalancheMark muted={muted} />;
    case MANTLE_CHAIN_ID:
      return <MantleMark muted={muted} />;
    case LINEA_CHAIN_ID:
      return <LineaMark muted={muted} />;
    case BLAST_CHAIN_ID:
      return <BlastMark muted={muted} />;
    case BERACHAIN_CHAIN_ID:
      return <BerachainMark muted={muted} />;
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
  const gradientId = useId().replace(/:/g, "");
  const fill = muted ? "currentColor" : `url(#${gradientId})`;

  return (
    <>
      {muted ? null : (
        <defs>
          <linearGradient
            id={gradientId}
            x1="76.2262818%"
            y1="7.45934826%"
            x2="23.6511094%"
            y2="92.5655852%"
          >
            <stop stopColor="#00EAFF" offset="0%" />
            <stop stopColor="#0080FF" offset="25.2530882%" />
            <stop stopColor="#8000FF" offset="49.7394282%" />
            <stop stopColor="#E619E6" offset="74.9912298%" />
            <stop stopColor="#FF0000" offset="99.9136118%" />
          </linearGradient>
        </defs>
      )}
      <path
        id="PulseChain-Logo-Shape"
        d={PULSECHAIN_LOGO_PATH}
        fill={fill}
        fillRule="evenodd"
        transform="translate(0 1.72) scale(0.11085) translate(-133 -149)"
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

function SonicMark({ muted }: { muted: boolean }) {
  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#0F172A"} />
      <path
        d="M13 17c5-6 15-7 22-2-3 2-6 4-10 5-5 1-9 0-12-3Z"
        fill={muted ? "#0B0A14" : "#58F1D4"}
      />
      <path
        d="M35 31c-5 6-15 7-22 2 3-2 6-4 10-5 5-1 9 0 12 3Z"
        fill={muted ? "#0B0A14" : "#58F1D4"}
        opacity="0.88"
      />
      <path
        d="M14 25c6 2 14 2 20-2"
        fill="none"
        stroke={muted ? "#0B0A14" : "#FFFFFF"}
        strokeLinecap="round"
        strokeWidth="3"
      />
    </>
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

function LineaMark({ muted }: { muted: boolean }) {
  return (
    <>
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="9"
        fill={muted ? "currentColor" : "#0B0A14"}
      />
      <path
        d="M14 14h7v13h13v7H14V14Z"
        fill={muted ? "#0B0A14" : "#FFFFFF"}
      />
      <circle
        cx="34"
        cy="15"
        r="5"
        fill={muted ? "#0B0A14" : "#FFFFFF"}
      />
    </>
  );
}

function BlastMark({ muted }: { muted: boolean }) {
  const ink = muted ? "#0B0A14" : "#111318";

  return (
    <>
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="7"
        fill={muted ? "currentColor" : "#FCFF00"}
      />
      <path
        d="M11 17 17 11h20l3 3-2 8-7 4 6 4-3 8H12l4-16 5 3-2 8h11l1-4H21l2-7h11l1-4H11Z"
        fill={ink}
        fillRule="evenodd"
      />
    </>
  );
}

function BerachainMark({ muted }: { muted: boolean }) {
  const ink = muted ? "#0B0A14" : "#20100B";

  return (
    <>
      <circle cx="24" cy="24" r="21" fill={muted ? "currentColor" : "#FF7A1A"} />
      <path
        d="M9 26c0-4 2-7 5-9a7 7 0 0 1 13-1 7 7 0 0 1 12 5c0 2-1 4-2 6 1 2 2 4 2 7 0 7-6 10-15 10S9 41 9 34c0-3 1-5 2-7l-2-1Z"
        fill={ink}
      />
      <path
        d="M15 30c0-6 4-10 9-10s9 4 9 10c0 7-4 10-9 10s-9-3-9-10Z"
        fill={ink}
      />
      <circle cx="19" cy="27" r="1.6" fill={muted ? "currentColor" : "#FF7A1A"} />
      <circle cx="29" cy="27" r="1.6" fill={muted ? "currentColor" : "#FF7A1A"} />
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
