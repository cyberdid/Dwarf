/**
 * Authentic Dwarf Fortress RAW Definitions & Tokens
 * Extracted and parsed from Qartar/dwarf-fortress/raw/objects/
 */

export interface RawTokenExplanation {
  token: string;
  category: string;
  explanationEn: string;
  explanationUa: string;
  impact: string;
}

export interface RawObjectEntry {
  id: string;
  type: 'creature' | 'inorganic' | 'plant' | 'item_weapon' | 'entity';
  nameEn: string;
  nameUa: string;
  filename: string;
  rawText: string;
  keyTokens: { token: string; value: string; desc: string }[];
  simulationMapping: {
    tileGlyph: string;
    tileColor: string;
    behavior: string;
  };
}

export const RAW_TOKEN_DICTIONARY: RawTokenExplanation[] = [
  {
    token: 'CREATURE',
    category: 'Creature Header',
    explanationEn: 'Defines the unique identifier for a creature species.',
    explanationUa: 'Визначає унікальний ідентифікатор виду істоти.',
    impact: 'Engine creates creature template in memory.'
  },
  {
    token: 'STRANGE_MOODS',
    category: 'Psychology',
    explanationEn: 'Allows members of the race to be struck by creative or secretive fey moods to craft legendary artifacts.',
    explanationUa: 'Дозволяє істотам цього виду впадати у «дивні настрої» для створення легендарних артефактів.',
    impact: 'Dwarves claim workshops and forge masterwork items or go insane.'
  },
  {
    token: 'ALCOHOL_DEPENDENT',
    category: 'Metabolism',
    explanationEn: 'Creature requires alcohol/ale to function properly; slows down if sober too long.',
    explanationUa: 'Істота залежить від алкоголю (елю); сповільнюється і стає млявою без регулярного вживання.',
    impact: 'Fortress must maintain constant brewing production.'
  },
  {
    token: 'BODY',
    category: 'Anatomy',
    explanationEn: 'Specifies anatomical body parts composition (organs, limbs, bones, tissues).',
    explanationUa: 'Визначає анатомічну будову тіла (органи, кінцівки, кістки, тканини).',
    impact: 'Determines combat damage, severed limbs, and surgical wounds.'
  },
  {
    token: 'MATERIAL_VALUE',
    category: 'Economy',
    explanationEn: 'Multiplier for fortress created wealth when items are crafted from this material.',
    explanationUa: 'Множник вартості створюваного багатства при виготовленні виробів із цього матеріалу.',
    impact: 'Gold (x30) and Adamantine (x300) multiply fortress wealth exponentially.'
  },
  {
    token: 'ENVIRONMENT_SPEC',
    category: 'Geology',
    explanationEn: 'Dictates which rock layers (sedimentary, metamorphic, igneous) this mineral spawns in.',
    explanationUa: 'Вказує, у яких шарах гірських порід (осадових, метаморфічних, магматичних) генерується цей мінерал.',
    impact: 'Controls procedural worldgen mineral deposit placement.'
  },
  {
    token: 'DEEP_SPECIAL',
    category: 'Geology',
    explanationEn: 'Spawns exclusively at the lowest subterranean levels as spires reaching into the underworld.',
    explanationUa: 'Генерується виключно на найглибших підземних рівнях у вигляді шпилів, що ведуть у безодню.',
    impact: 'Spawns raw adamantine spires and risks breaching the circus.'
  },
  {
    token: 'SKILL_LEARN_RATE',
    category: 'Attributes',
    explanationEn: 'Determines the speed at which entities acquire experience in assigned tasks.',
    explanationUa: 'Визначає швидкість отримання досвіду та прокачування навичок у завданнях.',
    impact: 'Increases mining, smithing, and masonry mastery speed.'
  }
];

