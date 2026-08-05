"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ERW_COLOUR_FAMILY_TOKENS } from "@/constants/enterprise-relationship-workspace";
import { buildRicRadialLayout } from "@/lib/contact-strategy/ric-layout";
import { listNetworkFirstLevel } from "@/lib/contact-strategy/live-registry";
import { RicFlowNode, type RicFlowNodeData } from "./ric-flow-node";

const nodeTypes = { ricContact: RicFlowNode };

function CanvasInner({
  centreContactId,
  onSelectContact,
  onOpenContactWorkspace,
  registryVersion,
}: {
  centreContactId: string | null;
  onSelectContact: (id: string) => void;
  onOpenContactWorkspace: (id: string) => void;
  registryVersion?: number;
}) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<RicFlowNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const graph = useMemo(() => {
    if (!centreContactId) return null;
    return listNetworkFirstLevel(centreContactId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreContactId, registryVersion]);

  useEffect(() => {
    if (!graph?.centre) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const layout = buildRicRadialLayout(graph.centre, graph.neighbours, graph.edges);
    const nextNodes: Node<RicFlowNodeData>[] = layout.nodes.map((n) => ({
      id: n.id,
      type: "ricContact",
      position: { x: n.x, y: n.y },
      data: { contact: n.contact, isCentre: n.isCentre },
      draggable: false,
    }));

    const nextEdges: Edge[] = layout.edges.map((e) => {
      const neighbourId = e.target === graph.centre!.id ? e.source : e.target;
      const neighbour = graph.neighbours.find((c) => c.id === neighbourId);
      const tone = neighbour
        ? ERW_COLOUR_FAMILY_TOKENS[neighbour.colourFamily]
        : ERW_COLOUR_FAMILY_TOKENS.organisation;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: "smoothstep",
        animated: true,
        style: { stroke: tone.hex, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: tone.hex, width: 16, height: 16 },
        labelStyle: { fill: "#94a3b8", fontSize: 10, fontWeight: 500 },
        labelBgStyle: { fill: "#0f172a", fillOpacity: 0.85 },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    setNodes(nextNodes);
    setEdges(nextEdges);
    const t = window.setTimeout(() => {
      void fitView({ padding: 0.12, duration: 380, maxZoom: 1.15, minZoom: 0.35 });
    }, 30);
    return () => window.clearTimeout(t);
  }, [graph, setNodes, setEdges, fitView]);

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    if (node.id === centreContactId) return;
    onSelectContact(node.id);
  };

  const onNodeDoubleClick: NodeMouseHandler = (_event, node) => {
    onOpenContactWorkspace(node.id);
  };

  if (!centreContactId) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/40">
        <p className="text-sm text-slate-400">Select a contact from the registry</p>
      </div>
    );
  }

  if (!graph?.centre) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded-xl border border-dashed border-amber-500/30 bg-slate-950/40">
        <p className="max-w-sm px-4 text-center text-sm text-amber-200/90">
          This contact is not in the live Enterprise Contact Registry.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-[#070b14]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.12, maxZoom: 1.15 }}
        minZoom={0.35}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        nodesConnectable={false}
        nodesDraggable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        className="bg-[#070b14]"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1e293b" />
        <Controls
          showInteractive={false}
          className="!border-white/10 !bg-slate-900/90 !shadow-lg [&>button]:!border-white/10 [&>button]:!bg-slate-900 [&>button]:!text-slate-200"
        />
      </ReactFlow>
    </div>
  );
}

export function RelationshipIntelligenceCanvas(props: {
  centreContactId: string | null;
  onSelectContact: (id: string) => void;
  onOpenContactWorkspace: (id: string) => void;
  registryVersion?: number;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
