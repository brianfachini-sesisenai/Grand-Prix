export function dijkstra(graph, startNode, endNode) {
  let distances = {};
  let prev = {};
  let queue = new Set();

  for (let node in graph) {
    distances[node] = Infinity;
    prev[node] = null;
    queue.add(node);
  }

  if (!graph[startNode]) return [];

  distances[startNode] = 0;

  while (queue.size > 0) {
    let minNode = null;
    for (let node of queue) {
      if (minNode === null || distances[node] < distances[minNode]) {
        minNode = node;
      }
    }

    if (distances[minNode] === Infinity) {
      break;
    }

    queue.delete(minNode);

    if (minNode === endNode) {
      break;
    }

    for (let neighbor in graph[minNode]) {
      let alt = distances[minNode] + graph[minNode][neighbor];
      if (alt < distances[neighbor]) {
        distances[neighbor] = alt;
        prev[neighbor] = minNode;
      }
    }
  }

  let path = [];
  let u = endNode;
  if (prev[u] !== null || u === startNode) {
    while (u !== null) {
      path.unshift(u);
      u = prev[u];
    }
  }

  return path;
}
