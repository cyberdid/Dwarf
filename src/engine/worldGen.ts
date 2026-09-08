/**
 * Procedural 3D World & Subterranean Strata Generator
 * Faithful recreation of Dwarf Fortress World Generation mechanics (DF-Wiki specifications):
 * - Deep Z-level underworld:
 *   * Z = 0..1: Slade bedrock & Hollow Spires of Raw Adamantine (The Hells boundary)
 *   * Z = 2..4: The Magma Sea (vast boiling molten magma pools, obsidian bridges)
 *   * Z = 5..8: Cavern Layer 3 (deep obsidian halls, bottomless chasms, glowing gems, webs)
 *   * Z = 9..14: Cavern Layer 2 (vast fungal spore tree forests, bioluminescent cave moss)
 *   * Z = 15..20: Cavern Layer 1 (subterranean lakes, plump helmet colonies, cave moss)
 *   * Z = 21..24: Deep & Upper Mineral Strata (Hematite, Native Gold, Malachite, Coal, Marble, Granite)
 *   * Z = 25..27: Soil, Clay, Sand & Aquifer layers
 *   * Z = 28..surface: Surface topography with biomes (Mountains, Volcano Caldera, Forests, Badlands, Haunted)
 */

import { PerlinNoise3D } from './noise';
import { Tile, MaterialType, FortressState, DwarfEntity, WorldItem, CreatureEntity, OverworldBiomeType } from '../types/simulation';

export interface WorldGenConfig {
  sizeX: number;
  sizeY: number;
  depthZ: number;
  seed: number;
  terrainScale?: number;
  roughness?: number;
  oreDensity?: number;
  biome?: OverworldBiomeType;
  embarkElevation?: number;
  hasRiver?: boolean;
  metals?: 'none' | 'shallow' | 'deep' | 'abundant';
}

export const FORTRESS_SIZE_PRESETS = {
  compact: { nameEn: 'Compact (40×30, 24 Z)', nameUa: 'Компактна (40×30, 24 Z)', sizeX: 40, sizeY: 30, depthZ: 24 },
  standard: { nameEn: 'Standard DF 3×3 (60×44, 28 Z)', nameUa: 'Стандарт DF 3×3 (60×44, 28 Z)', sizeX: 60, sizeY: 44, depthZ: 28 },
  large: { nameEn: 'Grand Mountain 4×4 (80×60, 32 Z)', nameUa: 'Велика Гора 4×4 (80×60, 32 Z)', sizeX: 80, sizeY: 60, depthZ: 32 },
  colossal: { nameEn: 'Colossal Realm 5×5 (100×75, 36 Z)', nameUa: 'Колосальне Царство (100×75, 36 Z)', sizeX: 100, sizeY: 75, depthZ: 36 },
  epic: { nameEn: 'Megafortress Titan (120×85, 40 Z)', nameUa: 'Мегафортеця Титан (120×85, 40 Z)', sizeX: 120, sizeY: 85, depthZ: 40 }
};

const DWARF_FIRST_NAMES = [
  'Urist', 'Doren', 'Cog', 'Vabok', 'Bomrek', 'Zon', 'Iden', 'Kol', 'Asmel', 'Meng',
  'Mistem', 'Logem', 'Oddom', 'Shorast', 'Kogan', 'Ingiz', 'Tekkud', 'Lokum', 'Dumat', 'Reg'
];

const DWARF_LAST_NAMES = [
  'Ironbeard', 'Stonehammer', 'Copperbrow', 'Goldvein', 'Mountainpeak', 'Deepdelver',
  'Aleheart', 'Anvilfist', 'Graniteborn', 'Oreshield', 'Gemcrafter', 'Tunnelgaze'
];

const DWARF_TITLES = [
  'Miner', 'Woodworker', 'Mason', 'Brewer', 'Carpenter', 'Engraver', 'Blacksmith', 'Grower'
];

