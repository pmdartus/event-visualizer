import rough from "roughjs";

import { DomTree, EventDispatchingStep } from "../dom.js";

import { graphFromDomTree } from "./layout.js";
import { Graph, RoughSVG } from "./types";

import { render as renderShadowTrees } from "./renderers/shadow-tree";
import { render as renderNodes, update as updateNodes } from "./renderers/node";
import { render as renderEdges } from "./renderers/edge";
import { render as renderPointers, update as updatePointers } from "./renderers/pointer";

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
    renderNodes(config);
    renderEdges(config);
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
}
