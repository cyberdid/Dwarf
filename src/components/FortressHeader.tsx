/**
 * Authentic Dwarf Fortress Steam Edition Top Bar
 * Recreated meticulously with site heraldry, 7-tiered mood smileys,
 * official DF stocks gauges, moon phase, and medieval calendar.
 */

import React from 'react';
import { FortressState, DwarfMood } from '../types/simulation';
import {
  Play,
  Pause,
  FastForward,
  RotateCcw,
  UserPlus,
  Package,
  Eye,
  FileCode2,
  Cpu,
  Globe,
  HelpCircle,
  Sparkles,
  Save,
  Download,
  Upload,
  Mountain
} from 'lucide-react';

interface FortressHeaderProps {
  state: FortressState;
  currentZ: number;
  maxZ: number;
  isRunning: boolean;
  speed: number;
  renderMode: 'ascii' | 'graphic' | 'isometric';
  activeTab: 'simulation' | 'raw_explorer' | 'analysis' | 'pixel_codex';
  revealAll?: boolean;
  lang: 'en' | 'ua';
  hasSavedGame?: boolean;
  onTogglePlay: () => void;
  onStepTick: () => void;
  onChangeSpeed: (speed: number) => void;
  onChangeZ: (delta: number) => void;
  onToggleRenderMode: () => void;
  onToggleRevealAll?: () => void;
  onSwitchTab: (tab: 'simulation' | 'raw_explorer' | 'analysis' | 'pixel_codex') => void;
  onToggleLang: () => void;
  onAddDwarf: () => void;
  onRegenerateWorld: () => void;
  onOpenStocks: () => void;
  onOpenOverworld?: () => void;
  onOpenHelp?: () => void;
  onSaveFortress?: () => void;
  onLoadFortress?: () => void;
  onExportFortress?: () => void;
}

