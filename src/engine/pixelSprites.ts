/**
 * High-Definition 2D Pixel Art Sprite Engine & Texture Atlas for Dwarf Fortress
 * Handcrafted pixel-perfect matrices, authentic palettes, and procedural rasterization.
 */

// Color Palettes (Authentic DawnBringer / Dwarf Fortress 32-color palette)
export const PALETTE = {
  trans: 'transparent',
  black: '#0a0908',
  dark_slate: '#1e293b',
  slate: '#334155',
  light_slate: '#64748b',
  white: '#f8fafc',

  // Rock & Stone
  stone_dark: '#1c1917',
  stone_shadow: '#292524',
  stone_mid: '#44403c',
  stone_light: '#78716c',
  stone_high: '#a8a29e',

  // Granite
  granite_shadow: '#1e293b',
  granite_mid: '#334155',
  granite_light: '#64748b',
  granite_high: '#94a3b8',

  // Marble
  marble_shadow: '#64748b',
  marble_mid: '#94a3b8',
  marble_light: '#cbd5e1',
  marble_high: '#ffffff',

  // Obsidian
  obsidian_shadow: '#05040a',
  obsidian_mid: '#151324',
  obsidian_light: '#282542',
  obsidian_high: '#4d4775',

  // Ores
  iron_mid: '#c2410c',
  iron_light: '#ea580c',
  iron_high: '#fdba74',
  gold_shadow: '#78350f',
  gold_mid: '#d97706',
  gold_light: '#fbbf24',
  gold_high: '#fef08a',
  copper_mid: '#0891b2',
  copper_light: '#06b6d4',
  coal_mid: '#0f172a',
  coal_light: '#334155',
  gem_mid: '#0284c7',
  gem_light: '#38bdf8',
  gem_high: '#e0f2fe',
  adamantine_mid: '#0e7490',
  adamantine_light: '#22d3ee',
  adamantine_glow: '#a5f3fc',

  // Dirt & Wood (Pilgrimage Earth & Timber)
  dirt_dark: '#2d1f14',
  dirt_mid: '#5c4125',
  dirt_light: '#916d42',
  wood_dark: '#301b0c',
  wood_mid: '#5e371b',
  wood_light: '#965e31',
  wood_high: '#c99b65',

  // Vegetation (Pilgrimage Deep Moss & Meadow Greens)
  grass_dark: '#2c3a1e',
  grass_mid: '#4b5f30',
  grass_light: '#728847',
  grass_high: '#95ad5d',
  flower_yellow: '#eab308',
  flower_red: '#e11d48',

  // Water (Pilgrimage River Cobalt)
  water_deep: '#1b344d',
  water_mid: '#2d5378',
  water_light: '#4b7ea8',
  water_foam: '#cbe0f0',

  // Dwarf Flesh & Hair
  skin_shadow: '#fca5a5',
  skin_mid: '#fed7aa',
  skin_high: '#ffedd5',
  beard_auburn_dark: '#78350f',
  beard_auburn: '#b45309',
  beard_auburn_light: '#d97706',
  beard_gold_dark: '#92400e',
  beard_gold: '#d97706',
  beard_gold_light: '#f59e0b',
  beard_silver_dark: '#475569',
  beard_silver: '#94a3b8',
  beard_silver_light: '#cbd5e1',

  // Steel & Armor
  steel_dark: '#1e293b',
  steel_mid: '#475569',
  steel_light: '#94a3b8',
  steel_high: '#f1f5f9',

  // Cloth & Royal
  royal_blue: '#1d4ed8',
  crimson_red: '#b91c1c',
  emerald_green: '#047857',
  purple_cloak: '#6b21a8'
};

// Offscreen Canvas cache
const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Creates an offscreen Canvas from a pixel matrix string
 */
export function buildPixelSprite(
  matrix: string[],
  paletteMap: Record<string, string>,
  targetSize: number = 28
): HTMLCanvasElement {
  const h = matrix.length;
  const w = matrix[0].length;

  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;

  const cellW = targetSize / w;
  const cellH = targetSize / h;

  for (let r = 0; r < h; r++) {
    const row = matrix[r];
    for (let c = 0; c < w; c++) {
      const char = row[c];
      const color = paletteMap[char];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        // Use exact crisp pixel rects
        ctx.fillRect(
          Math.floor(c * cellW),
          Math.floor(r * cellH),
          Math.ceil(cellW),
          Math.ceil(cellH)
        );
      }
    }
  }

  return canvas;
}

