import rough from "roughjs";

import { DomTree, EventDispatchingStep, TreeNodeType } from "../dom.js";

import { graphFromDomTree, Graph, GraphEdgeType, GraphNode, GraphEdge } from "./layout.js";
import {
  GRAPH_PADDING,
  SHADOW_TREE_PADDING,
  CURVE_TIGHTNESS,
  NODE_LABEL_SIZE,
  POINTER_WIDTH,
  POINTER_HEIGHT,
  POINTER_PADDING,
} from "./constants.js";
import { createSvgElement } from "../utils/svg.js";

type RoughSVG = ReturnType<typeof rough["svg"]>;

const POINTERS = ["target", "event"];

// function renderShadowTrees({
//   graph,
//   root,
//   rc,
// }: {
//   graph: Graph;
//   root: SVGSVGElement;
//   rc: RoughSVG;
// }) {
//   for (const nodeId of graph.nodes()) {
//     const node = graph.node(nodeId);

//     if (node.type === GraphNodeType.ShadowRoot) {
//       const shadowRoot = node.treeNode;

//       const containedNodes = graph
//         .nodes()
//         .filter((nodeId) => {
//           const { treeNode } = graph.node(nodeId);

//           if (treeNode === null) {
//             return false;
//           }

//           let currentRoot = treeNode.getRootNode();
//           while (currentRoot instanceof ShadowRoot) {
//             if (currentRoot === shadowRoot) {
//               return true;
//             }

//             currentRoot = currentRoot.host.getRootNode();
//           }

//           return false;
//         })
//         .map((nodeId) => {
//           const node = graph.node(nodeId);

//           let depth = 1;
//           let currentRoot = node.treeNode?.getRootNode();

//           while (currentRoot !== shadowRoot && currentRoot instanceof ShadowRoot) {
//             depth++;
//             currentRoot = currentRoot.host.getRootNode();
//           }

//           return {
//             node,
//             depth,
//           };
//         });

//       let minX = Infinity,
//         minY = Infinity;
//       let maxX = -Infinity,
//         maxY = -Infinity;
//       let maxDepth = 1;

//       for (const { node, depth } of containedNodes) {
//         minX = Math.min(minX, node.x - node.width / 2);
//         minY = Math.min(minY, node.y - node.height / 2);
//         maxX = Math.max(maxX, node.x + node.width / 2);
//         maxY = Math.max(maxY, node.y + node.height / 2);
//         maxDepth = Math.max(depth, maxDepth);
//       }

//       const rect = rc.rectangle(
//         minX - maxDepth * SHADOW_TREE_PADDING,
//         minY - maxDepth * SHADOW_TREE_PADDING,
//         maxX - minX + 2 * maxDepth * SHADOW_TREE_PADDING,
//         maxY - minY + 2 * maxDepth * SHADOW_TREE_PADDING,
//         {
//           fill: "white",
//           fillStyle: "solid",
//         }
//       );

//       rect.classList.add("shadow-tree");

//       root.appendChild(rect);
//     }
//   }
// }

function updateViewBox({ root, graph }: { root: SVGSVGElement; graph: Graph }): void {
  const { width, height } = graph.graph();
  root.setAttribute("viewBox", [0, 0, width, height].join(" "));
}

function renderNode({ node, rc, root }: { node: GraphNode; rc: RoughSVG; root: SVGElement }) {
  const { treeNode } = node;

  const rect = rc.rectangle(
    node.x - node.width / 2,
    node.y - node.height / 2,
    node.width,
    node.height,
    {
      fill: "white",
      fillStyle: "solid",
    }
  );
  rect.setAttribute("data-graph-id", treeNode.id);
  rect.setAttribute(
    "class",
    `node node__${treeNode.type === TreeNodeType.Element ? "element" : "shadow-root"}`
  );

  const text = createSvgElement("text");
  text.setAttribute("x", String(node.x));
  text.setAttribute("y", String(node.y));
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("text-anchor", "middle");

  if (treeNode.type === TreeNodeType.Element) {
    text.textContent = `<${treeNode.name}>`;
  } else {
    // The dy attribute defines the offset from the previous element. To center both lines in the
    // middle of the <text> element, the first <tspan> is shift upward by half a line height relative
    // to the parent <text>. The second <tspan> is shift by a line height down relative to the
    // first <tspan>.
    text.innerHTML =
      `<tspan x="${node.x}" dy="-0.5em">Shadow Root</tspan>` +
      `<tspan x="${node.x}" dy="1.1em">(${
        treeNode.mode === "open" ? "🔓 open" : "🔒 closed"
      })</span>`;
  }

  renderNodeLabel({
    node,
    rc,
    root: rect,
  });

  root.append(rect);
  rect.append(text);
}

