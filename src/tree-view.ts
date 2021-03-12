import { DomTree, TreeNode } from "./main";
import { Preset } from "./presets";
import { getTreeNodeLabel } from "./utils";

import "./tree-view.css";

// https://blog.disy.net/sugiyama-method/
// http://www.graphviz.org/Documentation/TSE93.pdf
// https://publications.lib.chalmers.se/records/fulltext/161388.pdf
// https://i11www.iti.kit.edu/_media/teaching/winter2016/graphvis/graphvis-ws16-v8.pdf

type GraphNodeId = string;

enum NodeType {
  Element,
  ShadowRoot,
  Virtual,
}

enum EdgeType {
  Child,
  ShadowRoot,
  AssignedElement,
}

interface GraphNode {
  id: GraphNodeId;
  type: NodeType;
  treeNode: TreeNode | null;
}

interface GraphEdge {
  type: EdgeType;
  from: GraphNodeId;
  to: GraphNodeId;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const NODE_SIZE = 60;
const NODE_MARGIN = 20;

const TREE_VIEW: SVGElement = document.querySelector("#tree-view")!;

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function graphFromDomTree(tree: DomTree): Graph {
  const graphNodes: GraphNode[] = [];
  const graphEdges: GraphEdge[] = [];

  const treeNodeToId: Map<TreeNode, string> = new Map();


  for (let index = 0; index < tree.nodes.length; index++) {
    const treeNode = tree.nodes[index];

    const id = String(index);
    const type = treeNode instanceof Element ? NodeType.Element : NodeType.ShadowRoot;

    treeNodeToId.set(treeNode, id);
    graphNodes.push({
      id,
      type,
      treeNode,
    });
  }


  for (const treeNode of tree.nodes) {
    const id = treeNodeToId.get(treeNode)!;

    for (const childTreeNode of Array.from(treeNode.children)) {
      const childId = treeNodeToId.get(childTreeNode)!;

      graphEdges.push({
        from: id,
        to: childId,
        type: EdgeType.Child,
      });
    }

    if (treeNode instanceof HTMLSlotElement) {
      for (const assignedElement of treeNode.assignedElements()) {
        const assignedElementId = treeNodeToId.get(assignedElement)!;

        graphEdges.push({
          from: id,
          to: assignedElementId,
          type: EdgeType.AssignedElement,
        });
      }
    }

    if (treeNode instanceof ShadowRoot) {
      const hostElementId = treeNodeToId.get(treeNode.host)!;

      graphEdges.push({
        from: hostElementId,
        to: id,
        type: EdgeType.ShadowRoot,
      });
    }
  }

  return {
    nodes: graphNodes,
    edges: graphEdges,
  };
}

function assignGraphNodeToLayers(graph: Graph): string[][] {
  const layers: string[][] = [];

  let remainingNodes = [...graph.nodes];
  let remainingEdges = [...graph.edges];

  while (remainingNodes.length !== 0 || remainingEdges.length !== 0) {
    const layer = remainingNodes
      .filter(node => remainingEdges.every(edge => edge.to !== node.id))
      .map(node => node.id);

    remainingNodes = remainingNodes.filter(node => !layer.includes(node.id));
    remainingEdges = remainingEdges.filter(edge => !layer.includes(edge.from));

    layers.push(layer);
  }

  return layers;
}

function fillLayers(graph: Graph, layers: string[][]) {
  let currentId = 0; 

  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const nextLayer = layers[i + 1];

    for (const nodeId of layer) {
      const outgoingEdges = graph.edges.filter(edge => edge.from === nodeId);

      for (const outgoingEdge of outgoingEdges) {
        if (!nextLayer.includes(outgoingEdge.to)) {
          const virtualId = `#${currentId++}`;

          graph.nodes.push({
            id: virtualId,
            type: NodeType.Virtual,
            treeNode: null,
          });
          nextLayer.push(virtualId);

          graph.edges.push({
            from: virtualId,
            to: outgoingEdge.to,
            type: outgoingEdge.type
          });
          outgoingEdge.to = virtualId;
        }
      }
    }
  }
}

function reorderLayers(graph: Graph, layers: string[][]) {

}

export function init() {
  function resetTreeView(preset: Preset, tree: DomTree) {
    TREE_VIEW.innerHTML = "";

    const graph = graphFromDomTree(tree);
    const layers = assignGraphNodeToLayers(graph);
    fillLayers(graph, layers);
    reorderLayers(graph, layers);

    console.log('>> graph:', graph);
    
    console.log('>> layers: ', layers);

    for (let index = 0; index < tree.nodes.length; index++) {
      const node = tree.nodes[index];

      const rect = createSvgElement("rect");
      rect.setAttribute("class", "dom-element");
      rect.setAttribute("x", String(index * (NODE_SIZE + NODE_MARGIN)));
      rect.setAttribute("y", "0");

      TREE_VIEW.appendChild(rect);

      const text = createSvgElement("text");
      text.setAttribute("x", String(index * (NODE_SIZE + NODE_MARGIN) + NODE_SIZE / 2));
      text.setAttribute("y", String(NODE_SIZE / 2));
      text.setAttribute("alignment-baseline", "central");
      text.setAttribute("text-anchor", "middle");
      text.textContent = getTreeNodeLabel(node);

      TREE_VIEW.appendChild(text);
    }
  }

  return {
    resetTreeView,
  };
}
