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
  Sparkles
} from 'lucide-react';

interface FortressHeaderProps {
  state: FortressState;
  currentZ: number;
  maxZ: number;
  isRunning: boolean;
  speed: number;
  renderMode: 'ascii' | 'graphic';
  activeTab: 'simulation' | 'raw_explorer' | 'analysis' | 'pixel_codex';
  revealAll?: boolean;
  lang: 'en' | 'ua';
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
}

export const FortressHeader: React.FC<FortressHeaderProps> = ({
  state,
  isRunning,
  speed,
  renderMode,
  activeTab,
  revealAll = false,
  lang,
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
    <header className="bg-[#171513] border-b-2 border-[#5a4522] text-stone-200 select-none shadow-xl z-30 shrink-0">
      {/* Top Utility & Navigation Tier */}
      <div className="px-3 py-1 bg-[#100f0e] border-b border-[#2e2619] flex items-center justify-between text-xs font-mono">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            <button
              onClick={() => onSwitchTab('simulation')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel ${
                activeTab === 'simulation'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-amber-300 hover:bg-stone-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'ua' ? 'ФОРТЕЦЯ' : 'FORTRESS'}</span>
            </button>

            <button
              onClick={() => onSwitchTab('raw_explorer')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel ${
                activeTab === 'raw_explorer'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-amber-300 hover:bg-stone-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{lang === 'ua' ? 'RAW РЕЄСТР' : 'RAW REGISTRY'}</span>
            </button>

            <button
              onClick={() => onSwitchTab('analysis')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel ${
                activeTab === 'analysis'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-amber-300 hover:bg-stone-900'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{lang === 'ua' ? 'АНАЛІЗ КОДУ' : 'CODE ARCHITECTURE'}</span>
            </button>

            <button
              onClick={() => onSwitchTab('pixel_codex')}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel ${
                activeTab === 'pixel_codex'
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-amber-300 hover:bg-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{lang === 'ua' ? 'ПІКСЕЛЬНІ АРТИ' : 'PIXEL CODEX'}</span>
            </button>

            {onOpenOverworld && (
              <button
                id="btn-nav-overworld"
                onClick={onOpenOverworld}
                className="px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 font-cinzel bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/50 hover:border-amber-500 shadow-sm"
                title="Відкрити глобальну карту світу та експедиції (Клавіша M)"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
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
            className="px-2 py-0.5 df-btn-bevel rounded text-stone-300 hover:text-amber-300 transition-colors flex items-center gap-1 text-[11px]"
            title={lang === 'ua' ? 'Викликати мігрантів' : 'Summon Migrants'}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{lang === 'ua' ? 'Мігранти' : 'Migrants'}</span>
          </button>

          {/* Regenerate World */}
          <button
            onClick={onRegenerateWorld}
            className="px-2 py-0.5 df-btn-bevel rounded text-stone-300 hover:text-amber-300 transition-colors flex items-center gap-1 text-[11px]"
            title={lang === 'ua' ? 'Згенерувати новий світ' : 'Regenerate World'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{lang === 'ua' ? 'Новий світ' : 'New World'}</span>
          </button>

          {/* Toggle Graphic / ASCII Mode */}
          <button
            onClick={onToggleRenderMode}
            className="px-2 py-0.5 df-btn-bevel rounded text-stone-300 hover:text-amber-300 transition-colors flex items-center gap-1 text-[11px]"
            title="Toggle Graphics / ASCII CP437"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>{renderMode === 'graphic' ? 'Graphic Tiles' : 'ASCII CP437'}</span>
          </button>

          {/* Reveal Map (DFHack reveal toggle) */}
          {onToggleRevealAll && (
            <button
              id="btn-header-toggle-reveal"
              onClick={onToggleRevealAll}
              className={`px-2 py-0.5 df-btn-bevel rounded transition-colors flex items-center gap-1 text-[11px] ${
                revealAll
                  ? 'bg-amber-600/90 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
              title={lang === 'ua' ? 'Розкрити карту (DFHack reveal)' : 'Reveal Map (DFHack reveal)'}
            >
              <Eye className={`w-3.5 h-3.5 ${revealAll ? 'text-stone-950' : 'text-amber-400'}`} />
              <span>{revealAll ? (lang === 'ua' ? 'Карта: Відкрита' : 'Map: Revealed') : (lang === 'ua' ? 'Розкрити карту' : 'Reveal Map')}</span>
            </button>
          )}

          {/* Language */}
          <button
            onClick={onToggleLang}
            className="px-2 py-0.5 df-btn-bevel rounded font-bold text-amber-300 hover:text-amber-200 transition-colors text-[11px]"
          >
            {lang === 'ua' ? '🇺🇦 UA' : '🇬🇧 EN'}
          </button>
        </div>
      </div>

      {/* Primary Dwarf Fortress Steam Header Bar */}
      <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-[#221f1b] to-[#171513]">
        {/* Left Side: Fortress Heraldry & Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#2e261a] border border-[#785b28] flex items-center justify-center font-cinzel font-bold text-amber-400 text-sm shadow-inner">
              ⚒
            </div>
            <div className="flex flex-col leading-tight font-cinzel">
              <span className="font-bold text-sm tracking-wider text-[#f5d576] drop-shadow-sm">
                Medtobrir
              </span>
              <span className="text-[10px] text-stone-400 tracking-wide font-medieval">
                Blockadeear
              </span>
              <span className="text-[9px] text-[#a89060] uppercase tracking-widest">
                {lang === 'ua' ? 'Поселення' : 'Village'}
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-[#4a391e]" />

          {/* Population & 7 Mood Indicators */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-stone-400 font-cinzel uppercase tracking-tight">Pop</span>
              <span className="font-bold text-sm text-stone-100 font-mono">{state.dwarves.length}</span>
            </div>

            {/* The 7 Official DF Smileys with counts */}
            <div className="flex items-center gap-1.5 bg-[#121110] px-2 py-1 rounded border border-[#3b2f1a]">
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
            className="px-3 py-1 df-btn-bevel rounded text-xs font-cinzel font-bold text-amber-200 hover:text-amber-100 flex items-center gap-1.5 transition-all"
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
          <div className="flex items-center gap-2 bg-[#121110] px-2.5 py-1 rounded border border-[#3b2f1a]">
            {/* Moon Phase Icon */}
            <div className="text-stone-300 text-sm" title="Moon Phase: Waxing Gibbous">
              🌔
            </div>
            <div className="flex flex-col text-right font-cinzel leading-tight">
              <span className="text-xs font-bold text-[#f5d576]">
                {dayOrdinal} {monthName}
              </span>
              <span className="text-[10px] text-stone-400">
                {seasonText}, Year {state.year}
              </span>
            </div>
          </div>

          {/* Time Speed Controls */}
          <div className="flex items-center bg-[#121110] border border-[#3b2f1a] rounded p-0.5">
            {/* Pause / Play */}
            <button
              onClick={onTogglePlay}
              className={`p-1.5 rounded transition-colors ${
                isRunning ? 'bg-amber-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-amber-300'
              }`}
              title={isRunning ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {/* Step 1 Tick */}
            <button
              onClick={onStepTick}
              className="px-2 py-1 text-stone-400 hover:text-amber-300 font-bold text-xs"
              title="Step Single Tick (.)"
            >
              .
            </button>

            {/* Speeds: 1x, 2x, 5x */}
            <div className="flex items-center pl-1 border-l border-[#2e2619]">
              {[1, 2, 5].map(s => (
                <button
                  key={s}
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 py-0.5 text-xs font-mono rounded transition-colors ${
                    speed === s
                      ? 'bg-[#3d321d] text-amber-300 font-bold'
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
              className="p-1.5 df-btn-bevel rounded text-stone-400 hover:text-amber-300"
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