function renderNodeLabel({ node, root, rc }: { node: GraphNode; rc: RoughSVG; root: SVGElement }) {
  const { treeNode } = node;

  if (!treeNode.label) {
    return;
  }

  const labelContainer = rc.rectangle(
    node.x + node.width / 2 - NODE_LABEL_SIZE / 2,
    node.y - node.height / 2 - NODE_LABEL_SIZE / 2,
    NODE_LABEL_SIZE,
    NODE_LABEL_SIZE,
    {
      fill: "white",
      fillStyle: "solid",
    }
  );
  labelContainer.setAttribute("class", "node-label");

  const labelText = createSvgElement("text");
  labelText.textContent = treeNode.label;
  labelText.setAttribute("x", String(node.x + node.width / 2));
  labelText.setAttribute("y", String(node.y - node.height / 2));
  labelText.setAttribute("dominant-baseline", "central");
  labelText.setAttribute("text-anchor", "middle");

  root.append(labelContainer);
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
  from: GraphNode;
  to: GraphNode;
  rc: RoughSVG;
  root: SVGElement;
}) {
  const line = rc.curve(
    edge.points.map((point) => [point.x, point.y]),
    {
      curveTightness: CURVE_TIGHTNESS,
    }
  );
  line.setAttribute("data-from-id", from.treeNode.id);
  line.setAttribute("data-to-id", to.treeNode.id);

  line.classList.add("edge");
  if (edge.type === GraphEdgeType.Child) {
    line.classList.add("edge__child");
  } else if (edge.type === GraphEdgeType.ShadowRoot) {
    line.classList.add("edge__shadow-root");
  } else if (edge.type === GraphEdgeType.AssignedElement) {
    line.classList.add("edge__assigned-element");
  }

  root.appendChild(line);
}

function renderPointers({
  pointer,
  root,
  rc,
}: {
  pointer: string;
  root: SVGElement;
  rc: RoughSVG;
}) {
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
  pointerElm.setAttribute("class", `pointer pointer__${pointer}`);

  root.appendChild(pointerElm);

  const labelElm = createSvgElement("text");
  labelElm.textContent = pointer;
  labelElm.setAttribute("x", String(-POINTER_WIDTH + Math.floor(POINTER_PADDING / 2)));
  labelElm.setAttribute("y", String(0));
  labelElm.setAttribute("dominant-baseline", "central");

  pointerElm.appendChild(labelElm);
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
  updateViewBox({ graph, root });

  // renderShadowTrees({ graph, root, rc });

  for (const id of graph.nodes()) {
    const node = graph.node(id);
    renderNode({ node, root, rc });
  }

  for (const graphEdge of graph.edges()) {
    const from = graph.node(graphEdge.v);
    const to = graph.node(graphEdge.w);
    const edge = graph.edge(graphEdge);
    renderEdge({ from, to, edge, root, rc });
  }

  for (const pointer of POINTERS) {
    renderPointers({ pointer, root, rc });
  }
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

  // Update composed path nodes
  for (const svgNode of Array.from(root.querySelectorAll(".node"))) {
    const nodeId = svgNode.getAttribute("data-graph-id");
    const node = graph.node(nodeId!);

    if (composedPath.includes(node.treeNode!)) {
      svgNode.classList.add("node__composed-path");
    } else {
      svgNode.classList.remove("node__composed-path");
    }
  }

  // Update pointers locations
  const currentTargetNode = graph
    .nodes()
    .map((nodeId) => graph.node(nodeId)!)
    .find((node) => node.treeNode === currentTarget)!;
  const targetNode = graph
    .nodes()
    .map((nodeId) => graph.node(nodeId)!)
    .find((node) => node.treeNode === target)!;

  const eventPointerElm: SVGElement = root.querySelector(`.pointer__event`)!;
  const targetPointerElm: SVGElement = root.querySelector(`.pointer__target`)!;

  const pointerVerticalOffset = currentTargetNode === targetNode ? currentTargetNode.height / 4 : 0;

  eventPointerElm.style.transform = `translate(${
    currentTargetNode.x - currentTargetNode.width / 2
  }px, ${currentTargetNode.y - pointerVerticalOffset}px)`;

  targetPointerElm.style.transform = `translate(${targetNode.x - targetNode.width / 2}px, ${
    targetNode.y + pointerVerticalOffset
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
