import rough from "roughjs";

import { DomTree, EventDispatchingStep, TreeNode } from "./simulator";
import { getEventTargetLabel } from "../utils/label";

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
  x: number;
  y: number;
}

interface GraphEdge {
  type: EdgeType;
  from: GraphNodeId;
  to: GraphNodeId;
}

type Layer = GraphNodeId[];

const GRAPH_PADDING = 20;
const NODE_SIZE = 80;
const HORIZONTAL_SPACING = 50;
const VERTICAL_SPACING = 50;

const CURVE_TIGHTNESS = 0.8;

class Graph {
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

  createEdge(config: GraphEdge): GraphEdge {
    this.edges.push(config);
    return config;
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

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function graphFromDomTree(tree: DomTree): Graph {
  const graph = new Graph();

  const treeNodeToId: Map<TreeNode, string> = new Map();

  for (let index = 0; index < tree.nodes.length; index++) {
    const treeNode = tree.nodes[index];

    const id = String(index);
    const type = treeNode instanceof Element ? NodeType.Element : NodeType.ShadowRoot;

    treeNodeToId.set(treeNode, id);
    graph.createNode({
      id,
      type,
      treeNode,
    });
  }

  for (const treeNode of tree.nodes) {
    const id = treeNodeToId.get(treeNode)!;

    for (const childTreeNode of Array.from(treeNode.children)) {
      const childId = treeNodeToId.get(childTreeNode)!;

      graph.createEdge({
        from: id,
        to: childId,
        type: EdgeType.Child,
      });
    }

    if (treeNode instanceof HTMLSlotElement) {
      for (const assignedElement of treeNode.assignedElements()) {
        const assignedElementId = treeNodeToId.get(assignedElement)!;

        graph.createEdge({
          from: id,
          to: assignedElementId,
          type: EdgeType.AssignedElement,
        });
      }
    }

    if (treeNode instanceof ShadowRoot) {
      const hostElementId = treeNodeToId.get(treeNode.host)!;

      graph.createEdge({
        from: hostElementId,
        to: id,
        type: EdgeType.ShadowRoot,
      });
    }
  }

  return graph;
}

function assignGraphNodeToLayers(graph: Graph) {
  const layers: Layer[] = [];

  let remainingNodes = [...graph.nodes];
  let remainingEdges = [...graph.edges];

  while (remainingNodes.length !== 0 || remainingEdges.length !== 0) {
    const layer = remainingNodes
      .filter((node) => remainingEdges.every((edge) => edge.to !== node.id))
      .map((node) => node.id);

    remainingNodes = remainingNodes.filter((node) => !layer.includes(node.id));
    remainingEdges = remainingEdges.filter((edge) => !layer.includes(edge.from));

    layers.push(layer);
  }

  graph.layers = layers;
}

function fillLayers(graph: Graph) {
  let currentId = 0;

  for (let i = 0; i < graph.layers.length - 1; i++) {
    const layer = graph.layers[i];
    const nextLayer = graph.layers[i + 1];

    for (const nodeId of layer) {
      const outgoingEdges = graph.getOutgoingEdges(nodeId);

      for (const outgoingEdge of outgoingEdges) {
        if (!nextLayer.includes(outgoingEdge.to)) {
          const virtualId = `#${currentId++}`;

          graph.createNode({
            id: virtualId,
            type: NodeType.Virtual,
            treeNode: null,
          });
          nextLayer.push(virtualId);

          graph.createEdge({
            from: virtualId,
            to: outgoingEdge.to,
            type: outgoingEdge.type,
          });
          outgoingEdge.to = virtualId;
        }
      }
    }
  }
}

function updateNodeCoordinates(graph: Graph) {
  const { nodes, layers } = graph;

  for (const node of nodes) {
    const layerIndex = graph.getLayer(node.id);
    const indexInLayer = layers[layerIndex].indexOf(node.id);

    node.x = (NODE_SIZE + HORIZONTAL_SPACING) * indexInLayer;
    node.y = (NODE_SIZE + VERTICAL_SPACING) * layerIndex;
  }

  for (let layerIndex = 0; layerIndex < graph.layers.length; layerIndex += 2) {
    const layer = graph.layers[layerIndex];
    for (const nodeId of layer) {
      const node = graph.getNode(nodeId)!;
      const children = [
        ...graph.getIncomingEdges(nodeId).map((edge) => graph.getNode(edge.from)!),
        ...graph.getOutgoingEdges(nodeId).map((edge) => graph.getNode(edge.to)!),
      ];

      const xMean = children.reduce((acc, child) => acc + child.x, 0) / children.length;
      node.x = xMean;
    }
  }
  // for (const layer of layers) {
  // }

  // for (const layer of layers.reverse()) {
  //   for (const nodeId of layer) {
  //     const node = graph.getNode(nodeId)!;
  //     const children = [
  //       ...graph.getIncomingEdges(nodeId).map((edge) => graph.getNode(edge.from)!),
  //       ...graph.getOutgoingEdges(nodeId).map((edge) => graph.getNode(edge.to)!),
  //     ];

  //     const xMean = children.reduce((acc, child) => acc + child.x, 0) / children.length;
  //     node.x = xMean;
  //   }
  // }

  console.log(nodes);
}

function layoutGraph(graph: Graph) {
  assignGraphNodeToLayers(graph);
  fillLayers(graph);
  updateNodeCoordinates(graph);
}

function renderGraph(graph: Graph, root: SVGSVGElement) {
  const { nodes, edges } = graph;

  const rc = rough.svg(root);

  const nodesContainer = createSvgElement("g");
  root.appendChild(nodesContainer);

  for (const node of nodes) {
    if (node.type !== NodeType.Virtual) {
      const rect = rc.rectangle(node.x, node.y, NODE_SIZE, NODE_SIZE);
      rect.setAttribute("data-graph-id", node.id);

      rect.classList.add("node");
      if (node.type === NodeType.Element) {
        rect.classList.add("node__element");
      } else if (node.type === NodeType.ShadowRoot) {
        rect.classList.add("node__shadow-root");
      }

      nodesContainer.appendChild(rect);

      const text = createSvgElement("text");
      text.setAttribute("x", String(node.x + NODE_SIZE / 2));
      text.setAttribute("y", String(node.y + NODE_SIZE / 2));
      text.setAttribute("alignment-baseline", "central");
      text.setAttribute("text-anchor", "middle");

      text.classList.add("node-label");
      text.textContent = getEventTargetLabel(node.treeNode!);

      nodesContainer.appendChild(text);
    }
  }

  const edgesContainer = createSvgElement("g");
  root.appendChild(edgesContainer);

  for (const edge of edges) {
    const fromNode = graph.getNode(edge.from)!;
    const toNode = graph.getNode(edge.to)!;

    let line: SVGElement | undefined;
    if (fromNode.type !== NodeType.Virtual && toNode.type !== NodeType.Virtual) {
      line = rc.line(
        fromNode.x + NODE_SIZE / 2,
        fromNode.y + NODE_SIZE,
        toNode.x + NODE_SIZE / 2,
        toNode.y
      );
    } else if (fromNode.type !== NodeType.Virtual) {
      const points: [number, number][] = [];

      points.push([fromNode.x + NODE_SIZE / 2, fromNode.y + NODE_SIZE]);

      let currentToNode = toNode;
      while (currentToNode.type === NodeType.Virtual) {
        points.push([currentToNode.x + NODE_SIZE / 2, currentToNode.y + NODE_SIZE / 2]);

        const followingEdge = graph.getOutgoingEdges(currentToNode.id)[0];
        currentToNode = graph.getNode(followingEdge.to)!;
      }

      points.push([currentToNode.x + NODE_SIZE / 2, currentToNode.y]);

      line = rc.curve(points, {
        curveTightness: CURVE_TIGHTNESS,
      });
    }

    if (line) {
      line.classList.add("connection");
      if (edge.type === EdgeType.Child) {
        line.classList.add("connection__child");
      } else if (edge.type === EdgeType.ShadowRoot) {
        line.classList.add("connection__shadow-root");
      } else if (edge.type === EdgeType.AssignedElement) {
        line.classList.add("connection__assigned-element");
      }

      edgesContainer.appendChild(line);
    }
  }

  const nodeContainerClientRect = nodesContainer.getBoundingClientRect();
  root.setAttribute(
    "viewBox",
    `${-GRAPH_PADDING} ${-GRAPH_PADDING} ${Math.round(
      nodeContainerClientRect.width + GRAPH_PADDING
    )} ${Math.round(nodeContainerClientRect.height + GRAPH_PADDING)}`
  );
}

export class GraphRenderer {
  private root: SVGSVGElement;
  private graph: Graph = new Graph();

  constructor({ root }: { root: SVGSVGElement }) {
    this.root = root;
  }

  setTree(tree: DomTree) {
    this.root.innerHTML = "";

    this.graph = graphFromDomTree(tree);
    layoutGraph(this.graph);

    renderGraph(this.graph, this.root);
  }

  setStep(step: EventDispatchingStep) {
    const { root, graph } = this;
    const { target, currentTarget, composedPath } = step;

    for (const svgNode of Array.from(root.querySelectorAll(".node"))) {
      const graphId = svgNode.getAttribute("data-graph-id");
      const graphNode = graph.nodes.find((node) => node.id === graphId)!;

      if (graphNode.treeNode === target) {
        svgNode.classList.add("node__target");
      } else {
        svgNode.classList.remove("node__target");
      }

      if (graphNode.treeNode === currentTarget) {
        svgNode.classList.add("node__current-target");
      } else {
        svgNode.classList.remove("node__current-target");
      }

      if (composedPath.includes(graphNode.treeNode!)) {
        svgNode.classList.add("node__composed-path");
      } else {
        svgNode.classList.remove("node__composed-path");
      }
    }
  }
}
