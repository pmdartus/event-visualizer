import { Graph, GraphEdge, Layer, GraphNodeType } from "./graph";

// https://blog.disy.net/sugiyama-method/
// http://www.graphviz.org/Documentation/TSE93.pdf
// https://publications.lib.chalmers.se/records/fulltext/161388.pdf
// https://i11www.iti.kit.edu/_media/teaching/winter2016/graphvis/graphvis-ws16-v8.pdf

interface LayoutConfig {
  horizontalSpacing: number;
  verticalSpacing: number;
}

// Give weight for each nodes. The higher the weight is the further it will be on the right-hand
// side of the graph. In this case we want all the shadow tree to be on the right of the subtrees.
const NODE_WEIGHT: Record<GraphNodeType, number> = {
  [GraphNodeType.Element]: 0,
  [GraphNodeType.Virtual]: 0,
  [GraphNodeType.ShadowRoot]: 1,
};

/**
 * Assign each node to a graph layer.
 */
function assignToLayers(graph: Graph) {
  const layers: Layer[] = [];

  let remainingNodes = [...graph.nodes];
  let remainingEdges = [...graph.edges];

  // Until all the nodes have been assigned to a layer runs the following check. A node can be
  // assigned to a layer if all the nodes from the incoming connects have already been assigned.
  // This approach only works because the graph is acyclic by nature.
  while (remainingNodes.length !== 0) {
    const layer = remainingNodes
      .filter((node) => remainingEdges.every((edge) => edge.to !== node.id))
      .map((node) => node.id);

    remainingNodes = remainingNodes.filter((node) => !layer.includes(node.id));
    remainingEdges = remainingEdges.filter((edge) => !layer.includes(edge.from));

    layers.push(layer);
  }

  graph.layers = layers;
}

/**
 * Populate the layers with virtual nodes and virtual edges.
 */
function fillLayers(graph: Graph) {
  const { layers } = graph;

  let currentId = 0;

  // A new virtual node has to be added is an outgoing edge from a given point to another node
  // located in a layer different than the one below. In this case, a new virtual node is added in
  // the next layer and the outgoing edge is broken into 2: an edge from the origin node to the
  // virtual node and another one from the virtual node to the target node.
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const nextLayer = layers[i + 1];

    for (const nodeId of layer) {
      const outgoingEdges = graph.getOutgoingEdges(nodeId);

      for (const outgoingEdge of outgoingEdges) {
        if (!nextLayer.includes(outgoingEdge.to)) {
          const virtualId = `#${currentId++}`;

          graph.createNode({
            id: virtualId,
            type: GraphNodeType.Virtual,
            treeNode: null,
          });
          nextLayer.push(virtualId);

          graph.createEdge({
            from: virtualId,
            to: outgoingEdge.to,
            type: outgoingEdge.type,
          });
          outgoingEdge.to = virtualId;
        }
      }
    }
  }
}

/**
 * Reorder all the nodes to minimize potential crossing.
 */
function reorderLayers(graph: Graph) {
  const { layers } = graph;

  // Recompute node position based on the barycenter with the previous layer. This approach is
  // far from being ideal since it ignores children order.
  for (let i = 1; i < layers.length; i++) {
    const layer = layers[i];
    const previousLayer = layers[i - 1];

    const nodesParentBarycenter = layer.map((id) => {
      const incomingEdges = graph.getIncomingEdges(id);

      const barycenter =
        incomingEdges
          .map((edge) => previousLayer.indexOf(edge.from))
          .reduce((acc, position) => acc + position) / incomingEdges.length;

      return {
        id,
        barycenter,
      };
    });

    // If 2 nodes have the same barycenter, determine the node position based on the node weight.
    layers[i] = nodesParentBarycenter
      .sort((itemA, itemB) => {
        if (itemA.barycenter !== itemB.barycenter) {
          return itemA.barycenter - itemB.barycenter;
        } else {
          const nodeA = graph.getNode(itemA.id)!;
          const nodeB = graph.getNode(itemB.id)!;

          return NODE_WEIGHT[nodeA.type] - NODE_WEIGHT[nodeB.type];
        }
      })
      .map((item) => item.id);
  }
}

