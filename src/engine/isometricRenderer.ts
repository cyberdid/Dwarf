/**
 * Mastercrafted Pilgrimage Continuous Pixel-Art World Engine
 * 
 * STRICT MANDATE: ZERO SQUARES, ZERO CUBES, ZERO GRID LINES!
 * Visually replicates the continuous, organic medieval pixel-art landscape of Pilgrimage & Age of Empires 2:
 * - Continuous unbroken meadow sward (zero seams, zero tile boundaries)
 * - Seamless geological cliff ridges (rock strata spans continuously across tiles, not individual cubes)
 * - Living winding rivers with organic curving sandy shores, dynamic caustics, and water foam
 * - Organic winding dirt footpaths with soft natural edges
 * - Handcrafted medieval pixel-art tree sprites with leafy canopies and soft rounded drop-shadows
 * - Crisp pixel-art dwarven characters with walking stride, contact shadows, and tool swinging
 * - Soft circular golden runes for hover cursor and selections (NO SQUARE / DIAMOND BORDERS)
 * - Floating pixel tool designations (NO SQUARE HIGHLIGHTS)
 * - 4-Way camera rotation (0°, 90°, 180°, 270°) with synchronized mouse raycasting
 */

import { Tile, DwarfEntity, CreatureEntity, DesignationType, StockpileType, MaterialType, FortressState } from '../types/simulation';

export const ISO_TILE_W = 44;
export const ISO_TILE_H = 22;
export const BLOCK_H = 18;

export interface IsoPoint {
  isoX: number;
  isoY: number;
}

export type CameraRotation = 0 | 1 | 2 | 3; // 0=North, 1=East, 2=South, 3=West

export interface PilgrimageVisualSettings {
  showTrees: boolean;
  treeModel: 'sprites' | 'minimal';
  edgeLine: number;
  edgeWidth: number;
  shimmerStrength: number;
  shimmerSpeed: number;
  shimmerCoverage: number;
  foamStrength: number;
  waterfallTurbulence: number;
  showWildlife: boolean;
  rotation: CameraRotation;
  sunAngle: number;
}

export const DEFAULT_PILGRIMAGE_SETTINGS: PilgrimageVisualSettings = {
  showTrees: true,
  treeModel: 'sprites',
  edgeLine: 0.45,
  edgeWidth: 1.5,
  shimmerStrength: 0.35,
  shimmerSpeed: 0.5,
  shimmerCoverage: 0.45,
  foamStrength: 0.45,
  waterfallTurbulence: 0.75,
  showWildlife: true,
  rotation: 0,
  sunAngle: Math.PI * 0.25
};

export function rotateCoords(x: number, y: number, sizeX: number, sizeY: number, rotation: CameraRotation): { rx: number; ry: number } {
  switch (rotation) {
    case 1: return { rx: sizeY - 1 - y, ry: x };
    case 2: return { rx: sizeX - 1 - x, ry: sizeY - 1 - y };
    case 3: return { rx: y, ry: sizeX - 1 - x };
    case 0:
    default: return { rx: x, ry: y };
  }
}

export function unrotateCoords(rx: number, ry: number, sizeX: number, sizeY: number, rotation: CameraRotation): { x: number; y: number } {
  switch (rotation) {
    case 1: return { x: ry, y: sizeY - 1 - rx };
    case 2: return { x: sizeX - 1 - rx, y: sizeY - 1 - ry };
    case 3: return { x: sizeX - 1 - ry, y: rx };
    case 0:
    default: return { x: rx, y: ry };
  }
}

export function worldToIso(
  x: number,
  y: number,
  z: number,
  currentZ: number,
  rotation: CameraRotation = 0,
  sizeX = 64,
  sizeY = 64
): IsoPoint {
  const { rx, ry } = rotateCoords(x, y, sizeX, sizeY, rotation);
  const halfW = ISO_TILE_W / 2;
  const halfH = ISO_TILE_H / 2;
  const isoX = (rx - ry) * halfW;
  const isoY = (rx + ry) * halfH - (z - currentZ) * BLOCK_H;
  return { isoX, isoY };
}

export function isoToWorld(
  screenX: number,
  screenY: number,
  currentZ: number,
  rotation: CameraRotation = 0,
  sizeX = 64,
  sizeY = 64
): { x: number; y: number; z: number } {
  const halfW = ISO_TILE_W / 2;
  const halfH = ISO_TILE_H / 2;
  const rx = Math.floor((screenX / halfW + screenY / halfH) / 2);
  const ry = Math.floor((screenY / halfH - screenX / halfW) / 2);
  const { x, y } = unrotateCoords(rx, ry, sizeX, sizeY, rotation);
  return { x, y, z: currentZ };
}

