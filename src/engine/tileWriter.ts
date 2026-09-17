import { Tile } from '../types/simulation';

/**
 * Returns a new tiles array with fresh layer and row arrays, but the SAME tile
 * object references. Cheap (~depthZ*sizeY array allocations). Mutating a tile
 * requires getWritableTile, which clones the tile before its first write so the
 * original (previous React state) is never mutated.
 */
export function cloneTilesSpine(base: Tile[][][]): Tile[][][] {
  return base.map(layer => layer.map(row => row.slice()));
}

/**
 * Returns a writable tile at (z,y,x) within `tiles`. On the first write to a
 * coordinate this tick, clones the tile and swaps the clone into its row so
 * `base` (the previous state) stays untouched. Returns undefined if out of range.
 */
export function getWritableTile(
  tiles: Tile[][][],
  base: Tile[][][],
  z: number,
  y: number,
  x: number,
): Tile | undefined {
  const row = tiles[z]?.[y];
  if (!row) return undefined;
  const current = row[x];
  if (!current) return undefined;
  if (current === base[z]?.[y]?.[x]) {
    const copy = { ...current };
    row[x] = copy;
    return copy;
  }
  return current; // already cloned earlier this tick
}
