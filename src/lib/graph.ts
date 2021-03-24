import { DomTree, TreeNode } from "./simulator";

export type GraphNodeId = string;

export enum GraphNodeType {
  Element,
  ShadowRoot,
  Virtual,
}

export enum GraphEdgeType {
  Child,
  ShadowRoot,
  AssignedElement,
}

export type Point = [number, number];

export interface GraphNode {
  id: GraphNodeId;
  type: GraphNodeType;
  treeNode: TreeNode | null;
  x: number;
  y: number;
}

export interface GraphEdge {
  type: GraphEdgeType;
  from: GraphNodeId;
  to: GraphNodeId;
  path: Point[];
}

export type Layer = GraphNodeId[];

export class Graph {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  layers: Layer[] = [];

  createNode(config: Omit<GraphNode, "x" | "y">): GraphNode {
    const node = {
      ...config,
      x: 0,
      y: 0,
    };

    this.nodes.push(node);
    return node;
  }

  createEdge(config: Omit<GraphEdge, "path">): GraphEdge {
    const edge = {
      ...config,
      path: [],
    };

    this.edges.push(edge);
    return edge;
  }

  getNode(id: GraphNodeId): GraphNode | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getOutgoingEdges(id: GraphNodeId): GraphEdge[] {
    return this.edges.filter((edge) => edge.from === id);
  }

  getIncomingEdges(id: GraphNodeId): GraphEdge[] {
    return this.edges.filter((edge) => edge.to === id);
  }

  getLayer(id: GraphNodeId): number {
    return this.layers.findIndex((layer) => layer.includes(id));
  }
}

export function graphFromDomTree(domTree: DomTree): Graph {
  const graph = new Graph();

  const treeNodeToId: Map<TreeNode, string> = new Map();

  for (let index = 0; index < domTree.nodes.length; index++) {
    const treeNode = domTree.nodes[index];

    const id = String(index);
    const type = treeNode instanceof Element ? GraphNodeType.Element : GraphNodeType.ShadowRoot;

    treeNodeToId.set(treeNode, id);
    graph.createNode({
      id,
      type,
      treeNode,
    });
  }

  for (const treeNode of domTree.nodes) {
    const id = treeNodeToId.get(treeNode)!;

    for (const childTreeNode of Array.from(treeNode.children)) {
      const childId = treeNodeToId.get(childTreeNode)!;

      graph.createEdge({
        from: id,
        to: childId,
        type: GraphEdgeType.Child,
      });
    }

    if (treeNode instanceof HTMLSlotElement) {
      for (const assignedElement of treeNode.assignedElements()) {
        const assignedElementId = treeNodeToId.get(assignedElement)!;

        graph.createEdge({
          from: id,
          to: assignedElementId,
          type: GraphEdgeType.AssignedElement,
        });
      }
    }

    if (treeNode instanceof ShadowRoot) {
      const hostElementId = treeNodeToId.get(treeNode.host)!;

      graph.createEdge({
        from: hostElementId,
        to: id,
        type: GraphEdgeType.ShadowRoot,
      });
    }
  }

  return graph;
}
