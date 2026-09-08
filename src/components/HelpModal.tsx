/**
 * Dwarf Fortress Steam Controls & Guide Modal
 */

import React from 'react';
import { X, Keyboard, MousePointer, Info, Shield, Pickaxe, Compass } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'ua';
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', descEn: 'Pause / Resume Simulation', descUa: 'Пауза / Запуск симуляції' },
    { key: '.', descEn: 'Step Forward 1 Tick', descUa: 'Крок на 1 тік вперед' },
    { key: '1, 2, 5', descEn: 'Change Simulation Speed (1x, 2x, 5x)', descUa: 'Зміна швидкості симуляції' },
    { key: '> / < (or E / Q)', descEn: 'Ascend / Descend Z-Level strata', descUa: 'Перехід між Z-рівнями вгору / вниз' },
    { key: 'Mouse Wheel', descEn: 'Zoom In / Out camera', descUa: 'Масштабування камери' },
    { key: 'Middle / Right Mouse Drag', descEn: 'Pan camera view across the map', descUa: 'Панорамування / переміщення карти' },
    { key: 'q', descEn: 'Inspect Dwarf or Strata Block', descUa: 'Інспектувати дварфа або блок породи' },
    { key: 'd', descEn: 'Designate Mining & Excavation', descUa: 'Призначити копання / гірництво' },
    { key: 't', descEn: 'Designate Tree Chopping', descUa: 'Призначити вирубку лісу' },
    { key: 'g', descEn: 'Gather Surface Plants', descUa: 'Збір дикорослих рослин' },
    { key: 'p', descEn: 'Stockpile designations (Stone, Wood, Food, Ore)', descUa: 'Розмітка складів ресурсів' },
    { key: 'b', descEn: 'Construct Walls, Doors, Beds, Tables', descUa: 'Будівництво стін, дверей, меблів' },
    { key: 'w', descEn: 'Construct Workshops (Brewery Still, Mason)', descUa: 'Будівництво майстерень та цехів' },
    { key: 'u', descEn: 'Open Citizens & Workers Roster', descUa: 'Відкрити список громадян фортеці' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl df-gold-frame rounded-lg overflow-hidden flex flex-col max-h-[85vh] shadow-2xl font-mono">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-950/90 border-b-2 border-[#5a4522] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-amber-600/20 border border-amber-600/50 flex items-center justify-center text-amber-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-cinzel text-base font-bold text-amber-300 tracking-wider">
                {lang === 'ua' ? 'КЕРУВАННЯ ТА ГАРЯЧІ КЛАВІШІ' : 'CONTROLS & SHORTCUTS GUIDE'}
              </h2>
              <p className="text-[11px] text-stone-400">
                {lang === 'ua' ? 'Класичні команди Dwarf Fortress Steam Edition' : 'Authentic Dwarf Fortress Steam Edition inputs'}
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          <div className="space-y-2">
            <h3 className="font-cinzel text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4" />
              {lang === 'ua' ? 'Гарячі клавіші' : 'Keyboard & Mouse Shortcuts'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {shortcuts.map((sc, idx) => (
                <div
                  key={idx}
                  className="bg-[#141210] p-2.5 rounded border border-[#3b2f1a] flex items-center justify-between"
                >
                  <span className="text-stone-300">{lang === 'ua' ? sc.descUa : sc.descEn}</span>
                  <kbd className="px-2 py-0.5 rounded bg-[#2e2617] text-amber-300 font-bold border border-[#5a4522] text-[10px]">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-[#171512] rounded border border-[#4a391e] space-y-1.5 text-stone-300">
            <h4 className="font-cinzel font-bold text-amber-300 text-xs flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              {lang === 'ua' ? 'Поради керівнику фортеці:' : 'Fortress Overseer Tips:'}
            </h4>
            <p className="text-[11px] leading-relaxed text-stone-400">
              {lang === 'ua'
                ? 'Дварфам потрібен постійний доступ до їжі (гриби та м’ясо) та напоїв (ель з пивоварні), інакше вони впадають у депресію та сказ. Використовуйте інструмент копання [d], щоб прорубати зали у горі, будуйте ліжка [b-b] та створюйте склади [p].'
                : 'Dwarves require regular nourishment (fungus, cave wheat) and dwarven ale from the still to prevent tantrums and melancholy. Use mining [d] to dig deep halls into the mountain, build beds [b-b] and designate stockpiles [p] to organize resources.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-stone-950/90 border-t border-[#3b2f1a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 df-btn-bevel text-xs font-bold text-amber-300 rounded font-cinzel transition-colors"
          >
            {lang === 'ua' ? 'Зрозуміло' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
