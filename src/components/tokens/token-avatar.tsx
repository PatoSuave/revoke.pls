"use client";

import { useState } from "react";

export function TokenAvatar({
  symbol,
  logoUrl,
  className = "",
}: {
  symbol: string;
  logoUrl?: string;
  className?: string;
}) {
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const initials = symbol.trim().slice(0, 3).toUpperCase() || "TOK";
  const showLogo = Boolean(logoUrl && failedLogoUrl !== logoUrl);

  return (
    <div
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pulse-gradient text-[10px] font-bold text-pulse-on-gradient ${className}`}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={() => setFailedLogoUrl(logoUrl ?? null)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
