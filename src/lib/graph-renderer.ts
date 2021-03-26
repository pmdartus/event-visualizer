import rough from "roughjs";

import { createSvgElement } from "../utils/svg";

import { layoutGraph } from "./graph-layout";
import { graphFromDomTree, Graph, GraphNodeType, GraphEdgeType } from "./graph";
import {
  GRAPH_PADDING,
  SHADOW_TREE_PADDING,
  CURVE_TIGHTNESS,
  HORIZONTAL_SPACING,
  VERTICAL_SPACING,
} from "./graph-constants";

import { DomTree, EventDispatchingStep } from "./simulator";

type RoughSVG = ReturnType<typeof rough["svg"]>;

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
    if (node.type === GraphNodeType.ShadowRoot) {
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
          containedNode.node.x -
            containedNode.node.width / 2 -
            containedNode.depth * SHADOW_TREE_PADDING,
          containerX1
        );
        containerY1 = Math.min(
          containedNode.node.y -
            containedNode.node.height / 2 -
            containedNode.depth * SHADOW_TREE_PADDING,
          containerY1
        );
        containerX2 = Math.max(
          containedNode.node.x +
            containedNode.node.width / 2 +
            2 * containedNode.depth * SHADOW_TREE_PADDING,
          containerX2
        );
        containerY2 = Math.max(
          containedNode.node.y +
            containedNode.node.height / 2 +
            2 * containedNode.depth * SHADOW_TREE_PADDING,
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
    if (node.type !== GraphNodeType.Virtual) {
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
      rect.setAttribute("data-graph-id", node.id);

      rect.classList.add("node");
      if (node.type === GraphNodeType.Element) {
        rect.classList.add("node__element");
      } else if (node.type === GraphNodeType.ShadowRoot) {
        rect.classList.add("node__shadow-root");
      }

      nodesContainer.appendChild(rect);

      const text = createSvgElement("text");
      text.setAttribute("x", String(node.x));
      text.setAttribute("y", String(node.y));
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
          idLabel.setAttribute("x", String(node.x + node.width / 2));
          idLabel.setAttribute("y", String(node.y - node.height / 2));
          idLabel.setAttribute("alignment-baseline", "central");
          idLabel.setAttribute("text-anchor", "middle");

          // Text has to be inserted before computing the text length.
          nodesContainer.appendChild(idLabel);
          const textLength = idLabel.getComputedTextLength();

          const idBox = rc.rectangle(
            node.x + node.width / 2 - textLength - 5,
            node.y - node.height / 2 - 10,
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
    if (edge.type === GraphEdgeType.Child) {
      line.classList.add("edge__child");
    } else if (edge.type === GraphEdgeType.ShadowRoot) {
      line.classList.add("edge__shadow-root");
    } else if (edge.type === GraphEdgeType.AssignedElement) {
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

    layoutGraph(this.graph, {
      horizontalSpacing: HORIZONTAL_SPACING,
      verticalSpacing: VERTICAL_SPACING,
    });

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
