import { describe, it, expect } from 'vitest';
import {
  canPlaceBuilding,
  canBuildAt,
  isSolidFoundation,
  hasSolidFoundation,
  SOLID_FOUNDATION_MATERIALS,
  ALLOWED_SURFACE_MATERIALS
} from '../src/engine/buildingRules';
import * as simulationBuildingRules from '../src/simulation/buildingRules';
import { Tile, MaterialType } from '../src/types/simulation';

function makeTile(x: number, y: number, z: number, material: MaterialType): Tile {
  return {
    x,
    y,
    z,
    material,
    hardness: 10,
    maxHardness: 10,
    waterLevel: 0,
    stability: 100,
    isRevealed: true,
    designation: 'none',
    stockpile: 'none',
    zone: 'none',
    itemIds: []
  };
}

describe('buildingRules foundation validation', () => {
  it('re-exports cleanly from src/simulation/buildingRules', () => {
    expect(simulationBuildingRules.canPlaceBuilding).toBe(canPlaceBuilding);
    expect(simulationBuildingRules.canBuildAt).toBe(canBuildAt);
    expect(simulationBuildingRules.isSolidFoundation).toBe(isSolidFoundation);
  });

  it('rejects null or undefined tiles', () => {
    expect(canPlaceBuilding(null)).toBe(false);
    expect(canPlaceBuilding(undefined)).toBe(false);
    expect(canBuildAt(null)).toBe(false);
  });

  it('rejects construction on liquids (water, magma)', () => {
    const waterTile = makeTile(5, 5, 1, 'water');
    const magmaTile = makeTile(5, 5, 1, 'magma');
    const solidFloorBelow = makeTile(5, 5, 0, 'floor_stone');

    expect(canPlaceBuilding(waterTile)).toBe(false);
    expect(canPlaceBuilding(magmaTile)).toBe(false);
    expect(canPlaceBuilding(waterTile, 'build_wall', solidFloorBelow)).toBe(false);
    expect(canPlaceBuilding(magmaTile, 'build_wall', solidFloorBelow)).toBe(false);
  });

  it('rejects construction on unmined solid rock or unmined soil', () => {
    const stoneTile = makeTile(5, 5, 1, 'stone');
    const soilTile = makeTile(5, 5, 1, 'soil');
    const graniteTile = makeTile(5, 5, 1, 'granite');

    expect(canPlaceBuilding(stoneTile)).toBe(false);
    expect(canPlaceBuilding(soilTile)).toBe(false);
    expect(canPlaceBuilding(graniteTile)).toBe(false);
  });

  it('allows construction directly on valid surface tiles (floors and grass)', () => {
    for (const mat of ALLOWED_SURFACE_MATERIALS) {
      const tile = makeTile(3, 3, 2, mat);
      expect(canPlaceBuilding(tile, 'build_wall')).toBe(true);
    }
  });

  describe('air tiles foundation requirements', () => {
    it('disallows constructing over air tiles without any solid tile at z - 1', () => {
      const airTile = makeTile(5, 5, 10, 'air');
      // No tileBelow provided
      expect(canPlaceBuilding(airTile)).toBe(false);
      expect(canPlaceBuilding(airTile, 'build_wall')).toBe(false);
      expect(canPlaceBuilding(airTile, null)).toBe(false);
      expect(canPlaceBuilding(airTile, 'build_wall', null)).toBe(false);
      expect(canPlaceBuilding(airTile, 'build_wall', undefined)).toBe(false);
    });

    it('disallows constructing over air tiles when tile at z - 1 is also air (floating in mid-air)', () => {
      const airTile = makeTile(5, 5, 10, 'air');
      const airTileBelow = makeTile(5, 5, 9, 'air');

      expect(canPlaceBuilding(airTile, 'build_wall', airTileBelow)).toBe(false);
      expect(canPlaceBuilding(airTile, airTileBelow)).toBe(false);
      expect(hasSolidFoundation(airTile, airTileBelow)).toBe(false);
    });

    it('disallows constructing over air tiles when tile at z - 1 is liquid (water, magma)', () => {
      const airTile = makeTile(5, 5, 10, 'air');
      const waterBelow = makeTile(5, 5, 9, 'water');
      const magmaBelow = makeTile(5, 5, 9, 'magma');

      expect(canPlaceBuilding(airTile, 'build_wall', waterBelow)).toBe(false);
      expect(canPlaceBuilding(airTile, 'build_wall', magmaBelow)).toBe(false);
    });

    it('allows constructing in air when supported by excavated or constructed floors at z - 1', () => {
      const airTile = makeTile(4, 4, 5, 'air');
      const floorTypes: MaterialType[] = ['floor_stone', 'floor_dirt', 'floor_wood', 'floor_engraved'];

      for (const mat of floorTypes) {
        const floorBelow = makeTile(4, 4, 4, mat);
        expect(canPlaceBuilding(airTile, 'build_wall', floorBelow)).toBe(true);
        expect(canPlaceBuilding(airTile, floorBelow)).toBe(true);
        expect(hasSolidFoundation(airTile, floorBelow)).toBe(true);
      }
    });

    it('allows constructing in air when supported by natural ground/terrain at z - 1 (surface construction)', () => {
      const airTile = makeTile(2, 2, 25, 'air');
      const groundTypes: MaterialType[] = ['grass', 'soil', 'sand', 'cave_moss', 'stone', 'granite', 'marble', 'obsidian', 'ore_iron'];

      for (const mat of groundTypes) {
        const groundBelow = makeTile(2, 2, 24, mat);
        expect(canPlaceBuilding(airTile, 'build_bed', groundBelow)).toBe(true);
        expect(canPlaceBuilding(airTile, groundBelow)).toBe(true);
      }
    });

    it('allows constructing in air when supported by a constructed wall at z - 1 (multi-story walls)', () => {
      const airTile = makeTile(2, 2, 6, 'air');
      const wallBelow = makeTile(2, 2, 5, 'wall_constructed');

      expect(canPlaceBuilding(airTile, 'build_wall', wallBelow)).toBe(true);
    });

    it('supports 3D tiles grid lookup for tile below at z - 1', () => {
      const depthZ = 3, sizeY = 3, sizeX = 3;
      const tiles: Tile[][][] = [];
      for (let z = 0; z < depthZ; z++) {
        const layer: Tile[][] = [];
        for (let y = 0; y < sizeY; y++) {
          const row: Tile[] = [];
          for (let x = 0; x < sizeX; x++) {
            const mat: MaterialType = z === 0 ? 'floor_stone' : 'air';
            row.push(makeTile(x, y, z, mat));
          }
          layer.push(row);
        }
        tiles.push(layer);
      }

      const airTileAtZ1 = tiles[1][1][1];
      const airTileAtZ2 = tiles[2][1][1];

      // At z = 1, tile at z = 0 is 'floor_stone' (solid foundation) -> true
      expect(canPlaceBuilding(airTileAtZ1, 'build_wall', tiles)).toBe(true);
      expect(canPlaceBuilding(airTileAtZ1, tiles)).toBe(true);

      // At z = 2, tile at z = 1 is 'air' (not solid) -> false
      expect(canPlaceBuilding(airTileAtZ2, 'build_wall', tiles)).toBe(false);
      expect(canPlaceBuilding(airTileAtZ2, tiles)).toBe(false);

      // At z = 0 with air tile, z - 1 is out of bounds -> false
      const airAtZ0 = makeTile(1, 1, 0, 'air');
      expect(canPlaceBuilding(airAtZ0, 'build_wall', tiles)).toBe(false);
    });
  });

  describe('isSolidFoundation helper', () => {
    it('accurately identifies solid foundation materials', () => {
      for (const mat of SOLID_FOUNDATION_MATERIALS) {
        expect(isSolidFoundation(makeTile(0, 0, 0, mat))).toBe(true);
      }

      expect(isSolidFoundation(makeTile(0, 0, 0, 'air'))).toBe(false);
      expect(isSolidFoundation(makeTile(0, 0, 0, 'water'))).toBe(false);
      expect(isSolidFoundation(makeTile(0, 0, 0, 'magma'))).toBe(false);
      expect(isSolidFoundation(makeTile(0, 0, 0, 'tree_foliage'))).toBe(false);
      expect(isSolidFoundation(undefined)).toBe(false);
      expect(isSolidFoundation(null)).toBe(false);
    });
  });
});
