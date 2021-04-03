import dagre, { graphlib, Node, GraphEdge as Edge } from "dagre";

import { DomTree, TreeNode, TreeNodeType } from "../dom.js";

import {
  GRAPH_PADDING,
  HORIZONTAL_SPACING,
  ELEMENT_NODE_WIDTH,
  VERTICAL_SPACING,
  NODE_HEIGHT,
  ELEMENT_SHADOW_ROOT_WIDTH,
} from "./constants.js";

export enum GraphEdgeType {
  Child,
  ShadowRoot,
  AssignedElement,
}

interface NodeData {
  treeNode: TreeNode;
}

export type Graph = graphlib.Graph<NodeData>;
export type GraphNode = Node<NodeData>;
export type GraphEdge = Edge;

export function graphFromDomTree(tree: DomTree): Graph {
  const graph: Graph = new graphlib.Graph({});

  graph.setGraph({
    nodesep: HORIZONTAL_SPACING,
    ranksep: VERTICAL_SPACING,
    marginx: GRAPH_PADDING,
    marginy: GRAPH_PADDING,
  });

  for (const treeNode of tree.nodes) {
    const { id, type, domNode } = treeNode;

    graph.setNode(id, {
      treeNode,
      width: type === TreeNodeType.Element ? ELEMENT_NODE_WIDTH : ELEMENT_SHADOW_ROOT_WIDTH,
      height: NODE_HEIGHT,
    });

    for (const childDomNode of Array.from(domNode.children)) {
      const childTreeNode = tree.getTreeNodeByDomNode(childDomNode)!;

      graph.setEdge(id, childTreeNode.id, {
        type: GraphEdgeType.Child,
      });
    }

    if (domNode instanceof HTMLSlotElement) {
      for (const assignedElementDomNode of domNode.assignedElements()) {
        const assignedElementTreeNode = tree.getTreeNodeByDomNode(assignedElementDomNode)!;

        graph.setEdge(id, assignedElementTreeNode.id, {
          type: GraphEdgeType.AssignedElement,
        });
      }
    }

    if (domNode instanceof ShadowRoot) {
      const hostElementTreeNode = tree.getTreeNodeByDomNode(domNode.host)!;

      graph.setEdge(hostElementTreeNode.id, id, {
        type: GraphEdgeType.ShadowRoot,
      });
    }
  }

  dagre.layout(graph);

  return graph;
}
