import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const {
    background,
    text,
    muted,
    gradientStart,
    gradientMid,
    gradientEnd,
  } = siteConfig.brandColors;

  const gradient = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 55%, ${gradientEnd} 100%)`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background,
          padding: 72,
          color: text,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: gradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: background,
              fontSize: 48,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            R
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: -0.5,
              }}
            >
              {siteConfig.name}
            </span>
            <span
              style={{
                fontSize: 22,
                color: muted,
              }}
            >
              {siteConfig.domain}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1.02,
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span>Review and revoke your</span>
            <span
              style={{
                background: gradient,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              PulseChain approvals.
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: muted,
              maxWidth: 960,
              lineHeight: 1.35,
            }}
          >
            {siteConfig.description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            fontSize: 20,
            color: muted,
          }}
        >
          <span>Non-custodial · Open source · PulseChain + BSC</span>
          <span
            style={{
              background: gradient,
              backgroundClip: "text",
              color: "transparent",
              fontWeight: 700,
            }}
          >
            {siteConfig.domain}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
