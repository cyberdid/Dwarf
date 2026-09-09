/**
 * Authentic Dwarf Fortress Steam Edition Character Sheet & Inspector
 * Features pixel-art portrait canvas, mood thoughts chronicle,
 * needs progress bars, skills ranks, inventory, and geological inspector.
 */

import React, { useState } from 'react';
import { DwarfEntity, Tile } from '../types/simulation';
import { generateDwarfPortrait } from '../engine/pixelSprites';
import {
  X,
  Heart,
  Brain,
  Shield,
  Activity,
  Beer,
  Coffee,
  Moon,
  Users,
  Hammer,
  Sparkles,
  Package,
  Layers,
  Pickaxe,
  Axe
} from 'lucide-react';

interface DwarfDossierProps {
  dwarf: DwarfEntity | null;
  tile: Tile | null;
  onClose: () => void;
  lang: 'en' | 'ua';
}

export const DwarfDossier: React.FC<DwarfDossierProps> = ({
  dwarf,
  tile,
  onClose,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'needs' | 'skills' | 'inventory'>('overview');

  if (!dwarf && !tile) return null;

  return (
    <aside className="w-80 sm:w-96 flex flex-col pilgrimage-panel pilgrimage-frame rounded-l-lg text-[#f2e8d5] h-full shadow-2xl z-20 overflow-hidden select-none">
      {/* Header with Heraldry */}
      <div className="p-3.5 bg-[#1a140d] border-b-2 border-[#8c784c] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {dwarf ? (
            <img
              src={generateDwarfPortrait(dwarf.name, dwarf.title, dwarf.gender, dwarf.mood)}
              alt={dwarf.name}
              className="w-12 h-12 rounded border-2 border-[#bea067] shadow-md image-pixelated bg-[#140e06] shrink-0"
              style={{ imageRendering: 'pixelated' }}
            />
          ) : (
            <div className="w-12 h-12 rounded border-2 border-[#bea067] bg-[#140e06] flex items-center justify-center text-[#f5d576] font-cinzel text-base shrink-0">
              ⚒
            </div>
          )}

          <div className="flex flex-col leading-tight">
            <h3 className="font-cinzel font-bold text-sm text-[#f5d576] tracking-wide">
              {dwarf ? dwarf.name : `${lang === 'ua' ? 'Блок породи' : 'Strata Tile'}`}
            </h3>
            <span className="text-[12px] text-[#c7b897] font-garamond italic">
              {dwarf
                ? `${dwarf.title} • ${dwarf.age} ${lang === 'ua' ? 'р.' : 'yo'} (${dwarf.gender === 'male' ? (lang === 'ua' ? 'Чол.' : 'Male') : (lang === 'ua' ? 'Жін.' : 'Female')})`
                : `${tile?.material.toUpperCase()} (X:${tile?.x}, Y:${tile?.y}, Z:${tile?.z})`}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-[#c7b897] hover:text-[#fef0c7] hover:bg-[#302719] rounded transition-colors"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* If inspecting a Dwarf */}
      {dwarf ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub-Navigation Tabs */}
          <div className="px-3 py-1.5 bg-[#140e06] border-b border-[#52432a] flex items-center justify-between text-xs">
            {(['overview', 'needs', 'skills', 'inventory'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-2.5 py-1 rounded font-cinzel text-[11px] transition-colors ${
                  activeTab === tab
                    ? 'bg-gradient-to-b from-[#8c784c] to-[#594b31] text-[#fef0c7] font-bold border border-[#bea067] shadow'
                    : 'text-[#c7b897] hover:text-[#f2e8d5]'
                }`}
              >
                {tab === 'overview'
                  ? (lang === 'ua' ? 'Огляд' : 'Overview')
                  : tab === 'needs'
                  ? (lang === 'ua' ? 'Потреби' : 'Needs')
                  : tab === 'skills'
                  ? (lang === 'ua' ? 'Навички' : 'Skills')
                  : (lang === 'ua' ? 'Речі' : 'Items')}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {activeTab === 'overview' && (
              <>
                {/* Mood & Emotional State */}
                <div className="bg-[#18130c] border border-[#52432a] rounded-lg p-3 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-[#c7b897] flex items-center gap-1.5 font-cinzel text-[11px]">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      {lang === 'ua' ? 'Настрій' : 'Emotional State'}:
                    </span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${getMoodBadge(dwarf.mood)}`}>
                      {dwarf.mood} ({dwarf.happinessScore}%)
                    </span>
                  </div>

                  {/* Current Active Task */}
                  <div className="pt-1.5 border-t border-[#3b2f1c]">
                    <span className="text-[11px] text-[#c7b897] font-cinzel">
                      {lang === 'ua' ? 'Поточна праця:' : 'Current Activity:'}
                    </span>
                    <p className="text-[#f5d576] font-garamond text-sm font-semibold mt-0.5 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      {dwarf.currentTask
                        ? (lang === 'ua' ? dwarf.currentTask.descriptionUa : dwarf.currentTask.descriptionEn)
                        : (lang === 'ua' ? 'Відпочиває та оглядає фортецю' : 'Resting and socializing')}
                    </p>
                    {dwarf.currentTask && (
                      <div className="w-full bg-[#120d06] h-2 rounded-full mt-2 overflow-hidden border border-[#52432a]">
                        <div
                          className="bg-gradient-to-r from-[#bea067] to-[#f5d576] h-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (dwarf.currentTask.progress / dwarf.currentTask.maxProgress) * 100)}%`
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Thoughts Chronicle */}
                <div className="space-y-2">
                  <h4 className="text-[#f5d576] font-cinzel font-bold text-xs tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-sky-400" />
                    {lang === 'ua' ? 'Думки та враження' : 'Recent Thoughts & Memories'}
                  </h4>

                  <div className="space-y-1.5">
                    {dwarf.thoughts.slice(-4).map(t => (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded border text-xs font-garamond leading-relaxed ${
                          t.positive
                            ? 'bg-[#18281b] border-[#2f663a] text-emerald-300'
                            : 'bg-[#2b1717] border-[#6b2b2b] text-rose-300'
                        }`}
                      >
                        <span className="font-cinzel text-[10px]">{t.positive ? '✦ ' : '✖ '}</span>
                        {lang === 'ua' ? t.textUa : t.textEn}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Attributes */}
                <div className="space-y-2">
                  <h4 className="text-[#f5d576] font-cinzel font-bold text-xs tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#d4b57a]" />
                    {lang === 'ua' ? 'Фізичні параметри' : 'Physical Attributes'}
                  </h4>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#18130c] p-2 rounded border border-[#52432a] flex justify-between font-garamond text-sm">
                      <span className="text-[#c7b897]">{lang === 'ua' ? 'Сила' : 'Strength'}:</span>
                      <span className="text-[#f2e8d5] font-bold">{dwarf.stats.strength}</span>
                    </div>
                    <div className="bg-[#18130c] p-2 rounded border border-[#52432a] flex justify-between font-garamond text-sm">
                      <span className="text-[#c7b897]">{lang === 'ua' ? 'Спритність' : 'Agility'}:</span>
                      <span className="text-[#f2e8d5] font-bold">{dwarf.stats.agility}</span>
                    </div>
                    <div className="bg-[#18130c] p-2 rounded border border-[#52432a] flex justify-between font-garamond text-sm">
                      <span className="text-[#c7b897]">{lang === 'ua' ? 'Інтелект' : 'Intelligence'}:</span>
                      <span className="text-[#f2e8d5] font-bold">{dwarf.stats.intelligence}</span>
                    </div>
                    <div className="bg-[#18130c] p-2 rounded border border-[#52432a] flex justify-between font-garamond text-sm">
                      <span className="text-[#c7b897]">{lang === 'ua' ? 'Витривалість' : 'Endurance'}:</span>
                      <span className="text-[#f2e8d5] font-bold">{dwarf.stats.endurance}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'needs' && (
              <div className="space-y-3">
                <h4 className="text-[#f5d576] font-cinzel font-bold text-xs tracking-wider flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-sky-400" />
                  {lang === 'ua' ? 'Ієрархія потреб' : 'Hierarchy of Needs'}
                </h4>

                <NeedBar
                  label={lang === 'ua' ? 'Ситність (Їжа)' : 'Nourishment'}
                  value={dwarf.needs.hunger}
                  icon={<Coffee className="w-3.5 h-3.5 text-amber-500" />}
                />
                <NeedBar
                  label={lang === 'ua' ? 'Спрага (Дварфійський Ель)' : 'Hydration (Ale)'}
                  value={dwarf.needs.thirst}
                  icon={<Beer className="w-3.5 h-3.5 text-sky-400" />}
                />
                <NeedBar
                  label={lang === 'ua' ? 'Сон та Відпочинок' : 'Energy (Sleep)'}
                  value={dwarf.needs.sleep}
                  icon={<Moon className="w-3.5 h-3.5 text-indigo-400" />}
                />
                <NeedBar
                  label={lang === 'ua' ? 'Спілкування (Таверна)' : 'Social Interaction'}
                  value={dwarf.needs.social}
                  icon={<Users className="w-3.5 h-3.5 text-emerald-400" />}
                />
                <NeedBar
                  label={lang === 'ua' ? 'Ремесло / Творчість' : 'Industry & Purpose'}
                  value={dwarf.needs.work}
                  icon={<Hammer className="w-3.5 h-3.5 text-amber-400" />}
                />
              </div>
            )}

            {activeTab === 'skills' && (
              <div className="space-y-3">
                <h4 className="text-[#f5d576] font-cinzel font-bold text-xs tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {lang === 'ua' ? 'Дварфійські ремесла' : 'Dwarven Labor Skills'}
                </h4>

                <div className="space-y-2">
                  <SkillItem label={lang === 'ua' ? 'Гірництво (Mining)' : 'Mining'} skill={dwarf.skills.mining} />
                  <SkillItem label={lang === 'ua' ? 'Мулярство (Masonry)' : 'Masonry'} skill={dwarf.skills.masonry} />
                  <SkillItem label={lang === 'ua' ? 'Теслярство (Carpentry)' : 'Carpentry'} skill={dwarf.skills.carpentry} />
                  <SkillItem label={lang === 'ua' ? 'Пивоваріння (Brewing)' : 'Brewing'} skill={dwarf.skills.brewing} />
                  <SkillItem label={lang === 'ua' ? 'Лісорубство (Woodcutting)' : 'Woodcutting'} skill={dwarf.skills.woodcutting} />
                  <SkillItem label={lang === 'ua' ? 'Вантажництво (Hauling)' : 'Hauling'} skill={dwarf.skills.hauling} />
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-3">
                <h4 className="text-[#f5d576] font-cinzel font-bold text-xs tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-400" />
                  {lang === 'ua' ? 'Особистий інвентар' : 'Carried Possessions'}
                </h4>

                <div className="space-y-1.5">
                  {dwarf.inventory.map((inv, idx) => (
                    <div key={idx} className="bg-[#18130c] p-2.5 rounded border border-[#52432a] flex items-center justify-between font-garamond text-sm">
                      <span className="text-[#f2e8d5] font-medium capitalize">{inv.type.replace('_', ' ')}</span>
                      <span className="text-[#f5d576] font-bold font-mono">x{inv.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : tile ? (
        /* Strata Tile Inspector */
        <div className="p-4 space-y-4 text-xs font-mono">
          <div className="bg-[#18130c] border border-[#52432a] rounded-lg p-3 space-y-2">
            <h4 className="font-cinzel text-[#f5d576] font-bold text-xs">
              {lang === 'ua' ? 'Геологічні властивості' : 'Geological Properties'}
            </h4>
            <div className="flex justify-between py-1 border-b border-[#3b2f1c]">
              <span className="text-[#c7b897]">{lang === 'ua' ? 'Матеріал' : 'Material'}:</span>
              <span className="text-[#f2e8d5] font-bold uppercase">{tile.material}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#3b2f1c]">
              <span className="text-[#c7b897]">{lang === 'ua' ? 'Твердість' : 'Hardness'}:</span>
              <span className="text-[#f5d576] font-bold">{tile.hardness} / {tile.maxHardness}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#3b2f1c]">
              <span className="text-[#c7b897]">{lang === 'ua' ? 'Вологість' : 'Water Level'}:</span>
              <span className="text-sky-400 font-bold">{tile.waterLevel}/7</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#c7b897]">{lang === 'ua' ? 'Призначення' : 'Designation'}:</span>
              <span className="text-rose-400 font-bold uppercase">{tile.designation}</span>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
};

function NeedBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const getBarColor = (val: number) => {
    if (val >= 70) return 'bg-emerald-500';
    if (val >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-stone-300 flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        <span className="font-bold text-stone-200">{Math.round(value)}%</span>
      </div>
      <div className="w-full bg-[#1e1a14] h-2 rounded-full overflow-hidden border border-[#3b2f1a]">
        <div className={`h-full transition-all duration-300 ${getBarColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function SkillItem({ label, skill }: { label: string; skill: { level: number; xp: number } }) {
  const rankNames = ['Novice', 'Adequate', 'Competent', 'Skilled', 'Proficient', 'Talented', 'Adept', 'Expert', 'Master'];
  const rank = rankNames[Math.min(rankNames.length - 1, skill.level)] || 'Novice';

  return (
    <div className="bg-[#151311] p-2 rounded border border-[#3b2f1a] flex items-center justify-between">
      <span className="text-stone-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-stone-400">{rank}</span>
        <span className="px-1.5 py-0.5 rounded bg-[#2e2617] text-amber-300 font-bold text-[11px] border border-[#5a4522]">
          Lvl {skill.level}
        </span>
      </div>
    </div>
  );
}

function getMoodBadge(mood: string): string {
  switch (mood) {
    case 'ecstatic':
    case 'happy':
      return 'bg-emerald-950 text-emerald-300 border border-emerald-700';
    case 'content':
    case 'fine':
      return 'bg-amber-950 text-amber-300 border border-amber-700';
    case 'stressed':
    case 'melancholy':
      return 'bg-orange-950 text-orange-300 border border-orange-700';
    case 'tantrum':
    case 'berserk':
      return 'bg-rose-950 text-rose-300 border border-rose-700';
    default:
      return 'bg-stone-800 text-stone-300';
  }
}
