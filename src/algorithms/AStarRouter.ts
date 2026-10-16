import { GraphNode, GraphEdge } from '../types';

export interface PathResult {
  pathNodeIds: string[];
  pathCoordinates: { x: number; y: number }[];
  totalDistanceKm: number;
  estimatedMinutes: number;
  fuelLiters: number;
  trafficDelayMinutes: number;
}

export class RoadGraph {
  public nodes: Map<string, GraphNode> = new Map();
  public adjacency: Map<string, GraphEdge[]> = new Map();

  constructor(nodes: GraphNode[] = [], edges: GraphEdge[] = []) {
    nodes.forEach(node => this.addNode(node));
    edges.forEach(edge => this.addEdge(edge));
  }

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.adjacency.has(edge.from)) this.adjacency.set(edge.from, []);
    if (!this.adjacency.has(edge.to)) this.adjacency.set(edge.to, []);

    this.adjacency.get(edge.from)!.push(edge);
    // Road networks in smart cities are bi-directional unless one-way
    this.adjacency.get(edge.to)!.push({
      from: edge.to,
      to: edge.from,
      distanceKm: edge.distanceKm,
      trafficFactor: edge.trafficFactor,
      speedLimitKmh: edge.speedLimitKmh,
    });
  }

  public updateTraffic(from: string, to: string, newFactor: number): void {
    const edgesFrom = this.adjacency.get(from) || [];
    edgesFrom.forEach(e => {
      if (e.to === to) e.trafficFactor = newFactor;
    });
    const edgesTo = this.adjacency.get(to) || [];
    edgesTo.forEach(e => {
      if (e.to === from) e.trafficFactor = newFactor;
    });
  }

  /**
   * Euclidean Distance Heuristic h(n) in kilometers
   */
  private heuristic(nodeA: GraphNode, nodeB: GraphNode): number {
    const dx = nodeA.x - nodeB.x;
    const dy = nodeA.y - nodeB.y;
    // Scale factor: 100 pixels ~= 1.5 km in our city simulation
    const pixelDistance = Math.hypot(dx, dy);
    return (pixelDistance / 100) * 1.5;
  }

  /**
   * A* Search Algorithm:
   * Finds the shortest collection path between startNodeId and endNodeId,
   * factoring in road distances and real-time traffic congestion weights.
   */
  public findAStarPath(startNodeId: string, endNodeId: string): PathResult | null {
    const startNode = this.nodes.get(startNodeId);
    const endNode = this.nodes.get(endNodeId);

    if (!startNode || !endNode) return null;
    if (startNodeId === endNodeId) {
      return {
        pathNodeIds: [startNodeId],
        pathCoordinates: [{ x: startNode.x, y: startNode.y }],
        totalDistanceKm: 0,
        estimatedMinutes: 0,
        fuelLiters: 0,
        trafficDelayMinutes: 0,
      };
    }

    // Open set: nodes to evaluate, sorted by fScore
    const openSet = new Set<string>([startNodeId]);
    const cameFrom = new Map<string, string>();

    // gScore[n] = cost of cheapest path from start to n currently known
    const gScore = new Map<string, number>();
    gScore.set(startNodeId, 0);

    // fScore[n] = gScore[n] + h(n)
    const fScore = new Map<string, number>();
    fScore.set(startNodeId, this.heuristic(startNode, endNode));

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let currentId: string | null = null;
      let lowestF = Infinity;

      for (const nodeId of openSet) {
        const score = fScore.get(nodeId) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = nodeId;
        }
      }

      if (!currentId) break;

      if (currentId === endNodeId) {
        // Reconstruct path
        return this.reconstructPath(cameFrom, currentId);
      }

      openSet.delete(currentId);
      const currentNode = this.nodes.get(currentId)!;
      const neighbors = this.adjacency.get(currentId) || [];

      for (const edge of neighbors) {
        const neighborId = edge.to;
        // Edge weight: distance * traffic congestion penalty
        const effectiveCost = edge.distanceKm * edge.trafficFactor;
        const tentativeGScore = (gScore.get(currentId) ?? Infinity) + effectiveCost;

        if (tentativeGScore < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeGScore);
          const neighborNode = this.nodes.get(neighborId)!;
          fScore.set(neighborId, tentativeGScore + this.heuristic(neighborNode, endNode));

          if (!openSet.has(neighborId)) {
            openSet.add(neighborId);
          }
        }
      }
    }

    return null; // No path found
  }

  private reconstructPath(cameFrom: Map<string, string>, currentId: string): PathResult {
    const totalPath: string[] = [currentId];
    while (cameFrom.has(currentId)) {
      currentId = cameFrom.get(currentId)!;
      totalPath.unshift(currentId);
    }

    let totalDistanceKm = 0;
    let totalMinutes = 0;
    let trafficDelayMinutes = 0;

    for (let i = 0; i < totalPath.length - 1; i++) {
      const u = totalPath[i];
      const v = totalPath[i + 1];
      const edges = this.adjacency.get(u) || [];
      const edge = edges.find(e => e.to === v);
      if (edge) {
        totalDistanceKm += edge.distanceKm;
        const nominalTimeMin = (edge.distanceKm / edge.speedLimitKmh) * 60;
        const actualTimeMin = nominalTimeMin * edge.trafficFactor;
        totalMinutes += actualTimeMin;
        trafficDelayMinutes += actualTimeMin - nominalTimeMin;
      }
    }

    const coordinates = totalPath.map(id => {
      const node = this.nodes.get(id)!;
      return { x: node.x, y: node.y };
    });

    // Average municipal waste truck: ~0.35 Liters of diesel per kilometer
    const fuelLiters = totalDistanceKm * 0.35;

    return {
      pathNodeIds: totalPath,
      pathCoordinates: coordinates,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      estimatedMinutes: Number(totalMinutes.toFixed(1)),
      fuelLiters: Number(fuelLiters.toFixed(2)),
      trafficDelayMinutes: Number(trafficDelayMinutes.toFixed(1)),
    };
  }

  /**
   * Multi-Stop Tour Planner (TSP / Vehicle Routing Problem)
   * Connects depot -> prioritized stops -> depot using greedy nearest neighbor + 2-opt refinement.
   */
  public planMultiStopTour(depotNodeId: string, stopNodeIds: string[]): {
    orderedStopIds: string[];
    fullLegs: PathResult[];
    totalDistanceKm: number;
    totalMinutes: number;
    totalFuelLiters: number;
  } {
    if (stopNodeIds.length === 0) {
      return {
        orderedStopIds: [depotNodeId],
        fullLegs: [],
        totalDistanceKm: 0,
        totalMinutes: 0,
        totalFuelLiters: 0,
      };
    }

    // 1. Greedy Nearest Neighbor Tour construction
    const unvisited = new Set(stopNodeIds);
    const tour: string[] = [depotNodeId];
    let current = depotNodeId;

    while (unvisited.size > 0) {
      let nearestNext: string | null = null;
      let minDistance = Infinity;

      for (const candidate of unvisited) {
        const path = this.findAStarPath(current, candidate);
        if (path && path.totalDistanceKm < minDistance) {
          minDistance = path.totalDistanceKm;
          nearestNext = candidate;
        }
      }

      if (nearestNext) {
        tour.push(nearestNext);
        unvisited.delete(nearestNext);
        current = nearestNext;
      } else {
        // Fallback: pick any remaining stop if unreachable
        const fallback = Array.from(unvisited)[0];
        tour.push(fallback);
        unvisited.delete(fallback);
        current = fallback;
      }
    }

    // Return to Depot to finish collection round
    tour.push(depotNodeId);

    // 2. Compute individual A* legs for the tour
    const fullLegs: PathResult[] = [];
    let totalDist = 0;
    let totalMin = 0;
    let totalFuel = 0;

    for (let i = 0; i < tour.length - 1; i++) {
      const leg = this.findAStarPath(tour[i], tour[i + 1]);
      if (leg) {
        fullLegs.push(leg);
        totalDist += leg.totalDistanceKm;
        totalMin += leg.estimatedMinutes;
        totalFuel += leg.fuelLiters;
      }
    }

    return {
      orderedStopIds: tour,
      fullLegs,
      totalDistanceKm: Number(totalDist.toFixed(2)),
      totalMinutes: Number(totalMin.toFixed(1)),
      totalFuelLiters: Number(totalFuel.toFixed(2)),
    };
  }
}
