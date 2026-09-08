/**
 * Active Task Index for Dwarf Fortress Simulation
 * Tracks coordinates of active designations (mine, chop, build),
 * available stockpiles by type, and beds for fast O(1) lookup.
 */

import { Tile, TaskIndex } from '../types/simulation';

export function buildTaskIndex(tiles: Tile[][][]): TaskIndex {
  const index: TaskIndex = {
    mining: new Map(),
    chopping: new Map(),
    building: new Map(),
    stockpiles: {
      stone: new Map(),
      wood: new Map(),
      food: new Map(),
      ore: new Map(),
    },
    beds: new Map(),
  };

  const depthZ = tiles.length;
  for (let z = 0; z < depthZ; z++) {
    const sizeY = tiles[z].length;
    for (let y = 0; y < sizeY; y++) {
      const sizeX = tiles[z][y].length;
      for (let x = 0; x < sizeX; x++) {
        const tile = tiles[z][y][x];
        const key = `${x},${y},${z}`;

        if (tile.designation === 'mine') {
          index.mining.set(key, { x, y, z });
        } else if (tile.designation === 'chop' && tile.material === 'tree_trunk') {
          index.chopping.set(key, { x, y, z });
        } else if (tile.designation.startsWith('build_')) {
          index.building.set(key, { x, y, z, type: tile.designation });
        }

        if (tile.stockpile === 'stone') {
          index.stockpiles.stone.set(key, { x, y, z });
        } else if (tile.stockpile === 'wood') {
          index.stockpiles.wood.set(key, { x, y, z });
        } else if (tile.stockpile === 'food') {
          index.stockpiles.food.set(key, { x, y, z });
        } else if (tile.stockpile === 'ore') {
          index.stockpiles.ore.set(key, { x, y, z });
        }

        if (tile.material === 'bed') {
          index.beds.set(key, { x, y, z });
        }
      }
    }
  }

  return index;
}

export function updateTileInTaskIndex(
  index: TaskIndex,
  x: number,
  y: number,
  z: number,
  _oldTile: { designation?: string; stockpile?: string; material?: string } | null,
  newTile: { designation: string; stockpile: string; material: string }
): void {
  const key = `${x},${y},${z}`;

  // Clean up any existing index entries at this coordinate
  index.mining.delete(key);
  index.chopping.delete(key);
  index.building.delete(key);
  index.stockpiles.stone.delete(key);
  index.stockpiles.wood.delete(key);
  index.stockpiles.food.delete(key);
  index.stockpiles.ore.delete(key);
  index.beds.delete(key);

  // Register new designation / stockpile / material if applicable
  if (newTile.designation === 'mine') {
    index.mining.set(key, { x, y, z });
  } else if (newTile.designation === 'chop' && newTile.material === 'tree_trunk') {
    index.chopping.set(key, { x, y, z });
  } else if (newTile.designation.startsWith('build_')) {
    index.building.set(key, { x, y, z, type: newTile.designation });
  }

  if (newTile.stockpile === 'stone') {
    index.stockpiles.stone.set(key, { x, y, z });
  } else if (newTile.stockpile === 'wood') {
    index.stockpiles.wood.set(key, { x, y, z });
  } else if (newTile.stockpile === 'food') {
    index.stockpiles.food.set(key, { x, y, z });
  } else if (newTile.stockpile === 'ore') {
    index.stockpiles.ore.set(key, { x, y, z });
  }

  if (newTile.material === 'bed') {
    index.beds.set(key, { x, y, z });
  }
}
