"use client";

import { useMemo, useState } from "react";

import { VisualizerGraphCanvas } from "@/components/intel/visualizer/visualizer-graph";
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
  const validationMessage =
    validation.ok || addressInput.trim().length === 0 ? null : validation.reason;

  const applyAddress = () => {
    if (!validation.ok) return;
    setActiveAddress(validation.normalizedAddress);
    setSelectedNodeId(graph.centerNodeId);
    setSelectedEdgeId(null);
  };

  const loadDemo = () => {
    setAddressInput(DEMO_VISUALIZER_WALLET);
    setActiveAddress(DEMO_VISUALIZER_WALLET);
    setSelectedNodeId(graph.centerNodeId);
    setSelectedEdgeId(null);
  };

  const resetWorkbench = () => {
    setFilters(DEFAULT_VISUALIZER_FILTERS);
    setActiveTimeRange("30d");
    setZoomLevel(100);
    setLayoutLocked(true);
    setSelectedNodeId(graph.centerNodeId);
    setSelectedEdgeId(null);
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
        onTimeRangeChange={setActiveTimeRange}
      />
      <main className="mx-auto grid max-w-[104rem] gap-3 p-3 lg:grid-cols-[22rem_minmax(0,1fr)_22rem] lg:items-start lg:p-4">
        <section className="order-1 min-w-0 lg:order-2">
          <div className="relative">
            <VisualizerGraphCanvas
              graph={graph}
              visibleEdges={visibleEdges}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setSelectedEdgeId(null);
              }}
              onSelectEdge={(edgeId) => {
                setSelectedEdgeId(edgeId);
              }}
            />
            <VisualizerToolbar
              zoomLabel={`${zoomLevel}%`}
              layoutLocked={layoutLocked}
              onZoomIn={() => setZoomLevel((value) => Math.min(160, value + 10))}
              onZoomOut={() => setZoomLevel((value) => Math.max(70, value - 10))}
              onFit={() => setZoomLevel(100)}
              onToggleLock={() => setLayoutLocked((value) => !value)}
            />
            <VisualizerTimeline
              graph={graph}
              activeTimeRange={activeTimeRange}
              onTimeRangeChange={setActiveTimeRange}
            />
          </div>
        </section>

        <div className="order-2 grid min-w-0 gap-3 lg:order-1 lg:max-h-[calc(100dvh-7.5rem)] lg:overflow-hidden">
          <VisualizerLeftPanel
            graph={graph}
            selectedNode={selectedNode}
            transactions={visibleTransactions}
            onSelectTransaction={(edgeId) => {
              setSelectedEdgeId(edgeId);
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

        <div className="order-3 min-w-0 lg:sticky lg:top-20">
          <VisualizerDetailDrawer
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            transactions={graph.transactions}
          />
        </div>
      </main>
    </div>
  );
}
