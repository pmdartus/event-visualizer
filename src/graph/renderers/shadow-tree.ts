import { Graph, GraphNode, GraphEdge, GraphEdgeType, RoughSVG } from "../types";

function getBoundingBox(graph) {}

export function render({ graph, root, rc }: { graph: Graph; root: SVGSVGElement; rc: RoughSVG }) {
  // for (const nodeId of graph.nodes()) {
  //   const node = graph.node(nodeId);
  //   if (node.treeNode.type !== tree.ShadowRoot) {
  //     const shadowRoot = node.treeNode;
  //     const containedNodes = graph
  //       .nodes()
  //       .filter((nodeId) => {
  //         const { treeNode } = graph.node(nodeId);
  //         if (treeNode === null) {
  //           return false;
  //         }
  //         let currentRoot = treeNode.getRootNode();
  //         while (currentRoot instanceof ShadowRoot) {
  //           if (currentRoot === shadowRoot) {
  //             return true;
  //           }
  //           currentRoot = currentRoot.host.getRootNode();
  //         }
  //         return false;
  //       })
  //       .map((nodeId) => {
  //         const node = graph.node(nodeId);
  //         let depth = 1;
  //         let currentRoot = node.treeNode?.getRootNode();
  //         while (currentRoot !== shadowRoot && currentRoot instanceof ShadowRoot) {
  //           depth++;
  //           currentRoot = currentRoot.host.getRootNode();
  //         }
  //         return {
  //           node,
  //           depth,
  //         };
  //       });
  //     let minX = Infinity,
  //       minY = Infinity;
  //     let maxX = -Infinity,
  //       maxY = -Infinity;
  //     let maxDepth = 1;
  //     for (const { node, depth } of containedNodes) {
  //       minX = Math.min(minX, node.x - node.width / 2);
  //       minY = Math.min(minY, node.y - node.height / 2);
  //       maxX = Math.max(maxX, node.x + node.width / 2);
  //       maxY = Math.max(maxY, node.y + node.height / 2);
  //       maxDepth = Math.max(depth, maxDepth);
  //     }
  //     const rect = rc.rectangle(
  //       minX - maxDepth * SHADOW_TREE_PADDING,
  //       minY - maxDepth * SHADOW_TREE_PADDING,
  //       maxX - minX + 2 * maxDepth * SHADOW_TREE_PADDING,
  //       maxY - minY + 2 * maxDepth * SHADOW_TREE_PADDING,
  //       {
  //         fill: "white",
  //         fillStyle: "solid",
  //       }
  //     );
  //     rect.classList.add("shadow-tree");
  //     root.appendChild(rect);
  //   }
  // }
}
