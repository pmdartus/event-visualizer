import { DomTree, TreeNode } from "./main";

export interface EventDispatchingStep {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  composedPath: EventTarget[];
}

export interface SimulationResult {
  steps: EventDispatchingStep[];
}

const EVENT_NAME = "__TEST_EVENT__";

export function simulateDispatchEvent(config: {
  tree: DomTree;
  target: TreeNode;
  eventOptions: EventInit;
}): SimulationResult {
  const { tree, target, eventOptions } = config;
  const steps: EventDispatchingStep[] = [];

  function handler(event: Event) {
    steps.push({
      target: event.target,
      currentTarget: event.currentTarget,
      composedPath: [...event.composedPath()],
    });
  }

  for (const node of tree.nodes) {
    node.addEventListener(EVENT_NAME, handler);
  }

  const event = new CustomEvent(EVENT_NAME, eventOptions);
  target.dispatchEvent(event);

  for (const node of tree.nodes) {
    node.removeEventListener(EVENT_NAME, handler);
  }

  return {
    steps,
  };
}
