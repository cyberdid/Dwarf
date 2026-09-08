/**
 * Dwarf Fortress Announcements & Event Log Ticker
 */

import React, { useState } from 'react';
import { FortressEvent } from '../types/simulation';
import { Bell, ChevronUp, ChevronDown, Sparkles, AlertCircle, Skull } from 'lucide-react';

interface EventTickerProps {
  events: FortressEvent[];
  lang: 'en' | 'ua';
}

export const EventTicker: React.FC<EventTickerProps> = ({ events, lang }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const latestEvent = events[events.length - 1];

  return (
    <div className="bg-[#100f0e] border-t-2 border-[#5a4522] text-stone-300 font-mono text-xs z-30 select-none shrink-0 shadow-lg">
      {/* Collapsed Bar (Always visible) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-1.5 flex items-center justify-between cursor-pointer hover:bg-[#1c1a17] transition-colors"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-bounce" />
          <span className="text-[11px] font-bold uppercase text-[#a89060] shrink-0 font-cinzel">
            {lang === 'ua' ? 'Хроніка фортеці:' : 'Announcements:'}
          </span>
          {latestEvent ? (
            <span className={`truncate font-medium ${getEventColor(latestEvent.type)}`}>
              [{latestEvent.timeStr}] {lang === 'ua' ? latestEvent.textUa : latestEvent.textEn}
            </span>
          ) : (
            <span className="text-stone-500 italic">
              {lang === 'ua' ? 'Тиша панує над гірськими залами...' : 'Quiet echoes in the mountain halls...'}
            </span>
          )}
        </div>

        <button className="text-stone-500 hover:text-amber-400 p-1">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded History Drawer */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto p-4 border-t border-[#3d321d] bg-[#141210] space-y-1.5 divide-y divide-[#241f17]">
          {events.slice().reverse().map(ev => (
            <div key={ev.id} className="pt-1.5 flex items-start gap-2.5 text-xs">
              <span className="text-stone-600 text-[11px] shrink-0 font-bold">[{ev.timeStr}]</span>
              <span className="shrink-0 mt-0.5">{getEventIcon(ev.type)}</span>
              <span className={getEventColor(ev.type)}>
                {lang === 'ua' ? ev.textUa : ev.textEn}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getEventColor(type: FortressEvent['type']): string {
  switch (type) {
    case 'discovery':
      return 'text-yellow-400 font-bold';
    case 'warning':
      return 'text-amber-400';
    case 'death':
      return 'text-rose-500 font-bold';
    default:
      return 'text-sky-300';
  }
}

function getEventIcon(type: FortressEvent['type']) {
  switch (type) {
    case 'discovery':
      return <Sparkles className="w-3.5 h-3.5 text-yellow-400" />;
    case 'warning':
      return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
    case 'death':
      return <Skull className="w-3.5 h-3.5 text-rose-500" />;
    default:
      return <span className="text-sky-400 font-bold">●</span>;
  }
}
