/**
 * Authentic Dwarf Fortress RAW Explorer & Token Inspector
 * Sourced from Qartar/dwarf-fortress repository
 */

import React, { useState } from 'react';
import { AUTHENTIC_RAW_ENTRIES, RAW_TOKEN_DICTIONARY, RawObjectEntry } from '../data/rawObjects';
import { Search, BookOpen, Code, Sparkles, Check, FileText, ChevronRight, Info } from 'lucide-react';

interface RawExplorerProps {
  onSpawnCreature?: (type: 'war_dog' | 'goblin_scout' | 'cave_spider') => void;
  onInjectMineralVein?: (material: 'ore_iron' | 'ore_gold' | 'adamantine') => void;
  lang: 'en' | 'ua';
}

export const RawExplorer: React.FC<RawExplorerProps> = ({
  onSpawnCreature,
  onInjectMineralVein,
  lang
}) => {
  const [selectedEntryId, setSelectedEntryId] = useState<string>('dwarf');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedTokenDoc, setSelectedTokenDoc] = useState<string | null>(null);

  const selectedEntry = AUTHENTIC_RAW_ENTRIES.find(e => e.id === selectedEntryId) || AUTHENTIC_RAW_ENTRIES[0];

  const filteredEntries = AUTHENTIC_RAW_ENTRIES.filter(entry => {
    const matchesCategory = activeCategory === 'all' || entry.type === activeCategory;
    const matchesSearch =
      entry.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.nameUa.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.rawText.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(selectedEntry.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-[#0e0d0c] text-stone-200 overflow-hidden font-mono">
      {/* Sidebar File & Entry Picker */}
      <div className="w-full md:w-80 border-r-2 border-[#4a391e] flex flex-col bg-[#141210] shrink-0">
        <div className="p-4 border-b border-[#3b2f1a] space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm font-cinzel">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ua' ? 'Каталог RAW файлів' : 'RAW Objects Archive'}</span>
          </div>
          <p className="text-xs text-stone-400">
            {lang === 'ua'
              ? 'Автентичні визначення з репозиторію Qartar/dwarf-fortress'
              : 'Authentic tokens from Qartar/dwarf-fortress repository'}
          </p>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={lang === 'ua' ? 'Пошук токенів, руд, істот...' : 'Search raws, tokens, items...'}
              className="w-full pl-8 pr-3 py-1.5 bg-[#1b1815] border border-[#4a391e] rounded-md text-xs text-stone-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto text-[11px] pb-1">
            {['all', 'creature', 'inorganic', 'plant', 'item_weapon'].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full capitalize whitespace-nowrap transition-colors font-cinzel ${
                  activeCategory === cat
                    ? 'bg-amber-600 text-stone-950 font-bold'
                    : 'bg-[#221f1b] border border-[#4a391e] text-stone-400 hover:text-amber-300'
                }`}
              >
                {cat === 'all' ? (lang === 'ua' ? 'Всі' : 'All') : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredEntries.map(entry => (
            <button
              key={entry.id}
              onClick={() => setSelectedEntryId(entry.id)}
              className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                selectedEntryId === entry.id
                  ? 'bg-[#2a241b] border-amber-500/80 text-amber-300 font-semibold shadow-md'
                  : 'bg-[#181613] border-[#382c18] text-stone-300 hover:bg-[#221e18]'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">{lang === 'ua' ? entry.nameUa : entry.nameEn}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area: Raw Viewer & Simulation Mapping */}
      <div className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0f0e0d]">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#3b2f1a]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#382610] border border-[#785b28] text-amber-300 text-xs uppercase font-bold font-cinzel">
                {selectedEntry.type}
              </span>
              <h2 className="text-lg font-bold text-[#f5d576] font-cinzel">
                {lang === 'ua' ? selectedEntry.nameUa : selectedEntry.nameEn}
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Source file: <span className="text-stone-400">raw/objects/{selectedEntry.filename}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyRaw}
              className="px-3 py-1.5 df-btn-bevel rounded-md text-xs text-stone-200 transition-colors flex items-center gap-1.5 font-cinzel"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Code className="w-3.5 h-3.5" />}
              <span>{copied ? (lang === 'ua' ? 'Скопійовано' : 'Copied') : (lang === 'ua' ? 'Копіювати RAW' : 'Copy RAW')}</span>
            </button>

            {/* Test in active simulation action */}
            {selectedEntry.type === 'creature' && onSpawnCreature && (
              <button
                onClick={() => {
                  if (selectedEntry.id === 'goblin') onSpawnCreature('goblin_scout');
                  else if (selectedEntry.id === 'dwarf') onSpawnCreature('war_dog');
                  else onSpawnCreature('cave_spider');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-bold rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ua' ? 'Заспавнити у фортеці' : 'Spawn in Active Fortress'}</span>
              </button>
            )}

            {selectedEntry.type === 'inorganic' && onInjectMineralVein && (
              <button
                onClick={() => {
                  if (selectedEntry.id === 'inorganic_adamantine') onInjectMineralVein('adamantine');
                  else if (selectedEntry.id === 'inorganic_hematite') onInjectMineralVein('ore_iron');
                  else onInjectMineralVein('ore_gold');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-stone-950 font-bold rounded-md text-xs transition-colors flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ua' ? 'Впровадити жилу в карту' : 'Inject Vein in Map'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Simulation Mapping Card */}
        <div className="bg-stone-900/80 border border-stone-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg bg-stone-950 border border-stone-700 flex items-center justify-center font-mono font-bold text-lg"
              style={{ color: selectedEntry.simulationMapping.tileColor }}
            >
              {selectedEntry.simulationMapping.tileGlyph}
            </div>
            <div>
              <div className="text-stone-400">{lang === 'ua' ? 'Гліф у симуляторі' : 'Simulator Glyph'}</div>
              <div className="text-stone-200 font-semibold font-mono">
                {selectedEntry.simulationMapping.tileGlyph} ({selectedEntry.simulationMapping.tileColor})
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-stone-400">{lang === 'ua' ? 'Поведінка в симуляції' : 'Simulation Engine Behavior'}</div>
            <p className="text-stone-300 mt-0.5 leading-relaxed">
              {selectedEntry.simulationMapping.behavior}
            </p>
          </div>
        </div>

        {/* Key Tokens Parsed Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            {lang === 'ua' ? 'Ключові токени та параметри' : 'Key Tokens & Engine Directives'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedEntry.keyTokens.map((kt, idx) => (
              <div key={idx} className="bg-stone-900 border border-stone-800 p-3 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-amber-400 font-bold">{kt.token}</span>
                  <span className="text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded text-[11px] border border-sky-800">
                    {kt.value}
                  </span>
                </div>
                <p className="text-stone-400 text-[11px]">{kt.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Syntax-Highlighted RAW Code Block */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-emerald-400" />
            {lang === 'ua' ? 'Повний текст RAW файла' : 'Full RAW Definition'}
          </h3>

          <div className="bg-stone-950 border border-stone-800 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed font-mono">
            {selectedEntry.rawText.split('\n').map((line, i) => (
              <div key={i} className="hover:bg-stone-900/40 px-1 py-0.5 rounded">
                <span className="text-stone-600 select-none w-8 inline-block text-right pr-3">{i + 1}</span>
                {renderHighlightedLine(line, setSelectedTokenDoc)}
              </div>
            ))}
          </div>
        </div>

        {/* Token Documentation Reference Glossary */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            {lang === 'ua' ? 'Словник токенів Dwarf Fortress' : 'Dwarf Fortress Token Dictionary'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {RAW_TOKEN_DICTIONARY.map(tok => (
              <div
                key={tok.token}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedTokenDoc === tok.token
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                    : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
                onClick={() => setSelectedTokenDoc(tok.token)}
              >
                <div className="font-bold text-amber-400">[{tok.token}]</div>
                <div className="text-[10px] text-stone-500">{tok.category}</div>
                <p className="text-[11px] text-stone-400 mt-1 line-clamp-2">
                  {lang === 'ua' ? tok.explanationUa : tok.explanationEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple syntax highlighter for RAW tokens like [CREATURE:DWARF]
function renderHighlightedLine(line: string, onSelectToken?: (tok: string) => void) {
  const parts = line.split(/(\[[^\]]+\])/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('[') && part.endsWith(']')) {
          const inner = part.slice(1, -1);
          const [tokenName, ...args] = inner.split(':');

          return (
            <span
              key={index}
              className="text-amber-400 font-semibold hover:underline cursor-pointer"
              onClick={() => onSelectToken && onSelectToken(tokenName)}
              title={`Click to inspect [${tokenName}] documentation`}
            >
              [<span className="text-emerald-400">{tokenName}</span>
              {args.length > 0 && <span className="text-sky-300">:{args.join(':')}</span>}]
            </span>
          );
        }

        return (
          <span key={index} className="text-stone-400">
            {part}
          </span>
        );
      })}
    </>
  );
}
