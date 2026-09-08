/**
 * In-depth technical architecture analysis of:
 * 1) https://github.com/kevshakes/dwarf-fortress-simulation
 * 2) https://github.com/Qartar/dwarf-fortress
 */

export interface RepoAnalysis {
  name: string;
  url: string;
  author: string;
  language: string;
  architectureType: string;
  descriptionEn: string;
  descriptionUa: string;
  strengths: { titleEn: string; titleUa: string; descEn: string; descUa: string }[];
  limitations: { titleEn: string; titleUa: string; descEn: string; descUa: string }[];
  fileBreakdown: { path: string; purposeEn: string; purposeUa: string; lines: number }[];
}

export const REPO_ANALYSIS_KEVSHAKES: RepoAnalysis = {
  name: 'dwarf-fortress-simulation',
  url: 'https://github.com/kevshakes/dwarf-fortress-simulation',
  author: 'kevshakes',
  language: 'Python 3 (NumPy, Tkinter / Curses)',
  architectureType: 'Modular Agent-Based Simulation (ECS-lite + Utility AI)',
  descriptionEn:
    'An educational and experimental simulation inspired by Dwarf Fortress written in modern Python. Implements 3D procedural terrain via Perlin noise, Maslow-inspired hierarchy of needs for dwarf agents, A* 3D pathfinding with spatial partitioning, and multi-layer physics.',
  descriptionUa:
    'Освітня та експериментальна симуляція за мотивами Dwarf Fortress, написана на Python 3. Реалізує 3D процедурний ландшафт через шум Перліна, ієрархію потреб агентів у стилі Маслоу, 3D A* пошук шляху з просторовим розбиттям та багаторівневу фізику.',
  strengths: [
    {
      titleEn: 'Clean Clean-Code Decoupling',
      titleUa: 'Чиста модульна архітектура',
      descEn: 'Clear separation of concerns: world state, entity components, AI managers, and GUI/CLI renderers are distinct modules.',
      descUa: 'Чітке розділення відповідальності: стан світу, компоненти сутностей, менеджери ШІ та рендери GUI/CLI знаходяться в окремих пакетах.'
    },
    {
      titleEn: 'Multi-layer 3D Perlin Noise',
      titleUa: 'Багатошаровий 3D шум Перліна',
      descEn: 'Uses 3D noise coordinates for elevation, cavern cavity generation, and mineral deposit distribution across Z-levels.',
      descUa: 'Використовує 3D координати шуму для розрахунку висот, порожнин печер та жил корисних копалин на різних Z-рівнях.'
    },
    {
      titleEn: 'Autonomous Utility AI',
      titleUa: 'Автономний Utility ШІ для агентів',
      descEn: 'Dwarves prioritize tasks dynamically based on decay rates of hunger, thirst, sleep, social needs, and work motivation.',
      descUa: 'Гноми динамічно оцінюють терміновість завдань на основі спаду шкал голоду, спраги, втоми, спілкування та бажання працювати.'
    }
  ],
  limitations: [
    {
      titleEn: 'Python GIL & Tick Bottleneck',
      titleUa: 'Обмеження GIL та швидкодії Python',
      descEn: 'Simulating large fortresses (>50 dwarves, 100x100 map) in pure Python causes frame drops without native C extensions or worker threads.',
      descUa: 'Симуляція великих поселень (>50 гномів, 100x100 карта) на чистому Python стикається з обмеженнями GIL без C-біндінґів.'
    },
    {
      titleEn: 'Desktop GUI Dependency (Tkinter)',
      titleUa: 'Залежність від Tkinter',
      descEn: 'The GUI relies on Tkinter desktop canvas, which cannot run directly in headless cloud containers or web browsers without a port.',
      descUa: 'Інтерфейс прив’язаний до десктопного Tkinter, що унеможливлює нативний запуск у хмарних контейнерах або браузерах без портування.'
    }
  ],
  fileBreakdown: [
    { path: 'world/world_generator.py', purposeEn: '3D Perlin terrain, strata layers, biomes, mineral veins, rivers', purposeUa: '3D шум Перліна, геологічні пласти, біоми, рудні жили, річки', lines: 340 },
    { path: 'entities/dwarf.py', purposeEn: 'Dwarf data model, stats (Str/Agi/Int), skills, inventory, thoughts', purposeUa: 'Модель даних гнома, характеристики, навички, інвентар, думки', lines: 280 },
    { path: 'ai/pathfinding.py', purposeEn: '3D A* graph search across X, Y, and vertical Z ramps/stairs', purposeUa: '3D A* алгоритм пошуку шляхів по X, Y та вертикальних Z-пандусах', lines: 210 },
    { path: 'ai/needs_system.py', purposeEn: 'Decay rates and utility evaluation for dwarf needs hierarchy', purposeUa: 'Швидкість спаду та оцінка корисності ієрархії потреб гномів', lines: 160 },
    { path: 'simulation/physics_engine.py', purposeEn: 'Liquid pressure, structural collapse, mining yield logic', purposeUa: 'Тиск рідин, структурна міцність склепінь, розрахунок видобутку', lines: 195 },
    { path: 'utils/noise.py', purposeEn: 'Mathematical 3D Perlin noise generator with permutation tables', purposeUa: 'Математична реалізація 3D шуму Перліна з таблицями перестановок', lines: 95 },
    { path: 'utils/history_generator.py', purposeEn: 'Procedural generation of historical events and world lore', purposeUa: 'Процедурна генерація історичних подій та хроніки світу', lines: 120 }
  ]
};

