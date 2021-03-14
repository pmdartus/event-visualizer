export type TreeNode = Element | ShadowRoot;

export interface DomTree {
  root: Element;
  nodes: TreeNode[];
}

export interface EventDispatchingStep {
  target: EventTarget;
  currentTarget: EventTarget;
  composedPath: EventTarget[];
}

const EVENT_NAME = "__TEST_EVENT__";

export function buildDomTree(html: string): DomTree {
  const tmpl = document.createElement("template");
  tmpl.innerHTML = html;

  const { content } = tmpl;
  if (content.children.length !== 1) {
    throw new Error(`Invalid preset. Expect 1 but found ${content.children.length} root elements`);
  }

  const root = content.children[0].cloneNode(true) as HTMLElement;

  const nodes: TreeNode[] = [];
  const remaining: TreeNode[] = [root];

  let node;
  while ((node = remaining.pop())) {
    if (node instanceof HTMLTemplateElement && node.hasAttribute("shadow-root")) {
      const shadowRoot = node.parentElement!.attachShadow({
        mode: (node.getAttribute("mode") as ShadowRootMode) ?? "open",
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

  return {
    root,
    nodes,
  };
}

export function simulateDispatchEvent(config: {
  tree: DomTree;
  target: TreeNode;
  eventOptions: EventInit;
}): EventDispatchingStep[] {
  const { tree, target, eventOptions } = config;
  const steps: EventDispatchingStep[] = [];

  function handler(event: Event) {
    steps.push({
      target: event.target!,
      currentTarget: event.currentTarget!,
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

  return steps;
}
