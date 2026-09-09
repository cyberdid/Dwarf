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

export interface GeminiActionRecord {
  id: string;
  cycleNumber: number;
  tick: number;
  calendarTime: string;
  realTime: string;
  model: string;
  isFallback: boolean;
  fallbackReason?: string;
  statusSummary: string;
  directive: string;
  governanceCategory: 'survival' | 'residential' | 'economy' | 'mining' | 'expansion' | 'diplomacy';
  thoughtProcessUa: string;
  thoughtProcessEn: string;
  governanceExplanation: {
    ua: string;
    en: string;
  };
  terminalCommand: string;
  actions: {
    miningCount: number;
    miningCoords: { x: number; y: number; z: number }[];
    chopCount: number;
    chopCoords: { x: number; y: number; z: number }[];
    buildCount: number;
    buildItems: { type: string; x: number; y: number; z: number }[];
    stockpilesCount: number;
    stockpiles: { type: string; x1: number; y1: number; x2: number; y2: number; z: number }[];
    zonesCount: number;
    zones: { type: string; x1: number; y1: number; x2: number; y2: number; z: number }[];
    ordersCount: number;
    orders: { action: string; details: string }[];
  };
  summaryUa: string;
  summaryEn: string;
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
  actionHistory: GeminiActionRecord[];
  highlightedTiles: { x: number; y: number; z: number; type: string }[];
  isFallback?: boolean;
  fallbackReason?: string;
}

