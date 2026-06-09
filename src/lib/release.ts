/**
 * Release manifest for the launcher / distribution page.
 *
 * This is the single source of truth for downloadable artifacts and IPFS
 * pinning metadata. The launcher page at `/` consumes `currentRelease` to
 * render the downloads and IPFS sections — swap placeholder values here
 * and the UI flips to the real release automatically.
 *
 * None of this affects `/app` or the on-chain scanner.
 */

import { siteConfig } from "./site";

/** Sentinel for unreleased links. Components detect it and render disabled. */
export const LAUNCHER_PLACEHOLDER_URL = "#";

/**
 * Sentinel CID used until a real build is pinned. Starts with `bafybei`
 * (a valid CIDv1 prefix) so it still renders in monospace without looking
 * malformed; detect via `isPlaceholderCid()`.
 */
export const LAUNCHER_PLACEHOLDER_CID = "bafybeiexamplecidplaceholder";

export function isPlaceholderUrl(value: string): boolean {
  return value === LAUNCHER_PLACEHOLDER_URL;
}

export function isPlaceholderCid(value: string): boolean {
  return value === LAUNCHER_PLACEHOLDER_CID;
}

/** Icon key resolved by the launcher page to a small inline SVG. */
export type ArtifactIcon = "windows" | "macos" | "linux";

/** A single downloadable desktop artifact. */
export interface ReleaseArtifact {
  /** Stable id for React keys and future per-artifact telemetry. */
  id: "win-x64" | "win-arm64" | "macos-universal" | "linux-appimage";
  /** Display platform name, e.g. "Windows", "macOS". */
  platform: string;
  /** Display architecture / packaging note, e.g. "x64", "Universal". */
  architecture: string;
  /** Which platform icon to render. */
  icon: ArtifactIcon;
  /** Download URL. Use `LAUNCHER_PLACEHOLDER_URL` until the build ships. */
  href: string;
  /** Optional short note shown under the button (e.g. "Requires macOS 13+"). */
  note?: string;
}

/** Public IPFS gateway entry. */
export interface IpfsGateway {
  /** Display label, e.g. "IPFS.io". */
  label: string;
  /** Base URL including trailing `/ipfs/`. The CID is appended directly. */
  base: string;
}

/** Signed checksums file metadata. */
export interface ChecksumsArtifact {
  /** URL to the SHA-256 checksums file. */
  href: string;
  /** Short human-readable verification instructions. */
  note: string;
}

/** Public instructions for running a local desktop build. */
export interface InstructionsArtifact {
  /** URL to setup / run instructions. */
  href: string;
  /** Short user-facing note shown near the instructions link. */
  note: string;
}

/** Full release descriptor. */
export interface ReleaseManifest {
  /** Semver-style version string, e.g. "v0.1.0". */
  version: string;
  /** Public path to the preview PNG shown on the launcher hero. */
  previewImage: string;
  /** External URL to the release notes / changelog. Use the placeholder
   *  sentinel to hide the link while unreleased. */
  releaseNotesUrl: string;
  /** Source repository URL (usually GitHub). */
  repoUrl: string;
  /** Downloadable desktop artifacts. Rendered in array order. */
  artifacts: readonly ReleaseArtifact[];
  instructions: InstructionsArtifact;
  checksums: ChecksumsArtifact;
  ipfs: {
    /** Content identifier (CIDv1). Placeholder until a build is pinned. */
    cid: string;
    /** The gateway the launcher page highlights as primary. */
    preferredGateway: IpfsGateway;
    /** Optional fall-back gateways for redundancy. */
    alternateGateways: readonly IpfsGateway[];
  };
}

/**
 * Current release descriptor. All URLs use `LAUNCHER_PLACEHOLDER_URL` and
 * the CID uses `LAUNCHER_PLACEHOLDER_CID` until a real build ships. Only
 * replace the values that are actually ready — the launcher page renders
 * each field independently, so partial releases are supported.
 */
export const currentRelease: ReleaseManifest = {
  version: "v0.1.0-beta.1",
  previewImage: "/launcher-preview.png",
  releaseNotesUrl: LAUNCHER_PLACEHOLDER_URL,
  repoUrl: siteConfig.links.github,
  artifacts: [
    {
      id: "win-x64",
      platform: "Windows",
      architecture: "x64 internal beta",
      icon: "windows",
      href: "/downloads/pulse-revoke-server_0.1.0-beta.1_windows_amd64.zip",
      note: "Unsigned internal beta. Windows may show a SmartScreen warning.",
    },
    {
      id: "win-arm64",
      platform: "Windows",
      architecture: "ARM64",
      icon: "windows",
      href: LAUNCHER_PLACEHOLDER_URL,
    },
    {
      id: "macos-universal",
      platform: "macOS",
      architecture: "Universal",
      icon: "macos",
      href: LAUNCHER_PLACEHOLDER_URL,
    },
    {
      id: "linux-appimage",
      platform: "Linux",
      architecture: "AppImage",
      icon: "linux",
      href: LAUNCHER_PLACEHOLDER_URL,
    },
  ],
  instructions: {
    href: "/downloads/pulse-revoke-server_0.1.0-beta.1_instructions.txt",
    note:
      "Read before running the beta. It serves Pulse Revoke on 127.0.0.1 and opens your default browser.",
  },
  checksums: {
    href: "/downloads/pulse-revoke-server_0.1.0-beta.1_checksums.txt",
    note: "Verify the Windows beta zip with SHA-256 before running it.",
  },
  ipfs: {
    cid: LAUNCHER_PLACEHOLDER_CID,
    preferredGateway: {
      label: "IPFS.io",
      base: "https://ipfs.io/ipfs/",
    },
    alternateGateways: [
      { label: "Cloudflare", base: "https://cloudflare-ipfs.com/ipfs/" },
      { label: "Pinata", base: "https://gateway.pinata.cloud/ipfs/" },
    ],
  },
};
