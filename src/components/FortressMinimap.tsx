/**
 * Top-Right Minimap HUD & Z-Level Elevation Controls
 * Faithful recreation of the Dwarf Fortress Steam Edition minimap box.
 */

import React, { useRef, useEffect } from 'react';
import { FortressState } from '../types/simulation';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface FortressMinimapProps {
  state: FortressState;
  currentZ: number;
  maxZ: number;
  pan: { x: number; y: number };
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onChangeZ: (delta: number) => void;
  onJumpToZ: (z: number) => void;
  onPanToWorld: (worldX: number, worldY: number) => void;
  revealAll?: boolean;
  lang: 'en' | 'ua';
}

const MINIMAP_WIDTH = 140;
const MINIMAP_HEIGHT = 105;

export const FortressMinimap: React.FC<FortressMinimapProps> = ({
  state,
  currentZ,
  maxZ,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  onChangeZ,
  onJumpToZ,
  onPanToWorld,
  revealAll = false,
  lang
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render Minimap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { sizeX, sizeY, tiles, dwarves } = state;
    const scaleX = MINIMAP_WIDTH / sizeX;
    const scaleY = MINIMAP_HEIGHT / sizeY;

    // Dark background
    ctx.fillStyle = '#100f0e';
    ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

    // Draw tiles with multi-Z continuous terrain and Fog of War
    for (let y = 0; y < sizeY; y++) {
      for (let x = 0; x < sizeX; x++) {
        let activeTile = tiles[currentZ]?.[y]?.[x];
        let isLower = false;

        // If air, look down for ground
        if (!activeTile || activeTile.material === 'air') {
          for (let z = currentZ - 1; z >= 0; z--) {
            const candidate = tiles[z]?.[y]?.[x];
            if (candidate && candidate.material !== 'air') {
              activeTile = candidate;
              isLower = true;
              break;
            }
          }
        }

        if (!activeTile) continue;

        // Check FoW reveal status
        const isRevealed = revealAll || Boolean(activeTile.isRevealed);
        if (!isRevealed) {
          const tz = activeTile.z;
          const isAdj = Boolean(
            tiles[tz]?.[y - 1]?.[x]?.isRevealed ||
            tiles[tz]?.[y + 1]?.[x]?.isRevealed ||
            tiles[tz]?.[y]?.[x - 1]?.isRevealed ||
            tiles[tz]?.[y]?.[x + 1]?.isRevealed
          );
          ctx.fillStyle = isAdj ? '#1c1a17' : '#080706';
          ctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
          continue;
        }

        let color = '#262320';
        if (activeTile.material === 'air') {
          color = '#151311';
        } else if (activeTile.material === 'floor_stone' || activeTile.material === 'floor_engraved') {
          color = isLower ? '#292524' : '#44403c';
        } else if (activeTile.material === 'floor_dirt') {
          color = isLower ? '#3d2410' : '#573318';
        } else if (activeTile.material === 'floor_wood') {
          color = isLower ? '#602905' : '#92400e';
        } else if (activeTile.material === 'water') {
          color = isLower ? '#1e3a8a' : '#1d4ed8';
        } else if (activeTile.material === 'grass') {
          color = isLower ? '#144624' : '#166534';
        } else if (activeTile.material === 'tree_trunk' || activeTile.material === 'tree_foliage') {
          color = isLower ? '#0f3a1e' : '#14532d';
        } else if (activeTile.material === 'soil' || activeTile.material === 'sand') {
          color = isLower ? '#4f230a' : '#78350f';
        } else if (activeTile.material.startsWith('ore_') || activeTile.material === 'adamantine') {
          color = '#d97706';
        } else if (activeTile.material.startsWith('workshop_')) {
          color = '#7e22ce';
        } else if (activeTile.material === 'bed' || activeTile.material === 'wall_constructed') {
          color = '#94a3b8';
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * scaleX, y * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
      }
    }

    // Draw Dwarves on minimap (both current Z and visible lower Z)
    for (const dwarf of dwarves) {
      const isVisible = dwarf.z === currentZ || (dwarf.z < currentZ && tiles[currentZ]?.[dwarf.y]?.[dwarf.x]?.material === 'air');
      if (isVisible) {
        ctx.fillStyle = dwarf.z === currentZ ? '#facc15' : '#ca8a04';
        ctx.fillRect(dwarf.x * scaleX - 1, dwarf.y * scaleY - 1, 3, 3);
      }
    }

    // Viewport camera rectangle
    // worldX = (-pan.x) / zoom
    const TILE_PX = 28;
    const viewWorldX = -pan.x / (zoom * TILE_PX);
    const viewWorldY = -pan.y / (zoom * TILE_PX);
    const viewWorldW = viewportWidth / (zoom * TILE_PX);
    const viewWorldH = viewportHeight / (zoom * TILE_PX);

    const rectX = Math.max(0, viewWorldX * scaleX);
    const rectY = Math.max(0, viewWorldY * scaleY);
    const rectW = Math.min(MINIMAP_WIDTH - rectX, viewWorldW * scaleX);
    const rectH = Math.min(MINIMAP_HEIGHT - rectY, viewWorldH * scaleY);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rectX, rectY, rectW, rectH);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.fillRect(rectX, rectY, rectW, rectH);
  }, [state, currentZ, pan, zoom, viewportWidth, viewportHeight]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const targetTileX = (clickX / MINIMAP_WIDTH) * state.sizeX;
    const targetTileY = (clickY / MINIMAP_HEIGHT) * state.sizeY;

    onPanToWorld(targetTileX, targetTileY);
  };

  const relElevation = currentZ - state.surfaceZ;
  const elevText = relElevation >= 0 ? `+${relElevation}` : `${relElevation}`;

  return (
    <div className="flex items-center df-gold-frame rounded-md p-1 bg-[#141210] shadow-xl z-20">
      {/* Minimap Viewport */}
      <div className="relative overflow-hidden rounded border border-[#4a391e]">
        <canvas
          ref={canvasRef}
          width={MINIMAP_WIDTH}
          height={MINIMAP_HEIGHT}
          onClick={handleMinimapClick}
          className="cursor-pointer block"
          title={lang === 'ua' ? 'Мінікарта фортеці (Клікніть щоб перемістити камеру)' : 'Fortress Minimap (Click to center view)'}
        />
      </div>

      {/* Vertical Elevation Slider Controls */}
      <div className="flex flex-col items-center justify-between pl-1.5 pr-0.5 py-0.5 h-[105px] font-mono select-none">
        <button
          onClick={() => onChangeZ(1)}
          disabled={currentZ >= maxZ - 1}
          className="p-1 text-stone-400 hover:text-amber-300 disabled:opacity-20 transition-colors"
          title={lang === 'ua' ? 'Піднятися на рівень вище (>)' : 'Ascend Z-Level (>)'}
        >
          <ChevronUp className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center justify-center my-auto">
          <span className="text-[9px] text-stone-400 uppercase tracking-tighter">Elev</span>
          <span className="font-bold text-amber-300 text-xs font-mono">{elevText}</span>
          <span className="text-[8px] text-stone-500 font-mono">Z:{currentZ}</span>
        </div>

        <button
          onClick={() => onChangeZ(-1)}
          disabled={currentZ <= 0}
          className="p-1 text-stone-400 hover:text-amber-300 disabled:opacity-20 transition-colors"
          title={lang === 'ua' ? 'Спуститися на рівень нижче (<)' : 'Descend Z-Level (<)'}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
