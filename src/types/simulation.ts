/**
 * Types and interfaces for Dwarf Fortress Simulation and RAW Analysis
 */

export type MaterialType =
  | 'air'
  | 'soil'
  | 'sand'
  | 'stone'
  | 'granite'
  | 'marble'
  | 'obsidian'
  | 'ore_iron'
  | 'ore_gold'
  | 'ore_copper'
  | 'ore_coal'
  | 'ore_gem'
  | 'adamantine'
  | 'water'
  | 'magma'
  | 'cave_moss'
  | 'fungal_tree'
  | 'slade'
  | 'grass'
  | 'tree_trunk'
  | 'tree_foliage'
  | 'floor_stone'
  | 'floor_dirt'
  | 'floor_wood'
  | 'floor_engraved'
  | 'wall_constructed'
  | 'door_constructed'
  | 'workshop_mason'
  | 'workshop_carpenter'
  | 'workshop_still'
  | 'bed'
  | 'chair'
  | 'table'
  | 'well';

export type DesignationType = 'none' | 'mine' | 'chop' | 'gather' | 'build_wall' | 'build_door' | 'build_bed' | 'build_workshop_still' | 'build_workshop_mason';

export type StockpileType = 'none' | 'stone' | 'wood' | 'food' | 'ore';

export type ZoneType = 'none' | 'bedroom' | 'tavern' | 'dormitory';

export interface Tile {
  x: number;
  y: number;
  z: number;
  material: MaterialType;
  hardness: number; // 0 to 100 (mining hits required)
  maxHardness: number;
  waterLevel: number; // 0 to 7
  stability: number;
  isRevealed: boolean;
  designation: DesignationType;
  stockpile: StockpileType;
  zone: ZoneType;
  itemIds: string[];
}

export type DwarfNeed = 'hunger' | 'thirst' | 'sleep' | 'social' | 'work';

export type DwarfMood = 'ecstatic' | 'happy' | 'content' | 'fine' | 'stressed' | 'melancholy' | 'tantrum' | 'berserk';

export interface DwarfSkill {
  level: number;
  xp: number;
}

export interface DwarfThought {
  id: string;
  textEn: string;
  textUa: string;
  positive: boolean;
  timestamp: number;
}

export interface DwarfTask {
  type: 'idle' | 'mining' | 'chopping' | 'gathering' | 'hauling' | 'building' | 'sleeping' | 'drinking' | 'eating' | 'socializing';
  targetX: number;
  targetY: number;
  targetZ: number;
  progress: number;
  maxProgress: number;
  descriptionEn: string;
  descriptionUa: string;
  targetItemId?: string;
}

export interface DwarfEntity {
  id: string;
  name: string;
  title: string;
  gender: 'male' | 'female';
  age: number;
  x: number;
  y: number;
  z: number;
  targetPosition: { x: number; y: number; z: number } | null;
  path: [number, number, number][];
  stats: {
    strength: number;
    agility: number;
    intelligence: number;
    endurance: number;
  };
  needs: {
    hunger: number; // 0 (starving) to 100 (full)
    thirst: number; // 0 (dehydrated) to 100 (quenched)
    sleep: number;  // 0 (exhausted) to 100 (rested)
    social: number; // 0 (lonely) to 100 (content)
    work: number;   // 0 (bored) to 100 (fulfilled)
  };
  skills: {
    mining: DwarfSkill;
    woodcutting: DwarfSkill;
    carpentry: DwarfSkill;
    masonry: DwarfSkill;
    brewing: DwarfSkill;
    hauling: DwarfSkill;
  };
  inventory: {
    type: 'stone' | 'wood' | 'ore_iron' | 'ore_gold' | 'ale' | 'food' | 'pickaxe' | 'axe';
    count: number;
  }[];
  mood: DwarfMood;
  happinessScore: number; // 0 to 100
  thoughts: DwarfThought[];
  currentTask: DwarfTask | null;
  color: string;
}

export interface CreatureEntity {
  id: string;
  type: 'war_dog' | 'goblin_scout' | 'cave_spider';
  name: string;
  x: number;
  y: number;
  z: number;
  isHostile: boolean;
  hp: number;
  maxHp: number;
  color: string;
  symbol: string;
}

export type WorldItemType =
  | 'stone'
  | 'wood'
  | 'ore_iron'
  | 'ore_gold'
  | 'ale'
  | 'food'
  | 'bed'
  | 'chair'
  | 'table'
  | 'door'
  | 'furniture';

