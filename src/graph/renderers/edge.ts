import { css } from "lit";

import { Graph, GraphNode, GraphEdge, GraphEdgeType, RoughSVG } from "../types.js";

const CURVE_TIGHTNESS = 0.8;

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

export function render({ graph, root, rc }: { graph: Graph; root: SVGSVGElement; rc: RoughSVG }) {
  for (const graphEdge of graph.edges()) {
    const from = graph.node(graphEdge.v);
    const to = graph.node(graphEdge.w);
    const edge = graph.edge(graphEdge);
    renderEdge({ from, to, edge, root, rc });
  }
}

export const styles = css`
  .edge path {
    stroke: #505050;
  }

  .edge__shadow-root {
    stroke-dasharray: 8;
  }

  .edge__assigned-element {
    stroke-dasharray: 1, 4;
    stroke-linecap: round;
  }
`;
