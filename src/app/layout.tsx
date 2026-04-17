import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: {
    default: "Pulse Revoke — Manage PulseChain token approvals",
    template: "%s · Pulse Revoke",
  },
  description:
    "Pulse Revoke helps you review and revoke ERC-20 token approvals on PulseChain. Non-custodial, open source, and built for safety.",
  applicationName: "Pulse Revoke",
  keywords: [
    "PulseChain",
    "revoke approvals",
    "token allowance",
    "ERC-20",
    "wallet security",
    "revoke.cash alternative",
  ],
  authors: [{ name: "Pulse Revoke" }],
  openGraph: {
    title: "Pulse Revoke — Manage PulseChain token approvals",
    description:
      "Review and revoke ERC-20 token approvals on PulseChain. Non-custodial and open source.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070b",
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
