import { css } from "lit";

import { EventDispatchingStep } from "../../dom.js";
import { createSvgElement } from "../../utils/svg.js";

import { Graph, RoughSVG } from "../types.js";

const POINTERS = ["target", "event"];

const POINTER_WIDTH = 50;
const POINTER_HEIGHT = 20;
const POINTER_PADDING = 5;

function renderPointer({ pointer, root, rc }: { pointer: string; root: SVGElement; rc: RoughSVG }) {
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

export function render({ graph, root, rc }: { graph: Graph; root: SVGSVGElement; rc: RoughSVG }) {
  for (const pointer of POINTERS) {
    renderPointer({ pointer, root, rc });
  }
}

export function update({
  step,
  graph,
  root,
}: {
  step: EventDispatchingStep;
  graph: Graph;
  root: SVGSVGElement;
}) {
  const { target, currentTarget } = step;

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

export const styles = css`
  .pointer {
    transition: transform 0.5s;
  }

  .pointer__event > path {
    fill: var(--current-target-color);
    stroke: var(--current-target-alt-color);
  }

  .pointer__target > path {
    fill: var(--target-color);
    stroke: var(--target-alt-color);
  }
`;
