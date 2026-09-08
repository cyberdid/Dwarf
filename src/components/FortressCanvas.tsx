/**
 * Authentic Dwarf Fortress Steam Edition Canvas Engine
 * High-performance graphical and CP437 ASCII rendering with multi-Z strata depth,
 * realistic rock bevels, fluid animations, and interactive designation tools.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FortressState, Tile, DwarfEntity, DesignationType, StockpileType, CreatureEntity, WorldItem } from '../types/simulation';
import {
  TILE_SIZE,
  drawSteamTile,
  drawSteamDwarf,
  drawSteamItem,
  drawSteamCreature
} from '../engine/tileGraphics';

interface FortressCanvasProps {
  state: FortressState;
  currentZ: number;
  renderMode: 'ascii' | 'graphic';
  selectedTool: DesignationType | 'inspect' | 'stockpile_stone' | 'stockpile_wood' | 'stockpile_food' | 'stockpile_ore' | 'cancel' | string;
  selectedDwarfId: string | null;
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onSelectDwarf: (dwarf: DwarfEntity | null) => void;
  onSelectTile: (tile: Tile | null) => void;
  onApplyDesignation: (x: number, y: number, z: number, tool: string) => void;
  aiHighlights?: { x: number; y: number; z: number; type: string }[];
  revealAll?: boolean;
  lang: 'en' | 'ua';
}

export const FortressCanvas: React.FC<FortressCanvasProps> = ({
  state,
  currentZ,
  renderMode,
  selectedTool,
  selectedDwarfId,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
  onSelectDwarf,
  onSelectTile,
  onApplyDesignation,
  aiHighlights = [],
  revealAll = false,
  lang
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isDesignating, setIsDesignating] = useState<boolean>(false);

  // Resize observer to ensure full container pixel sharpness
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
      }
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Fit Entire World to Screen (Single Frame View)
  const handleFitWorld = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    if (width <= 0 || height <= 0) return;

    const padding = 28;
    const worldW = state.sizeX * TILE_SIZE;
    const worldH = state.sizeY * TILE_SIZE;
    const fitZoom = Math.max(0.4, Math.min((width - padding * 2) / worldW, (height - padding * 2) / worldH, 1.8));
    const roundedZoom = Number(fitZoom.toFixed(2));
    const panX = Math.round((width - worldW * roundedZoom) / 2);
    const panY = Math.round((height - worldH * roundedZoom) / 2);

    onZoomChange(roundedZoom);
    onPanChange({ x: panX, y: panY });
  }, [state.sizeX, state.sizeY, onZoomChange, onPanChange]);

  // Initial auto-fit so the entire embark map fits into one frame at startup
  const initialFitDone = useRef(false);
  useEffect(() => {
    if (!initialFitDone.current && containerRef.current) {
      const timer = setTimeout(() => {
        handleFitWorld();
        initialFitDone.current = true;
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [handleFitWorld]);

  // Keyboard Navigation for Pan & Zoom (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const panStep = 32 / zoom;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        onPanChange({ x: pan.x, y: pan.y + panStep });
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        onPanChange({ x: pan.x, y: pan.y - panStep });
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        onPanChange({ x: pan.x + panStep, y: pan.y });
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        onPanChange({ x: pan.x - panStep, y: pan.y });
      } else if (e.key === '=' || e.key === '+') {
        onZoomChange(Math.min(3.0, zoom + 0.2));
      } else if (e.key === '-' || e.key === '_') {
        onZoomChange(Math.max(0.6, zoom - 0.2));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pan, zoom, onPanChange, onZoomChange]);

  // Main Canvas Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.scale(dpr, dpr);

    // Deep underground cavern darkness
    ctx.fillStyle = '#080706';
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Apply pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const { sizeX, sizeY, depthZ, tiles, dwarves, creatures, items, tick } = state;

    // Viewport Frustum Culling bounds for optimal 60 FPS on huge maps
    const canvasCssWidth = canvas.width / dpr;
    const canvasCssHeight = canvas.height / dpr;
    const minVisibleX = Math.max(0, Math.floor((-pan.x) / (TILE_SIZE * zoom)) - 1);
    const maxVisibleX = Math.min(sizeX - 1, Math.ceil((canvasCssWidth - pan.x) / (TILE_SIZE * zoom)) + 1);
    const minVisibleY = Math.max(0, Math.floor((-pan.y) / (TILE_SIZE * zoom)) - 1);
    const maxVisibleY = Math.min(sizeY - 1, Math.ceil((canvasCssHeight - pan.y) / (TILE_SIZE * zoom)) + 1);

    // Helper to check if an entity on lower Z is visible from above through open air
    const getEntityDepthAlpha = (ez: number, ex: number, ey: number) => {
      if (ez === currentZ) return 1.0;
      if (ez > currentZ) return 0; // Above current camera plane
      // Check if all tiles above ez up to currentZ are transparent air
      for (let z = ez + 1; z <= currentZ; z++) {
        if (tiles[z]?.[ey]?.[ex] && tiles[z][ey][ex].material !== 'air') {
          return 0; // Obscured by solid rock or ceiling
        }
      }
      const depthDelta = currentZ - ez;
      return Math.max(0.38, 1.0 - depthDelta * 0.16);
    };

    // Fog of War: helper to check if tile (tx, ty, tz) is adjacent to any revealed tile
    const isAdjacentToRevealed = (tx: number, ty: number, tz: number) => {
      const zTiles = tiles[tz];
      if (!zTiles) return false;
      return Boolean(
        zTiles[ty - 1]?.[tx]?.isRevealed ||
        zTiles[ty + 1]?.[tx]?.isRevealed ||
        zTiles[ty]?.[tx - 1]?.isRevealed ||
        zTiles[ty]?.[tx + 1]?.isRevealed ||
        zTiles[ty - 1]?.[tx - 1]?.isRevealed ||
        zTiles[ty - 1]?.[tx + 1]?.isRevealed ||
        zTiles[ty + 1]?.[tx - 1]?.isRevealed ||
        zTiles[ty + 1]?.[tx + 1]?.isRevealed ||
        (tz > 0 && tiles[tz - 1]?.[ty]?.[tx]?.isRevealed) ||
        (tz < depthZ - 1 && tiles[tz + 1]?.[ty]?.[tx]?.isRevealed)
      );
    };

    // 1. Multi-Z Continuous World Rendering with Authentic DF Fog of War
    // Displays the current Z-level and gazes down through open air columns to render lower terrain terraces and valleys seamlessly
    for (let y = minVisibleY; y <= maxVisibleY; y++) {
      for (let x = minVisibleX; x <= maxVisibleX; x++) {
        const posX = x * TILE_SIZE;
        const posY = y * TILE_SIZE;
        const currentTile = tiles[currentZ]?.[y]?.[x];
        const isRevealed = revealAll || Boolean(currentTile?.isRevealed);

        if (currentTile && currentTile.material !== 'air') {
          if (isRevealed) {
            // A. Current Z-Level Solid / Floor / Water Tile (Full Brightness)
            if (renderMode === 'graphic') {
              const neighbors = {
                north: tiles[currentZ]?.[y - 1]?.[x],
                south: tiles[currentZ]?.[y + 1]?.[x],
                east: tiles[currentZ]?.[y]?.[x + 1],
                west: tiles[currentZ]?.[y]?.[x - 1],
                northWest: tiles[currentZ]?.[y - 1]?.[x - 1],
                northEast: tiles[currentZ]?.[y - 1]?.[x + 1],
                southWest: tiles[currentZ]?.[y + 1]?.[x - 1],
                southEast: tiles[currentZ]?.[y + 1]?.[x + 1]
              };
              drawSteamTile(ctx, currentTile, posX, posY, neighbors, tick);
            } else {
              drawAsciiTile(ctx, currentTile, posX, posY);
            }

            // Stockpile boundary border
            if (currentTile.stockpile !== 'none') {
              ctx.strokeStyle = getStockpileBorderColor(currentTile.stockpile);
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 2]);
              ctx.strokeRect(posX + 1.5, posY + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
              ctx.setLineDash([]);
            }

            // Designation overlay (Mining, Chopping, Building)
            if (currentTile.designation !== 'none') {
              drawDesignationOverlay(ctx, currentTile.designation, posX, posY);
            }

            // DF-AI autonomous planned indicator
            const isAiPlanned = aiHighlights.some(h => h.x === x && h.y === y && h.z === currentZ);
            if (isAiPlanned) {
              ctx.save();
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1;
              ctx.strokeRect(posX + 2, posY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
              ctx.fillStyle = '#0284c7';
              ctx.font = '8px monospace';
              ctx.fillText('AI', posX + 3, posY + 9);
              ctx.restore();
            }
          } else {
            // Unrevealed tile: check if adjacent to any revealed tile
            const isAdjacent = isAdjacentToRevealed(x, y, currentZ);
            if (isAdjacent) {
              // Dimmed / muted presentation for tiles adjacent to the exploration boundary
              ctx.save();
              ctx.globalAlpha = 0.35;
              if (renderMode === 'graphic') {
                const neighbors = {
                  north: tiles[currentZ]?.[y - 1]?.[x],
                  south: tiles[currentZ]?.[y + 1]?.[x],
                  east: tiles[currentZ]?.[y]?.[x + 1],
                  west: tiles[currentZ]?.[y]?.[x - 1],
                  northWest: tiles[currentZ]?.[y - 1]?.[x - 1],
                  northEast: tiles[currentZ]?.[y - 1]?.[x + 1],
                  southWest: tiles[currentZ]?.[y + 1]?.[x - 1],
                  southEast: tiles[currentZ]?.[y + 1]?.[x + 1]
                };
                drawSteamTile(ctx, currentTile, posX, posY, neighbors, tick);
              } else {
                drawAsciiTile(ctx, currentTile, posX, posY);
              }
              // Dark shroud overlay to dim details
              ctx.fillStyle = 'rgba(10, 9, 8, 0.45)';
              ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
              ctx.restore();
            } else {
              // Hidden unrevealed tiles: solid dark color without details
              ctx.fillStyle = '#080706';
              ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
            }
          }
        } else {
          // B. Current Tile is Air
          if (isRevealed) {
            let lowerGroundZ = -1;
            for (let z = currentZ - 1; z >= 0; z--) {
              const candidate = tiles[z]?.[y]?.[x];
              if (candidate && candidate.material !== 'air') {
                lowerGroundZ = z;
                break;
              }
            }

            if (lowerGroundZ >= 0) {
              const lowerTile = tiles[lowerGroundZ][y][x];
              const isLowerRevealed = revealAll || Boolean(lowerTile.isRevealed);
              const depthDelta = currentZ - lowerGroundZ;

              if (isLowerRevealed) {
                if (renderMode === 'graphic') {
                  const lowerNeighbors = {
                    north: tiles[lowerGroundZ]?.[y - 1]?.[x],
                    south: tiles[lowerGroundZ]?.[y + 1]?.[x],
                    east: tiles[lowerGroundZ]?.[y]?.[x + 1],
                    west: tiles[lowerGroundZ]?.[y]?.[x - 1],
                    northWest: tiles[lowerGroundZ]?.[y - 1]?.[x - 1],
                    northEast: tiles[lowerGroundZ]?.[y - 1]?.[x + 1],
                    southWest: tiles[lowerGroundZ]?.[y + 1]?.[x - 1],
                    southEast: tiles[lowerGroundZ]?.[y + 1]?.[x + 1]
                  };
                  drawSteamTile(ctx, lowerTile, posX, posY, lowerNeighbors, tick);
                } else {
                  drawAsciiTile(ctx, lowerTile, posX, posY);
                }

                // Authentic DF depth fog overlay: darker the deeper the valley/terrace is
                const fogDarkness = Math.min(0.68, depthDelta * 0.15);
                ctx.fillStyle = `rgba(10, 9, 8, ${fogDarkness})`;
                ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
              } else if (isAdjacentToRevealed(x, y, lowerGroundZ)) {
                // Lower ground is adjacent to revealed: dimmed
                ctx.save();
                ctx.globalAlpha = 0.35;
                if (renderMode === 'graphic') {
                  const lowerNeighbors = {
                    north: tiles[lowerGroundZ]?.[y - 1]?.[x],
                    south: tiles[lowerGroundZ]?.[y + 1]?.[x],
                    east: tiles[lowerGroundZ]?.[y]?.[x + 1],
                    west: tiles[lowerGroundZ]?.[y]?.[x - 1],
                    northWest: tiles[lowerGroundZ]?.[y - 1]?.[x - 1],
                    northEast: tiles[lowerGroundZ]?.[y - 1]?.[x + 1],
                    southWest: tiles[lowerGroundZ]?.[y + 1]?.[x - 1],
                    southEast: tiles[lowerGroundZ]?.[y + 1]?.[x + 1]
                  };
                  drawSteamTile(ctx, lowerTile, posX, posY, lowerNeighbors, tick);
                } else {
                  drawAsciiTile(ctx, lowerTile, posX, posY);
                }
                const fogDarkness = Math.min(0.85, depthDelta * 0.18 + 0.3);
                ctx.fillStyle = `rgba(10, 9, 8, ${fogDarkness})`;
                ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
                ctx.restore();
              } else {
                ctx.fillStyle = '#080706';
                ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
              }
            } else {
              // Abyss / void beneath the world
              ctx.fillStyle = '#080706';
              ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
            }
          } else {
            // Unrevealed air column
            const isAirAdjacent = isAdjacentToRevealed(x, y, currentZ);
            ctx.fillStyle = isAirAdjacent ? '#141210' : '#080706';
            ctx.fillRect(posX, posY, TILE_SIZE, TILE_SIZE);
          }
        }
      }
    }

    // 2. World Items (Barrels, Logs, Boulders, Ores) - only drawn on revealed tiles unless revealAll
    for (const item of items) {
      if (!revealAll && !tiles[item.z]?.[item.y]?.[item.x]?.isRevealed) continue;
      const alpha = getEntityDepthAlpha(item.z, item.x, item.y);
      if (alpha > 0) {
        const px = item.x * TILE_SIZE;
        const py = item.y * TILE_SIZE;
        ctx.save();
        if (alpha < 1.0) ctx.globalAlpha = alpha;
        if (renderMode === 'graphic') {
          drawSteamItem(ctx, item, px, py);
        } else {
          drawAsciiItem(ctx, item, px, py);
        }
        ctx.restore();
      }
    }

    // 3. Creatures (War Dogs, Goblin Scouts) - only drawn on revealed tiles unless revealAll
    for (const creature of creatures) {
      if (!revealAll && !tiles[creature.z]?.[creature.y]?.[creature.x]?.isRevealed) continue;
      const alpha = getEntityDepthAlpha(creature.z, creature.x, creature.y);
      if (alpha > 0) {
        const px = creature.x * TILE_SIZE;
        const py = creature.y * TILE_SIZE;
        ctx.save();
        if (alpha < 1.0) ctx.globalAlpha = alpha;
        if (renderMode === 'graphic') {
          drawSteamCreature(ctx, creature, px, py);
        } else {
          drawAsciiCreature(ctx, creature, px, py);
        }
        ctx.restore();
      }
    }

    // 4. Dwarves
    for (const dwarf of dwarves) {
      const alpha = getEntityDepthAlpha(dwarf.z, dwarf.x, dwarf.y);
      if (alpha > 0) {
        const px = dwarf.x * TILE_SIZE;
        const py = dwarf.y * TILE_SIZE;
        const isSelected = dwarf.id === selectedDwarfId;

        ctx.save();
        if (alpha < 1.0) ctx.globalAlpha = alpha;

        if (renderMode === 'graphic') {
          drawSteamDwarf(ctx, dwarf, px, py, isSelected, tick);
        } else {
          drawAsciiDwarf(ctx, dwarf, px, py, isSelected);
        }

        // Path indicator if selected
        if (isSelected && dwarf.path && dwarf.path.length > 0) {
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 2]);
          ctx.beginPath();
          ctx.moveTo(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
          for (const step of dwarf.path) {
            if (step[2] === currentZ || (step[2] < currentZ && tiles[currentZ]?.[step[1]]?.[step[0]]?.material === 'air')) {
              ctx.lineTo(step[0] * TILE_SIZE + TILE_SIZE / 2, step[1] * TILE_SIZE + TILE_SIZE / 2);
            }
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.restore();
      }
    }

    // 5. Dwarven Embark Perimeter Frame
    const worldW = sizeX * TILE_SIZE;
    const worldH = sizeY * TILE_SIZE;
    ctx.save();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, worldW, worldH);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('╔', 2, 10);
    ctx.fillText('╗', worldW - 9, 10);
    ctx.fillText('╚', 2, worldH - 3);
    ctx.fillText('╝', worldW - 9, worldH - 3);
    ctx.restore();

    // 6. Subterranean Lantern Glow & Atmospheric Lighting (Graphic Mode)
    if (renderMode === 'graphic') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      // Lantern light around working/moving dwarves
      for (const dwarf of dwarves) {
        if (dwarf.z === currentZ) {
          const dx = dwarf.x * TILE_SIZE + TILE_SIZE / 2;
          const dy = dwarf.y * TILE_SIZE + TILE_SIZE / 2;
          const flicker = Math.sin(tick * 0.25 + dwarf.x * 2) * 3;
          const rad = 46 + flicker;
          const grad = ctx.createRadialGradient(dx, dy, 2, dx, dy, rad);
          grad.addColorStop(0, 'rgba(251, 191, 36, 0.22)'); // warm amber halo
          grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.08)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(dx, dy, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    // 7. Hover Highlight Reticle (Authentic DF Steam style corner brackets)
    if (hoveredTile && hoveredTile.z === currentZ) {
      const hx = hoveredTile.x * TILE_SIZE;
      const hy = hoveredTile.y * TILE_SIZE;

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      const bLen = 6;
      ctx.beginPath();
      // Top-left corner
      ctx.moveTo(hx, hy + bLen); ctx.lineTo(hx, hy); ctx.lineTo(hx + bLen, hy);
      // Top-right corner
      ctx.moveTo(hx + TILE_SIZE, hy + bLen); ctx.lineTo(hx + TILE_SIZE, hy); ctx.lineTo(hx + TILE_SIZE - bLen, hy);
      // Bottom-left corner
      ctx.moveTo(hx, hy + TILE_SIZE - bLen); ctx.lineTo(hx, hy + TILE_SIZE); ctx.lineTo(hx + bLen, hy + TILE_SIZE);
      // Bottom-right corner
      ctx.moveTo(hx + TILE_SIZE, hy + TILE_SIZE - bLen); ctx.lineTo(hx + TILE_SIZE, hy + TILE_SIZE); ctx.lineTo(hx + TILE_SIZE - bLen, hy + TILE_SIZE);
      ctx.stroke();

      ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
      ctx.fillRect(hx, hy, TILE_SIZE, TILE_SIZE);
    }

    ctx.restore();
  }, [state, currentZ, renderMode, zoom, pan, hoveredTile, selectedDwarfId]);

  useEffect(() => {
    render();
  }, [render]);

  // Coordinate Conversion Helper
  const getTileCoordsFromEvent = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = (clickX - pan.x) / zoom;
    const worldY = (clickY - pan.y) / zoom;

    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    if (tileX >= 0 && tileX < state.sizeX && tileY >= 0 && tileY < state.sizeY) {
      return { x: tileX, y: tileY, z: currentZ };
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Middle click, right click, or alt-click pans the camera
    if (e.button === 1 || e.button === 2 || e.altKey) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Left click
    const coords = getTileCoordsFromEvent(e);
    if (!coords) return;

    if (selectedTool === 'inspect') {
      const clickedDwarf = state.dwarves.find(
        d => d.x === coords.x && d.y === coords.y && d.z === coords.z
      );
      if (clickedDwarf) {
        onSelectDwarf(clickedDwarf);
        return;
      }
      const clickedTile = state.tiles[coords.z]?.[coords.y]?.[coords.x] || null;
      onSelectTile(clickedTile);
    } else {
      setIsDesignating(true);
      onApplyDesignation(coords.x, coords.y, coords.z, selectedTool);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      onPanChange({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
      return;
    }

    const coords = getTileCoordsFromEvent(e);
    setHoveredTile(coords);

    if (isDesignating && coords && selectedTool !== 'inspect') {
      onApplyDesignation(coords.x, coords.y, coords.z, selectedTool);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDesignating(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    onZoomChange(Math.max(0.6, Math.min(3.0, zoom + zoomDelta)));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0908] select-none cursor-crosshair"
      onContextMenu={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setIsDesignating(false);
          setHoveredTile(null);
        }}
        onWheel={handleWheel}
      />

      {/* Floating HUD: Tile Inspector & Cursor Info (Top-Left) */}
      {hoveredTile && (
        <div className="absolute top-3 left-3 pointer-events-none df-gold-frame rounded-md px-3 py-1.5 shadow-2xl backdrop-blur-sm text-xs font-mono text-stone-200 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-400 font-cinzel">
            <span>X:{hoveredTile.x}</span>
            <span>Y:{hoveredTile.y}</span>
            <span className="text-amber-300 font-bold">Z:{hoveredTile.z}</span>
          </div>
          <div className="h-3 w-px bg-[#5a4522]" />
          <div>
            <span className="text-stone-400 font-cinzel text-[11px]">{lang === 'ua' ? 'Блок: ' : 'Tile: '}</span>
            <span className="text-amber-300 font-bold uppercase tracking-wider">
              {(() => {
                const targetTile = state.tiles[hoveredTile.z]?.[hoveredTile.y]?.[hoveredTile.x];
                if (!revealAll && targetTile && !targetTile.isRevealed) {
                  return lang === 'ua' ? 'Нерозвідано' : 'Unrevealed';
                }
                return targetTile?.material || 'air';
              })()}
            </span>
          </div>
          {(() => {
            const targetTile = state.tiles[hoveredTile.z]?.[hoveredTile.y]?.[hoveredTile.x];
            if ((revealAll || targetTile?.isRevealed) && targetTile?.designation !== 'none') {
              return (
                <>
                  <div className="h-3 w-px bg-[#5a4522]" />
                  <div className="text-rose-400 font-bold">
                    ★ {targetTile?.designation}
                  </div>
                </>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Floating Canvas Controls (Bottom-Left) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 df-gold-frame rounded-md p-1 shadow-2xl backdrop-blur-sm text-xs font-mono text-stone-300 z-20">
        <button
          onClick={() => onZoomChange(Math.min(3.0, zoom + 0.2))}
          className="px-2 py-1 df-btn-bevel rounded text-stone-200 hover:text-amber-300 transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <span className="w-10 text-center font-mono text-[11px] text-amber-300">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => onZoomChange(Math.max(0.6, zoom - 0.2))}
          className="px-2 py-1 df-btn-bevel rounded text-stone-200 hover:text-amber-300 transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={handleFitWorld}
          className="px-2.5 py-1 df-btn-bevel rounded font-cinzel text-xs text-amber-200 hover:text-amber-100 transition-colors flex items-center gap-1 font-semibold"
          title={lang === 'ua' ? 'Вмістити весь світ на один кадр' : 'Fit entire map into screen frame'}
        >
          <span className="text-[13px] leading-none">⊡</span>
          <span>{lang === 'ua' ? 'Весь світ' : 'Fit World'}</span>
        </button>
        <button
          onClick={() => {
            onZoomChange(1.2);
            onPanChange({ x: 30, y: 30 });
          }}
          className="px-2 py-1 df-btn-bevel rounded font-cinzel text-xs text-stone-300 hover:text-amber-200 transition-colors"
          title="Reset Camera"
        >
          {lang === 'ua' ? 'Скидання' : 'Reset'}
        </button>
      </div>
    </div>
  );
};

// ================= CP437 ASCII Drawing Helpers =================

function drawAsciiTile(ctx: CanvasRenderingContext2D, tile: Tile, x: number, y: number) {
  let char = '·';
  let color = '#78716c';
  let bgColor = '#141210';

  switch (tile.material) {
    case 'floor_stone':
      char = '·';
      color = '#a8a29e';
      bgColor = '#1c1917';
      break;
    case 'floor_engraved':
      char = '☼';
      color = '#f59e0b';
      bgColor = '#292524';
      break;
    case 'floor_dirt':
      char = '░';
      color = '#b45309';
      bgColor = '#3a2818';
      break;
    case 'floor_wood':
      char = '=';
      color = '#d97706';
      bgColor = '#451a03';
      break;
    case 'grass':
      char = (tile.x + tile.y) % 3 === 0 ? '.' : (tile.x + tile.y) % 3 === 1 ? ',' : '`';
      color = '#22c55e';
      bgColor = '#14532d';
      break;
    case 'soil':
    case 'sand':
      char = '░';
      color = '#d97706';
      bgColor = '#451a03';
      break;
    case 'stone':
      char = '█';
      color = '#78716c';
      bgColor = '#292524';
      break;
    case 'granite':
      char = '█';
      color = '#94a3b8';
      bgColor = '#334155';
      break;
    case 'marble':
      char = '█';
      color = '#f1f5f9';
      bgColor = '#475569';
      break;
    case 'obsidian':
      char = '█';
      color = '#1e1b4b';
      bgColor = '#0f172a';
      break;
    case 'ore_iron':
      char = '£';
      color = '#ea580c';
      bgColor = '#7c2d12';
      break;
    case 'ore_gold':
      char = '$';
      color = '#fbbf24';
      bgColor = '#78350f';
      break;
    case 'ore_copper':
      char = '¢';
      color = '#f97316';
      bgColor = '#7c2d12';
      break;
    case 'ore_coal':
      char = '%';
      color = '#64748b';
      bgColor = '#1e293b';
      break;
    case 'ore_gem':
      char = '☼';
      color = '#38bdf8';
      bgColor = '#0c4a6e';
      break;
    case 'adamantine':
      char = '£';
      color = '#22d3ee';
      bgColor = '#164e63';
      break;
    case 'slade':
      char = '▓';
      color = '#c084fc';
      bgColor = '#090514';
      break;
    case 'magma':
      char = '≈';
      color = '#fbbf24';
      bgColor = '#7f1d1d';
      break;
    case 'cave_moss':
      char = ',';
      color = '#2dd4bf';
      bgColor = '#042f2e';
      break;
    case 'fungal_tree':
      char = 'T';
      color = '#c084fc';
      bgColor = '#2e1065';
      break;
    case 'water':
      char = '~';
      color = '#60a5fa';
      bgColor = '#1e3a8a';
      break;
    case 'tree_trunk':
      char = 'O';
      color = '#b45309';
      bgColor = '#451a03';
      break;
    case 'tree_foliage':
      char = '♠';
      color = '#16a34a';
      bgColor = '#14532d';
      break;
    case 'wall_constructed':
      char = '#';
      color = '#e2e8f0';
      bgColor = '#475569';
      break;
    case 'door_constructed':
      char = '+';
      color = '#f59e0b';
      bgColor = '#78350f';
      break;
    case 'bed':
      char = 'b';
      color = '#fbbf24';
      bgColor = '#451a03';
      break;
    case 'workshop_mason':
    case 'workshop_still':
      char = 'W';
      color = '#a855f7';
      bgColor = '#581c87';
      break;
    default:
      char = '?';
      color = '#a8a29e';
      bgColor = '#292524';
  }

  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = color;
  ctx.font = 'bold 16px "VT323", "Fira Code", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
}

function drawAsciiDwarf(
  ctx: CanvasRenderingContext2D,
  dwarf: DwarfEntity,
  x: number,
  y: number,
  isSelected: boolean
) {
  if (isSelected) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, TILE_SIZE + 2, TILE_SIZE + 2);
  }
  ctx.fillStyle = dwarf.color || '#f59e0b';
  ctx.font = 'bold 18px "Fira Code", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('☺', x + TILE_SIZE / 2, y + TILE_SIZE / 2);
}

function drawAsciiCreature(
  ctx: CanvasRenderingContext2D,
  creature: CreatureEntity,
  x: number,
  y: number
) {
  ctx.fillStyle = creature.color;
  ctx.font = 'bold 16px "Fira Code", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(creature.symbol, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
}

function drawAsciiItem(
  ctx: CanvasRenderingContext2D,
  item: WorldItem,
  x: number,
  y: number
) {
  let sym = '·';
  let col = '#a8a29e';
  switch (item.type) {
    case 'stone': sym = '*'; col = '#94a3b8'; break;
    case 'wood': sym = '='; col = '#b45309'; break;
    case 'ore_iron':
    case 'ore_gold': sym = '$'; col = '#f59e0b'; break;
    case 'food': sym = '%'; col = '#ec4899'; break;
    case 'ale': sym = 'o'; col = '#fbbf24'; break;
  }
  ctx.fillStyle = col;
  ctx.font = '14px "Fira Code", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sym, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
}

function drawDesignationOverlay(
  ctx: CanvasRenderingContext2D,
  designation: DesignationType,
  x: number,
  y: number
) {
  let color = 'rgba(239, 68, 68, 0.45)'; // red for mine
  let symbol = '⛏';

  if (designation === 'chop') {
    color = 'rgba(34, 197, 94, 0.45)';
    symbol = '🪓';
  } else if (designation.startsWith('build_')) {
    color = 'rgba(56, 189, 248, 0.45)';
    symbol = '🔨';
  }

  ctx.fillStyle = color;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
}

function getStockpileBorderColor(stockpile: StockpileType): string {
  switch (stockpile) {
    case 'food': return '#f43f5e';
    case 'wood': return '#d97706';
    case 'stone': return '#94a3b8';
    case 'ore': return '#fbbf24';
    default: return '#a8a29e';
  }
}
