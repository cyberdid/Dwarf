/**
 * Procedural Overworld Generator for Dwarf Fortress
 * Faithful recreation of Dwarf Fortress World Generation & Legends mechanics (DF-Wiki specifications):
 * - Continental elevation, moisture belts, temperature bands, and drainage
 * - Natural biomes: Mountains, Volcanoes, Forests, Taiga, Rainforest, Badlands, Swamps, Tundra, Plains, Haunted Evil Lands
 * - Continental River systems running downhill into the ocean
 * - Historical Civilizations: Dwarven Mountain Halls, Elven Retreats, Human Kingdoms, Goblin Dark Pits, Necromancer Towers
 * - World Legends chronicle & dynamic military/trade expedition dispatch system
 */

import { PerlinNoise3D } from './noise';
import {
  OverworldState,
  WorldMapTile,
  WorldCivilization,
  WorldSite,
  WorldLegend,
  WorldExpedition,
  OverworldBiomeType,
  FortressEvent
} from '../types/simulation';

const WORLD_NAMES_PREFIX = [
  'The Endless', 'The Mythic', 'The Ancient', 'The Golden', 'The Obsidian',
  'The Bloodstained', 'The Eternal', 'The Iron', 'The Silver', 'The Forgotten'
];
const WORLD_NAMES_SUFFIX = [
  'Realm', 'Continent', 'Expanse', 'Domain', 'World', 'Cosmos', 'Hearth', 'Reach'
];

const REGION_PREFIX_UA = [
  'Скелясті', 'Загублені', 'Вічні', 'Залізні', 'Смарагдові',
  'Золоті', 'Морозні', 'Димні', 'Прокляті', 'Місячні'
];
const REGION_NOUN_UA = [
  'Вершини', 'Пустища', 'Ліси', 'Долини', 'Джунглі',
  'Болота', 'Степи', 'Безодні', 'Ущелини', 'Землі'
];

