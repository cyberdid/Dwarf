/**
 * DF-AI Autonomous Overseer Client Engine
 * Inspired by Ben Lubar's df-ai and DFHack plugin architecture
 * Bridges Google Gemini to autonomously play the Dwarf Fortress simulation
 */

import {
  FortressState,
  OverworldState,
  FortressEvent,
  Tile,
  DesignationType,
  StockpileType,
  ZoneType,
} from '../types/simulation';
import { dispatchExpedition } from './overworldGen';
import { canPlaceBuilding } from './buildingRules';
import { buildTaskIndex, updateTileInTaskIndex } from './taskIndex';

export interface DfAiLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'plan' | 'action' | 'warning' | 'gemini';
  text: string;
  terminalCommand?: string;
}

export interface DfAiState {
  isActive: boolean;
  isThinking: boolean;
  directive: string;
  mode: 'autonomous' | 'paused' | 'step';
  lastRunTick: number;
  lastRunTime: number;
  cycleIntervalSeconds: number; // e.g. every 6 seconds in autonomous mode
  thoughtProcessEn: string;
  thoughtProcessUa: string;
  statusSummary: string;
  aiModel: string;
  totalCyclesExecuted: number;
  terminalLogs: DfAiLogEntry[];
  highlightedTiles: { x: number; y: number; z: number; type: string }[];
}

export const INITIAL_DF_AI_STATE: DfAiState = {
  isActive: false,
  isThinking: false,
  directive: 'Збалансований розвиток фортеці (Standard df-ai)',
  mode: 'autonomous',
  lastRunTick: 0,
  lastRunTime: 0,
  cycleIntervalSeconds: 6,
  thoughtProcessEn: 'df-ai overseer initialized. Ready to autonomously strike the earth and command dwarves.',
  thoughtProcessUa: 'Автономний наглядач df-ai готовий до роботи. Очікує команди «Увімкнути Автопілот» або «Крок AI».',
  statusSummary: 'STANDBY',
  aiModel: 'gemini-3.8-flash',
  totalCyclesExecuted: 0,
  terminalLogs: [
    {
      id: 'log_init_1',
      timestamp: '00:00',
      type: 'info',
      text: '[DFHack 50.15-r4] Plugin loaded: df-ai (autonomous player by Ben Lubar)',
      terminalCommand: 'enable df-ai',
    },
    {
      id: 'log_init_2',
      timestamp: '00:00',
      type: 'gemini',
      text: '[df-ai:gemini] Autonomous LLM module connected to Google Gemini 3.8 Flash',
    },
  ],
  highlightedTiles: [],
};

/**
 * Extract a compact, high-signal summary of the fortress for Gemini
 */
