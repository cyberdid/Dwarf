/**
 * Authentic Dwarf Fortress Steam Edition Bottom Menu Bar
 * Horizontal ornate bronze/gold dock with core designation tools,
 * expandable submenus (Build, Workshops, Stockpiles, Zones),
 * and side management trays (Squads, Nobles, Orders, Units).
 */

import React, { useState } from 'react';
import { DesignationType, StockpileType, ZoneType } from '../types/simulation';
import {
  Pickaxe,
  Axe,
  Hammer,
  Package,
  Ban,
  MousePointer,
  DoorOpen,
  Bed,
  Utensils,
  Wheat,
  Eraser,
  Wrench,
  Users,
  Grid3X3,
  Compass,
  Shield,
  Crown,
  Scroll,
  MapPin,
  Scale,
  Plus,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface FortressToolBarProps {
  selectedTool: string;
  onSelectTool: (tool: any) => void;
  onOpenUnitsRoster?: () => void;
  lang: 'en' | 'ua';
}

export const FortressToolBar: React.FC<FortressToolBarProps> = ({
  selectedTool,
  onSelectTool,
  onOpenUnitsRoster,
  lang
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  const handleToolClick = (toolId: string, hasSubmenu: boolean = false) => {
    if (hasSubmenu) {
      setActiveSubmenu(prev => (prev === toolId ? null : toolId));
    } else {
      setActiveSubmenu(null);
      onSelectTool(toolId);
    }
  };

  const buildItems = [
    { id: 'build_wall', labelEn: 'Wall', labelUa: 'Стіна', icon: <Hammer className="w-4 h-4 text-stone-300" />, hotkey: 'b-w' },
    { id: 'build_door', labelEn: 'Door', labelUa: 'Двері', icon: <DoorOpen className="w-4 h-4 text-amber-500" />, hotkey: 'b-d' },
    { id: 'build_bed', labelEn: 'Bed', labelUa: 'Ліжко', icon: <Bed className="w-4 h-4 text-yellow-400" />, hotkey: 'b-b' },
    { id: 'build_chair', labelEn: 'Chair', labelUa: 'Стілець', icon: <Utensils className="w-4 h-4 text-stone-400" />, hotkey: 'b-c' },
    { id: 'build_table', labelEn: 'Table', labelUa: 'Стіл', icon: <Hammer className="w-4 h-4 text-amber-600" />, hotkey: 'b-t' }
  ];

  const workshopItems = [
    { id: 'build_workshop_still', labelEn: 'Brewery (Still)', labelUa: 'Пивоварня', icon: <Utensils className="w-4 h-4 text-amber-400" />, hotkey: 'w-s' },
    { id: 'build_workshop_mason', labelEn: "Mason's Shop", labelUa: 'Майстерня муляра', icon: <Hammer className="w-4 h-4 text-stone-300" />, hotkey: 'w-m' }
  ];

  const stockpileItems = [
    { id: 'stockpile_food', labelEn: 'Food Stockpile', labelUa: 'Склад їжі', icon: <Package className="w-4 h-4 text-rose-400" />, hotkey: 'p-f' },
    { id: 'stockpile_wood', labelEn: 'Wood Stockpile', labelUa: 'Склад дерева', icon: <Package className="w-4 h-4 text-amber-600" />, hotkey: 'p-w' },
    { id: 'stockpile_stone', labelEn: 'Stone Stockpile', labelUa: 'Склад каменю', icon: <Package className="w-4 h-4 text-stone-400" />, hotkey: 'p-s' },
    { id: 'stockpile_ore', labelEn: 'Ore Stockpile', labelUa: 'Склад руди', icon: <Package className="w-4 h-4 text-yellow-400" />, hotkey: 'p-o' }
  ];

  return (
    <div className="absolute bottom-2 left-0 right-0 pointer-events-none flex flex-col items-center z-30 select-none font-mono">
      {/* Expandable Submenu Flyout */}
      {activeSubmenu && (
        <div className="pointer-events-auto mb-2 pilgrimage-panel pilgrimage-frame rounded-lg p-2 shadow-2xl flex items-center gap-1.5 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="text-[11px] text-[#f5d576] font-cinzel font-bold px-2 uppercase tracking-wider">
            {activeSubmenu === 'build' ? (lang === 'ua' ? 'Будівництво:' : 'Structures:') :
             activeSubmenu === 'workshops' ? (lang === 'ua' ? 'Майстерні:' : 'Workshops:') :
             (lang === 'ua' ? 'Склади:' : 'Stockpiles:')}
          </span>

          {(activeSubmenu === 'build' ? buildItems : activeSubmenu === 'workshops' ? workshopItems : stockpileItems).map(item => {
            const isSelected = selectedTool === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTool(item.id);
                  setActiveSubmenu(null);
                }}
                className={`px-3 py-1.5 rounded flex items-center gap-2 text-xs transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                    : 'pilgrimage-action text-[#f2e8d5] hover:text-[#fef0c7]'
                }`}
                title={`${lang === 'ua' ? item.labelUa : item.labelEn} [${item.hotkey}]`}
              >
                {item.icon}
                <span className="font-cinzel text-[11px]">{lang === 'ua' ? item.labelUa : item.labelEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Primary Centered Dock */}
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Main Dock Tray */}
        <div className="pilagrim-dock pilgrimage-panel pilgrimage-frame rounded-lg p-1.5 flex items-center gap-1.5 shadow-2xl">
          {/* Inspect Tool */}
          <button
            onClick={() => handleToolClick('inspect')}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              selectedTool === 'inspect'
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Inspect Dwarf or Tile [q]"
          >
            <MousePointer className="w-5 h-5 text-sky-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Огляд' : 'Inspect'}</span>
          </button>

          {/* Mining Tool */}
          <button
            onClick={() => handleToolClick('mine')}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              selectedTool === 'mine'
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Mine Rock & Ores [d]"
          >
            <Pickaxe className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Копати' : 'Mine'}</span>
          </button>

          {/* Chop Trees Tool */}
          <button
            onClick={() => handleToolClick('chop')}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              selectedTool === 'chop'
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Chop Trees for Lumber [t]"
          >
            <Axe className="w-5 h-5 text-emerald-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Рубати' : 'Chop'}</span>
          </button>

          {/* Gather Plants */}
          <button
            onClick={() => handleToolClick('gather')}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              selectedTool === 'gather'
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Gather Surface Plants & Berries [g]"
          >
            <Wheat className="w-5 h-5 text-lime-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Збір' : 'Gather'}</span>
          </button>

          {/* Stockpiles Menu */}
          <button
            onClick={() => handleToolClick('stockpiles', true)}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              activeSubmenu === 'stockpiles' || selectedTool.startsWith('stockpile_')
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Designate Stockpiles [p]"
          >
            <Package className="w-5 h-5 text-amber-500" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Склади' : 'Stocks'}</span>
          </button>

          {/* Erase / Cancel Tool */}
          <button
            onClick={() => handleToolClick('cancel')}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              selectedTool === 'cancel'
                ? 'bg-gradient-to-b from-rose-800 to-rose-950 text-[#fef0c7] font-bold border border-rose-500 shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-rose-300'
            }`}
            title="Erase / Cancel Designation [c]"
          >
            <Eraser className="w-5 h-5 text-rose-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Стерти' : 'Cancel'}</span>
          </button>

          <div className="h-8 w-px bg-[#726242] mx-1" />

          {/* Build Structures Menu */}
          <button
            onClick={() => handleToolClick('build', true)}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              activeSubmenu === 'build' || selectedTool.startsWith('build_')
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Construct Walls, Doors & Furniture [b]"
          >
            <Hammer className="w-5 h-5 text-amber-300" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Будувати' : 'Build'}</span>
          </button>

          {/* Workshops Menu */}
          <button
            onClick={() => handleToolClick('workshops', true)}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              activeSubmenu === 'workshops' || selectedTool.includes('workshop')
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Construct Workshops [w]"
          >
            <Wrench className="w-5 h-5 text-purple-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Цехи' : 'Shops'}</span>
          </button>

          {/* Citizens & Units */}
          <button
            onClick={() => onOpenUnitsRoster && onOpenUnitsRoster()}
            className="p-2 rounded-md flex flex-col items-center gap-0.5 text-xs pilgrimage-action text-[#c7b897] hover:text-[#fef0c7] transition-all"
            title="Citizens & Labor Management [u]"
          >
            <Users className="w-5 h-5 text-amber-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Гноми' : 'Units'}</span>
          </button>

          {/* Zones & Rooms */}
          <button
            onClick={() => handleToolClick('zones')}
            className={`p-2 rounded-md flex flex-col items-center gap-0.5 text-xs transition-all ${
              selectedTool === 'zones'
                ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                : 'pilgrimage-action text-[#c7b897] hover:text-[#fef0c7]'
            }`}
            title="Designate Zones & Bedrooms [z]"
          >
            <Grid3X3 className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] font-cinzel leading-none">{lang === 'ua' ? 'Зони' : 'Zones'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