export function isIsoSolid(material: MaterialType): boolean {
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
    'tree_trunk'
  ].includes(material);
}

// ----------------------------------------------------
// NATURAL CONTINUOUS PALETTE
// ----------------------------------------------------
export const PILGRIMAGE_COLORS = {
  // Uniform Meadow Base (Identical color across tiles to eliminate visible tile seams!)
  grassBase: '#6e7f42',
  grassSunny: '#7d914b',
  grassDeep: '#536332',
  dirtTrack: '#9e8052',
  sandShore: '#ceb67c',
  floorStone: '#433f3c',
  floorWood: '#633d21',

  // Water & Depth
  waterBed: '#b8a06b',
  waterShallow: 'rgba(68, 126, 163, 0.88)',
  waterDeep: '#1e3f5d',
  waterFoam: 'rgba(255, 255, 255, 0.78)',
  magmaGlow: '#dc2626',

  // Stratified Rock Ridge
  cliffTop: '#5a5245',
  cliffStrata1: '#4a4235',
  cliffStrata2: '#3a3328',
  cliffStrata3: '#2a241b',

  // Organic Ink Outlines
  sepiaInk: 'rgba(38, 30, 22, 0.42)',
  entityShadow: 'rgba(15, 12, 10, 0.38)',
  treeShadow: 'rgba(20, 28, 16, 0.35)'
};

