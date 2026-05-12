import { SECURITY_CHAIN_STATUS_ROWS } from "@/lib/security-content";

const STATUS_STYLES = {
  Live: "border-pulse-green/35 bg-pulse-green/10 text-pulse-green",
  "Not enabled": "border-pulse-border bg-pulse-bg/65 text-pulse-muted",
  "Not supported": "border-pulse-red/35 bg-pulse-red/10 text-pulse-red",
} as const;

export function SupportedChainStatusMatrix() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-pulse-border bg-pulse-panel/65">
      <table className="min-w-[860px] table-fixed text-left text-sm">
        <caption className="sr-only">
          Supported-chain scan and revoke status
        </caption>
        <thead className="border-b border-pulse-border bg-pulse-bg/60 text-xs font-semibold uppercase tracking-[0.16em] text-pulse-muted">
          <tr>
            <th scope="col" className="w-[17%] px-4 py-3">
              Chain
            </th>
            <th scope="col" className="w-[10%] px-4 py-3">
              Chain ID
            </th>
            <th scope="col" className="w-[9%] px-4 py-3">
              Scan
            </th>
            <th scope="col" className="w-[15%] px-4 py-3">
              Revoke
            </th>
            <th scope="col" className="w-[13%] px-4 py-3">
              Status
            </th>
            <th scope="col" className="w-[36%] px-4 py-3">
              Current reality
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-pulse-border/70">
          {SECURITY_CHAIN_STATUS_ROWS.map((row) => (
            <tr key={row.chain}>
              <th
                scope="row"
                className="px-4 py-4 align-top font-semibold text-pulse-text"
              >
                {row.chain}
              </th>
              <td className="px-4 py-4 align-top font-mono text-xs text-pulse-muted">
                {row.chainId}
              </td>
              <td className="px-4 py-4 align-top font-semibold text-pulse-text">
                {row.scan}
              </td>
              <td className="px-4 py-4 align-top text-pulse-muted">
                {row.revoke}
              </td>
              <td className="px-4 py-4 align-top">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${STATUS_STYLES[row.status]}`}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-4 py-4 align-top leading-6 text-pulse-muted">
                {row.note}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
