import rough from "roughjs";

import { DomTree, EventDispatchingStep } from "../simulator.js";

import {
  graphFromDomTree,
  Graph,
  GraphNodeType,
  GraphEdgeType,
  GraphNode,
  GraphEdge,
} from "./graph.js";
import {
  GRAPH_PADDING,
  SHADOW_TREE_PADDING,
  CURVE_TIGHTNESS,
  SHADOW_TREE_CLASS,
  NODE_CLASS,
  NODE_ELEMENT_CLASS,
  NODE_SHADOW_ROOT_CLASS,
  NODE_LABEL_CLASS,
  NODE_LABEL_SIZE,
  POINTERS,
  POINTER_WIDTH,
  POINTER_HEIGHT,
  POINTER_PADDING,
  POINTER_CLASS,
} from "./graph-constants.js";
import { createSvgElement } from "./svg.js";

type RoughSVG = ReturnType<typeof rough["svg"]>;

function renderShadowTrees({
  graph,
  root,
  rc,
}: {
  graph: Graph;
  root: SVGSVGElement;
  rc: RoughSVG;
}) {
  for (const nodeId of graph.nodes()) {
    const node = graph.node(nodeId);

    if (node.type === GraphNodeType.ShadowRoot) {
      const shadowRoot = node.treeNode;

      const containedNodes = graph
        .nodes()
        .filter((nodeId) => {
          const { treeNode } = graph.node(nodeId);

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
        .map((nodeId) => {
          const node = graph.node(nodeId);

          let depth = 1;
          let currentRoot = node.treeNode?.getRootNode();

          while (currentRoot !== shadowRoot && currentRoot instanceof ShadowRoot) {
            depth++;
            currentRoot = currentRoot.host.getRootNode();
          }

          return {
            node,
            depth,
          };
        });

      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;
      let maxDepth = 1;

      for (const { node, depth } of containedNodes) {
        minX = Math.min(minX, node.x - node.width / 2);
        minY = Math.min(minY, node.y - node.height / 2);
        maxX = Math.max(maxX, node.x + node.width / 2);
        maxY = Math.max(maxY, node.y + node.height / 2);
        maxDepth = Math.max(depth, maxDepth);
      }

      const rect = rc.rectangle(
        minX - maxDepth * SHADOW_TREE_PADDING,
        minY - maxDepth * SHADOW_TREE_PADDING,
        maxX - minX + 2 * maxDepth * SHADOW_TREE_PADDING,
        maxY - minY + 2 * maxDepth * SHADOW_TREE_PADDING,
        {
          fill: "rgba(100, 100, 100, 0.2)",
          stroke: "rgb(80, 80, 80)",
          fillStyle: "solid",
        }
      );

      rect.classList.add(SHADOW_TREE_CLASS);

      root.appendChild(rect);
    }
  }
}

function renderNode({
  id,
  node,
  rc,
  root,
}: {
  id: string;
  node: GraphNode;
  rc: RoughSVG;
  root: SVGElement;
}) {
  const rect = rc.rectangle(
    node.x - node.width / 2,
    node.y - node.height / 2,
    node.width,
    node.height,
    {
      fill: "#FFF",
      fillStyle: "solid",
    }
  );
  rect.setAttribute("data-graph-id", id);
  rect.setAttribute(
    "class",
    `${NODE_CLASS} ${
      node.type === GraphNodeType.Element ? NODE_ELEMENT_CLASS : NODE_SHADOW_ROOT_CLASS
    }`
  );

  root.appendChild(rect);

  const text = createSvgElement("text");
  text.setAttribute("x", String(node.x));
  text.setAttribute("y", String(node.y));
  text.setAttribute("alignment-baseline", "central");
  text.setAttribute("text-anchor", "middle");
  text.textContent =
    node.type === GraphNodeType.Element
      ? `<${(node.treeNode as Element).tagName.toLocaleLowerCase()}>`
      : "#root";

  rect.appendChild(text);

  if (node.type === GraphNodeType.Element) {
    const label = (node.treeNode as Element).getAttribute("id");

    if (label) {
      renderNodeLabel({
        label,
        node,
        rc,
        root: rect,
      });
    }
  }
}

function renderNodeLabel({
  label,
  node,
  root,
  rc,
}: {
  label: string;
  node: GraphNode;
  rc: RoughSVG;
  root: SVGElement;
}) {
  const labelContainer = rc.rectangle(
    node.x + node.width / 2 - NODE_LABEL_SIZE / 2,
    node.y - node.height / 2 - NODE_LABEL_SIZE / 2,
    NODE_LABEL_SIZE,
    NODE_LABEL_SIZE,
    {
      fill: "#a9d2f7",
      fillStyle: "solid",
    }
  );
  labelContainer.setAttribute("class", NODE_LABEL_CLASS);

  root.append(labelContainer);

  const labelText = createSvgElement("text");
  labelText.textContent = label;
  labelText.setAttribute("x", String(node.x + node.width / 2));
  labelText.setAttribute("y", String(node.y - node.height / 2));
  labelText.setAttribute("alignment-baseline", "central");
  labelText.setAttribute("text-anchor", "middle");

  labelContainer.append(labelText);
}

function renderEdge({
  edge,
  from,
  to,
  root,
  rc,
}: {
  edge: GraphEdge;
  from: string;
  to: string;
  rc: RoughSVG;
  root: SVGElement;
}) {
  const path: [number, number][] = edge.points.map((point) => [point.x, point.y]);
  const line = rc.curve(path, {
    curveTightness: CURVE_TIGHTNESS,
  });

  line.classList.add("edge");
  if (edge.type === GraphEdgeType.Child) {
    line.classList.add("edge__child");
  } else if (edge.type === GraphEdgeType.ShadowRoot) {
    line.classList.add("edge__shadow-root");
  } else if (edge.type === GraphEdgeType.AssignedElement) {
    line.classList.add("edge__assigned-element");
  }

  line.dataset.from = from;
  line.dataset.to = to;

  root.appendChild(line);
}

function renderPointers({ root, rc }: { root: SVGElement; rc: RoughSVG }) {
  for (const { label } of POINTERS) {
    const pointerElm = rc.polygon(
      [
        [-POINTER_WIDTH, -POINTER_HEIGHT / 2],
        [0, -POINTER_HEIGHT / 2],
        [0 + 5, 0],
        [0, POINTER_HEIGHT / 2],
        [-POINTER_WIDTH, POINTER_HEIGHT / 2],
      ],
      {
        fill: "white",
        fillStyle: "solid",
      }
    );
    pointerElm.setAttribute("class", `${POINTER_CLASS} ${POINTER_CLASS}__${label}`);

    root.appendChild(pointerElm);

    const labelElm = createSvgElement("text");
    labelElm.textContent = label;
    labelElm.setAttribute("x", String(-POINTER_WIDTH + Math.floor(POINTER_PADDING / 2)));
    labelElm.setAttribute("y", String(0));
    labelElm.setAttribute("alignment-baseline", "central");

    pointerElm.appendChild(labelElm);
  }
}

function updateViewBox(root: SVGSVGElement): void {
  const rootBBox = root.getBBox();

  root.setAttribute(
    "viewBox",
    [
      Math.floor(rootBBox.x - GRAPH_PADDING),
      Math.floor(rootBBox.y - GRAPH_PADDING),
      Math.ceil(rootBBox.x + rootBBox.width + 2 * GRAPH_PADDING),
      Math.ceil(rootBBox.y + rootBBox.height + 2 * GRAPH_PADDING),
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
  renderShadowTrees({ graph, root, rc });

  for (const id of graph.nodes()) {
    const node = graph.node(id);
    renderNode({ id, node, root, rc });
  }

  for (const graphEdge of graph.edges()) {
    const edge = graph.edge(graphEdge);
    const { v: from, w: to } = graphEdge;
    renderEdge({ from, to, edge, root, rc });
  }

  renderPointers({ root, rc });
  updateViewBox(root);
}

function renderStep({
  step,
  graph,
  root,
}: {
  step: EventDispatchingStep;
  graph: Graph;
  root: SVGSVGElement;
}) {
  const { target, currentTarget, composedPath } = step;

  for (const svgNode of Array.from(root.querySelectorAll(".node"))) {
    const nodeId = svgNode.getAttribute("data-graph-id");
    const node = graph.node(nodeId!);

    if (node.treeNode === target) {
      svgNode.classList.add("node__target");
    } else {
      svgNode.classList.remove("node__target");
    }

    if (node.treeNode === currentTarget) {
      svgNode.classList.add("node__current-target");
    } else {
      svgNode.classList.remove("node__current-target");
    }

    if (composedPath.includes(node.treeNode!)) {
      svgNode.classList.add("node__composed-path");
    } else {
      svgNode.classList.remove("node__composed-path");
    }
  }

  const eventPointerElm: SVGElement = root.querySelector(`.${POINTER_CLASS}__event`)!;
  const currentTargetNode = graph
    .nodes()
    .map((nodeId) => graph.node(nodeId)!)
    .find((node) => node.treeNode === currentTarget)!;

  eventPointerElm.style.transform = `translate(${
    currentTargetNode.x - currentTargetNode.width / 2
  }px, ${currentTargetNode.y - currentTargetNode.height / 4}px)`;

  const targetPointerElm: SVGElement = root.querySelector(`.${POINTER_CLASS}__target`)!;
  const targetNode = graph
    .nodes()
    .map((nodeId) => graph.node(nodeId)!)
    .find((node) => node.treeNode === target)!;

  targetPointerElm.style.transform = `translate(${targetNode.x - targetNode.width / 2}px, ${
    targetNode.y + currentTargetNode.height / 4
  }px)`;
}

export class GraphRenderer {
  private root: SVGSVGElement;
  private rc: RoughSVG;
  private graph?: Graph;

  constructor({ root }: { root: SVGSVGElement }) {
    this.root = root;
    this.rc = rough.svg(root);
  }

  setTree(tree: DomTree) {
    this.root.innerHTML = "";

    this.graph = graphFromDomTree(tree);

    renderGraph({
      graph: this.graph,
      root: this.root,
      rc: this.rc,
    });
  }

  setStep(step: EventDispatchingStep) {
    if (!this.graph) {
      return;
    }

    renderStep({
      step,
      graph: this.graph,
      root: this.root,
    });
  }
}
