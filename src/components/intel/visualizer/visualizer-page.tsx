"use client";

import { useMemo, useState } from "react";

import {
  VisualizerGraphCanvas,
  type VisualizerGraphCommand,
  type VisualizerGraphCommandAction,
} from "@/components/intel/visualizer/visualizer-graph";
import {
  VisualizerDetailDrawer,
  VisualizerTimeline,
  VisualizerToolbar,
} from "@/components/intel/visualizer/visualizer-overlays";
import {
  VisualizerFilterPanel,
  VisualizerLeftPanel,
} from "@/components/intel/visualizer/visualizer-side-panels";
import { VisualizerTopBar } from "@/components/intel/visualizer/visualizer-top-bar";
import {
  DEMO_VISUALIZER_WALLET,
  buildDemoVisualizerGraph,
} from "@/lib/intel/visualizer-demo";
import { validateIntelWalletAddress } from "@/lib/intel/address";
import {
  DEFAULT_VISUALIZER_FILTERS,
  filterVisualizerEdges,
  getVisualizerEdgeMap,
  getVisualizerNodeMap,
  type VisualizerFilters,
} from "@/lib/intel/visualizer-utils";

type MobileVisualizerPanel = "summary" | "filters" | "details";

export function IntelVisualizerPage() {
  const [addressInput, setAddressInput] = useState<string>(
    DEMO_VISUALIZER_WALLET,
  );
  const [activeAddress, setActiveAddress] =
    useState<`0x${string}`>(DEMO_VISUALIZER_WALLET);
  const [selectedNodeId, setSelectedNodeId] = useState<string>("center-wallet");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [filters, setFilters] = useState<VisualizerFilters>(
    DEFAULT_VISUALIZER_FILTERS,
  );
  const [activeTimeRange, setActiveTimeRange] = useState("30d");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [layoutLocked, setLayoutLocked] = useState(true);
  const [mobilePanel, setMobilePanel] =
    useState<MobileVisualizerPanel>("summary");
  const [graphCommand, setGraphCommand] =
    useState<VisualizerGraphCommand | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const validation = useMemo(
    () => validateIntelWalletAddress(addressInput),
    [addressInput],
  );
  const graph = useMemo(
    () => buildDemoVisualizerGraph(activeAddress),
    [activeAddress],
  );
  const nodeById = useMemo(() => getVisualizerNodeMap(graph), [graph]);
  const edgeById = useMemo(() => getVisualizerEdgeMap(graph), [graph]);
  const visibleEdges = useMemo(
    () => filterVisualizerEdges(graph.edges, nodeById, filters),
    [filters, graph.edges, nodeById],
  );
  const visibleEdgeIds = useMemo(
    () => new Set(visibleEdges.map((edge) => edge.id)),
    [visibleEdges],
  );
  const visibleTransactions = graph.transactions.filter((transaction) =>
    visibleEdgeIds.has(transaction.edgeId),
  );
  const selectedNode =
    nodeById.get(selectedNodeId) ??
    nodeById.get(graph.centerNodeId) ??
    graph.nodes[0];
  const selectedEdge = selectedEdgeId ? edgeById.get(selectedEdgeId) ?? null : null;
  const searchMatch = useMemo(() => {
    const query = addressInput.trim().toLowerCase();
    if (query.length < 2) return null;

    return (
      graph.nodes.find((node) => {
        const values = [
          node.label,
          node.address ?? "",
          node.kind,
          node.activityLabel,
          node.balanceLabel,
        ];

        return values.some((value) => value.toLowerCase().includes(query));
      }) ?? null
    );
  }, [addressInput, graph.nodes]);
  const validationMessage =
    validation.ok || addressInput.trim().length === 0 || searchMatch
      ? null
      : validation.reason;

  const issueGraphCommand = (action: VisualizerGraphCommandAction) => {
    setGraphCommand((current) => ({
      id: (current?.id ?? 0) + 1,
      action,
    }));
  };

  const applyAddress = () => {
    if (!validation.ok) {
      if (searchMatch) {
        setSelectedNodeId(searchMatch.id);
        setSelectedEdgeId(null);
        setInspectorOpen(true);
        issueGraphCommand("expand-selected");
      }
      return;
    }

    setActiveAddress(validation.normalizedAddress);
    setSelectedNodeId(graph.centerNodeId);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    issueGraphCommand("fit");
  };

  const loadDemo = () => {
    setAddressInput(DEMO_VISUALIZER_WALLET);
    setActiveAddress(DEMO_VISUALIZER_WALLET);
    setSelectedNodeId(graph.centerNodeId);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    issueGraphCommand("fit");
  };

  const resetWorkbench = () => {
    setFilters(DEFAULT_VISUALIZER_FILTERS);
    setActiveTimeRange("30d");
    setZoomLevel(100);
    setLayoutLocked(true);
    setSelectedNodeId(graph.centerNodeId);
    setSelectedEdgeId(null);
    setInspectorOpen(false);
    issueGraphCommand("fit");
  };

  return (
    <div className="min-h-dvh bg-pulse-bg text-pulse-text">
      <VisualizerTopBar
        addressInput={addressInput}
        onAddressInputChange={setAddressInput}
        onApplyAddress={applyAddress}
        validationMessage={validationMessage}
        activeAddress={activeAddress}
        onLoadDemo={loadDemo}
        onReset={resetWorkbench}
        activeTimeRange={activeTimeRange}
      />
      <main className="relative min-h-[calc(100dvh-6.6rem)] overflow-hidden bg-pulse-bg lg:h-[calc(100dvh-7.7rem)] lg:min-h-0">
        <section className="relative min-h-[calc(100dvh-6.6rem)] lg:h-full lg:min-h-0">
            <VisualizerGraphCanvas
              graph={graph}
              visibleEdges={visibleEdges}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setSelectedEdgeId(null);
                setInspectorOpen(true);
              }}
              onSelectEdge={(edgeId) => {
                setSelectedEdgeId(edgeId);
                setInspectorOpen(true);
              }}
              onClearSelection={() => {
                setSelectedNodeId(graph.centerNodeId);
                setSelectedEdgeId(null);
                setInspectorOpen(false);
              }}
              command={graphCommand}
              layoutLocked={layoutLocked}
            />
            <VisualizerToolbar
              zoomLabel={`${zoomLevel}%`}
              layoutLocked={layoutLocked}
              onZoomIn={() => {
                setZoomLevel((value) => Math.min(160, value + 10));
                issueGraphCommand("zoom-in");
              }}
              onZoomOut={() => {
                setZoomLevel((value) => Math.max(70, value - 10));
                issueGraphCommand("zoom-out");
              }}
              onFit={() => {
                setZoomLevel(100);
                issueGraphCommand("fit");
              }}
              onExpandSelected={() => issueGraphCommand("expand-selected")}
              onToggleLock={() => {
                setLayoutLocked((value) => !value);
                issueGraphCommand("toggle-lock");
              }}
              onExport={() => issueGraphCommand("export")}
            />
            <VisualizerTimeline
              graph={graph}
              activeTimeRange={activeTimeRange}
              onTimeRangeChange={setActiveTimeRange}
            />
          <div className="pointer-events-auto absolute left-3 top-[8.8rem] z-30 hidden w-[19rem] max-w-[calc(100vw-2rem)] lg:block">
            {leftPanelOpen ? (
              <div className="grid max-h-[calc(100dvh-25rem)] gap-2 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(false)}
                  className="justify-self-start rounded-md border border-pulse-border bg-pulse-bg/70 px-3 py-1.5 text-xs font-semibold text-pulse-muted shadow-glow backdrop-blur-xl transition hover:text-pulse-text"
                >
                  Collapse scope
                </button>
                <VisualizerLeftPanel
                  graph={graph}
                  selectedNode={selectedNode}
                  transactions={visibleTransactions}
                  onSelectTransaction={(edgeId) => {
                    setSelectedEdgeId(edgeId);
                    setInspectorOpen(true);
                  }}
                />
                <VisualizerFilterPanel
                  filters={filters}
                  onFiltersChange={(nextFilters) => {
                    setFilters(nextFilters);
                    setSelectedEdgeId(null);
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLeftPanelOpen(true)}
                className="rounded-lg border border-pulse-border bg-pulse-bg/74 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-pulse-cyan shadow-glow backdrop-blur-xl transition hover:border-pulse-cyan/45"
              >
                Wallet scope
              </button>
            )}
          </div>

          <div className="pointer-events-auto absolute right-3 top-4 z-40 hidden lg:block">
            {inspectorOpen ? (
              <div className="w-[21.5rem] max-w-[calc(100vw-2rem)]">
                <button
                  type="button"
                  onClick={() => setInspectorOpen(false)}
                  className="mb-2 rounded-md border border-pulse-border bg-pulse-bg/70 px-3 py-1.5 text-xs font-semibold text-pulse-muted shadow-glow backdrop-blur-xl transition hover:text-pulse-text"
                >
                  Close inspector
                </button>
                <VisualizerDetailDrawer
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  transactions={graph.transactions}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setInspectorOpen(true)}
                className="rounded-lg border border-pulse-border bg-pulse-bg/74 px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-pulse-cyan shadow-glow backdrop-blur-xl transition hover:border-pulse-cyan/45"
              >
                Inspector
              </button>
            )}
          </div>
        </section>

        <section className="relative z-40 min-w-0 border-t border-pulse-border bg-pulse-bg/96 p-3 lg:hidden">
          <div className="flex rounded-lg border border-pulse-border bg-pulse-panel/72 p-1">
            {[
              ["summary", "Summary"],
              ["filters", "Filters"],
              ["details", "Details"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobilePanel(id as MobileVisualizerPanel)}
                aria-pressed={mobilePanel === id}
                className={`w-1/3 rounded-md px-3 py-2 text-xs font-semibold transition ${
                  mobilePanel === id
                    ? "bg-pulse-cyan text-pulse-bg"
                    : "text-pulse-muted hover:bg-pulse-text/5 hover:text-pulse-text"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {mobilePanel === "summary" ? (
              <VisualizerLeftPanel
                graph={graph}
                selectedNode={selectedNode}
                transactions={visibleTransactions}
                onSelectTransaction={(edgeId) => {
                  setSelectedEdgeId(edgeId);
                  setMobilePanel("details");
                }}
              />
            ) : null}
            {mobilePanel === "filters" ? (
              <VisualizerFilterPanel
                filters={filters}
                onFiltersChange={(nextFilters) => {
                  setFilters(nextFilters);
                  setSelectedEdgeId(null);
                }}
              />
            ) : null}
            {mobilePanel === "details" ? (
              <VisualizerDetailDrawer
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                transactions={graph.transactions}
              />
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
