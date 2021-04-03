export type TreeNodeId = string;

export enum TreeNodeType {
  Element,
  ShadowRoot,
}

interface BaseTreeNode<N extends Node, T extends TreeNodeType> {
  id: TreeNodeId;
  type: T;
  domNode: N;
  label: string | null;
}

interface ElementTreeNode extends BaseTreeNode<Element, TreeNodeType.Element> {
  name: string;
}

export interface ShadowRootTreeNode extends BaseTreeNode<ShadowRoot, TreeNodeType.ShadowRoot> {
  mode: ShadowRootMode;
}

export type TreeNode = ElementTreeNode | ShadowRootTreeNode;

export interface DomTree {
  root: TreeNode;
  target: TreeNode;
  nodes: TreeNode[];
  getTreeNodeById(id: TreeNodeId): TreeNode | undefined;
  getTreeNodeByDomNode(domNode: Node): TreeNode | undefined;
}

export interface EventDispatchingStep {
  target: TreeNode;
  currentTarget: TreeNode;
  composedPath: TreeNode[];
}

const EVENT_NAME = "__TEST_EVENT__";

/**
 * Turns a HTMLTemplate element into a ShadowRoot following the declarative shadow DOM
 * specification.
 */
function applyDeclarativeShadowDom(template: HTMLTemplateElement): ShadowRoot {
  const mode = template.getAttribute("shadowroot");

  if (mode !== "open" && mode !== "closed") {
    throw new Error(
      `Invalid shadowroot attribute value. Expected "open" or "closed" but received "${mode}"`
    );
  }

  const shadowRoot = template.parentElement!.attachShadow({
    mode,
  });

  shadowRoot.append(template.content);
  template.remove();

  return shadowRoot;
}

/**
 * Create a DOMTree out of an HTMLTemplate element.
 */
export function createDomTree(template: HTMLTemplateElement): DomTree {
  let currentId = 0;

  const nodes: TreeNode[] = [];

  const createElementTreeNode = (
    config: Pick<ElementTreeNode, "domNode" | "label">
  ): ElementTreeNode => {
    const node: ElementTreeNode = {
      id: String(currentId++),
      type: TreeNodeType.Element,
      domNode: config.domNode,
      label: config.label,
      name: config.domNode.tagName.toLocaleLowerCase(),
    };

    nodes.push(node);
    return node;
  };

  const createShadowRootTreeNode = (
    config: Pick<ShadowRootTreeNode, "domNode" | "label">
  ): ShadowRootTreeNode => {
    const node: ShadowRootTreeNode = {
      id: String(currentId++),
      type: TreeNodeType.ShadowRoot,
      domNode: config.domNode,
      label: config.label,
      mode: config.domNode.mode,
    };

    nodes.push(node);
    return node;
  };

  const { content } = template;
  if (content.children.length !== 1) {
    throw new Error(`Invalid tree. Expect 1 root element but found ${content.children.length}.`);
  }

  const root = content.children[0].cloneNode(true);
  if (!(root instanceof Element)) {
    throw new Error(`Invalid tree. Expected root to be an instance of Element but found ${root}.`);
  }

  const rootTreeNode = createElementTreeNode({
    domNode: root,
    label: root.getAttribute("id"),
  });

  let currentElement: Element | undefined;
  const remainingElements: Element[] = [...Array.from(root.children)];

  while ((currentElement = remainingElements.pop())) {
    const label = currentElement.getAttribute("id");

    if (
      currentElement instanceof HTMLTemplateElement &&
      currentElement.hasAttribute("shadowroot")
    ) {
      const shadowRoot = applyDeclarativeShadowDom(currentElement);
      createShadowRootTreeNode({
        domNode: shadowRoot,
        label,
      });

      remainingElements.push(...Array.from(shadowRoot.children));
    } else {
      createElementTreeNode({
        domNode: currentElement,
        label,
      });

      remainingElements.push(...Array.from(currentElement.children));
    }
  }

  const targetTreeNodes = [...nodes.values()].filter(
    (treeNode) => treeNode.type === TreeNodeType.Element && treeNode.domNode.hasAttribute("target")
  );
  if (targetTreeNodes.length !== 1) {
    throw new Error(
      `Invalid tree. Expected 1 element to have the "target" attribute, but found ${targetTreeNodes.length} elements.`
    );
  }

  return {
    root: rootTreeNode,
    target: targetTreeNodes[0],
    nodes,
    getTreeNodeById(id: TreeNodeId): TreeNode | undefined {
      return nodes.find((treeNode) => treeNode.id === id);
    },
    getTreeNodeByDomNode(domNode: Node): TreeNode | undefined {
      return nodes.find((treeNode) => treeNode.domNode === domNode);
    },
  };
}

export function simulateDispatchEvent(config: {
  tree: DomTree;
  eventConfig: EventInit;
}): EventDispatchingStep[] {
  const { tree, eventConfig } = config;

  const steps: EventDispatchingStep[] = [];

  function handler(event: Event) {
    steps.push({
      target: tree.getTreeNodeByDomNode(event.target as Node)!,
      currentTarget: tree.getTreeNodeByDomNode(event.currentTarget as Node)!,
      composedPath: event
        .composedPath()
        .map((evtTarget) => tree.getTreeNodeByDomNode(evtTarget as Node)!),
    });
  }

  // Add event listener
  for (const treeNode of tree.nodes.values()) {
    treeNode.domNode.addEventListener(EVENT_NAME, handler);
  }

  // Dispatch event
  const event = new CustomEvent(EVENT_NAME, eventConfig);
  tree.target.domNode.dispatchEvent(event);

  // Clean up event listener post dispatch
  for (const node of tree.nodes.values()) {
    node.domNode.removeEventListener(EVENT_NAME, handler);
  }

  return steps;
}
