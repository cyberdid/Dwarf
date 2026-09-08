/**
 * Stocks & Fortress Inventory Ledger Modal
 * Authentic Dwarf Fortress Steam Edition stocks accounting screen.
 */

import React from 'react';
import { FortressState } from '../types/simulation';
import { X, Package, Beer, Coffee, Trees, Gem, Shield, Coins, Search } from 'lucide-react';

interface StocksModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FortressState;
  lang: 'en' | 'ua';
}

export const StocksModal: React.FC<StocksModalProps> = ({
  isOpen,
  onClose,
  state,
  lang
}) => {
  if (!isOpen) return null;

  const categories = [
    {
      nameEn: 'Food & Rations',
      nameUa: 'Харчові запаси',
      icon: <Coffee className="w-4 h-4 text-rose-400" />,
      items: [
        { name: 'Plump Helmets (fungus)', count: state.stockpilesCounts.food * 12, quality: 'Fine', value: 120 },
        { name: 'Cave Wheat Sheaves', count: 24, quality: 'Standard', value: 48 },
        { name: 'Prepared Meat Cutlets', count: 18, quality: 'Masterwork', value: 90 },
        { name: 'Cave Fish Fillet', count: 14, quality: 'Fine', value: 70 }
      ]
    },
    {
      nameEn: 'Dwarven Brews & Ales',
      nameUa: 'Елі та Напої',
      icon: <Beer className="w-4 h-4 text-amber-400" />,
      items: [
        { name: 'Dwarven Ale (Cedar barrel)', count: state.stockpilesCounts.ale * 15, quality: 'Exceptional', value: 220 },
        { name: 'Dwarven Wine', count: 16, quality: 'Superior', value: 160 },
        { name: 'Cave Wheat Beer', count: 20, quality: 'Fine', value: 100 }
      ]
    },
    {
      nameEn: 'Raw Wood & Lumber',
      nameUa: 'Деревина та Колоди',
      icon: <Trees className="w-4 h-4 text-amber-600" />,
      items: [
        { name: 'Cedar Logs', count: state.stockpilesCounts.wood * 5, quality: 'Raw', value: 45 },
        { name: 'Spore Fungal Stems', count: 8, quality: 'Raw', value: 24 }
      ]
    },
    {
      nameEn: 'Mined Stones & Ores',
      nameUa: 'Камінь та Руда',
      icon: <Gem className="w-4 h-4 text-yellow-400" />,
      items: [
        { name: 'Granite Boulders', count: state.stockpilesCounts.stone * 4, quality: 'Rough', value: 36 },
        { name: 'Hematite (Iron Ore)', count: state.stockpilesCounts.ore * 3, quality: 'High Grade', value: 180 },
        { name: 'Native Gold Ore', count: 6, quality: 'Precious', value: 300 },
        { name: 'Rough Sapphire Gemstones', count: 3, quality: 'Uncut', value: 450 }
      ]
    },
    {
      nameEn: 'Finished Goods & Tools',
      nameUa: 'Готові вироби та Інструменти',
      icon: <Shield className="w-4 h-4 text-sky-400" />,
      items: [
        { name: 'Copper Mining Pickaxes', count: 4, quality: 'Fine', value: 240 },
        { name: 'Woodcutter Steel Axes', count: 3, quality: 'Exceptional', value: 210 },
        { name: 'Cedar Bed Frames', count: 7, quality: 'Superior', value: 350 },
        { name: 'Granite Mason Crafts', count: 12, quality: 'Masterwork', value: 480 }
      ]
    }
  ];

  const totalValue = categories.reduce(
    (acc, cat) => acc + cat.items.reduce((s, i) => s + i.value, 0),
    state.wealth
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-3xl df-gold-frame rounded-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-b-2 border-[#5a4522] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-600/20 border border-amber-600/50 flex items-center justify-center text-amber-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-base font-bold text-amber-300 tracking-wider">
                {lang === 'ua' ? 'РЕЄСТР ЗАПАСІВ ФОРТЕЦІ (STOCKS)' : 'FORTRESS STOCKS & ASSETS'}
              </h2>
              <p className="text-[11px] text-stone-400 font-mono">
                {lang === 'ua'
                  ? 'Офіційний облік майна експедиції та королівського багатства'
                  : 'Royal Expedition Treasury & Stockpile Ledger'}
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

        {/* Wealth Summary Banner */}
        <div className="px-5 py-2.5 bg-[#181614] border-b border-stone-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-4">
            <span className="text-stone-400">
              {lang === 'ua' ? 'Статус бухгалтера:' : 'Bookkeeper Status:'}
            </span>
            <span className="text-emerald-400 font-semibold">
              {lang === 'ua' ? 'Точний облік (Highest Precision)' : 'Accurate (Highest Precision)'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-amber-300 font-bold font-cinzel text-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>☼{totalValue} {lang === 'ua' ? 'Дварфійських Крон' : 'Dwarven Urists'}</span>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 font-mono text-xs">
          {categories.map((cat, idx) => (
            <div key={idx} className="bg-stone-950/70 border border-stone-800/90 rounded-md overflow-hidden">
              <div className="px-3.5 py-2 bg-stone-900/80 border-b border-stone-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-stone-200 font-bold">
                  {cat.icon}
                  <span className="font-cinzel text-xs text-amber-200">
                    {lang === 'ua' ? cat.nameUa : cat.nameEn}
                  </span>
                </div>
                <span className="text-[11px] text-stone-500">
                  {cat.items.length} {lang === 'ua' ? 'позицій' : 'categories'}
                </span>
              </div>

              <div className="divide-y divide-stone-900">
                {cat.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="px-4 py-2 flex items-center justify-between hover:bg-stone-900/40 transition-colors"
                  >
                    <span className="text-stone-300 font-medium">{item.name}</span>
                    <div className="flex items-center gap-6">
                      <span className="text-stone-500 text-[11px]">{item.quality}</span>
                      <span className="w-16 text-right font-bold text-amber-400">~{item.count}</span>
                      <span className="w-16 text-right text-emerald-400 font-mono">☼{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-950/90 border-t border-stone-800 flex items-center justify-between">
          <span className="text-[11px] text-stone-500 font-mono">
            {lang === 'ua' ? 'Натисніть ESC або хрестик для виходу' : 'Press ESC or close button to return'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 df-btn-bevel text-xs font-bold text-amber-300 rounded font-cinzel transition-colors"
          >
            {lang === 'ua' ? 'Закрити' : 'Close Ledger'}
          </button>
        </div>
      </div>
    </div>
  );
};