// ============================================================================
// 1. TERRAIN & WALL PIXEL ART MATRICES (14x14 grid scaled to 28x28)
// ============================================================================

// Solid Stone Cliff Wall (Center with natural strata and bevels)
const MATRIX_STONE_WALL = [
  "HHHHHHHHHHHHHH",
  "HLLLLLLLLLLLLH",
  "HLMMMMMMMMMMMS",
  "HLMMSSMMMMDMMS",
  "HLMSSSSMDDMMMS",
  "HLMMSMMMMMMDMS",
  "HLMMMMMMMMMMMS",
  "HLMDMMMMSSMMMS",
  "HLMMDMMSSSSMMS",
  "HSSDDDDDDDDDDS",
  "DDDDDDDDDDDDDD",
  "DMMMMMMMMMMMMD",
  "DMMDMMMDMMMDMD",
  "DDDDDDDDDDDDDD"
];

// Exposed South Cliff Face (with 3D depth vertical drop facade)
const MATRIX_STONE_CLIFF_SOUTH = [
  "HHHHHHHHHHHHHH",
  "HLLLLLLLLLLLLH",
  "HLMMMMMMMMMMMS",
  "HLMMSSMMDMMMMS",
  "HLMMMMMMMMMMMS",
  "HSSSSSSSSSSSSS",
  "DDDDDDDDDDDDDD",
  "DMMMMMMMMMMMMD",
  "DMMSMMMMDMMMMS",
  "DMMSSMMDDMMMMS",
  "DMMMSMMMDMMMMS",
  "DMMMMMMMMMMMMD",
  "DDDDDDDDDDDDDD",
  "SSSSSSSSSSSSSS"
];

// Carved Stone Floor (Smooth flagstones with chiseled joints)
const MATRIX_STONE_FLOOR = [
  "LLLLLLLSLLLLLL",
  "LMMMMMSLMMMMMM",
  "LMMMDMSLMDMMMM",
  "LMMMMMSLMMDMMM",
  "LMMMMMSLMMMMMM",
  "SSSSSSSSSSSSSS",
  "LLLLLLLSLLLLLL",
  "LMMMMMSLMMMMMM",
  "LMDMMMSLMMMDMM",
  "LMMMMMSLMMMMMM",
  "SSSSSSSSSSSSSS",
  "LLLLLLLSLLLLLL",
  "LMMMMMSLMMMMMM",
  "SSSSSSSSSSSSSS"
];

// Engraved Stone Floor with Golden Runic Motifs
const MATRIX_ENGRAVED_FLOOR = [
  "LLLLLLLLLLLLLL",
  "LGGGGGGGGGGGGL",
  "LGMMMMGGMMMMGL",
  "LGMMGGGGGGMMGL",
  "LGMMGMMMMGMMGL",
  "LGGGGMMMMGGGGL",
  "LGGGGMMMMGGGGL",
  "LGMMGMMMMGMMGL",
  "LGMMGGGGGGMMGL",
  "LGMMMMGGMMMMGL",
  "LGGGGGGGGGGGGL",
  "LLLLLLLLLLLLLL",
  "LMMMMMMMMMMMML",
  "SSSSSSSSSSSSSS"
];

// Lush Meadow Grass with Flowers
const MATRIX_GRASS = [
  "DDDDDDDDDDDDDD",
  "DMMMMMMMMMMMMD",
  "DMLMMLMMMLMMMD",
  "DMMHHMMMLMMMMD",
  "DMMLMMMLHHMMMD",
  "DMMMMFYMLMMMMD",
  "DMMMMMMMMMMMMD",
  "DMLMMMLMMMLMMD",
  "DMHHMMMLMHHMMD",
  "DMLMMMMMLMMMMD",
  "DMMMMMMMFBMMMD",
  "DMMMMMMMMMMMMD",
  "DMMMLMMMMMLMMD",
  "DDDDDDDDDDDDDD"
];

// Subterranean Animated Water (Frame 1)
const MATRIX_WATER_1 = [
  "DDDDDDDDDDDDDD",
  "DMMMMMMMMMMMMD",
  "DMLLLLLLLLMMMD",
  "DMLHHHHHLLMMMD",
  "DMMLLLLLLLMMMD",
  "DMMMMMMMMMMMMD",
  "DMMMMMMMMMMMMD",
  "DMMMMLLLLLLLLD",
  "DMMMLHHHHHLLLD",
  "DMMMMLLLLLLLLD",
  "DMMMMMMMMMMMMD",
  "DMLLLLMMMMMMMD",
  "DMLHHLLMMMMMMD",
  "DDDDDDDDDDDDDD"
];

