import { Tile } from '../types/simulation';

/**
 * Common building placement validation rule for both Player and DF-AI.
 * Allowed foundation surfaces: floor_stone, floor_dirt, floor_wood, floor_engraved, grass, air.
 * Strictly forbidden: water, magma, and solid unmined rock/ores/soil.
 */
export function canPlaceBuilding(tile: Tile | null | undefined, _type?: string): boolean {
  if (!tile) return false;

  // Cannot build on liquids
  if (tile.material === 'water' || tile.material === 'magma') {
    return false;
  }

  // Allowed building foundations (excavated floors, surface soil/grass, open air)
  const allowedMaterials = new Set([
    'floor_stone',
    'floor_dirt',
    'floor_wood',
    'floor_engraved',
    'grass',
    'air'
  ]);

  return allowedMaterials.has(tile.material);
}
