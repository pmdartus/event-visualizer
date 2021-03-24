import { Graph, GraphEdge, Layer, GraphNodeType } from "./graph";
import { NODE_SIZE, HORIZONTAL_SPACING, VERTICAL_SPACING } from "./graph-constants";

// https://blog.disy.net/sugiyama-method/
// http://www.graphviz.org/Documentation/TSE93.pdf
// https://publications.lib.chalmers.se/records/fulltext/161388.pdf
// https://i11www.iti.kit.edu/_media/teaching/winter2016/graphvis/graphvis-ws16-v8.pdf

function assignToLayers(graph: Graph) {
  const layers: Layer[] = [];

  let remainingNodes = [...graph.nodes];
  let remainingEdges = [...graph.edges];

  while (remainingNodes.length !== 0 || remainingEdges.length !== 0) {
    const layer = remainingNodes
      .filter((node) => remainingEdges.every((edge) => edge.to !== node.id))
      .map((node) => node.id);

    remainingNodes = remainingNodes.filter((node) => !layer.includes(node.id));
    remainingEdges = remainingEdges.filter((edge) => !layer.includes(edge.from));

    layers.push(layer);
  }

  graph.layers = layers;
}

function fillLayers(graph: Graph) {
  let currentId = 0;

  for (let i = 0; i < graph.layers.length - 1; i++) {
    const layer = graph.layers[i];
    const nextLayer = graph.layers[i + 1];

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

function updateCoordinates(graph: Graph) {
  const { nodes, layers } = graph;

  // Give initial node coordinates
  for (const node of nodes) {
    const layerIndex = graph.getLayer(node.id);
    const indexInLayer = layers[layerIndex].indexOf(node.id);

    node.x = (NODE_SIZE + HORIZONTAL_SPACING) * indexInLayer;
    node.y = (NODE_SIZE + VERTICAL_SPACING) * layerIndex;
  }

  // Redistribute node coordinates
  for (let layerIndex = 0; layerIndex < graph.layers.length; layerIndex += 2) {
    const layer = graph.layers[layerIndex];
    for (const nodeId of layer) {
      const node = graph.getNode(nodeId)!;
      const children = [
        ...graph.getIncomingEdges(nodeId).map((edge) => graph.getNode(edge.from)!),
        ...graph.getOutgoingEdges(nodeId).map((edge) => graph.getNode(edge.to)!),
      ];

      const xMean = children.reduce((acc, child) => acc + child.x, 0) / children.length;
      node.x = xMean;
    }
  }
}

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

export function layoutGraph(graph: Graph) {
  assignToLayers(graph);
  fillLayers(graph);
  updateCoordinates(graph);
  cleanupVirtual(graph);
}
