/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FortressState,
  DwarfEntity,
  Tile,
  FortressEvent,
  DesignationType,
  StockpileType,
  OverworldState,
  WorldMapTile
} from './types/simulation';
import { generateWorld, FORTRESS_SIZE_PRESETS } from './engine/worldGen';
import { generateOverworld, stepOverworldExpeditions } from './engine/overworldGen';
import { runSimulationTick } from './engine/simulationEngine';
import { FortressCanvas } from './components/FortressCanvas';
import { FortressHeader } from './components/FortressHeader';
import { FortressToolBar } from './components/FortressToolBar';
import { DwarfDossier } from './components/DwarfDossier';
import { EventTicker } from './components/EventTicker';
import { RawExplorer } from './components/RawExplorer';
import { AnalysisView } from './components/AnalysisView';
import { PixelCodex } from './components/PixelCodex';
import { FortressMinimap } from './components/FortressMinimap';
import { StocksModal } from './components/StocksModal';
import { UnitsRosterModal } from './components/UnitsRosterModal';
import { HelpModal } from './components/HelpModal';
import { OverworldView } from './components/OverworldView';
import { DfAiToolbar } from './components/DfAiToolbar';
import { DfHackConsoleModal } from './components/DfHackConsoleModal';
import { AiAnalyticsModal } from './components/AiAnalyticsModal';
import { DfAiState, INITIAL_DF_AI_STATE, executeDfAiStep } from './engine/dfAiClient';
import { canPlaceBuilding } from './engine/buildingRules';
import { buildTaskIndex, updateTileInTaskIndex } from './engine/taskIndex';