export interface WorldItem {
  id: string;
  type: WorldItemType;
  nameEn: string;
  nameUa: string;
  x: number;
  y: number;
  z: number;
  claimedByDwarfId?: string;
}

export interface Coord3D {
  x: number;
  y: number;
  z: number;
}

export interface BuildTargetCoord extends Coord3D {
  type: string;
}

export interface TaskIndex {
  mining: Map<string, Coord3D>;
  chopping: Map<string, Coord3D>;
  gathering: Map<string, Coord3D>;
  building: Map<string, BuildTargetCoord>;
  stockpiles: {
    stone: Map<string, Coord3D>;
    wood: Map<string, Coord3D>;
    food: Map<string, Coord3D>;
    ore: Map<string, Coord3D>;
  };
  beds: Map<string, Coord3D>;
}

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export interface FortressState {
  sizeX: number;
  sizeY: number;
  depthZ: number; // total Z-levels
  surfaceZ: number; // default surface level
  tiles: Tile[][][]; // [z][y][x]
  dwarves: DwarfEntity[];
  creatures: CreatureEntity[];
  items: WorldItem[];
  taskIndex?: TaskIndex;
  stockpilesCounts: {
    stone: number;
    wood: number;
    food: number;
    ore: number;
    ale: number;
  };
  stocksBreakdown?: {
    totalOnMap: {
      stone: number;
      wood: number;
      food: number;
      ore: number;
      ale: number;
    };
    inStockpile: {
      stone: number;
      wood: number;
      food: number;
      ore: number;
      ale: number;
    };
  };
  wealth: number;
  year: number;
  season: Season;
  day: number;
  tick: number;
}

export interface FortressEvent {
  id: string;
  tick: number;
  timeStr: string;
  textEn: string;
  textUa: string;
  type: 'announcement' | 'warning' | 'discovery' | 'mood' | 'death';
}

export type OverworldBiomeType =
  | 'ocean'
  | 'mountain'
  | 'volcano'
  | 'temperate_forest'
  | 'taiga'
  | 'tropical_rainforest'
  | 'badlands'
  | 'swamp'
  | 'tundra'
  | 'plains'
  | 'haunted';

export interface WorldSite {
  id: string;
  name: string;
  type: 'dwarf_mountainhall' | 'elf_retreat' | 'human_town' | 'goblin_pit' | 'necromancer_tower' | 'kobold_cave' | 'ruins' | 'fortress';
  civId: string;
  civName: string;
  population: number;
  leader: string;
  isHostile: boolean;
}

export interface WorldMapTile {
  x: number;
  y: number;
  name: string;
  biome: OverworldBiomeType;
  elevation: number; // 0 (deep sea) to 100 (towering peak)
  temperature: 'freezing' | 'cold' | 'temperate' | 'warm' | 'scorching';
  rainfall: number; // 0 to 100
  drainage: number; // 0 to 100
  savagery: 'calm' | 'wilderness' | 'untamed';
  evilness: 'good' | 'neutral' | 'evil';
  hasRiver: boolean;
  metals: 'none' | 'shallow' | 'deep' | 'abundant';
  fluxStone: boolean;
  aquifer: boolean;
  site: WorldSite | null;
  isCurrentEmbark: boolean;
}

export interface WorldCivilization {
  id: string;
  name: string;
  race: 'dwarf' | 'elf' | 'human' | 'goblin' | 'kobold';
  leader: string;
  color: string;
  relation: 'allied' | 'friendly' | 'neutral' | 'hostile' | 'at_war';
  sitesCount: number;
  capitalX: number;
  capitalY: number;
  descriptionEn: string;
  descriptionUa: string;
}

export interface WorldLegend {
  id: string;
  year: number;
  titleEn: string;
  titleUa: string;
  textEn: string;
  textUa: string;
  type: 'war' | 'beast' | 'founding' | 'artifact' | 'titan';
}

export interface WorldExpedition {
  id: string;
  name: string;
  targetSiteName: string;
  targetX: number;
  targetY: number;
  type: 'trade' | 'raid' | 'scout';
  status: 'marching' | 'engaging' | 'returning' | 'completed';
  ticksTotal: number;
  ticksRemaining: number;
  dwarvesCount: number;
  lootSummaryEn?: string;
  lootSummaryUa?: string;
}

export interface OverworldState {
  sizeX: number;
  sizeY: number;
  seed: number;
  name: string;
  tiles: WorldMapTile[][]; // [y][x]
  civilizations: WorldCivilization[];
  legends: WorldLegend[];
  expeditions: WorldExpedition[];
  currentEmbarkCoords: { x: number; y: number };
}

