import dagre, { graphlib, Node, GraphEdge as Edge } from "dagre";

import { DomTree, TreeNode } from "../simulator.js";

import {
  GRAPH_PADDING,
  HORIZONTAL_SPACING,
  ELEMENT_NODE_WIDTH,
  VERTICAL_SPACING,
  NODE_HEIGHT,
  ELEMENT_SHADOW_ROOT_WIDTH,
} from "./graph-constants.js";

export enum GraphNodeType {
  Element,
  ShadowRoot,
}

export enum GraphEdgeType {
  Child,
  ShadowRoot,
  AssignedElement,
}

interface NodeData {
  type: GraphNodeType;
  treeNode: TreeNode;
}

export type Graph = graphlib.Graph<NodeData>;
export type GraphNode = Node<NodeData>;
export type GraphEdge = Edge;

export function graphFromDomTree(domTree: DomTree): Graph {
  const graph: Graph = new graphlib.Graph({});

  graph.setGraph({
    nodesep: HORIZONTAL_SPACING,
    ranksep: VERTICAL_SPACING,
    marginx: GRAPH_PADDING,
    marginy: GRAPH_PADDING,
  });

  const treeNodeToId: Map<TreeNode, string> = new Map();

  // Insert nodes in graph
  for (let index = 0; index < domTree.nodes.length; index++) {
    const treeNode = domTree.nodes[index];

    const id = String(index);
    const type = treeNode instanceof Element ? GraphNodeType.Element : GraphNodeType.ShadowRoot;

    treeNodeToId.set(treeNode, id);
    graph.setNode(id, {
      type,
      treeNode,
      width: type === GraphNodeType.Element ? ELEMENT_NODE_WIDTH : ELEMENT_SHADOW_ROOT_WIDTH,
      height: NODE_HEIGHT,
    });
  }

  // Insert edges in graph
  for (const treeNode of domTree.nodes) {
    const id = treeNodeToId.get(treeNode)!;

    for (const childTreeNode of Array.from(treeNode.children)) {
      const childId = treeNodeToId.get(childTreeNode)!;

      graph.setEdge(id, childId, {
        type: GraphEdgeType.Child,
      });
    }

    if (treeNode instanceof HTMLSlotElement) {
      for (const assignedElement of treeNode.assignedElements()) {
        const assignedElementId = treeNodeToId.get(assignedElement)!;

        graph.setEdge(id, assignedElementId, {
          type: GraphEdgeType.AssignedElement,
        });
      }
    }

    if (treeNode instanceof ShadowRoot) {
      const hostElementId = treeNodeToId.get(treeNode.host)!;

      graph.setEdge(hostElementId, id, {
        type: GraphEdgeType.ShadowRoot,
      });
    }
  }

  // Finally layout graph
  dagre.layout(graph);

  return graph;
}