export const INITIAL_DF_AI_STATE: DfAiState = {
  isActive: false,
  isThinking: false,
  directive: 'Збалансований розвиток фортеці (Standard df-ai)',
  mode: 'autonomous',
  lastRunTick: 0,
  lastRunTime: 0,
  cycleIntervalSeconds: 6,
  thoughtProcessEn: 'df-ai overseer initialized with Gemini 3.8 Flash. Ready to autonomously strike the earth and command dwarves.',
  thoughtProcessUa: 'Автономний наглядач df-ai підключений до Gemini 3.8 Flash. Очікує команди «Увімкнути Автопілот» або «Крок AI».',
  statusSummary: 'STANDBY',
  aiModel: 'gemini-3.8-flash',
  totalCyclesExecuted: 0,
  isFallback: false,
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
  actionHistory: [
    {
      id: 'action_init_0',
      cycleNumber: 0,
      tick: 0,
      calendarTime: 'Year 105, Spring 1 (Tick 0)',
      realTime: '00:00',
      model: 'gemini-3.8-flash',
      isFallback: false,
      statusSummary: 'FOUNDATION_SURVEY',
      directive: 'Збалансований розвиток фортеці (Standard df-ai)',
      governanceCategory: 'survival',
      thoughtProcessUa: 'Первинне обстеження гірського масиву: 7 гномів прибули з початковими запасами їжі та елю. Затверджено стратегічний протокол автономного виживання.',
      thoughtProcessEn: 'Initial mountain terrain survey: 7 dwarves embarked with rations. Approved foundational autonomous survival and architectural protocols.',
      governanceExplanation: {
        ua: 'Ініціалізація автономного керування: Gemini визначила пріоритет безперебійного постачання елю, безпеки спалень від тантричних зривів та розвідки рудних пластів.',
        en: 'Autonomous initialization: Gemini established paramount rules for unbroken booze supply, bedroom allocations against tantrum spirals, and mineral prospecting.',
      },
      terminalCommand: '[df-ai:overseer] Initialized fortress governance matrix with Autonomous Overseer',
      actions: {
        miningCount: 0,
        miningCoords: [],
        chopCount: 0,
        chopCoords: [],
        buildCount: 0,
        buildItems: [],
        stockpilesCount: 0,
        stockpiles: [],
        zonesCount: 0,
        zones: [],
        ordersCount: 0,
        orders: [],
      },
      summaryUa: 'Встановлено контроль наглядача DF-AI: затверджено протокол виживання та розбудови фортеці.',
      summaryEn: 'DF-AI overseer control established: foundational survival and expansion protocol approved.',
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

  const isFallback = Boolean(
    responseData.isFallback ||
    responseData.source?.includes('fallback') ||
    responseData.source?.includes('heuristic')
  );
  const fallbackReason =
    responseData.fallbackReason ||
    responseData.error ||
    (isFallback ? 'Autonomous heuristic rules applied' : undefined);

  const newLog: DfAiLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    type: isFallback ? 'warning' : (responseData.source?.includes('gemini') ? 'gemini' : 'plan'),
    text: terminalLine,
    terminalCommand: `df-ai plan --status=${responseData.statusSummary}`,
  };

  const updatedTerminalLogs = [...aiState.terminalLogs.slice(-40), newLog];

  // Build comprehensive Gemini Action & Governance Record
  const miningCoords = Array.isArray(commands?.mine) ? commands.mine : [];
  const chopCoords = Array.isArray(commands?.chop) ? commands.chop : [];
  const buildItems = Array.isArray(commands?.build) ? commands.build : [];
  const stockpilesList = Array.isArray(commands?.stockpiles) ? commands.stockpiles : [];
  const zonesList = Array.isArray(commands?.zones) ? commands.zones : [];
  const ordersList = Array.isArray(commands?.orders) ? commands.orders : [];

  let governanceCategory: GeminiActionRecord['governanceCategory'] = 'expansion';
  let govExplanationUa = 'Стратегічний розвиток: Gemini здійснює планове розширення центральних коридорів, організацію складських зон і підготовку до оборони.';
  let govExplanationEn = 'Strategic development: Gemini is executing planned central gallery excavation, stockpile allocation, and defensive fortifying.';

  const st = (responseData.statusSummary || '').toUpperCase();
  if (st.includes('BOOZE') || st.includes('DRINK') || st.includes('FOOD')) {
    governanceCategory = 'survival';
    govExplanationUa = 'Критичний пріоритет #1 (Виживання): Рівень елю/їжі нижчий за безпечний поріг. Gemini зосередила ресурси на будівництві дистилятора (Still) та варінні нових бочок для запобігання зневодненню гномів.';
    govExplanationEn = 'Critical Priority #1 (Survival): Booze or rations below safe threshold. Gemini focused resources on Still construction and emergency brewing to prevent dwarf dehydration.';
  } else if (st.includes('RESID') || st.includes('BED')) {
    governanceCategory = 'residential';
    govExplanationUa = 'Пріоритет #2 (Житло): Населення фортеці перевищує кількість спалень. Gemini призначила розкопки індивідуальних кімнат для збереження моралі та запобігання бунтам (tantrum spirals).';
    govExplanationEn = 'Priority #2 (Residential): Fortress population exceeds available bedrooms. Gemini designated private bedroom excavation to preserve mood and stop tantrum spirals.';
  } else if (st.includes('MIN') || st.includes('ORE') || st.includes('DELV')) {
    governanceCategory = 'mining';
    govExplanationUa = 'Пріоритет #3 (Шахтарство та ресурси): Gemini розвідала геологічні пласти та скерувала шахтарів на видобуток руди для металургії та створення цінностей фортеці.';
    govExplanationEn = 'Priority #3 (Mining & Strata): Gemini prospected geological veins and tasked miners with ore extraction for metallurgy and fortress wealth.';
  } else if (st.includes('WORKSHOP') || st.includes('MASON') || st.includes('CRAFT')) {
    governanceCategory = 'economy';
    govExplanationUa = 'Пріоритет #4 (Ремесла): Gemini заклала виробничий сектор для обробки каменю та деревини на меблі й блоки для зміцнення цитаделі.';
    govExplanationEn = 'Priority #4 (Crafting): Gemini founded production workshops to process rough stone and lumber into furniture and defensive blocks.';
  } else if (st.includes('EXPEDITION') || st.includes('DIPLOMACY') || st.includes('OVERWORLD')) {
    governanceCategory = 'diplomacy';
    govExplanationUa = 'Пріоритет #5 (Зовнішній світ): Базові потреби фортеці закриті, тому Gemini спорядила торговельну експедицію до сусіднього поселення на карті континенту.';
    govExplanationEn = 'Priority #5 (Overworld): Core fortress needs secured; Gemini dispatched a trade caravan expedition to a neighboring settlement on the world map.';
  }

  const summaryPartsUa: string[] = [];
  const summaryPartsEn: string[] = [];
  if (miningCoords.length > 0) {
    summaryPartsUa.push(`⛏️ Розкопки: ${miningCoords.length} блоків`);
    summaryPartsEn.push(`⛏️ Mining: ${miningCoords.length} tiles`);
  }
  if (chopCoords.length > 0) {
    summaryPartsUa.push(`🪓 Вирубка: ${chopCoords.length} дерев`);
    summaryPartsEn.push(`🪓 Chopping: ${chopCoords.length} trees`);
  }
  if (buildItems.length > 0) {
    const buildsStr = buildItems.map((b: any) => b.type.replace('build_', '')).join(', ');
    summaryPartsUa.push(`🔨 Будівництво: ${buildItems.length} (${buildsStr})`);
    summaryPartsEn.push(`🔨 Construction: ${buildItems.length} (${buildsStr})`);
  }
  if (zonesList.length > 0) {
    summaryPartsUa.push(`🛏️ Зони/Кімнати: ${zonesList.length}`);
    summaryPartsEn.push(`🛏️ Rooms: ${zonesList.length}`);
  }
  if (stockpilesList.length > 0) {
    summaryPartsUa.push(`📦 Склади: ${stockpilesList.length}`);
    summaryPartsEn.push(`📦 Stockpiles: ${stockpilesList.length}`);
  }
  if (ordersList.length > 0) {
    const ordersStr = ordersList.map((o: any) => o.action).join(', ');
    summaryPartsUa.push(`📜 Накази: ${ordersStr}`);
    summaryPartsEn.push(`📜 Orders: ${ordersStr}`);
  }
  if (summaryPartsUa.length === 0) {
    summaryPartsUa.push('Огляд території та підтримка стабільності');
    summaryPartsEn.push('Territory surveillance & stability maintenance');
  }

  const actionRecord: GeminiActionRecord = {
    id: `action_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    cycleNumber: aiState.totalCyclesExecuted + 1,
    tick: fortress.tick,
    calendarTime: `Year ${fortress.year}, ${fortress.season} ${fortress.day} (Tick ${fortress.tick})`,
    realTime: new Date().toLocaleTimeString(),
    model: responseData.source || 'gemini-3.8-flash',
    isFallback,
    fallbackReason,
    statusSummary: responseData.statusSummary || 'AUTONOMOUS_OPERATING',
    directive: aiState.directive,
    governanceCategory,
    thoughtProcessUa: responseData.thoughtProcessUa || aiState.thoughtProcessUa,
    thoughtProcessEn: responseData.thoughtProcessEn || aiState.thoughtProcessEn,
    governanceExplanation: {
      ua: govExplanationUa,
      en: govExplanationEn,
    },
    terminalCommand: terminalLine,
    actions: {
      miningCount: miningCoords.length,
      miningCoords,
      chopCount: chopCoords.length,
      chopCoords,
      buildCount: buildItems.length,
      buildItems,
      stockpilesCount: stockpilesList.length,
      stockpiles: stockpilesList,
      zonesCount: zonesList.length,
      zones: zonesList,
      ordersCount: ordersList.length,
      orders: ordersList,
    },
    summaryUa: summaryPartsUa.join(' | '),
    summaryEn: summaryPartsEn.join(' | '),
  };

  const updatedActionHistory = [actionRecord, ...(aiState.actionHistory || []).slice(0, 79)];

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
    actionHistory: updatedActionHistory,
    highlightedTiles: newHighlights,
    isFallback,
    fallbackReason,
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
