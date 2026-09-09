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
  AlertTriangle,
  ScrollText,
} from 'lucide-react';
import { DfAiState } from '../engine/dfAiClient';

interface DfAiToolbarProps {
  aiState: DfAiState;
  onToggleActive: () => void;
  onRunStep: () => void;
  onChangeDirective: (directive: string) => void;
  onOpenTerminal: () => void;
  onOpenGeminiLog?: () => void;
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
  onOpenGeminiLog,
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
    <div className="bg-[#1f1a12] border-b border-[#8c784c] px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-lg backdrop-blur text-[#f2e8d5]">
      {/* Left: Autopilot Status & Toggle */}
      <div className="flex items-center gap-2">
        <button
          id="btn-df-ai-toggle"
          onClick={onToggleActive}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold font-cinzel transition-all shadow-md ${
            aiState.isActive
              ? 'bg-gradient-to-b from-[#2d5a37] to-[#1b3d23] hover:from-[#356d42] hover:to-[#224e2d] text-[#e8f5e9] border border-[#66bb6a] shadow-emerald-950/60 ring-1 ring-[#81c784]/40'
              : 'pilgrimage-action text-[#c7b897]'
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs pilgrimage-action text-[#f5d576] hover:text-[#fef08a] transition-colors disabled:opacity-50"
          title={lang === 'ua' ? 'Змусити Gemini проаналізувати стан і зробити 1 крок зараз' : 'Force Gemini to analyze and execute 1 step now'}
        >
          {aiState.isThinking ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="font-cinzel text-[11px] font-semibold">{lang === 'ua' ? 'Крок AI' : 'AI Step'}</span>
        </button>

        {/* Model Pill */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#140e06] border text-[11px] font-mono ${
          aiState.isFallback ? 'border-amber-700/60 text-amber-300' : 'border-[#52432a] text-[#c7b897]'
        }`}>
          <Sparkles className={`w-3 h-3 ${aiState.isFallback ? 'text-amber-500' : 'text-[#d4b57a]'}`} />
          <span className="truncate max-w-[130px]">{aiState.aiModel}</span>
          <span className="text-stone-600">|</span>
          <span className="text-[#f5d576] font-semibold">{aiState.statusSummary}</span>
        </div>

        {/* Fallback Warning Badge */}
        {aiState.isFallback && (
          <div
            id="badge-df-ai-fallback"
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#351e0e] border border-amber-500/70 text-[11px] text-amber-300 font-mono shadow-sm animate-pulse"
            title={
              lang === 'ua'
                ? `Використано резервну евристику: ${aiState.fallbackReason || 'Помилка звернення до моделі'}`
                : `Heuristic fallback active: ${aiState.fallbackReason || 'Model call error'}`
            }
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-bold whitespace-nowrap">
              {lang === 'ua' ? 'FALLBACK: Евристика' : 'FALLBACK: Heuristics'}
            </span>
          </div>
        )}
      </div>

      {/* Middle: Live Overseer Thoughts Ticker */}
      <div className="flex-1 min-w-[200px] max-w-xl mx-2 bg-[#140e06] border border-[#52432a] rounded px-2.5 py-1 text-xs truncate flex items-center gap-2 shadow-inner">
        <span className="text-[#f5d576] font-bold font-cinzel text-[10px] uppercase shrink-0">
          [df-ai overseer]:
        </span>
        <span className="text-[#f2e8d5] font-garamond text-sm italic truncate" title={lang === 'ua' ? aiState.thoughtProcessUa : aiState.thoughtProcessEn}>
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs pilgrimage-action text-[#f2e8d5] hover:text-[#fef0c7]"
          >
            <Compass className="w-3.5 h-3.5 text-[#d4b57a]" />
            <span className="max-w-[130px] truncate font-cinzel text-[11px]">{aiState.directive}</span>
            <ChevronDown className="w-3 h-3 text-[#c7b897]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#211e16] border-2 border-[#8c784c] rounded shadow-2xl p-2 z-50 text-xs text-[#f2e8d5]" style={{ boxShadow: 'inset 0 0 0 1px #b19a60, 0 8px 24px rgba(0,0,0,0.8)' }}>
              <div className="text-[10px] uppercase font-bold text-[#d4b57a] font-cinzel px-2 py-1 tracking-wider">
                {lang === 'ua' ? 'Директива для Gemini df-ai' : 'Directive for Gemini df-ai'}
              </div>
              <div className="space-y-1">
                {DIRECTIVE_PRESETS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPreset(lang === 'ua' ? p.titleUa : p.titleEn)}
                      className="w-full text-left px-2.5 py-1.5 rounded hover:bg-[#30291c] border border-transparent hover:border-[#726242] flex items-center gap-2 transition-colors"
                    >
                      <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                      <span className="text-[#f2e8d5] font-medium font-garamond text-sm">
                        {lang === 'ua' ? p.titleUa : p.titleEn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom directive input */}
              <div className="mt-2 pt-2 border-t border-[#52432a]">
                <form onSubmit={handleCustomSubmit} className="flex gap-1">
                  <input
                    type="text"
                    placeholder={lang === 'ua' ? 'Власна команда...' : 'Custom directive...'}
                    value={customInput}
                    onChange={e => setCustomInput(e.target.value)}
                    className="flex-1 bg-[#140e06] border border-[#52432a] rounded px-2 py-1 text-xs text-[#f2e8d5] font-garamond text-sm focus:outline-none focus:border-[#d4b57a]"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 pilgrimage-action rounded text-[#f5d576] font-cinzel font-bold text-xs"
                  >
                    OK
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Gemini Action & Governance Log Open Button */}
        <button
          id="btn-open-gemini-log"
          onClick={onOpenGeminiLog}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs pilgrimage-action text-[#f5d576] hover:text-[#fef08a] font-medium transition-colors shadow-sm"
          title={lang === 'ua' ? 'Відкрити літопис дій та логіки рішень Gemini 3.8' : 'Open Gemini 3.8 Action & Governance Log'}
        >
          <ScrollText className="w-3.5 h-3.5 text-[#d4b57a]" />
          <span className="font-cinzel font-semibold text-[11px]">{lang === 'ua' ? 'Літопис дій' : 'Chronicle'}</span>
          {aiState.actionHistory && aiState.actionHistory.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-[#8c784c] text-[#fef0c7] font-bold">
              {aiState.actionHistory.length}
            </span>
          )}
        </button>

        {/* DFHack Console Open Button */}
        <button
          id="btn-open-dfhack-terminal"
          onClick={onOpenTerminal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-[#140e06] hover:bg-[#1f170e] border border-[#3e6b48] text-emerald-400 font-mono transition-colors shadow-sm"
          title="Відкрити автентичну консоль DFHack"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>DFHack</span>
        </button>
      </div>
    </div>
  );
};
