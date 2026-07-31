import dagre from "dagre";
import { MarkerType, Position } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import type {
  FamilyTreeEdge,
  FamilyTreeNode,
  FamilyTreeResponse,
} from "@/types";

const MEMBER_WIDTH = 214;
const MEMBER_HEIGHT = 148;
const DECEASED_WIDTH = 232;
const DECEASED_HEIGHT = 118;
const UNION_WIDTH = 56;
const UNION_HEIGHT = 26;

export type TreeFlowNodeData = Record<string, unknown> & {
  treeNode: FamilyTreeNode;
  locale: "en" | "ar";
  selected: boolean;
  totalPropertyShares: number;
};

export type TreeFlowEdgeData = Record<string, unknown> & {
  treeEdge: FamilyTreeEdge;
};

export function buildFlowTree(
  tree: FamilyTreeResponse,
  locale: "en" | "ar",
  selectedId?: string,
  totalPropertyShares = 0,
): {
  nodes: Node<TreeFlowNodeData>[];
  edges: Edge<TreeFlowEdgeData>[];
} {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    ranksep: 86,
    nodesep: 52,
    marginx: 30,
    marginy: 30,
  });

  for (const node of tree.nodes) {
    const { width, height } = dimensionsFor(node);
    graph.setNode(node.id, { width, height });
  }

  for (const edge of tree.edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  const nodes = tree.nodes.map((treeNode): Node<TreeFlowNodeData> => {
    const graphNode = graph.node(treeNode.id) as
      | { x: number; y: number }
      | undefined;
    const { width, height } = dimensionsFor(treeNode);

    return {
      id: treeNode.id,
      type:
        treeNode.type === "DECEASED"
          ? "deceasedTreeNode"
          : treeNode.type === "FAMILY_UNION"
            ? "familyUnionNode"
            : "memberTreeNode",
      position: {
        x: (graphNode?.x ?? 0) - width / 2,
        y: (graphNode?.y ?? 0) - height / 2,
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        treeNode,
        locale,
        selected: selectedId === treeNode.id,
        totalPropertyShares,
      },
      draggable: false,
    };
  });

  const edges = tree.edges.map((treeEdge): Edge<TreeFlowEdgeData> => {
    return {
      id: treeEdge.id,
      source: treeEdge.source,
      target: treeEdge.target,
      type: "smoothstep",
      data: { treeEdge },
      style: {
        stroke: edgeColor(treeEdge.type),
        strokeWidth: treeEdge.type === "SPOUSE" ? 2.8 : 2.4,
      },
      markerEnd:
        treeEdge.type === "SPOUSE"
          ? undefined
          : {
              type: MarkerType.ArrowClosed,
              width: 14,
              height: 14,
              color: edgeColor(treeEdge.type),
            },
      animated: treeEdge.type === "SPOUSE",
      zIndex: 5,
    };
  });

  return { nodes, edges };
}

function dimensionsFor(node: FamilyTreeNode) {
  if (node.type === "DECEASED") {
    return { width: DECEASED_WIDTH, height: DECEASED_HEIGHT };
  }
  if (node.type === "FAMILY_UNION") {
    return { width: UNION_WIDTH, height: UNION_HEIGHT };
  }
  return { width: MEMBER_WIDTH, height: MEMBER_HEIGHT };
}

function edgeColor(type: FamilyTreeEdge["type"]) {
  if (type === "SPOUSE") return "#b7791f";
  if (type === "FAMILY_CHILD") return "#2563eb";
  if (type === "PARENT") return "#0f766e";
  return "#64748b";
}
