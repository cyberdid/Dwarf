/**
 * Architectural & Code Analysis View
 * In-depth technical breakdown of:
 * 1) kevshakes/dwarf-fortress-simulation
 * 2) Qartar/dwarf-fortress
 */

import React from 'react';
import { REPO_ANALYSIS_KEVSHAKES, REPO_ANALYSIS_QARTAR, COMPARATIVE_SYSTEM_ANALYSIS } from '../data/analysisData';
import { ExternalLink, GitBranch, Layers, Cpu, Database, CheckCircle2, AlertTriangle, Code2, Sparkles, Terminal } from 'lucide-react';

interface AnalysisViewProps {
  lang: 'en' | 'ua';
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ lang }) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0e0d0c] text-stone-200 p-4 md:p-8 space-y-8 font-mono">
      {/* Overview Header */}
      <div className="border-b-2 border-[#4a391e] pb-6 space-y-3 max-w-5xl">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-cinzel">
          <Layers className="w-4 h-4" />
          <span>{lang === 'ua' ? 'Порівняльний архітектурний аналіз' : 'Comparative Architectural Analysis'}</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#f5d576] font-cinzel">
          kevshakes/dwarf-fortress-simulation <span className="text-stone-500 font-normal">vs</span> Qartar/dwarf-fortress
        </h1>
        <p className="text-sm text-stone-400 leading-relaxed max-w-3xl">
          {lang === 'ua'
            ? 'Аналіз двох ключових парадигм симуляції Dwarf Fortress: експериментального об’єктно-орієнтованого агента на Python (kevshakes) та канонічного дата-орієнтованого рушія на C/C++ з декларативними RAW-файлами (Qartar/Bay 12).'
            : 'A deep architectural inspection comparing two approaches to Dwarf Fortress simulation: the experimental Python agent-based engine (kevshakes) and the canonical data-driven C/C++ engine powered by declarative RAW tokens (Qartar/Bay 12).'}
        </p>
      </div>

      {/* Side-by-Side Repository Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* kevshakes card */}
        <div className="df-gold-frame rounded-xl p-6 space-y-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-[#1e293b] border border-[#38bdf8]/40 text-sky-300 text-xs font-semibold font-cinzel">
                  Python Simulation Engine
                </span>
                <h2 className="text-lg font-bold text-amber-200 mt-1 font-cinzel">dwarf-fortress-simulation</h2>
                <p className="text-xs text-stone-400">by kevshakes</p>
              </div>
              <a
                href={REPO_ANALYSIS_KEVSHAKES.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 df-btn-bevel text-amber-300 rounded-lg transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {lang === 'ua' ? REPO_ANALYSIS_KEVSHAKES.descriptionUa : REPO_ANALYSIS_KEVSHAKES.descriptionEn}
            </p>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'ua' ? 'Ключові архітектурні переваги' : 'Key Architectural Strengths'}
              </h3>
              <div className="space-y-2">
                {REPO_ANALYSIS_KEVSHAKES.strengths.map((str, idx) => (
                  <div key={idx} className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                    <span className="text-stone-200 font-bold">{lang === 'ua' ? str.titleUa : str.titleEn}: </span>
                    <span className="text-stone-400">{lang === 'ua' ? str.descUa : str.descEn}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lang === 'ua' ? 'Архітектурні обмеження' : 'Limitations & Bottlenecks'}
              </h3>
              <div className="space-y-2">
                {REPO_ANALYSIS_KEVSHAKES.limitations.map((lim, idx) => (
                  <div key={idx} className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                    <span className="text-stone-200 font-bold">{lang === 'ua' ? lim.titleUa : lim.titleEn}: </span>
                    <span className="text-stone-400">{lang === 'ua' ? lim.descUa : lim.descEn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 text-xs text-stone-400 flex items-center justify-between">
            <span>Stack: {REPO_ANALYSIS_KEVSHAKES.language}</span>
            <span className="text-amber-400 font-semibold">{REPO_ANALYSIS_KEVSHAKES.fileBreakdown.length} core modules</span>
          </div>
        </div>

        {/* Qartar card */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400 text-xs font-semibold">
                  Canonical Bay 12 Engine & RAWs
                </span>
                <h2 className="text-lg font-bold text-stone-100 mt-1">dwarf-fortress</h2>
                <p className="text-xs text-stone-400">Qartar / Bay 12 Games Mirror</p>
              </div>
              <a
                href={REPO_ANALYSIS_QARTAR.url}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors"
                title="View on GitHub"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {lang === 'ua' ? REPO_ANALYSIS_QARTAR.descriptionUa : REPO_ANALYSIS_QARTAR.descriptionEn}
            </p>

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'ua' ? 'Ключові архітектурні переваги' : 'Key Architectural Strengths'}
              </h3>
              <div className="space-y-2">
                {REPO_ANALYSIS_QARTAR.strengths.map((str, idx) => (
                  <div key={idx} className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                    <span className="text-stone-200 font-bold">{lang === 'ua' ? str.titleUa : str.titleEn}: </span>
                    <span className="text-stone-400">{lang === 'ua' ? str.descUa : str.descEn}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lang === 'ua' ? 'Архітектурні обмеження' : 'Limitations & Bottlenecks'}
              </h3>
              <div className="space-y-2">
                {REPO_ANALYSIS_QARTAR.limitations.map((lim, idx) => (
                  <div key={idx} className="bg-stone-950/60 p-2.5 rounded-lg border border-stone-800/80 text-xs">
                    <span className="text-stone-200 font-bold">{lang === 'ua' ? lim.titleUa : lim.titleEn}: </span>
                    <span className="text-stone-400">{lang === 'ua' ? lim.descUa : lim.descEn}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 text-xs text-stone-400 flex items-center justify-between">
            <span>Stack: {REPO_ANALYSIS_QARTAR.language}</span>
            <span className="text-amber-400 font-semibold">10,000+ declarative raws</span>
          </div>
        </div>
      </div>

      {/* Comparative System Matrix */}
      <div className="space-y-4 max-w-5xl">
        <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-amber-400" />
          <span>{lang === 'ua' ? 'Порівняльна матриця підсистем' : 'Subsystem Comparison Matrix'}</span>
        </h2>

        <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-950 border-b border-stone-800 text-stone-400">
                  <th className="p-3 font-semibold">{lang === 'ua' ? 'Підсистема' : 'Subsystem'}</th>
                  <th className="p-3 font-semibold text-sky-400">kevshakes (Python)</th>
                  <th className="p-3 font-semibold text-amber-400">Qartar / Bay 12 (Classic)</th>
                  <th className="p-3 font-semibold text-emerald-400">{lang === 'ua' ? 'Висновки' : 'Engineering Verdict'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {COMPARATIVE_SYSTEM_ANALYSIS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-800/40 transition-colors">
                    <td className="p-3 font-bold text-stone-200">
                      {lang === 'ua' ? row.featureUa : row.feature}
                    </td>
                    <td className="p-3">
                      {lang === 'ua' ? row.kevshakesUa : row.kevshakes}
                    </td>
                    <td className="p-3">
                      {lang === 'ua' ? row.qartarUa : row.qartar}
                    </td>
                    <td className="p-3 text-stone-400 italic">
                      {row.verdict}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Implementation Insights: How We Ported & Unified Both in This Web App */}
      <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-xl p-6 space-y-4 max-w-5xl">
        <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'ua' ? 'Як наш веб-додаток інтегрує обидва проєкти' : 'How This Web Application Integrates Both Repositories'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs leading-relaxed">
          <div className="bg-stone-950/80 p-4 rounded-lg border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Cpu className="w-4 h-4" />
              <span>1. 3D Engine & AI Port</span>
            </div>
            <p className="text-stone-400">
              {lang === 'ua'
                ? 'Ми портували 3D шум Перліна (`utils/noise.py`), 3D A* пошук шляхів (`ai/pathfinding.py`) та ієрархію потреб гномів (`ai/needs_system.py`) з репозиторію kevshakes на TypeScript із 60 FPS Canvas-рендером.'
                : 'Ported the 3D Perlin noise (`utils/noise.py`), 3D A* pathfinding (`ai/pathfinding.py`), and needs hierarchy (`ai/needs_system.py`) from kevshakes into a real-time 60 FPS TypeScript/Canvas loop.'}
            </p>
          </div>

          <div className="bg-stone-950/80 p-4 rounded-lg border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Database className="w-4 h-4" />
              <span>2. Authentic RAW Pipeline</span>
            </div>
            <p className="text-stone-400">
              {lang === 'ua'
                ? 'Із репозиторію Qartar видобуто справжні RAW-файли істот, мінералів та рослин. Парсер розбирає токени `[CREATURE:DWARF]`, `[MATERIAL_VALUE]`, `[STRANGE_MOODS]` у живі структури даних симулятора.'
                : 'Extracted authentic RAW files from Qartar (creatures, inorganics, plants). The parser translates tokens like `[CREATURE:DWARF]` and `[MATERIAL_VALUE]` into simulator structures.'}
            </p>
          </div>

          <div className="bg-stone-950/80 p-4 rounded-lg border border-stone-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>3. Dual Visual Modes</span>
            </div>
            <p className="text-stone-400">
              {lang === 'ua'
                ? 'Підтримка автентичного термінального ASCII-режиму (CP437, `data/art/curses`) та графічного тайлсету з навігацією між підземними Z-рівнями та шарами порід.'
                : 'Full support for authentic terminal CP437 ASCII mode (`data/art/curses`) alongside modern graphic tiles, with real-time Z-level slice navigation.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
