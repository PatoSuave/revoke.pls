"use client";

import { useEffect, useMemo } from "react";
import {
  SigmaContainer,
  useCamera,
  useLoadGraph,
  useRegisterEvents,
  useSetSettings,
  useSigma,
} from "@react-sigma/core";
import { MultiDirectedGraph } from "graphology";
import type {
  NodeHoverDrawingFunction,
  NodeLabelDrawingFunction,
} from "sigma/rendering";
import type { Settings } from "sigma/settings";

import type { VisualizerGraphCommand } from "@/components/intel/visualizer/visualizer-graph";
import {
  VISUALIZER_DIMMED_COLOR,
  type VisualizerSigmaEdgeAttributes,
  type VisualizerSigmaGraph,
  type VisualizerSigmaNodeAttributes,
} from "@/lib/intel/visualizer-graphology";

export interface SigmaGraphCanvasClientProps {
  sigmaGraph: VisualizerSigmaGraph;
  selectedNodeId: string;
  selectedEdgeId: string | null;
  hoveredNodeId: string | null;
  hoveredEdgeId: string | null;
  relatedNodeIds: ReadonlySet<string>;
  activeEdgeIds: ReadonlySet<string>;
  onSelectNode: (nodeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
  onClearSelection: () => void;
  onHoverNode: (nodeId: string | null) => void;
  onHoverEdge: (edgeId: string | null) => void;
  command: VisualizerGraphCommand | null;
  layoutLocked: boolean;
}

const drawDarkNodeLabel: NodeLabelDrawingFunction<
  VisualizerSigmaNodeAttributes,
  VisualizerSigmaEdgeAttributes
> = (context, data, settings) => {
  if (!data.label) return;

  const fontSize = settings.labelSize;
  const label = String(data.label);
  context.font = `${settings.labelWeight} ${fontSize}px ${settings.labelFont}`;
  const width = context.measureText(label).width + 16;
  const height = fontSize + 9;
  const x = data.x + data.size + 8;
  const y = data.y - height / 2;

  context.save();
  context.fillStyle = "rgba(8, 10, 22, 0.78)";
  context.strokeStyle = "rgba(69, 242, 255, 0.22)";
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, width, height, 6);
  context.fill();
  context.stroke();
  context.fillStyle = "#f6f7ff";
  context.fillText(label, x + 8, y + fontSize + 1);
  context.restore();
};

const drawDarkNodeHover: NodeHoverDrawingFunction<
  VisualizerSigmaNodeAttributes,
  VisualizerSigmaEdgeAttributes
> = (context, data, settings) => {
  drawDarkNodeLabel(context, data, settings);
};

const SIGMA_SETTINGS: Partial<
  Settings<VisualizerSigmaNodeAttributes, VisualizerSigmaEdgeAttributes>
> = {
  allowInvalidContainer: true,
  autoCenter: true,
  autoRescale: true,
  cameraPanBoundaries: {
    tolerance: 0.28,
    boundaries: {
      x: [-7.5, 7.5],
      y: [-6.5, 6.5],
    },
  },
  defaultEdgeColor: "#dfe4ff",
  defaultEdgeType: "arrow",
  defaultDrawNodeHover: drawDarkNodeHover,
  defaultDrawNodeLabel: drawDarkNodeLabel,
  defaultNodeColor: "#e8e9ff",
  enableEdgeEvents: true,
  hideEdgesOnMove: false,
  hideLabelsOnMove: false,
  labelColor: { color: "#f6f7ff" },
  labelDensity: 0.08,
  labelFont: "var(--font-geist-sans)",
  labelRenderedSizeThreshold: 10,
  labelSize: 11,
  maxCameraRatio: 3.2,
  minCameraRatio: 0.12,
  minEdgeThickness: 1.2,
  renderEdgeLabels: false,
  renderLabels: true,
  stagePadding: 58,
  zIndex: true,
};

export function SigmaGraphCanvasClient(props: SigmaGraphCanvasClientProps) {
  return (
    <SigmaContainer
      className="intel-viz-sigma-stage"
      graph={MultiDirectedGraph}
      settings={SIGMA_SETTINGS}
    >
      <SigmaGraphController {...props} />
    </SigmaContainer>
  );
}

