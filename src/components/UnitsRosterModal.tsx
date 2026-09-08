/**
 * Citizens & Labor Roster Modal (Units Management)
 * Authentic Dwarf Fortress Steam Edition colony roster.
 */

import React, { useState } from 'react';
import { DwarfEntity } from '../types/simulation';
import { X, Users, Heart, Activity, Search, Shield, ChevronRight } from 'lucide-react';

interface UnitsRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  dwarves: DwarfEntity[];
  onSelectDwarf: (dwarf: DwarfEntity) => void;
  lang: 'en' | 'ua';
}

export const UnitsRosterModal: React.FC<UnitsRosterModalProps> = ({
  isOpen,
  onClose,
  dwarves,
  onSelectDwarf,
  lang
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredDwarves = dwarves.filter(
    d =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl df-gold-frame rounded-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-b-2 border-[#5a4522] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-600/20 border border-amber-600/50 flex items-center justify-center text-amber-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-base font-bold text-amber-300 tracking-wider">
                {lang === 'ua' ? 'СПИСОК ГРОМАДЯН ТА РОБІТНИКІВ (UNITS)' : 'CITIZENS & WORKERS ROSTER'}
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                {lang === 'ua'
                  ? `${dwarves.length} дварфів несуть службу фортеці`
                  : `${dwarves.length} dwarves active in the fortress`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-2.5 bg-[#181614] border-b border-[#3b2f1a] flex items-center gap-2">
          <Search className="w-4 h-4 text-stone-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={lang === 'ua' ? 'Пошук за ім’ям або професією...' : 'Filter by dwarf name or profession...'}
            className="w-full bg-transparent text-xs text-stone-200 focus:outline-none font-mono placeholder:text-stone-600"
          />
        </div>

        {/* Dwarf Roster Table */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1 font-mono text-xs">
          <div className="divide-y divide-[#2a2216]">
            {filteredDwarves.map(dwarf => (
              <div
                key={dwarf.id}
                onClick={() => {
                  onSelectDwarf(dwarf);
                  onClose();
                }}
                className="py-2.5 px-3 flex items-center justify-between hover:bg-[#221d17] cursor-pointer rounded transition-colors group"
              >
                {/* Left: Avatar & Name */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded border border-[#5a4522] flex items-center justify-center font-bold text-stone-950 text-sm shadow-sm"
                    style={{ backgroundColor: dwarf.color }}
                  >
                    ☺
                  </div>
                  <div>
                    <h4 className="font-cinzel text-xs font-bold text-amber-200 group-hover:text-amber-300">
                      {dwarf.name}
                    </h4>
                    <span className="text-[11px] text-stone-400 font-medieval">
                      {dwarf.title} • {dwarf.age} {lang === 'ua' ? 'р.' : 'yo'}
                    </span>
                  </div>
                </div>

                {/* Center: Activity */}
                <div className="hidden sm:flex flex-col items-center max-w-xs text-center">
                  <span className="text-[10px] text-stone-500 font-cinzel">{lang === 'ua' ? 'Праця' : 'Activity'}</span>
                  <span className="text-[11px] text-amber-400/90 truncate flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" />
                    {dwarf.currentTask
                      ? (lang === 'ua' ? dwarf.currentTask.descriptionUa : dwarf.currentTask.descriptionEn)
                      : (lang === 'ua' ? 'Вільний (Idle)' : 'Idle')}
                  </span>
                </div>

                {/* Right: Mood Badge & Action */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-stone-500 font-cinzel">{lang === 'ua' ? 'Настрій' : 'Mood'}</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {dwarf.mood} ({dwarf.happinessScore}%)
                    </span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-950/90 border-t border-[#3b2f1a] flex items-center justify-between">
          <span className="text-[11px] text-stone-500 font-mono">
            {lang === 'ua' ? 'Клікніть на дварфа для переходу до нього' : 'Click on any dwarf to inspect and focus camera'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 df-btn-bevel text-xs font-bold text-amber-300 rounded font-cinzel transition-colors"
          >
            {lang === 'ua' ? 'Закрити' : 'Close Roster'}
          </button>
        </div>
      </div>
    </div>
  );
};
