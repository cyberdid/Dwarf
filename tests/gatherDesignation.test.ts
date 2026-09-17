import { describe, it, expect } from 'vitest';
import { runSimulationTick } from '../src/engine/simulationEngine';
import { buildTaskIndex, updateTileInTaskIndex } from '../src/engine/taskIndex';
import { buildTaskIndex as utilBuildTaskIndex, updateTileInTaskIndex as utilUpdateTileInTaskIndex } from '../src/utils/taskIndex';
import { runSimulationTick as simRunSimulationTick } from '../src/simulation/simulationEngine';
import { FortressState, Tile, MaterialType, WorldItem } from '../src/types/simulation';

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

function makeTestState(): FortressState {
  const sizeX = 5, sizeY = 5, depthZ = 3;
  const tiles: Tile[][][] = [];
  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) {
        row.push(makeTile(x, y, z, z === 1 ? 'grass' : (z === 0 ? 'floor_stone' : 'air')));
      }
      layer.push(row);
    }
    tiles.push(layer);
  }

  return {
    sizeX,
    sizeY,
    depthZ,
    surfaceZ: 1,
    tiles,
    dwarves: [{
      id: 'd1',
      name: 'Urist Herbalist',
      title: 'Gatherer',
      gender: 'male',
      age: 35,
      x: 2,
      y: 2,
      z: 1,
      targetPosition: null,
      path: [],
      stats: { strength: 12, agility: 12, intelligence: 10, endurance: 12 },
      needs: { hunger: 80, thirst: 80, sleep: 80, social: 80, work: 40 },
      skills: {
        mining: { level: 1, xp: 0 },
        woodcutting: { level: 1, xp: 0 },
        carpentry: { level: 1, xp: 0 },
        masonry: { level: 1, xp: 0 },
        brewing: { level: 1, xp: 0 },
        hauling: { level: 2, xp: 0 }
      },
      inventory: [],
      mood: 'content',
      happinessScore: 80,
      thoughts: [],
      currentTask: null,
      color: '#ffffff'
    }],
    creatures: [],
    items: [],
    taskIndex: buildTaskIndex(tiles),
    stockpilesCounts: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 },
    stocksBreakdown: {
      totalOnMap: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 },
      inStockpile: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 }
    },
    wealth: 0,
    year: 105,
    season: 'Spring',
    day: 1,
    tick: 0
  };
}

describe('Gather Designation & Task Indexing', () => {
  it('buildTaskIndex indexes tiles with designation gather', () => {
    const state = makeTestState();
    state.tiles[1][3][2].designation = 'gather';

    const index = buildTaskIndex(state.tiles);
    expect(index.gathering).toBeDefined();
    expect(index.gathering.has('2,3,1')).toBe(true);
    expect(index.gathering.get('2,3,1')).toEqual({ x: 2, y: 3, z: 1 });
  });

  it('updateTileInTaskIndex adds and clears gather designation entries', () => {
    const state = makeTestState();
    const index = buildTaskIndex(state.tiles);

    const oldTile = { ...state.tiles[1][1][1] };
    const newTile = { ...oldTile, designation: 'gather' as const };

    updateTileInTaskIndex(index, 1, 1, 1, oldTile, newTile);
    expect(index.gathering.has('1,1,1')).toBe(true);

    const clearedTile = { ...newTile, designation: 'none' as const };
    updateTileInTaskIndex(index, 1, 1, 1, newTile, clearedTile);
    expect(index.gathering.has('1,1,1')).toBe(false);
  });

  it('utils/taskIndex and simulation/simulationEngine re-exports work identically', () => {
    const state = makeTestState();
    state.tiles[1][2][1].designation = 'gather';
    const index = utilBuildTaskIndex(state.tiles);
    expect(index.gathering.has('1,2,1')).toBe(true);

    const nextState = simRunSimulationTick(state, [], () => {});
    expect(nextState.tick).toBe(1);
  });

  it('idle dwarf claims gather designation and starts gathering task', () => {
    const state = makeTestState();
    // Designate adjacent tile (2, 3, 1) for gathering
    state.tiles[1][3][2].designation = 'gather';
    state.taskIndex = buildTaskIndex(state.tiles);

    const nextState = runSimulationTick(state, [], () => {});
    const dwarf = nextState.dwarves[0];

    expect(dwarf.currentTask).not.toBeNull();
    expect(dwarf.currentTask?.type).toBe('gathering');
    expect(dwarf.currentTask?.targetX).toBe(2);
    expect(dwarf.currentTask?.targetY).toBe(3);
    expect(dwarf.currentTask?.targetZ).toBe(1);
  });

  it('harvests plant into food item and hauls into food stockpile', () => {
    const state = makeTestState();
    // Designate plant tile at (2, 3, 1)
    state.tiles[1][3][2].designation = 'gather';
    // Designate a food stockpile at (2, 1, 1)
    state.tiles[1][1][2].stockpile = 'food';
    state.taskIndex = buildTaskIndex(state.tiles);

    // Run simulation ticks until gather task is claimed and finished
    let current = state;
    for (let i = 0; i < 40; i++) {
      current = runSimulationTick(current, [], () => {});
    }

    // Tile designation should be cleared
    expect(current.tiles[1][3][2].designation).toBe('none');
    expect(current.taskIndex?.gathering.has('2,3,1')).toBe(false);

    // Food item should exist in the fortress items
    const foodItem = current.items.find(it => it.type === 'food');
    expect(foodItem).toBeDefined();

    // After gathering and hauling ticks, food should end up in the stockpile
    for (let i = 0; i < 30; i++) {
      current = runSimulationTick(current, [], () => {});
    }

    const itemInStockpile = current.items.find(it => it.type === 'food');
    expect(itemInStockpile).toBeDefined();
    expect(itemInStockpile?.x).toBe(2);
    expect(itemInStockpile?.y).toBe(1);
    expect(itemInStockpile?.z).toBe(1);
    expect(current.stockpilesCounts.food).toBeGreaterThanOrEqual(1);
  });

  it('harvests plant into unstockpiled food item if no food stockpile exists', () => {
    const state = makeTestState();
    // Dwarf right next to plant
    state.tiles[1][3][2].designation = 'gather';
    state.taskIndex = buildTaskIndex(state.tiles);

    let current = state;
    for (let i = 0; i < 20; i++) {
      current = runSimulationTick(current, [], () => {});
    }

    // Designation cleared and food item dropped on map
    expect(current.tiles[1][3][2].designation).toBe('none');
    const foodItem = current.items.find(it => it.type === 'food');
    expect(foodItem).toBeDefined();
    expect(foodItem?.x).toBe(2);
    expect(foodItem?.y).toBe(3);
    expect(foodItem?.z).toBe(1);
  });
});
