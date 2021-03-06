import { css } from "lit";
import rough from "roughjs";

import { DomTree, EventDispatchingStep } from "../dom.js";

import { graphFromDomTree } from "./layout.js";
import { Graph, RoughSVG } from "./types.js";

import {
  render as renderShadowTrees,
  styles as shadowTreeStyles,
} from "./renderers/shadow-tree.js";
import {
  render as renderNodes,
  update as updateNodes,
  styles as nodeStyles,
} from "./renderers/node.js";
import { render as renderEdges, styles as edgeStyles } from "./renderers/edge.js";
import {
  render as renderPointers,
  update as updatePointers,
  styles as pointerStyles,
} from "./renderers/pointer.js";

// Horizontal padding is larger than vertical padding to fit the pointers on the side of the graph.
const GRAPH_VERTICAL_PADDING = 20;
const GRAPH_HORIZONTAL_PADDING = 50;

function updateViewBox({ root }: { root: SVGSVGElement; graph: Graph }): void {
  const { width, height } = root.getBBox();
  root.setAttribute(
    "viewBox",
    [
      -GRAPH_HORIZONTAL_PADDING,
      -GRAPH_VERTICAL_PADDING,
      width + 2 * GRAPH_HORIZONTAL_PADDING,
      height + 2 * GRAPH_VERTICAL_PADDING,
    ].join(" ")
  );
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

    const config = {
      tree,
      graph: this.graph,
      root: this.root,
      rc: this.rc,
    };

    renderShadowTrees(config);
    renderEdges(config);
    renderNodes(config);

    updateViewBox(config);

    renderPointers(config);
  }

  setStep(step: EventDispatchingStep) {
    if (!this.graph) {
      return;
    }

    const config = {
      step,
      graph: this.graph,
      root: this.root,
    };

    updateNodes(config);
    updatePointers(config);
  }

  static styles = css`
    ${shadowTreeStyles}
    ${nodeStyles}
    ${edgeStyles}
    ${pointerStyles}
  `;
}