// Subterranean Animated Water (Frame 2 - wave shifted)
const MATRIX_WATER_2 = [
  "DDDDDDDDDDDDDD",
  "DMMMMMMMMMMMMD",
  "DMMMMMLLLLLLLD",
  "DMMMMMLHHHHHLD",
  "DMMMMMLLLLLLLD",
  "DMMMMMMMMMMMMD",
  "DMLLLLLLLLMMMD",
  "DMLHHHHHLLMMMD",
  "DMMLLLLLLLMMMD",
  "DMMMMMMMMMMMMD",
  "DMMMMMMMMMMMMD",
  "DMMLLLLLLMMMMD",
  "DMLHHHHLLMMMMD",
  "DDDDDDDDDDDDDD"
];

// Constructed Ashlar Wall
const MATRIX_WALL_CONSTRUCTED = [
  "HHHHHHHHHHHHHH",
  "HLMMMSHLMMMSHL",
  "HLMMMSHLMMMSHL",
  "HSSSSSHSSSSSHS",
  "HLMSHLMMMSHLMS",
  "HLMSHLMMMSHLMS",
  "HSSHSSSSSHSSHS",
  "HLMMMSHLMMMSHL",
  "HLMMMSHLMMMSHL",
  "HSSSSSHSSSSSHS",
  "HLMSHLMMMSHLMS",
  "HLMSHLMMMSHLMS",
  "HSSHSSSSSHSSHS",
  "SSSSSSSSSSSSSS"
];

// Banded Wooden Door
const MATRIX_DOOR = [
  "SSSSSSSSSSSSSS",
  "SHHHHHHHHHHHHS",
  "SHWWMWWMWWWWHS",
  "SHWWMWWMWWWWHS",
  "SHIIIIIIIIIIHS",
  "SHWWMWWMWWWWHS",
  "SHWWMWWKWWWWHS",
  "SHWWMWWMWWWWHS",
  "SHIIIIIIIIIIHS",
  "SHWWMWWMWWWWHS",
  "SHWWMWWMWWWWHS",
  "SHWWMWWMWWWWHS",
  "SHHHHHHHHHHHHS",
  "SSSSSSSSSSSSSS"
];

// Dwarven Bed
const MATRIX_BED = [
  "..............",
  "..FFFFFFFF....",
  "..FPPPPPPF....",
  "..FPPPPPPF....",
  "..FBBBBBBF....",
  "..FBBBBBBF....",
  "..FBBBBBBF....",
  "..FBBBBBBF....",
  "..FBBBBBBF....",
  "..FBBBBBBF....",
  "..FBBBBBBF....",
  "..FFFFFFFF....",
  "..FF....FF....",
  ".............."
];

// Brewery Still Workshop (Copper kettle, pipe, froth)
const MATRIX_STILL = [
  "..............",
  ".....PPPP.....",
  ".....P..P.....",
  "...CCCCCCC....",
  "..CCCCCCCCC...",
  ".CCCCCCCCCCC..",
  ".CCCFCCCFFCC..",
  ".CCCCCCCCCCC..",
  ".CCCCCCCCCCC..",
  "..CCCCCCCCC...",
  "...CCCCCCC....",
  "..BB.....BB...",
  "..BB.....BB...",
  ".............."
];

// ============================================================================
// 2. CHARACTER & CREATURE SPRITE MATRICES (14x14 grid)
// ============================================================================

// Dwarf Miner (Standing with horned helmet, pickaxe & braided beard)
const MATRIX_DWARF_MINER = [
  ".....IIII.....",
  "....IIHHII....",
  "....IISSII....",
  "....SSSSSS....",
  "....S.EE.S....",
  "....BBBBBB....",
  "....BBBBBB....",
  "....BBGGBB....",
  "...TTAAAATT...",
  "...TTALLATT.P.",
  "...TTABBATT.PP",
  "....LLMMLL..PP",
  "....LL..LL....",
  "....FF..FF...."
];