export const FortressHeader: React.FC<FortressHeaderProps> = ({
  state,
  isRunning,
  speed,
  renderMode,
  activeTab,
  revealAll = false,
  lang,
  hasSavedGame = false,
  onSaveFortress,
  onLoadFortress,
  onExportFortress,
  onTogglePlay,
  onStepTick,
  onChangeSpeed,
  onToggleRenderMode,
  onToggleRevealAll,
  onSwitchTab,
  onToggleLang,
  onAddDwarf,
  onRegenerateWorld,
  onOpenStocks,
  onOpenOverworld,
  onOpenHelp
}) => {
  // Group dwarves into the 7 official Dwarf Fortress emotional mood tiers
  const moodCounts = {
    ecstatic: 0,
    happy: 0,
    content: 0,
    fine: 0,
    stressed: 0,
    sad: 0,
    tantrum: 0
  };

  state.dwarves.forEach(d => {
    if (d.happinessScore >= 88 || d.mood === 'ecstatic') moodCounts.ecstatic++;
    else if (d.happinessScore >= 75 || d.mood === 'happy') moodCounts.happy++;
    else if (d.happinessScore >= 60 || d.mood === 'content') moodCounts.content++;
    else if (d.happinessScore >= 45 || d.mood === 'fine') moodCounts.fine++;
    else if (d.happinessScore >= 30 || d.mood === 'stressed') moodCounts.stressed++;
    else if (d.happinessScore >= 15 || d.mood === 'melancholy') moodCounts.sad++;
    else moodCounts.tantrum++;
  });

  // Authentic DF Months per Season
  const getDfMonth = (season: string, day: number) => {
    if (season === 'Spring') {
      if (day <= 10) return 'Granite';
      if (day <= 20) return 'Slate';
      return 'Felsite';
    } else if (season === 'Summer') {
      if (day <= 10) return 'Hematite';
      if (day <= 20) return 'Malachite';
      return 'Galena';
    } else if (season === 'Autumn') {
      if (day <= 10) return 'Limestone';
      if (day <= 20) return 'Sandstone';
      return 'Timber';
    } else {
      if (day <= 10) return 'Moonstone';
      if (day <= 20) return 'Opal';
      return 'Obsidian';
    }
  };

  const monthName = getDfMonth(state.season, state.day);
  const dayOrdinal = `${state.day}${state.day === 1 ? 'st' : state.day === 2 ? 'nd' : state.day === 3 ? 'rd' : 'th'}`;

  // Season Display text
  const seasonText =
    state.day <= 10
      ? `Early ${state.season}`
      : state.day <= 20
      ? `Mid ${state.season}`
      : `Late ${state.season}`;

  return (
    <header className="bg-[#1a1208] border-b-2 border-[#8c784c] text-[#f2e8d5] select-none shadow-2xl z-30 shrink-0">
      {/* Top Utility & Navigation Tier */}
      <div className="px-3 py-1 bg-[#140e06] border-b border-[#3d321d] flex items-center justify-between text-xs font-mono">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => onSwitchTab('simulation')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel tracking-wider ${
                activeTab === 'simulation'
                  ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold shadow-md border border-[#bea067]'
                  : 'pilgrimage-action text-[#c7b897]'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#d4b57a]" />
              <span>{lang === 'ua' ? 'ФОРТЕЦЯ' : 'FORTRESS'}</span>
            </button>

            <button
              onClick={() => onSwitchTab('raw_explorer')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel tracking-wider ${
                activeTab === 'raw_explorer'
                  ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold shadow-md border border-[#bea067]'
                  : 'pilgrimage-action text-[#c7b897]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#d4b57a]" />
              <span>{lang === 'ua' ? 'RAW РЕЄСТР' : 'RAW REGISTRY'}</span>
            </button>

            <button
              onClick={() => onSwitchTab('analysis')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel tracking-wider ${
                activeTab === 'analysis'
                  ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold shadow-md border border-[#bea067]'
                  : 'pilgrimage-action text-[#c7b897]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5 text-[#d4b57a]" />
              <span>{lang === 'ua' ? 'АНАЛІЗ КОДУ' : 'CODE ARCHITECTURE'}</span>
            </button>

            <button
              onClick={() => onSwitchTab('pixel_codex')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel tracking-wider ${
                activeTab === 'pixel_codex'
                  ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold shadow-md border border-[#bea067]'
                  : 'pilgrimage-action text-[#c7b897]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#d4b57a]" />
              <span>{lang === 'ua' ? 'ПІКСЕЛЬНІ АРТИ' : 'PIXEL CODEX'}</span>
            </button>

            {onOpenOverworld && (
              <button
                id="btn-nav-overworld"
                onClick={onOpenOverworld}
                className="px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel tracking-wider bg-gradient-to-b from-[#3a2211] to-[#251509] hover:from-[#4d2d17] hover:to-[#331c0c] text-[#fde047] border border-[#a16207] shadow-sm"
                title="Відкрити глобальну карту світу та експедиції (Клавіша M)"
              >
                <Globe className="w-3.5 h-3.5 text-[#facc15] animate-pulse" />
                <span>{lang === 'ua' ? 'КАРТА СВІТУ (M)' : 'OVERWORLD (M)'}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right Utility: Visual Mode & Language */}
        <div className="flex items-center gap-2">
          {/* Add Migrant */}
          <button
            onClick={onAddDwarf}
            className="px-2.5 py-0.5 pilgrimage-action rounded text-stone-300 hover:text-amber-200 transition-colors flex items-center gap-1 text-[11px]"
            title={lang === 'ua' ? 'Викликати мігрантів' : 'Summon Migrants'}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{lang === 'ua' ? 'Мігранти' : 'Migrants'}</span>
          </button>

          {/* Regenerate World */}
          <button
            onClick={onRegenerateWorld}
            className="px-2.5 py-0.5 pilgrimage-action rounded text-stone-300 hover:text-amber-200 transition-colors flex items-center gap-1 text-[11px]"
            title={lang === 'ua' ? 'Згенерувати новий світ' : 'Regenerate World'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{lang === 'ua' ? 'Новий світ' : 'New World'}</span>
          </button>

          {/* Save Fortress (Royal Archive) */}
          {onSaveFortress && (
            <button
              onClick={onSaveFortress}
              className="px-2.5 py-0.5 pilgrimage-action rounded text-amber-300 hover:text-amber-100 transition-colors flex items-center gap-1 text-[11px] font-medium"
              title={lang === 'ua' ? 'Зберегти фортецю в локальний архів' : 'Save Fortress to Local Archive'}
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'ua' ? 'Зберегти' : 'Save'}</span>
            </button>
          )}

          {/* Load Fortress */}
          {onLoadFortress && hasSavedGame && (
            <button
              onClick={onLoadFortress}
              className="px-2.5 py-0.5 pilgrimage-action rounded text-emerald-300 hover:text-emerald-100 transition-colors flex items-center gap-1 text-[11px]"
              title={lang === 'ua' ? 'Завантажити фортецю з архіву' : 'Load Fortress from Archive'}
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'ua' ? 'Завантажити' : 'Load'}</span>
            </button>
          )}

          {/* Export JSON */}
          {onExportFortress && (
            <button
              onClick={onExportFortress}
              className="px-2 py-0.5 pilgrimage-action rounded text-stone-300 hover:text-amber-200 transition-colors flex items-center gap-1 text-[11px]"
              title={lang === 'ua' ? 'Завантажити файл збереження .json' : 'Download Fortress .json file'}
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{lang === 'ua' ? 'Експорт' : 'Export'}</span>
            </button>
          )}

          {/* Toggle Graphic / Isometric 3D / ASCII Mode */}
          <button
            onClick={onToggleRenderMode}
            className={`px-2.5 py-0.5 rounded transition-all flex items-center gap-1.5 text-[11px] font-medium ${
              renderMode === 'isometric'
                ? 'bg-gradient-to-r from-amber-950 to-[#2c2114] border border-[#d4af37] text-amber-200 shadow-sm'
                : 'pilgrimage-action text-stone-300 hover:text-amber-200'
            }`}
            title={lang === 'ua' ? 'Перемкнути: 2D Графіка -> Піксельний світ Pilgrimage -> ASCII CP437' : 'Switch Mode: 2D Graphic -> Pilgrimage Pixel Art -> ASCII CP437'}
          >
            {renderMode === 'isometric' ? (
              <>
                <Mountain className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[#fef08a]">{lang === 'ua' ? 'Pilgrimage Піксель-Арт' : 'Pilgrimage Pixel Art'}</span>
              </>
            ) : renderMode === 'graphic' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'ua' ? '2D Графіка' : '2D Graphic'}</span>
              </>
            ) : (
              <>
                <FileCode2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ASCII CP437</span>
              </>
            )}
          </button>

          {/* Reveal Map (DFHack reveal toggle) */}
          {onToggleRevealAll && (
            <button
              id="btn-header-toggle-reveal"
              onClick={onToggleRevealAll}
              className={`px-2.5 py-0.5 rounded transition-colors flex items-center gap-1 text-[11px] ${
                revealAll
                  ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow-sm'
                  : 'pilgrimage-action text-stone-300 hover:text-amber-300'
              }`}
              title={lang === 'ua' ? 'Розкрити карту (DFHack reveal)' : 'Reveal Map (DFHack reveal)'}
            >
              <Eye className={`w-3.5 h-3.5 ${revealAll ? 'text-[#fef0c7]' : 'text-amber-400'}`} />
              <span>{revealAll ? (lang === 'ua' ? 'Карта: Відкрита' : 'Map: Revealed') : (lang === 'ua' ? 'Розкрити карту' : 'Reveal Map')}</span>
            </button>
          )}

          {/* Language */}
          <button
            onClick={onToggleLang}
            className="px-2.5 py-0.5 pilgrimage-action rounded font-bold text-[#f5d576] hover:text-[#fef08a] transition-colors text-[11px]"
          >
            {lang === 'ua' ? '🇺🇦 UA' : '🇬🇧 EN'}
          </button>
        </div>
      </div>

      {/* Primary Dwarf Fortress Steam Header Bar */}
      <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-[#211e16] to-[#17140e]">
        {/* Left Side: Fortress Heraldry & Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#2e261a] border-2 border-[#8c784c] flex items-center justify-center font-cinzel font-bold text-[#f5d576] text-sm shadow-inner" style={{ boxShadow: 'inset 0 0 0 1px #b19a60' }}>
              ⚒
            </div>
            <div className="flex flex-col leading-tight font-cinzel">
              <span className="font-bold text-sm tracking-wider text-[#f5d576] drop-shadow-sm">
                Medtobrir
              </span>
              <span className="text-[11px] text-[#c7b897] tracking-wide font-garamond italic">
                Blockadeear
              </span>
              <span className="text-[9px] text-[#a89060] uppercase tracking-widest font-mono">
                {lang === 'ua' ? 'Поселення' : 'Village'}
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-[#4a391e]" />

          {/* Population & 7 Mood Indicators */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#a89060] font-cinzel uppercase tracking-tight">Pop</span>
              <span className="font-bold text-sm text-[#f2e8d5] font-mono">{state.dwarves.length}</span>
            </div>

            {/* The 7 Official DF Smileys with counts */}
            <div className="flex items-center gap-1.5 bg-[#140e06] px-2 py-1 rounded border border-[#52432a]" style={{ boxShadow: 'inset 0 0 0 1px #221c13' }}>
              {/* 1. Ecstatic */}
              <div className="flex flex-col items-center" title="Ecstatic">
                <span className="text-xs text-[#15803d]">😄</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.ecstatic}</span>
              </div>
              {/* 2. Happy */}
              <div className="flex flex-col items-center" title="Happy">
                <span className="text-xs text-[#22c55e]">🙂</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.happy}</span>
              </div>
              {/* 3. Content */}
              <div className="flex flex-col items-center" title="Content">
                <span className="text-xs text-[#84cc16]">😊</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.content}</span>
              </div>
              {/* 4. Fine / Neutral */}
              <div className="flex flex-col items-center" title="Fine">
                <span className="text-xs text-[#facc15]">😐</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.fine}</span>
              </div>
              {/* 5. Uneasy / Stressed */}
              <div className="flex flex-col items-center" title="Uneasy">
                <span className="text-xs text-[#fb923c]">😟</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.stressed}</span>
              </div>
              {/* 6. Sad / Melancholy */}
              <div className="flex flex-col items-center" title="Miserable">
                <span className="text-xs text-[#f87171]">😢</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.sad}</span>
              </div>
              {/* 7. Tantrum / Berserk */}
              <div className="flex flex-col items-center" title="Furious / Tantrum">
                <span className="text-xs text-[#ef4444]">😡</span>
                <span className="text-[10px] font-mono text-stone-400">{moodCounts.tantrum}</span>
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-[#4a391e]" />

          {/* [ Stocks ] Button */}
          <button
            onClick={onOpenStocks}
            className="px-3 py-1 pilgrimage-action rounded text-xs font-cinzel font-bold text-[#f5d576] hover:text-[#fef08a] flex items-center gap-1.5 transition-all"
            title="Open Fortress Inventory Ledger"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>[ {lang === 'ua' ? 'Запаси' : 'Stocks'} ]</span>
          </button>

          {/* Stocks Resource Meters in Authentic DF Colors */}
          <div className="hidden lg:flex items-center gap-3.5 font-mono text-xs">
            {/* Food (white/cream) */}
            <div className="flex items-center gap-1" title="Food Rations">
              <span className="text-[#f5f5f4] font-medium">Food</span>
              <span className="text-[#f5f5f4] font-bold">~{state.stockpilesCounts.food * 12}</span>
            </div>

            {/* Drink (yellow) */}
            <div className="flex items-center gap-1" title="Dwarven Ale & Brews">
              <span className="text-[#facc15] font-medium">Drink</span>
              <span className="text-[#facc15] font-bold">~{state.stockpilesCounts.ale * 15}</span>
            </div>

            {/* Seeds (amber/brown) */}
            <div className="flex items-center gap-1" title="Plump Helmet & Wheat Seeds">
              <span className="text-[#d97706] font-medium">Seeds</span>
              <span className="text-[#d97706] font-bold">~200</span>
            </div>

            {/* Meat (coral red) */}
            <div className="flex items-center gap-1" title="Meat">
              <span className="text-[#f87171] font-medium">Meat</span>
              <span className="text-[#f87171] font-bold">~100</span>
            </div>

            {/* Fish (cyan) */}
            <div className="flex items-center gap-1" title="Fish">
              <span className="text-[#38bdf8] font-medium">Fish</span>
              <span className="text-[#38bdf8] font-bold">~150</span>
            </div>

            {/* Plant (green) */}
            <div className="flex items-center gap-1" title="Garden / Cavern Plants">
              <span className="text-[#4ade80] font-medium">Plant</span>
              <span className="text-[#4ade80] font-bold">~80</span>
            </div>

            {/* Other / Wealth (silver) */}
            <div className="flex items-center gap-1" title="Treasures & Minerals">
              <span className="text-[#94a3b8] font-medium">Other</span>
              <span className="text-[#94a3b8] font-bold">~{state.wealth}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Moon Phase, Calendar Date, Speed Controls */}
        <div className="flex items-center gap-3">
          {/* Calendar Display */}
          <div className="flex items-center gap-2 bg-[#140e06] px-2.5 py-1 rounded border border-[#52432a]">
            {/* Moon Phase Icon */}
            <div className="text-stone-300 text-sm" title="Moon Phase: Waxing Gibbous">
              🌔
            </div>
            <div className="flex flex-col text-right font-cinzel leading-tight">
              <span className="text-xs font-bold text-[#f5d576]">
                {dayOrdinal} {monthName}
              </span>
              <span className="text-[11px] text-[#c7b897] font-garamond italic">
                {seasonText}, Year {state.year}
              </span>
            </div>
          </div>

          {/* Time Speed Controls */}
          <div className="flex items-center bg-[#140e06] border border-[#52432a] rounded p-0.5">
            {/* Pause / Play */}
            <button
              onClick={onTogglePlay}
              className={`p-1.5 rounded transition-colors ${
                isRunning ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold shadow-sm' : 'text-[#c7b897] hover:text-[#f5d576]'
              }`}
              title={isRunning ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Step 1 Tick */}
            <button
              onClick={onStepTick}
              className="px-2 py-1 text-[#c7b897] hover:text-[#f5d576] font-bold text-xs"
              title="Step Single Tick (.)"
            >
              .
            </button>

            {/* Speeds: 1x, 2x, 5x */}
            <div className="flex items-center pl-1 border-l border-[#3d321d]">
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 py-0.5 text-xs font-mono rounded transition-colors ${
                    speed === s
                      ? 'bg-[#3d321d] text-[#f5d576] font-bold border border-[#8c784c]'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {s === 1 ? '>' : s === 2 ? '>>' : '>>>'}
                </button>
              ))}
            </div>
          </div>

          {/* Help Button */}
          {onOpenHelp && (
            <button
              onClick={onOpenHelp}
              className="p-1.5 pilgrimage-action rounded text-stone-300 hover:text-amber-200"
              title="Controls & Shortcuts"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
