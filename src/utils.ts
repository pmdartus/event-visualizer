import { TreeNode } from "./main";

export function getTreeNodeLabel(node: TreeNode): string {
  if (node instanceof Element) {
    let label = node.tagName.toLocaleLowerCase();
    if (node.hasAttribute("id")) {
      label += `#${node.getAttribute("id")}`;
    }
    return label;
  } else {
    return "[shadow-root]";
  }
}
