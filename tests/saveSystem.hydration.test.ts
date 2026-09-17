import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveFortressToStorage,
  loadFortressFromStorage,
  parseFortressSaveJson,
  hydrateFortressState,
  serializeTaskIndex,
  SAVE_KEY_PRIMARY,
} from '../src/engine/saveSystem';
import * as utilsSaveSystem from '../src/utils/saveSystem';
import { buildTaskIndex } from '../src/engine/taskIndex';
import { runSimulationTick } from '../src/engine/simulationEngine';
import { FortressState, Tile, MaterialType } from '../src/types/simulation';

// In-memory localStorage mock for node testing environment
class LocalStorageMock implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}

function makeTile(x: number, y: number, z: number, material: MaterialType): Tile {
  return {
    x, y, z, material, hardness: 10, maxHardness: 10, waterLevel: 0,
    stability: 100, isRevealed: false, designation: 'none', stockpile: 'none',
    zone: 'none', itemIds: [],
  };
}

function makeTestState(): FortressState {
  const sizeX = 4, sizeY = 4, depthZ = 3;
  const tiles: Tile[][][] = [];
  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) {
        row.push(makeTile(x, y, z, z === 0 ? 'floor_stone' : 'soil'));
      }
      layer.push(row);
    }
    tiles.push(layer);
  }

  // Set specific designations and materials
  tiles[0][1][1].designation = 'mine';
  tiles[1][2][2].designation = 'chop';
  tiles[1][2][2].material = 'tree_trunk';
  tiles[0][0][1].designation = 'build_wall';
  tiles[0][3][3].stockpile = 'stone';
  tiles[0][3][2].stockpile = 'wood';
  tiles[0][3][1].stockpile = 'food';
  tiles[0][3][0].stockpile = 'ore';
  tiles[0][2][1].material = 'bed';

  const state: FortressState = {
    sizeX, sizeY, depthZ, surfaceZ: 1, tiles,
    dwarves: [{
      id: 'd1', name: 'Urist', title: 'Miner', gender: 'male', age: 40,
      x: 1, y: 1, z: 0, targetPosition: null, path: [],
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
    taskIndex: buildTaskIndex(tiles),
    stockpilesCounts: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 },
    wealth: 0, year: 105, season: 'Spring', day: 1, tick: 0,
  };

  return state;
}

describe('Save/Load Hydration System', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = new LocalStorageMock();
  });

  it('serializes taskIndex Maps and restores them as valid Maps with iterables on load', () => {
    const originalState = makeTestState();
    expect(originalState.taskIndex).toBeDefined();
    expect(originalState.taskIndex!.mining.size).toBe(1);

    const saved = saveFortressToStorage(originalState);
    expect(saved).toBe(true);

    const loaded = loadFortressFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.taskIndex).toBeDefined();

    const ti = loaded!.taskIndex!;
    expect(ti.mining).toBeInstanceOf(Map);
    expect(ti.chopping).toBeInstanceOf(Map);
    expect(ti.building).toBeInstanceOf(Map);
    expect(ti.stockpiles.stone).toBeInstanceOf(Map);
    expect(ti.stockpiles.wood).toBeInstanceOf(Map);
    expect(ti.stockpiles.food).toBeInstanceOf(Map);
    expect(ti.stockpiles.ore).toBeInstanceOf(Map);
    expect(ti.beds).toBeInstanceOf(Map);

    // Verify mining.values() is an iterable and yields coordinates
    const miningValues = Array.from(ti.mining.values());
    expect(miningValues).toHaveLength(1);
    expect(miningValues[0]).toEqual({ x: 1, y: 1, z: 0 });

    // Verify for..of iteration succeeds without TypeError
    let iteratedCount = 0;
    for (const coord of ti.mining.values()) {
      expect(coord).toHaveProperty('x');
      expect(coord).toHaveProperty('y');
      expect(coord).toHaveProperty('z');
      iteratedCount++;
    }
    expect(iteratedCount).toBe(1);

    expect(Array.from(ti.chopping.values())).toHaveLength(1);
    expect(Array.from(ti.building.values())).toHaveLength(1);
    expect(Array.from(ti.stockpiles.stone.values())).toHaveLength(1);
    expect(Array.from(ti.beds.values())).toHaveLength(1);
  });

  it('allows simulation ticks to run without errors after loading from storage', () => {
    const originalState = makeTestState();
    saveFortressToStorage(originalState);

    const loaded = loadFortressFromStorage();
    expect(loaded).not.toBeNull();

    // Verify that running a simulation tick on the loaded state does not throw
    expect(() => {
      const nextState = runSimulationTick(loaded!, [], () => {});
      expect(nextState.tick).toBe(loaded!.tick + 1);
    }).not.toThrow();
  });

  it('rehydrates legacy saves where taskIndex was saved as plain uniterable objects', () => {
    const state = makeTestState();
    // Simulate what standard JSON.stringify does to Maps (turns them into empty objects)
    const legacyPayload = {
      version: '1.0',
      timestamp: Date.now(),
      state: {
        ...state,
        taskIndex: {
          mining: {},
          chopping: {},
          building: {},
          stockpiles: { stone: {}, wood: {}, food: {}, ore: {} },
          beds: {},
        },
      },
    };

    localStorage.setItem(SAVE_KEY_PRIMARY, JSON.stringify(legacyPayload));

    const loaded = loadFortressFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.taskIndex).toBeDefined();

    const ti = loaded!.taskIndex!;
    expect(ti.mining).toBeInstanceOf(Map);
    expect(typeof ti.mining.values).toBe('function');
    expect(Array.from(ti.mining.values())).toHaveLength(1);
    expect(Array.from(ti.mining.values())[0]).toEqual({ x: 1, y: 1, z: 0 });

    // Ensure simulation tick runs cleanly on this rehydrated legacy state
    expect(() => {
      const nextState = runSimulationTick(loaded!, [], () => {});
      expect(nextState.tick).toBe(loaded!.tick + 1);
    }).not.toThrow();
  });

  it('rehydrates imported JSON via parseFortressSaveJson', () => {
    const state = makeTestState();
    const jsonString = JSON.stringify({
      version: '1.2',
      state: {
        ...state,
        taskIndex: {
          mining: {},
          chopping: {},
          building: {},
          stockpiles: { stone: {}, wood: {}, food: {}, ore: {} },
          beds: {},
        },
      },
    });

    const parsed = parseFortressSaveJson(jsonString);
    expect(parsed.taskIndex).toBeDefined();
    expect(parsed.taskIndex!.mining).toBeInstanceOf(Map);
    expect(Array.from(parsed.taskIndex!.mining.values())).toHaveLength(1);

    expect(() => {
      runSimulationTick(parsed, [], () => {});
    }).not.toThrow();
  });

  it('provides full API compatibility via src/utils/saveSystem re-export', () => {
    expect(utilsSaveSystem.saveFortressToStorage).toBe(saveFortressToStorage);
    expect(utilsSaveSystem.loadFortressFromStorage).toBe(loadFortressFromStorage);
    expect(utilsSaveSystem.parseFortressSaveJson).toBe(parseFortressSaveJson);
    expect(utilsSaveSystem.hydrateFortressState).toBe(hydrateFortressState);
    expect(utilsSaveSystem.serializeTaskIndex).toBe(serializeTaskIndex);
  });
});
