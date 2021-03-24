import rough from "roughjs";

import { DomTree, EventDispatchingStep, TreeNode } from "./simulator";
import { RoughSVG } from "roughjs/bin/svg";

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

type Point = [number, number];

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
  path: Point[];
}

type Layer = GraphNodeId[];

const GRAPH_PADDING = 20;
const NODE_SIZE = 50;
const SHADOW_TREE_PADDING = 10;
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

function assignToLayers(graph: Graph) {
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

function updateCoordinates(graph: Graph) {
  const { nodes, layers } = graph;

  // Give initial node coordinates
  for (const node of nodes) {
    const layerIndex = graph.getLayer(node.id);
    const indexInLayer = layers[layerIndex].indexOf(node.id);

    node.x = (NODE_SIZE + HORIZONTAL_SPACING) * indexInLayer;
    node.y = (NODE_SIZE + VERTICAL_SPACING) * layerIndex;
  }

  // Redistribute node coordinates
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
}

function cleanupVirtual(graph: Graph) {
  const { nodes, edges, layers } = graph;

  const concreteEdges: GraphEdge[] = [];

  // Remove the virtual nodes
  const concreteNodes = nodes.filter((node) => node.type !== NodeType.Virtual);

  // Remove virtual nodes from layers
  const concreteLayers = layers.map((layer) => {
    return layer.filter((nodeId) => concreteNodes.some((node) => node.id === nodeId));
  });

  // Keep concrete edges and collapse virtual edges together.
  for (const edge of edges) {
    let isConcrete = false;

    const fromNode = graph.getNode(edge.from)!;
    let toNode = graph.getNode(edge.to)!;

    if (fromNode.type !== NodeType.Virtual && toNode.type !== NodeType.Virtual) {
      isConcrete = true;
      edge.path = [
        [fromNode.x + NODE_SIZE / 2, fromNode.y + NODE_SIZE],
        [toNode.x + NODE_SIZE / 2, toNode.y],
      ];
    } else if (fromNode.type !== NodeType.Virtual) {
      isConcrete = true;
      const path: [number, number][] = [];

      path.push([fromNode.x + NODE_SIZE / 2, fromNode.y + NODE_SIZE]);

      while (toNode.type === NodeType.Virtual) {
        path.push([toNode.x + NODE_SIZE / 2, toNode.y + NODE_SIZE / 2]);

        const followingEdge = graph.getOutgoingEdges(toNode.id)[0];
        toNode = graph.getNode(followingEdge.to)!;
      }

      path.push([toNode.x + NODE_SIZE / 2, toNode.y]);

      edge.to = toNode.id;
      edge.path = path;
    }

    if (isConcrete) {
      concreteEdges.push(edge);
    }
  }

  // Update graph properties
  graph.nodes = concreteNodes;
  graph.edges = concreteEdges;
  graph.layers = concreteLayers;
}

function layoutGraph(graph: Graph) {
  assignToLayers(graph);
  fillLayers(graph);
  updateCoordinates(graph);
  cleanupVirtual(graph);
}

function renderShadowContainers({
  graph,
  root,
  rc,
}: {
  graph: Graph;
  root: SVGSVGElement;
  rc: RoughSVG;
}): SVGGElement {
  const { nodes } = graph;

  const shadowTreesContainer = createSvgElement("g");
  root.appendChild(shadowTreesContainer);

  for (const node of nodes) {
    if (node.type === NodeType.ShadowRoot) {
      const shadowRoot = node.treeNode;

      const containedNodes = nodes
        .filter((node) => {
          const { treeNode } = node;

          if (treeNode === null) {
            return false;
          }

          let currentRoot = treeNode.getRootNode();
          while (currentRoot instanceof ShadowRoot) {
            if (currentRoot === shadowRoot) {
              return true;
            }

            currentRoot = currentRoot.host.getRootNode();
          }

          return false;
        })
        .map((node) => {
          const { treeNode } = node;

          let depth = 1;
          let currentRoot = treeNode?.getRootNode();

          while (currentRoot !== shadowRoot && currentRoot instanceof ShadowRoot) {
            depth++;
            currentRoot = currentRoot.host.getRootNode();
          }

          return {
            node,
            depth,
          };
        });

      let containerX1 = Infinity,
        containerY1 = Infinity;
      let containerX2 = -Infinity,
        containerY2 = -Infinity;
      let maxDepth = 1;

      for (const containedNode of containedNodes) {
        containerX1 = Math.min(
          containedNode.node.x - containedNode.depth * SHADOW_TREE_PADDING,
          containerX1
        );
        containerY1 = Math.min(
          containedNode.node.y - containedNode.depth * SHADOW_TREE_PADDING,
          containerY1
        );
        containerX2 = Math.max(
          containedNode.node.x + NODE_SIZE + 2 * containedNode.depth * SHADOW_TREE_PADDING,
          containerX2
        );
        containerY2 = Math.max(
          containedNode.node.y + NODE_SIZE + 2 * containedNode.depth * SHADOW_TREE_PADDING,
          containerY2
        );
        maxDepth = Math.max(containedNode.depth, maxDepth);
      }

      const rect = rc.rectangle(
        containerX1,
        containerY1,
        containerX2 - containerX1,
        containerY2 - containerY1,
        {
          fill: "rgba(100, 100, 100, 0.2)",
          stroke: "rgb(80, 80, 80)",
          fillStyle: "solid",
        }
      );
      shadowTreesContainer.appendChild(rect);
    }
  }

  return shadowTreesContainer;
}

function renderNodes({
  graph,
  root,
  rc,
}: {
  graph: Graph;
  root: SVGSVGElement;
  rc: RoughSVG;
}): SVGGElement {
  const { nodes } = graph;

  const nodesContainer = createSvgElement("g");
  root.appendChild(nodesContainer);

  for (const node of nodes) {
    if (node.type !== NodeType.Virtual) {
      const rect = rc.rectangle(node.x, node.y, NODE_SIZE, NODE_SIZE, {
        fill: "#FFF",
        fillStyle: "solid",
      });
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

      if (node.treeNode instanceof Element) {
        text.textContent = `<${node.treeNode.tagName.toLocaleLowerCase()}>`;
      } else {
        text.textContent = `#root`;
      }

      nodesContainer.appendChild(text);

      if (node.treeNode instanceof Element) {
        const id = node.treeNode.getAttribute("id");

        if (id) {
          const idLabel = createSvgElement("text");
          idLabel.textContent = id;
          idLabel.setAttribute("x", String(node.x + NODE_SIZE));
          idLabel.setAttribute("y", String(node.y));
          idLabel.setAttribute("alignment-baseline", "central");
          idLabel.setAttribute("text-anchor", "middle");

          // Text has to be inserted before computing the text length.
          nodesContainer.appendChild(idLabel);
          const textLength = idLabel.getComputedTextLength();

          const idBox = rc.rectangle(
            node.x + NODE_SIZE - textLength - 5,
            node.y - 10,
            textLength + 15,
            20,
            {
              fill: "#a9d2f7",
              fillStyle: "solid",
            }
          );

          nodesContainer.insertBefore(idBox, idLabel);
        }
      }
    }
  }

  return nodesContainer;
}

function renderEdges({
  graph,
  root,
  rc,
}: {
  graph: Graph;
  root: SVGSVGElement;
  rc: RoughSVG;
}): SVGGElement {
  const { edges } = graph;

  const edgesContainer = createSvgElement("g");
  root.appendChild(edgesContainer);

  for (const edge of edges) {
    const line = rc.curve(edge.path, {
      curveTightness: CURVE_TIGHTNESS,
    });

    line.classList.add("edge");
    if (edge.type === EdgeType.Child) {
      line.classList.add("edge__child");
    } else if (edge.type === EdgeType.ShadowRoot) {
      line.classList.add("edge__shadow-root");
    } else if (edge.type === EdgeType.AssignedElement) {
      line.classList.add("edge__assigned-element");
    }

    line.dataset.from = graph.getNode(edge.from)!.id;
    line.dataset.to = graph.getNode(edge.to)!.id;

    edgesContainer.appendChild(line);
  }

  return edgesContainer;
}

function updateViewBox({
  root,
  nodesContainer,
  shadowTreesContainer,
}: {
  root: SVGSVGElement;
  nodesContainer: SVGGElement;
  shadowTreesContainer: SVGGElement;
}): void {
  const nodesContainerBBox = nodesContainer.getBBox();
  const shadowTreesContainerBBox = shadowTreesContainer.getBBox();

  const viewBoxX1 = Math.min(nodesContainerBBox.x, shadowTreesContainerBBox.x);
  const viewBoxY1 = Math.min(nodesContainerBBox.y, shadowTreesContainerBBox.y);
  const viewBoxX2 = Math.max(
    nodesContainerBBox.x + nodesContainerBBox.width,
    shadowTreesContainerBBox.x + shadowTreesContainerBBox.width
  );
  const viewBoxY2 = Math.max(
    nodesContainerBBox.y + nodesContainerBBox.height,
    shadowTreesContainerBBox.y + shadowTreesContainerBBox.height
  );

  root.setAttribute(
    "viewBox",
    [
      Math.floor(viewBoxX1 - GRAPH_PADDING),
      Math.floor(viewBoxY1 - GRAPH_PADDING),
      Math.ceil(viewBoxX2 + 2 * GRAPH_PADDING),
      Math.ceil(viewBoxY2 + 2 * GRAPH_PADDING),
    ].join(" ")
  );
}

function renderGraph({
  graph,
  root,
  rc,
}: {
  graph: Graph;
  root: SVGSVGElement;
  rc: RoughSVG;
}): void {
  const shadowTreesContainer = renderShadowContainers({ graph, root, rc });
  const nodesContainer = renderNodes({ graph, root, rc });
  renderEdges({ graph, root, rc });

  updateViewBox({ root, shadowTreesContainer, nodesContainer });
}

export class GraphRenderer {
  private root: SVGSVGElement;
  private rc: RoughSVG;
  private graph: Graph = new Graph();

  constructor({ root }: { root: SVGSVGElement }) {
    this.root = root;
    this.rc = rough.svg(root);
  }

  setTree(tree: DomTree) {
    this.root.innerHTML = "";

    this.graph = graphFromDomTree(tree);
    layoutGraph(this.graph);

    renderGraph({
      graph: this.graph,
      root: this.root,
      rc: this.rc,
    });
  }

  setStep(step: EventDispatchingStep) {
    const { root, graph } = this;

    const { target, currentTarget, composedPath } = step;
    const composedPathId = composedPath.map((domNode) => {
      return graph.nodes.find((node) => node.treeNode === domNode)!.id;
    });

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

    for (const svgEdge of Array.from(root.querySelectorAll(".edge"))) {
      const { from: fromId, to: toId } = (svgEdge as SVGElement).dataset;

      let isInComposedPath = false;

      // Traverse the composed path in reverse order as it list the nodes from the leaf to the root
      // when edges are directed from the root to the leaf nodes.
      for (let i = composedPathId.length - 1; i > 0; i--) {
        const currentId = composedPathId[i];
        const nextId = composedPathId[i - 1];

        if (fromId === currentId && toId === nextId) {
          isInComposedPath = true;
          break;
        }
      }

      if (isInComposedPath) {
        svgEdge.classList.add("edge__composed-path");
      } else {
        svgEdge.classList.remove("edge__composed-path");
      }
    }
  }
}
