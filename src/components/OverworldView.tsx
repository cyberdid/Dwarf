import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Globe,
  Compass,
  Shield,
  Swords,
  BookOpen,
  MapPin,
  Mountain,
  Search,
  ArrowRight,
  RotateCcw,
  Users,
  Coins,
  Package
} from 'lucide-react';
import {
  OverworldState,
  WorldMapTile,
  WorldCivilization,
  WorldLegend,
  WorldExpedition,
  FortressState
} from '../types/simulation';
import {
  BIOME_METADATA,
  dispatchExpedition,
  regenerateOverworld
} from '../engine/overworldGen';
import { FORTRESS_SIZE_PRESETS } from '../engine/worldGen';

interface OverworldViewProps {
  overworld: OverworldState;
  onUpdateOverworld: (newOverworld: OverworldState) => void;
  fortressState: FortressState;
  onEmbarkAtTile: (tile: WorldMapTile, presetKey: keyof typeof FORTRESS_SIZE_PRESETS) => void;
  onClose: () => void;
  initialTab?: 'map' | 'expeditions' | 'legends' | 'civilizations';
}

export const OverworldView: React.FC<OverworldViewProps> = ({
  overworld,
  onUpdateOverworld,
  fortressState,
  onEmbarkAtTile,
  onClose,
  initialTab = 'map'
}) => {
  const currentEmbark = overworld.currentEmbarkCoords ?? (overworld as any).playerFortressLocation ?? { x: 32, y: 32 };
  const initialTile = overworld.tiles?.[currentEmbark.y]?.[currentEmbark.x] || overworld.tiles?.[0]?.[0] || null;

  const [selectedTile, setSelectedTile] = useState<WorldMapTile | null>(initialTile);
  const [activeTab, setActiveTab] = useState<'map' | 'expeditions' | 'legends' | 'civilizations'>(initialTab);
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof FORTRESS_SIZE_PRESETS>('standard');
  const [expeditionType, setExpeditionType] = useState<'trade' | 'raid' | 'scout'>('trade');
  const [selectedCivId, setSelectedCivId] = useState<string>(overworld.civilizations?.[0]?.id || '');
  const [filterLegendCategory, setFilterLegendCategory] = useState<string>('all');
  const [hoverTileInfo, setHoverTileInfo] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const expeditions: WorldExpedition[] = overworld.expeditions ?? (overworld as any).activeExpeditions ?? [];
  const sizeX = overworld.sizeX ?? (overworld as any).width ?? overworld.tiles?.[0]?.length ?? 64;
  const sizeY = overworld.sizeY ?? (overworld as any).height ?? overworld.tiles?.length ?? 64;

  // Render Overworld 2D Canvas Map
  const renderOverworld = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tiles = overworld.tiles;
    if (!tiles || tiles.length === 0) return;

    const currentX = overworld.currentEmbarkCoords?.x ?? (overworld as any).playerFortressLocation?.x ?? 32;
    const currentY = overworld.currentEmbarkCoords?.y ?? (overworld as any).playerFortressLocation?.y ?? 32;
    const mapWidth = overworld.sizeX ?? (overworld as any).width ?? tiles[0]?.length ?? 64;
    const mapHeight = overworld.sizeY ?? (overworld as any).height ?? tiles.length ?? 64;
    const tileSize = 9; // 64 * 9 = 576px clean map

    canvas.width = mapWidth * tileSize;
    canvas.height = mapHeight * tileSize;

    // Draw Biomes & Rivers
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = tiles[y]?.[x];
        if (!tile) continue;

        const px = x * tileSize;
        const py = y * tileSize;

        if (tile.hasRiver || (tile as any).isRiver) {
          ctx.fillStyle = '#38bdf8';
        } else {
          const meta = BIOME_METADATA[tile.biome];
          ctx.fillStyle = meta?.color || '#334155';
        }
        ctx.fillRect(px, py, tileSize, tileSize);

        // Grid faint scanline
        ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.strokeRect(px, py, tileSize, tileSize);

        // Render site markers
        const site = tile.site;
        if (site || (tile as any).hasSite) {
          const siteType = site?.type ?? (tile as any).siteType;
          if (siteType === 'dwarf_mountainhall' || siteType === 'fortress' || siteType === 'dwarf_fortress') {
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
          } else if (siteType === 'human_town') {
            ctx.fillStyle = '#60a5fa';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
          } else if (siteType === 'elf_retreat') {
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(px + tileSize / 2, py + tileSize / 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (siteType === 'goblin_pit' || siteType === 'necromancer_tower') {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
          } else {
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
          }
        }
      }
    }

    // Highlight Player Fortress Location with animated target reticle
    const pfx = currentX * tileSize;
    const pfy = currentY * tileSize;
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.strokeRect(pfx - 2, pfy - 2, tileSize + 4, tileSize + 4);
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(pfx + tileSize / 2, pfy + tileSize / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Highlight Selected Tile
    if (selectedTile) {
      const sx = selectedTile.x * tileSize;
      const sy = selectedTile.y * tileSize;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 1, sy - 1, tileSize + 2, tileSize + 2);
    }
  }, [overworld, selectedTile]);

  useEffect(() => {
    renderOverworld();
  }, [renderOverworld]);

  // Click on Canvas to pick tile
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const tileSize = 9;

    const tileX = Math.floor(clickX / tileSize);
    const tileY = Math.floor(clickY / tileSize);

    const mapWidth = overworld.sizeX ?? (overworld as any).width ?? 64;
    const mapHeight = overworld.sizeY ?? (overworld as any).height ?? 64;

    if (tileX >= 0 && tileX < mapWidth && tileY >= 0 && tileY < mapHeight) {
      const tile = overworld.tiles?.[tileY]?.[tileX];
      if (tile) setSelectedTile(tile);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const tileSize = 9;

    const tileX = Math.floor(clickX / tileSize);
    const tileY = Math.floor(clickY / tileSize);
    const mapWidth = overworld.sizeX ?? (overworld as any).width ?? 64;
    const mapHeight = overworld.sizeY ?? (overworld as any).height ?? 64;

    if (tileX >= 0 && tileX < mapWidth && tileY >= 0 && tileY < mapHeight) {
      setHoverTileInfo({ x: tileX, y: tileY });
    }
  };

  // Launch New Expedition
  const handleLaunchExpedition = () => {
    if (!selectedTile) return;
    const targetCiv = overworld.civilizations?.find(c => c.id === selectedCivId) || overworld.civilizations?.[0];
    const availableDwarves = fortressState.dwarves ? fortressState.dwarves.slice(0, 3).map(d => d.id) : 3;

    const targetSiteName = selectedTile.site?.name || (selectedTile as any).siteNameEn || selectedTile.name || `Регіон ${selectedTile.biome}`;

    const updated = dispatchExpedition(
      overworld,
      expeditionType,
      { x: selectedTile.x, y: selectedTile.y },
      targetSiteName,
      targetCiv ? targetCiv.id : null,
      availableDwarves
    );

    onUpdateOverworld(updated);
  };

  // Reroll world
  const handleRegenerateWorld = () => {
    const nextSeed = Math.floor(Math.random() * 999999);
    const newWorld = regenerateOverworld(nextSeed);
    onUpdateOverworld(newWorld);
    const embarkY = newWorld.currentEmbarkCoords?.y ?? (newWorld as any).playerFortressLocation?.y ?? 32;
    const embarkX = newWorld.currentEmbarkCoords?.x ?? (newWorld as any).playerFortressLocation?.x ?? 32;
    setSelectedTile(newWorld.tiles?.[embarkY]?.[embarkX] || null);
  };

  const selectedMeta = selectedTile ? BIOME_METADATA[selectedTile.biome] : null;

  const filteredLegends = (overworld.legends || []).filter(l => {
    if (filterLegendCategory === 'all') return true;
    const lType = l.type ?? (l as any).category;
    if (filterLegendCategory === lType) return true;
    if (filterLegendCategory === 'battle' && lType === 'war') return true;
    if (filterLegendCategory === 'megabeast' && (lType === 'titan' || lType === 'beast')) return true;
    if (filterLegendCategory === 'historical' && lType === 'founding') return true;
    return false;
  });

  const worldTitle = overworld.name || (overworld as any).worldNameEn || 'Світ Дварфів';
  const worldSubtitle = (overworld as any).worldNameUa || `Seed: ${overworld.seed}`;
  const yearInfo = (overworld as any).worldYear ?? fortressState.year ?? 105;

  const tileSite = selectedTile?.site;
  const siteDisplayName = tileSite?.name ?? (selectedTile as any)?.siteNameEn ?? selectedTile?.name ?? 'Дикі Землі';

  let tempLabel = 'Помірний';
  if (selectedTile) {
    if (typeof selectedTile.temperature === 'string') {
      switch (selectedTile.temperature) {
        case 'freezing': tempLabel = 'Крижаний (Freezing)'; break;
        case 'cold': tempLabel = 'Морозний (Cold)'; break;
        case 'temperate': tempLabel = 'Помірний (Temperate)'; break;
        case 'warm': tempLabel = 'Теплий (Warm)'; break;
        case 'scorching': tempLabel = 'Спекотний (Scorching)'; break;
        default: tempLabel = selectedTile.temperature; break;
      }
    } else if (typeof selectedTile.temperature === 'number') {
      tempLabel = (selectedTile.temperature as number) > 75 ? 'Спекотний' : (selectedTile.temperature as number) < 35 ? 'Морозний' : 'Помірний';
    }
  }

  const hasRiver = selectedTile ? Boolean(selectedTile.hasRiver ?? (selectedTile as any).isRiver) : false;

  let evilText = 'Благословенний / Спокійний';
  let evilClass = 'text-emerald-400';
  if (selectedTile) {
    if (selectedTile.evilness === 'evil' || (typeof selectedTile.evilness === 'number' && (selectedTile.evilness as number) > 70)) {
      evilText = 'Проклятий / Порочний';
      evilClass = 'text-purple-400';
    } else if (selectedTile.evilness === 'neutral' || (typeof selectedTile.evilness === 'number' && (selectedTile.evilness as number) > 40)) {
      evilText = 'Неспокійний / Нейтральний';
      evilClass = 'text-amber-400';
    }
  }

  return (
    <div
      id="overworld-view-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-6"
    >
      <div
        id="overworld-container"
        className="relative flex flex-col w-full max-w-6xl h-[92vh] bg-stone-900 border border-amber-900/60 rounded-xl shadow-2xl overflow-hidden text-stone-200"
      >
        {/* Header bar */}
        <div
          id="overworld-header"
          className="flex items-center justify-between px-6 py-4 bg-stone-950 border-b border-amber-900/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-950/60 border border-amber-600/40 rounded-lg text-amber-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wide text-amber-200 font-serif">
                  {worldTitle}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/40 text-amber-400 font-mono">
                  {worldSubtitle}
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono">
                {(overworld as any).currentEraEn ? `${(overworld as any).currentEraEn} • ` : 'Вік Міфів • '}Рік {yearInfo} • {sizeX}×{sizeY} Регіонів Світу ({sizeX * sizeY} Ембарк-земель)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Navigation Tabs */}
            <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-1">
              <button
                id="tab-overworld-map"
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeTab === 'map'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Карта Світу
              </button>
              <button
                id="tab-overworld-expeditions"
                onClick={() => setActiveTab('expeditions')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeTab === 'expeditions'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                Експедиції ({expeditions.length})
              </button>
              <button
                id="tab-overworld-civs"
                onClick={() => setActiveTab('civilizations')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeTab === 'civilizations'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Цивілізації ({overworld.civilizations?.length || 0})
              </button>
              <button
                id="tab-overworld-legends"
                onClick={() => setActiveTab('legends')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeTab === 'legends'
                    ? 'bg-amber-600 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Хроніки Легенд ({overworld.legends?.length || 0})
              </button>
            </div>

            <button
              id="btn-reroll-world"
              onClick={handleRegenerateWorld}
              title="Перегенерувати новий світ (Seed)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded-lg hover:bg-amber-900/50 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Новий Світ
            </button>

            <button
              id="btn-close-overworld"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition"
            >
              Закрити ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* TAB 1: CONTINENTAL MAP VIEW */}
          {activeTab === 'map' && (
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column: Overworld Canvas Map */}
              <div className="flex flex-col items-center justify-center p-6 bg-stone-950/70 flex-1 border-r border-stone-800 overflow-auto">
                <div className="relative border-4 border-amber-950/80 rounded-lg shadow-2xl p-1 bg-black">
                  <canvas
                    id="overworld-map-canvas"
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMouseMove}
                    className="cursor-crosshair rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* Map Legend Overlay */}
                  <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-stone-950/85 backdrop-blur-sm border border-stone-800 rounded text-[11px] font-mono text-stone-300">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      Фортеця гравця
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-sky-400 inline-block"></span>
                      Місто людей
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-red-500 inline-block"></span>
                      Лігво гоблінів
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-emerald-400 inline-block"></span>
                      Ельфи
                    </span>
                  </div>
                </div>

                {hoverTileInfo && (
                  <p className="mt-3 text-xs text-stone-400 font-mono">
                    Координати курсору: X: {hoverTileInfo.x}, Y: {hoverTileInfo.y}
                  </p>
                )}
              </div>

              {/* Right Column: Selected Embark Region Dossier */}
              <div className="w-96 p-6 bg-stone-900 overflow-y-auto flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-amber-200">
                        {siteDisplayName}
                      </h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-400 font-mono">
                      X:{selectedTile?.x} Y:{selectedTile?.y}
                    </span>
                  </div>

                  {selectedTile && selectedMeta && (
                    <div className="mt-4 space-y-4">
                      {/* Biome Overview Card */}
                      <div className="p-3 rounded-lg bg-stone-950/70 border border-stone-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-stone-400">Біом:</span>
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded text-stone-100"
                            style={{ backgroundColor: selectedMeta.color }}
                          >
                            {selectedMeta.nameUa} ({selectedMeta.nameEn})
                          </span>
                        </div>
                        <p className="text-xs text-stone-300 italic mt-2">
                          "{selectedMeta.descriptionUa}"
                        </p>
                      </div>

                      {/* Geological & Environmental Attributes */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/80">
                          <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-mono">
                            Висота над рівнем моря
                          </span>
                          <span className="font-bold text-stone-200 font-mono text-sm">
                            {selectedTile.elevation}м (Z-поверхня)
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/80">
                          <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-mono">
                            Клімат / Температура
                          </span>
                          <span className="font-bold text-stone-200 font-mono text-sm">
                            {tempLabel}
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/80">
                          <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-mono">
                            Опади & Вологість
                          </span>
                          <span className="font-bold text-stone-200 font-mono text-sm">
                            {selectedTile.rainfall}%
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/80">
                          <span className="text-stone-500 block text-[10px] uppercase tracking-wider font-mono">
                            Річка / Водойма
                          </span>
                          <span className="font-bold text-sky-400 font-mono text-sm">
                            {hasRiver ? 'Повноводна річка' : 'Суходоли'}
                          </span>
                        </div>
                      </div>

                      {/* Evilness / Sinister indicator */}
                      <div className="p-2.5 rounded bg-stone-950/50 border border-stone-800/80 text-xs flex items-center justify-between">
                        <span className="text-stone-400">Ступінь Зла (Evilness):</span>
                        <span className={`font-mono font-bold ${evilClass}`}>
                          {evilText}
                        </span>
                      </div>

                      {/* Site Information */}
                      {(tileSite || (selectedTile as any).hasSite) && (
                        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-amber-400" />
                            <h4 className="text-xs font-bold text-amber-200">
                              Поселення: {siteDisplayName}
                            </h4>
                          </div>
                          <p className="text-xs text-stone-300">
                            Тип: <span className="font-semibold text-amber-300">{tileSite?.type ?? (selectedTile as any).siteType ?? 'Поселення'}</span>
                          </p>
                          {tileSite?.civName && (
                            <p className="text-xs text-stone-400 mt-1">
                              Цивілізація: <span className="text-stone-300">{tileSite.civName}</span>
                            </p>
                          )}
                          {tileSite?.population !== undefined && (
                            <p className="text-xs text-stone-400">
                              Населення: <span className="text-amber-300 font-mono">{tileSite.population}</span>
                            </p>
                          )}
                          {tileSite?.leader && (
                            <p className="text-xs text-stone-400">
                              Правитель: <span className="text-stone-300">{tileSite.leader}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* EMBARK SIZE SELECTOR */}
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-amber-300 mb-1.5">
                          Масштаб 3D-Фортеці (Embark Size):
                        </label>
                        <select
                          id="select-embark-preset"
                          value={selectedPreset}
                          onChange={(e) => setSelectedPreset(e.target.value as keyof typeof FORTRESS_SIZE_PRESETS)}
                          className="w-full bg-stone-950 border border-amber-900/60 rounded px-3 py-2 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500"
                        >
                          {Object.entries(FORTRESS_SIZE_PRESETS).map(([key, p]) => (
                            <option key={key} value={key}>
                              {p.nameUa} — {p.sizeX * p.sizeY * p.depthZ} блоків
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-stone-400 mt-1">
                          Глибина включає Море Магми, 3 рівні Печер та Адамантинові Шпилі.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action: Embark Here or Send Expedition */}
                <div className="mt-6 space-y-2 pt-4 border-t border-stone-800">
                  <button
                    id="btn-embark-location"
                    onClick={() => selectedTile && onEmbarkAtTile(selectedTile, selectedPreset)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-stone-950 font-bold rounded-lg shadow-lg transition"
                  >
                    <Mountain className="w-4 h-4" />
                    Заснувати Фортецю Тут (Embark)
                  </button>
                  <button
                    id="btn-switch-to-expedition"
                    onClick={() => setActiveTab('expeditions')}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs rounded-lg transition"
                  >
                    <Swords className="w-3.5 h-3.5 text-amber-400" />
                    Відправити Експедицію в цей сектор
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EXPEDITIONS DISPATCH & MANAGEMENT */}
          {activeTab === 'expeditions' && (
            <div className="flex flex-1 p-6 gap-6 overflow-y-auto">
              {/* Left Form: Dispatch New Expedition */}
              <div className="w-1/2 p-5 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-800 mb-4">
                    <Compass className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-amber-200">
                      Спорядити Нову Експедицію
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Mission Type */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-2">
                        Мета Експедиції:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setExpeditionType('trade')}
                          className={`p-3 rounded-lg border text-left transition ${
                            expeditionType === 'trade'
                              ? 'bg-amber-950/70 border-amber-500 text-amber-200'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-850'
                          }`}
                        >
                          <Coins className="w-4 h-4 mb-1 text-amber-400" />
                          <div className="text-xs font-bold">Торгівля</div>
                          <div className="text-[10px] text-stone-400">Обмін припасами</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpeditionType('raid')}
                          className={`p-3 rounded-lg border text-left transition ${
                            expeditionType === 'raid'
                              ? 'bg-red-950/70 border-red-500 text-red-200'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-850'
                          }`}
                        >
                          <Swords className="w-4 h-4 mb-1 text-red-400" />
                          <div className="text-xs font-bold">Набіг</div>
                          <div className="text-[10px] text-stone-400">Штурм лігва</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpeditionType('scout')}
                          className={`p-3 rounded-lg border text-left transition ${
                            expeditionType === 'scout'
                              ? 'bg-sky-950/70 border-sky-500 text-sky-200'
                              : 'bg-stone-900 border-stone-800 text-stone-400 hover:bg-stone-850'
                          }`}
                        >
                          <Search className="w-4 h-4 mb-1 text-sky-400" />
                          <div className="text-xs font-bold">Розвідка</div>
                          <div className="text-[10px] text-stone-400">Пошук руїн</div>
                        </button>
                      </div>
                    </div>

                    {/* Destination */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Цільовий регіон призначення:
                      </label>
                      <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-amber-300">
                            {siteDisplayName}
                          </span>
                          <span className="text-stone-400 block text-[11px]">
                            {selectedTile ? (BIOME_METADATA[selectedTile.biome]?.nameUa || selectedTile.biome) : 'Обрано на карті'}
                          </span>
                        </div>
                        <button
                          onClick={() => setActiveTab('map')}
                          className="px-2.5 py-1 text-xs text-amber-400 hover:bg-stone-800 rounded transition font-mono"
                        >
                          Змінити на карті →
                        </button>
                      </div>
                    </div>

                    {/* Target Civ */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Контактна Цивілізація:
                      </label>
                      <select
                        value={selectedCivId}
                        onChange={(e) => setSelectedCivId(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500"
                      >
                        {(overworld.civilizations || []).map(c => {
                          const civName = (c as any).nameEn ?? c.name;
                          const diplomacy = (c as any).diplomacyWithPlayer ?? c.relation ?? 'neutral';
                          return (
                            <option key={c.id} value={c.id}>
                              {civName} ({c.race} — {diplomacy})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Assigned Dwarven Squad */}
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                        Призначений загін гномів:
                      </label>
                      <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-stone-300">
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-amber-400" />
                            Гвардія фортеці:
                          </span>
                          <span className="font-mono font-bold text-amber-300">3 ветерани</span>
                        </div>
                        <p className="text-[11px] text-stone-400">
                          {fortressState.dwarves ? fortressState.dwarves.slice(0, 3).map(d => d.name).join(', ') : 'Загін фортеці'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  id="btn-dispatch-expedition"
                  onClick={handleLaunchExpedition}
                  className="w-full mt-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm rounded-lg shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <ArrowRight className="w-4 h-4" />
                  Відправити Караван у Дорогу
                </button>
              </div>

              {/* Right List: Active Expeditions */}
              <div className="w-1/2 p-5 bg-stone-950/70 border border-stone-800 rounded-xl flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-amber-200">
                      Активні Експедиції ({expeditions.length})
                    </h3>
                  </div>
                </div>

                {expeditions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-500">
                    <Compass className="w-12 h-12 mb-3 text-stone-600" />
                    <p className="text-sm font-semibold text-stone-400">
                      Наразі всі каравани та загони перебувають у фортеці.
                    </p>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs">
                      Оберіть ціль на карті та спорядіть загін для торгівлі, набігу або пошуку скарбів.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto">
                    {expeditions.map(exp => {
                      const destName = exp.targetSiteName ?? (exp as any).destinationName ?? 'Невідомо';
                      const dwarfs = exp.dwarvesCount ?? (exp as any).assignedDwarfIds?.length ?? 3;
                      const ticksRem = exp.ticksRemaining;
                      const ticksTot = exp.ticksTotal || 1;
                      const progressPct = Math.min(100, Math.max(5, Math.round(((ticksTot - (ticksRem ?? 0)) / ticksTot) * 100)));
                      const loot = exp.lootSummaryUa || exp.lootSummaryEn || ((exp as any).lootGained?.length ? (exp as any).lootGained.join(', ') : null);

                      return (
                        <div
                          key={exp.id}
                          className="p-4 bg-stone-900 border border-stone-800 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                                  exp.type === 'trade'
                                    ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                                    : exp.type === 'raid'
                                    ? 'bg-red-950 text-red-400 border border-red-800/40'
                                    : 'bg-sky-950 text-sky-400 border border-sky-800/40'
                                }`}
                              >
                                {exp.type}
                              </span>
                              <span className="font-bold text-stone-200 text-xs">
                                {destName}
                              </span>
                            </div>
                            <span className="text-xs font-mono text-stone-400">
                              Залишилось: {ticksRem !== undefined ? `${ticksRem} кроків` : `${(exp as any).returnDay ?? 0} дн.`}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-stone-950 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-stone-400">
                            <span>Статус: <span className="text-amber-300 font-medium">{exp.status}</span></span>
                            <span>Загін: {dwarfs} гномів</span>
                          </div>

                          {loot && (
                            <div className="p-2 bg-stone-950 rounded text-[11px] text-emerald-400 border border-emerald-900/30">
                              Здобуто трофеїв: {loot}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CIVILIZATIONS */}
          {activeTab === 'civilizations' && (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(overworld.civilizations || []).map(civ => {
                  const relation = (civ as any).diplomacyWithPlayer ?? civ.relation ?? 'neutral';
                  const leaderName = (civ as any).leaderName ?? civ.leader ?? 'Невідомий';
                  const nameMain = (civ as any).nameEn ?? civ.name;
                  const nameSub = (civ as any).nameUa ?? civ.descriptionUa ?? civ.name;

                  const isHostile = relation === 'at_war' || relation === 'hostile' || relation === 'war';
                  const isFriendly = relation === 'allied' || relation === 'friendly';

                  return (
                    <div
                      key={civ.id}
                      className="p-5 bg-stone-950/70 border border-stone-800 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-amber-200 text-sm">
                            {nameMain}
                          </h4>
                          <span className="text-xs text-stone-400 font-mono">
                            {nameSub}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded font-mono ${
                            isFriendly
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isHostile
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {String(relation).toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2 bg-stone-900 rounded border border-stone-800">
                          <span className="text-stone-500 block text-[10px]">Раса</span>
                          <span className="font-bold text-stone-200 capitalize">{civ.race}</span>
                        </div>
                        <div className="p-2 bg-stone-900 rounded border border-stone-800">
                          <span className="text-stone-500 block text-[10px]">Правитель</span>
                          <span className="font-bold text-amber-300">{leaderName}</span>
                        </div>
                        <div className="p-2 bg-stone-900 rounded border border-stone-800">
                          <span className="text-stone-500 block text-[10px]">Поселень</span>
                          <span className="font-bold text-stone-200 font-mono">{civ.sitesCount}</span>
                        </div>
                      </div>
                      {civ.descriptionEn && (
                        <p className="text-xs text-stone-400 mt-2 italic">
                          "{civ.descriptionEn}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: WORLD LEGENDS & HISTORICAL CHRONOLOGY */}
          {activeTab === 'legends' && (
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-bold text-amber-200 font-serif">
                    Хроніки та Легенди Світу (Legends Mode)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">Фільтр:</span>
                  <select
                    value={filterLegendCategory}
                    onChange={(e) => setFilterLegendCategory(e.target.value)}
                    className="bg-stone-950 border border-stone-800 rounded px-2.5 py-1 text-xs font-mono text-stone-300"
                  >
                    <option value="all">Усі події ({(overworld.legends || []).length})</option>
                    <option value="founding">Заснування (Founding)</option>
                    <option value="war">Битви & Війни (War)</option>
                    <option value="artifact">Артефакти (Artifacts)</option>
                    <option value="titan">Титани (Titans)</option>
                    <option value="beast">Чудовиська (Beasts)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredLegends.map(legend => {
                  const legType = legend.type ?? (legend as any).category ?? 'legend';
                  const legText = legend.textUa ?? (legend as any).descriptionUa ?? legend.textEn;
                  const legTitle = legend.titleUa ? `${legend.titleEn} (${legend.titleUa})` : legend.titleEn;

                  return (
                    <div
                      key={legend.id}
                      className="p-4 bg-stone-950/70 border border-stone-800 rounded-lg hover:border-amber-900/60 transition flex items-start gap-4"
                    >
                      <div className="px-2.5 py-1 rounded bg-stone-900 border border-stone-800 font-mono font-bold text-amber-400 text-xs shrink-0">
                        Рік {legend.year}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-stone-200">
                            {legTitle}
                          </span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-stone-800 text-amber-400">
                            {legType}
                          </span>
                        </div>
                        <p className="text-xs text-stone-400 leading-relaxed">
                          {legText}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