export function generateOverworld(seed: number = 7412): OverworldState {
  const sizeX = 64;
  const sizeY = 64;
  const noise = new PerlinNoise3D(seed);
  const moistureNoise = new PerlinNoise3D(seed + 101);
  const drainageNoise = new PerlinNoise3D(seed + 202);
  const savageryNoise = new PerlinNoise3D(seed + 303);

  const worldName = `${WORLD_NAMES_PREFIX[seed % WORLD_NAMES_PREFIX.length]} ${WORLD_NAMES_SUFFIX[(seed * 3) % WORLD_NAMES_SUFFIX.length]}`;

  // 1. Generate Raw Geophysical Properties
  const tiles: WorldMapTile[][] = [];

  for (let y = 0; y < sizeY; y++) {
    tiles[y] = [];
    // Latitude temperature gradient (poles cold, equator warm)
    const latFactor = 1.0 - Math.abs((y - sizeY / 2) / (sizeY / 2)); // 0 at edges, 1 at equator

    for (let x = 0; x < sizeX; x++) {
      // Elevation from multi-octave noise
      const elev1 = noise.sample(x * 0.045, y * 0.045, 0.5);
      const elev2 = noise.sample(x * 0.09, y * 0.09, 3.2) * 0.45;
      const elev3 = noise.sample(x * 0.18, y * 0.18, 7.8) * 0.2;
      let rawElev = (elev1 + elev2 + elev3 + 1.0) * 45; // 0 to ~100

      // Edge falloff for ocean borders
      const distFromCenter = Math.sqrt(
        Math.pow((x - sizeX / 2) / (sizeX / 2), 2) + Math.pow((y - sizeY / 2) / (sizeY / 2), 2)
      );
      if (distFromCenter > 0.85) {
        rawElev -= (distFromCenter - 0.85) * 120;
      }
      const elevation = Math.max(0, Math.min(100, Math.round(rawElev)));

      // Temperature: combination of latitude and elevation cooling
      const tempVal = latFactor * 80 - (elevation > 50 ? (elevation - 50) * 0.8 : 0);
      let temperature: WorldMapTile['temperature'] = 'temperate';
      if (tempVal < 15) temperature = 'freezing';
      else if (tempVal < 35) temperature = 'cold';
      else if (tempVal < 60) temperature = 'temperate';
      else if (tempVal < 80) temperature = 'warm';
      else temperature = 'scorching';

      // Rainfall & Moisture
      const rainSample = (moistureNoise.sample(x * 0.06, y * 0.06, 1.1) + 1.0) * 45;
      const rainfall = Math.max(0, Math.min(100, Math.round(rainSample)));

      // Drainage
      const drainSample = (drainageNoise.sample(x * 0.07, y * 0.07, 2.2) + 1.0) * 45;
      const drainage = Math.max(0, Math.min(100, Math.round(drainSample)));

      // Savagery & Evil
      const savSample = (savageryNoise.sample(x * 0.08, y * 0.08, 4.4) + 1.0) * 50;
      let savagery: WorldMapTile['savagery'] = 'wilderness';
      if (savSample < 30) savagery = 'calm';
      else if (savSample > 70) savagery = 'untamed';

      const evilSample = (savageryNoise.sample(x * 0.05 + 50, y * 0.05 + 50, 9.9) + 1.0) * 50;
      let evilness: WorldMapTile['evilness'] = 'neutral';
      if (evilSample < 28) evilness = 'good';
      else if (evilSample > 74) evilness = 'evil';

      // Biome determination based on authentic DF tables
      let biome: OverworldBiomeType = 'plains';
      if (elevation < 22) {
        biome = 'ocean';
      } else if (elevation >= 78) {
        // Very high peaks: check for volcano
        const volcanoCandidate = noise.sample(x * 0.3, y * 0.3, 14.5);
        if (volcanoCandidate > 0.65 && elevation > 84) {
          biome = 'volcano';
        } else {
          biome = 'mountain';
        }
      } else if (evilness === 'evil') {
        biome = 'haunted';
      } else if (temperature === 'freezing' || (temperature === 'cold' && elevation > 60)) {
        biome = 'tundra';
      } else if (temperature === 'cold' && rainfall > 40) {
        biome = 'taiga';
      } else if (rainfall > 65 && temperature === 'scorching') {
        biome = 'tropical_rainforest';
      } else if (rainfall > 50) {
        biome = 'temperate_forest';
      } else if (drainage < 25 && rainfall > 40) {
        biome = 'swamp';
      } else if (rainfall < 28 && (temperature === 'warm' || temperature === 'scorching')) {
        biome = 'badlands';
      } else {
        biome = 'plains';
      }

      // Mineral Richness
      let metals: WorldMapTile['metals'] = 'shallow';
      if (biome === 'mountain' || biome === 'volcano') metals = 'abundant';
      else if (biome === 'ocean') metals = 'none';
      else if (elevation > 45) metals = 'deep';

      // Local region name
      const pIdx = (x * 7 + y * 13 + seed) % REGION_PREFIX_UA.length;
      const nIdx = (x * 11 + y * 17 + seed) % REGION_NOUN_UA.length;
      const tileName = `${REGION_PREFIX_UA[pIdx]} ${REGION_NOUN_UA[nIdx]}`;

      tiles[y][x] = {
        x,
        y,
        name: tileName,
        biome,
        elevation,
        temperature,
        rainfall,
        drainage,
        savagery,
        evilness,
        hasRiver: false,
        metals,
        fluxStone: elevation > 40 && rainfall > 30,
        aquifer: (biome === 'plains' || biome === 'swamp') && elevation < 45,
        site: null,
        isCurrentEmbark: false
      };
    }
  }

  // 2. Continental Rivers flowing from mountain summits to oceans
  for (let r = 0; r < 14; r++) {
    // Find mountain starting spring
    let rx = (seed * (r + 1) * 7) % (sizeX - 10) + 5;
    let ry = (seed * (r + 1) * 13) % (sizeY - 10) + 5;

    // Search nearby for high elevation
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const nx = rx + dx;
        const ny = ry + dy;
        if (nx >= 0 && nx < sizeX && ny >= 0 && ny < sizeY) {
          if (tiles[ny][nx].elevation > tiles[ry][rx].elevation) {
            rx = nx;
            ry = ny;
          }
        }
      }
    }

    // Trace path downhill
    let steps = 0;
    while (steps < 45 && rx >= 0 && rx < sizeX && ry >= 0 && ry < sizeY) {
      tiles[ry][rx].hasRiver = true;
      if (tiles[ry][rx].biome === 'ocean') break;

      // Move to lowest neighbor
      let lowestElevation = tiles[ry][rx].elevation;
      let nextX = rx;
      let nextY = ry;

      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]];
      for (const [dx, dy] of dirs) {
        const nx = rx + dx;
        const ny = ry + dy;
        if (nx >= 0 && nx < sizeX && ny >= 0 && ny < sizeY) {
          if (tiles[ny][nx].elevation < lowestElevation) {
            lowestElevation = tiles[ny][nx].elevation;
            nextX = nx;
            nextY = ny;
          }
        }
      }

      if (nextX === rx && nextY === ry) {
        // Reached depression: make a lake / flow towards nearest ocean
        nextX = rx + (rx > sizeX / 2 ? 1 : -1);
        nextY = ry + (ry > sizeY / 2 ? 1 : -1);
      }
      rx = nextX;
      ry = nextY;
      steps++;
    }
  }

  // 3. Civilizations of the World (Authentic DF Entities)
  const civilizations: WorldCivilization[] = [
    {
      id: 'civ_dwarves_1',
      name: 'Ковальський Пакт Гірських Чертогів',
      race: 'dwarf',
      leader: 'Король Торін Залізне Серце',
      color: '#f59e0b',
      relation: 'allied',
      sitesCount: 4,
      capitalX: 0,
      capitalY: 0,
      descriptionEn: 'An ancient mountain kingdom of dwarven craftsdwarves, masters of metallurgy and deep delving.',
      descriptionUa: 'Стародавнє гірське королівство гномів, майстрів металургії, кам’яних чертогів та глибокого копання.'
    },
    {
      id: 'civ_elves_1',
      name: 'Шепіт Прадавнього Смарагдового Гаю',
      race: 'elf',
      leader: 'Деревознавець Леголан',
      color: '#10b981',
      relation: 'friendly',
      sitesCount: 3,
      capitalX: 0,
      capitalY: 0,
      descriptionEn: 'An isolationist elven collective dwelling in living wood canopies, suspicious of tree-felling.',
      descriptionUa: 'Громада лісових ельфів у живих кронах пралісу. Торгують рідкісними ягодами, суворо оберігають дерева.'
    },
    {
      id: 'civ_humans_1',
      name: 'Баронство Сонячних Долин та Річок',
      race: 'human',
      leader: 'Верховний Барон Вальдемар',
      color: '#3b82f6',
      relation: 'friendly',
      sitesCount: 5,
      capitalX: 0,
      capitalY: 0,
      descriptionEn: 'A sprawling feudal human alliance of towns, river mills, and agricultural trade leagues.',
      descriptionUa: 'Феодальне торгове баронство людей із укріпленими містами вздовж річок та широкими ланами.'
    },
    {
      id: 'civ_goblins_1',
      name: 'Орда Червоного Черепа та Мук',
      race: 'goblin',
      leader: 'Демонічний Володар Азгал Поглинач',
      color: '#ef4444',
      relation: 'at_war',
      sitesCount: 4,
      capitalX: 0,
      capitalY: 0,
      descriptionEn: 'Vicious goblin hordes dwelling in dark pits, seeking plunder, captive souls, and siege.',
      descriptionUa: 'Агресивна орда гоблінів із темних проваль, що загрожує постійними набігами та облогами.'
    },
    {
      id: 'civ_kobolds_1',
      name: 'Плем’я Зміїного Хвоста',
      race: 'kobold',
      leader: 'Шнир Шаман',
      color: '#8b5cf6',
      relation: 'neutral',
      sitesCount: 2,
      capitalX: 0,
      capitalY: 0,
      descriptionEn: 'Sneaky subterranean kobolds lurking in narrow caves, prone to stealthy thefts.',
      descriptionUa: 'Потайливі печерні кобольди, що риють нори і полюбляють красти блискучі самоцвіти.'
    }
  ];

  // 4. Distribute Sites across Biomes
  const siteTemplates = [
    // Dwarves
    { type: 'dwarf_mountainhall' as const, civIdx: 0, biomePref: 'mountain', namePrefix: 'Гірські Чертоги' },
    { type: 'dwarf_mountainhall' as const, civIdx: 0, biomePref: 'mountain', namePrefix: 'Глибока Кузня' },
    { type: 'dwarf_mountainhall' as const, civIdx: 0, biomePref: 'volcano', namePrefix: 'Базальтова Цитадель' },
    { type: 'fortress' as const, civIdx: 0, biomePref: 'mountain', namePrefix: 'Залізна Застава' },

    // Elves
    { type: 'elf_retreat' as const, civIdx: 1, biomePref: 'temperate_forest', namePrefix: 'Вічнозелена Обитель' },
    { type: 'elf_retreat' as const, civIdx: 1, biomePref: 'tropical_rainforest', namePrefix: 'Крона Шепоту' },
    { type: 'elf_retreat' as const, civIdx: 1, biomePref: 'taiga', namePrefix: 'Сосновий Прихисток' },

    // Humans
    { type: 'human_town' as const, civIdx: 2, biomePref: 'plains', namePrefix: 'Місто Золотого Колоса' },
    { type: 'human_town' as const, civIdx: 2, biomePref: 'plains', namePrefix: 'Річковий Форт' },
    { type: 'human_town' as const, civIdx: 2, biomePref: 'temperate_forest', namePrefix: 'Озерний Замок' },
    { type: 'human_town' as const, civIdx: 2, biomePref: 'badlands', namePrefix: 'Караванний Оазис' },

    // Goblins
    { type: 'goblin_pit' as const, civIdx: 3, biomePref: 'haunted', namePrefix: 'Провалля Кісток' },
    { type: 'goblin_pit' as const, civIdx: 3, biomePref: 'badlands', namePrefix: 'Шпиль Темряви' },
    { type: 'goblin_pit' as const, civIdx: 3, biomePref: 'volcano', namePrefix: 'Пекельна Жерловина' },

    // Necromancer & Kobolds
    { type: 'necromancer_tower' as const, civIdx: 3, biomePref: 'haunted', namePrefix: 'Обсидіанова Вежа Некроманта' },
    { type: 'kobold_cave' as const, civIdx: 4, biomePref: 'mountain', namePrefix: 'Нора Зміїного Хвоста' },
    { type: 'ruins' as const, civIdx: 2, biomePref: 'badlands', namePrefix: 'Руїни Забутої Династії' }
  ];

  let placedSites = 0;
  for (const st of siteTemplates) {
    let bestX = Math.floor(sizeX / 2);
    let bestY = Math.floor(sizeY / 2);
    let found = false;

    // Search for a suitable tile matching preference
    for (let attempts = 0; attempts < 60; attempts++) {
      const sx = (seed * 17 + placedSites * 31 + attempts * 13) % (sizeX - 6) + 3;
      const sy = (seed * 23 + placedSites * 29 + attempts * 19) % (sizeY - 6) + 3;
      const t = tiles[sy][sx];

      if (!t.site && t.biome !== 'ocean') {
        if (t.biome === st.biomePref || attempts > 35) {
          bestX = sx;
          bestY = sy;
          found = true;
          break;
        }
      }
    }

    if (found) {
      const civ = civilizations[st.civIdx];
      const site: WorldSite = {
        id: `site_${placedSites + 1}`,
        name: `${st.namePrefix} «${tiles[bestY][bestX].name}»`,
        type: st.type,
        civId: civ.id,
        civName: civ.name,
        population: 80 + (placedSites * 45) % 400,
        leader: st.type === 'necromancer_tower' ? 'Архінекромант Мортус' : `${civ.leader} (Намісник)`,
        isHostile: civ.relation === 'at_war' || st.type === 'necromancer_tower'
      };

      tiles[bestY][bestX].site = site;

      // Set capital coordinates if first site for this civ
      if (civ.capitalX === 0 && civ.capitalY === 0) {
        civ.capitalX = bestX;
        civ.capitalY = bestY;
      }

      placedSites++;
    }
  }

  // 5. Select Default Fortress Embark Point
  // Find a dramatic mountain or forest with rivers near the dwarven civilization
  let embarkX = Math.floor(sizeX / 2);
  let embarkY = Math.floor(sizeY / 2);
  let foundEmbark = false;

  for (let r = 0; r < 20; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const ex = Math.max(3, Math.min(sizeX - 4, embarkX + dx));
        const ey = Math.max(3, Math.min(sizeY - 4, embarkY + dy));
        const t = tiles[ey][ex];
        if (!t.site && (t.biome === 'mountain' || t.biome === 'temperate_forest') && t.hasRiver) {
          embarkX = ex;
          embarkY = ey;
          foundEmbark = true;
          break;
        }
      }
      if (foundEmbark) break;
    }
    if (foundEmbark) break;
  }

  tiles[embarkY][embarkX].isCurrentEmbark = true;

  // 6. World Legends & Chronicle Timeline (Authentic DF Legends Mode)
  const legends: WorldLegend[] = [
    {
      id: 'leg_1',
      year: 12,
      titleEn: 'Founding of the Mountain Halls',
      titleUa: 'Заснування Гірських Чертогів',
      textEn: 'In the Year 12, High King Durin struck the first iron anvil into Mount Granite, establishing the Dwarven Pact.',
      textUa: 'У 12 році Верховний Король Дурін вдарив у перше ковадло в горі Гранітній, заснувавши Ковальський Пакт.',
      type: 'founding'
    },
    {
      id: 'leg_2',
      year: 45,
      titleEn: 'The Slaying of the Bronze Colossus',
      titleUa: 'Перемога над Бронзовим Колосом',
      textEn: 'A gigantic Bronze Colossus emerged from the Badlands, ravaging three human hamlets before falling to dwarven obsidian ballistas.',
      textUa: 'Гігантський Бронзовий Колос вийшов із пустищ і розорив три людські селища, поки не був повалений гном’ячими обсидіановими балістами.',
      type: 'titan'
    },
    {
      id: 'leg_3',
      year: 78,
      titleEn: 'The War of Smoldering Pits',
      titleUa: 'Війна Тліючих Проваллів',
      textEn: 'The goblin horde of Azgal the Devourer besieged the Elven canopy. A legendary alliance of human pikemen and dwarven axemen broke the siege.',
      textUa: 'Орда гоблінів Азгала взяла в облогу ельфійські крони. Союз людських списоносців та гном’ячих сокирників зняв облогу у кривавій битві.',
      type: 'war'
    },
    {
      id: 'leg_4',
      year: 94,
      titleEn: 'Discovery of the Adamantine Spires',
      titleUa: 'Відкриття Адамантинових Шпилів',
      textEn: 'Deep miners in the Basalt Citadel pierced the Magma Sea, discovering glowing veins of divine light metal.',
      textUa: 'Глибинні шахтарі Базальтової Цитаделі пробили Магматичне Море і вперше торкнулися сяючих ниток адамантину.',
      type: 'artifact'
    },
    {
      id: 'leg_5',
      year: 105,
      titleEn: 'The Strike the Earth Expedition',
      titleUa: 'Експедиція «Удар у камінь»',
      textEn: `The Expedition of Seven set forth to establish the fortress at coordinates (${embarkX}, ${embarkY}) in ${tiles[embarkY][embarkX].name}.`,
      textUa: `Експедиція семи гномів вирушила заснувати нову фортецю у регіоні «${tiles[embarkY][embarkX].name}» на координатах (${embarkX}, ${embarkY}).`,
      type: 'founding'
    }
  ];

  return {
    sizeX,
    sizeY,
    seed,
    name: worldName,
    tiles,
    civilizations,
    legends,
    expeditions: [],
    currentEmbarkCoords: { x: embarkX, y: embarkY }
  };
}

