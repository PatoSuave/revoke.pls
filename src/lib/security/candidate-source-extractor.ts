import { normalizeRegistryHostname } from "@/lib/security/official-domain-registry";

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/gi;

export type CandidateSourceExtraction = {
  urls: string[];
  hostnames: string[];
};

export function extractCandidateSourceSnapshot(
  sourceText: string,
): CandidateSourceExtraction {
  const urls = extractSourceUrls(sourceText);

  return {
    urls,
    hostnames: extractHostnames(urls),
  };
}

function extractSourceUrls(sourceText: string): string[] {
  const decodedText = decodeCommonHtmlEntities(sourceText);
  const matches = decodedText.match(URL_PATTERN) ?? [];
  const uniqueUrls = new Set<string>();

  for (const match of matches) {
    const normalizedUrl = normalizeSourceUrl(match);
    if (!normalizedUrl) continue;
    uniqueUrls.add(normalizedUrl);
  }

  return [...uniqueUrls].sort();
}

function extractHostnames(urls: readonly string[]): string[] {
  const uniqueHostnames = new Set<string>();

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        continue;
      }

      uniqueHostnames.add(normalizeRegistryHostname(parsed.hostname));
    } catch {
      continue;
    }
  }

  return [...uniqueHostnames].sort();
}

function normalizeSourceUrl(url: string): string | undefined {
  const trimmed = stripTrailingUrlPunctuation(url.trim());

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }

    parsed.hash = "";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

function stripTrailingUrlPunctuation(url: string): string {
  return url.replace(/[),.;\]]+$/g, "");
}

function decodeCommonHtmlEntities(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}
