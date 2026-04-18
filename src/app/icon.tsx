import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

// Next.js file-based metadata — this generates `/icon` at build time and
// automatically populates `metadata.icons.icon` for the entire app.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const { background, gradientStart, gradientMid, gradientEnd } =
    siteConfig.brandColors;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
          background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientMid} 50%, ${gradientEnd} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: background,
          fontSize: 22,
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        R
      </div>
    ),
    { ...size },
  );
}
