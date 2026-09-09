import React, { useState, useMemo } from 'react';
import {
  X,
  Brain,
  Sparkles,
  Pickaxe,
  Hammer,
  Axe,
  Beer,
  Home,
  Compass,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Terminal,
  FileDown,
} from 'lucide-react';
import { GeminiActionRecord } from '../engine/dfAiClient';

interface GeminiLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionHistory: GeminiActionRecord[];
  aiModel: string;
  lang: 'ua' | 'en';
}

export const GeminiLogModal: React.FC<GeminiLogModalProps> = ({
  isOpen,
  onClose,
  actionHistory,
  aiModel,
  lang,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute overall statistics across all cycles
  const stats = useMemo(() => {
    let totalMining = 0;
    let totalChop = 0;
    let totalBuild = 0;
    let totalStockpiles = 0;
    let totalZones = 0;
    let totalOrders = 0;
    let fallbackCycles = 0;

    actionHistory.forEach(rec => {
      totalMining += rec.actions.miningCount || 0;
      totalChop += rec.actions.chopCount || 0;
      totalBuild += rec.actions.buildCount || 0;
      totalStockpiles += rec.actions.stockpilesCount || 0;
      totalZones += rec.actions.zonesCount || 0;
      totalOrders += rec.actions.ordersCount || 0;
      if (rec.isFallback) fallbackCycles++;
    });

    return {
      totalCycles: actionHistory.length,
      totalMining,
      totalChop,
      totalBuild,
      totalStockpiles,
      totalZones,
      totalOrders,
      fallbackCycles,
    };
  }, [actionHistory]);

  // Filter records based on category and search query
  const filteredRecords = useMemo(() => {
    return actionHistory.filter(rec => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'fallback' && !rec.isFallback) return false;
        if (selectedCategory !== 'fallback' && rec.governanceCategory !== selectedCategory) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inThoughts =
          rec.thoughtProcessUa.toLowerCase().includes(q) ||
          rec.thoughtProcessEn.toLowerCase().includes(q);
        const inSummary =
          rec.summaryUa.toLowerCase().includes(q) ||
          rec.summaryEn.toLowerCase().includes(q);
        const inStatus = rec.statusSummary.toLowerCase().includes(q);
        const inDirective = rec.directive.toLowerCase().includes(q);
        const inExplanation =
          rec.governanceExplanation.ua.toLowerCase().includes(q) ||
          rec.governanceExplanation.en.toLowerCase().includes(q);
        if (!inThoughts && !inSummary && !inStatus && !inDirective && !inExplanation) {
          return false;
        }
      }
      return true;
    });
  }, [actionHistory, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleCopyMarkdown = () => {
    const lines: string[] = [
      `# 📜 Журнал дій та рішень Gemini 3.8 Overseer (${new Date().toLocaleString()})`,
      `**Модель:** ${aiModel} | **Всього циклів:** ${stats.totalCycles} | **Розкопок:** ${stats.totalMining} | **Будівництв:** ${stats.totalBuild} | **Наказів:** ${stats.totalOrders}\n`,
      '---',
    ];

    actionHistory.forEach(rec => {
      lines.push(`\n### Цикл #${rec.cycleNumber} [${rec.calendarTime}] — ${rec.statusSummary}`);
      lines.push(`- **Джерело:** \`${rec.model}\` ${rec.isFallback ? `(Резервний режим: ${rec.fallbackReason || 'Евристика'})` : '(Пряме керування Gemini)'}`);
      lines.push(`- **Директива:** *${rec.directive}*`);
      lines.push(`- **Як керує (Стратегія):** ${lang === 'ua' ? rec.governanceExplanation.ua : rec.governanceExplanation.en}`);
      lines.push(`- **Думка моделі:** ${lang === 'ua' ? rec.thoughtProcessUa : rec.thoughtProcessEn}`);
      lines.push(`- **Виконані дії:** ${lang === 'ua' ? rec.summaryUa : rec.summaryEn}`);
      if (rec.actions.miningCoords.length > 0) {
        lines.push(`  - Координати розкопок: ${rec.actions.miningCoords.map(c => `(X:${c.x}, Y:${c.y}, Z:${c.z})`).join(', ')}`);
      }
      if (rec.actions.buildItems.length > 0) {
        lines.push(`  - Будівництво: ${rec.actions.buildItems.map(b => `${b.type} (X:${b.x}, Y:${b.y}, Z:${b.z})`).join(', ')}`);
      }
      lines.push(`- **DFHack рядок:** \`${rec.terminalCommand}\``);
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(actionHistory, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gemini-overseer-log-cycle-${actionHistory.length}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const categories = [
    { id: 'all', labelUa: 'Всі записи', labelEn: 'All Logs', icon: Layers },
    { id: 'survival', labelUa: 'Виживання / Ель', labelEn: 'Survival / Booze', icon: Beer },
    { id: 'residential', labelUa: 'Житлові кімнати', labelEn: 'Residential', icon: Home },
    { id: 'mining', labelUa: 'Шахтарство та руда', labelEn: 'Mining & Ores', icon: Pickaxe },
    { id: 'economy', labelUa: 'Майстерні та ремесла', labelEn: 'Workshops', icon: Hammer },
    { id: 'diplomacy', labelUa: 'Експедиції та світ', labelEn: 'Expeditions', icon: Compass },
    { id: 'fallback', labelUa: 'Fallback записи', labelEn: 'Fallback Logs', icon: AlertTriangle },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="pilgrimage-panel pilgrimage-frame rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col font-sans overflow-hidden text-[#f2e8d5]">
        {/* Header */}
        <div className="bg-[#18130c] border-b-2 border-[#8c784c] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#2d2212] border border-[#bea067] rounded-lg text-[#f5d576]">
              <Brain className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-cinzel font-bold text-[#fef0c7] flex items-center gap-2">
                  <span>{lang === 'ua' ? 'Літопис дій та рішень Gemini 3.8' : 'Gemini 3.8 Overseer Chronicle & Log'}</span>
                </h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#382613] border border-[#bea067] text-[#f5d576] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#f5d576]" />
                  <span>gemini-3.8-flash</span>
                </span>
              </div>
              <p className="text-xs text-[#c7b897] font-garamond italic mt-0.5">
                {lang === 'ua'
                  ? 'Повний хронікер автономного керування фортецею: логіка прийняття рішень, розмічені розкопки, будівництво та накази'
                  : 'Complete record of autonomous overseer actions: decision logic, excavation designations, workshop constructions, and orders'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cinzel font-semibold pilgrimage-action text-[#f2e8d5] hover:text-[#fef0c7] transition-colors"
              title={lang === 'ua' ? 'Копіювати весь лог у буфер обміну' : 'Copy log to clipboard'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#d4b57a]" />}
              <span>{copied ? (lang === 'ua' ? 'Скопійовано!' : 'Copied!') : (lang === 'ua' ? 'Копіювати лог' : 'Copy Log')}</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-cinzel font-semibold pilgrimage-action text-[#f2e8d5] hover:text-[#fef0c7] transition-colors"
              title="Export JSON"
            >
              <FileDown className="w-3.5 h-3.5 text-[#d4b57a]" />
              <span>JSON</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#302719] rounded-lg text-[#c7b897] hover:text-[#fef0c7] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Aggregate Stats Strip */}
        <div className="bg-[#140e06] border-b border-[#52432a] px-5 py-2.5 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
          <div className="bg-[#1d160e] border border-[#52432a] rounded px-2.5 py-1.5">
            <span className="text-[#a8997a] block text-[10px] uppercase font-cinzel">
              {lang === 'ua' ? 'Цикли' : 'Cycles'}
            </span>
            <span className="text-[#f5d576] font-bold text-sm">{stats.totalCycles}</span>
          </div>
          <div className="bg-[#1d160e] border border-[#52432a] rounded px-2.5 py-1.5">
            <span className="text-[#a8997a] block text-[10px] uppercase font-cinzel">
              {lang === 'ua' ? 'Розкопки' : 'Excavations'}
            </span>
            <span className="text-[#7bd88f] font-bold text-sm">{stats.totalMining}</span>
          </div>
          <div className="bg-[#1d160e] border border-[#52432a] rounded px-2.5 py-1.5">
            <span className="text-[#a8997a] block text-[10px] uppercase font-cinzel">
              {lang === 'ua' ? 'Будівництво' : 'Constructions'}
            </span>
            <span className="text-[#8cd1db] font-bold text-sm">{stats.totalBuild}</span>
          </div>
          <div className="bg-stone-900/80 border border-stone-800 rounded px-2.5 py-1.5">
            <span className="text-stone-500 block text-[10px] uppercase">
              {lang === 'ua' ? 'Вирубка дерев' : 'Trees Felled'}
            </span>
            <span className="text-lime-400 font-bold text-sm">{stats.totalChop}</span>
          </div>
          <div className="bg-stone-900/80 border border-stone-800 rounded px-2.5 py-1.5">
            <span className="text-stone-500 block text-[10px] uppercase">
              {lang === 'ua' ? 'Спец-накази' : 'Special Orders'}
            </span>
            <span className="text-purple-400 font-bold text-sm">{stats.totalOrders}</span>
          </div>
          <div className={`rounded px-2.5 py-1.5 border ${
            stats.fallbackCycles > 0 ? 'bg-amber-950/40 border-amber-600/50 text-amber-300' : 'bg-stone-900/80 border-stone-800 text-stone-500'
          }`}>
            <span className="block text-[10px] uppercase">
              {lang === 'ua' ? 'Fallback цикли' : 'Fallback Cycles'}
            </span>
            <span className="font-bold text-sm">{stats.fallbackCycles}</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-stone-900/90 border-b border-stone-800 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
                    isActive
                      ? 'bg-amber-600 text-stone-950 font-bold shadow-sm'
                      : 'bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-750'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{lang === 'ua' ? cat.labelUa : cat.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'ua' ? 'Пошук по діях чи думках...' : 'Search actions or thoughts...'}
              className="w-full bg-stone-950 border border-stone-700 rounded-lg pl-8 pr-3 py-1 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Record List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-950/40">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-sm">
              {lang === 'ua'
                ? 'Записів не знайдено. Запустіть «Крок AI» або увімкніть Автопілот!'
                : 'No log entries found. Execute an "AI Step" or turn on Autopilot!'}
            </div>
          ) : (
            filteredRecords.map(rec => {
              const isExpanded = expandedRecordId === rec.id;
              const isHeuristicFallback = rec.isFallback;

              return (
                <div
                  key={rec.id}
                  className={`border rounded-lg transition-all overflow-hidden ${
                    isHeuristicFallback
                      ? 'bg-amber-950/15 border-amber-700/50'
                      : 'bg-stone-900/90 border-stone-800 hover:border-amber-600/50'
                  }`}
                >
                  {/* Record Header */}
                  <div
                    onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                    className="p-3.5 cursor-pointer flex flex-wrap items-center justify-between gap-2.5 hover:bg-stone-850/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded font-mono text-xs font-bold bg-stone-800 border border-stone-700 text-amber-300">
                        #{rec.cycleNumber}
                      </span>

                      <span className="text-xs text-stone-400 font-mono">
                        {rec.calendarTime}
                      </span>

                      {/* Status summary pill */}
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-stone-950 border border-stone-700 text-emerald-400 font-mono">
                        {rec.statusSummary}
                      </span>

                      {/* Fallback warning if applicable */}
                      {isHeuristicFallback && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 border border-amber-600 text-amber-300 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Fallback</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-stone-500 font-mono hidden sm:inline">
                        {rec.realTime}
                      </span>
                      <button className="text-stone-400 hover:text-stone-200">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Summary of Actions Taken */}
                  <div className="px-3.5 pb-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-stone-400 font-medium">
                      {lang === 'ua' ? 'Дії:' : 'Actions:'}
                    </span>
                    <span className="text-stone-200 font-mono bg-stone-950/60 px-2 py-0.5 rounded border border-stone-800">
                      {lang === 'ua' ? rec.summaryUa : rec.summaryEn}
                    </span>
                  </div>

                  {/* Governance Strategy Highlight */}
                  <div className="px-3.5 pb-3">
                    <div className="p-2.5 rounded bg-stone-950/70 border border-stone-800/80 text-xs flex items-start gap-2">
                      <Brain className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                          {lang === 'ua' ? 'Як Gemini керує та обґрунтовує рішення:' : 'How Gemini Governs & Reasons:'}
                        </div>
                        <p className="text-stone-300 leading-relaxed">
                          {lang === 'ua' ? rec.governanceExplanation.ua : rec.governanceExplanation.en}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detailed Section */}
                  {isExpanded && (
                    <div className="border-t border-stone-800/80 bg-stone-950/90 p-4 space-y-3.5 text-xs font-mono">
                      {/* Raw Thought Process */}
                      <div>
                        <div className="text-stone-400 font-bold mb-1 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === 'ua' ? 'Повний хід думок моделі (Thought Process):' : 'Full AI Thought Process:'}</span>
                        </div>
                        <div className="p-2.5 bg-black/80 rounded border border-stone-800 text-stone-200 leading-relaxed font-sans text-xs">
                          {lang === 'ua' ? rec.thoughtProcessUa : rec.thoughtProcessEn}
                        </div>
                      </div>

                      {/* Active Directive at cycle */}
                      <div>
                        <span className="text-stone-500">{lang === 'ua' ? 'Побажання гравця (Директива): ' : 'Player Directive: '}</span>
                        <span className="text-cyan-300 font-bold font-sans">«{rec.directive}»</span>
                      </div>

                      {/* Detailed Coordinates of Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rec.actions.miningCoords.length > 0 && (
                          <div className="p-2.5 bg-black/60 rounded border border-stone-800">
                            <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                              <Pickaxe className="w-3.5 h-3.5" />
                              <span>{lang === 'ua' ? `Координати розкопок (${rec.actions.miningCoords.length})` : `Mining Targets (${rec.actions.miningCoords.length})`}</span>
                            </div>
                            <div className="text-[11px] text-stone-400 space-y-0.5 max-h-24 overflow-y-auto">
                              {rec.actions.miningCoords.map((c, i) => (
                                <div key={i}>• Z={c.z}, X={c.x}, Y={c.y}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.actions.buildItems.length > 0 && (
                          <div className="p-2.5 bg-black/60 rounded border border-stone-800">
                            <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1">
                              <Hammer className="w-3.5 h-3.5" />
                              <span>{lang === 'ua' ? `План будівництва (${rec.actions.buildItems.length})` : `Construction Blueprints (${rec.actions.buildItems.length})`}</span>
                            </div>
                            <div className="text-[11px] text-stone-400 space-y-0.5 max-h-24 overflow-y-auto">
                              {rec.actions.buildItems.map((b, i) => (
                                <div key={i}>• {b.type} на (Z={b.z}, X={b.x}, Y={b.y})</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.actions.chopCoords.length > 0 && (
                          <div className="p-2.5 bg-black/60 rounded border border-stone-800">
                            <div className="text-lime-400 font-bold mb-1 flex items-center gap-1">
                              <Axe className="w-3.5 h-3.5" />
                              <span>{lang === 'ua' ? `Вирубка дерев (${rec.actions.chopCoords.length})` : `Trees Marked (${rec.actions.chopCoords.length})`}</span>
                            </div>
                            <div className="text-[11px] text-stone-400 space-y-0.5 max-h-24 overflow-y-auto">
                              {rec.actions.chopCoords.map((c, i) => (
                                <div key={i}>• Z={c.z}, X={c.x}, Y={c.y}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {rec.actions.orders.length > 0 && (
                          <div className="p-2.5 bg-black/60 rounded border border-stone-800">
                            <div className="text-purple-400 font-bold mb-1 flex items-center gap-1">
                              <Beer className="w-3.5 h-3.5" />
                              <span>{lang === 'ua' ? `Виконані спец-накази (${rec.actions.orders.length})` : `Special Orders (${rec.actions.orders.length})`}</span>
                            </div>
                            <div className="text-[11px] text-stone-400 space-y-0.5 max-h-24 overflow-y-auto">
                              {rec.actions.orders.map((o, i) => (
                                <div key={i}>• [{o.action}] {o.details}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* DFHack Command Line */}
                      <div className="p-2 bg-black rounded border border-emerald-900/60 text-emerald-400 flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span className="text-[11px] truncate">{rec.terminalCommand}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-950 border-t border-stone-800 px-5 py-2.5 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span>{lang === 'ua' ? 'Показано записів:' : 'Showing entries:'}</span>
            <span className="text-amber-400 font-bold font-mono">{filteredRecords.length} / {actionHistory.length}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-bold transition-colors"
          >
            {lang === 'ua' ? 'Закрити' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
