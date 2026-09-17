import { describe, it, expect } from 'vitest';
import { runSimulationTick } from '../src/engine/simulationEngine';
import { FortressState, Tile, MaterialType, DwarfEntity } from '../src/types/simulation';

function makeTile(x: number, y: number, z: number, material: MaterialType = 'floor_stone', zone: 'none' | 'tavern' = 'none'): Tile {
  return {
    x, y, z, material, hardness: 10, maxHardness: 10, waterLevel: 0,
    stability: 100, isRevealed: true, designation: 'none', stockpile: 'none',
    zone, itemIds: [],
  };
}

function makeTestState(dwarves: DwarfEntity[], tavernTiles: { x: number; y: number; z: number }[] = []): FortressState {
  const sizeX = 20, sizeY = 20, depthZ = 10;
  const tiles: Tile[][][] = [];
  const tavernSet = new Set(tavernTiles.map(t => `${t.x},${t.y},${t.z}`));

  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) {
        const isTavern = tavernSet.has(`${x},${y},${z}`);
        row.push(makeTile(x, y, z, z === 0 ? 'stone' : 'floor_stone', isTavern ? 'tavern' : 'none'));
      }
      layer.push(row);
    }
    tiles.push(layer);
  }

  return {
    sizeX, sizeY, depthZ, surfaceZ: 5, tiles,
    dwarves, creatures: [], items: [],
    stockpilesCounts: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 },
    wealth: 0, year: 105, season: 'Spring', day: 1, tick: 0,
  } as FortressState;
}

function createDwarf(id: string, name: string, x: number, y: number, z: number, needsPartial: Partial<DwarfEntity['needs']> = {}): DwarfEntity {
  return {
    id, name, title: 'Citizen', gender: 'male', age: 50,
    x, y, z, targetPosition: null, path: [],
    stats: { strength: 10, agility: 10, intelligence: 10, endurance: 10 },
    needs: {
      hunger: 80, thirst: 80, sleep: 80, social: 70, work: 50,
      ...needsPartial,
    },
    skills: {
      mining: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 },
      carpentry: { level: 1, xp: 0 }, masonry: { level: 1, xp: 0 },
      brewing: { level: 1, xp: 0 }, hauling: { level: 1, xp: 0 },
    },
    inventory: [], mood: 'content', happinessScore: 50, thoughts: [],
    currentTask: null, color: '#fff',
  };
}

describe('Social Needs Replenishment & Ecstatic Mood', () => {
  it('dwarfs idling near each other gain social need', () => {
    const d1 = createDwarf('d1', 'Urist', 5, 5, 2, { hunger: 90, thirst: 90, sleep: 90, social: 70 });
    const d2 = createDwarf('d2', 'Zon', 6, 5, 2, { hunger: 90, thirst: 90, sleep: 90, social: 70 });
    const state = makeTestState([d1, d2]);

    const next = runSimulationTick(state, [], () => {});

    expect(next.dwarves[0].needs.social).toBeGreaterThan(70);
    expect(next.dwarves[1].needs.social).toBeGreaterThan(70);
  });

  it('dwarf idling alone without tavern or peers loses social need (decays)', () => {
    // Isolated dwarf placed far from embark center (embark is at 10, 10, surfaceZ 5) and at z=1
    const lonely = createDwarf('d1', 'Urist', 1, 1, 1, { social: 70 });
    const state = makeTestState([lonely]);

    const next = runSimulationTick(state, [], () => {});

    // Should decay by 0.02
    expect(next.dwarves[0].needs.social).toBeLessThan(70);
    expect(next.dwarves[0].needs.social).toBeCloseTo(69.98, 2);
  });

  it('dwarf idling in a tavern area gains social need even when alone', () => {
    const dwarfInTavern = createDwarf('d1', 'Urist', 1, 1, 1, { social: 50 });
    const state = makeTestState([dwarfInTavern], [{ x: 1, y: 1, z: 1 }]);

    const next = runSimulationTick(state, [], () => {});

    expect(next.dwarves[0].needs.social).toBeGreaterThan(50);
  });

  it('allows avgNeeds > 80 and mood === ecstatic through socialization', () => {
    // Both dwarfs start with high physical needs and social: 78
    // Initially avgNeeds = (90 + 90 + 90 + 78) / 4 = 87
    const d1 = createDwarf('d1', 'Urist', 5, 5, 2, { hunger: 85, thirst: 85, sleep: 85, social: 75 });
    const d2 = createDwarf('d2', 'Zon', 5, 6, 2, { hunger: 85, thirst: 85, sleep: 85, social: 75 });
    let state = makeTestState([d1, d2]);

    // Advance 10 ticks while socializing
    for (let t = 0; t < 10; t++) {
      state = runSimulationTick(state, [], () => {});
    }

    const d1Result = state.dwarves[0];
    const avgNeeds = (d1Result.needs.hunger + d1Result.needs.thirst + d1Result.needs.sleep + d1Result.needs.social) / 4;

    expect(d1Result.needs.social).toBeGreaterThan(80);
    expect(avgNeeds).toBeGreaterThan(80);
    expect(d1Result.mood).toBe('ecstatic');
    expect(d1Result.happinessScore).toBeGreaterThan(80);
  });

  it('completing a socializing task replenishes social need to 100 and sets ecstatic mood', () => {
    const dwarf = createDwarf('d1', 'Urist', 5, 5, 2, { hunger: 90, thirst: 90, sleep: 90, social: 40 });
    dwarf.currentTask = {
      type: 'socializing',
      targetX: 5,
      targetY: 5,
      targetZ: 2,
      progress: 19,
      maxProgress: 20,
      descriptionEn: 'Socializing in the tavern',
      descriptionUa: 'Спілкується в таверні',
    };
    const state = makeTestState([dwarf]);

    const next = runSimulationTick(state, [], () => {});

    expect(next.dwarves[0].needs.social).toBe(100);
    expect(next.dwarves[0].currentTask).toBeNull();
    expect(next.dwarves[0].mood).toBe('ecstatic');
    expect(next.dwarves[0].thoughts.some(t => t.positive)).toBe(true);
  });

  it('working dwarf (e.g. mining) does not gain idle socialization need while actively working', () => {
    const miner = createDwarf('d1', 'Urist', 5, 5, 2, { hunger: 90, thirst: 90, sleep: 90, social: 70 });
    miner.currentTask = {
      type: 'mining',
      targetX: 5,
      targetY: 6,
      targetZ: 2,
      progress: 0,
      maxProgress: 10,
      descriptionEn: 'Mining rock',
      descriptionUa: 'Копає камінь',
    };
    // Another dwarf is nearby, but miner is busy working
    const peer = createDwarf('d2', 'Zon', 5, 4, 2, { social: 70 });
    const state = makeTestState([miner, peer]);

    const next = runSimulationTick(state, [], () => {});

    // Miner should decay social need because they are actively mining, not idle
    expect(next.dwarves[0].needs.social).toBeLessThan(70);
    // While the peer who is idle gains social need
    expect(next.dwarves[1].needs.social).toBeGreaterThan(70);
  });
});