// Dwarf Miner (Walking / Mining swing frame)
const MATRIX_DWARF_MINER_SWING = [
  ".....IIII...PP",
  "....IIHHII.PP.",
  "....IISSII..P.",
  "....SSSSSS....",
  "....S.EE.S....",
  "....BBBBBB....",
  "....BBBBBB....",
  "....BBGGBB....",
  "...TTAAAATT...",
  "...TTALLATT...",
  "...TTABBATT...",
  "....LLMMLL....",
  "...FF....FF...",
  ".............."
];

// Dwarf Brewer (With foaming mug of ale & apron)
const MATRIX_DWARF_BREWER = [
  ".....IIII.....",
  "....IIHHII....",
  "....SSSSSS....",
  "....S.EE.S....",
  "....BBBBBB....",
  "....BBBBBB....",
  "....BBGGBB.FFF",
  "...TTAAAAT.FMM",
  "...TTAAAAT.FMM",
  "...TTAAAAT.FFF",
  "....LL..LL....",
  "....FF..FF....",
  "..............",
  ".............."
];

// Armored War Dog (Mastiff with spiked brass collar)
const MATRIX_WAR_DOG = [
  "..............",
  ".........DD...",
  "........DDDD..",
  ".......DDEDD..",
  ".......CCCDD..",
  "...DDDDDDCDD..",
  "..DDDDDDDDD...",
  ".DDDDDDDDDD...",
  ".DDDDDDDDDD...",
  "..DDDDDDDD....",
  "..LL.LL.LL....",
  "..FF.FF.FF....",
  "..............",
  ".............."
];

// Goblin Scout (Green skin, horned skullcap, scimitar)
const MATRIX_GOBLIN = [
  "....HHHH......",
  "...HHHHHH.....",
  "...GGGGGG.....",
  "...G.RR.G..SS.",
  "...GGGGGG.SSS.",
  "....GGGG...SS.",
  "...AAAAAA..SS.",
  "...AALLAA..SS.",
  "...AAAAAA..SS.",
  "....LLLL...SS.",
  "....LLLL......",
  "...FF..FF.....",
  "..............",
  ".............."
];

// Giant Cave Spider (8 Jointed legs, glossy abdomen, red eyes)
const MATRIX_SPIDER = [
  "L............L",
  ".L...SSSS...L.",
  "..L.SSSSSS.L..",
  "...LSSRRSSLL..",
  "..LLSSSSSSLL..",
  ".L..SSSSSS..L.",
  "L....SSSS....L",
  "L....SSSS....L",
  ".L...SSSS...L.",
  "..L..SSSS..L..",
  "...L.SSSS.L...",
  "....L.SS.L....",
  "..............",
  ".............."
];

// Item: Wooden Barrel with Black Iron Bands & Foaming Ale
const MATRIX_BARREL = [
  "..............",
  "....WWWWWW....",
  "...WIIIIIIW...",
  "..WWWWWWWWWW..",
  "..WIIIIIIIIW..",
  ".WWWWWWWWWWWW.",
  ".WWWWWWWWWWWW.",
  ".WIIIIIIIIIIW.",
  ".WWWWWWWWWWWW.",
  "..WIIIIIIIIW..",
  "..WWWWWWWWWW..",
  "...WIIIIIIW...",
  "....WWWWWW....",
  ".............."
];

// Item: Raw Gem / Sparkling Ore Nugget
const MATRIX_GEM = [
  "..............",
  "......HH......",
  ".....HLLH.....",
  "....HLMMLL....",
  "...HLMMMMLL...",
  "..HLMMMMMMLL..",
  "..HLMMWWMMLL..",
  "...HLMWWMMLL..",
  "....HLMMMLL...",
  ".....HLMLL....",
  "......HLL.....",
  ".......HH.....",
  "..............",
  ".............."
];

// Item: Plump Helmet Mushroom
const MATRIX_MUSHROOM = [
  "..............",
  "....PPPPPP....",
  "...PWPWWPPW...",
  "..PPPPPPPPPP..",
  ".PWWPPPPWWPPP.",
  ".PPPPPPPPPPPP.",
  "..PPPPPPPPPP..",
  "....SSSSSS....",
  "....SSSSSS....",
  "....SSSSSS....",
  "....SSSSSS....",
  "...SSSSSSSS...",
  "..............",
  ".............."
];

// ============================================================================
// SPRITE GENERATOR & CACHE LOADER
// ============================================================================

/**
 * Initializes and caches all pixel-art sprite canvases
 */
