import {
  getLinkCheckStatusLabel,
  type LinkCheckResult,
  type LinkCheckStatus,
} from "@/lib/security/link-checker";

const STATUS_STYLES: Record<LinkCheckStatus, string> = {
  "official-match": "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
  "likely-lookalike": "border-red-400/40 bg-red-500/10 text-red-200",
  "suspicious-patterns": "border-amber-300/40 bg-amber-400/10 text-amber-100",
  "unknown-domain": "border-pulse-cyan/35 bg-pulse-cyan/10 text-pulse-cyan",
  "invalid-input": "border-pulse-border bg-pulse-text/5 text-pulse-muted",
};

const SEVERITY_STYLES = {
  info: "border-pulse-border bg-pulse-text/5 text-pulse-muted",
  low: "border-pulse-cyan/25 bg-pulse-cyan/10 text-pulse-cyan",
  medium: "border-amber-300/35 bg-amber-400/10 text-amber-100",
  high: "border-red-400/40 bg-red-500/10 text-red-200",
} as const;

export function LinkCheckerResult({ result }: { result: LinkCheckResult }) {
  return (
    <section className="rounded-2xl border border-pulse-border bg-pulse-panel/70 p-5 shadow-glow sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pulse-muted">
            Link check result
          </p>
          <h2 className="mt-2 text-2xl font-bold text-pulse-text">
            {getLinkCheckStatusLabel(result.status)}
          </h2>
        </div>
        <span
          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[result.status]}`}
        >
          {result.status}
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-pulse-muted">
        {result.userMessage}
      </p>

      <dl className="mt-5 grid gap-3 rounded-2xl border border-pulse-border/70 bg-pulse-bg/45 p-4 text-sm sm:grid-cols-2">
        <Detail label="Hostname" value={result.hostname ?? "Not available"} />
        <Detail
          label="Domain"
          value={result.registrableDomain ?? "Not available"}
        />
        <Detail label="Protocol" value={result.protocol ?? "Not available"} />
        <Detail label="HTTPS" value={result.usesHttps ? "Yes" : "No"} />
        <Detail label="Path" value={result.path || "/"} wide />
        <Detail
          label="Normalized URL"
          value={result.normalizedUrl ?? "Not available"}
          wide
        />
      </dl>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-pulse-text">Signals</h3>
        {result.signals.length > 0 ? (
          <ul className="mt-3 grid gap-3">
            {result.signals.map((signal) => (
              <li
                key={signal.id}
                className={`rounded-2xl border p-4 text-sm ${SEVERITY_STYLES[signal.severity]}`}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold">{signal.title}</p>
                  <span className="text-xs uppercase tracking-[0.14em]">
                    {signal.severity}
                  </span>
                </div>
                <p className="mt-2 leading-6 text-pulse-muted">
                  {signal.description}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 text-sm leading-6 text-pulse-muted">
            No static warning signals were found by this local checker. Still
            verify the source and the wallet prompt before signing.
          </p>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-pulse-border bg-pulse-bg/45 p-4 text-sm leading-7 text-pulse-muted">
        <h3 className="font-semibold text-pulse-text">Recommended next steps</h3>
        <ul className="mt-3 grid gap-2">
          <li>Verify official domains from more than one independent source.</li>
          <li>Do not connect a wallet to lookalike or shortened links.</li>
          <li>Reject wallet prompts that show unexpected approvals or transfers.</li>
        </ul>
      </div>
    </section>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-pulse-muted">
        {label}
      </dt>
      <dd className="mt-1 break-all font-mono text-xs text-pulse-text sm:text-sm">
        {value}
      </dd>
    </div>
  );
}
