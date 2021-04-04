import { DomTree, ShadowRootTreeNode, TreeNodeType } from "../../dom";
import { Graph, RoughSVG } from "../types";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SHADOW_TREE_PADDING = 10;

function isNodeContained(node: Node, root: ShadowRoot): boolean {
  if (node === root) {
    return false;
  }

  let currentRoot = node.getRootNode();
  while (currentRoot instanceof ShadowRoot) {
    if (currentRoot === root) {
      return true;
    }

    currentRoot = currentRoot.host.getRootNode();
  }

  return false;
}

export function render({
  tree,
  graph,
  root,
  rc,
}: {
  tree: DomTree;
  graph: Graph;
  root: SVGSVGElement;
  rc: RoughSVG;
}) {
  const shadowTrees = new Map<ShadowRootTreeNode, BoundingBox>();

  const computeShadowTreeBoundingBox = (rootTreeNode: ShadowRootTreeNode): BoundingBox => {
    let boundingBox = shadowTrees.get(rootTreeNode);

    if (!boundingBox) {
      const containedNodes = tree.nodes.filter((treeNode) =>
        isNodeContained(treeNode.domNode, rootTreeNode.domNode)
      );

      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;

      for (const containedNode of [rootTreeNode, ...containedNodes]) {
        let nodeBoundingBox: BoundingBox = graph.node(containedNode.id);

        if (rootTreeNode !== containedNode && containedNode.type === TreeNodeType.ShadowRoot) {
          nodeBoundingBox = computeShadowTreeBoundingBox(containedNode);
        }

        minX = Math.min(minX, nodeBoundingBox.x - nodeBoundingBox.width / 2);
        minY = Math.min(minY, nodeBoundingBox.y - nodeBoundingBox.height / 2);
        maxX = Math.max(maxX, nodeBoundingBox.x + nodeBoundingBox.width / 2);
        maxY = Math.max(maxY, nodeBoundingBox.y + nodeBoundingBox.height / 2);
      }

      const width = maxX - minX;
      const height = maxY - minY;

      boundingBox = {
        x: minX + width / 2,
        y: minY + height / 2,
        width: width + 2 * SHADOW_TREE_PADDING,
        height: height + 2 * SHADOW_TREE_PADDING,
      };

      shadowTrees.set(rootTreeNode, boundingBox);
    }

    return boundingBox;
  };

  for (const treeNode of tree.nodes) {
    if (treeNode.type === TreeNodeType.ShadowRoot) {
      const boundingBox = computeShadowTreeBoundingBox(treeNode);

      const rect = rc.rectangle(
        boundingBox.x - boundingBox.width / 2,
        boundingBox.y - boundingBox.height / 2,
        boundingBox.width,
        boundingBox.height,
        {
          fill: "white",
          fillStyle: "solid",
        }
      );
      rect.classList.add("shadow-tree");
      root.appendChild(rect);
    }
  }
}
