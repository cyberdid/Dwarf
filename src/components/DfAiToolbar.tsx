import React, { useState } from 'react';
import {
  Brain,
  Play,
  Pause,
  Terminal,
  Sparkles,
  Zap,
  ChevronDown,
  RefreshCw,
  Compass,
  Beer,
  Pickaxe,
  ShieldAlert,
  BarChart3,
} from 'lucide-react';
import { DfAiState } from '../engine/dfAiClient';

interface DfAiToolbarProps {
  aiState: DfAiState;
  onToggleActive: () => void;
  onRunStep: () => void;
  onChangeDirective: (directive: string) => void;
  onOpenTerminal: () => void;
  onOpenAnalytics: () => void;
  lang: 'ua' | 'en';
}

const DIRECTIVE_PRESETS = [
  {
    id: 'balanced',
    titleUa: 'Збалансований розвиток (Standard df-ai)',
    titleEn: 'Balanced Fortress (Standard df-ai)',
    icon: Compass,
    color: 'text-amber-300',
  },
  {
    id: 'booze',
    titleUa: 'Пивний бум & Запаси (Booze Rush)',
    titleEn: 'Booze & Food Rush',
    icon: Beer,
    color: 'text-yellow-400',
  },
  {
    id: 'mining',
    titleUa: 'Глибинний видобуток руди (Deep Delver)',
    titleEn: 'Deep Vein Mining',
    icon: Pickaxe,
    color: 'text-cyan-400',
  },
  {
    id: 'citadel',
    titleUa: 'Цитадель & Захист (Fortress Defense)',
    titleEn: 'Citadel Fortification',
    icon: ShieldAlert,
    color: 'text-red-400',
  },
];

export const DfAiToolbar: React.FC<DfAiToolbarProps> = ({
  aiState,
  onToggleActive,
  onRunStep,
  onChangeDirective,
  onOpenTerminal,
  onOpenAnalytics,
  lang,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  const handleSelectPreset = (title: string) => {
    onChangeDirective(title);
    setIsDropdownOpen(false);
    setIsCustomMode(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onChangeDirective(customInput.trim());
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="bg-stone-900/95 border-b border-amber-800/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg backdrop-blur text-stone-200">
      {/* Left: Autopilot Status & Toggle */}
      <div className="flex items-center gap-2">
        <button
          id="btn-df-ai-toggle"
          onClick={onToggleActive}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold font-cinzel transition-all shadow-md ${
            aiState.isActive
              ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400 shadow-emerald-950/60 ring-2 ring-emerald-500/30'
              : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-600'
          }`}
          title={lang === 'ua' ? 'Увімкнути/вимкнути автономну гру Gemini (df-ai)' : 'Toggle autonomous Gemini df-ai player'}
        >
          {aiState.isActive ? (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
              </span>
              <Brain className="w-4 h-4 text-emerald-200" />
              <span>{lang === 'ua' ? 'DF-AI АВТОПІЛОТ: УВІМКНЕНО' : 'DF-AI AUTOPILOT: ACTIVE'}</span>
            </>
          ) : (
            <>
              <Brain className="w-4 h-4 text-stone-400" />
              <span>{lang === 'ua' ? 'DF-AI АВТОПІЛОТ: ВИМКНЕНО' : 'DF-AI AUTOPILOT: OFF'}</span>
            </>
          )}
        </button>

        {/* Step Button */}
        <button
          id="btn-df-ai-step"
          onClick={onRunStep}
          disabled={aiState.isThinking}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 transition-colors disabled:opacity-50"
          title={lang === 'ua' ? 'Змусити Gemini проаналізувати стан і зробити 1 крок зараз' : 'Force Gemini to analyze and execute 1 step now'}
        >
          {aiState.isThinking ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>{lang === 'ua' ? 'Крок AI (Step)' : 'AI Step'}</span>
        </button>

        {/* Model Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-stone-950/70 border border-stone-800 text-[11px] text-stone-400 font-mono">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{aiState.aiModel}</span>
          <span className="text-stone-600">|</span>
          <span className="text-amber-500 font-semibold">{aiState.statusSummary}</span>
        </div>
      </div>

      {/* Middle: Live Overseer Thoughts Ticker */}
      <div className="flex-1 min-w-[200px] max-w-xl mx-2 bg-stone-950/80 border border-amber-950 rounded px-2.5 py-1 text-xs truncate flex items-center gap-2">
        <span className="text-amber-500 font-bold font-mono text-[10px] uppercase shrink-0">
          [df-ai overseer]:
        </span>
        <span className="text-stone-300 truncate" title={lang === 'ua' ? aiState.thoughtProcessUa : aiState.thoughtProcessEn}>
          {aiState.isThinking
            ? (lang === 'ua' ? 'Аналіз пластів, потреб гномів та стратегії...' : 'Analyzing strata, dwarf needs and strategic blueprints...')
            : (lang === 'ua' ? aiState.thoughtProcessUa : aiState.thoughtProcessEn)}
        </span>
      </div>

      {/* Right: Directive Preset Dropdown & DFHack Terminal */}
      <div className="flex items-center gap-2 relative">
        {/* Directive Preset Dropdown */}
        <div className="relative">
          <button
            id="btn-directive-dropdown"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="max-w-[130px] truncate">{aiState.directive}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-stone-900 border border-amber-800/80 rounded shadow-2xl p-2 z-50 text-xs">
              <div className="text-[10px] uppercase font-bold text-stone-400 px-2 py-1">
                {lang === 'ua' ? 'Директива для Gemini df-ai' : 'Directive for Gemini df-ai'}
              </div>
              <div className="space-y-1">
                {DIRECTIVE_PRESETS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(lang === 'ua' ? p.titleUa : p.titleEn)}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-amber-950/60 flex items-center gap-2 transition-colors"
                    >
                      <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                      <span className="text-stone-200 font-medium">
                        {lang === 'ua' ? p.titleUa : p.titleEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom directive input */}
              <div className="mt-2 pt-2 border-t border-stone-800">
                <form onSubmit={handleCustomSubmit} className="flex gap-1">
                  <input
                    type="text"
                    placeholder={lang === 'ua' ? 'Власна команда...' : 'Custom directive...'}
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 bg-amber-800 hover:bg-amber-700 rounded text-stone-100 font-bold"
                  >
                    OK
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        <button
          id="btn-open-ai-analytics"
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-stone-950 hover:bg-stone-900 border border-amber-700/60 text-amber-300 font-mono transition-colors shadow-sm"
          title={lang === 'ua' ? 'Аналітика рішень Gemini (логи)' : 'Gemini decision analytics (logs)'}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'ua' ? 'Аналітика' : 'Analytics'}</span>
        </button>

        {/* DFHack Console Open Button */}
        <button
          id="btn-open-dfhack-terminal"
          onClick={onOpenTerminal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-stone-950 hover:bg-stone-900 border border-emerald-700/60 text-emerald-400 font-mono transition-colors shadow-sm"
          title="Відкрити автентичну консоль DFHack"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>DFHack</span>
        </button>
      </div>
    </div>
  );
};
