/**
 * Mastercrafted 2D Pixel Art & Autotiling Graphical Engine for Dwarf Fortress
 * Inspired by Dwarf Fortress Steam Edition, RimWorld, and classic indie simulation art.
 * Features:
 * - 4-way and 8-way autotiling for seamless mountain rock, walls, and cliffs
 * - Directional ambient occlusion & drop shadows for true 2.5D architectural depth
 * - Fluid animated water caustics with shoreline foam
 * - Organic grass with varied blade tufts, wildflowers, and terrain blending
 * - High-detail dwarven sprites with directional facing, swinging tools, braided beards, and animated tasks
 * - Handcrafted pixel art for workshops, furniture, ores, items, and creatures
 */

import { Tile, DwarfEntity, CreatureEntity, WorldItem, DesignationType } from '../types/simulation';
import { getPixelSprite } from './pixelSprites';

export const TILE_SIZE = 28;

// Deterministic hash function for organic per-tile variations
function hash(x: number, y: number, seed: number = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 982451653) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function rand(x: number, y: number, seed: number = 0): number {
  return (hash(x, y, seed) % 10000) / 10000;
}

export function isSolid(tile?: Tile): boolean {
  if (!tile) return false;
  return [
    'stone',
    'granite',
    'marble',
    'obsidian',
    'slade',
    'ore_iron',
    'ore_gold',
    'ore_copper',
    'ore_coal',
    'ore_gem',
    'adamantine',
    'wall_constructed',
    'tree_trunk',
    'fungal_tree'
  ].includes(tile.material);
}

export function isRock(tile?: Tile): boolean {
  if (!tile) return false;
  return [
    'stone',
    'granite',
    'marble',
    'obsidian',
    'slade',
    'ore_iron',
    'ore_gold',
    'ore_copper',
    'ore_coal',
    'ore_gem',
    'adamantine'
  ].includes(tile.material);
}

/**
 * Main function to draw a graphical tile with Dwarf Fortress Steam aesthetics & autotiling
 */
export function drawSteamTile(
  ctx: CanvasRenderingContext2D,
  tile: Tile,
  x: number,
  y: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile; northWest?: Tile; northEast?: Tile; southWest?: Tile; southEast?: Tile },
  tick: number
) {
  const px = x;
  const py = y;
  const tx = tile.x;
  const ty = tile.y;

  // 1. AIR / SKY / CHASM (Transparent in multi-Z rendering)
  if (tile.material === 'air') {
    return;
  }

  // 2. EXCAVATED FLOORS (Stone, Dirt, Wood, Engraved)
  if (tile.material === 'floor_stone' || tile.material === 'floor_engraved') {
    drawStoneFloorTile(ctx, px, py, tx, ty, tile.material === 'floor_engraved', neighbors);
    return;
  }
  if (tile.material === 'floor_dirt') {
    drawDirtFloorTile(ctx, px, py, tx, ty, neighbors);
    return;
  }
  if (tile.material === 'floor_wood') {
    drawWoodFloorTile(ctx, px, py, tx, ty, neighbors);
    return;
  }

  // 3. ANIMATED WATER (Caustics, ripples, shoreline foam)
  if (tile.material === 'water') {
    drawWaterTile(ctx, px, py, tx, ty, neighbors, tick);
    return;
  }

  // 3b. THE MAGMA SEA (Molten bubbling lava with heat distortion)
  if (tile.material === 'magma') {
    drawMagmaTile(ctx, px, py, tx, ty, neighbors, tick);
    return;
  }

  // 4. SURFACE GRASS & FLORA
  if (tile.material === 'grass') {
    drawGrassTile(ctx, px, py, tx, ty, neighbors);
    return;
  }

  // 4b. SUBTERRANEAN BIOLUMINESCENT CAVE MOSS
  if (tile.material === 'cave_moss') {
    drawCaveMossTile(ctx, px, py, tx, ty, neighbors, tick);
    return;
  }

  // 4c. GIANT FUNGAL SPORE TREES
  if (tile.material === 'fungal_tree') {
    drawFungalTreeTile(ctx, px, py, tx, ty, tick);
    return;
  }

  // 5. NATURAL SOIL & SAND
  if (tile.material === 'soil' || tile.material === 'sand') {
    drawSoilTile(ctx, px, py, tx, ty, tile.material === 'sand', neighbors);
    return;
  }

  // 6. NATURAL ROCK WALLS & ORE VEINS (Autotiled seamless mountain rock)
  if (isRock(tile)) {
    drawAutotiledRockWall(ctx, px, py, tx, ty, tile, neighbors);
    return;
  }

  // 7. TREES
  if (tile.material === 'tree_trunk') {
    drawTreeTrunk(ctx, px, py, tx, ty);
    return;
  }
  if (tile.material === 'tree_foliage') {
    drawTreeFoliage(ctx, px, py, tx, ty);
    return;
  }

  // 8. CONSTRUCTED ARCHITECTURE & FURNITURE
  if (tile.material === 'wall_constructed') {
    drawConstructedWall(ctx, px, py, tx, ty, neighbors);
    return;
  }
  if (tile.material === 'door_constructed') {
    drawDoor(ctx, px, py, tile);
    return;
  }
  if (tile.material === 'bed') {
    drawBed(ctx, px, py, tx, ty);
    return;
  }
  if (tile.material === 'chair') {
    drawChair(ctx, px, py);
    return;
  }
  if (tile.material === 'table') {
    drawTable(ctx, px, py);
    return;
  }
  if (tile.material === 'well') {
    drawWell(ctx, px, py);
    return;
  }

  // 9. WORKSHOPS
  if (tile.material.startsWith('workshop_')) {
    drawWorkshopTile(ctx, px, py, tile.material, tick);
    return;
  }

  // Fallback
  ctx.fillStyle = '#27272a';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
}

