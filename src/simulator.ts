export type TreeNode = Element | ShadowRoot;

export interface DomTree {
  root: Element;
  target: TreeNode;
  nodes: TreeNode[];
}

export interface EventDispatchingStep {
  target: EventTarget;
  currentTarget: EventTarget;
  composedPath: EventTarget[];
}

const EVENT_NAME = "__TEST_EVENT__";

export function buildDomTree({ content }: HTMLTemplateElement): DomTree {
  if (content.children.length !== 1) {
    throw new Error(`Invalid tree. Expect 1 root element but found ${content.children.length}.`);
  }

  const root = content.children[0].cloneNode(true);

  if (!(root instanceof Element)) {
    throw new Error(`Invalid tree. Expected root to be an instance of Element but found ${root}.`);
  }

  const nodes: TreeNode[] = [];
  const remaining: TreeNode[] = [root];

  let node;
  while ((node = remaining.pop())) {
    if (node instanceof HTMLTemplateElement && node.hasAttribute("shadowroot")) {
      const mode = node.getAttribute("shadowroot");

      if (mode !== "open" && mode !== "closed") {
        throw new Error(
          `Invalid shadowroot attribute value. Expected "open" or "closed" but received "${mode}"`
        );
      }

      const shadowRoot = node.parentElement!.attachShadow({
        mode,
      });

      // Append the template content in the newly created ShadowRoot and remove the original
      // template element.
      shadowRoot.append(node.content);
      node.remove();

      remaining.push(shadowRoot);
    } else {
      nodes.push(node);
      remaining.push(...Array.from(node.children));
    }
  }

  const target = nodes.find((node) => node instanceof Element && node.hasAttribute("target"));
  if (!target) {
    throw new Error(`Invalid tree. Expected one element to have the "target" attribute.`);
  }

  return {
    root,
    target,
    nodes,
  };
}

export function simulateDispatchEvent(config: {
  tree: DomTree;
  eventConfig: EventInit;
}): EventDispatchingStep[] {
  const {
    tree: { nodes, target },
    eventConfig,
  } = config;

  const steps: EventDispatchingStep[] = [];

  function handler(event: Event) {
    steps.push({
      target: event.target!,
      currentTarget: event.currentTarget!,
      composedPath: [...event.composedPath()],
    });
  }

  for (const node of nodes) {
    node.addEventListener(EVENT_NAME, handler);
  }

  const event = new CustomEvent(EVENT_NAME, eventConfig);
  target.dispatchEvent(event);

  for (const node of nodes) {
    node.removeEventListener(EVENT_NAME, handler);
  }

  return steps;
}
