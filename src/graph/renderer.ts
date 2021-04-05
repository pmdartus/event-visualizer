import rough from "roughjs";
import { css } from "lit-element";

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

function updateViewBox({ root, graph }: { root: SVGSVGElement; graph: Graph }): void {
  const { width, height } = graph.graph();
  root.setAttribute("viewBox", [0, 0, width, height].join(" "));
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
    renderPointers(config);

    updateViewBox(config);
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
