/**
 * 3D A* Pathfinding Engine for multi-Z-level terrain
 * Ported and adapted from kevshakes/dwarf-fortress-simulation/ai/pathfinding.py
 */

import { Tile } from '../types/simulation';

interface Node {
  x: number;
  y: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

class BinaryHeap {
  private data: Node[] = [];

  get size(): number {
    return this.data.length;
  }

  push(item: Node): void {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): Node | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    const item = this.data[index];
    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = this.data[parentIndex];
      if (item.f < parent.f) {
        this.data[index] = parent;
        index = parentIndex;
      } else {
        break;
      }
    }
    this.data[index] = item;
  }

  private bubbleDown(index: number): void {
    const length = this.data.length;
    const item = this.data[index];
    while (true) {
      const leftIndex = (index << 1) + 1;
      const rightIndex = leftIndex + 1;
      let smallestIndex = index;

      if (leftIndex < length && this.data[leftIndex].f < this.data[smallestIndex].f) {
        smallestIndex = leftIndex;
      }
      if (rightIndex < length && this.data[rightIndex].f < this.data[smallestIndex].f) {
        smallestIndex = rightIndex;
      }

      if (smallestIndex !== index) {
        this.data[index] = this.data[smallestIndex];
        index = smallestIndex;
      } else {
        break;
      }
    }
    this.data[index] = item;
  }
}

export function findPath3D(
  startX: number,
  startY: number,
  startZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  tiles: Tile[][][],
  sizeX: number,
  sizeY: number,
  depthZ: number,
  allowAdjacentTarget: boolean = true
): [number, number, number][] | null {
  // If already at target
  if (startX === targetX && startY === targetY && startZ === targetZ) {
    return [[startX, startY, startZ]];
  }

  const isWalkable = (x: number, y: number, z: number): boolean => {
    if (x < 0 || x >= sizeX || y < 0 || y >= sizeY || z < 0 || z >= depthZ) return false;
    const tile = tiles[z][y][x];

    // Cannot walk on thin air - must have solid footing
    if (tile.material === 'air') {
      return false;
    }

    // Magma is lethal / impassable
    if (tile.material === 'magma') {
      return false;
    }

    // Deep water is impassable
    if (tile.material === 'water' && tile.waterLevel >= 5) {
      return false;
    }

    // Solid blocks you cannot walk through:
    if (
      tile.material === 'stone' ||
      tile.material === 'granite' ||
      tile.material === 'marble' ||
      tile.material === 'obsidian' ||
      tile.material === 'slade' ||
      tile.material === 'adamantine' ||
      tile.material === 'ore_iron' ||
      tile.material === 'ore_gold' ||
      tile.material === 'ore_copper' ||
      tile.material === 'ore_coal' ||
      tile.material === 'ore_gem' ||
      tile.material === 'tree_trunk' ||
      tile.material === 'tree_foliage' ||
      tile.material === 'wall_constructed'
    ) {
      return false;
    }

    return true;
  };

  const heuristic = (x: number, y: number, z: number): number => {
    // Manhattan distance with Z-penalty
    return Math.abs(x - targetX) + Math.abs(y - targetY) + Math.abs(z - targetZ) * 2;
  };

  const openHeap = new BinaryHeap();
  const gScores = new Map<string, number>();
  const closedSet: Set<string> = new Set();

  const startH = heuristic(startX, startY, startZ);
  const startNode: Node = {
    x: startX,
    y: startY,
    z: startZ,
    g: 0,
    h: startH,
    f: startH,
    parent: null
  };

  openHeap.push(startNode);
  gScores.set(`${startX},${startY},${startZ}`, 0);

  // Maximum exploration steps proportional to map size (sizeX * sizeY / 4)
  const maxSteps = Math.max(800, Math.floor((sizeX * sizeY) / 4));
  let steps = 0;

  while (openHeap.size > 0 && steps < maxSteps) {
    steps++;

    const current = openHeap.pop()!;
    const key = `${current.x},${current.y},${current.z}`;

    // Target reached check
    if (current.x === targetX && current.y === targetY && current.z === targetZ) {
      return reconstructPath(current);
    }

    // If target itself is a solid rock/tree being mined, allow reaching an adjacent tile
    if (
      allowAdjacentTarget &&
      Math.abs(current.x - targetX) <= 1 &&
      Math.abs(current.y - targetY) <= 1 &&
      Math.abs(current.z - targetZ) <= 1
    ) {
      return reconstructPath(current);
    }

    if (closedSet.has(key)) continue;
    closedSet.add(key);

    const bestG = gScores.get(key);
    if (bestG !== undefined && current.g > bestG) {
      continue;
    }

    // Neighbors: 4 cardinal directions, plus 1 Z-level transitions
    const neighbors: [number, number, number][] = [
      [current.x + 1, current.y, current.z],
      [current.x - 1, current.y, current.z],
      [current.x, current.y + 1, current.z],
      [current.x, current.y - 1, current.z],
      // Diagonal movement on same Z
      [current.x + 1, current.y + 1, current.z],
      [current.x - 1, current.y + 1, current.z],
      [current.x + 1, current.y - 1, current.z],
      [current.x - 1, current.y - 1, current.z],
      // Up/Down slope or stairs
      [current.x + 1, current.y, current.z + 1],
      [current.x - 1, current.y, current.z + 1],
      [current.x, current.y + 1, current.z + 1],
      [current.x, current.y - 1, current.z + 1],
      [current.x + 1, current.y, current.z - 1],
      [current.x - 1, current.y, current.z - 1],
      [current.x, current.y + 1, current.z - 1],
      [current.x, current.y - 1, current.z - 1]
    ];

    for (const [nx, ny, nz] of neighbors) {
      if (nx < 0 || nx >= sizeX || ny < 0 || ny >= sizeY || nz < 0 || nz >= depthZ) continue;

      const nKey = `${nx},${ny},${nz}`;
      if (closedSet.has(nKey)) continue;

      if (!isWalkable(nx, ny, nz)) {
        // If it's the target itself (e.g. tree or rock tile designated for work), skip walking on it directly
        continue;
      }

      const moveCost = (nx !== current.x && ny !== current.y ? 1.414 : 1.0) + (nz !== current.z ? 1.8 : 0);
      const neighborG = current.g + moveCost;

      const existingG = gScores.get(nKey);
      if (existingG === undefined || neighborG < existingG) {
        gScores.set(nKey, neighborG);
        const neighborH = heuristic(nx, ny, nz);
        const neighborNode: Node = {
          x: nx,
          y: ny,
          z: nz,
          g: neighborG,
          h: neighborH,
          f: neighborG + neighborH,
          parent: current
        };
        openHeap.push(neighborNode);
      }
    }
  }

  // If no direct path found, return null
  return null;
}

function reconstructPath(endNode: Node): [number, number, number][] {
  const path: [number, number, number][] = [];
  let curr: Node | null = endNode;
  while (curr) {
    path.unshift([curr.x, curr.y, curr.z]);
    curr = curr.parent;
  }
  return path;
}