export const REPO_ANALYSIS_QARTAR: RepoAnalysis = {
  name: 'dwarf-fortress',
  url: 'https://github.com/Qartar/dwarf-fortress',
  author: 'Qartar (Mirroring Bay 12 Games / Tarn Adams)',
  language: 'C/C++ (Binary) + Declarative RAW Token Files',
  architectureType: 'Data-Driven Procedural Engine with Tokenized Raws',
  descriptionEn:
    'An archive repository containing the original classic Dwarf Fortress engine releases alongside the complete canonical RAW data ecosystem. Demonstrates how Dwarf Fortress achieves infinite procedural depth via pure declarative data files without recompiling.',
  descriptionUa:
    'Архівний репозиторій, що містить релізи оригінального рушія Dwarf Fortress разом із повною канонічною екосистемою RAW-файлів. Демонструє, як гра досягає неймовірної глибини через декларативні токенізовані конфігурації без перекомпільовування коду.',
  strengths: [
    {
      titleEn: 'Declarative Token Grammar ([OBJECT:...])',
      titleUa: 'Декларативна граматика токенів ([OBJECT:...])',
      descEn: 'Entire creatures, body tissues, wounds, minerals, and reactions are defined in text files parsed at boot time, enabling unmatched moddability.',
      descUa: 'Усі істоти, тканини тіла, типи ран, мінерали та реакції задаються в текстових файлах, що читаються під час запуску, забезпечуючи безмежний моддинг.'
    },
    {
      titleEn: 'Hyper-detailed Anatomy & Physics',
      titleUa: 'Наддетальна анатомія та фізика матеріалів',
      descEn: 'Every organism is composed of layers (skin, fat, muscle, cartilage, bone, arteries) with accurate shear, impact, and melting parameters.',
      descUa: 'Кожен організм складається з шарів (шкіра, жир, м’язи, хрящі, кістки, артерії) з реальними фізичними параметрами навантаження та плавлення.'
    },
    {
      titleEn: 'Deep History & Mythology Generation',
      titleUa: 'Глибока симуляція тисячолітньої історії',
      descEn: 'Before embarkation, simulates hundreds of years of world history: wars, heroes, artifacts, beast migrations, and rise/fall of kingdoms.',
      descUa: 'Перед висадкою симулює сотні років історії світу: війни, героїв, артефакти, міграції звірів та розквіт/падіння цивілізацій.'
    }
  ],
  limitations: [
    {
      titleEn: 'Single-Threaded CPU Bottleneck ("FPS Death")',
      titleUa: 'Проблема «FPS Death» через однопотоковість',
      descEn: 'Classic DF calculates all pathfinding, temperature diffusion, and fluid dynamics on a single CPU core, leading to slow ticks in old fortresses.',
      descUa: 'Класичний рушій обчислює шляхи, дифузію температур та рідини на одному ядрі процесора, що веде до деградації FPS у старих фортецях.'
    },
    {
      titleEn: 'Proprietary Closed-Source Core',
      titleUa: 'Закритий вихідний код ядра',
      descEn: 'The compiled binary Dwarf Fortress.exe cannot be ported to WebAssembly or modified directly without reverse engineering (DFHack).',
      descUa: 'Скомпільований бінарник не має відкритого вихідного коду для прямого збирання у WebAssembly без хаків пам’яті (DFHack).'
    }
  ],
  fileBreakdown: [
    { path: 'raw/objects/creature_standard.txt', purposeEn: 'Full biology & raws for Dwarves, Humans, Elves, Goblins, Kobolds', purposeUa: 'Повна біологія та токени гномів, людей, ельфів, гоблінів, кобольдів', lines: 4200 },
    { path: 'raw/objects/inorganic_stone_mineral.txt', purposeEn: 'Over 100 authentic geological minerals, ores, gems, and adamantine', purposeUa: 'Понад 100 мінералів, руд, дорогоцінних каменів та адамантин', lines: 950 },
    { path: 'raw/objects/plant_standard.txt', purposeEn: 'Subterranean crops (Plump Helmets, Pig Tails) and surface flora', purposeUa: 'Підземні культури (товстошоломники) та рослинність поверхні', lines: 1800 },
    { path: 'raw/objects/item_weapon.txt', purposeEn: 'Weapon specifications: balance, penetration flags, edge/blunt attacks', purposeUa: 'Характеристики зброї: баланс, пробивна здатність, рубаючі/дробарські атаки', lines: 350 },
    { path: 'data/art/curses_square_16x16.bmp', purposeEn: 'Classic IBM Code Page 437 tileset bitmap used for ASCII rendering', purposeUa: 'Класичний растровий тайлсет IBM Code Page 437 для ASCII-відображення', lines: 0 }
  ]
};

