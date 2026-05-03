import { describe, it, expect, vi, afterEach } from "vitest";
import { trackEvent, setTelemetrySink, TelemetryEvent } from "./telemetry";

describe("telemetry", () => {
  afterEach(() => {
    // Restore the default console sink after each test
    setTelemetrySink(null);
  });

  describe("trackEvent", () => {
    it("should call the active sink with the correct payload", () => {
      const mockSink = vi.fn();
      setTelemetrySink(mockSink);

      const props = { chainId: 369 };
      trackEvent("scan_started", props, "warn");

      expect(mockSink).toHaveBeenCalledTimes(1);
      expect(mockSink).toHaveBeenCalledWith({
        name: "scan_started",
        props,
        level: "warn",
      } satisfies TelemetryEvent);
    });

    it("should default level to 'info' if not provided", () => {
      const mockSink = vi.fn();
      setTelemetrySink(mockSink);

      trackEvent("scan_completed");

      expect(mockSink).toHaveBeenCalledTimes(1);
      expect(mockSink).toHaveBeenCalledWith({
        name: "scan_completed",
        props: undefined,
        level: "info",
      } satisfies TelemetryEvent);
    });

    it("should gracefully swallow errors if the active sink throws", () => {
      const throwingSink = vi.fn().mockImplementation(() => {
        throw new Error("Sink failed");
      });
      setTelemetrySink(throwingSink);

      // This should not throw
      expect(() => {
        trackEvent("revoke_submitted", { chainId: 369 });
      }).not.toThrow();

      expect(throwingSink).toHaveBeenCalledTimes(1);
    });
  });
});
