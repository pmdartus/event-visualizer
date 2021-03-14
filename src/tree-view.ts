import { getEventTargetLabel } from "./utils/label";
import { EventDispatchingStep, DomTree, TreeNode } from "./simulator";

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
  x: number;
  y: number;
}

interface GraphEdge {
  type: EdgeType;
  from: GraphNodeId;
  to: GraphNodeId;
}

interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layers: Layer[];
}

type Layer = GraphNodeId[];

const NODE_SIZE = 80;
const HORIZONTAL_SPACING = 50;
const VERTICAL_SPACING = 50;

const TREE_VIEW: SVGElement = document.querySelector("#tree-view")!;

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function createGraphNode(config: Omit<GraphNode, "x" | "y">): GraphNode {
  return {
    ...config,
    x: 0,
    y: 0,
  };
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
    graphNodes.push(
      createGraphNode({
        id,
        type,
        treeNode,
      })
    );
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
    layers: [],
  };
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
  const { nodes, edges, layers } = graph;

  let currentId = 0;

  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const nextLayer = layers[i + 1];

    for (const nodeId of layer) {
      const outgoingEdges = edges.filter((edge) => edge.from === nodeId);

      for (const outgoingEdge of outgoingEdges) {
        if (!nextLayer.includes(outgoingEdge.to)) {
          const virtualId = `#${currentId++}`;

          nodes.push(
            createGraphNode({
              id: virtualId,
              type: NodeType.Virtual,
              treeNode: null,
            })
          );
          nextLayer.push(virtualId);

          edges.push({
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

function layoutGraphNodes(graph: Graph) {
  const { nodes, layers } = graph;

  TREE_VIEW.innerHTML = "";

  for (const node of nodes) {
    const layerIndex = layers.findIndex((layer) => layer.includes(node.id));
    const indexInLayer = layers[layerIndex].indexOf(node.id);

    node.x = (NODE_SIZE + HORIZONTAL_SPACING) * indexInLayer;
    node.y = (NODE_SIZE + VERTICAL_SPACING) * layerIndex;
  }
}

function renderGraph(graph: Graph) {
  const { nodes, edges } = graph;

  for (const node of nodes) {
    if (node.type !== NodeType.Virtual) {
      const rect = createSvgElement("rect");
      rect.setAttribute("width", String(NODE_SIZE));
      rect.setAttribute("height", String(NODE_SIZE));
      rect.setAttribute("x", String(node.x));
      rect.setAttribute("y", String(node.y));
      rect.setAttribute("data-graph-id", node.id);

      rect.classList.add("node");
      if (node.type === NodeType.Element) {
        rect.classList.add("node__element");
      } else if (node.type === NodeType.ShadowRoot) {
        rect.classList.add("node__shadow-root");
      }

      TREE_VIEW.appendChild(rect);

      const text = createSvgElement("text");
      text.setAttribute("x", String(node.x + NODE_SIZE / 2));
      text.setAttribute("y", String(node.y + NODE_SIZE / 2));
      text.setAttribute("alignment-baseline", "central");
      text.setAttribute("text-anchor", "middle");

      text.classList.add("node-label");
      text.textContent = getEventTargetLabel(node.treeNode!);

      TREE_VIEW.appendChild(text);
    }
  }

  for (const edge of edges) {
    const fromNode = nodes.find((node) => node.id === edge.from)!;
    const toNode = nodes.find((node) => node.id === edge.to)!;

    const line = createSvgElement("line");
    line.setAttribute("x1", String(fromNode.x + NODE_SIZE / 2));
    line.setAttribute(
      "y1",
      String(
        fromNode.type === NodeType.Virtual ? fromNode.y + NODE_SIZE / 2 : fromNode.y + NODE_SIZE
      )
    );
    line.setAttribute("x2", String(toNode.x + NODE_SIZE / 2));
    line.setAttribute(
      "y2",
      String(toNode.type === NodeType.Virtual ? toNode.y + NODE_SIZE / 2 : toNode.y)
    );

    line.classList.add("connection");
    if (edge.type === EdgeType.Child) {
      line.classList.add("connection__child");
    } else if (edge.type === EdgeType.ShadowRoot) {
      line.classList.add("connection__shadow-root");
    } else if (edge.type === EdgeType.AssignedElement) {
      line.classList.add("connection__assigned-element");
    }

    TREE_VIEW.appendChild(line);
  }
}

export function init() {
  let graph: Graph;

  function resetTreeView(tree: DomTree) {
    graph = graphFromDomTree(tree);

    assignGraphNodeToLayers(graph);
    fillLayers(graph);
    layoutGraphNodes(graph);
    renderGraph(graph);
  }

  function setEventDispatchingStep(step: EventDispatchingStep) {
    const { target, currentTarget, composedPath } = step;

    for (const svgNode of Array.from(TREE_VIEW.querySelectorAll(".node"))) {
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

  return {
    resetTreeView,
    setEventDispatchingStep,
  };
}