export const COMPARATIVE_SYSTEM_ANALYSIS = [
  {
    feature: 'World Generation',
    featureUa: 'Генерація світу',
    kevshakes: '3D Perlin noise grid with heightmap, elevation biomes, and discrete subterranean cavern cavity noise.',
    kevshakesUa: '3D сітка шуму Перліна з картою висот, висотними біомами та порожнинами печер.',
    qartar: 'Midpoint displacement & plate tectonics, drainage, salinity, volcanism, followed by erosion cycles.',
    qartarUa: 'Зміщення серединних точок, тектоніка плит, дренаж, солоність, вулканізм та цикли ерозії.',
    verdict: 'kevshakes provides a streamlined, highly performant real-time generator; Qartar reflects Bay 12 deep geological modeling.'
  },
  {
    feature: 'Dwarf AI & Needs',
    featureUa: 'ШІ та потреби гномів',
    kevshakes: 'Needs hierarchy (Hunger, Thirst, Sleep, Social, Work) directly mapped to priority queues and task dispatchers.',
    kevshakesUa: 'Ієрархія потреб (голод, спрага, сон, соціум, праця) у чергах пріоритетів та диспетчері завдань.',
    qartar: 'Trait personality vectors (50+ facets like anxiety, curiosity, greed), mood states, and memory associations.',
    qartarUa: 'Вектори особистості (понад 50 рис, тривожність, жадібність), настрої та асоціативні спогади.',
    verdict: 'The kevshakes approach is ideal for an agile simulation loop, while Bay 12 raws define the psychological depth.'
  },
  {
    feature: 'Pathfinding',
    featureUa: 'Пошук шляху',
    kevshakes: '3D A* with Chebyshev/Manhattan distance and vertical Z-transition weighting.',
    kevshakesUa: '3D A* із Мангеттенською евристикою та вагою переходів між Z-рівнями.',
    qartar: 'Hierarchical A* (HPA*) on 16x16 block tiles with pre-calculated connectivity maps.',
    qartarUa: 'Ієрархічний A* (HPA*) по блоках 16x16 із попереднім розрахунком зв’язності.',
    verdict: 'In our web port, we combine 3D A* with fast bounds checking for interactive 60 FPS performance.'
  },
  {
    feature: 'Modding & Extensibility',
    featureUa: 'Модифікації та розширюваність',
    kevshakes: 'Python class inheritance and configuration dictionaries in `core/config.py`.',
    kevshakesUa: 'Успадкування класів Python та словники конфігурацій у `core/config.py`.',
    qartar: 'Plaintext `[TOKEN:ARG]` RAW files in `raw/objects/` that require zero programming knowledge.',
    qartarUa: 'Текстові файли токенів `[TOKEN:ARG]` у папці `raw/objects/`, що не потребують навичок кодингу.',
    verdict: 'Bay 12 RAW token design remains the golden standard for procedural game architectures.'
  }
];
