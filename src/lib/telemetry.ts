/**
 * Lightweight, privacy-respecting product-health telemetry.
 *
 * Goals:
 *  - Emit a small, fixed set of lifecycle events for operational visibility
 *    (scan + revoke + batch) without wallet addresses, fingerprints, or
 *    third-party trackers.
 *  - Provide a single `trackEvent()` call site so sinks can be swapped
 *    (in-memory buffer, self-hosted endpoint, etc.) without touching callers.
 *  - Default to a dev-only `console` sink so the signal is visible in local
 *    dev/preview and silent in production unless explicitly enabled.
 *
 * To enable in production, set `NEXT_PUBLIC_TELEMETRY_ENABLED=true`. To
 * replace the sink (e.g. ship events to a self-hosted ingest), call
 * `setTelemetrySink(customSink)` once at app boot.
 *
 * Payload rules (enforced by convention, not types):
 *  - No wallet/contract addresses.
 *  - No approval amounts, token balances, or transaction hashes.
 *  - Only enums, counts, booleans, and short opaque identifiers.
 */
export type TelemetryEventName =
  | "connector_selected"
  | "scan_started"
  | "scan_completed"
  | "scan_truncated"
  | "scan_failed"
  | "revoke_submitted"
  | "revoke_confirmed"
  | "revoke_failed"
  | "revoke_rejected"
  | "batch_started"
  | "batch_completed"
  | "batch_stopped";

export type TelemetryLevel = "info" | "warn";

export type TelemetryProps = Readonly<
  Record<string, string | number | boolean | undefined>
>;

export interface TelemetryEvent {
  name: TelemetryEventName;
  props?: TelemetryProps;
  level: TelemetryLevel;
}

export type TelemetrySink = (event: TelemetryEvent) => void;

function isEnabled(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.NEXT_PUBLIC_TELEMETRY_ENABLED === "true";
}

const consoleSink: TelemetrySink = (event) => {
  if (!isEnabled()) return;
  const out = event.level === "warn" ? console.warn : console.info;
  out(`[telemetry] ${event.name}`, event.props ?? {});
};

let activeSink: TelemetrySink = consoleSink;

/**
 * Replace the telemetry sink. Pass `null` to restore the default console sink.
 * Intended for wiring a future self-hosted ingest without changing call sites.
 */
export function setTelemetrySink(sink: TelemetrySink | null): void {
  activeSink = sink ?? consoleSink;
}

/**
 * Emit a telemetry event. Never throws; telemetry must not break product flows.
 */
export function trackEvent(
  name: TelemetryEventName,
  props?: TelemetryProps,
  level: TelemetryLevel = "info",
): void {
  try {
    activeSink({ name, props, level });
  } catch {
    // Telemetry is best-effort — swallow sink failures.
  }
}
