import { describe, it, expect, vi } from 'vitest';
import { handleSpecialOrder, applyDfAiCommands, executeDfAiStep } from '../src/engine/dfAiClient';
import * as aiModule from '../src/ai/dfAiClient';
import { FortressState, OverworldState, Tile, MaterialType, FortressEvent } from '../src/types/simulation';

function makeTile(x: number, y: number, z: number, material: MaterialType = 'soil'): Tile {
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
    itemIds: [],
  };
}

function makeMockFortressState(): FortressState {
  const sizeX = 30, sizeY = 30, depthZ = 16, surfaceZ = 14;
  const tiles: Tile[][][] = [];
  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) {
        let mat: MaterialType = z === surfaceZ ? 'grass' : (z < surfaceZ ? 'stone' : 'air');
        if (z === surfaceZ - 1 && x === 25 && y === 15) {
          mat = 'workshop_carpenter';
        }
        row.push(makeTile(x, y, z, mat));
      }
      layer.push(row);
    }
    tiles.push(layer);
  }

  return {
    sizeX,
    sizeY,
    depthZ,
    surfaceZ,
    tiles,
    dwarves: [
      {
        id: 'dwarf_test_1',
        name: 'Urist Carpenter',
        title: 'Carpenter',
        gender: 'male',
        age: 45,
        x: 25,
        y: 15,
        z: surfaceZ - 1,
        targetPosition: null,
        path: [],
        stats: { strength: 12, agility: 10, intelligence: 10, endurance: 12 },
        needs: { hunger: 50, thirst: 50, sleep: 50, social: 50, work: 30 },
        skills: {
          mining: { level: 1, xp: 0 },
          woodcutting: { level: 1, xp: 0 },
          carpentry: { level: 2, xp: 10 },
          masonry: { level: 1, xp: 0 },
          brewing: { level: 1, xp: 0 },
          hauling: { level: 2, xp: 0 },
        },
        inventory: [{ type: 'pickaxe', count: 1 }],
        mood: 'content',
        happinessScore: 60,
        thoughts: [],
        currentTask: null, // idle dwarf
        color: '#10b981',
      },
    ],
    creatures: [],
    items: [],
    stockpilesCounts: { stone: 10, wood: 10, food: 10, ore: 0, ale: 5 },
    wealth: 100,
    year: 105,
    season: 'Spring',
    day: 1,
    tick: 50,
  } as FortressState;
}

function makeMockOverworldState(): OverworldState {
  const sizeX = 10, sizeY = 10;
  const tiles: any[][] = [];
  for (let y = 0; y < sizeY; y++) {
    const row: any[] = [];
    for (let x = 0; x < sizeX; x++) {
      row.push({
        biome: 'mountain',
        elevation: 100,
        site: (x === 4 && y === 4) ? { name: 'Dwarven Outpost', type: 'fortress', civId: 'civ1' } : null,
      });
    }
    tiles.push(row);
  }

  return {
    sizeX,
    sizeY,
    currentEmbarkCoords: { x: 2, y: 2 },
    tiles,
    civilizations: [{ id: 'civ1', name: 'Iron Clan', race: 'dwarf', relation: 'peace' }],
    expeditions: [],
  } as unknown as OverworldState;
}