export default function App() {
  // Application Language & Navigation State
  const [lang, setLang] = useState<'ua' | 'en'>('ua');
  const [activeTab, setActiveTab] = useState<'simulation' | 'raw_explorer' | 'analysis' | 'pixel_codex'>('simulation');

  // Modals
  const [isStocksOpen, setIsStocksOpen] = useState<boolean>(false);
  const [isUnitsOpen, setIsUnitsOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isOverworldOpen, setIsOverworldOpen] = useState<boolean>(false);
  const [isDfHackOpen, setIsDfHackOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);

  // Autonomous DF-AI / Gemini Overseer State
  const [aiState, setAiState] = useState<DfAiState>(INITIAL_DF_AI_STATE);

  // Overworld Continental Scale (64x64 regions, civilisations, legends, expeditions)
  const [overworldState, setOverworldState] = useState<OverworldState>(() =>
    generateOverworld(4213)
  );

  // World & 3D Multi-Z Fortress State (Standard 60x44x28 with Magma Sea, 3 Caverns, Adamantine)
  const [worldSeed, setWorldSeed] = useState<number>(4213);
  const [fortressState, setFortressState] = useState<FortressState>(() =>
    generateWorld({
      sizeX: FORTRESS_SIZE_PRESETS.standard.sizeX,
      sizeY: FORTRESS_SIZE_PRESETS.standard.sizeY,
      depthZ: FORTRESS_SIZE_PRESETS.standard.depthZ,
      seed: 4213,
      biome: 'mountain',
      hasRiver: true
    })
  );

  // Stable references for DF-AI autonomous tick loops
  const fortressStateRef = useRef(fortressState);
  fortressStateRef.current = fortressState;
  const overworldStateRef = useRef(overworldState);
  overworldStateRef.current = overworldState;
  const aiStateRef = useRef(aiState);
  aiStateRef.current = aiState;

  // View & Tool States
  const [currentZ, setCurrentZ] = useState<number>(() => fortressState.surfaceZ);
  const [renderMode, setRenderMode] = useState<'ascii' | 'graphic'>('graphic');
  const [revealAll, setRevealAll] = useState<boolean>(false);
  const [selectedTool, setSelectedTool] = useState<string>('inspect');
  const [selectedDwarf, setSelectedDwarf] = useState<DwarfEntity | null>(null);
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null);

  // Camera Pan & Zoom
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 30, y: 30 });
  const [zoom, setZoom] = useState<number>(1.25);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 1024,
    height: 768
  });

  // Time & Playback
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1);

  // Fortress Announcements / Chronicle
  const [events, setEvents] = useState<FortressEvent[]>([
    {
      id: 'init_embark_1',
      tick: 0,
      timeStr: 'Year 105, Spring 1',
      textEn: 'Strike the earth! The expedition of 7 dwarves has arrived at the mountain.',
      textUa: 'Ударте в камінь! Експедиція із 7 гномів прибула до підніжжя гори.',
      type: 'discovery'
    },
    {
      id: 'init_embark_2',
      tick: 0,
      timeStr: 'Year 105, Spring 1',
      textEn: 'Plump helmet barrels and dwarven ale kegs unpacked on the surface.',
      textUa: 'Бочки з товстошоломниками та барила гном’ячого елю розвантажено на поверхні.',
      type: 'announcement'
    }
  ]);

  const addEvent = useCallback((eventData: Omit<FortressEvent, 'id'>) => {
    setEvents(prev => {
      const next = [
        ...prev,
        {
          ...eventData,
          id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
        }
      ];
      return next.length > 300 ? next.slice(-300) : next;
    });
  }, []);

  // Main Simulation Tick Runner
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
    setFortressState(prevState => {
      const nextState = runSimulationTick(prevState, events, addEvent);

      // Advance overworld expeditions every 40 ticks or when day rolls over
      if (nextState.day !== prevState.day || nextState.tick % 40 === 0) {
        setOverworldState(prevOw => stepOverworldExpeditions(prevOw, nextState.day, addEvent));
      }

      // Keep selected dwarf in sync if inspector open
      if (selectedDwarf) {
        const fresh = nextState.dwarves.find(d => d.id === selectedDwarf.id);
        if (fresh) setSelectedDwarf(fresh);
      }

      return nextState;
    });
  };

  useEffect(() => {
    if (!isRunning) return;
    const intervalMs = Math.max(25, Math.floor(110 / speed));
    const timer = setInterval(() => {
      tickRef.current();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, speed]);

  // Center camera on a specific tile coordinate
  const handlePanToWorld = useCallback((tileX: number, tileY: number) => {
    const TILE_PX = 28;
    const targetCenterX = viewportSize.width / 2;
    const targetCenterY = viewportSize.height / 2;
    setPan({
      x: targetCenterX - tileX * TILE_PX * zoom,
      y: targetCenterY - tileY * TILE_PX * zoom
    });
  }, [viewportSize, zoom]);

  // Select dwarf from roster and jump camera
  const handleSelectDwarfFromRoster = (dwarf: DwarfEntity) => {
    setSelectedDwarf(dwarf);
    setSelectedTile(null);
    setCurrentZ(dwarf.z);
    handlePanToWorld(dwarf.x, dwarf.y);
  };

  // Autonomous DF-AI / Gemini Step Executor
  const isExecutingAiRef = useRef(false);
  const handleRunDfAiStep = useCallback(async (customDirective?: string) => {
    if (isExecutingAiRef.current) return;
    isExecutingAiRef.current = true;
    setAiState(prev => ({
      ...prev,
      isThinking: true,
      directive: customDirective !== undefined ? customDirective : prev.directive
    }));

    try {
      const currentAiState = aiStateRef.current;
      const currentFortressState = fortressStateRef.current;
      const currentOverworldState = overworldStateRef.current;

      const activeDirective = customDirective !== undefined ? customDirective : currentAiState.directive;
      const { updatedFortress, updatedOverworld, updatedAiState } = await executeDfAiStep(
        currentFortressState,
        currentOverworldState,
        { ...currentAiState, directive: activeDirective },
        addEvent
      );
      setFortressState(updatedFortress);
      setOverworldState(updatedOverworld);
      setAiState(updatedAiState);
    } catch (err) {
      console.error('DF-AI step execution error:', err);
      setAiState(prev => ({ ...prev, isThinking: false }));
    } finally {
      isExecutingAiRef.current = false;
    }
  }, [addEvent]);

  // DF-AI Autonomous Autopilot Loop
  useEffect(() => {
    if (!aiState.isActive) return;
    const intervalTimer = setInterval(() => {
      handleRunDfAiStep();
    }, aiState.cycleIntervalSeconds * 1000);

    return () => clearInterval(intervalTimer);
  }, [aiState.isActive, aiState.cycleIntervalSeconds]);

  // DFHack command terminal executor
  const handleSendDfHackCommand = (cmd: string) => {
    const cleanCmd = cmd.trim();
    const timeStr = `${String(Math.floor(fortressState.tick / 60)).padStart(2, '0')}:${String(fortressState.tick % 60).padStart(2, '0')}`;

    if (cleanCmd === 'enable df-ai') {
      setAiState(prev => ({ ...prev, isActive: true }));
      setIsRunning(true);
      setAiState(prev => ({
        ...prev,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'action',
            terminalCommand: 'enable df-ai',
            text: '[DFHack] df-ai enabled. Autonomous overseer loop active.',
          },
        ],
      }));
      handleRunDfAiStep();
    } else if (cleanCmd === 'disable df-ai') {
      setAiState(prev => ({
        ...prev,
        isActive: false,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'info',
            terminalCommand: 'disable df-ai',
            text: '[DFHack] df-ai disabled. Manual overseer control resumed.',
          },
        ],
      }));
    } else if (cleanCmd === 'df-ai step' || cleanCmd === 'step') {
      handleRunDfAiStep();
    } else if (cleanCmd === 'df-ai status' || cleanCmd === 'status') {
      setAiState(prev => ({
        ...prev,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'info',
            terminalCommand: 'df-ai status',
            text: `[df-ai:status] Model: ${prev.aiModel} | Status: ${prev.statusSummary} | Directive: "${prev.directive}" | Active: ${prev.isActive} | Cycles: ${prev.totalCyclesExecuted}`,
          },
        ],
      }));
    } else if (cleanCmd === 'reveal' || cleanCmd === 'reveal map' || cleanCmd === 'reveal all') {
      setRevealAll(true);
      setAiState(prev => ({
        ...prev,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'action',
            terminalCommand: cleanCmd,
            text: '[DFHack] Map fully revealed (debug mode). Fog of war bypassed across all strata.',
          },
        ],
      }));
    } else if (cleanCmd === 'unreveal' || cleanCmd === 'hide map' || cleanCmd === 'fow on') {
      setRevealAll(false);
      setAiState(prev => ({
        ...prev,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'info',
            terminalCommand: cleanCmd,
            text: '[DFHack] Map unrevealed. Fog of war restored (dwarf vision radius 4).',
          },
        ],
      }));
    } else if (cleanCmd === 'help') {
      setAiState(prev => ({
        ...prev,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'info',
            terminalCommand: 'help',
            text: '[DFHack] Available commands: reveal | unreveal | enable df-ai | disable df-ai | df-ai step | df-ai status | or type instructions for Gemini Overseer.',
          },
        ],
      }));
    } else {
      // Custom directive or natural language instruction for Gemini
      setAiState(prev => ({
        ...prev,
        directive: cleanCmd,
        terminalLogs: [
          ...prev.terminalLogs,
          {
            id: `cmd_${Date.now()}`,
            timestamp: timeStr,
            type: 'gemini',
            terminalCommand: cleanCmd,
            text: `[df-ai:directive] New directive dispatched to Gemini: "${cleanCmd}"`,
          },
        ],
      }));
      handleRunDfAiStep(cleanCmd);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsDfHackOpen(prev => !prev);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning(r => !r);
      } else if (e.key === '.' || e.code === 'Period') {
        tickRef.current();
      } else if (e.key === '<' || e.key === ',' || e.code === 'BracketLeft') {
        setCurrentZ(z => Math.max(0, z - 1));
      } else if (e.key === '>' || e.key === '.' || e.code === 'BracketRight') {
        setCurrentZ(z => Math.min(fortressState.depthZ - 1, z + 1));
      } else if (e.key === 'd') {
        setSelectedTool('mine');
      } else if (e.key === 't') {
        setSelectedTool('chop');
      } else if (e.key === 'g') {
        setSelectedTool('gather');
      } else if (e.key === 'p') {
        setSelectedTool('stockpiles');
      } else if (e.key === 'b') {
        setSelectedTool('build');
      } else if (e.key === 'w') {
        setSelectedTool('workshops');
      } else if (e.key === 'u') {
        setIsUnitsOpen(true);
      } else if (e.key === 'q') {
        setSelectedTool('inspect');
      } else if (e.key === 'c') {
        setSelectedTool('cancel');
      } else if (e.key === 'm' || e.key === 'M') {
        setIsOverworldOpen(prev => !prev);
      } else if (e.key === '?' || e.key === 'h' || e.key === 'F1') {
        setIsHelpOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fortressState.depthZ]);

  // Track viewport size for minimap and center panning
  useEffect(() => {
    const handleResize = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight - 120
      });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tool Application Handler (Designations)
  const handleApplyDesignation = (x: number, y: number, z: number, tool: string) => {
    setFortressState(prev => {
      const nextTiles = [...prev.tiles];
      const targetTile = nextTiles[z]?.[y]?.[x];
      if (!targetTile) return prev;

      const updatedTile = { ...targetTile };

      if (tool === 'mine') {
        if (
          updatedTile.material !== 'air' &&
          updatedTile.material !== 'grass' &&
          updatedTile.material !== 'water'
        ) {
          updatedTile.designation = 'mine';
        }
      } else if (tool === 'chop') {
        if (updatedTile.material === 'tree_trunk') {
          updatedTile.designation = 'chop';
        }
      } else if (tool === 'gather') {
        if (updatedTile.material === 'grass' || updatedTile.material === 'tree_foliage') {
          updatedTile.designation = 'gather' as DesignationType;
        }
      } else if (tool.startsWith('build_')) {
        if (canPlaceBuilding(updatedTile, tool)) {
          updatedTile.designation = tool as DesignationType;
        }
      } else if (tool.startsWith('stockpile_')) {
        const pileType = tool.replace('stockpile_', '') as StockpileType;
        updatedTile.stockpile = pileType;
      } else if (tool === 'cancel') {
        updatedTile.designation = 'none';
        updatedTile.stockpile = 'none';
      }

      nextTiles[z][y][x] = updatedTile;
      const taskIndex = prev.taskIndex || buildTaskIndex(nextTiles);
      updateTileInTaskIndex(taskIndex, x, y, z, targetTile, updatedTile);
      return { ...prev, tiles: nextTiles, taskIndex };
    });
  };

  // World Regeneration
  const handleRegenerateWorld = () => {
    const newSeed = Math.floor(Math.random() * 99999);
    setWorldSeed(newSeed);
    const newWorld = generateWorld({
      sizeX: FORTRESS_SIZE_PRESETS.standard.sizeX,
      sizeY: FORTRESS_SIZE_PRESETS.standard.sizeY,
      depthZ: FORTRESS_SIZE_PRESETS.standard.depthZ,
      seed: newSeed,
      biome: 'mountain',
      hasRiver: true
    });
    setFortressState(newWorld);
    setCurrentZ(newWorld.surfaceZ);
    setSelectedDwarf(null);
    setSelectedTile(null);
    setPan({ x: 30, y: 30 });
    addEvent({
      tick: 0,
      timeStr: 'Year 105, Spring 1',
      textEn: `A brand new mountain fortress has been generated (Seed: ${newSeed}) with full 3D strata!`,
      textUa: `Згенеровано новий гірський світ (Seed: ${newSeed}) з Морем Магми та 3 рівнями печер!`,
      type: 'discovery'
    });
  };

  // Embark at chosen Overworld Region & Size
  const handleEmbarkAtTile = (tile: WorldMapTile, presetKey: keyof typeof FORTRESS_SIZE_PRESETS) => {
    const preset = FORTRESS_SIZE_PRESETS[presetKey] || FORTRESS_SIZE_PRESETS.standard;
    const newSeed = worldSeed + tile.x * 71 + tile.y * 37;

    const newWorld = generateWorld({
      sizeX: preset.sizeX,
      sizeY: preset.sizeY,
      depthZ: preset.depthZ,
      seed: newSeed,
      biome: tile.biome,
      embarkElevation: tile.elevation,
      hasRiver: tile.hasRiver
    });

    setFortressState(newWorld);
    setCurrentZ(newWorld.surfaceZ);
    setSelectedDwarf(null);
    setSelectedTile(null);
    setPan({ x: 30, y: 30 });

    // Update player fortress location on overworld map
    setOverworldState(prevOw => ({
      ...prevOw,
      currentEmbarkCoords: { x: tile.x, y: tile.y }
    }));

    addEvent({
      tick: 0,
      timeStr: 'Year 105, Spring 1',
      textEn: `Strike the earth! The dwarves have founded a new fortress in the ${tile.biome} region (${preset.nameEn})!`,
      textUa: `Ударте в камінь! Гноми заснували нову фортецю в регіоні ${tile.biome} (${preset.nameUa})!`,
      type: 'discovery'
    });

    setIsOverworldOpen(false);
  };

  // Add Migrant Dwarf Action
  const handleAddDwarf = () => {
    const names = ['Morul', 'Urist', 'Zon', 'Kol', 'Meng', 'Iden', 'Bomrek', 'Doren', 'Tholtig'];
    const titles = ['Mason', 'Engraver', 'Miner', 'Blacksmith', 'Brewer', 'Woodcutter'];
    const name = `${names[Math.floor(Math.random() * names.length)]} Deepforge`;
    const title = titles[Math.floor(Math.random() * titles.length)];

    setFortressState(prev => {
      const surfaceZ = prev.surfaceZ;
      const newDwarf: DwarfEntity = {
        id: `dwarf_migrant_${Date.now()}`,
        name,
        title,
        gender: Math.random() > 0.5 ? 'male' : 'female',
        age: 35 + Math.floor(Math.random() * 50),
        x: Math.floor(prev.sizeX / 2),
        y: Math.floor(prev.sizeY / 2),
        z: surfaceZ,
        targetPosition: null,
        path: [],
        stats: { strength: 12, agility: 10, intelligence: 11, endurance: 13 },
        needs: { hunger: 80, thirst: 80, sleep: 90, social: 70, work: 50 },
        skills: {
          mining: { level: 3, xp: 0 },
          woodcutting: { level: 2, xp: 0 },
          carpentry: { level: 2, xp: 0 },
          masonry: { level: 3, xp: 0 },
          brewing: { level: 2, xp: 0 },
          hauling: { level: 3, xp: 0 }
        },
        inventory: [{ type: 'pickaxe', count: 1 }],
        mood: 'happy',
        happinessScore: 88,
        thoughts: [{
          id: `thought_join_${Date.now()}`,
          textEn: 'Joined the glorious fortress as a migrant worker!',
          textUa: 'Приєднався до славної фортеці як робітник-мігрант!',
          positive: true,
          timestamp: prev.tick
        }],
        currentTask: null,
        color: '#f59e0b'
      };

      return {
        ...prev,
        dwarves: [...prev.dwarves, newDwarf]
      };
    });

    addEvent({
      tick: fortressState.tick,
      timeStr: `Year ${fortressState.year}, ${fortressState.season} ${fortressState.day}`,
      textEn: `Migrant ${name} (${title}) arrived at the gates of the fortress!`,
      textUa: `Мігрант ${name} (${title}) прибув до брами фортеці!`,
      type: 'discovery'
    });
  };

  // Spawn Custom Dwarf from Pixel Studio
  const handleSpawnCustomDwarf = (customData: Partial<DwarfEntity>) => {
    const dwarfName = customData.name || 'Urist McPixel';
    const dwarfTitle = customData.title || 'Miner';

    setFortressState(prev => {
      const surfaceZ = prev.surfaceZ;
      const newDwarf: DwarfEntity = {
        id: `dwarf_custom_${Date.now()}`,
        name: dwarfName,
        title: dwarfTitle,
        gender: customData.gender || 'male',
        age: 38,
        x: Math.floor(prev.sizeX / 2),
        y: Math.floor(prev.sizeY / 2),
        z: surfaceZ,
        targetPosition: null,
        path: [],
        stats: { strength: 14, agility: 12, intelligence: 12, endurance: 15 },
        needs: { hunger: 90, thirst: 90, sleep: 90, social: 80, work: 60 },
        skills: {
          mining: { level: dwarfTitle === 'Miner' ? 8 : 2, xp: 0 },
          woodcutting: { level: 2, xp: 0 },
          carpentry: { level: 3, xp: 0 },
          masonry: { level: dwarfTitle === 'Mason' ? 8 : 2, xp: 0 },
          brewing: { level: dwarfTitle === 'Brewer' ? 8 : 2, xp: 0 },
          hauling: { level: 4, xp: 0 }
        },
        inventory: [{ type: 'pickaxe', count: 1 }],
        mood: customData.mood || 'happy',
        happinessScore: customData.happinessScore || 85,
        thoughts: [{
          id: `thought_join_${Date.now()}`,
          textEn: 'Arrived at the fortress from the Pixel Art Codex Studio!',
          textUa: 'Прибув до фортеці прямо з Піксельної Майстерні Кодексу!',
          positive: true,
          timestamp: prev.tick
        }],
        currentTask: null,
        color: dwarfTitle === 'Brewer' ? '#f59e0b' : '#38bdf8'
      };

      return {
        ...prev,
        dwarves: [...prev.dwarves, newDwarf]
      };
    });

    addEvent({
      tick: fortressState.tick,
      timeStr: `Year ${fortressState.year}, ${fortressState.season} ${fortressState.day}`,
      textEn: `Custom Dwarf ${dwarfName} (${dwarfTitle}) emerged from the Pixel Studio into the fortress!`,
      textUa: `Особистий дворф ${dwarfName} (${dwarfTitle}) прибув з Піксельної Майстерні до фортеці!`,
      type: 'discovery'
    });
  };

  // Spawn Creature from RAW Explorer
  const handleSpawnCreature = (type: 'war_dog' | 'goblin_scout' | 'cave_spider') => {
    let name = 'War Dog';
    let symbol = 'd';
    let color = '#a8a29e';
    let isHostile = false;

    if (type === 'goblin_scout') {
      name = 'Goblin Scout';
      symbol = 'g';
      color = '#ef4444';
      isHostile = true;
    } else if (type === 'cave_spider') {
      name = 'Giant Cave Spider';
      symbol = 's';
      color = '#e2e8f0';
      isHostile = true;
    }

    const spawnZ = isHostile && type === 'cave_spider' ? 2 : fortressState.surfaceZ;

    setFortressState(prev => ({
      ...prev,
      creatures: [
        ...prev.creatures,
        {
          id: `creature_${Date.now()}`,
          type,
          name,
          x: Math.floor(prev.sizeX / 2) + Math.floor(Math.random() * 6) - 3,
          y: Math.floor(prev.sizeY / 2) + Math.floor(Math.random() * 6) - 3,
          z: spawnZ,
          isHostile,
          hp: 40,
          maxHp: 40,
          color,
          symbol
        }
      ]
    }));

    addEvent({
      tick: fortressState.tick,
      timeStr: `Year ${fortressState.year}, ${fortressState.season} ${fortressState.day}`,
      textEn: `${name} has been spotted near the fortress perimeter!`,
      textUa: `Помічено: ${name} біля кордонів фортеці!`,
      type: isHostile ? 'warning' : 'announcement'
    });
  };

  // Inject Mineral Vein from RAW Explorer
  const handleInjectMineralVein = (material: 'ore_iron' | 'ore_gold' | 'adamantine') => {
    const targetZ = material === 'adamantine' ? 1 : Math.max(2, currentZ - 2);
    setFortressState(prev => {
      const nextTiles = [...prev.tiles];
      const cx = Math.floor(prev.sizeX / 2);
      const cy = Math.floor(prev.sizeY / 2);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (Math.abs(dx) + Math.abs(dy) <= 1) {
            const tx = cx + dx;
            const ty = cy + dy;
            if (nextTiles[targetZ]?.[ty]?.[tx]) {
              nextTiles[targetZ][ty][tx] = {
                ...nextTiles[targetZ][ty][tx],
                material,
                hardness: material === 'adamantine' ? 100 : 50,
                maxHardness: material === 'adamantine' ? 100 : 50
              };
            }
          }
        }
      }

      return { ...prev, tiles: nextTiles };
    });

    addEvent({
      tick: fortressState.tick,
      timeStr: `Year ${fortressState.year}, ${fortressState.season} ${fortressState.day}`,
      textEn: `Prospectors detect a rich vein of ${material.toUpperCase()} at depth Z:${targetZ}!`,
      textUa: `Геологи виявили багату жилу ${material.toUpperCase()} на глибині Z:${targetZ}!`,
      type: 'discovery'
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0e0d0c] text-stone-100 overflow-hidden font-mono select-none">
      {/* Top Dwarf Fortress Steam Header */}
      <FortressHeader
        state={fortressState}
        currentZ={currentZ}
        maxZ={fortressState.depthZ}
        isRunning={isRunning}
        speed={speed}
        renderMode={renderMode}
        activeTab={activeTab}
        revealAll={revealAll}
        lang={lang}
        onTogglePlay={() => setIsRunning(r => !r)}
        onStepTick={() => tickRef.current()}
        onChangeSpeed={s => setSpeed(s)}
        onChangeZ={delta => setCurrentZ(z => Math.max(0, Math.min(fortressState.depthZ - 1, z + delta)))}
        onToggleRenderMode={() => setRenderMode(m => (m === 'ascii' ? 'graphic' : 'ascii'))}
        onToggleRevealAll={() => setRevealAll(r => !r)}
        onSwitchTab={tab => setActiveTab(tab)}
        onToggleLang={() => setLang(l => (l === 'ua' ? 'en' : 'ua'))}
        onAddDwarf={handleAddDwarf}
        onRegenerateWorld={handleRegenerateWorld}
        onOpenStocks={() => setIsStocksOpen(true)}
        onOpenOverworld={() => setIsOverworldOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* DF-AI Autonomous Overseer Bar (Ben Lubar & Gemini 3.8 Flash) */}
      <DfAiToolbar
        aiState={aiState}
        onToggleActive={() => {
          setAiState(prev => {
            const nextActive = !prev.isActive;
            if (nextActive && !isRunning) {
              setIsRunning(true);
            }
            return { ...prev, isActive: nextActive };
          });
        }}
        onRunStep={() => handleRunDfAiStep()}
        onChangeDirective={dir => {
          setAiState(prev => ({ ...prev, directive: dir }));
          handleRunDfAiStep(dir);
        }}
        onOpenTerminal={() => setIsDfHackOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
        lang={lang}
      />

      {/* Main Workspace based on Active Tab */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'simulation' ? (
          <>
            {/* Center Canvas Viewport */}
            <main className="flex-1 relative overflow-hidden flex">
              <FortressCanvas
                state={fortressState}
                currentZ={currentZ}
                renderMode={renderMode}
                selectedTool={selectedTool}
                selectedDwarfId={selectedDwarf?.id || null}
                pan={pan}
                zoom={zoom}
                onPanChange={p => setPan(p)}
                onZoomChange={z => setZoom(z)}
                onSelectDwarf={d => {
                  setSelectedDwarf(d);
                  setSelectedTile(null);
                }}
                onSelectTile={t => {
                  setSelectedTile(t);
                  setSelectedDwarf(null);
                }}
                onApplyDesignation={handleApplyDesignation}
                aiHighlights={aiState.highlightedTiles}
                revealAll={revealAll}
                lang={lang}
              />

              {/* Floating Top-Right Minimap HUD */}
              <div className="absolute top-3 right-3 z-20">
                <FortressMinimap
                  state={fortressState}
                  currentZ={currentZ}
                  maxZ={fortressState.depthZ}
                  pan={pan}
                  zoom={zoom}
                  viewportWidth={viewportSize.width}
                  viewportHeight={viewportSize.height}
                  onChangeZ={delta =>
                    setCurrentZ(z => Math.max(0, Math.min(fortressState.depthZ - 1, z + delta)))
                  }
                  onJumpToZ={z => setCurrentZ(z)}
                  onPanToWorld={handlePanToWorld}
                  revealAll={revealAll}
                  lang={lang}
                />
              </div>

              {/* Centered Bottom Steam Dock Toolbar */}
              <FortressToolBar
                selectedTool={selectedTool}
                onSelectTool={t => setSelectedTool(t)}
                onOpenUnitsRoster={() => setIsUnitsOpen(true)}
                lang={lang}
              />

              {/* Right Dwarf / Tile Inspector Dossier */}
              <DwarfDossier
                dwarf={selectedDwarf}
                tile={selectedTile}
                onClose={() => {
                  setSelectedDwarf(null);
                  setSelectedTile(null);
                }}
                lang={lang}
              />
            </main>
          </>
        ) : activeTab === 'raw_explorer' ? (
          <RawExplorer
            onSpawnCreature={handleSpawnCreature}
            onInjectMineralVein={handleInjectMineralVein}
            lang={lang}
          />
        ) : activeTab === 'pixel_codex' ? (
          <PixelCodex
            lang={lang}
            onSpawnCustomDwarf={handleSpawnCustomDwarf}
          />
        ) : (
          <AnalysisView lang={lang} />
        )}
      </div>

      {/* Bottom Announcements & Event Chronicle */}
      <EventTicker events={events} lang={lang} />

      {/* Modals */}
      <StocksModal
        isOpen={isStocksOpen}
        onClose={() => setIsStocksOpen(false)}
        state={fortressState}
        lang={lang}
      />

      <UnitsRosterModal
        isOpen={isUnitsOpen}
        onClose={() => setIsUnitsOpen(false)}
        dwarves={fortressState.dwarves}
        onSelectDwarf={handleSelectDwarfFromRoster}
        lang={lang}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={lang}
      />

      <DfHackConsoleModal
        isOpen={isDfHackOpen}
        onClose={() => setIsDfHackOpen(false)}
        aiState={aiState}
        onToggleActive={() => {
          setAiState(prev => {
            const nextActive = !prev.isActive;
            if (nextActive && !isRunning) {
              setIsRunning(true);
            }
            return { ...prev, isActive: nextActive };
          });
        }}
        onRunStep={() => handleRunDfAiStep()}
        onSendCommand={handleSendDfHackCommand}
        revealAll={revealAll}
        onToggleRevealAll={() => setRevealAll(r => !r)}
        lang={lang}
      />

      <AiAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        lang={lang}
      />

      {isOverworldOpen && (
        <OverworldView
          overworld={overworldState}
          onUpdateOverworld={setOverworldState}
          fortressState={fortressState}
          onEmbarkAtTile={handleEmbarkAtTile}
          onClose={() => setIsOverworldOpen(false)}
        />
      )}
    </div>
  );
}