function SigmaGraphController({
  sigmaGraph,
  selectedNodeId,
  selectedEdgeId,
  hoveredNodeId,
  hoveredEdgeId,
  relatedNodeIds,
  activeEdgeIds,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  onHoverNode,
  onHoverEdge,
  command,
  layoutLocked,
}: SigmaGraphCanvasClientProps) {
  const loadGraph = useLoadGraph<
    VisualizerSigmaNodeAttributes,
    VisualizerSigmaEdgeAttributes
  >();
  const registerEvents = useRegisterEvents<
    VisualizerSigmaNodeAttributes,
    VisualizerSigmaEdgeAttributes
  >();
  const setSettings = useSetSettings<
    VisualizerSigmaNodeAttributes,
    VisualizerSigmaEdgeAttributes
  >();
  const sigma = useSigma<
    VisualizerSigmaNodeAttributes,
    VisualizerSigmaEdgeAttributes
  >();
  const { gotoNode, reset, zoomIn, zoomOut } = useCamera();
  const hasFocus =
    hoveredNodeId !== null || hoveredEdgeId !== null || selectedEdgeId !== null;

  const reducerSettings = useMemo<
    Partial<
      Settings<VisualizerSigmaNodeAttributes, VisualizerSigmaEdgeAttributes>
    >
  >(
    () => ({
      edgeReducer: (edge, data) => {
        if (data.hidden) return { ...data, hidden: true };

        const active = activeEdgeIds.has(edge);
        const selected = selectedEdgeId === edge || hoveredEdgeId === edge;
        const dimmed = hasFocus && !active && !selected;

        if (selected) {
          return {
            ...data,
            color: data.status === "elevated" ? "#ff4d6d" : data.color,
            forceLabel: false,
            hidden: false,
            size: data.size + 2.4,
            zIndex: 30,
          };
        }

        if (active) {
          return {
            ...data,
            forceLabel: false,
            hidden: false,
            size: data.size + 1.15,
            zIndex: data.zIndex + 8,
          };
        }

        if (dimmed) {
          return {
            ...data,
            color: VISUALIZER_DIMMED_COLOR,
            forceLabel: false,
            hidden: false,
            size: Math.max(0.45, data.size * 0.42),
            zIndex: 1,
          };
        }

        return { ...data, forceLabel: false };
      },
      enableCameraPanning: true,
      enableCameraRotation: false,
      enableCameraZooming: true,
      nodeReducer: (node, data) => {
        if (data.hidden) return { ...data, hidden: true };

        const selected = selectedNodeId === node || hoveredNodeId === node;
        const related = relatedNodeIds.has(node);
        const dimmed = hasFocus && !related && !selected;

        if (selected) {
          return {
            ...data,
            forceLabel: true,
            hidden: false,
            highlighted: true,
            size: data.kind === "searched-wallet" ? data.size + 7 : data.size + 4,
            zIndex: 40,
          };
        }

        if (related) {
          return {
            ...data,
            forceLabel:
              data.kind === "searched-wallet" ||
              hoveredNodeId === node ||
              selectedNodeId === node,
            hidden: false,
            highlighted: false,
            size: data.size + 1.25,
            zIndex: data.zIndex + 10,
          };
        }

        if (dimmed) {
          return {
            ...data,
            color: VISUALIZER_DIMMED_COLOR,
            forceLabel: false,
            hidden: false,
            highlighted: false,
            size: Math.max(2.4, data.size * 0.44),
            zIndex: 1,
          };
        }

        return {
          ...data,
          forceLabel: data.kind === "searched-wallet",
          label: data.kind === "searched-wallet" ? data.label : null,
        };
      },
    }),
    [
      activeEdgeIds,
      hasFocus,
      hoveredEdgeId,
      hoveredNodeId,
      relatedNodeIds,
      selectedEdgeId,
      selectedNodeId,
    ],
  );

  useEffect(() => {
    loadGraph(sigmaGraph, true);
    reset({ duration: 260 });
  }, [loadGraph, reset, sigmaGraph]);

  useEffect(() => {
    registerEvents({
      clickEdge: ({ edge }) => onSelectEdge(edge),
      clickNode: ({ node }) => onSelectNode(node),
      clickStage: () => onClearSelection(),
      enterEdge: ({ edge }) => onHoverEdge(edge),
      enterNode: ({ node }) => onHoverNode(node),
      leaveEdge: () => onHoverEdge(null),
      leaveNode: () => onHoverNode(null),
    });
  }, [
    onHoverEdge,
    onHoverNode,
    onClearSelection,
    onSelectEdge,
    onSelectNode,
    registerEvents,
  ]);

  useEffect(() => {
    setSettings(reducerSettings);
    sigma.refresh();
  }, [reducerSettings, setSettings, sigma]);

  useEffect(() => {
    if (!command) return;

    if (command.action === "zoom-in") {
      zoomIn({ duration: 220, factor: 1.45 });
      return;
    }

    if (command.action === "zoom-out") {
      zoomOut({ duration: 220, factor: 1.45 });
      return;
    }

    if (command.action === "fit") {
      reset({ duration: 300 });
      return;
    }

    if (command.action === "expand-selected") {
      if (selectedNodeId && sigmaGraph.hasNode(selectedNodeId)) {
        gotoNode(selectedNodeId, { duration: 320 });
      } else {
        reset({ duration: 300 });
      }
      return;
    }

    if (command.action === "toggle-lock" && !layoutLocked) {
      reset({ duration: 260 });
      return;
    }

    if (command.action === "export") {
      reset({ duration: 240 });
    }
  }, [
    command,
    gotoNode,
    layoutLocked,
    reset,
    selectedNodeId,
    sigmaGraph,
    zoomIn,
    zoomOut,
  ]);

  return null;
}
