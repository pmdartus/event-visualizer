import dagre, { graphlib } from "dagre";

import { DomTree, TreeNodeType } from "../dom.js";
import { Graph, GraphEdgeType } from "./types";

const ELEMENT_NODE_WIDTH = 50;
const ELEMENT_SHADOW_ROOT_WIDTH = 110;
const NODE_HEIGHT = 50;

const HORIZONTAL_SPACING = 70;
const VERTICAL_SPACING = 50;

const GRAPH_PADDING = 20;

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