// =========================================================================
// 1. ROCK WALL AUTOTILING (Seamless Mountain Rock & Exposed Cliff Facades)
// =========================================================================

interface RockPalette {
  topCap: string;
  topHighlight: string;
  frontFace: string;
  frontShade: string;
  fleckLight: string;
  fleckDark: string;
  shadow: string;
}

function getRockPalette(material: string): RockPalette {
  switch (material) {
    case 'granite':
      return {
        topCap: '#3c434f',
        topHighlight: '#5b6577',
        frontFace: '#2c323c',
        frontShade: '#1d2128',
        fleckLight: '#738096',
        fleckDark: '#1a1d24',
        shadow: 'rgba(10, 12, 16, 0.65)'
      };
    case 'marble':
      return {
        topCap: '#c8cfdb',
        topHighlight: '#edf2f7',
        frontFace: '#9ba4b5',
        frontShade: '#717b8c',
        fleckLight: '#ffffff',
        fleckDark: '#5e6777',
        shadow: 'rgba(30, 36, 46, 0.55)'
      };
    case 'obsidian':
      return {
        topCap: '#1c1a29',
        topHighlight: '#322f48',
        frontFace: '#12101b',
        frontShade: '#0a0910',
        fleckLight: '#4d4770',
        fleckDark: '#050408',
        shadow: 'rgba(5, 4, 8, 0.85)'
      };
    case 'ore_iron':
      return {
        topCap: '#542d22',
        topHighlight: '#7c4333',
        frontFace: '#3e2018',
        frontShade: '#26120d',
        fleckLight: '#b05a42',
        fleckDark: '#1b0c08',
        shadow: 'rgba(20, 8, 5, 0.75)'
      };
    case 'ore_gold':
      return {
        topCap: '#524322',
        topHighlight: '#786431',
        frontFace: '#3d3118',
        frontShade: '#261d0d',
        fleckLight: '#b59747',
        fleckDark: '#1c1508',
        shadow: 'rgba(20, 14, 5, 0.75)'
      };
    case 'ore_copper':
      return {
        topCap: '#2e4c4c',
        topHighlight: '#447272',
        frontFace: '#1f3535',
        frontShade: '#122222',
        fleckLight: '#65a5a5',
        fleckDark: '#0a1616',
        shadow: 'rgba(6, 18, 18, 0.75)'
      };
    case 'adamantine':
      return {
        topCap: '#143c4a',
        topHighlight: '#226075',
        frontFace: '#0d2832',
        frontShade: '#07181e',
        fleckLight: '#38bdf8',
        fleckDark: '#040e12',
        shadow: 'rgba(2, 10, 14, 0.85)'
      };
    case 'slade':
      return {
        topCap: '#180828',
        topHighlight: '#2e1065',
        frontFace: '#0f051d',
        frontShade: '#05020a',
        fleckLight: '#a855f7',
        fleckDark: '#3b0764',
        shadow: 'rgba(2, 0, 8, 0.95)'
      };
    default: // Standard Stone / Limestone
      return {
        topCap: '#443e38',
        topHighlight: '#635b52',
        frontFace: '#322d28',
        frontShade: '#221e1a',
        fleckLight: '#7e746a',
        fleckDark: '#191613',
        shadow: 'rgba(12, 10, 8, 0.65)'
      };
  }
}

