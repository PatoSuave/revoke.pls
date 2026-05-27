import type { ScanMode } from "@/lib/scan-target";

export type ScannerDisplayTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "error";

export interface ScannerModeDisplay {
  label: string;
  body: string;
  tone: ScannerDisplayTone;
}

export interface PipelineHealthDisplay {
  label: string;
  detail: string;
  tone: ScannerDisplayTone;
}

type PipelineStatus = "idle" | "pending" | "success" | "error";

export function getScannerModeDisplay({
  scanMode,
  walletConnected,
  walletMatchesScanTarget,
  walletMatchesActiveChain,
}: {
  scanMode: ScanMode;
  walletConnected: boolean;
  walletMatchesScanTarget: boolean | null;
  walletMatchesActiveChain: boolean | null;
}): ScannerModeDisplay {
  if (!walletConnected) {
    return {
      label: "Read-only scan",
      body: "Public approval data only. Connect the matching wallet only when you want to revoke.",
      tone: "info",
    };
  }

  if (walletMatchesScanTarget === false) {
    return {
      label: "Wallet mismatch",
      body: "The connected wallet does not match the scanned address. Revoke stays unavailable.",
      tone: "warning",
    };
  }

  if (walletMatchesActiveChain === false) {
    return {
      label: "Wrong network",
      body: "The wallet matches the scanned address, but it must switch to the row network before revoke.",
      tone: "warning",
    };
  }

  if (scanMode === "connected-wallet-matches-scanned-address") {
    return {
      label: "Matching wallet",
      body: "The connected wallet matches this pasted scan target. Verified rows can move to revoke review.",
      tone: "success",
    };
  }

  if (scanMode === "connected-wallet") {
    return {
      label: "Active management",
      body: "Scanning the connected wallet. Revoke still requires row verification and wallet confirmation.",
      tone: "success",
    };
  }

  return {
    label: "Read-only scan",
    body: "The scan target is not controlled by the connected wallet. Revoke stays unavailable.",
    tone: "info",
  };
}

export function getScanPhaseDisplay({
  status,
  candidateCount,
  standardLabel,
}: {
  status: PipelineStatus;
  candidateCount: number;
  standardLabel: string;
}): PipelineHealthDisplay {
  if (status === "error") {
    return {
      label: "Scan interrupted",
      detail: `The ${standardLabel} approval pipeline could not finish.`,
      tone: "error",
    };
  }

  if (status === "pending" && candidateCount > 0) {
    return {
      label: "Live verification",
      detail: `Checking ${candidateCount} historical ${standardLabel} candidate${
        candidateCount === 1 ? "" : "s"
      } against current on-chain state.`,
      tone: "info",
    };
  }

  if (status === "pending") {
    return {
      label: "Discovering history",
      detail: `Searching explorer logs for ${standardLabel} approval history.`,
      tone: "info",
    };
  }

  if (status === "success") {
    return {
      label: "Scan complete",
      detail:
        candidateCount > 0
          ? `${candidateCount} historical ${standardLabel} candidate${
              candidateCount === 1 ? "" : "s"
            } checked.`
          : `No ${standardLabel} approval history returned by the indexer.`,
      tone: "success",
    };
  }

  return {
    label: "Waiting",
    detail: "Scanner is waiting for a wallet or address target.",
    tone: "neutral",
  };
}

export function getPipelineHealthDisplay({
  status,
  truncated,
  failureCount,
  error,
  idleDetail = "Waiting for a scan target.",
  successDetail = "Current data path is reporting normally.",
}: {
  status: PipelineStatus;
  truncated: boolean;
  failureCount: number;
  error: string | null;
  idleDetail?: string;
  successDetail?: string;
}): PipelineHealthDisplay {
  if (status === "idle") {
    return {
      label: "Waiting",
      detail: idleDetail,
      tone: "neutral",
    };
  }

  if (status === "pending") {
    return {
      label: "Checking",
      detail: "Scan is in progress.",
      tone: "info",
    };
  }

  if (status === "error" || error) {
    return {
      label: "Unavailable",
      detail: error ?? "The data source reported an error.",
      tone: "error",
    };
  }

  if (truncated) {
    return {
      label: "Limited",
      detail: "The indexer returned a capped result, so the scan is not complete.",
      tone: "warning",
    };
  }

  if (failureCount > 0) {
    return {
      label: "Degraded",
      detail: `${failureCount} live read${failureCount === 1 ? "" : "s"} failed.`,
      tone: "warning",
    };
  }

  return {
    label: "Online",
    detail: successDetail,
    tone: "success",
  };
}