export function generateWorld(config: WorldGenConfig): FortressState {
  const {
    sizeX,
    sizeY,
    depthZ,
    seed,
    oreDensity = 1.0,
    biome = 'mountain',
    hasRiver = true
  } = config;

  const noise = new PerlinNoise3D(seed);
  const cavernNoise = new PerlinNoise3D(seed + 888);

  // Surface base calculated proportionally (usually around 70-75% of depth)
  const surfaceBaseZ = Math.min(depthZ - 4, Math.max(16, Math.floor(depthZ * 0.72)));

  const tiles: Tile[][][] = [];

  // Initialize empty grid [z][y][x]
  for (let z = 0; z < depthZ; z++) {
    tiles[z] = [];
    for (let y = 0; y < sizeY; y++) {
      tiles[z][y] = [];
      for (let x = 0; x < sizeX; x++) {
        tiles[z][y][x] = {
          x,
          y,
          z,
          material: 'air',
          hardness: 0,
          maxHardness: 0,
          waterLevel: 0,
          stability: 1.0,
          isRevealed: z >= surfaceBaseZ - 1, // Surface visible initially
          designation: 'none',
          stockpile: 'none',
          zone: 'none',
          itemIds: []
        };
      }
    }
  }

  // 1. Surface elevation map using multi-octave noise
  const elevationMap: number[][] = [];
  const isVolcano = biome === 'volcano';
  const volcanoCenterX = Math.floor(sizeX / 2);
  const volcanoCenterY = Math.floor(sizeY / 2);

  for (let y = 0; y < sizeY; y++) {
    elevationMap[y] = [];
    for (let x = 0; x < sizeX; x++) {
      const hNoise = noise.sample(x * 0.05, y * 0.05, 0.5) * 4.0;
      const hDetail = noise.sample(x * 0.12, y * 0.12, 5.5) * 1.8;

      let height = Math.round(surfaceBaseZ + hNoise + hDetail);

      // If volcano, create a towering cone summit with central crater
      if (isVolcano) {
        const distFromVolcano = Math.hypot(x - volcanoCenterX, y - volcanoCenterY);
        if (distFromVolcano < 12) {
          const coneBoost = Math.max(0, (12 - distFromVolcano) * 0.7);
          height = Math.round(height + coneBoost);
        }
      }

      elevationMap[y][x] = Math.max(10, Math.min(depthZ - 2, height));
    }
  }

  // 2. Surface River carving
  const riverPath: Set<string> = new Set();
  if (hasRiver && !isVolcano) {
    const riverStartY = Math.floor(sizeY * 0.28);
    for (let x = 0; x < sizeX; x++) {
      const riverY = Math.floor(riverStartY + Math.sin(x * 0.16) * 3.5);
      if (riverY >= 0 && riverY < sizeY) {
        riverPath.add(`${x},${riverY}`);
        riverPath.add(`${x},${riverY + 1}`); // 2 tiles wide
        if (x % 3 === 0 && riverY + 2 < sizeY) {
          riverPath.add(`${x},${riverY + 2}`); // periodic wide shallows
        }
      }
    }
  }

  // 3. Strata Layer Boundaries (Deep Underground to Sky)
  const zSladeMax = 1;
  const zMagmaSeaMax = Math.min(4, Math.floor(surfaceBaseZ * 0.2));
  const zCavern3Max = Math.min(8, Math.floor(surfaceBaseZ * 0.35));
  const zCavern2Max = Math.min(13, Math.floor(surfaceBaseZ * 0.55));
  const zCavern1Max = Math.min(18, Math.floor(surfaceBaseZ * 0.72));

  // 4. Fill All 3D Strata
  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      const surfaceZ = elevationMap[y][x];
      const isRiver = riverPath.has(`${x},${y}`);

      // Check if inside Volcano magma vent pipe
      const isVolcanoVent = isVolcano && Math.hypot(x - volcanoCenterX, y - volcanoCenterY) <= 3.2;

      for (let z = 0; z < depthZ; z++) {
        const tile = tiles[z][y][x];

        // --- A. VOLCANO CENTRAL MAGMA PIPE ---
        if (isVolcanoVent && z <= surfaceZ) {
          tile.material = 'magma';
          tile.waterLevel = 7;
          tile.hardness = 0;
          tile.maxHardness = 0;
          continue;
        }

        // --- B. SKY / AIR (Above surface) ---
        if (z > surfaceZ) {
          tile.material = 'air';
          tile.hardness = 0;
          tile.maxHardness = 0;
          continue;
        }

        // --- C. SURFACE TILE (z === surfaceZ) ---
        if (z === surfaceZ) {
          if (isRiver) {
            tile.material = 'water';
            tile.waterLevel = 7;
          } else if (biome === 'badlands') {
            tile.material = 'sand';
            tile.hardness = 10;
          } else if (biome === 'tundra') {
            tile.material = 'marble'; // Frozen permafrost
            tile.hardness = 25;
          } else {
            // Vegetation (Grass or Tree)
            const treeChance = biome === 'tropical_rainforest' ? 0.28 : biome === 'temperate_forest' ? 0.38 : 0.46;
            const treeNoise = noise.sample(x * 0.35, y * 0.35, 12.3);

            if (treeNoise > treeChance && x > 2 && x < sizeX - 3 && y > 2 && y < sizeY - 3) {
              tile.material = 'tree_trunk';
              tile.hardness = 30;
              tile.maxHardness = 30;
              if (z + 1 < depthZ) {
                tiles[z + 1][y][x].material = 'tree_foliage';
              }
            } else {
              tile.material = 'grass';
              tile.hardness = 8;
            }
          }
          tile.maxHardness = tile.hardness;
          continue;
        }

        // --- D. SUBSURFACE SOIL & SAND (z === surfaceZ - 1 or surfaceZ - 2) ---
        if (z >= surfaceZ - 2) {
          tile.material = isRiver ? 'sand' : biome === 'badlands' ? 'sand' : 'soil';
          tile.hardness = 12;
          tile.maxHardness = 12;
          continue;
        }

        // --- E. Z = 0..1: SLADE & RAW ADAMANTINE SPIRES (The Underworld / Hells) ---
        if (z <= zSladeMax) {
          // Hollow Raw Adamantine Spires shooting up from the depths
          const adamantineSpireNoise = noise.sample(x * 0.15, y * 0.15, 99.1);
          if (adamantineSpireNoise > 0.68) {
            tile.material = 'adamantine';
            tile.hardness = 100;
          } else if (z === 0) {
            tile.material = 'slade'; // Unbreakable underworld bedrock
            tile.hardness = 100;
          } else {
            tile.material = 'obsidian';
            tile.hardness = 80;
          }
          tile.maxHardness = tile.hardness;
          continue;
        }

        // --- F. Z = 2..4: THE MAGMA SEA ---
        if (z <= zMagmaSeaMax) {
          const magmaNoise = noise.sample(x * 0.14, y * 0.14, z * 0.3);
          if (magmaNoise > 0.35) {
            tile.material = 'magma';
            tile.waterLevel = 7;
            tile.hardness = 0;
          } else {
            // Obsidian crust and rock islands
            tile.material = 'obsidian';
            tile.hardness = 75;
          }
          tile.maxHardness = tile.hardness;
          continue;
        }

        // --- G. SUBTERRANEAN CAVERNS (Layers 1, 2, and 3) ---
        // 3D cavity noise calculation for hollow halls
        const cSample = cavernNoise.sample(x * 0.12, y * 0.12, z * 0.22);

        // 1. Cavern Layer 3 (Z = 5..8): Pitch black obsidian halls & crystal veins
        if (z <= zCavern3Max) {
          if (cSample > 0.52) {
            tile.material = 'floor_stone';
            // Magma fissure or gem pocket in deep cavern floor
            if (cSample > 0.72) {
              tile.material = 'magma';
              tile.waterLevel = 7;
            }
            continue;
          }
        }
        // 2. Cavern Layer 2 (Z = 9..13): Fungal Forests with spore trees & cave moss
        else if (z <= zCavern2Max) {
          if (cSample > 0.50) {
            const sporeNoise = noise.sample(x * 0.3, y * 0.3, z * 0.4);
            if (sporeNoise > 0.62) {
              tile.material = 'fungal_tree'; // Giant subterranean mushroom
              tile.hardness = 30;
              tile.maxHardness = 30;
            } else {
              tile.material = 'cave_moss'; // Bioluminescent cavern floor
              tile.hardness = 4;
              tile.maxHardness = 4;
            }
            continue;
          }
        }
        // 3. Cavern Layer 1 (Z = 14..18): Subterranean lake & cave moss
        else if (z <= zCavern1Max) {
          if (cSample > 0.50) {
            if (cSample > 0.68) {
              tile.material = 'water'; // Underground cavern lake
              tile.waterLevel = 7;
            } else {
              tile.material = 'cave_moss';
              tile.hardness = 4;
              tile.maxHardness = 4;
            }
            continue;
          }
        }

        // --- H. SOLID ROCK STRATA & MINERAL VEINS ---
        let baseRock: MaterialType = 'stone';
        let baseHardness = 40;

        if (z <= zCavern3Max) {
          baseRock = 'obsidian';
          baseHardness = 75;
        } else if (z <= zCavern2Max) {
          baseRock = 'granite';
          baseHardness = 60;
        } else if (z <= zCavern1Max) {
          baseRock = 'marble';
          baseHardness = 50;
        } else {
          baseRock = 'stone'; // Limestone / Sandstone
          baseHardness = 35;
        }

        // Mineral vein sampling
        const oreSample = noise.sample(x * 0.22 * oreDensity, y * 0.22 * oreDensity, z * 0.32);

        if (oreSample > 0.54) {
          tile.material = 'ore_iron'; // Hematite / Magnetite
          tile.hardness = baseHardness + 15;
        } else if (oreSample > 0.46 && oreSample <= 0.52 && z <= zCavern1Max) {
          tile.material = 'ore_gold'; // Native Gold
          tile.hardness = baseHardness + 10;
        } else if (oreSample > 0.38 && oreSample <= 0.44) {
          tile.material = 'ore_copper'; // Malachite / Tetrahedrite
          tile.hardness = baseHardness + 8;
        } else if (oreSample < -0.46) {
          tile.material = 'ore_coal'; // Bituminous coal / Lignite
          tile.hardness = baseHardness;
        } else if (oreSample < -0.58 && z <= zCavern2Max) {
          tile.material = 'ore_gem'; // Sapphire / Emerald clusters
          tile.hardness = baseHardness + 20;
        } else {
          tile.material = baseRock;
          tile.hardness = baseHardness;
        }
        tile.maxHardness = tile.hardness;
      }
    }
  }

  // 5. Find Suitable Embark Starting Point on Surface
  let embarkX = Math.floor(sizeX / 2);
  let embarkY = Math.floor(sizeY / 2);
  let embarkZ = elevationMap[embarkY][embarkX];

  for (let r = 0; r < 16; r++) {
    let found = false;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = embarkX + dx;
        const ny = embarkY + dy;
        if (nx >= 3 && nx < sizeX - 3 && ny >= 3 && ny < sizeY - 3) {
          const nz = elevationMap[ny][nx];
          const mat = tiles[nz][ny][nx].material;
          if (mat === 'grass' || mat === 'sand' || mat === 'marble') {
            embarkX = nx;
            embarkY = ny;
            embarkZ = nz;
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    if (found) break;
  }

  // 6. Spawn Initial 7 Dwarves ("The First Seven")
  const dwarves: DwarfEntity[] = [];
  const dwarfColors = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];

  for (let i = 0; i < 7; i++) {
    const firstName = DWARF_FIRST_NAMES[i % DWARF_FIRST_NAMES.length];
    const lastName = DWARF_LAST_NAMES[i % DWARF_LAST_NAMES.length];
    const title = DWARF_TITLES[i % DWARF_TITLES.length];

    const dx = (i % 3) - 1;
    const dy = Math.floor(i / 3) - 1;
    const startX = Math.max(1, Math.min(sizeX - 2, embarkX + dx));
    const startY = Math.max(1, Math.min(sizeY - 2, embarkY + dy));
    const startZ = elevationMap[startY][startX];

    dwarves.push({
      id: `dwarf_${i + 1}`,
      name: `${firstName} ${lastName}`,
      title,
      gender: i % 2 === 0 ? 'male' : 'female',
      age: 45 + (i * 12) % 110,
      x: startX,
      y: startY,
      z: startZ,
      targetPosition: null,
      path: [],
      stats: {
        strength: 10 + (i * 3) % 8,
        agility: 9 + (i * 2) % 6,
        intelligence: 11 + (i * 4) % 6,
        endurance: 12 + (i * 2) % 7
      },
      needs: {
        hunger: 80 + (i * 3) % 15,
        thirst: 85 + (i * 2) % 12,
        sleep: 90 + (i * 4) % 10,
        social: 65 + (i * 5) % 25,
        work: 40 + (i * 7) % 30
      },
      skills: {
        mining: { level: i === 0 ? 5 : i === 1 ? 3 : 1, xp: 0 },
        woodcutting: { level: i === 2 ? 4 : 1, xp: 0 },
        carpentry: { level: i === 3 ? 4 : 1, xp: 0 },
        masonry: { level: i === 4 ? 4 : 1, xp: 0 },
        brewing: { level: i === 5 ? 5 : 1, xp: 0 },
        hauling: { level: 2, xp: 0 }
      },
      inventory: [
        { type: i === 0 || i === 1 ? 'pickaxe' : 'axe', count: 1 }
      ],
      mood: 'content',
      happinessScore: 82,
      thoughts: [
        {
          id: `thought_init_${i}`,
          textEn: 'Arrived at the new fortress site, eager to strike the earth!',
          textUa: 'Прибув на нове місце фортеці, палає бажанням вдарити в камінь!',
          positive: true,
          timestamp: 0
        }
      ],
      currentTask: null,
      color: dwarfColors[i % dwarfColors.length]
    });
  }

  // 7. Initial Embark Stockpile Items
  const items: WorldItem[] = [
    { id: 'item_food_1', type: 'food', nameEn: 'Plump Helmet barrel', nameUa: 'Бочка товстошоломників', x: embarkX + 1, y: embarkY, z: embarkZ },
    { id: 'item_food_2', type: 'food', nameEn: 'Plump Helmet barrel', nameUa: 'Бочка товстошоломників', x: embarkX + 1, y: embarkY + 1, z: embarkZ },
    { id: 'item_ale_1', type: 'ale', nameEn: 'Dwarven Ale keg', nameUa: 'Барило гном’ячого елю', x: embarkX - 1, y: embarkY, z: embarkZ },
    { id: 'item_ale_2', type: 'ale', nameEn: 'Dwarven Ale keg', nameUa: 'Барило гном’ячого елю', x: embarkX - 1, y: embarkY + 1, z: embarkZ },
    { id: 'item_wood_1', type: 'wood', nameEn: 'Cedar log', nameUa: 'Кедрова колода', x: embarkX, y: embarkY - 1, z: embarkZ },
    { id: 'item_wood_2', type: 'wood', nameEn: 'Cedar log', nameUa: 'Кедрова колода', x: embarkX + 1, y: embarkY - 1, z: embarkZ },
    { id: 'item_stone_1', type: 'stone', nameEn: 'Granite boulder', nameUa: 'Гранітний валун', x: embarkX - 1, y: embarkY - 1, z: embarkZ }
  ];

  // 8. Creatures (Surface pet war dog and deep cavern monsters)
  const creatures: CreatureEntity[] = [
    {
      id: 'pet_dog_1',
      type: 'war_dog',
      name: 'Barker (War Dog)',
      x: embarkX + 2,
      y: embarkY,
      z: embarkZ,
      isHostile: false,
      hp: 30,
      maxHp: 30,
      color: '#a8a29e',
      symbol: 'd'
    }
  ];

  // Add deep cavern spider in Cavern 3
  if (zCavern3Max > 4) {
    creatures.push({
      id: 'creature_spider_1',
      type: 'cave_spider',
      name: 'Giant Cave Spider',
      x: Math.floor(sizeX * 0.75),
      y: Math.floor(sizeY * 0.75),
      z: zCavern3Max - 1,
      isHostile: true,
      hp: 45,
      maxHp: 45,
      color: '#a855f7',
      symbol: 's'
    });
  }

  return {
    sizeX,
    sizeY,
    depthZ,
    surfaceZ: surfaceBaseZ,
    tiles,
    dwarves,
    creatures,
    items,
    stockpilesCounts: {
      stone: 1,
      wood: 2,
      food: 2,
      ore: 0,
      ale: 2
    },
    wealth: 1500,
    year: 105,
    season: 'Spring',
    day: 1,
    tick: 0
  };
}
