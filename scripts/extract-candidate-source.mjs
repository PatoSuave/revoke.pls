#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const URL_PATTERN = /https?:\/\/[^\s"'<>`]+/gi;

function printUsage() {
  console.error(
    [
      "Usage: node scripts/extract-candidate-source.mjs <snapshot-file> [--json]",
      "",
      "Reads a reviewed local HTML/OPML/raw snapshot and extracts sorted",
      "unique URLs and hostnames. This script never fetches remote URLs.",
    ].join("\n"),
  );
}

function extractCandidateSourceSnapshot(sourceText) {
  const urls = extractSourceUrls(sourceText);

  return {
    urls,
    hostnames: extractHostnames(urls),
  };
}

function extractSourceUrls(sourceText) {
  const decodedText = decodeCommonHtmlEntities(sourceText);
  const matches = decodedText.match(URL_PATTERN) ?? [];
  const uniqueUrls = new Set();

  for (const match of matches) {
    const normalizedUrl = normalizeSourceUrl(match);
    if (!normalizedUrl) continue;
    uniqueUrls.add(normalizedUrl);
  }

  return [...uniqueUrls].sort();
}

function extractHostnames(urls) {
  const uniqueHostnames = new Set();

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        continue;
      }

      const hostname = normalizeHostname(parsed.hostname);
      if (!isUsableHostname(hostname)) continue;
      uniqueHostnames.add(hostname);
    } catch {
      continue;
    }
  }

  return [...uniqueHostnames].sort();
}

function normalizeSourceUrl(url) {
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

function normalizeHostname(hostname) {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function stripTrailingUrlPunctuation(url) {
  return url.replace(/[),.;\]`]+$/g, "");
}

function decodeCommonHtmlEntities(text) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

function isUsableHostname(hostname) {
  const labels = hostname.split(".");
  if (labels.length < 2) return false;

  return labels.every((label) =>
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label),
  );
}

function main() {
  const args = process.argv.slice(2);
  const snapshotPath = args.find((arg) => !arg.startsWith("--"));
  const outputJson = args.includes("--json");

  if (!snapshotPath || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(snapshotPath ? 0 : 1);
  }

  const absolutePath = resolve(process.cwd(), snapshotPath);
  const sourceText = readFileSync(absolutePath, "utf8");
  const extraction = extractCandidateSourceSnapshot(sourceText);

  if (outputJson) {
    console.log(JSON.stringify(extraction, null, 2));
    return;
  }

  console.log(`Snapshot: ${absolutePath}`);
  console.log(`Unique URLs: ${extraction.urls.length}`);
  console.log(`Unique hostnames: ${extraction.hostnames.length}`);
  console.log("");
  console.log(extraction.hostnames.join("\n"));
}

main();
