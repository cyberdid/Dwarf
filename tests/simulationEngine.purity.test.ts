import { describe, it, expect } from 'vitest';
import { runSimulationTick } from '../src/engine/simulationEngine';
import { FortressState, Tile, MaterialType } from '../src/types/simulation';

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.getOwnPropertyNames(o).forEach(k => deepFreeze((o as any)[k]));
    Object.freeze(o);
  }
  return o;
}

function makeTile(x: number, y: number, z: number, material: MaterialType): Tile {
  return {
    x, y, z, material, hardness: 10, maxHardness: 10, waterLevel: 0,
    stability: 100, isRevealed: false, designation: 'none', stockpile: 'none',
    zone: 'none', itemIds: [],
  };
}

function makeMinimalState(): FortressState {
  const sizeX = 3, sizeY = 3, depthZ = 3;
  const tiles: Tile[][][] = [];
  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) row.push(makeTile(x, y, z, z === 0 ? 'floor_stone' : 'soil'));
      layer.push(row);
    }
    tiles.push(layer);
  }
  return {
    sizeX, sizeY, depthZ, surfaceZ: 1, tiles,
    dwarves: [{
      id: 'd1', name: 'Urist', title: 'Miner', gender: 'male', age: 40,
      x: 1, y: 1, z: 1, targetPosition: null, path: [],
      stats: { strength: 10, agility: 10, intelligence: 10, endurance: 10 },
      needs: { hunger: 50, thirst: 50, sleep: 50, social: 50, work: 50 },
      skills: {
        mining: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 },
        carpentry: { level: 1, xp: 0 }, masonry: { level: 1, xp: 0 },
        brewing: { level: 1, xp: 0 }, hauling: { level: 1, xp: 0 },
      },
      inventory: [], mood: 'content', happinessScore: 50, thoughts: [],
      currentTask: null, color: '#fff',
    }],
    creatures: [], items: [],
    stockpilesCounts: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 },
    wealth: 0, year: 105, season: 'Spring', day: 1, tick: 0,
  } as FortressState;
}

describe('runSimulationTick purity', () => {
  it('does not mutate a deep-frozen input state', () => {
    const state = deepFreeze(makeMinimalState());
    expect(() => runSimulationTick(state, [], () => {})).not.toThrow();
  });

  it('advances the tick without mutating the input tick', () => {
    const state = makeMinimalState();
    const next = runSimulationTick(state, [], () => {});
    expect(next.tick).toBe(1);
    expect(state.tick).toBe(0);
  });

  it('propagates tile writes to the returned state without mutating the input', () => {
    const state = makeMinimalState();
    const next = runSimulationTick(state, [], () => {});
    // Fog-of-war reveals radius 4 around the dwarf (at 1,1,1), so its own tile flips.
    expect(next.tiles[1][1][1].isRevealed).toBe(true);
    // The input state must remain untouched.
    expect(state.tiles[1][1][1].isRevealed).toBe(false);
    // Copy-on-write must produce a new tiles structure, not the same reference.
    expect(next.tiles).not.toBe(state.tiles);
  });
});
