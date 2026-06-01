import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { validateIntelWalletAddress } from "@/lib/intel/address";
import { buildDemoWalletIntel } from "@/lib/intel/demo-wallet";
import { INTEL_FEATURES } from "@/lib/intel/feature-catalog";
import { INTEL_SURFACES } from "@/lib/intel/suite-navigation";
import { buildDemoVisualizerGraph } from "@/lib/intel/visualizer-demo";
import {
  DEFAULT_VISUALIZER_FILTERS,
  filterVisualizerEdges,
  getVisualizerNodeMap,
} from "@/lib/intel/visualizer-utils";

const VALID_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function collectSourceFiles(root: string): string[] {
  const absoluteRoot = join(process.cwd(), root);
  if (!existsSync(absoluteRoot)) return [];

  return readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${root}/${entry.name}`;
    if (entry.isDirectory()) return collectSourceFiles(relativePath);
    if (!/\.(md|ts|tsx)$/.test(entry.name)) return [];
    if (/\.test\.tsx?$/.test(entry.name)) return [];
    return [relativePath];
  });
}

function readIntelSources() {
  return [
    ...collectSourceFiles("src/app/intel"),
    ...collectSourceFiles("src/components/intel"),
    ...collectSourceFiles("src/lib/intel"),
    ...collectSourceFiles("docs/intel"),
  ]
    .map((path) => readSource(path))
    .join("\n");
}

describe("PulseChain Intelligence Suite first pass", () => {
  it("defines the seven feature cards", () => {
    expect(INTEL_FEATURES).toHaveLength(7);
    expect(INTEL_FEATURES.map((feature) => feature.title)).toEqual([
      "Wallet Intelligence",
      "Constellation Network Maps",
      "Research Assistant",
      "Token Deep Analytics",
      "Research Workspaces",
      "Real-Time Network Pulse",
      "Risk & Exposure Awareness",
    ]);
  });

  it("defines the shared Intelligence Suite surfaces", () => {
    expect(INTEL_SURFACES.map((surface) => surface.href)).toEqual([
      "/intel",
      "/intel/wallet",
      "/intel/visualizer",
    ]);
    expect(INTEL_SURFACES.map((surface) => surface.label)).toEqual([
      "Suite hub",
      "Wallet report",
      "Graph workbench",
    ]);
  });

  it("validates EVM wallet addresses locally", () => {
    expect(validateIntelWalletAddress(VALID_ADDRESS)).toMatchObject({
      ok: true,
      normalizedAddress: VALID_ADDRESS,
    });
    expect(validateIntelWalletAddress("0x123")).toMatchObject({
      ok: false,
    });
    expect(validateIntelWalletAddress("not-an-address")).toMatchObject({
      ok: false,
    });
  });

  it("keeps the searched wallet as the graph center node", () => {
    const report = buildDemoWalletIntel(VALID_ADDRESS);
    const centerNode = report.graph.nodes.find(
      (node) => node.id === report.graph.centerNodeId,
    );

    expect(report.mode).toBe("demo");
    expect(centerNode).toMatchObject({
      id: "searched-wallet",
      address: VALID_ADDRESS,
      kind: "wallet",
    });
  });

  it("builds a dense local visualizer graph with the searched wallet centered", () => {
    const graph = buildDemoVisualizerGraph(VALID_ADDRESS);
    const nodeById = getVisualizerNodeMap(graph);
    const centerNode = nodeById.get(graph.centerNodeId);
    const visibleEdges = filterVisualizerEdges(
      graph.edges,
      nodeById,
      DEFAULT_VISUALIZER_FILTERS,
    );

    expect(graph.nodes.length).toBeGreaterThanOrEqual(25);
    expect(graph.nodes.length).toBeLessThanOrEqual(60);
    expect(graph.edges.length).toBeGreaterThanOrEqual(25);
    expect(graph.transactions.length).toBeGreaterThanOrEqual(10);
    expect(centerNode).toMatchObject({
      id: "center-wallet",
      address: VALID_ADDRESS,
      kind: "searched-wallet",
    });
    expect(visibleEdges.length).toBe(graph.edges.length);
  });

  it("wires the routes, homepage entry, and sitemap entries", () => {
    expect(readSource("src/app/intel/page.tsx")).toContain("IntelHub");
    expect(readSource("src/app/intel/wallet/page.tsx")).toContain(
      "WalletIntelPage",
    );
    expect(readSource("src/app/intel/visualizer/page.tsx")).toContain(
      "IntelVisualizerPage",
    );
    expect(readSource("src/app/intel/visualizer/page.tsx")).toContain(
      'canonical: "/intel/visualizer"',
    );
    expect(readSource("src/app/page.tsx")).toContain('href="/intel"');
    expect(readSource("src/components/sections/site-footer.tsx")).toContain(
      'href="/intel"',
    );

    const sitemap = readSource("src/app/sitemap.ts");
    expect(sitemap).toContain('absoluteUrl("/intel")');
    expect(sitemap).toContain('absoluteUrl("/intel/wallet")');
    expect(sitemap).toContain('absoluteUrl("/intel/visualizer")');
  });

  it("keeps the polished demo flow visible in source", () => {
    const hub = readSource("src/components/intel/intel-hub.tsx");
    const wallet = readSource("src/components/intel/wallet-intel-page.tsx");
    const visualizer = readSource(
      "src/components/intel/visualizer/visualizer-page.tsx",
    );
    const visualizerTopBar = readSource(
      "src/components/intel/visualizer/visualizer-top-bar.tsx",
    );
    const routeSwitcher = readSource(
      "src/components/intel/intel-route-switcher.tsx",
    );
    const visualizerSidePanels = readSource(
      "src/components/intel/visualizer/visualizer-side-panels.tsx",
    );
    const visualizerOverlays = readSource(
      "src/components/intel/visualizer/visualizer-overlays.tsx",
    );
    const visualizerGraph = readSource(
      "src/components/intel/visualizer/visualizer-graph.tsx",
    );
    const styles = readSource("src/app/globals.css");

    expect(hub).toContain("Open demo");
    expect(hub).toContain("Open Visualizer Demo");
    expect(hub).toContain("IntelRouteSwitcher");
    expect(hub).not.toContain("xl:grid-cols-7");
    expect(wallet).toContain("Load demo wallet");
    expect(wallet).toContain("Open visualizer");
    expect(wallet).toContain('activeHref="/intel/wallet"');
    expect(wallet).toContain("Demo report status");
    expect(wallet).toContain("Local sample report ready for review.");
    expect(wallet).toContain("Animated demo relationship map");
    expect(wallet).toContain("Visual workbench");
    expect(wallet).toContain("Wallet graph");
    expect(wallet).toContain("Relationship layers");
    expect(wallet).toContain("aria-pressed");
    expect(wallet).toContain("intel-workbench-shell");
    expect(wallet).toContain("intel-edge-flow");
    expect(wallet).toContain("intel-map-depth");
    expect(routeSwitcher).toContain("Intelligence Suite sections");
    expect(routeSwitcher).toContain("variant === \"chips\"");
    expect(routeSwitcher).toContain("aria-current");
    expect(visualizer).toContain("VisualizerGraphCanvas");
    expect(visualizerTopBar).toContain("Visualizer</span>");
    expect(visualizerTopBar).toContain('activeHref="/intel/visualizer"');
    expect(visualizerSidePanels).toContain("PulseChain Visualizer");
    expect(visualizerOverlays).toContain("Transaction-volume timeline");
    expect(visualizerGraph).toContain("PulseChain visualizer demo graph");
    expect(styles).toContain(".intel-viz-canvas");
    expect(styles).toContain(".intel-viz-node-button");
    expect(styles).toContain(".intel-node-surface");
    expect(styles).toContain(".intel-edge-shadow");
    expect(styles).toContain(".intel-workbench-shell");
    expect(styles).not.toContain(`intel-${"rad"}ar-sweep`);
  });

  it("keeps new intel sources read-only and demo-data only", () => {
    const source = readIntelSources();
    const writePathPattern = new RegExp(
      [
        `${"write"}${"Contract"}`,
        `${"send"}${"Transaction"}`,
        `${"use"}${"Write"}${"Contract"}`,
        `${"use"}${"Wallet"}${"Client"}`,
        `${"use"}${"Account"}`,
        `${"use"}${"Connect"}`,
        `${"Connect"}${"Wallet"}${"Button"}`,
        `${"fetch"}\\s*\\(`,
      ].join("|"),
    );
    const executionPattern = new RegExp(
      [
        `${"server"}\\s+${"signing"}`,
        `${"server-side"}\\s+${"signing"}`,
        `${"flash"}bots`,
        `${"eth_send"}Bundle`,
        `${"eth_send"}PrivateTransaction`,
      ].join("|"),
      "i",
    );

    expect(source).toContain("No wallet connection");
    expect(source).toContain("Demo data");
    expect(source).toContain("No live fetching");
    expect(source).not.toMatch(writePathPattern);
    expect(source).not.toMatch(executionPattern);
  });

  it("does not add secret-request fields or outcome promises", () => {
    const source = readIntelSources();
    const lowerSource = source.toLowerCase();
    const blockedTerms = [
      `${"sa"}fe`,
      `${"trust"}ed`,
      `${"guarante"}ed`,
      `${"guarante"}e`,
      `${"seed"} phrase`,
      `${"private"} key`,
      "mnemonic",
      "keystore",
      `${"relay"}er`,
      "sweep",
    ];

    for (const term of blockedTerms) {
      expect(lowerSource).not.toContain(term);
    }

    expect(source).not.toMatch(new RegExp(`\\b${"A"}${"I"}\\b`));
  });
});