export const BIOME_METADATA: Record<
  OverworldBiomeType,
  { nameUa: string; nameEn: string; color: string; descriptionUa: string }
> = {
  ocean: {
    nameUa: 'Океанські Глибини',
    nameEn: 'Ocean Deep',
    color: '#1e3a8a',
    descriptionUa: 'Безкраї солоні води з небезпечними морськими зміями та китами.'
  },
  mountain: {
    nameUa: 'Скелясті Гори',
    nameEn: 'Mountain Peaks',
    color: '#78716c',
    descriptionUa: 'Високі скелі, багаті залізними та золотими жилами, ідеальні для гномів.'
  },
  volcano: {
    nameUa: 'Діючий Вулкан',
    nameEn: 'Active Volcano',
    color: '#dc2626',
    descriptionUa: 'Вершина з природною кальдерою магми для безконечного кування зброї.'
  },
  temperate_forest: {
    nameUa: 'Помірний Ліс',
    nameEn: 'Temperate Forest',
    color: '#15803d',
    descriptionUa: 'Густі дубові та соснові хащі з дичиною та великою кількістю деревини.'
  },
  taiga: {
    nameUa: 'Морозна Тайга',
    nameEn: 'Boreal Taiga',
    color: '#065f46',
    descriptionUa: 'Холодний хвойний бір під снігом. Суворий клімат, але багатий хутром.'
  },
  tropical_rainforest: {
    nameUa: 'Тропічні Джунглі',
    nameEn: 'Tropical Rainforest',
    color: '#047857',
    descriptionUa: 'Вологі екваторіальні джунглі з отруйними тваринами та екзотичними деревами.'
  },
  badlands: {
    nameUa: 'Пустища & Каньйони',
    nameEn: 'Badlands & Canyons',
    color: '#b45309',
    descriptionUa: 'Сухі глиняні та піщані каньйони. Мало води, але відкриті скельні пласти.'
  },
  swamp: {
    nameUa: 'Гнилі Болота',
    nameEn: 'Murky Swamps',
    color: '#3f6212',
    descriptionUa: 'Трясовини з п’явками, очеретом та небезпечними болотними істотами.'
  },
  tundra: {
    nameUa: 'Вічна Мерзлота',
    nameEn: 'Frozen Tundra',
    color: '#94a3b8',
    descriptionUa: 'Крижана пустеля з вічним холодом, морозними вітрами і мамонтами.'
  },
  plains: {
    nameUa: 'Смарагдові Степи',
    nameEn: 'Lush Plains',
    color: '#65a30d',
    descriptionUa: 'Родючі пасовища з дикими кіньми та багатою травою для землеробства.'
  },
  haunted: {
    nameUa: 'Прокляті Землі',
    nameEn: 'Haunted Lands',
    color: '#581c87',
    descriptionUa: 'Зловісні тумани, кривавий дощ та повсталі мерці. Тільки для найсміливіших!'
  }
};

