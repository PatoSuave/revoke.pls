import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { absoluteUrl, siteConfig } from "@/lib/site";

// Icons and social previews are generated from the co-located metadata
// files (`icon.tsx`, `apple-icon.tsx`, `opengraph-image.tsx`). Next.js
// auto-populates `metadata.icons.*` and `metadata.openGraph.images` from
// those routes — do not duplicate them here.

const pageTitle = `${siteConfig.name} — ${siteConfig.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: pageTitle,
    template: `%s · ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: pageTitle,
    description: siteConfig.description,
    url: absoluteUrl("/"),
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.brandColors.background,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh bg-pulse-bg text-pulse-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