function updateCoordinates(graph: Graph, config: LayoutConfig) {
  const { nodes, layers } = graph;
  const { verticalSpacing, horizontalSpacing } = config;

  // Give initial node (X,Y) coordinates.
  // At the end all the nodes in the graph are compacted on the left-hand side.
  let prevY = 0;
  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const currentLayerNodes = graph.getNodesInLayer(layerIndex);

    // Get the current layer Y coordinate, by getting the tallest node height and positioning the
    // current layer relative to the tallest node.
    const highestNodeInCurrentLayer = currentLayerNodes.reduce(
      (maxHeight, node) => Math.max(maxHeight, node.height),
      0
    );
    const currentLayerY = prevY + verticalSpacing + highestNodeInCurrentLayer / 2;

    // Assign X coordinate related to the previous nodes in the current layer. Assign Y coordinate
    // to the computed layer height.
    let prevX = 0;
    for (const node of currentLayerNodes) {
      node.x = prevX + horizontalSpacing + node.width / 2;
      node.y = currentLayerY;

      prevX = node.x + node.width / 2;
    }

    // Update the previous layer max Y to prepare for rendering the next layer.
    prevY = currentLayerY + highestNodeInCurrentLayer / 2;
  }

  // Redistribute node coordinates
  for (let layerIndex = 1; layerIndex < graph.layers.length; layerIndex++) {
    const layerNodes = graph.getNodesInLayer(layerIndex);
    for (const node of layerNodes) {
      const connectedNodes = [
        ...graph.getIncomingEdges(node.id).map((edge) => graph.getNode(edge.from)!),
        ...graph.getOutgoingEdges(node.id).map((edge) => graph.getNode(edge.to)!),
      ];

      const xMean = connectedNodes.reduce((acc, child) => acc + child.x, 0) / connectedNodes.length;
      node.x = xMean;
    }
  }
}

/**
 * Clean up the graph after it being layed out:
 *  - Remove all the inserted virtual nodes
 *  - Remove virtual nodes from graph layers
 *  - Collapse virtual edges into concrete edges
 */
function cleanupVirtual(graph: Graph) {
  const { nodes, edges, layers } = graph;

  const concreteEdges: GraphEdge[] = [];

  // Remove the virtual nodes
  const concreteNodes = nodes.filter((node) => node.type !== GraphNodeType.Virtual);

  // Remove virtual nodes from layers
  const concreteLayers = layers.map((layer) => {
    return layer.filter((nodeId) => concreteNodes.some((node) => node.id === nodeId));
  });

  // Keep concrete edges and collapse virtual edges together.
  for (const edge of edges) {
    let isConcrete = false;

    const fromNode = graph.getNode(edge.from)!;
    let toNode = graph.getNode(edge.to)!;

    if (fromNode.type !== GraphNodeType.Virtual && toNode.type !== GraphNodeType.Virtual) {
      isConcrete = true;
      edge.path = [
        [fromNode.x, fromNode.y + fromNode.height / 2],
        [toNode.x, toNode.y - toNode.height / 2],
      ];
    } else if (fromNode.type !== GraphNodeType.Virtual) {
      isConcrete = true;
      const path: [number, number][] = [];

      path.push([fromNode.x, fromNode.y + fromNode.height / 2]);

      while (toNode.type === GraphNodeType.Virtual) {
        path.push([toNode.x, toNode.y]);

        const followingEdge = graph.getOutgoingEdges(toNode.id)[0];
        toNode = graph.getNode(followingEdge.to)!;
      }

      path.push([toNode.x, toNode.y - toNode.height / 2]);

      edge.to = toNode.id;
      edge.path = path;
    }

    if (isConcrete) {
      concreteEdges.push(edge);
    }
  }

  // Update graph properties
  graph.nodes = concreteNodes;
  graph.edges = concreteEdges;
  graph.layers = concreteLayers;
}

export function layoutGraph(graph: Graph, config: LayoutConfig) {
  assignToLayers(graph);
  fillLayers(graph);
  reorderLayers(graph);
  updateCoordinates(graph, config);
  cleanupVirtual(graph);
}