export function dispatchExpedition(
  overworld: OverworldState,
  type: 'trade' | 'raid' | 'scout',
  targetCoords: { x: number; y: number },
  targetSiteName: string,
  targetCivId: string | null = null,
  availableDwarves: string[] | number = 3
): OverworldState {
  const currentEmbark = overworld.currentEmbarkCoords || { x: 32, y: 32 };
  const dist = Math.max(
    8,
    Math.round(
      Math.hypot(targetCoords.x - currentEmbark.x, targetCoords.y - currentEmbark.y) * 4
    )
  );

  const dwarvesCount = typeof availableDwarves === 'number' ? availableDwarves : availableDwarves.length || 3;

  const newExp: WorldExpedition = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name:
      type === 'trade'
        ? 'Торговельний караван'
        : type === 'raid'
        ? 'Каральний загін'
        : 'Розвідувальний дозор',
    targetSiteName,
    targetX: targetCoords.x,
    targetY: targetCoords.y,
    type,
    status: 'marching',
    ticksTotal: dist,
    ticksRemaining: dist,
    dwarvesCount
  };

  return {
    ...overworld,
    expeditions: [...overworld.expeditions, newExp]
  };
}

export function regenerateOverworld(seed: number = Math.floor(Math.random() * 999999)): OverworldState {
  return generateOverworld(seed);
}

