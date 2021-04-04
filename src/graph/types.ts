import rough from "roughjs";
import { graphlib, Node, GraphEdge as Edge } from "dagre";

import { TreeNode } from "../dom.js";

export type RoughSVG = ReturnType<typeof rough["svg"]>;

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