/**
 * Autotiled Mountain Rock
 * When walls are surrounded by solid stone, they form a solid seamless mass.
 * When exposed to open air or floor, they render vertical cliff faces looking South
 * and crisp beveled edges looking North/East/West.
 */
function drawAutotiledRockWall(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  tile: Tile,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  const sSolid = isSolid(neighbors.south);

  let spriteName = 'stone_wall';
  if (!sSolid) {
    if (tile.material === 'granite') spriteName = 'granite_wall';
    else if (tile.material === 'marble') spriteName = 'marble_wall';
    else if (tile.material === 'obsidian') spriteName = 'obsidian_wall';
    else if (tile.material === 'ore_iron') spriteName = 'ore_iron_wall';
    else if (tile.material === 'ore_gold') spriteName = 'ore_gold_wall';
    else if (tile.material === 'adamantine') spriteName = 'adamantine_wall';
    else spriteName = 'stone_cliff_south';
  } else {
    spriteName = 'stone_wall';
  }

  const sprite = getPixelSprite(spriteName);
  ctx.drawImage(sprite, px, py);

  // Embedded Mineral Veins / Ore Clusters
  if (tile.material.startsWith('ore_') || tile.material === 'adamantine') {
    drawMineralVein(ctx, px, py, tx, ty, tile.material);
  }
}

/**
 * Glistening Ore Veins embedded within the rock
 */
function drawMineralVein(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  material: string
) {
  let oreColor = '#f59e0b';
  let sparkColor = '#ffffff';

  if (material === 'ore_iron') {
    oreColor = '#ea580c';
    sparkColor = '#fdba74';
  } else if (material === 'ore_gold') {
    oreColor = '#fbbf24';
    sparkColor = '#fef08a';
  } else if (material === 'ore_copper') {
    oreColor = '#06b6d4';
    sparkColor = '#a5f3fc';
  } else if (material === 'ore_coal') {
    oreColor = '#0f172a';
    sparkColor = '#475569';
  } else if (material === 'ore_gem') {
    oreColor = '#38bdf8';
    sparkColor = '#e0f2fe';
  } else if (material === 'adamantine') {
    oreColor = '#22d3ee';
    sparkColor = '#ecfeff';
  }

  // 3-4 Ore nuggets positioned naturally
  const nuggets = [
    { dx: 6, dy: 6, s: 4.5 },
    { dx: 15, dy: 8, s: 5.5 },
    { dx: 10, dy: 15, s: 5.0 },
    { dx: 20, dy: 14, s: 4.0 }
  ];

  for (const n of nuggets) {
    // Nugget body
    ctx.fillStyle = oreColor;
    ctx.beginPath();
    ctx.arc(px + n.dx, py + n.dy, n.s / 2, 0, Math.PI * 2);
    ctx.fill();

    // Glint highlight
    ctx.fillStyle = sparkColor;
    ctx.fillRect(px + n.dx - 1, py + n.dy - 1, 1.5, 1.5);
  }

  // Adamantine magical luminescence
  if (material === 'adamantine') {
    ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
    ctx.fillRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6);
  }
}