/**
 * Step World Expeditions (Caravans & Raids sent across the Overworld)
 */
export function stepOverworldExpeditions(
  overworld: OverworldState,
  dayOrTick: number,
  addEvent?: (event: Omit<FortressEvent, 'id'>) => void
): OverworldState {
  if (overworld.expeditions.length === 0) return overworld;

  const updatedExpeditions: WorldExpedition[] = [];

  for (const exp of overworld.expeditions) {
    const remaining = exp.ticksRemaining - 1;

    if (remaining <= 0) {
      // Expedition completed its cycle
      if (addEvent) {
        if (exp.type === 'trade') {
          addEvent({
            tick: dayOrTick,
            timeStr: `Expedition Return`,
            textEn: `Trade Expedition returned from ${exp.targetSiteName}! Brought back 400 dwarven currency in fine silks and masterwork kegs.`,
            textUa: `Торговельна експедиція успішно повернулася з «${exp.targetSiteName}»! Привезено коштовні шовки та бочки з рідкісними напоями на 400 монет.`,
            type: 'discovery'
          });
        } else if (exp.type === 'raid') {
          addEvent({
            tick: dayOrTick,
            timeStr: `Expedition Return`,
            textEn: `Military Squad triumphantly returned from raiding ${exp.targetSiteName}! Slew goblin marauders and seized masterwork armor.`,
            textUa: `Військовий загін із тріумфом повернувся з рейду на «${exp.targetSiteName}»! Знищено ворогів та захоплено майстерну бронзову броню й зброю!`,
            type: 'discovery'
          });
        } else {
          addEvent({
            tick: dayOrTick,
            timeStr: `Expedition Return`,
            textEn: `Scouts completed cartographic survey around ${exp.targetSiteName}. Deep mineral strata and cavern fissures charted!`,
            textUa: `Розвідники завершили топографічну зйомку навколо «${exp.targetSiteName}». Карта надр та підземних печер оновлена!`,
            type: 'announcement'
          });
        }
      }
    } else {
      let status = exp.status;
      const progress = 1.0 - remaining / exp.ticksTotal;
      if (progress < 0.45) status = 'marching';
      else if (progress < 0.65) status = 'engaging';
      else status = 'returning';

      updatedExpeditions.push({
        ...exp,
        ticksRemaining: remaining,
        status
      });
    }
  }

  return {
    ...overworld,
    expeditions: updatedExpeditions
  };
}