export function getPixelSprite(name: string, variant: string = 'default'): HTMLCanvasElement {
  const cacheKey = `${name}_${variant}`;
  if (spriteCache.has(cacheKey)) {
    return spriteCache.get(cacheKey)!;
  }

  let canvas: HTMLCanvasElement;

  switch (name) {
    // 1. TERRAIN & WALLS
    case 'stone_wall':
      canvas = buildPixelSprite(MATRIX_STONE_WALL, {
        H: PALETTE.stone_high,
        L: PALETTE.stone_light,
        M: PALETTE.stone_mid,
        S: PALETTE.stone_shadow,
        D: PALETTE.stone_dark
      });
      break;

    case 'stone_cliff_south':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.stone_high,
        L: PALETTE.stone_light,
        M: PALETTE.stone_mid,
        S: PALETTE.stone_shadow,
        D: PALETTE.stone_dark
      });
      break;

    case 'granite_wall':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.granite_high,
        L: PALETTE.granite_light,
        M: PALETTE.granite_mid,
        S: PALETTE.granite_shadow,
        D: PALETTE.black
      });
      break;

    case 'marble_wall':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.marble_high,
        L: PALETTE.marble_light,
        M: PALETTE.marble_mid,
        S: PALETTE.marble_shadow,
        D: PALETTE.stone_dark
      });
      break;

    case 'obsidian_wall':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.obsidian_high,
        L: PALETTE.obsidian_light,
        M: PALETTE.obsidian_mid,
        S: PALETTE.obsidian_shadow,
        D: PALETTE.black
      });
      break;

    case 'ore_iron_wall':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.iron_high,
        L: PALETTE.iron_light,
        M: PALETTE.iron_mid,
        S: PALETTE.stone_shadow,
        D: PALETTE.stone_dark
      });
      break;

    case 'ore_gold_wall':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.gold_high,
        L: PALETTE.gold_light,
        M: PALETTE.gold_mid,
        S: PALETTE.gold_shadow,
        D: PALETTE.stone_dark
      });
      break;

    case 'adamantine_wall':
      canvas = buildPixelSprite(MATRIX_STONE_CLIFF_SOUTH, {
        H: PALETTE.adamantine_glow,
        L: PALETTE.adamantine_light,
        M: PALETTE.adamantine_mid,
        S: PALETTE.obsidian_shadow,
        D: PALETTE.black
      });
      break;

    case 'floor_stone':
      canvas = buildPixelSprite(MATRIX_STONE_FLOOR, {
        L: PALETTE.stone_mid,
        M: PALETTE.stone_shadow,
        D: PALETTE.stone_dark,
        S: PALETTE.black
      });
      break;

    case 'floor_engraved':
      canvas = buildPixelSprite(MATRIX_ENGRAVED_FLOOR, {
        L: PALETTE.stone_mid,
        M: PALETTE.stone_shadow,
        G: PALETTE.gold_light,
        S: PALETTE.black
      });
      break;

    case 'grass':
      canvas = buildPixelSprite(MATRIX_GRASS, {
        H: PALETTE.grass_high,
        L: PALETTE.grass_light,
        M: PALETTE.grass_mid,
        D: PALETTE.grass_dark,
        FY: PALETTE.flower_yellow,
        FB: PALETTE.flower_red
      });
      break;

    case 'water_1':
      canvas = buildPixelSprite(MATRIX_WATER_1, {
        H: PALETTE.water_foam,
        L: PALETTE.water_light,
        M: PALETTE.water_mid,
        D: PALETTE.water_deep
      });
      break;

    case 'water_2':
      canvas = buildPixelSprite(MATRIX_WATER_2, {
        H: PALETTE.water_foam,
        L: PALETTE.water_light,
        M: PALETTE.water_mid,
        D: PALETTE.water_deep
      });
      break;

    case 'wall_constructed':
      canvas = buildPixelSprite(MATRIX_WALL_CONSTRUCTED, {
        H: PALETTE.steel_high,
        L: PALETTE.steel_light,
        M: PALETTE.steel_mid,
        S: PALETTE.steel_dark
      });
      break;

    case 'door':
      canvas = buildPixelSprite(MATRIX_DOOR, {
        S: PALETTE.stone_dark,
        H: PALETTE.wood_high,
        W: PALETTE.wood_mid,
        M: PALETTE.wood_dark,
        I: PALETTE.black,
        K: PALETTE.gold_light
      });
      break;

    case 'bed':
      canvas = buildPixelSprite(MATRIX_BED, {
        F: PALETTE.wood_dark,
        P: PALETTE.white,
        B: PALETTE.royal_blue,
        '.': PALETTE.trans
      });
      break;

    case 'workshop_still':
      canvas = buildPixelSprite(MATRIX_STILL, {
        P: PALETTE.gold_mid,
        C: PALETTE.iron_light,
        F: PALETTE.gold_high,
        B: PALETTE.wood_dark,
        '.': PALETTE.trans
      });
      break;

    // 2. DWARF SPRITES
    case 'dwarf_miner':
    case 'dwarf_standing': {
      let bDark = PALETTE.beard_auburn_dark;
      let bMid = PALETTE.beard_auburn;
      let bLight = PALETTE.beard_auburn_light;

      if (variant === 'gold') {
        bDark = PALETTE.beard_gold_dark;
        bMid = PALETTE.beard_gold;
        bLight = PALETTE.beard_gold_light;
      } else if (variant === 'silver') {
        bDark = PALETTE.beard_silver_dark;
        bMid = PALETTE.beard_silver;
        bLight = PALETTE.beard_silver_light;
      }

      canvas = buildPixelSprite(MATRIX_DWARF_MINER, {
        I: PALETTE.steel_dark,
        H: PALETTE.steel_high,
        S: PALETTE.skin_mid,
        E: PALETTE.black,
        B: bMid,
        G: PALETTE.gold_light,
        T: PALETTE.royal_blue,
        A: PALETTE.wood_dark,
        L: PALETTE.steel_mid,
        M: PALETTE.gold_light,
        F: PALETTE.black,
        P: PALETTE.steel_light,
        '.': PALETTE.trans
      });
      break;
    }

    case 'dwarf_miner_swing': {
      canvas = buildPixelSprite(MATRIX_DWARF_MINER_SWING, {
        I: PALETTE.steel_dark,
        H: PALETTE.steel_high,
        S: PALETTE.skin_mid,
        E: PALETTE.black,
        B: PALETTE.beard_auburn,
        G: PALETTE.gold_light,
        T: PALETTE.royal_blue,
        A: PALETTE.wood_dark,
        L: PALETTE.steel_mid,
        M: PALETTE.gold_light,
        F: PALETTE.black,
        P: PALETTE.steel_light,
        '.': PALETTE.trans
      });
      break;
    }

    case 'dwarf_brewer': {
      canvas = buildPixelSprite(MATRIX_DWARF_BREWER, {
        I: PALETTE.wood_dark,
        H: PALETTE.wood_high,
        S: PALETTE.skin_mid,
        E: PALETTE.black,
        B: PALETTE.beard_gold,
        G: PALETTE.gold_light,
        T: PALETTE.crimson_red,
        A: PALETTE.white, // Apron
        L: PALETTE.steel_mid,
        F: PALETTE.black,
        M: PALETTE.gold_high, // Froth
        '.': PALETTE.trans
      });
      break;
    }

    // 3. CREATURES
    case 'creature_war_dog':
      canvas = buildPixelSprite(MATRIX_WAR_DOG, {
        D: PALETTE.dirt_light,
        E: PALETTE.black,
        C: PALETTE.crimson_red,
        L: PALETTE.dirt_mid,
        F: PALETTE.black,
        '.': PALETTE.trans
      });
      break;

    case 'creature_goblin':
      canvas = buildPixelSprite(MATRIX_GOBLIN, {
        H: PALETTE.steel_dark,
        G: PALETTE.grass_mid,
        R: PALETTE.crimson_red,
        A: PALETTE.steel_mid,
        L: PALETTE.steel_dark,
        S: PALETTE.steel_high,
        F: PALETTE.black,
        '.': PALETTE.trans
      });
      break;

    case 'creature_spider':
      canvas = buildPixelSprite(MATRIX_SPIDER, {
        S: PALETTE.black,
        R: PALETTE.crimson_red,
        L: PALETTE.light_slate,
        '.': PALETTE.trans
      });
      break;

    // 4. ITEMS
    case 'item_barrel':
      canvas = buildPixelSprite(MATRIX_BARREL, {
        W: PALETTE.wood_mid,
        I: PALETTE.black,
        '.': PALETTE.trans
      });
      break;

    case 'item_gem':
      canvas = buildPixelSprite(MATRIX_GEM, {
        H: PALETTE.gem_high,
        L: PALETTE.gem_light,
        M: PALETTE.gem_mid,
        W: PALETTE.white,
        '.': PALETTE.trans
      });
      break;

    case 'item_mushroom':
      canvas = buildPixelSprite(MATRIX_MUSHROOM, {
        P: PALETTE.purple_cloak,
        W: PALETTE.white,
        S: PALETTE.skin_high,
        '.': PALETTE.trans
      });
      break;

    default:
      canvas = buildPixelSprite(MATRIX_STONE_WALL, {
        H: PALETTE.stone_high,
        L: PALETTE.stone_light,
        M: PALETTE.stone_mid,
        S: PALETTE.stone_shadow,
        D: PALETTE.stone_dark
      });
  }

  spriteCache.set(cacheKey, canvas);
  return canvas;
}

