# Комплексний та верифікований аудит проекту Dwarf Fortress Simulation & RAW Explorer (`/boost`)

## 1. Оцінка стану проекту та перевірка виявлених дефектів

Ретельний аналіз кодової бази виявив як критичні функціональні помилки, так і архітектурні розбіжності між підсистемами симуляції, графічного відображення та інтеграції з AI.

### Зведена таблиця критичних дефектів:
| Рівень | Модуль / Файл | Суть проблеми | Наслідки |
| :--- | :--- | :--- | :--- |
| **P0** | [`OverworldView.tsx`](file:///home/cyberdid/Projects/Dwarf/src/components/OverworldView.tsx#L54-L125) | Розбіжність інтерфейсу `OverworldState` (`playerFortressLocation` vs `currentEmbarkCoords`, `width`/`height` vs `sizeX`/`sizeY`) | Миттєвий краш застосунку при відкритті карти світу |
| **P0** | [`saveSystem.ts`](file:///home/cyberdid/Projects/Dwarf/src/engine/saveSystem.ts#L31), [`App.tsx`](file:///home/cyberdid/Projects/Dwarf/src/App.tsx#L769) | Втрата екземплярів `Map` при `JSON.stringify/parse` без виклику `buildTaskIndex` при завантаженні | `TypeError: taskIndex.mining.values is not a function`, фатальна зупинка симуляції після завантаження гри |
| **P0** | [`FortressCanvas.tsx:615`](file:///home/cyberdid/Projects/Dwarf/src/components/FortressCanvas.tsx#L615) | Хардкод поверхні `const isSurfaceLevel = currentZ >= 38;` | Поверхня занурена в непроглядну темряву підземелля на всіх стандартних пресетах карти |
| **P1** | [`server.ts:10-11`](file:///home/cyberdid/Projects/Dwarf/server.ts#L10-L11) | Неіснуюча назва моделі `gemini-3.8-flash` у конфігурації за замовчуванням | Помилка API та постійний прихований відкат до евристик Бена Любара замість LLM |
| **P1** | [`simulationEngine.ts:183`](file:///home/cyberdid/Projects/Dwarf/src/engine/simulationEngine.ts#L183) | Відсутність механіки відновлення потреби `social` | Неминуче падіння шкали до 0 та математична неможливість досягти настрою `ecstatic` (> 80) |
| **P1** | [`simulation.ts:41`](file:///home/cyberdid/Projects/Dwarf/src/types/simulation.ts#L41), [`App.tsx:451`](file:///home/cyberdid/Projects/Dwarf/src/App.tsx#L451) | Непідтримуваний тип позначки `'gather'` | Обхід типізації TS через примусовий каст, відсутність індексації та ігнорування збору рослин дварфами |
| **P2** | [`dfAiClient.ts:451-501`](file:///home/cyberdid/Projects/Dwarf/src/engine/dfAiClient.ts#L451-L501) | Фантомні накази AI (`craft_furniture`, `summon_migrants`) | Відсутність відповідних обробників на клієнті |
| **P2** | [`buildingRules.ts:23`](file:///home/cyberdid/Projects/Dwarf/src/engine/buildingRules.ts#L23) | Наявність `'air'` серед дозволених поверхонь без перевірки опори на `z-1` | Можливість зведення споруд у повітрі над прірвою |
| **P2** | [`pathfinding.ts:209-218`](file:///home/cyberdid/Projects/Dwarf/src/engine/pathfinding.ts#L209-L218) | Відсутність перевірки стелі над дварфом при діагональному підйомі Z | Просочування крізь суцільну скелю на поверх вище |
| **P2** | [`App.tsx:380-385`](file:///home/cyberdid/Projects/Dwarf/src/App.tsx#L380-L385) | Колізія гарячої клавіші `.` (одночасне призначення на крок симуляції та підйом Z) | Неможливість підняття Z клавішею `.` |

---

## 2. Анатомія кодової бази

```
Dwarf/
├── server.ts                       # Express: проксі Gemini, rate limiter (20 запитів/хв), fallback на евристики, Vite middleware
├── vite.config.ts                  # Vite 6 + React + Tailwind v4
├── package.json / tsconfig.json    # Конфігурація середовища
├── metadata.json                   # Метадані Google AI Studio
├── public/
│   ├── assets/                     # curses_16x16.png (ASCII), dwarves.png
│   └── raws/                       # 5 автентичних RAW файлів DF
└── src/
    ├── main.tsx & App.tsx          # Точка входу, стан фортеці, гарячі клавіші, керування збереженнями
    ├── index.css                   # Стилі Tailwind + ретро-рамки df-gold-frame
    ├── types/simulation.ts         # Доменна модель: Tile, FortressState, DwarfEntity, TaskIndex, OverworldState
    ├── data/
    │   ├── analysisData.ts         # Порівняльний аналіз kevshakes vs Qartar
    │   └── rawObjects.ts           # Парсер та словник токенів RAW
    ├── components/                 # 16 React-компонентів інтерфейсу
    │   ├── FortressCanvas.tsx      # Головний холст (3 режими: 2D, Steam Graphic, Isometric Pilgrimage)
    │   ├── OverworldView.tsx       # Інтерактивна карта світу 64×64 (потребує адаптації типів)
    │   ├── DwarfDossier.tsx        # Детальна картка дварфа
    │   ├── FortressHeader.tsx      # Верхня панель (фази місяця, настрій, ресурси)
    │   ├── FortressToolBar.tsx     # Панель інструментів наглядача
    │   ├── DfHackConsoleModal.tsx  # Автентична ретро CRT-консоль DFHack v50.15
    │   ├── DfAiToolbar.tsx         # Керування автономним агентом Gemini
    │   ├── GeminiLogModal.tsx      # Журнал міркувань та тактичних планів AI
    │   ├── StocksModal.tsx         # Вікно обліку ресурсів
    │   ├── UnitsRosterModal.tsx    # Список громадян фортеці
    │   ├── PixelCodex.tsx          # Генератор портретів та редактор дварфів
    │   ├── RawExplorer.tsx         # Інспектор та генератор RAW об'єктів
    │   ├── EventTicker.tsx         # Стрічка сповіщень фортеці
    │   ├── FortressMinimap.tsx     # Міні-карта глибин та геології
    │   ├── HelpModal.tsx           # Довідка
    │   └── AnalysisView.tsx        # Аналітичний екран порівняння репозиторіїв
    └── engine/                     # Ядро симуляції та рендерингу
        ├── simulationEngine.ts     # Потреби, виконання завдань, FoW, календар
        ├── worldGen.ts             # 3D генерація: печери, шари порід, Море Магми
        ├── overworldGen.ts         # Генерація карти світу (біоми, річки, цивілізації)
        ├── pathfinding.ts          # 3D A* з бінарною купою
        ├── taskIndex.ts            # Просторові хеш-індекси (O(1) доступ до завдань)
        ├── tileGraphics.ts         # Автотайлінг, Ambient Occlusion, процедурні поверхні
        ├── pixelSprites.ts         # Процедурний растеризатор спрайтів дварфів
        ├── isometricRenderer.ts    # Ізометричний рушій Pilgrimage
        ├── lightingEngine.ts       # 2D трасування 72 променів та розрахунок тіней
        ├── webglPostProcessing.ts  # WebGL2 шейдери: HDR Bloom, тепловий міраж лави
        ├── particleSystem.ts       # Частинки пилу, іскор та трісок
        ├── dfAiClient.ts           # Клієнтська логіка взаємодії з агентом наглядача
        ├── buildingRules.ts        # Правила розміщення будівель
        ├── saveSystem.ts           # Збереження стану в LocalStorage та JSON
        └── noise.ts                # 3D шум Перліна
```

---

## 3. Деталізація дефектів

### Дефект 1 (P0): Критичний краш карти світу (`OverworldView.tsx`)
У компоненті [`OverworldView.tsx`](file:///home/cyberdid/Projects/Dwarf/src/components/OverworldView.tsx#L54-L125) звернення:
```tsx
const [selectedTile, setSelectedTile] = useState<WorldMapTile | null>(
  overworld.tiles[overworld.playerFortressLocation.y]?.[overworld.playerFortressLocation.x] || null
);
```
викликає миттєвий `TypeError: Cannot read properties of undefined (reading 'y')`, оскільки в [`types/simulation.ts:325`](file:///home/cyberdid/Projects/Dwarf/src/types/simulation.ts#L325) поле назване `currentEmbarkCoords`. Крім цього:
- `overworld.width` та `height` мають бути `sizeX` та `sizeY`;
- `tile.isRiver` має бути `tile.hasRiver`;
- `tile.hasSite` та `tile.siteType` мають використовувати `tile.site?.type`;
- `overworld.activeExpeditions` має бути `overworld.expeditions`.

### Дефект 2 (P0): Поломка симуляції після збереження/завантаження
У [`saveSystem.ts:31`](file:///home/cyberdid/Projects/Dwarf/src/engine/saveSystem.ts#L31) виклик `JSON.stringify` серіалізує `FortressState.taskIndex`. Оскільки `taskIndex` складається з екземплярів `Map`, після десеріалізації вони перетворюються на порожні об'єкти `{}`.
При завантаженні у [`App.tsx:769`](file:///home/cyberdid/Projects/Dwarf/src/App.tsx#L769) стан присвоюється без виклику `buildTaskIndex(loaded.tiles)`.
Наступного ж тіка симуляції у [`simulationEngine.ts:312`](file:///home/cyberdid/Projects/Dwarf/src/engine/simulationEngine.ts#L312):
```ts
for (const coord of taskIndex.mining.values())
```
викидає виключення: `TypeError: taskIndex.mining.values is not a function` і симуляція зупиняється назавжди.

### Дефект 3 (P0): Темрява на поверхні у графічному режимі
У [`FortressCanvas.tsx:615`](file:///home/cyberdid/Projects/Dwarf/src/components/FortressCanvas.tsx#L615):
```ts
const isSurfaceLevel = currentZ >= 38;
```
Пресети світу у [`worldGen.ts:33-39`](file:///home/cyberdid/Projects/Dwarf/src/engine/worldGen.ts#L33-L39) мають глибину від 24 до 40 Z, а поверхня (`surfaceBaseZ`) розташована на рівні 17-28 Z. У результаті поверхня помилково вважається підземеллям, і [`lightingEngine.ts:128`](file:///home/cyberdid/Projects/Dwarf/src/engine/lightingEngine.ts#L128) накладає фонову темряву `0.85`.

### Дефект 4 (P1): Неіснуюча назва моделі Gemini
У [`server.ts:10-11`](file:///home/cyberdid/Projects/Dwarf/server.ts#L10-L11):
```ts
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const FALLBACK_MODELS = ["gemini-flash-latest", "gemini-3.1-flash-lite"];
```
Моделей `gemini-3.8-flash` та `gemini-3.1-flash-lite` не існує в API Google. Будь-який запит повертає помилку `Model not found`, що призводить до автоматичного відкату на евристики Бена Любара на сервері.

### Дефект 5 (P1): Безповоротна втрата потреби `social`
У [`simulationEngine.ts:183`](file:///home/cyberdid/Projects/Dwarf/src/engine/simulationEngine.ts#L183) шкала щохвилини зменшується:
```ts
const social = Math.max(0, dwarf.needs.social - 0.02);
```
Але в коді немає жодної логіки поповнення цієї потреби. Через ~3500 тіків `social` стає рівним 0 для всіх дварфів. За формулою настрою середня оцінка не може перевищити `(100+100+100+0)/4 = 75`, блокуючи статус `ecstatic` (> 80).

---

## 4. Продуктивність та оптимізація

1. **Алокація пам'яті в 3D A***:
   - Конкатенація рядків виду `` `${nx},${ny},${nz}` `` для кожного вузла створює тисячі тимчасових рядків за один крок пошуку. Рекомендовано перейти на 1D числові індекси: `index = (z * sizeY + y) * sizeX + x`.
2. **Пошук шляху до ізольованих цілей**:
   - Вільні дварфи кожні кілька тіків намагаються побудувати маршрути до всіх позначених блоків шахти. Якщо жила заблокована, це створює сплески навантаження на процесор. Рекомендовано додати кеш недосяжності цілей або граф зв'язаних областей.
3. **Копіювання 2D Canvas у WebGL2**:
   - `texImage2D` щокадру копіює растровий контекст у текстуру GPU. На великих роздільних здатностях це створює навантаження на шину пам'яті.

---

## 5. Покроковий план дій (Boost Action Plan)

### Фаза 1: Усунення критичних помилок (P0)
1. **Синхронізація `OverworldView.tsx`**:
   - Привести назви властивостей у відповідність до `OverworldState` (`currentEmbarkCoords`, `sizeX`, `sizeY`, `expeditions`, `hasRiver`, `site`).
2. **Відновлення індексів завдань при завантаженні**:
   - У `saveSystem.ts` або `App.tsx` гарантувати виклик `buildTaskIndex(loaded.tiles)` при відновленні збереженого стану.
3. **Виправлення визначення поверхні**:
   - Замінити `currentZ >= 38` на `currentZ >= state.surfaceZ` у `FortressCanvas.tsx:615`.
4. **Корекція моделі Gemini**:
   - Встановити актуальну валідну модель `gemini-2.5-flash` у `server.ts` та додати `GEMINI_MODEL` у `.env.example`.

### Фаза 2: Механіки симуляції (P1)
1. **Соціалізація дварфів**:
   - Реалізувати відновлення потреби `social`, коли дварфи перебувають у бездіяльності поруч або відвідують зону таверни.
2. **Підтримка інструменту збору (`gather`)**:
   - Додати `'gather'` до `DesignationType` у `types/simulation.ts`, зареєструвати у `taskIndex.ts` та реалізувати збір рослин у `simulationEngine.ts`.
3. **Вживання води**:
   - Дозволити пити з річки або криниці у разі відсутності алкоголю.
4. **Обробка наказів DF-AI**:
   - Реалізувати клієнтські гілки для `craft_furniture` та `summon_migrants` у `dfAiClient.ts`.

### Фаза 3: Покращення фізики та пошуку шляху (P2)
1. **Перевірка стелі в 3D A***:
   - Заборонити підйом на рівень вище, якщо безпосередньо над дварфом знаходиться монолітна порода.
2. **Валідація будівель**:
   - Заборонити будівництво споруд у повітрі без твердої основи знизу.
3. **Розведення клавіш керування**:
   - Змінити гарячі клавіші для зміни Z-рівня та покрокового тіка в `App.tsx`.
