import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { absoluteUrl, siteConfig } from "@/lib/site";
import {
  DEFAULT_THEME_MODE,
  THEME_MODE_IDS,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

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

const themeInitScript = `
(() => {
  try {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const modes = ${JSON.stringify(THEME_MODE_IDS)};
    const stored = window.localStorage.getItem(key);
    const theme = modes.includes(stored) ? stored : ${JSON.stringify(DEFAULT_THEME_MODE)};
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
  } catch {
    document.documentElement.dataset.theme = ${JSON.stringify(DEFAULT_THEME_MODE)};
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME_MODE}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-dvh bg-pulse-bg text-pulse-text antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