describe('Special Orders (craft_furniture & summon_migrants)', () => {
  it('re-exports handleSpecialOrder and applyDfAiCommands from src/ai/dfAiClient', () => {
    expect(aiModule.handleSpecialOrder).toBeDefined();
    expect(aiModule.applyDfAiCommands).toBeDefined();
    expect(aiModule.executeDfAiStep).toBeDefined();
  });

  describe('craft_furniture order handler', () => {
    it('crafts beds when requested and spawns items in fortress state', () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();
      const events: any[] = [];
      const addEvent = (e: any) => events.push(e);

      const result = handleSpecialOrder(
        { action: 'craft_furniture', details: 'Craft 3 fine wooden beds' },
        fortress,
        overworld,
        addEvent
      );

      const bedItems = result.items.filter(i => i.type === 'bed');
      expect(bedItems.length).toBe(3);
      expect(bedItems[0].nameEn).toBe('Fine Wooden Bed');
      expect(result.wealthDelta).toBe(3 * 25);
      expect(events.length).toBe(1);
      expect(events[0].textEn).toContain('Craftsman completed furniture order: 3x Fine Wooden Bed');

      // Idle dwarf should receive carpentry XP and satisfaction thought
      const updatedDwarf = result.dwarves.find(d => d.id === 'dwarf_test_1');
      expect(updatedDwarf?.skills.carpentry.xp).toBeGreaterThan(10);
      expect(updatedDwarf?.thoughts.length).toBe(1);
    });

    it('crafts chairs and tables when requested with explicit types or parsed text', () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();
      const events: any[] = [];

      // Craft chairs
      const chairsResult = handleSpecialOrder(
        { action: 'craft_furniture', details: 'Craft 2 stone chairs' },
        fortress,
        overworld,
        e => events.push(e)
      );
      const chairItems = chairsResult.items.filter(i => i.type === 'chair');
      expect(chairItems.length).toBe(2);
      expect(chairItems[0].nameEn).toBe('Carved Stone Throne');

      // Craft tables
      const tablesResult = handleSpecialOrder(
        { action: 'craft_furniture', details: 'Construct 1 table', count: 1 },
        fortress,
        overworld,
        e => events.push(e)
      );
      const tableItems = tablesResult.items.filter(i => i.type === 'table');
      expect(tableItems.length).toBe(1);
      expect(tableItems[0].nameEn).toBe('Polished Granite Table');
    });

    it('crafts multiple furniture types when requested in one order', () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();
      const events: any[] = [];

      const result = handleSpecialOrder(
        { action: 'craft_furniture', details: 'Craft beds and tables for bedroom expansion', count: 2 },
        fortress,
        overworld,
        e => events.push(e)
      );

      const beds = result.items.filter(i => i.type === 'bed');
      const tables = result.items.filter(i => i.type === 'table');
      expect(beds.length).toBe(2);
      expect(tables.length).toBe(2);
      expect(result.items.length).toBe(4);
    });

    it('defaults to crafting beds if furniture type is unspecified', () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();

      const result = handleSpecialOrder(
        { action: 'craft_furniture', details: 'Craft furniture at carpenter workshop' },
        fortress,
        overworld,
        () => {}
      );

      expect(result.items.length).toBeGreaterThanOrEqual(1);
      expect(result.items[0].type).toBe('bed');
    });
  });

  describe('summon_migrants order handler', () => {
    it('adds new dwarf entities to fortress state with full valid schema', () => {
      const fortress = makeMockFortressState();
      const initialDwarfCount = fortress.dwarves.length;
      const overworld = makeMockOverworldState();
      const events: any[] = [];

      const result = handleSpecialOrder(
        { action: 'summon_migrants', details: 'Summon 3 migrant dwarves to assist with mining' },
        fortress,
        overworld,
        e => events.push(e)
      );

      expect(result.dwarves.length).toBe(initialDwarfCount + 3);
      const newDwarfs = result.dwarves.slice(initialDwarfCount);
      for (const d of newDwarfs) {
        expect(d.id).toContain('dwarf_migrant');
        expect(d.name.length).toBeGreaterThan(3);
        expect(d.z).toBe(fortress.surfaceZ);
        expect(d.stats.strength).toBeGreaterThan(0);
        expect(d.needs.hunger).toBeGreaterThan(0);
        expect(d.skills.mining).toBeDefined();
        expect(d.mood).toBe('happy');
        expect(d.inventory.length).toBeGreaterThan(0);
      }

      expect(events.length).toBe(1);
      expect(events[0].textEn).toContain('Overseer summoned a migrant wave of 3 dwarves');
    });

    it('respects count parameter when supplied in summon_migrants order', () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();

      const result = handleSpecialOrder(
        { action: 'summon_migrants', details: 'Reinforce workforce', count: 4 },
        fortress,
        overworld,
        () => {}
      );

      expect(result.dwarves.length).toBe(fortress.dwarves.length + 4);
    });
  });

  describe('applyDfAiCommands integration', () => {
    it('applies craft_furniture and summon_migrants together in a command cycle', () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();
      const events: any[] = [];

      const commands = {
        mine: [],
        chop: [],
        build: [],
        stockpiles: [],
        zones: [],
        orders: [
          { action: 'craft_furniture', details: 'Craft 2 chairs' },
          { action: 'summon_migrants', details: 'Summon 2 migrants' },
        ],
      };

      const { updatedFortress, updatedOverworld } = applyDfAiCommands(
        fortress,
        overworld,
        commands,
        e => events.push(e)
      );

      expect(updatedFortress.items.filter(i => i.type === 'chair').length).toBe(2);
      expect(updatedFortress.dwarves.length).toBe(fortress.dwarves.length + 2);
      expect(updatedFortress.wealth).toBe(fortress.wealth + 2 * 25);
      expect(updatedOverworld).toBeDefined();
      expect(events.length).toBe(2);
    });
  });

  describe('executeDfAiStep autonomous fallback', () => {
    it('executes furniture crafting heuristic when directive mentions furniture', async () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();
      const events: any[] = [];

      const aiState = {
        isActive: true,
        isThinking: false,
        directive: 'Focus on crafting furniture and beds',
        mode: 'autonomous' as const,
        lastRunTick: 0,
        lastRunTime: 0,
        cycleIntervalSeconds: 6,
        thoughtProcessEn: '',
        thoughtProcessUa: '',
        statusSummary: 'STANDBY',
        aiModel: 'gemini-3.8-flash',
        totalCyclesExecuted: 0,
        terminalLogs: [],
        actionHistory: [],
        highlightedTiles: [],
      };

      // Mock fetch to simulate offline / fallback mode
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      try {
        const { updatedFortress, updatedAiState } = await executeDfAiStep(
          fortress,
          overworld,
          aiState,
          e => events.push(e)
        );

        expect(updatedFortress.items.length).toBeGreaterThan(0);
        expect(updatedAiState.isFallback).toBe(true);
        expect(updatedAiState.actionHistory[0].governanceCategory).toBe('economy');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('executes migrant summoning heuristic when directive mentions migrants', async () => {
      const fortress = makeMockFortressState();
      const overworld = makeMockOverworldState();
      const events: any[] = [];

      const aiState = {
        isActive: true,
        isThinking: false,
        directive: 'Summon new migrant workers to expand population',
        mode: 'autonomous' as const,
        lastRunTick: 0,
        lastRunTime: 0,
        cycleIntervalSeconds: 6,
        thoughtProcessEn: '',
        thoughtProcessUa: '',
        statusSummary: 'STANDBY',
        aiModel: 'gemini-3.8-flash',
        totalCyclesExecuted: 0,
        terminalLogs: [],
        actionHistory: [],
        highlightedTiles: [],
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

      try {
        const { updatedFortress, updatedAiState } = await executeDfAiStep(
          fortress,
          overworld,
          aiState,
          e => events.push(e)
        );

        expect(updatedFortress.dwarves.length).toBeGreaterThan(fortress.dwarves.length);
        expect(updatedAiState.actionHistory[0].governanceCategory).toBe('expansion');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
