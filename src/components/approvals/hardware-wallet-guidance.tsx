import {
  HARDWARE_WALLET_CONFIRMATION_COPY,
  HARDWARE_WALLET_EXPECTED_REVOKE_CALLS,
} from "@/lib/hardware-wallet-guidance";

export function HardwareWalletGuidance({
  className = "",
}: {
  className?: string;
}) {
  const classNames = [
    "mt-3 rounded-xl border border-pulse-border/70 bg-pulse-panel/45 p-3 text-xs leading-5 text-pulse-muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={classNames} aria-label="Hardware wallet guidance">
      <p className="font-semibold text-pulse-text">Hardware wallet users</p>
      <p className="mt-1">{HARDWARE_WALLET_CONFIRMATION_COPY}</p>
      <ul className="mt-2 grid gap-1.5">
        {HARDWARE_WALLET_EXPECTED_REVOKE_CALLS.map((item) => (
          <li key={item.label} className="flex flex-wrap gap-x-1.5">
            <span className="font-semibold text-pulse-text">{item.label}:</span>
            <span className="font-mono text-pulse-text">{item.call}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