export const AUTHENTIC_RAW_ENTRIES: RawObjectEntry[] = [
  {
    id: 'dwarf',
    type: 'creature',
    nameEn: 'Dwarf [CREATURE:DWARF]',
    nameUa: 'Гном [CREATURE:DWARF]',
    filename: 'creature_standard.txt',
    rawText: `[OBJECT:CREATURE]
[CREATURE:DWARF]
	[DESCRIPTION:A short, sturdy creature fond of drink and industry.]
	[NAME:dwarf:dwarves:dwarven]
	[CASTE_NAME:dwarf:dwarves:dwarven]
	[CREATURE_TILE:1][COLOR:3:0:0]
	[CREATURE_SOLDIER_TILE:2]
	[CREATURE_CLASS:MAMMAL]
	[INTELLIGENT]
	[STRANGE_MOODS]
	[TRANCES]
	[BENIGN]
	[CANOPENDOORS]
	[PREFSTRING:beards]
	[BODY:HUMANOID_NECK:2EYES:2EARS:NOSE:2LUNGS:HEART:GUTS:ORGANS:HUMANOID_JOINTS:THROAT:NECK:SPINE:BRAIN:SKULL:5FINGERS:5TOES:MOUTH:TONGUE:FACIAL_FEATURES:TEETH:RIBCAGE]
	[BODY_DETAIL_PLAN:STANDARD_MATERIALS]
	[BODY_DETAIL_PLAN:STANDARD_TISSUES]
	[BODY_DETAIL_PLAN:VERTEBRATE_TISSUE_LAYERS:SKIN:FAT:MUSCLE:BONE:CARTILAGE]
	[BODY_DETAIL_PLAN:HEAD_HAIR_TISSUE_LAYERS]
	[BODY_DETAIL_PLAN:FACIAL_HAIR_TISSUES]
	[ALCOHOL_DEPENDENT]
	[SKILL_LEARN_RATE:MINING:150]
	[SKILL_LEARN_RATE:MASONRY:125]`,
    keyTokens: [
      { token: '[STRANGE_MOODS]', value: 'Enabled', desc: 'Allows legendary crafting inspiration or madness.' },
      { token: '[ALCOHOL_DEPENDENT]', value: 'True', desc: 'Needs dwarven beer/ale to remain fast and joyful.' },
      { token: '[SKILL_LEARN_RATE:MINING:150]', value: '150%', desc: '50% faster mining experience acquisition.' },
      { token: '[CREATURE_TILE:1]', value: 'CP437 0x01 (☺)', desc: 'Standard smiling face glyph in ASCII mode.' }
    ],
    simulationMapping: {
      tileGlyph: '☺',
      tileColor: '#f59e0b',
      behavior: 'Autonomous citizen: executes designations, sleeps, drinks ale, mines rock.'
    }
  },
  {
    id: 'goblin',
    type: 'creature',
    nameEn: 'Goblin [CREATURE:GOBLIN]',
    nameUa: 'Гоблін [CREATURE:GOBLIN]',
    filename: 'creature_standard.txt',
    rawText: `[OBJECT:CREATURE]
[CREATURE:GOBLIN]
	[DESCRIPTION:A humanoid creature twisted by dark powers, born in evil towers.]
	[NAME:goblin:goblins:goblin]
	[CASTE_NAME:goblin:goblins:goblin]
	[CREATURE_TILE:'g'][COLOR:2:0:1]
	[CREATURE_CLASS:MAMMAL]
	[EVIL][CARNIVORE]
	[INTELLIGENT]
	[BABYSNATCHER]
	[CANOPENDOORS]
	[BODY:HUMANOID:2EYES:2EARS:NOSE:2LUNGS:HEART:GUTS:ORGANS:HUMANOID_JOINTS:THROAT:NECK:SPINE:BRAIN:SKULL:5FINGERS:5TOES:MOUTH:TONGUE:FACIAL_FEATURES:TEETH:RIBCAGE]`,
    keyTokens: [
      { token: '[EVIL]', value: 'Alignment', desc: 'Belongs to evil civilization, inherently hostile to mountain halls.' },
      { token: '[BABYSNATCHER]', value: 'Ambush role', desc: 'Sends thieves and siege scouts to raid fortresses.' },
      { token: '[CREATURE_TILE:\'g\']', value: 'g', desc: 'ASCII glyph represents green goblin scout.' }
    ],
    simulationMapping: {
      tileGlyph: 'g',
      tileColor: '#ef4444',
      behavior: 'Hostile raider: lurks on surface, alerts war dogs, triggers defense alarms.'
    }
  },
  {
    id: 'inorganic_adamantine',
    type: 'inorganic',
    nameEn: 'Raw Adamantine [INORGANIC:ADAMANTINE]',
    nameUa: 'Сирий адамантин [INORGANIC:ADAMANTINE]',
    filename: 'inorganic_stone_mineral.txt',
    rawText: `[OBJECT:INORGANIC]
[INORGANIC:ADAMANTINE]
	[ITEM_SYMBOL:'£'][BASIC_COLOR:3:1]
	[STATE_NAME_ADJ:ALL_SOLID:raw adamantine]
	[STATE_NAME_ADJ:LIQUID:molten adamantine]
	[STATE_NAME_ADJ:GAS:boiling adamantine]
	[DISPLAY_UNGLAZED]
	[MATERIAL_VALUE:300]
	[SPEC_HEAT:7500]
	[MELTING_POINT:25000]
	[BOILING_POINT:50000]
	[IMPACT_YIELD:5000000]
	[IMPACT_FRACTURE:5000000]
	[SHEAR_YIELD:5000000]
	[SHEAR_FRACTURE:5000000]
	[DEEP_SPECIAL]
	[THREAD_METAL]`,
    keyTokens: [
      { token: '[MATERIAL_VALUE:300]', value: '300x Value', desc: 'Most valuable material in Dwarf Fortress.' },
      { token: '[DEEP_SPECIAL]', value: 'Deep Spires', desc: 'Spawns in the deep underground strata at z=0.' },
      { token: '[THREAD_METAL]', value: 'Cloth / Armor', desc: 'Can be extracted into adamantine strands for indestructible armor.' }
    ],
    simulationMapping: {
      tileGlyph: '£',
      tileColor: '#06b6d4',
      behavior: 'Legendary ore at lowest Z-level: awards immense fortress wealth (+500).'
    }
  },
  {
    id: 'inorganic_hematite',
    type: 'inorganic',
    nameEn: 'Hematite / Iron [INORGANIC:HEMATITE]',
    nameUa: 'Гематит / Залізо [INORGANIC:HEMATITE]',
    filename: 'inorganic_stone_mineral.txt',
    rawText: `[OBJECT:INORGANIC]
[INORGANIC:HEMATITE]
	[ITEM_SYMBOL:'*'][BASIC_COLOR:4:0]
	[STATE_NAME_ADJ:ALL_SOLID:hematite]
	[SOLID_DENSITY:5260]
	[MATERIAL_VALUE:3]
	[ENVIRONMENT:SEDIMENTARY:VEIN:100]
	[ENVIRONMENT:IGNEOUS_EXTRUSIVE:VEIN:100]
	[METAL_ORE:IRON:100]`,
    keyTokens: [
      { token: '[METAL_ORE:IRON:100]', value: '100% Yield', desc: 'Smelts directly into iron bars for picks, anvils, and plate armor.' },
      { token: '[ENVIRONMENT:SEDIMENTARY:VEIN:100]', value: 'Sedimentary', desc: 'Frequently veins through sedimentary rock layers.' }
    ],
    simulationMapping: {
      tileGlyph: '*',
      tileColor: '#f97316',
      behavior: 'Iron ore vein: mined by dwarves to produce iron nuggets for smelting.'
    }
  },
  {
    id: 'plant_plump_helmet',
    type: 'plant',
    nameEn: 'Plump Helmet [PLANT:MUSHROOM_HELMET_PLUMP]',
    nameUa: 'Товстошоломник [PLANT:MUSHROOM_HELMET_PLUMP]',
    filename: 'plant_standard.txt',
    rawText: `[OBJECT:PLANT]
[PLANT:MUSHROOM_HELMET_PLUMP]
	[NAME:plump helmet:plump helmets:plump helmet]
	[ITEM_SYMBOL:'%'][BASIC_COLOR:5:0]
	[UNDERGROUND_DEPTH:1:2]
	[GROWTH_DURATION:300]
	[BIOME:SUBTERRANEAN_WATER]
	[PREFSTRING:subterranean nature]
	[USE_MATERIAL_TEMPLATE:STRUCTURAL:STRUCTURAL_PLANT_TEMPLATE]
	[MATERIAL_VALUE:2]
	[EDIBLE_RAW]
	[DRINK:Dwarven wine:dwarven wines:Dwarven wine]`,
    keyTokens: [
      { token: '[EDIBLE_RAW]', value: 'Edible', desc: 'Can be eaten directly without cooking.' },
      { token: '[DRINK:Dwarven wine]', value: 'Brewable', desc: 'Can be brewed in a still into dwarven wine.' },
      { token: '[UNDERGROUND_DEPTH:1:2]', value: 'Caverns', desc: 'Grows naturally in dark underground cavern soils.' }
    ],
    simulationMapping: {
      tileGlyph: '%',
      tileColor: '#d946ef',
      behavior: 'Primary food & drink source: satisfies dwarf hunger and thirst.'
    }
  },
  {
    id: 'item_weapon_pick',
    type: 'item_weapon',
    nameEn: 'Mining Pick [ITEM_WEAPON:ITEM_WEAPON_PICK]',
    nameUa: 'Шахтарське кайло [ITEM_WEAPON:ITEM_WEAPON_PICK]',
    filename: 'item_weapon.txt',
    rawText: `[OBJECT:ITEM]
[ITEM_WEAPON:ITEM_WEAPON_PICK]
	[NAME:pick:picks]
	[ARMORLEVEL:1]
	[SKILL:MINING]
	[TWO_HANDED:37500]
	[MINIMUM_SIZE:30000]
	[MATERIAL_SIZE:3]
	[ATTACK:EDGE:100:1000:strike:strikes:NO_SUB:1250]
		[ATTACK_PREPARE_AND_RECOVER:3:3]
		[ATTACK_FLAG_EDGE]
		[ATTACK_PRIORITY:MAIN]
	[ATTACK:BLUNT:100:1000:strike:strikes:shaft:1250]
		[ATTACK_PREPARE_AND_RECOVER:3:3]
		[ATTACK_FLAG_CANLATCH]
		[ATTACK_PRIORITY:SECOND]`,
    keyTokens: [
      { token: '[SKILL:MINING]', value: 'Mining', desc: 'Required tool for carving tunnels and digging ore veins.' },
      { token: '[ATTACK:EDGE]', value: 'Lethal Piercing', desc: 'Double purpose as a deadly armor-piercing weapon in military.' }
    ],
    simulationMapping: {
      tileGlyph: '/',
      tileColor: '#cbd5e1',
      behavior: 'Equipped by miners to excavate walls and defend against underground horrors.'
    }
  }
];