// ============================================================================
// 3. PROCEDURAL 64x64 PIXEL ART DWARF PORTRAIT GENERATOR
// ============================================================================

export function generateDwarfPortrait(
  dwarfName: string,
  title: string,
  gender: string,
  mood: string
): string {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;

  // Background Stone Frame
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, size, size);

  // Inner portrait vignette
  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, 30);
  grad.addColorStop(0, '#2e2823');
  grad.addColorStop(1, '#141210');
  ctx.fillStyle = grad;
  ctx.fillRect(4, 4, size - 8, size - 8);

  // Border Filigree
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, size - 6, size - 6);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  ctx.strokeRect(5, 5, size - 10, size - 10);

  // Character Base Coordinates (scale = 4 per pixel unit)
  const u = 4;
  const cx = 32;

  // Armor / Tunics
  ctx.fillStyle = title === 'Brewer' ? '#b91c1c' : title === 'Mason' ? '#334155' : '#1d4ed8';
  ctx.fillRect(cx - 3 * u, 10 * u, 6 * u, 5 * u);

  // Dwarf Face
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(cx - 3 * u, 5 * u, 6 * u, 4 * u);

  // Eyes & Eyebrows
  ctx.fillStyle = '#451a03';
  ctx.fillRect(cx - 3 * u, 4.5 * u, 6 * u, u * 0.8); // Eyebrows
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(cx - 2 * u, 6 * u, u * 0.9, u * 0.9); // Left eye
  ctx.fillRect(cx + u, 6 * u, u * 0.9, u * 0.9); // Right eye

  // Rosy Nose
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(cx - 0.7 * u, 6.5 * u, 1.4 * u, 1.2 * u);

  // Magnificent Beard
  let beardColor = '#d97706';
  let ringColor = '#fbbf24';
  if (dwarfName.includes('Iron') || title === 'Manager') {
    beardColor = '#cbd5e1';
    ringColor = '#f59e0b';
  } else if (dwarfName.includes('Gold') || title === 'Brewer') {
    beardColor = '#f59e0b';
    ringColor = '#ef4444';
  } else if (gender === 'female') {
    beardColor = '#92400e';
  }

  // Beard Body
  ctx.fillStyle = beardColor;
  ctx.fillRect(cx - 3.5 * u, 8 * u, 7 * u, 6 * u);
  // Forked braided ends
  ctx.fillRect(cx - 3 * u, 14 * u, 2 * u, 2 * u);
  ctx.fillRect(cx + u, 14 * u, 2 * u, 2 * u);

  // Gold Beard Rings
  ctx.fillStyle = ringColor;
  ctx.fillRect(cx - 3 * u, 13 * u, 2 * u, 0.8 * u);
  ctx.fillRect(cx + u, 13 * u, 2 * u, 0.8 * u);

  // Sturdy Steel Horned Helmet
  ctx.fillStyle = '#475569';
  ctx.fillRect(cx - 3.5 * u, 2 * u, 7 * u, 3 * u);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(cx - 4 * u, 4.5 * u, 8 * u, u); // Brow rim
  // Horns
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(cx - 4.5 * u, u, u, 2 * u);
  ctx.fillRect(cx + 3.5 * u, u, u, 2 * u);

  // Mood Badge in bottom corner
  ctx.fillStyle = mood === 'ecstatic' ? '#22c55e' : mood === 'fine' ? '#38bdf8' : '#f59e0b';
  ctx.beginPath();
  ctx.arc(size - 10, size - 10, 4, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL();
}
