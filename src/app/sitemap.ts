import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/app"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/TokenContractReport"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/security"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
