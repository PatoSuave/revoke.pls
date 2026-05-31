import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { extractCandidateSourceSnapshot } from "@/lib/security/candidate-source-extractor";

describe("candidate-source-extractor", () => {
  it("extracts sorted unique hostnames from HTML links", () => {
    const result = extractCandidateSourceSnapshot(`
      <a href="https://App.PulseX.com/swap?chain=pulse">PulseX</a>
      <a href='https://bridge.pulsechain.com/#/bridge'>Bridge</a>
      <img src="https://app.pulsex.com/logo.png" />
    `);

    expect(result.hostnames).toEqual([
      "app.pulsex.com",
      "bridge.pulsechain.com",
    ]);
    expect(result.urls).toEqual([
      "https://app.pulsex.com/logo.png",
      "https://app.pulsex.com/swap?chain=pulse",
      "https://bridge.pulsechain.com/",
    ]);
  });

  it("extracts hostnames from OPML-like snapshots", () => {
    const result = extractCandidateSourceSnapshot(`
      <outline text="Dex" htmlUrl="https://dex.example.org/path?x=1&amp;y=2" />
      <outline text="Docs" xmlUrl="https://docs.example.org/feed.xml" />
    `);

    expect(result.hostnames).toEqual(["dex.example.org", "docs.example.org"]);
    expect(result.urls).toContain("https://dex.example.org/path?x=1&y=2");
  });

  it("normalizes URL fragments and trailing punctuation without expanding domains", () => {
    const result = extractCandidateSourceSnapshot(`
      See https://www.coingecko.com/en/coins/pulsechain).
      Also https://scan.pulsechain.com/address/0x123#tokens;
    `);

    expect(result.hostnames).toEqual([
      "scan.pulsechain.com",
      "www.coingecko.com",
    ]);
    expect(result.urls).toEqual([
      "https://scan.pulsechain.com/address/0x123",
      "https://www.coingecko.com/en/coins/pulsechain",
    ]);
  });

  it("ignores unsupported and malformed URL-like values", () => {
    const result = extractCandidateSourceSnapshot(`
      mailto:security@example.com
      javascript:alert(1)
      https://
      https://...
      \`https://raw.githubusercontent.com/example/repo/main/index.html\`
      https://valid.example.com/path
    `);

    expect(result.hostnames).toEqual([
      "raw.githubusercontent.com",
      "valid.example.com",
    ]);
    expect(result.urls).toEqual([
      "https://raw.githubusercontent.com/example/repo/main/index.html",
      "https://valid.example.com/path",
    ]);
  });

  it("keeps the local source extraction script aligned with the library", () => {
    const directory = mkdtempSync(join(tmpdir(), "candidate-source-"));
    const snapshotPath = join(directory, "snapshot.html");
    const snapshot = `
      <a href="https://App.PulseX.com/swap?chain=pulse">PulseX</a>
      <outline htmlUrl="https://bridge.pulsechain.com/#/bridge" />
    `;

    try {
      writeFileSync(snapshotPath, snapshot, "utf8");
      const scriptOutput = execFileSync(
        process.execPath,
        ["scripts/extract-candidate-source.mjs", snapshotPath, "--json"],
        { cwd: process.cwd(), encoding: "utf8" },
      );

      expect(JSON.parse(scriptOutput)).toEqual(
        extractCandidateSourceSnapshot(snapshot),
      );
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