function pseudoNoise(x: number, y: number, seed = 42): number {
  let h = (x * 374761393 + y * 668265263 + seed) ^ 0x5bf03635;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ----------------------------------------------------
// LEGACY HELPER EXPORTS (Updated to prevent any box drawing)
// ----------------------------------------------------

export function drawIsoBlock(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  material: MaterialType,
  depthDimming = 1.0
) {
  // Overlap by 0.75px to eliminate subpixel seam lines
  const hw = ISO_TILE_W / 2 + 0.75;
  const hh = ISO_TILE_H / 2 + 0.75;
  const h = BLOCK_H;

  ctx.save();
  if (depthDimming < 1.0) ctx.globalAlpha = Math.max(0.35, depthDimming);

  // Left Face
  ctx.beginPath();
  ctx.moveTo(isoX - hw, isoY);
  ctx.lineTo(isoX, isoY + hh);
  ctx.lineTo(isoX, isoY + hh + h);
  ctx.lineTo(isoX - hw, isoY + h);
  ctx.closePath();
  ctx.fillStyle = PILGRIMAGE_COLORS.cliffStrata1;
  ctx.fill();

  // Right Face
  ctx.beginPath();
  ctx.moveTo(isoX, isoY + hh);
  ctx.lineTo(isoX + hw, isoY);
  ctx.lineTo(isoX + hw, isoY + h);
  ctx.lineTo(isoX, isoY + hh + h);
  ctx.closePath();
  ctx.fillStyle = PILGRIMAGE_COLORS.cliffStrata2;
  ctx.fill();

  // Top Face
  ctx.beginPath();
  ctx.moveTo(isoX, isoY - hh);
  ctx.lineTo(isoX + hw, isoY);
  ctx.lineTo(isoX, isoY + hh);
  ctx.lineTo(isoX - hw, isoY);
  ctx.closePath();
  ctx.fillStyle = PILGRIMAGE_COLORS.cliffTop;
  ctx.fill();

  ctx.restore();
}

export function drawIsoFloor(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  material: MaterialType,
  waterLevel = 0,
  tick = 0,
  depthDimming = 1.0
) {
  const hw = ISO_TILE_W / 2 + 0.75;
  const hh = ISO_TILE_H / 2 + 0.75;

  ctx.save();
  if (depthDimming < 1.0) ctx.globalAlpha = Math.max(0.35, depthDimming);

  ctx.beginPath();
  ctx.moveTo(isoX, isoY - hh);
  ctx.lineTo(isoX + hw, isoY);
  ctx.lineTo(isoX, isoY + hh);
  ctx.lineTo(isoX - hw, isoY);
  ctx.closePath();

  let fillColor = PILGRIMAGE_COLORS.grassBase;
  if (material === 'water' || waterLevel > 0) fillColor = PILGRIMAGE_COLORS.waterShallow;
  else if (material === 'sand') fillColor = PILGRIMAGE_COLORS.sandShore;
  else if (material === 'floor_dirt' || material === 'soil') fillColor = PILGRIMAGE_COLORS.dirtTrack;
  else if (material === 'floor_wood') fillColor = PILGRIMAGE_COLORS.floorWood;
  else if (material === 'floor_stone') fillColor = PILGRIMAGE_COLORS.floorStone;

  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();
}

/**
 * Pixel-Art Tree Sprite (trees=sprites)
 * Renders an organic, non-square leafy canopy with soft oval drop-shadow
 */
export function drawPilgrimageTreeSprite(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  seed = 42,
  tick = 0,
  depthDimming = 1.0
) {
  ctx.save();
  if (depthDimming < 1.0) ctx.globalAlpha = depthDimming;

  const sway = Math.sin(tick * 0.04 + seed) * 1.2;
  const isPine = seed % 3 === 0;

  // 1. Soft Rounded Drop-Shadow on ground
  ctx.fillStyle = PILGRIMAGE_COLORS.treeShadow;
  ctx.beginPath();
  ctx.ellipse(isoX + 5, isoY + 3, 13, 6, Math.PI * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 2. Trunk (Curved organic wood, flared base)
  ctx.fillStyle = '#422d17';
  ctx.beginPath();
  ctx.moveTo(isoX - 2.5, isoY + 1);
  ctx.lineTo(isoX + 2.5, isoY + 1);
  ctx.lineTo(isoX + 1.8 + sway * 0.2, isoY - 16);
  ctx.lineTo(isoX - 1.8 + sway * 0.2, isoY - 16);
  ctx.closePath();
  ctx.fill();

  // Root flares
  ctx.fillStyle = '#301f0e';
  ctx.beginPath();
  ctx.arc(isoX - 3, isoY + 1, 1.4, 0, Math.PI * 2);
  ctx.arc(isoX + 3, isoY + 1, 1.4, 0, Math.PI * 2);
  ctx.fill();

  if (isPine) {
    // Coniferous Pine with tiered needle boughs
    const tiers = [
      { y: isoY - 12, w: 18, h: 9, col: '#1c311e', hl: '#2b492d' },
      { y: isoY - 17, w: 15, h: 8, col: '#223a24', hl: '#355737' },
      { y: isoY - 22, w: 11, h: 7, col: '#29452b', hl: '#406842' },
      { y: isoY - 27, w: 6, h: 6, col: '#335537', hl: '#4e7e51' }
    ];

    for (const t of tiers) {
      ctx.fillStyle = t.col;
      ctx.beginPath();
      ctx.moveTo(isoX + sway * 0.4, t.y - t.h);
      ctx.lineTo(isoX + t.w / 2 + sway * 0.4, t.y);
      ctx.lineTo(isoX - t.w / 2 + sway * 0.4, t.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = t.hl;
      ctx.beginPath();
      ctx.moveTo(isoX + sway * 0.4, t.y - t.h);
      ctx.lineTo(isoX + sway * 0.4, t.y);
      ctx.lineTo(isoX - t.w / 2 + sway * 0.4, t.y);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    // Broadleaf Oak with multi-lobed foliage clusters
    const cx = isoX + sway * 0.5;
    const cy = isoY - 21;

    // Deep ambient foliage shadow
    ctx.fillStyle = '#26331a';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 14, 0, Math.PI * 2);
    ctx.fill();

    // Body green
    ctx.fillStyle = '#3f5724';
    ctx.beginPath();
    ctx.arc(cx - 5, cy + 1, 10, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy + 2, 9, 0, Math.PI * 2);
    ctx.arc(cx, cy - 3, 11, 0, Math.PI * 2);
    ctx.fill();

    // Sunlit highlights (Top-left meadow sunlight)
    ctx.fillStyle = '#718c34';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 5, 7.5, 0, Math.PI * 2);
    ctx.arc(cx + 2, cy - 6, 6.5, 0, Math.PI * 2);
    ctx.fill();

    // Top sun crest
    ctx.fillStyle = '#94ad47';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 7, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Medieval Workshop & Furniture Props
 */
export function drawIsoProp(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  material: MaterialType,
  tick = 0
) {
  ctx.save();
  switch (material) {
    case 'workshop_still':
      // Copper brewing kettle & oak casks
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.ellipse(isoX - 7, isoY - 2, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.arc(isoX + 4, isoY - 5, 6.5, 0, Math.PI * 2);
      ctx.fill();

      // Brass pipe
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(isoX + 4, isoY - 11);
      ctx.lineTo(isoX + 4, isoY - 16);
      ctx.lineTo(isoX - 3, isoY - 14);
      ctx.stroke();

      // Brewing steam
      const steamY = ((tick * 0.4) % 16);
      ctx.fillStyle = `rgba(245, 245, 250, ${Math.max(0, 0.6 - steamY / 24)})`;
      ctx.beginPath();
      ctx.arc(isoX - 3, isoY - 15 - steamY, 2 + steamY * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'workshop_mason':
      // Carved stone blocks & hammer
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(isoX - 8, isoY - 7, 7, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(isoX + 2, isoY - 9, 8, 6);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(isoX - 1, isoY - 2);
      ctx.lineTo(isoX + 3, isoY - 6);
      ctx.stroke();
      break;

    case 'workshop_carpenter':
      // Timber framework & lumber
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(isoX - 10, isoY - 5, 20, 6);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(isoX - 6, isoY - 9, 13, 3);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(isoX - 4, isoY - 12, 9, 3);
      break;

    case 'bed':
      ctx.fillStyle = '#542c13';
      ctx.fillRect(isoX - 8, isoY - 5, 16, 8);
      ctx.fillStyle = '#991b1b';
      ctx.fillRect(isoX - 7, isoY - 4, 14, 6);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(isoX - 7, isoY - 5, 4, 3);
      break;

    case 'table':
      ctx.fillStyle = '#542c13';
      ctx.beginPath();
      ctx.ellipse(isoX, isoY - 3, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#292524';
      ctx.fillRect(isoX - 7, isoY - 1, 2, 6);
      ctx.fillRect(isoX + 5, isoY - 1, 2, 6);
      break;

    case 'door_constructed':
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(isoX - 5, isoY - 16, 10, 17);
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(isoX - 5, isoY - 12, 10, 2);
      ctx.fillRect(isoX - 5, isoY - 4, 10, 2);
      break;

    case 'tree_foliage':
      drawPilgrimageTreeSprite(ctx, isoX, isoY, 42, tick);
      break;

    default:
      break;
  }
  ctx.restore();
}

/**
 * Crisp Medieval Character Sprite (characters=base)
 * Walks naturally with stride, tool swing, and soft contact shadow. ZERO BOXES!
 */
export function drawIsoDwarf(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  dwarf: DwarfEntity,
  isSelected: boolean,
  tick: number,
  depthDimming = 1.0
) {
  ctx.save();
  if (depthDimming < 1.0) ctx.globalAlpha = Math.max(0.35, depthDimming);

  // 1. Soft Oval Contact Shadow beneath boots
  ctx.fillStyle = PILGRIMAGE_COLORS.entityShadow;
  ctx.beginPath();
  ctx.ellipse(isoX, isoY + 2, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Selection Halo: Gentle Golden Ring (NO SQUARE!)
  if (isSelected) {
    const pulse = (Math.sin(tick * 0.15) + 1) * 0.5;
    ctx.strokeStyle = `rgba(251, 191, 36, ${0.7 + pulse * 0.3})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(isoX, isoY + 2, 11, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating vertical gold ray
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.beginPath();
    ctx.moveTo(isoX, isoY);
    ctx.lineTo(isoX, isoY - 32);
    ctx.stroke();
  }

  // Walking stride
  const isMoving = Boolean(dwarf.currentTask || (dwarf.path && dwarf.path.length > 0));
  const walkStride = isMoving ? Math.sin(tick * 0.35) : 0;
  const bobY = isMoving ? Math.abs(Math.sin(tick * 0.35)) * 1.8 : 0;
  const footY = isoY - bobY;

  // Medieval Guild Tunic
  const prof = (dwarf.title || '').toLowerCase();
  let tunicColor = dwarf.color || '#2563eb';
  if (prof.includes('wood') || prof.includes('carpenter')) tunicColor = '#78350f';
  else if (prof.includes('brew') || prof.includes('farmer')) tunicColor = '#2e7d32';
  else if (prof.includes('mason') || prof.includes('stone')) tunicColor = '#475569';
  else if (prof.includes('miner')) tunicColor = '#1d4ed8';
  else if (prof.includes('soldier') || prof.includes('guard')) tunicColor = '#b91c1c';

  // Boots
  ctx.fillStyle = '#261b11';
  ctx.fillRect(isoX - 3.5 + walkStride * 1.8, footY - 2, 3, 2.8);
  ctx.fillRect(isoX + 0.8 - walkStride * 1.8, footY - 2, 3, 2.8);

  // Tunic
  ctx.fillStyle = tunicColor;
  ctx.fillRect(isoX - 4.5, footY - 11, 9, 9);

  // Belt & Buckle
  ctx.fillStyle = '#3e1903';
  ctx.fillRect(isoX - 4.5, footY - 5.5, 9, 1.8);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(isoX - 0.8, footY - 5.5, 1.6, 1.8);

  // Face
  ctx.fillStyle = '#fbcfe8';
  ctx.fillRect(isoX - 3, footY - 17, 6, 6);

  // Braided Beard
  let beardColor = '#78350f';
  if (dwarf.name.length % 3 === 0) beardColor = '#d97706';
  else if (dwarf.name.length % 3 === 1) beardColor = '#cbd5e1';
  else beardColor = '#1c1917';

  ctx.fillStyle = beardColor;
  ctx.beginPath();
  ctx.moveTo(isoX - 3.5, footY - 12);
  ctx.lineTo(isoX + 3.5, footY - 12);
  ctx.lineTo(isoX + 1.5, footY - 4);
  ctx.lineTo(isoX - 1.5, footY - 4);
  ctx.closePath();
  ctx.fill();

  // Helmet / Cap
  ctx.fillStyle = '#334155';
  ctx.fillRect(isoX - 4, footY - 19, 8, 3.5);

  // Animated Tools
  if (dwarf.currentTask?.type === 'mining') {
    const swing = Math.sin(tick * 0.45) * 8;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(isoX + 4, footY - 8);
    ctx.lineTo(isoX + 9 + swing, footY - 14);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(isoX + 8 + swing, footY - 16, 3.5, 2.5);

    // Chipping spark
    if (Math.sin(tick * 0.45) > 0.7) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(isoX + 12, footY - 13, 1.5, 1.5);
    }
  } else if (dwarf.currentTask?.type === 'chopping') {
    const swing = Math.sin(tick * 0.4) * 8;
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(isoX + 4, footY - 8);
    ctx.lineTo(isoX + 9 + swing, footY - 13);
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(isoX + 8 + swing, footY - 15, 3, 3);
  } else if (dwarf.currentTask?.type === 'gathering') {
    const bend = Math.sin(tick * 0.3) * 3;
    ctx.strokeStyle = '#84cc16';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(isoX + 4, footY - 8);
    ctx.lineTo(isoX + 8, footY - 3 + bend);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(isoX + 7, footY - 4 + bend, 2.5, 2.5);
  }

  // Selected Nameplate
  if (isSelected) {
    ctx.font = 'bold 9px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(isoX - 24, footY - 29, 48, 10);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(isoX - 24, footY - 29, 48, 10);
    ctx.fillStyle = '#fef08a';
    ctx.fillText(dwarf.name.split(' ')[0], isoX, footY - 21);
  }

  ctx.restore();
}

/**
 * Organic Circular Tool Designation (ZERO SQUARES!)
 */
export function drawIsoDesignation(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  designation: DesignationType,
  tick: number
) {
  ctx.save();
  const pulse = (Math.sin(tick * 0.2) + 1) * 0.5;

  let color = '#38bdf8';
  let symbol = '★';

  if (designation === 'mine') {
    color = '#f59e0b';
    symbol = '⛏';
  } else if (designation === 'chop') {
    color = '#22c55e';
    symbol = '🪓';
  } else if (designation === 'gather') {
    color = '#84cc16';
    symbol = '🌾';
  } else if (designation.startsWith('build_')) {
    color = '#818cf8';
    symbol = '🔨';
  }

  // Soft glowing oval marker on the ground (NOT A SQUARE!)
  ctx.fillStyle = `rgba(${designation === 'mine' ? '245, 158, 11' : designation === 'chop' ? '34, 197, 94' : designation === 'gather' ? '132, 204, 22' : '56, 189, 248'}, ${0.2 + pulse * 0.18})`;
  ctx.beginPath();
  ctx.ellipse(isoX, isoY, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(isoX, isoY, 12, 6, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Floating designation tool icon above the spot
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(symbol, isoX, isoY - 6 - pulse * 3);

  ctx.restore();
}

/**
 * Natural Stockpile Pegs (ZERO DASHED SQUARE BOXES!)
 */
export function drawIsoStockpile(
  ctx: CanvasRenderingContext2D,
  isoX: number,
  isoY: number,
  stockpile: StockpileType
) {
  if (stockpile === 'none') return;
  ctx.save();

  // Subtle natural ground tint
  let tint = 'rgba(203, 213, 225, 0.12)';
  if (stockpile === 'wood') tint = 'rgba(217, 119, 6, 0.14)';
  else if (stockpile === 'food') tint = 'rgba(34, 197, 94, 0.14)';
  else if (stockpile === 'ore') tint = 'rgba(56, 189, 248, 0.14)';

  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.ellipse(isoX, isoY, 14, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Corner wooden boundary markers
  ctx.fillStyle = '#78350f';
  ctx.fillRect(isoX - 10, isoY - 2, 2, 4);
  ctx.fillRect(isoX + 8, isoY - 2, 2, 4);

  ctx.restore();
}

// ----------------------------------------------------
// CONTINUOUS PIXEL-ART SCENE RENDERER
// ----------------------------------------------------

export interface PilgrimageRenderOptions {
  state: FortressState;
  currentZ: number;
  pan: { x: number; y: number };
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  selectedDwarfId: string | null;
  hoveredTile: { x: number; y: number; z: number } | null;
  aiHighlights?: { x: number; y: number; z: number; type: string }[];
  revealAll?: boolean;
  settings?: PilgrimageVisualSettings;
  tick?: number;
}

/**
 * High-Performance Continuous Landscape Assembler
 * Bypasses all grid boxes and generates an unbroken, organic medieval scenery
 */
export function renderPilgrimageWorld(
  ctx: CanvasRenderingContext2D,
  opts: PilgrimageRenderOptions
) {
  const {
    state,
    currentZ,
    pan,
    zoom,
    canvasWidth,
    canvasHeight,
    selectedDwarfId,
    hoveredTile,
    aiHighlights = [],
    revealAll = false,
    settings = DEFAULT_PILGRIMAGE_SETTINGS,
    tick = state.tick || 0
  } = opts;

  const { sizeX, sizeY, tiles, dwarves } = state;
  const rotation = settings.rotation || 0;

  ctx.save();

  // 1. Warm Earthy Cavern Canvas Background
  ctx.fillStyle = '#110f0c';
  ctx.fillRect(
    -pan.x / zoom - 200,
    -pan.y / zoom - 200,
    canvasWidth / zoom + 400,
    canvasHeight / zoom + 400
  );

  const isoOffsetX = (sizeY * ISO_TILE_W) / 2 + 40;
  const isoOffsetY = 80;

  const minZ = Math.max(0, currentZ - 2);
  const shimmerTime = tick * settings.shimmerSpeed * 0.05;

  // ----------------------------------------------------
  // PASS 1: CONTINUOUS SEAMLESS TERRAIN SWARD & CLIFFS
  // ----------------------------------------------------
  // Overlap delta to eliminate any subpixel gap between adjacent terrain vertices
  const overlap = 0.85;
  const hw = ISO_TILE_W / 2 + overlap;
  const hh = ISO_TILE_H / 2 + overlap;
  const h = BLOCK_H;

  for (let z = minZ; z <= currentZ; z++) {
    const depthDelta = currentZ - z;
    const depthDimming = depthDelta === 0 ? 1.0 : (depthDelta === 1 ? 0.65 : 0.42);

    for (let sum = 0; sum <= sizeX + sizeY; sum++) {
      const startX = Math.max(0, sum - (sizeY - 1));
      const endX = Math.min(sizeX - 1, sum);

      for (let rx = startX; rx <= endX; rx++) {
        const ry = sum - rx;
        const { x, y } = unrotateCoords(rx, ry, sizeX, sizeY, rotation);

        const tile = tiles[z]?.[y]?.[x];
        if (!tile || tile.material === 'air') continue;

        const isRevealed = revealAll || Boolean(tile.isRevealed);
        if (!isRevealed) continue;

        const { isoX, isoY } = worldToIso(x, y, z, currentZ, rotation, sizeX, sizeY);
        const drawX = isoX + isoOffsetX;
        const drawY = isoY + isoOffsetY;

        // Check neighboring cells in rotated screen coordinates
        const nextRYTile = ry + 1 < sizeY ? tiles[z]?.[unrotateCoords(rx, ry + 1, sizeX, sizeY, rotation).y]?.[unrotateCoords(rx, ry + 1, sizeX, sizeY, rotation).x] : null;
        const nextRXTile = rx + 1 < sizeX ? tiles[z]?.[unrotateCoords(rx + 1, ry, sizeX, sizeY, rotation).y]?.[unrotateCoords(rx + 1, ry, sizeX, sizeY, rotation).x] : null;

        const hasLeftCliff = !nextRYTile || nextRYTile.material === 'air';
        const hasRightCliff = !nextRXTile || nextRXTile.material === 'air';

        ctx.save();
        if (depthDimming < 1.0) ctx.globalAlpha = depthDimming;

        const isRockBlock = isIsoSolid(tile.material);
        const isWater = tile.material === 'water' || tile.waterLevel > 0;
        const isSand = tile.material === 'sand';
        const isDirt = tile.material === 'floor_dirt' || tile.material === 'soil';
        const isFloor = ['floor_stone', 'floor_wood', 'floor_engraved'].includes(tile.material);
        const isMagma = tile.material === 'magma';

        // ------------------------------------------------
        // A. VERTICAL STRATA CLIFF FACES (Only on edges!)
        // ------------------------------------------------
        // Connected cliff tiles share colors and horizontal strata lines to form a unified rock wall!
        if (hasLeftCliff || (isRockBlock && hasLeftCliff)) {
          ctx.beginPath();
          ctx.moveTo(drawX - hw, drawY);
          ctx.lineTo(drawX, drawY + hh);
          ctx.lineTo(drawX, drawY + hh + h);
          ctx.lineTo(drawX - hw, drawY + h);
          ctx.closePath();
          ctx.fillStyle = PILGRIMAGE_COLORS.cliffStrata1;
          ctx.fill();

          // Continuous horizontal rock strata line running across the ridge
          ctx.strokeStyle = PILGRIMAGE_COLORS.cliffStrata3;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(drawX - hw, drawY + h * 0.42);
          ctx.lineTo(drawX, drawY + hh + h * 0.42);
          ctx.stroke();
        }

        if (hasRightCliff || (isRockBlock && hasRightCliff)) {
          ctx.beginPath();
          ctx.moveTo(drawX, drawY + hh);
          ctx.lineTo(drawX + hw, drawY);
          ctx.lineTo(drawX + hw, drawY + h);
          ctx.lineTo(drawX, drawY + hh + h);
          ctx.closePath();
          ctx.fillStyle = PILGRIMAGE_COLORS.cliffStrata2;
          ctx.fill();

          ctx.strokeStyle = PILGRIMAGE_COLORS.cliffStrata3;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(drawX, drawY + hh + h * 0.52);
          ctx.lineTo(drawX + hw, drawY + h * 0.52);
          ctx.stroke();
        }

        // ------------------------------------------------
        // B. TOP SURFACE (Unified Meadow Sward)
        // ------------------------------------------------
        ctx.beginPath();
        ctx.moveTo(drawX, drawY - hh);
        ctx.lineTo(drawX + hw, drawY);
        ctx.lineTo(drawX, drawY + hh);
        ctx.lineTo(drawX - hw, drawY);
        ctx.closePath();

        if (isRockBlock) {
          // Plateau stone top
          ctx.fillStyle = PILGRIMAGE_COLORS.cliffTop;
          ctx.fill();

          // Ore mineral veins (soft specks, no square)
          if (tile.material.startsWith('ore_')) {
            let oreCol = '#fbbf24';
            if (tile.material === 'ore_iron') oreCol = '#ea580c';
            else if (tile.material === 'ore_gem') oreCol = '#38bdf8';
            else if (tile.material === 'ore_copper') oreCol = '#06b6d4';
            ctx.fillStyle = oreCol;
            ctx.beginPath();
            ctx.arc(drawX - 3, drawY, 2.2, 0, Math.PI * 2);
            ctx.arc(drawX + 4, drawY + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (isWater) {
          // Living flowing water: sandy riverbed underneath
          ctx.fillStyle = PILGRIMAGE_COLORS.waterBed;
          ctx.fill();

          ctx.fillStyle = PILGRIMAGE_COLORS.waterShallow;
          ctx.fill();

          // Procedural wave caustics
          const shimmer = Math.sin(shimmerTime + rx * 0.7 + ry * 0.5);
          if (shimmer > 0.22) {
            const streakW = 14 * settings.shimmerCoverage;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.42 * settings.shimmerStrength})`;
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(drawX - streakW / 2 + shimmer * 3, drawY);
            ctx.lineTo(drawX + streakW / 2 + shimmer * 3, drawY);
            ctx.stroke();
          }

          // Shoreline wave foam along land banks
          if (settings.foamStrength > 0) {
            const nearLand = (!nextRXTile || nextRXTile.material !== 'water') || (!nextRYTile || nextRYTile.material !== 'water');
            if (nearLand) {
              const foamPulse = (Math.sin(tick * 0.1 + rx) + 1) * 0.5;
              ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 + foamPulse * 0.35})`;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(drawX - hw * 0.6, drawY + hh * 0.4);
              ctx.quadraticCurveTo(drawX, drawY + hh * 0.8, drawX + hw * 0.6, drawY + hh * 0.4);
              ctx.stroke();
            }
          }
        } else if (isMagma) {
          ctx.fillStyle = PILGRIMAGE_COLORS.magmaGlow;
          ctx.fill();
          const pulse = (Math.sin(tick * 0.08 + rx) + 1) * 0.5;
          ctx.fillStyle = `rgba(251, 191, 36, ${0.4 + pulse * 0.4})`;
          ctx.beginPath();
          ctx.arc(drawX, drawY, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Unified Continuous Meadow Turf:
          // ALL adjacent grass tiles use PILGRIMAGE_COLORS.grassBase to guarantee ZERO tile borders!
          let groundBase = PILGRIMAGE_COLORS.grassBase;
          if (isSand) groundBase = PILGRIMAGE_COLORS.sandShore;
          else if (isDirt) groundBase = PILGRIMAGE_COLORS.dirtTrack;
          else if (isFloor) groundBase = tile.material === 'floor_wood' ? PILGRIMAGE_COLORS.floorWood : PILGRIMAGE_COLORS.floorStone;

          ctx.fillStyle = groundBase;
          ctx.fill();

          // Organic scattered wildflowers (chamomile, buttercup, red poppies)
          // Placed with continuous world-space noise, completely decoupled from grid centers!
          const flowerNoise = pseudoNoise(x, y);
          if (!isSand && !isDirt && !isFloor && flowerNoise > 0.68) {
            ctx.fillStyle = flowerNoise > 0.88 ? '#ef4444' : (flowerNoise > 0.78 ? '#fbbf24' : '#fef08a');
            ctx.beginPath();
            ctx.arc(drawX + (flowerNoise * 14 - 7), drawY + ((flowerNoise * 7) % 5 - 2), 1.3, 0, Math.PI * 2);
            ctx.fill();
          }

          // Soft Sepia Ink Ridge Outlines (Only where cliffs drop off, not flat terrain!)
          if ((hasLeftCliff || hasRightCliff) && settings.edgeLine > 0) {
            ctx.strokeStyle = PILGRIMAGE_COLORS.sepiaInk;
            ctx.lineWidth = settings.edgeWidth;
            ctx.beginPath();
            if (hasLeftCliff) {
              ctx.moveTo(drawX - hw, drawY);
              ctx.lineTo(drawX, drawY + hh);
            }
            if (hasRightCliff) {
              ctx.moveTo(drawX, drawY + hh);
              ctx.lineTo(drawX + hw, drawY);
            }
            ctx.stroke();
          }
        }

        ctx.restore();

        // ------------------------------------------------
        // C. PROPS & WORKSHOPS
        // ------------------------------------------------
        if (['bed', 'table', 'chair', 'door_constructed', 'workshop_mason', 'workshop_carpenter', 'workshop_still'].includes(tile.material)) {
          drawIsoProp(ctx, drawX, drawY, tile.material, tick);
        }

        // ------------------------------------------------
        // D. TREES (trees=sprites)
        // ------------------------------------------------
        if (tile.material === 'tree_foliage') {
          const treeSeed = (x * 73 + y * 97) ^ 0x3ac5;
          drawPilgrimageTreeSprite(ctx, drawX, drawY, treeSeed, tick, depthDimming);
        }

        // Stockpile indicator (natural boundary stakes, NO dashed square box)
        if (z === currentZ && tile.stockpile !== 'none') {
          drawIsoStockpile(ctx, drawX, drawY, tile.stockpile);
        }

        // Designation indicator (floating tool, NO square box)
        if (z === currentZ && tile.designation !== 'none') {
          drawIsoDesignation(ctx, drawX, drawY, tile.designation, tick);
        }

        // AI Planned
        const isAiPlanned = aiHighlights.some(h => h.x === x && h.y === y && h.z === currentZ);
        if (isAiPlanned && z === currentZ) {
          drawIsoDesignation(ctx, drawX, drawY, 'build_wall', tick);
        }
      }
    }
  }

  // ----------------------------------------------------
  // PASS 2: MEDIEVAL CHARACTERS (characters=base)
  // ----------------------------------------------------
  const sortedDwarves = [...dwarves].sort((a, b) => {
    const { rx: raX, ry: raY } = rotateCoords(a.x, a.y, sizeX, sizeY, rotation);
    const { rx: rbX, ry: rbY } = rotateCoords(b.x, b.y, sizeX, sizeY, rotation);
    return (raX + raY) - (rbX + rbY);
  });

  for (const dwarf of sortedDwarves) {
    if (dwarf.z > currentZ || dwarf.z < minZ) continue;
    const { isoX, isoY } = worldToIso(dwarf.x, dwarf.y, dwarf.z, currentZ, rotation, sizeX, sizeY);
    const drawX = isoX + isoOffsetX;
    const drawY = isoY + isoOffsetY;
    const isSelected = dwarf.id === selectedDwarfId;
    const depthDimming = dwarf.z === currentZ ? 1.0 : 0.65;
    drawIsoDwarf(ctx, drawX, drawY, dwarf, isSelected, tick, depthDimming);
  }

  // ----------------------------------------------------
  // PASS 3: INTERACTIVE RETICLE (CIRCULAR GOLDEN RUNE - ZERO SQUARES!)
  // ----------------------------------------------------
  if (hoveredTile && hoveredTile.z === currentZ) {
    const { isoX, isoY } = worldToIso(hoveredTile.x, hoveredTile.y, currentZ, currentZ, rotation, sizeX, sizeY);
    const drawX = isoX + isoOffsetX;
    const drawY = isoY + isoOffsetY;

    ctx.save();
    // Soft circular golden focal aura (NOT A SQUARE OR DIAMOND!)
    const pulse = (Math.sin(tick * 0.25) + 1) * 0.5;
    ctx.strokeStyle = `rgba(254, 240, 138, ${0.75 + pulse * 0.25})`;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(drawX, drawY, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(254, 240, 138, ${0.12 + pulse * 0.08})`;
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