export function buildFortressSummary(fortress: FortressState) {
  const { tiles, dwarves, creatures, items, surfaceZ, depthZ, sizeX, sizeY, stockpilesCounts, wealth, year, season, day, tick } = fortress;

  // Scan idle dwarves
  const idleCount = dwarves.filter(d => !d.currentTask || d.currentTask.type === 'idle').length;

  // Scan unmined visible ores (gold, iron, adamantine)
  const unminedOres: { x: number; y: number; z: number; type: string }[] = [];
  const nearbyTrees: { x: number; y: number; z: number }[] = [];
  const existingWorkshops: { x: number; y: number; z: number; type: string }[] = [];
  const existingBeds: { x: number; y: number; z: number }[] = [];

  let currentDesignationsCount = 0;

  for (let z = 0; z < depthZ; z++) {
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        const tile = tiles[z][y][x];
        if (tile.designation !== 'none') {
          currentDesignationsCount++;
        }

        if (tile.isRevealed) {
          if (tile.material === 'ore_iron' || tile.material === 'ore_gold' || tile.material === 'adamantine') {
            if (unminedOres.length < 15) {
              unminedOres.push({ x, y, z, type: tile.material });
            }
          }
          if (tile.material === 'tree_trunk' && nearbyTrees.length < 10) {
            nearbyTrees.push({ x, y, z });
          }
          if (tile.material.startsWith('workshop_') && existingWorkshops.length < 10) {
            existingWorkshops.push({ x, y, z, type: tile.material });
          }
          if (tile.material === 'bed' && existingBeds.length < 25) {
            existingBeds.push({ x, y, z });
          }
        }
      }
    }
  }

  // Dwarf rosters
  const compactDwarves = dwarves.slice(0, 10).map(d => ({
    name: d.name,
    title: d.title,
    mood: d.mood,
    task: d.currentTask?.type || 'idle',
    hunger: Math.round(d.needs.hunger),
    thirst: Math.round(d.needs.thirst),
    sleep: Math.round(d.needs.sleep),
    skills: Object.entries(d.skills)
      .filter(([_, s]) => s.level > 0)
      .map(([k, s]) => `${k}:${s.level}`),
  }));

  const compactCreatures = creatures.map(c => ({
    name: c.name,
    type: c.type,
    isHostile: c.isHostile,
    hp: c.hp,
  }));

  return {
    name: 'Mountainhome of the Iron Veins',
    year,
    season,
    day,
    tick,
    population: dwarves.length,
    wealth,
    surfaceZ,
    currentZ: surfaceZ,
    stocks: {
      stone: stockpilesCounts.stone,
      wood: stockpilesCounts.wood,
      food: stockpilesCounts.food,
      ore: stockpilesCounts.ore,
      ale: stockpilesCounts.ale,
      totalOnMap: fortress.stocksBreakdown?.totalOnMap || {
        stone: stockpilesCounts.stone,
        wood: stockpilesCounts.wood,
        food: stockpilesCounts.food,
        ore: stockpilesCounts.ore,
        ale: stockpilesCounts.ale
      },
      inStockpile: fortress.stocksBreakdown?.inStockpile || {
        stone: stockpilesCounts.stone,
        wood: stockpilesCounts.wood,
        food: stockpilesCounts.food,
        ore: stockpilesCounts.ore,
        ale: stockpilesCounts.ale
      }
    },
    dwarves: compactDwarves,
    creatures: compactCreatures,
    unminedOres,
    nearbyTrees,
    existingWorkshops,
    existingBeds,
    idleDwarvesCount: idleCount,
    currentDesignationsCount,
  };
}

/**
 * Extract an overworld summary
 */
export function buildOverworldSummary(overworld: OverworldState) {
  const embark = overworld.currentEmbarkCoords || { x: 32, y: 32 };
  const currentTile = overworld.tiles[embark.y]?.[embark.x];

  // Collect all world sites from tiles
  const allSites: { x: number; y: number; name: string; type: string; civName: string; isHostile: boolean; dist: number }[] = [];
  for (let y = 0; y < overworld.sizeY; y++) {
    for (let x = 0; x < overworld.sizeX; x++) {
      const tileSite = overworld.tiles[y]?.[x]?.site;
      if (tileSite) {
        const dist = Math.round(Math.hypot(x - embark.x, y - embark.y));
        const civ = overworld.civilizations.find(c => c.id === tileSite.civId);
        allSites.push({
          x,
          y,
          name: tileSite.name,
          type: tileSite.type,
          civName: tileSite.civName || civ?.name || 'Unknown',
          isHostile: tileSite.isHostile || civ?.relation === 'at_war',
          dist,
        });
      }
    }
  }

  // Nearest 4 sites
  const nearbySites = allSites
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)
    .map(s => ({
      name: s.name,
      type: s.type,
      distance: s.dist,
      civName: s.civName,
      isHostile: s.isHostile,
    }));

  return {
    currentCoords: embark,
    biome: currentTile?.biome || 'mountain',
    nearbySites,
    activeExpeditionsCount: overworld.expeditions.length,
  };
}

/**
 * Execute one autonomous DF-AI / Gemini step
 */
