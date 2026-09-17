import { Tile, MaterialType } from '../types/simulation';

/**
 * Solid materials at z - 1 that can serve as a solid floor or foundation
 * supporting construction in an air tile at z.
 */
export const SOLID_FOUNDATION_MATERIALS: ReadonlySet<MaterialType> = new Set<MaterialType>([
  // Excavated / constructed floors
  'floor_stone',
  'floor_dirt',
  'floor_wood',
  'floor_engraved',
  // Natural terrain & soils
  'grass',
  'soil',
  'sand',
  'cave_moss',
  // Natural solid rocks & ores
  'stone',
  'granite',
  'marble',
  'obsidian',
  'slade',
  'adamantine',
  'ore_iron',
  'ore_gold',
  'ore_copper',
  'ore_coal',
  'ore_gem',
  // Constructed solid structures
  'wall_constructed',
  // Solid natural tree trunks
  'tree_trunk',
  'fungal_tree'
]);

/**
 * Materials on which a building can be directly placed if the tile itself is not 'air'.
 */
export const ALLOWED_SURFACE_MATERIALS: ReadonlySet<MaterialType> = new Set<MaterialType>([
  'floor_stone',
  'floor_dirt',
  'floor_wood',
  'floor_engraved',
  'grass'
]);

/**
 * Checks if a given tile is a solid floor or foundation capable of supporting
 * construction on the level above (z + 1).
 */
export function isSolidFoundation(tile: Tile | null | undefined): boolean {
  if (!tile) return false;
  return SOLID_FOUNDATION_MATERIALS.has(tile.material);
}

/**
 * Checks if an air tile at z is supported by a solid foundation at z - 1.
 */
export function hasSolidFoundation(
  tile: Tile,
  tileBelow?: Tile | null,
  tiles?: Tile[][][]
): boolean {
  if (tile.material !== 'air') {
    return ALLOWED_SURFACE_MATERIALS.has(tile.material);
  }

  // If tileBelow was not directly provided, try to find it in tiles grid
  let resolvedBelow: Tile | null | undefined = tileBelow;
  if (!resolvedBelow && tiles && typeof tile.x === 'number' && typeof tile.y === 'number' && typeof tile.z === 'number') {
    if (tile.z > 0 && tiles[tile.z - 1]?.[tile.y]?.[tile.x]) {
      resolvedBelow = tiles[tile.z - 1][tile.y][tile.x];
    }
  }

  return isSolidFoundation(resolvedBelow);
}

/**
 * Common building placement validation rule for both Player and DF-AI.
 * Allowed foundation surfaces: floor_stone, floor_dirt, floor_wood, floor_engraved, grass.
 * Buildings in 'air' are DISALLOWED unless supported by a solid floor/foundation at z - 1.
 * Constructing over air tiles without a solid tile at z - 1 returns false.
 * Strictly forbidden: water, magma, and solid unmined rock/ores/soil.
 *
 * Supports flexible calling patterns:
 * - canPlaceBuilding(tile)
 * - canPlaceBuilding(tile, type)
 * - canPlaceBuilding(tile, type, tileBelow)
 * - canPlaceBuilding(tile, tileBelow)
 * - canPlaceBuilding(tile, type, tilesGrid)
 * - canPlaceBuilding(tile, tilesGrid)
 */
export function canPlaceBuilding(
  tile: Tile | null | undefined,
  typeOrTileBelowOrTiles?: string | Tile | null | Tile[][][],
  tileBelowOrTiles?: Tile | null | Tile[][][],
  tilesGrid?: Tile[][][]
): boolean {
  if (!tile) return false;

  // Cannot build on liquids
  if (tile.material === 'water' || tile.material === 'magma') {
    return false;
  }

  // Resolve polymorphic arguments
  let tileBelow: Tile | null | undefined = undefined;
  let tiles: Tile[][][] | undefined = undefined;

  const isTile = (val: unknown): val is Tile =>
    typeof val === 'object' && val !== null && 'material' in val;

  const is3DGrid = (val: unknown): val is Tile[][][] =>
    Array.isArray(val) && (val.length === 0 || Array.isArray(val[0]));

  // Check 2nd argument
  if (isTile(typeOrTileBelowOrTiles)) {
    tileBelow = typeOrTileBelowOrTiles;
  } else if (is3DGrid(typeOrTileBelowOrTiles)) {
    tiles = typeOrTileBelowOrTiles;
  }

  // Check 3rd argument
  if (isTile(tileBelowOrTiles)) {
    tileBelow = tileBelowOrTiles;
  } else if (is3DGrid(tileBelowOrTiles)) {
    tiles = tileBelowOrTiles;
  }

  // Check 4th argument
  if (is3DGrid(tilesGrid)) {
    tiles = tilesGrid;
  }

  // If tileBelow is not explicitly passed, try to look it up in tiles grid
  if (!tileBelow && tiles && typeof tile.x === 'number' && typeof tile.y === 'number' && typeof tile.z === 'number') {
    if (tile.z > 0 && tiles[tile.z - 1]?.[tile.y]?.[tile.x]) {
      tileBelow = tiles[tile.z - 1][tile.y][tile.x];
    }
  }

  // If target tile is 'air', must be supported by a solid floor/foundation at z - 1
  if (tile.material === 'air') {
    // Constructing over air tiles without a solid tile at z - 1 returns false
    if (!tileBelow) {
      return false;
    }
    return isSolidFoundation(tileBelow);
  }

  // For non-air tiles, must be one of the allowed foundation surfaces (excavated floors, grass)
  return ALLOWED_SURFACE_MATERIALS.has(tile.material);
}

/**
 * Alias for canPlaceBuilding for alternative naming convention.
 */
export const canBuildAt = canPlaceBuilding;
