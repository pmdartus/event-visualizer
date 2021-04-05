import { css } from "lit-element";

import { TreeNodeType, EventDispatchingStep } from "../../dom.js";
import { createSvgElement } from "../../utils/svg.js";

import { Graph, GraphNode, RoughSVG } from "../types.js";

const NODE_LABEL_SIZE = 21;

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

export function render({ graph, root, rc }: { graph: Graph; root: SVGSVGElement; rc: RoughSVG }) {
  for (const id of graph.nodes()) {
    const node = graph.node(id);
    renderNode({ node, root, rc });
  }
}

export function update({
  step,
  root,
}: {
  step: EventDispatchingStep;
  graph: Graph;
  root: SVGSVGElement;
}) {
  const { composedPath } = step;

  for (const svgNode of Array.from(root.querySelectorAll(".node"))) {
    const nodeId = svgNode.getAttribute("data-graph-id");
    const isInComposedPath = composedPath.some((treeNode) => treeNode.id === nodeId);

    if (isInComposedPath) {
      svgNode.classList.add("node__composed-path");
    } else {
      svgNode.classList.remove("node__composed-path");
    }
  }
}

export const styles = css`
  .node.node__composed-path > path {
    fill: var(--composed-path-color);
    stroke: var(--composed-path-alt-color);
    stroke-width: 1.5;
  }

  .node-label > path {
    fill: #a9d2f7;
  }
`;
