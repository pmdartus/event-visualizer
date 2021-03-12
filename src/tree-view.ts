import { DomTree } from "./main";
import { Preset } from "./presets";
import { getTreeNodeLabel } from "./utils";

import "./tree-view.css";

const NODE_SIZE = 60;
const NODE_MARGIN = 20;

const TREE_VIEW: SVGElement = document.querySelector("#tree-view")!;

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tagName: K
): SVGElementTagNameMap[K] {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function resetTreeView() {
  TREE_VIEW.innerHTML = "";
}

export function updateTreeView(preset: Preset, tree: DomTree) {
  resetTreeView();

  for (let index = 0; index < tree.nodes.length; index++) {
    const node = tree.nodes[index];

    const rect = createSvgElement("rect");
    rect.setAttribute("class", "dom-element");
    rect.setAttribute("x", String(index * (NODE_SIZE + NODE_MARGIN)));
    rect.setAttribute("y", "0");

    TREE_VIEW.appendChild(rect);

    const text = createSvgElement("text");
    text.setAttribute("x", String((index * (NODE_SIZE+ NODE_MARGIN)) + NODE_SIZE / 2));
    text.setAttribute("y", String(NODE_SIZE / 2));
    text.setAttribute("alignment-baseline", "central");
    text.setAttribute("text-anchor", "middle");
    text.textContent = getTreeNodeLabel(node);
    
    TREE_VIEW.appendChild(text);
  }
}
