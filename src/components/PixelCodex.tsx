import React, { useState, useEffect, useRef } from 'react';
import { getPixelSprite, generateDwarfPortrait } from '../engine/pixelSprites';
import { Sparkles, UserPlus, Play, Pause, RefreshCw, ZoomIn, Info, Shield, Hammer, Heart } from 'lucide-react';
import { DwarfEntity } from '../types/simulation';

interface PixelCodexProps {
  lang: 'en' | 'ua';
  onSpawnCustomDwarf: (customDwarf: Partial<DwarfEntity>) => void;
}

export const PixelCodex: React.FC<PixelCodexProps> = ({ lang, onSpawnCustomDwarf }) => {
  const [activeSection, setActiveSection] = useState<'sprites' | 'studio' | 'tileset'>('sprites');
  const [animTick, setAnimTick] = useState(0);
  const [isAnimPlaying, setIsAnimPlaying] = useState(true);

  // Custom Dwarf Studio State
  const [customName, setCustomName] = useState('Urist McPixel');
  const [customTitle, setCustomTitle] = useState<'Miner' | 'Brewer' | 'Mason' | 'Manager'>('Miner');
  const [customGender, setCustomGender] = useState<'male' | 'female'>('male');
  const [customMood, setCustomMood] = useState<'ecstatic' | 'content' | 'fine' | 'grumpy' | 'enraged'>('content');
  const [spawnNotification, setSpawnNotification] = useState<string | null>(null);

  // Animation ticker for sprite animation showcases
  useEffect(() => {
    if (!isAnimPlaying) return;
    const interval = setInterval(() => {
      setAnimTick(t => (t + 1) % 60);
    }, 250);
    return () => clearInterval(interval);
  }, [isAnimPlaying]);

  // Preview generated portrait
  const portraitDataUrl = generateDwarfPortrait(customName, customTitle, customGender, customMood);

  const handleSpawn = () => {
    onSpawnCustomDwarf({
      name: customName,
      title: customTitle,
      gender: customGender,
      mood: customMood as any,
      happinessScore: customMood === 'ecstatic' ? 95 : customMood === 'content' ? 70 : 40,
      skills: {
        mining: customTitle === 'Miner' ? 12 : 2,
        woodcutting: 4,
        carpentry: 3,
        masonry: customTitle === 'Mason' ? 12 : 2,
        brewing: customTitle === 'Brewer' ? 14 : 2,
        crafting: 5,
        combat: 4
      }
    });

    setSpawnNotification(
      lang === 'ua'
        ? `${customName} прибув(ла) до фортеці як мігрант!`
        : `${customName} has arrived at the fortress as a migrant!`
    );

    setTimeout(() => {
      setSpawnNotification(null);
    }, 3500);
  };

  // Sprite category catalog
  const terrainSprites = [
    { id: 'stone_wall', label: lang === 'ua' ? 'Стіна скелі' : 'Stone Strata', cat: 'Terrain' },
    { id: 'stone_cliff_south', label: lang === 'ua' ? 'Південний схил 3D' : 'Cliff South 3D', cat: 'Terrain' },
    { id: 'granite_wall', label: lang === 'ua' ? 'Гранітний фасад' : 'Granite Strata', cat: 'Terrain' },
    { id: 'marble_wall', label: lang === 'ua' ? 'Мармурова жила' : 'Marble Strata', cat: 'Terrain' },
    { id: 'obsidian_wall', label: lang === 'ua' ? 'Обсидіанова скеля' : 'Obsidian Strata', cat: 'Terrain' },
    { id: 'ore_iron_wall', label: lang === 'ua' ? 'Залізна руда' : 'Hematite Iron', cat: 'Ores' },
    { id: 'ore_gold_wall', label: lang === 'ua' ? 'Самородне золото' : 'Native Gold', cat: 'Ores' },
    { id: 'adamantine_wall', label: lang === 'ua' ? 'Адамантиновий шпиль' : 'Raw Adamantine', cat: 'Ores' },
    { id: 'floor_stone', label: lang === 'ua' ? 'Тесані плити підлоги' : 'Chiseled Flagstone', cat: 'Floors' },
    { id: 'floor_engraved', label: lang === 'ua' ? 'Гравіровані руни' : 'Engraved Runes', cat: 'Floors' },
    { id: 'grass', label: lang === 'ua' ? 'Трава з квітами' : 'Meadow Flora', cat: 'Terrain' },
    { id: animTick % 2 === 0 ? 'water_1' : 'water_2', label: lang === 'ua' ? 'Анімована вода' : 'Subterranean Waters', cat: 'Fluids' },
    { id: 'wall_constructed', label: lang === 'ua' ? 'Камʼяна кладка' : 'Ashlar Wall', cat: 'Architecture' },
    { id: 'door', label: lang === 'ua' ? 'Деревʼяні двері' : 'Banded Door', cat: 'Architecture' },
    { id: 'bed', label: lang === 'ua' ? 'Дворфське ліжко' : 'Royal Bed', cat: 'Furniture' },
    { id: 'workshop_still', label: lang === 'ua' ? 'Пивоварний куб' : 'Brewery Still', cat: 'Workshops' }
  ];

  const characterSprites = [
    { id: 'dwarf_miner', label: lang === 'ua' ? 'Дворф-шахтар' : 'Dwarf Miner (Auburn)', variant: 'auburn' },
    { id: 'dwarf_miner_swing', label: animTick % 2 === 0 ? 'dwarf_miner_swing' : 'dwarf_miner', labelText: lang === 'ua' ? 'Удар кайлом (Анімація)' : 'Mining Swing (Anim)' },
    { id: 'dwarf_miner', label: lang === 'ua' ? 'Старійшина (Сива борода)' : 'Elder Miner (Silver)', variant: 'silver' },
    { id: 'dwarf_miner', label: lang === 'ua' ? 'Золотобородий майстер' : 'Golden Beard Dwarf', variant: 'gold' },
    { id: 'dwarf_brewer', label: lang === 'ua' ? 'Пивовар з келихом' : 'Brewer with Ale' },
    { id: 'creature_war_dog', label: lang === 'ua' ? 'Бойовий мастиф' : 'Armored War Dog' },
    { id: 'creature_goblin', label: lang === 'ua' ? 'Гоблін-розвідник' : 'Goblin Scout' },
    { id: 'creature_spider', label: lang === 'ua' ? 'Печерний павук' : 'Giant Cave Spider' }
  ];

  const itemSprites = [
    { id: 'item_barrel', label: lang === 'ua' ? 'Дубова діжка елю' : 'Ale Keg Barrel' },
    { id: 'item_mushroom', label: lang === 'ua' ? 'Шоломник (Гриб)' : 'Plump Helmet Mushroom' },
    { id: 'item_gem', label: lang === 'ua' ? 'Самоцвіт / Кристал' : 'Sparkling Gem Nugget' }
  ];

  return (
    <div className="flex-1 bg-[#141210] text-stone-200 overflow-y-auto p-4 sm:p-6 select-none font-mono">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="df-gold-frame p-4 rounded-lg bg-gradient-to-r from-[#241f19] via-[#1c1813] to-[#241f19] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded border-2 border-[#785b28] bg-[#1e1b17] flex items-center justify-center text-amber-400 font-cinzel text-xl shadow-inner">
              ✨
            </div>
            <div>
              <h1 className="font-cinzel text-xl font-bold text-[#f5d576] tracking-wider">
                {lang === 'ua' ? 'ПІКСЕЛЬНИЙ КОДЕКС ТА МАЙСТЕРНЯ СПРАЙТІВ' : 'PIXEL CODEX & SPRITE ATLAS'}
              </h1>
              <p className="text-xs text-stone-400 font-medieval">
                {lang === 'ua'
                  ? 'Ручні піксельні матриці 28x28, автентична палітра DawnBringer32 та процедурні портрети дворфів'
                  : 'Hand-crafted 28x28 pixel matrices, authentic DawnBringer32 palettes, and procedural dwarf portraits'}
              </p>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 bg-[#12100e] p-1 rounded border border-[#3d321d]">
            <button
              onClick={() => setActiveSection('sprites')}
              className={`px-3 py-1.5 rounded text-xs font-cinzel font-bold transition-all ${
                activeSection === 'sprites'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-amber-300'
              }`}
            >
              {lang === 'ua' ? 'Каталог спрайтів' : 'Sprite Catalog'}
            </button>
            <button
              onClick={() => setActiveSection('studio')}
              className={`px-3 py-1.5 rounded text-xs font-cinzel font-bold transition-all ${
                activeSection === 'studio'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-amber-300'
              }`}
            >
              {lang === 'ua' ? 'Студія дворфів (64x64)' : 'Dwarf Studio (64x64)'}
            </button>
            <button
              onClick={() => setActiveSection('tileset')}
              className={`px-3 py-1.5 rounded text-xs font-cinzel font-bold transition-all ${
                activeSection === 'tileset'
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-amber-300'
              }`}
            >
              {lang === 'ua' ? 'Оригінальні тайлсети' : 'Legacy Tilesets'}
            </button>
          </div>
        </div>

        {/* Section 1: SPRITE CATALOG */}
        {activeSection === 'sprites' && (
          <div className="space-y-6">
            {/* Animation Toggle Bar */}
            <div className="flex items-center justify-between bg-[#1e1b17] border border-[#443822] px-3.5 py-2 rounded-lg text-xs">
              <span className="text-stone-300 font-cinzel">
                {lang === 'ua' ? 'Статус анімації спрайтів' : 'Sprite Animation Engine'}:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAnimPlaying(!isAnimPlaying)}
                  className="px-2.5 py-1 df-btn-bevel rounded text-stone-200 hover:text-amber-300 flex items-center gap-1.5"
                >
                  {isAnimPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{isAnimPlaying ? (lang === 'ua' ? 'Пауза' : 'Pause') : (lang === 'ua' ? 'Пуск' : 'Play')}</span>
                </button>
                <span className="text-stone-500 font-mono">Frame: {animTick % 4}</span>
              </div>
            </div>

            {/* Characters & Creatures */}
            <div>
              <h2 className="font-cinzel text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                <span>⚔️</span>
                <span>{lang === 'ua' ? 'ДВОРФИ ТА ІСТОТИ' : 'DWARVES & CREATURES'}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {characterSprites.map((item, idx) => {
                  const spriteId = item.id === 'dwarf_miner_swing' ? (animTick % 2 === 0 ? 'dwarf_miner_swing' : 'dwarf_miner') : item.id;
                  const canvas = getPixelSprite(spriteId, item.variant || 'default');
                  const dataUrl = canvas.toDataURL();
                  return (
                    <div
                      key={idx}
                      className="bg-[#1b1814] border border-[#3d321d] hover:border-amber-500/60 rounded p-3 flex flex-col items-center gap-2 text-center transition-all group shadow-sm hover:shadow-amber-900/20"
                    >
                      <div className="w-16 h-16 bg-[#12100e] rounded border border-stone-800 flex items-center justify-center p-1 relative overflow-hidden">
                        <img
                          src={dataUrl}
                          alt={item.label || item.labelText}
                          className="w-12 h-12 image-pixelated transition-transform group-hover:scale-110"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="text-[11px] text-[#f5d576] font-cinzel font-bold leading-tight">
                        {item.label || item.labelText}
                      </span>
                      <span className="text-[9px] text-stone-400 font-mono">
                        {item.id} • 28x28
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Terrain & Walls */}
            <div>
              <h2 className="font-cinzel text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                <span>⛏</span>
                <span>{lang === 'ua' ? 'ПІДЗЕМНІ ШАРИ, СКЕЛІ ТА АРХІТЕКТУРА' : 'SUBTERRANEAN STRATA & ARCHITECTURE'}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 gap-3">
                {terrainSprites.map((item, idx) => {
                  const canvas = getPixelSprite(item.id);
                  const dataUrl = canvas.toDataURL();
                  return (
                    <div
                      key={idx}
                      className="bg-[#1b1814] border border-[#3d321d] hover:border-amber-500/60 rounded p-3 flex flex-col items-center gap-2 text-center transition-all group shadow-sm hover:shadow-amber-900/20"
                    >
                      <div className="w-16 h-16 bg-[#12100e] rounded border border-stone-800 flex items-center justify-center p-1 relative overflow-hidden">
                        <img
                          src={dataUrl}
                          alt={item.label}
                          className="w-12 h-12 image-pixelated transition-transform group-hover:scale-110"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="text-[11px] text-[#f5d576] font-cinzel font-bold leading-tight">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-stone-400 font-mono">
                        {item.cat} • 28x28
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Items & Resources */}
            <div>
              <h2 className="font-cinzel text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                <span>📦</span>
                <span>{lang === 'ua' ? 'ПРЕДМЕТИ ТА РЕСУРСИ' : 'ITEMS & FORTRESS PROVISIONS'}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {itemSprites.map((item, idx) => {
                  const canvas = getPixelSprite(item.id);
                  const dataUrl = canvas.toDataURL();
                  return (
                    <div
                      key={idx}
                      className="bg-[#1b1814] border border-[#3d321d] hover:border-amber-500/60 rounded p-3 flex flex-col items-center gap-2 text-center transition-all group shadow-sm hover:shadow-amber-900/20"
                    >
                      <div className="w-16 h-16 bg-[#12100e] rounded border border-stone-800 flex items-center justify-center p-1 relative overflow-hidden">
                        <img
                          src={dataUrl}
                          alt={item.label}
                          className="w-12 h-12 image-pixelated transition-transform group-hover:scale-110"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="text-[11px] text-[#f5d576] font-cinzel font-bold leading-tight">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-stone-400 font-mono">
                        {item.id} • 28x28
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Section 2: DWARF PIXEL PORTRAIT STUDIO */}
        {activeSection === 'studio' && (
          <div className="df-gold-frame p-6 rounded-lg bg-[#1c1915] space-y-6">
            <div className="border-b border-[#4d3d22] pb-4 flex items-center justify-between">
              <div>
                <h2 className="font-cinzel text-base font-bold text-[#f5d576]">
                  {lang === 'ua' ? 'ГЕНЕРАТОР ПОРТРЕТІВ ДВОРФІВ (64x64)' : 'PROCEDURAL DWARF PORTRAIT GENERATOR (64x64)'}
                </h2>
                <p className="text-xs text-stone-400">
                  {lang === 'ua'
                    ? 'Створюйте персоналізовані піксельні аватари з індивідуальними шоломами, бородами та золотими кільцями'
                    : 'Craft customized pixel portraits featuring horned iron helmets, braided beards with gold rings, and moods'}
                </p>
              </div>
            </div>

            {/* Main Interactive Studio Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Left Column: Huge 64x64 Pixel Art Preview */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-[#13110e] border-2 border-[#544324] rounded-lg shadow-inner">
                <div className="relative p-2 bg-[#2a241b] rounded border-2 border-[#b48c36] shadow-2xl">
                  <img
                    src={portraitDataUrl}
                    alt={customName}
                    className="w-48 h-48 image-pixelated shadow-lg rounded"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  {/* Filigree decorative corners */}
                  <div className="absolute top-1 left-1 text-[#f5d576] text-xs leading-none">╔</div>
                  <div className="absolute top-1 right-1 text-[#f5d576] text-xs leading-none">╗</div>
                  <div className="absolute bottom-1 left-1 text-[#f5d576] text-xs leading-none">╚</div>
                  <div className="absolute bottom-1 right-1 text-[#f5d576] text-xs leading-none">╝</div>
                </div>

                <div className="mt-4 text-center">
                  <span className="font-cinzel text-lg font-bold text-[#f5d576] block tracking-wide">
                    {customName}
                  </span>
                  <span className="text-xs text-stone-400 font-medieval block">
                    {customTitle} • {customGender === 'male' ? (lang === 'ua' ? 'Чоловік' : 'Male') : (lang === 'ua' ? 'Жінка' : 'Female')} • {customMood.toUpperCase()}
                  </span>
                </div>

                {/* Spawn Button */}
                <button
                  onClick={handleSpawn}
                  className="mt-5 w-full py-2.5 px-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-500 text-stone-950 font-bold font-cinzel rounded shadow-md flex items-center justify-center gap-2 text-xs transition-transform active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{lang === 'ua' ? 'ЗАСЕЛИТИ ДВОРФА У ФОРТЕЦЮ' : 'SPAWN DWARF INTO FORTRESS'}</span>
                </button>

                {spawnNotification && (
                  <div className="mt-3 p-2 bg-emerald-950/80 border border-emerald-500/60 rounded text-emerald-300 text-xs text-center font-cinzel animate-fade-in">
                    {spawnNotification}
                  </div>
                )}
              </div>

              {/* Right Column: Customization Controls */}
              <div className="md:col-span-7 space-y-4 font-mono text-xs">
                {/* Name */}
                <div>
                  <label className="block text-stone-300 font-cinzel mb-1">
                    {lang === 'ua' ? 'Імʼя дворфа' : 'Dwarf Name'}:
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full bg-[#141210] border border-[#544324] rounded px-3 py-2 text-stone-100 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-stone-300 font-cinzel mb-1">
                    {lang === 'ua' ? 'Професія / Покликання' : 'Vocation / Profession'}:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Miner', 'Brewer', 'Mason', 'Manager'] as const).map(prof => (
                      <button
                        key={prof}
                        onClick={() => setCustomTitle(prof)}
                        className={`p-2 rounded border text-left flex items-center gap-2 transition-all ${
                          customTitle === prof
                            ? 'bg-[#3b2f19] border-amber-400 text-amber-300 font-bold'
                            : 'bg-[#141210] border-stone-800 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        <span>{prof === 'Miner' ? '⛏' : prof === 'Brewer' ? '🍺' : prof === 'Mason' ? '⚒' : '📜'}</span>
                        <span>{prof}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-stone-300 font-cinzel mb-1">
                    {lang === 'ua' ? 'Стать' : 'Gender'}:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCustomGender('male')}
                      className={`p-2 rounded border text-center transition-all ${
                        customGender === 'male'
                          ? 'bg-[#3b2f19] border-amber-400 text-amber-300 font-bold'
                          : 'bg-[#141210] border-stone-800 text-stone-400 hover:border-stone-600'
                      }`}
                    >
                      {lang === 'ua' ? 'Чоловік (Довга борода)' : 'Male (Braided Beard)'}
                    </button>
                    <button
                      onClick={() => setCustomGender('female')}
                      className={`p-2 rounded border text-center transition-all ${
                        customGender === 'female'
                          ? 'bg-[#3b2f19] border-amber-400 text-amber-300 font-bold'
                          : 'bg-[#141210] border-stone-800 text-stone-400 hover:border-stone-600'
                      }`}
                    >
                      {lang === 'ua' ? 'Жінка (Королівські коси)' : 'Female (Royal Braids)'}
                    </button>
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <label className="block text-stone-300 font-cinzel mb-1">
                    {lang === 'ua' ? 'Емоційний стан (Настрій)' : 'Emotional Mood'}:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ecstatic', 'content', 'fine', 'grumpy', 'enraged'] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setCustomMood(m)}
                        className={`p-2 rounded border text-center capitalize transition-all ${
                          customMood === m
                            ? 'bg-[#3b2f19] border-amber-400 text-amber-300 font-bold'
                            : 'bg-[#141210] border-stone-800 text-stone-400 hover:border-stone-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: LEGACY TILESETS */}
        {activeSection === 'tileset' && (
          <div className="df-gold-frame p-6 rounded-lg bg-[#1c1915] space-y-6">
            <div className="border-b border-[#4d3d22] pb-3">
              <h2 className="font-cinzel text-base font-bold text-[#f5d576]">
                {lang === 'ua' ? 'АВТЕНТИЧНІ СИСТЕМНІ АРТИ ТА СПРАЙТШИТИ' : 'AUTHENTIC SYSTEM SPRITESHEETS'}
              </h2>
              <p className="text-xs text-stone-400">
                {lang === 'ua'
                  ? 'Конвертовані з вихідних файлів Bay 12 Games Dwarf Fortress: курси 16x16 та дворфські персонажі'
                  : 'Extracted from Bay 12 Games Dwarf Fortress raw data: 16x16 curses glyphs and legacy character sprite maps'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Curses 16x16 */}
              <div className="bg-[#12100e] border border-[#3d321d] rounded p-4 flex flex-col items-center">
                <span className="font-cinzel text-sm font-bold text-amber-300 mb-2">
                  curses_16x16.png (CP437)
                </span>
                <div className="p-2 bg-black rounded border border-stone-800 flex items-center justify-center overflow-auto max-w-full">
                  <img
                    src="/assets/curses_16x16.png"
                    alt="curses_16x16"
                    className="image-pixelated max-h-56 object-contain"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="text-[10px] text-stone-500 font-mono mt-2">
                  256 ASCII code points • 16x16 bitmap glyphs
                </span>
              </div>

              {/* Dwarves.png */}
              <div className="bg-[#12100e] border border-[#3d321d] rounded p-4 flex flex-col items-center">
                <span className="font-cinzel text-sm font-bold text-amber-300 mb-2">
                  dwarves.png (Raw Graphic Sprites)
                </span>
                <div className="p-2 bg-black rounded border border-stone-800 flex items-center justify-center overflow-auto max-w-full">
                  <img
                    src="/assets/dwarves.png"
                    alt="dwarves"
                    className="image-pixelated max-h-56 object-contain scale-150 transform origin-center my-4"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>
                <span className="text-[10px] text-stone-500 font-mono mt-2">
                  Native dwarf professions & sprite frames
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
