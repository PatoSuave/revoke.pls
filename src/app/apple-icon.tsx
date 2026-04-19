import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const { background, gradientStart, gradientMid, gradientEnd } =
    siteConfig.brandColors;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 40,
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 50%, ${gradientEnd} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: background,
          fontSize: 120,
          fontWeight: 800,
          letterSpacing: -4,
        }}
      >
        R
      </div>
    ),
    { ...size },
  );
}