export async function executeDfAiStep(
  fortress: FortressState,
  overworld: OverworldState,
  aiState: DfAiState,
  addEvent: (event: Omit<FortressEvent, 'id'>) => void
): Promise<{
  updatedFortress: FortressState;
  updatedOverworld: OverworldState;
  updatedAiState: DfAiState;
}> {
  const fortressSummary = buildFortressSummary(fortress);
  const overworldSummary = buildOverworldSummary(overworld);

  let responseData: any = null;

  try {
    const res = await fetch('/api/df-ai/step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fortressSummary,
        overworldSummary,
        directive: aiState.directive,
        historyLogs: aiState.terminalLogs.slice(-4).map(l => l.text),
      }),
    });

    if (res.ok) {
      responseData = await res.json();
    }
  } catch (err) {
    console.warn('Network error calling /api/df-ai/step, using client fallback:', err);
  }

  // Fallback if network or server error
  if (!responseData || !responseData.commands) {
    responseData = {
      source: 'client-df-ai-heuristic',
      statusSummary: 'AUTONOMOUS_HEURISTIC',
      thoughtProcessEn: 'Server response delayed. Executing local df-ai blueprinting for mining and alcohol production.',
      thoughtProcessUa: 'Автономний наглядач df-ai оптимізує черги робіт: поповнення елю та видобуток породи.',
      commands: {
        mine: [{ x: 26, y: 16, z: Math.max(0, fortress.surfaceZ - 1) }],
        chop: fortressSummary.nearbyTrees.slice(0, 2),
        build: [{ x: 28, y: 16, z: Math.max(0, fortress.surfaceZ - 1), type: 'build_workshop_still' }],
        stockpiles: [],
        zones: [],
        orders: [{ action: 'brew_drink', details: 'Emergency brewing at Still' }],
      },
      dfHackTerminalLine: '[df-ai:heuristic] Blueprint auto-applied: still and exploratory shaft.',
    };
  }

  // Deep copy tiles to apply commands
  const newTiles = fortress.tiles.map(layer => layer.map(row => row.map(tile => ({ ...tile }))));
  const newHighlights: { x: number; y: number; z: number; type: string }[] = [];
  const taskIndex = fortress.taskIndex || buildTaskIndex(newTiles);

  const { commands } = responseData;

  // 1. Apply Mining Designations
  if (Array.isArray(commands?.mine)) {
    for (const m of commands.mine) {
      if (newTiles[m.z]?.[m.y]?.[m.x]) {
        const t = newTiles[m.z][m.y][m.x];
        if (t.material !== 'air' && t.material !== 'floor_stone' && t.material !== 'floor_dirt') {
          const oldT = { designation: t.designation, stockpile: t.stockpile, material: t.material };
          t.designation = 'mine';
          newHighlights.push({ x: m.x, y: m.y, z: m.z, type: 'mine' });
          updateTileInTaskIndex(taskIndex, m.x, m.y, m.z, oldT, t);
        }
      }
    }
  }

  // 2. Apply Chopping Designations
  if (Array.isArray(commands?.chop)) {
    for (const c of commands.chop) {
      if (newTiles[c.z]?.[c.y]?.[c.x]) {
        const t = newTiles[c.z][c.y][c.x];
        if (t.material === 'tree_trunk') {
          const oldT = { designation: t.designation, stockpile: t.stockpile, material: t.material };
          t.designation = 'chop';
          newHighlights.push({ x: c.x, y: c.y, z: c.z, type: 'chop' });
          updateTileInTaskIndex(taskIndex, c.x, c.y, c.z, oldT, t);
        }
      }
    }
  }

  // 3. Apply Building Designations (Beds, Workshops, Doors, Walls)
  if (Array.isArray(commands?.build)) {
    for (const b of commands.build) {
      if (newTiles[b.z]?.[b.y]?.[b.x]) {
        const t = newTiles[b.z][b.y][b.x];
        if (canPlaceBuilding(t, b.type)) {
          const oldT = { designation: t.designation, stockpile: t.stockpile, material: t.material };
          t.designation = b.type as DesignationType;
          newHighlights.push({ x: b.x, y: b.y, z: b.z, type: b.type });
          updateTileInTaskIndex(taskIndex, b.x, b.y, b.z, oldT, t);
        }
      }
    }
  }

  // 4. Apply Stockpiles
  if (Array.isArray(commands?.stockpiles)) {
    for (const s of commands.stockpiles) {
      for (let y = Math.min(s.y1, s.y2); y <= Math.max(s.y1, s.y2); y++) {
        for (let x = Math.min(s.x1, s.x2); x <= Math.max(s.x1, s.x2); x++) {
          if (newTiles[s.z]?.[y]?.[x]) {
            const t = newTiles[s.z][y][x];
            const oldT = { designation: t.designation, stockpile: t.stockpile, material: t.material };
            t.stockpile = s.type as StockpileType;
            updateTileInTaskIndex(taskIndex, x, y, s.z, oldT, t);
          }
        }
      }
    }
  }

  // 5. Apply Zones
  if (Array.isArray(commands?.zones)) {
    for (const z of commands.zones) {
      for (let y = Math.min(z.y1, z.y2); y <= Math.max(z.y1, z.y2); y++) {
        for (let x = Math.min(z.x1, z.x2); x <= Math.max(z.x1, z.x2); x++) {
          if (newTiles[z.z]?.[y]?.[x]) {
            newTiles[z.z][y][x].zone = z.type as ZoneType;
          }
        }
      }
    }
  }

  let updatedOverworld = overworld;
  let items = [...fortress.items];

  // 6. Handle Special Orders
  if (Array.isArray(commands?.orders)) {
    for (const order of commands.orders) {
      if (order.action === 'brew_drink') {
        // Spawn 3-5 barrels of ale at the Still or surface
        for (let i = 0; i < 4; i++) {
          items.push({
            id: `ale_brewed_${Date.now()}_${i}`,
            type: 'ale',
            nameEn: 'Barrel of Dwarven Ale',
            nameUa: 'Бочка гномського елю',
            x: Math.min(fortress.sizeX - 2, 28 + (i % 2)),
            y: Math.min(fortress.sizeY - 2, 16 + Math.floor(i / 2)),
            z: Math.max(0, fortress.surfaceZ - 1),
          });
        }
        addEvent({
          tick: fortress.tick,
          timeStr: `Year ${fortress.year}, ${fortress.season} ${fortress.day}`,
          textEn: `[df-ai] Brewer processed fermented plump helmets into 4 fresh barrels of Dwarven Ale!`,
          textUa: `[df-ai] Пивовар зварив 4 бочки свіжого елю з товстошоломників за наказом Gemini!`,
          type: 'announcement',
        });
      } else if (order.action === 'dispatch_expedition') {
        let targetSiteCoords: { x: number; y: number; name: string } | null = null;
        for (let y = 0; y < overworld.sizeY && !targetSiteCoords; y++) {
          for (let x = 0; x < overworld.sizeX && !targetSiteCoords; x++) {
            const s = overworld.tiles[y]?.[x]?.site;
            if (s && (x !== overworld.currentEmbarkCoords.x || y !== overworld.currentEmbarkCoords.y)) {
              targetSiteCoords = { x, y, name: s.name };
            }
          }
        }

        if (targetSiteCoords) {
          updatedOverworld = dispatchExpedition(
            updatedOverworld,
            'trade',
            { x: targetSiteCoords.x, y: targetSiteCoords.y },
            targetSiteCoords.name
          );
          addEvent({
            tick: fortress.tick,
            timeStr: `Year ${fortress.year}, ${fortress.season} ${fortress.day}`,
            textEn: `[df-ai] Autonomous Overseer dispatched trade caravan to «${targetSiteCoords.name}»!`,
            textUa: `[df-ai] Наглядач Gemini спорядив торговельний караван до «${targetSiteCoords.name}»!`,
            type: 'discovery',
          });
        }
      }
    }
  }

  // Build terminal logs
  const timeStr = `${String(Math.floor(fortress.tick / 60)).padStart(2, '0')}:${String(fortress.tick % 60).padStart(2, '0')}`;
  const terminalLine = responseData.dfHackTerminalLine || `[df-ai:plan] Cycle executed: status=${responseData.statusSummary}`;

  const newLog: DfAiLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    type: responseData.source?.includes('gemini') ? 'gemini' : 'plan',
    text: terminalLine,
    terminalCommand: `df-ai plan --status=${responseData.statusSummary}`,
  };

  const updatedTerminalLogs = [...aiState.terminalLogs.slice(-40), newLog];

  const updatedAiState: DfAiState = {
    ...aiState,
    isThinking: false,
    lastRunTick: fortress.tick,
    lastRunTime: Date.now(),
    thoughtProcessEn: responseData.thoughtProcessEn || aiState.thoughtProcessEn,
    thoughtProcessUa: responseData.thoughtProcessUa || aiState.thoughtProcessUa,
    statusSummary: responseData.statusSummary || 'AUTONOMOUS_OPERATING',
    aiModel: responseData.source || 'gemini-3.8-flash',
    totalCyclesExecuted: aiState.totalCyclesExecuted + 1,
    terminalLogs: updatedTerminalLogs,
    highlightedTiles: newHighlights,
  };

  const updatedFortress: FortressState = {
    ...fortress,
    tiles: newTiles,
    items,
    taskIndex,
  };

  return {
    updatedFortress,
    updatedOverworld,
    updatedAiState,
  };
}