// =========================================================================
// 2. EXCAVATED FLOORS (Carved Stone, Dirt, Wood & Engraved Runes)
// =========================================================================

/**
 * Excavated Stone Floor:
 * Warm, smooth chiseled stone pavers with fine flagstone mortar joints
 * and directional ambient occlusion drop shadows cast by adjacent walls!
 */
function drawStoneFloorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  isEngraved: boolean,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  const sprite = getPixelSprite(isEngraved ? 'floor_engraved' : 'floor_stone');
  ctx.drawImage(sprite, px, py);

  // DIRECTIONAL AMBIENT OCCLUSION DROP SHADOWS:
  if (isSolid(neighbors.north)) {
    const grad = ctx.createLinearGradient(px, py, px, py + 5);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, TILE_SIZE, 5);
  }

  if (isSolid(neighbors.west)) {
    const grad = ctx.createLinearGradient(px, py, px + 4, py);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px, py, 4, TILE_SIZE);
  }
}

/**
 * Excavated Dirt Floor:
 * Natural subterranean earthy floor with pebble flecks and wall shadows.
 */
function drawDirtFloorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Earth grains and small pebbles
  for (let i = 0; i < 4; i++) {
    const rx = px + Math.floor(rand(tx, ty, i * 4) * (TILE_SIZE - 4)) + 2;
    const ry = py + Math.floor(rand(tx, ty, i * 8) * (TILE_SIZE - 4)) + 2;
    ctx.fillStyle = i % 2 === 0 ? '#4d3621' : '#261b10';
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Drop shadow from North wall
  if (isSolid(neighbors.north)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(px, py, TILE_SIZE, 4);
  }
}

/**
 * Wood Plank Floor:
 * Horizontal polished oak planks with nail rivets.
 */
function drawWoodFloorTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  ctx.fillStyle = '#78350f'; // Warm oak
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Horizontal plank seams
  const plankH = 7;
  ctx.fillStyle = '#451a03'; // Dark seam
  for (let p = 0; p < TILE_SIZE; p += plankH) {
    ctx.fillRect(px, py + p, TILE_SIZE, 1);
  }

  // Nail rivets
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(px + 3, py + 3, 1, 1);
  ctx.fillRect(px + TILE_SIZE - 4, py + 3, 1, 1);
  ctx.fillRect(px + 3, py + 10, 1, 1);
  ctx.fillRect(px + TILE_SIZE - 4, py + 10, 1, 1);

  if (isSolid(neighbors.north)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(px, py, TILE_SIZE, 4);
  }
}

// =========================================================================
// 3. ANIMATED WATER & SHORELINE
// =========================================================================

function drawWaterTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile },
  tick: number
) {
  const isAlt = Math.floor((tick * 0.15 + tx) % 2) === 0;
  const sprite = getPixelSprite(isAlt ? 'water_1' : 'water_2');
  ctx.drawImage(sprite, px, py);

  // Shoreline foam borders where water meets land
  if (neighbors.north && neighbors.north.material !== 'water' && neighbors.north.material !== 'air') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(px, py, TILE_SIZE, 2);
  }
  if (neighbors.south && neighbors.south.material !== 'water' && neighbors.south.material !== 'air') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
  }
}

/**
 * Animated Magma Tile:
 * Molten bubbling lava sea with heat distortion, crust fragments, and glowing hot spots.
 */
function drawMagmaTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile },
  tick: number
) {
  // Deep molten base
  ctx.fillStyle = '#991b1b';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Fiery orange-red convection currents
  const flow = Math.sin(tick * 0.15 + (tx + ty) * 0.8) * 3;
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(px, py + 4 + flow, TILE_SIZE, 8);
  ctx.fillRect(px + 4, py + 12 - flow, TILE_SIZE - 8, 6);

  // Golden bubbling magma hotspot
  const bubbleScale = (Math.sin(tick * 0.3 + tx * 3) + 1) * 2.5;
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(px + 14, py + 14, bubbleScale, 0, Math.PI * 2);
  ctx.fill();

  // Floating basalt crust specks
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(px + 4, py + 5, 4, 3);
  ctx.fillRect(px + 18, py + 18, 5, 3);

  // Fiery ambient glow edge
  ctx.fillStyle = 'rgba(251, 146, 60, 0.3)';
  ctx.fillRect(px, py, TILE_SIZE, 2);
}

/**
 * Bioluminescent Cavern Moss Tile:
 * Deep subterranean moss carpet glowing with teal spores.
 */
function drawCaveMossTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile },
  tick: number
) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Teal velvety moss patches
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(px + 3, py + 4, TILE_SIZE - 6, TILE_SIZE - 8);

  ctx.fillStyle = '#14b8a6';
  ctx.fillRect(px + 6, py + 7, TILE_SIZE - 12, TILE_SIZE - 14);

  // Glowing fungal spores
  const pulse = Math.sin(tick * 0.2 + (tx * 7 + ty * 13)) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(94, 234, 212, ${pulse})`;
  ctx.fillRect(px + 8, py + 9, 2, 2);
  ctx.fillRect(px + 18, py + 16, 2, 2);
  ctx.fillRect(px + 12, py + 20, 2, 2);

  if (isSolid(neighbors.north)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(px, py, TILE_SIZE, 4);
  }
}

/**
 * Giant Subterranean Fungal Tree:
 * Massive alien mushroom stalk and spore cap.
 */
function drawFungalTreeTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  tick: number
) {
  // Cavern floor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Spongy mushroom stem
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(px + 10, py + 12, 8, 14);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(px + 10, py + 12, 2, 14);

  // Massive glowing spore cap
  ctx.fillStyle = '#6b21a8';
  ctx.beginPath();
  ctx.ellipse(px + 14, py + 11, 11, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a855f7';
  ctx.beginPath();
  ctx.ellipse(px + 14, py + 9, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cyan glowing spore spots
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(px + 9, py + 7, 3, 2);
  ctx.fillRect(px + 16, py + 8, 3, 2);
  ctx.fillRect(px + 12, py + 5, 2, 2);
}

// =========================================================================
// 4. GRASS & SOIL TERRAIN
// =========================================================================

function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  const sprite = getPixelSprite('grass');
  ctx.drawImage(sprite, px, py);

  // Wall drop shadow if mountain to North
  if (isSolid(neighbors.north)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(px, py, TILE_SIZE, 4);
  }
}

function drawSoilTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  isSand: boolean,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  ctx.fillStyle = isSand ? '#b45309' : '#5c3a1e';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Soil grain texture
  for (let i = 0; i < 4; i++) {
    const rx = px + Math.floor(rand(tx, ty, i * 4) * (TILE_SIZE - 4)) + 2;
    const ry = py + Math.floor(rand(tx, ty, i * 6) * (TILE_SIZE - 4)) + 2;
    ctx.fillStyle = isSand ? (i % 2 === 0 ? '#d97706' : '#92400e') : (i % 2 === 0 ? '#784624' : '#3d2513');
    ctx.fillRect(rx, ry, 2, 2);
  }

  if (isSolid(neighbors.north)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(px, py, TILE_SIZE, 4);
  }
}

// =========================================================================
// 5. TREES & VEGETATION
// =========================================================================

function drawTreeTrunk(ctx: CanvasRenderingContext2D, px: number, py: number, tx: number, ty: number) {
  // Underlying grass soil
  ctx.fillStyle = '#166534';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Thick Oak Trunk
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  // Root flares
  ctx.fillStyle = '#451a03';
  ctx.fillRect(cx - 7, cy + 2, 14, 8);
  ctx.fillRect(cx - 9, cy + 6, 18, 4);

  // Main Trunk cylinder
  ctx.fillStyle = '#78350f';
  ctx.fillRect(cx - 5, cy - 6, 10, 14);

  // Bark ridge highlights
  ctx.fillStyle = '#92400e';
  ctx.fillRect(cx - 3, cy - 5, 2, 12);
  ctx.fillRect(cx + 2, cy - 4, 1.5, 10);
}

function drawTreeFoliage(ctx: CanvasRenderingContext2D, px: number, py: number, tx: number, ty: number) {
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  // Dense multi-lobed canopy
  // Underside shadow lobe
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 11, 0, Math.PI * 2);
  ctx.fill();

  // Mid canopy lobe
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.arc(cx - 2, cy - 1, 9.5, 0, Math.PI * 2);
  ctx.fill();

  // Top highlight canopy lobe
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(cx - 3, cy - 4, 6.5, 0, Math.PI * 2);
  ctx.fill();
}

// =========================================================================
// 6. CONSTRUCTED STRUCTURES & FURNITURE
// =========================================================================

function drawConstructedWall(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tx: number,
  ty: number,
  neighbors: { north?: Tile; south?: Tile; east?: Tile; west?: Tile }
) {
  // Dressed Ashlar Stone Block Wall
  ctx.fillStyle = '#475569';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Horizontal stone block courses
  const midY = py + TILE_SIZE / 2;
  ctx.fillStyle = '#1e293b'; // Mortar
  ctx.fillRect(px, py + 8, TILE_SIZE, 1.5);
  ctx.fillRect(px, py + 18, TILE_SIZE, 1.5);

  // Vertical mortar stagger
  ctx.fillRect(px + 7, py, 1.5, 8);
  ctx.fillRect(px + 20, py, 1.5, 8);
  ctx.fillRect(px + 14, py + 9, 1.5, 9);
  ctx.fillRect(px + 7, py + 19, 1.5, 9);
  ctx.fillRect(px + 21, py + 19, 1.5, 9);

  // Top parapet highlight
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(px, py, TILE_SIZE, 2);

  // Exposed South face drop shadow
  if (!isSolid(neighbors.south)) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
  }
}

function drawDoor(ctx: CanvasRenderingContext2D, px: number, py: number, tile: Tile) {
  const sprite = getPixelSprite('door');
  ctx.drawImage(sprite, px, py);
}

function drawBed(ctx: CanvasRenderingContext2D, px: number, py: number, tx: number, ty: number) {
  ctx.fillStyle = '#23201d';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  const sprite = getPixelSprite('bed');
  ctx.drawImage(sprite, px, py);
}

function drawChair(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#23201d';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // High-backed Dwarven Throne
  ctx.fillStyle = '#78350f';
  ctx.fillRect(px + 6, py + 8, TILE_SIZE - 12, TILE_SIZE - 14);

  // Throne backrest
  ctx.fillStyle = '#451a03';
  ctx.fillRect(px + 6, py + 3, TILE_SIZE - 12, 5);

  // Cushion
  ctx.fillStyle = '#b91c1c'; // Crimson cushion
  ctx.fillRect(px + 7, py + 9, TILE_SIZE - 14, 5);
}

function drawTable(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#23201d';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Heavy wooden tabletop
  ctx.fillStyle = '#78350f';
  ctx.fillRect(px + 4, py + 5, TILE_SIZE - 8, TILE_SIZE - 10);

  // Table rim highlight
  ctx.fillStyle = '#92400e';
  ctx.fillRect(px + 4, py + 5, TILE_SIZE - 8, 2);

  // Plate and tankard on table
  ctx.fillStyle = '#cbd5e1'; // Pewter plate
  ctx.fillRect(px + 8, py + 10, 4, 4);

  ctx.fillStyle = '#f59e0b'; // Brass goblet
  ctx.fillRect(px + 16, py + 9, 3, 4);
}

function drawWell(ctx: CanvasRenderingContext2D, px: number, py: number) {
  ctx.fillStyle = '#23201d';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Circular stone well curb
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  // Clear subterranean water inside
  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();

  // Timber winch crossbeam & bucket
  ctx.fillStyle = '#451a03';
  ctx.fillRect(px + 3, cy - 2, TILE_SIZE - 6, 4);

  ctx.fillStyle = '#b45309'; // Wooden bucket
  ctx.fillRect(cx - 2, cy - 2, 4, 4);
}

// =========================================================================
// 7. WORKSHOPS (Still, Mason's Workshop, Carpenter)
// =========================================================================

function drawWorkshopTile(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  workshopType: string,
  tick: number
) {
  // Workshop stone/timber floor
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  if (workshopType.includes('still')) {
    // BREWERY STILL: Copper boiler kettle, pipe, and ale barrels
    // Copper boiling pot
    ctx.fillStyle = '#c2410c'; // Copper
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Boiling froth
    const bubbleShift = Math.sin(tick * 0.2) * 1;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(cx, cy + bubbleShift, 5, 0, Math.PI * 2);
    ctx.fill();

    // Copper shine glint
    ctx.fillStyle = '#ffedd5';
    ctx.fillRect(cx - 3, cy - 4, 2, 2);

    // Condensation brass pipe
    ctx.fillStyle = '#d97706';
    ctx.fillRect(cx + 4, cy - 8, 3, 5);
  } else if (workshopType.includes('mason')) {
    // MASON'S WORKSHOP: Stone carving block, chisel, mallet & stone shards
    ctx.fillStyle = '#334155';
    ctx.fillRect(px + 4, py + 5, TILE_SIZE - 8, TILE_SIZE - 10);

    // Stone block being sculpted
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px + 6, py + 7, 8, 8);

    // Chisel
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(px + 17, py + 8, 5, 2);

    // Mallet handle
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + 16, py + 14, 6, 2);
  } else {
    // CARPENTER'S WORKBENCH: Timber bench, vice, wood curls, hand saw
    ctx.fillStyle = '#78350f';
    ctx.fillRect(px + 4, py + 5, TILE_SIZE - 8, TILE_SIZE - 10);

    // Wood shavings
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(px + 6, py + 8, 3, 2);
    ctx.fillRect(px + 12, py + 13, 3, 2);

    // Steel hand saw
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(px + 15, py + 7, 7, 3);
  }
}

// =========================================================================
// 8. MASTER-CRAFTED DWARF SPRITE RENDERER
// =========================================================================

export function drawSteamDwarf(
  ctx: CanvasRenderingContext2D,
  dwarf: DwarfEntity,
  px: number,
  py: number,
  isSelected: boolean,
  tick: number
) {
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  // 1. Movement & Bobbing
  const isWalking = dwarf.path && dwarf.path.length > 0;
  const bob = isWalking ? Math.sin(tick * 0.4) * 1.5 : Math.sin(tick * 0.1) * 0.8;
  const stepAlt = Math.floor((tick * 0.3) % 2);

  // Determine facing direction
  const isFacingLeft = dwarf.path && dwarf.path[0] && dwarf.path[0][0] < dwarf.x;
  const dir = isFacingLeft ? -1 : 1;

  // 2. Selection Spotlight / Ring
  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    // Corner targeting brackets
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py + 4); ctx.lineTo(px, py); ctx.lineTo(px + 4, py);
    ctx.moveTo(px + TILE_SIZE, py + 4); ctx.lineTo(px + TILE_SIZE, py); ctx.lineTo(px + TILE_SIZE - 4, py);
    ctx.moveTo(px, py + TILE_SIZE - 4); ctx.lineTo(px, py + TILE_SIZE); ctx.lineTo(px + 4, py + TILE_SIZE);
    ctx.moveTo(px + TILE_SIZE, py + TILE_SIZE - 4); ctx.lineTo(px + TILE_SIZE, py + TILE_SIZE); ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE);
    ctx.stroke();
  }

  // 3. Elliptical Drop Shadow under feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 10, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Pixel-Art Handcrafted Dwarf Sprite
  const isMining = dwarf.currentTask?.type === 'mining';
  const isBrewer = dwarf.title === 'Brewer';
  const dwarfSpriteName = isMining ? 'dwarf_miner_swing' : isBrewer ? 'dwarf_brewer' : 'dwarf_miner';
  const variant = dwarf.name.includes('Gold') ? 'gold' : dwarf.age > 80 ? 'silver' : 'auburn';

  const dwarfCanvas = getPixelSprite(dwarfSpriteName, variant);

  ctx.save();
  if (dir === -1) {
    ctx.translate(px + TILE_SIZE, py + bob);
    ctx.scale(-1, 1);
    ctx.drawImage(dwarfCanvas, 0, 0);
  } else {
    ctx.drawImage(dwarfCanvas, px, py + bob);
  }
  ctx.restore();

  // 5. Active tool particle effects (Mining sparks)
  if (isMining && Math.sin(tick * 0.5) > 0.6) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(cx + dir * 11, cy + bob - 5, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx + dir * 13, cy + bob - 8, 1.5, 1.5);
  }

  // 10. THOUGHT & STATUS BUBBLE (DF Steam style!)
  if (dwarf.currentTask) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(cx + 8, cy - 11, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let sym = '•';
    if (dwarf.currentTask.type === 'mining') sym = '⛏';
    else if (dwarf.currentTask.type === 'chopping') sym = '🪓';
    else if (dwarf.currentTask.type === 'hauling') sym = '📦';
    else if (dwarf.currentTask.type === 'sleeping') sym = 'z';
    else if (dwarf.currentTask.type === 'drinking') sym = '🍺';
    else if (dwarf.currentTask.type === 'eating') sym = '🍖';

    ctx.fillText(sym, cx + 8, cy - 10.5);
  }
}

// =========================================================================
// 9. WORLD ITEMS (Barrels, Logs, Boulders, Ores, Ale, Mushrooms)
// =========================================================================

export function drawSteamItem(ctx: CanvasRenderingContext2D, item: WorldItem, px: number, py: number) {
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  if (item.type === 'food' || item.type === 'ale') {
    const itemName = (item.nameEn || '').toLowerCase();
    if (itemName.includes('mushroom') || itemName.includes('plump') || item.type === 'food') {
      const sprite = getPixelSprite('item_mushroom');
      ctx.drawImage(sprite, px, py);
      return;
    }
    const sprite = getPixelSprite('item_barrel');
    ctx.drawImage(sprite, px, py);
    return;
  }

  if (item.type === 'ore_iron' || item.type === 'ore_gold') {
    const sprite = getPixelSprite('item_gem');
    ctx.drawImage(sprite, px, py);
    return;
  }

  if (item.type === 'wood') {
    // Cut Timber Logs Stack
    ctx.fillStyle = '#78350f';
    ctx.fillRect(cx - 7, cy - 1, 14, 5);
    ctx.fillRect(cx - 6, cy - 5, 12, 4);

    ctx.fillStyle = '#92400e';
    ctx.fillRect(cx - 7, cy - 1, 2, 5);
    ctx.fillRect(cx - 6, cy - 5, 2, 4);
  } else if (item.type === 'stone') {
    // Heavy Carved Granite Boulder
    ctx.fillStyle = '#44403c';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#78716c';
    ctx.fillRect(cx - 3, cy - 3, 3, 3);
  }
}

// =========================================================================
// 10. CREATURES (War Dog, Goblin Scout, Cave Spider)
// =========================================================================

export function drawSteamCreature(
  ctx: CanvasRenderingContext2D,
  creature: CreatureEntity,
  px: number,
  py: number
) {
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;

  // Drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 9, 6, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (creature.type === 'war_dog') {
    const sprite = getPixelSprite('creature_war_dog');
    ctx.drawImage(sprite, px, py);
    return;
  }
  if (creature.type === 'goblin_scout') {
    const sprite = getPixelSprite('creature_goblin');
    ctx.drawImage(sprite, px, py);
    return;
  }
  if (creature.type === 'cave_spider') {
    const sprite = getPixelSprite('creature_spider');
    ctx.drawImage(sprite, px, py);
    return;
  }

  // Fallback creature
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fill();
}
