# Correct & Observable AI Overseer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Gemini overseer actually callable, make the simulation tick a pure reducer, and log every AI cycle to a JSONL file that can be analyzed via a CLI and an in-app panel.

**Architecture:** Server-side Express route already brokers Gemini; we fix the model id, add a server-side JSONL logger invoked on every cycle, expose a read endpoint, and add a CLI + React panel over the log file. The client tick reducer is refactored to copy-on-write so it never mutates prior React state.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Express 4, `@google/genai`, Vitest (added), tsx, Node 22.

## Global Constraints

- Repo/workdir: `Dwarf/Dwarf`; branch `feat/ai-overseer-correctness-observability`.
- Gemini model id is exactly `gemini-2.5-flash`, single-sourced in `server.ts` as `GEMINI_MODEL`.
- No new runtime dependencies; Vitest is the only new devDependency.
- Local testing runs on the heuristic engine (no `GEMINI_API_KEY`); the Gemini path must stay correct for AI Studio.
- All user-facing UI strings are bilingual (`lang: 'ua' | 'en'`), matching existing components.
- `tsc --noEmit` must stay clean; toggle visibility with `el.hidden` conventions already in codebase.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

**New files**
- `geminiLog.ts` (repo root, beside `server.ts`) — log record type, builder, appender, reader, aggregator, date validator. One responsibility: Gemini cycle logging + analysis primitives. Imported by `server.ts` (bundled by esbuild) and the CLI (via tsx) and tests.
- `src/engine/tileWriter.ts` — copy-on-write helpers for the 3D tile array.
- `scripts/analyze-gemini-logs.ts` — CLI analyzer (run via tsx).
- `src/components/AiAnalyticsModal.tsx` — in-app analytics panel.
- `vitest.config.ts` — node-environment test config.
- `tests/serverModel.test.ts`, `tests/geminiLog.test.ts`, `tests/simulationEngine.purity.test.ts`.

**Modified files**
- `server.ts` — single `GEMINI_MODEL`; log every cycle; `GET /api/df-ai/logs`; wire the existing (currently unused) `rateLimitMiddleware` into the AI routes.
- `src/engine/simulationEngine.ts` — copy-on-write pure reducer.
- `src/engine/dfAiClient.ts` — real model label.
- `src/App.tsx`, `src/components/DfAiToolbar.tsx` — open the analytics modal; model copy.
- `.gitignore` — add `logs/`.
- `package.json` — `test`, `test:watch`, `analyze:ai` scripts; `vitest` devDependency.

---

## Task 1: Fix the Gemini model id + set up Vitest + git hygiene

**Files:**
- Modify: `server.ts:10` (constant already correct), `server.ts:290` (`model: "gemini-3.8-flash"` → `model: GEMINI_MODEL`), `server.ts:431` (`source: "gemini-3.8-flash"` → `source: "gemini"`).
- Modify: `src/engine/dfAiClient.ts:56` and `:447` (`'gemini-3.8-flash'` → `'gemini-2.5-flash'`).
- Modify: `package.json` (scripts + `vitest` devDependency), `.gitignore` (add `logs/`).
- Create: `vitest.config.ts`, `tests/serverModel.test.ts`.

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `GEMINI_MODEL` remains `"gemini-2.5-flash"` in `server.ts`; a working `npm test` (Vitest) that later tasks reuse.

- [ ] **Step 1: Add Vitest config and scripts**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest",
"analyze:ai": "tsx scripts/analyze-gemini-logs.ts"
```

Install Vitest as a devDependency:

Run: `npm install -D vitest@^2`
Expected: `vitest` appears under devDependencies; `package-lock.json` updates.

- [ ] **Step 2: Write the failing guard test**

Create `tests/serverModel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('Gemini model id is single-sourced and valid', () => {
  it('server.ts does not reference the invalid gemini-3.8-flash model', () => {
    expect(read('server.ts')).not.toContain('gemini-3.8-flash');
  });

  it('server.ts defines GEMINI_MODEL=gemini-2.5-flash and uses it as the model', () => {
    const src = read('server.ts');
    expect(src).toMatch(/const GEMINI_MODEL\s*=\s*["']gemini-2\.5-flash["']/);
    expect(src).toMatch(/model:\s*GEMINI_MODEL/);
  });

  it('client no longer hardcodes the invalid model label', () => {
    expect(read('src/engine/dfAiClient.ts')).not.toContain('gemini-3.8-flash');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tests/serverModel.test.ts`
Expected: FAIL — `server.ts` and `dfAiClient.ts` still contain `gemini-3.8-flash`.

- [ ] **Step 4: Apply the fixes**

In `server.ts`, the generation call (currently `model: "gemini-3.8-flash",` at line 290) becomes:

```ts
      model: GEMINI_MODEL,
```

In `server.ts`, the success echo (currently `source: "gemini-3.8-flash",` at line 431) becomes:

```ts
      source: "gemini",
```

In `src/engine/dfAiClient.ts`, `INITIAL_DF_AI_STATE.aiModel` (line 56) and the fallback label (line 447) change `'gemini-3.8-flash'` → `'gemini-2.5-flash'`.

In `.gitignore`, add a line:

```
logs/
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/serverModel.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit (includes previously-untracked lockfile)**

```bash
git add server.ts src/engine/dfAiClient.ts vitest.config.ts tests/serverModel.test.ts package.json package-lock.json .gitignore
git commit -m "fix(ai): use gemini-2.5-flash everywhere; add vitest harness

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Make runSimulationTick a pure copy-on-write reducer

**Files:**
- Create: `src/engine/tileWriter.ts`
- Modify: `src/engine/simulationEngine.ts` (line 21 tiles clone; line 22 items clone; the `updatedDwarf` construction; the task-execution branch; every tile-write site)
- Create: `tests/simulationEngine.purity.test.ts`

**Interfaces:**
- Consumes: `Tile` from `src/types/simulation`.
- Produces:
  - `cloneTilesSpine(base: Tile[][][]): Tile[][][]` — returns a new tiles array with fresh layer/row arrays but shared tile objects.
  - `getWritableTile(tiles: Tile[][][], base: Tile[][][], z: number, y: number, x: number): Tile | undefined` — returns a writable tile, cloning it into `tiles` on first write; returns `undefined` if out of range.

- [ ] **Step 1: Write the failing purity test**

Create `tests/simulationEngine.purity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runSimulationTick } from '../src/engine/simulationEngine';
import { FortressState, Tile, MaterialType } from '../src/types/simulation';

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.getOwnPropertyNames(o).forEach(k => deepFreeze((o as any)[k]));
    Object.freeze(o);
  }
  return o;
}

function makeTile(x: number, y: number, z: number, material: MaterialType): Tile {
  return {
    x, y, z, material, hardness: 10, maxHardness: 10, waterLevel: 0,
    stability: 100, isRevealed: false, designation: 'none', stockpile: 'none',
    zone: 'none', itemIds: [],
  };
}

function makeMinimalState(): FortressState {
  const sizeX = 3, sizeY = 3, depthZ = 3;
  const tiles: Tile[][][] = [];
  for (let z = 0; z < depthZ; z++) {
    const layer: Tile[][] = [];
    for (let y = 0; y < sizeY; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < sizeX; x++) row.push(makeTile(x, y, z, z === 0 ? 'floor_stone' : 'soil'));
      layer.push(row);
    }
    tiles.push(layer);
  }
  return {
    sizeX, sizeY, depthZ, surfaceZ: 1, tiles,
    dwarves: [{
      id: 'd1', name: 'Urist', title: 'Miner', gender: 'male', age: 40,
      x: 1, y: 1, z: 1, targetPosition: null, path: [],
      stats: { strength: 10, agility: 10, intelligence: 10, endurance: 10 },
      needs: { hunger: 50, thirst: 50, sleep: 50, social: 50, work: 50 },
      skills: {
        mining: { level: 1, xp: 0 }, woodcutting: { level: 1, xp: 0 },
        carpentry: { level: 1, xp: 0 }, masonry: { level: 1, xp: 0 },
        brewing: { level: 1, xp: 0 }, hauling: { level: 1, xp: 0 },
      },
      inventory: [], mood: 'content', happinessScore: 50, thoughts: [],
      currentTask: null, color: '#fff',
    }],
    creatures: [], items: [],
    stockpilesCounts: { stone: 0, wood: 0, food: 0, ore: 0, ale: 0 },
    wealth: 0, year: 105, season: 'Spring', day: 1, tick: 0,
  } as FortressState;
}

describe('runSimulationTick purity', () => {
  it('does not mutate a deep-frozen input state', () => {
    const state = deepFreeze(makeMinimalState());
    expect(() => runSimulationTick(state, [], () => {})).not.toThrow();
  });

  it('advances the tick without mutating the input tick', () => {
    const state = makeMinimalState();
    const next = runSimulationTick(state, [], () => {});
    expect(next.tick).toBe(1);
    expect(state.tick).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/simulationEngine.purity.test.ts`
Expected: FAIL — the fog-of-war pass writes `isRevealed` on a frozen tile, throwing "Cannot assign to read only property".

- [ ] **Step 3: Create the tile-writer helper**

Create `src/engine/tileWriter.ts`:

```ts
import { Tile } from '../types/simulation';

/**
 * Returns a new tiles array with fresh layer and row arrays, but the SAME tile
 * object references. Cheap (~depthZ*sizeY array allocations). Mutating a tile
 * requires getWritableTile, which clones the tile before its first write so the
 * original (previous React state) is never mutated.
 */
export function cloneTilesSpine(base: Tile[][][]): Tile[][][] {
  return base.map(layer => layer.map(row => row.slice()));
}

/**
 * Returns a writable tile at (z,y,x) within `tiles`. On the first write to a
 * coordinate this tick, clones the tile and swaps the clone into its row so
 * `base` (the previous state) stays untouched. Returns undefined if out of range.
 */
export function getWritableTile(
  tiles: Tile[][][],
  base: Tile[][][],
  z: number,
  y: number,
  x: number,
): Tile | undefined {
  const row = tiles[z]?.[y];
  if (!row) return undefined;
  const current = row[x];
  if (!current) return undefined;
  if (current === base[z]?.[y]?.[x]) {
    const copy = { ...current };
    row[x] = copy;
    return copy;
  }
  return current; // already cloned earlier this tick
}
```

- [ ] **Step 4: Refactor simulationEngine.ts — spine clone + items clone**

Replace line 21 (`const tiles = state.tiles;`) and its comment with:

```ts
  // Copy-on-write: fresh spine (layer/row arrays), tile objects cloned only on write.
  const baseTiles = state.tiles;
  const tiles = cloneTilesSpine(baseTiles);
```

Change line 22 (`let items = [...state.items];`) to clone each item object so in-place mutations never touch prior state:

```ts
  let items = state.items.map(it => ({ ...it }));
```

Add the import at the top of the file (next to the existing `taskIndex` import):

```ts
import { cloneTilesSpine, getWritableTile } from './tileWriter';
```

- [ ] **Step 5: Refactor simulationEngine.ts — clone mutated dwarf sub-objects**

In the `dwarves.map` callback, the `updatedDwarf` object literal (currently `{ ...dwarf, z: currentDwarfZ, needs: {...}, mood, happinessScore }`) must also clone the sub-objects that get mutated later — `skills` and `thoughts`:

```ts
    const updatedDwarf: DwarfEntity = {
      ...dwarf,
      z: currentDwarfZ,
      needs: { hunger, thirst, sleep, social, work: workNeed },
      skills: {
        mining: { ...dwarf.skills.mining },
        woodcutting: { ...dwarf.skills.woodcutting },
        carpentry: { ...dwarf.skills.carpentry },
        masonry: { ...dwarf.skills.masonry },
        brewing: { ...dwarf.skills.brewing },
        hauling: { ...dwarf.skills.hauling },
      },
      thoughts: dwarf.thoughts.slice(),
      mood,
      happinessScore: Math.round(avgNeeds),
    };
```

In the task-execution branch, immediately after `const task = updatedDwarf.currentTask;` (currently line 511), clone the task so `task.progress += 1` and completion writes don't mutate prior state:

```ts
    const task = { ...updatedDwarf.currentTask };
    updatedDwarf.currentTask = task;
```

(`updatedDwarf.currentTask` is guaranteed non-null here because the `if (!updatedDwarf.currentTask)` block above returns.)

- [ ] **Step 6: Refactor simulationEngine.ts — route every tile write through getWritableTile**

Replace each read-then-mutate of a tile with a `getWritableTile` call. The sites:

**Mining completion** (currently `const targetTile = tiles[task.targetZ]?.[task.targetY]?.[task.targetX];` ~line 541):

```ts
        const targetTile = getWritableTile(tiles, baseTiles, task.targetZ, task.targetY, task.targetX);
```

Its adjacent-reveal loop (currently `if (tiles[rz]?.[ry]?.[rx]) { tiles[rz][ry][rx].isRevealed = true; }`):

```ts
                const rt = getWritableTile(tiles, baseTiles, rz, ry, rx);
                if (rt) rt.isRevealed = true;
```

**Chopping completion** (`const targetTile = tiles[...]` ~line 636):

```ts
        const targetTile = getWritableTile(tiles, baseTiles, task.targetZ, task.targetY, task.targetX);
```

Its foliage clear (currently `if (task.targetZ + 1 < depthZ && tiles[task.targetZ + 1][task.targetY][task.targetX].material === 'tree_foliage') { tiles[...].material = 'air'; }`):

```ts
          if (task.targetZ + 1 < depthZ) {
            const foliage = getWritableTile(tiles, baseTiles, task.targetZ + 1, task.targetY, task.targetX);
            if (foliage && foliage.material === 'tree_foliage') foliage.material = 'air';
          }
```

**Building completion** (`const targetTile = tiles[...]` ~line 665):

```ts
        const targetTile = getWritableTile(tiles, baseTiles, task.targetZ, task.targetY, task.targetX);
```

**Fog-of-war pass** (currently `const t = tiles[z]?.[y]?.[x]; if (t && !t.isRevealed) { t.isRevealed = true; }` ~line 817):

```ts
            const t = tiles[z]?.[y]?.[x];
            if (t && !t.isRevealed) {
              const wt = getWritableTile(tiles, baseTiles, z, y, x)!;
              wt.isRevealed = true;
            }
```

Leave read-only tile accesses (pathfinding, walkability, item scans, `updateTileInTaskIndex` arguments) unchanged — they read shared tile objects, which is correct.

> Note on `taskIndex`: it is a derived cache updated with idempotent delete+set operations, so StrictMode double-invocation is safe. It is intentionally not deep-cloned each tick (cloning 8 Maps per tick is wasteful). The purity test constructs its state without a `taskIndex`, so the reducer builds a fresh one and never mutates a frozen input index.

- [ ] **Step 7: Run the purity test to verify it passes**

Run: `npm test -- tests/simulationEngine.purity.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/engine/tileWriter.ts src/engine/simulationEngine.ts tests/simulationEngine.purity.test.ts
git commit -m "fix(sim): make runSimulationTick a pure copy-on-write reducer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Gemini log module (build / append / read / aggregate)

**Files:**
- Create: `geminiLog.ts`
- Create: `tests/geminiLog.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (all imported by Tasks 4–6):
  - `GeminiLogSource = 'gemini' | 'heuristic' | 'gemini-fallback'`
  - `interface GeminiCommandCounts { mine; chop; build; stockpiles; zones; orders: number }`
  - `interface GeminiLogRecord { ts; cycleId; source; model; latencyMs; ok; error; directive; request; prompt; response; usage; statusSummary; commandCounts }`
  - `interface GeminiLogInput { cycleId; source; model; latencyMs; ok; error?; directive?; fortressSummary?; overworldSummary?; prompt?; responseRaw?; usage?; parsed }`
  - `interface GeminiLogAggregates { totalCycles; bySource; errorRate; latency{avg,p50,p95}; statusDistribution; avgCommandsPerCycle; topDirectives }`
  - `buildGeminiLogRecord(input: GeminiLogInput): GeminiLogRecord`
  - `appendGeminiLog(record: GeminiLogRecord, baseDir?: string): void`
  - `readGeminiLogEntries(opts?: { date?: string; baseDir?: string }): GeminiLogRecord[]`
  - `computeGeminiLogAggregates(entries: GeminiLogRecord[]): GeminiLogAggregates`
  - `isValidLogDate(date: string): boolean`

- [ ] **Step 1: Write the failing tests**

Create `tests/geminiLog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildGeminiLogRecord, appendGeminiLog, readGeminiLogEntries,
  computeGeminiLogAggregates, isValidLogDate,
} from '../geminiLog';

const base = (over: any = {}) => buildGeminiLogRecord({
  cycleId: 'c', source: 'heuristic', model: 'gemini-2.5-flash',
  latencyMs: 10, ok: true, directive: 'grow',
  parsed: { statusSummary: 'S', commands: {} }, ...over,
});

describe('buildGeminiLogRecord', () => {
  it('counts commands, extracts status, rounds latency', () => {
    const rec = buildGeminiLogRecord({
      cycleId: 'c1', source: 'heuristic', model: 'gemini-2.5-flash',
      latencyMs: 12.6, ok: true, directive: 'test',
      parsed: {
        statusSummary: 'BOOZE_EMERGENCY',
        commands: { mine: [{}, {}], chop: [{}], build: [], stockpiles: [], zones: [], orders: [{}] },
      },
    });
    expect(rec.statusSummary).toBe('BOOZE_EMERGENCY');
    expect(rec.commandCounts).toEqual({ mine: 2, chop: 1, build: 0, stockpiles: 0, zones: 0, orders: 1 });
    expect(rec.latencyMs).toBe(13);
    expect(rec.error).toBeNull();
  });
});

describe('append + read round-trip', () => {
  it('writes one JSONL line per record and reads it back', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemlog-'));
    const rec = base({ cycleId: 'c2' });
    appendGeminiLog(rec, dir);
    appendGeminiLog(base({ cycleId: 'c3' }), dir);
    const date = rec.ts.slice(0, 10);
    const back = readGeminiLogEntries({ date, baseDir: dir });
    expect(back.map(r => r.cycleId)).toEqual(['c2', 'c3']);
  });

  it('skips malformed lines without throwing', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemlog-'));
    const rec = base({ cycleId: 'ok' });
    appendGeminiLog(rec, dir);
    const date = rec.ts.slice(0, 10);
    fs.appendFileSync(path.join(dir, `gemini-${date}.jsonl`), 'not-json\n');
    expect(readGeminiLogEntries({ date, baseDir: dir }).length).toBe(1);
  });
});

describe('computeGeminiLogAggregates', () => {
  it('aggregates sources, errors and latency', () => {
    const agg = computeGeminiLogAggregates([
      base({ latencyMs: 10, ok: true }),
      base({ latencyMs: 30, ok: false, error: 'boom', source: 'gemini-fallback' }),
    ]);
    expect(agg.totalCycles).toBe(2);
    expect(agg.errorRate).toBe(0.5);
    expect(agg.bySource.heuristic).toBe(1);
    expect(agg.bySource['gemini-fallback']).toBe(1);
    expect(agg.latency.avg).toBe(20);
  });

  it('handles an empty log', () => {
    const agg = computeGeminiLogAggregates([]);
    expect(agg.totalCycles).toBe(0);
    expect(agg.errorRate).toBe(0);
    expect(agg.latency.p95).toBe(0);
  });
});

describe('isValidLogDate', () => {
  it('accepts ISO dates and rejects traversal junk', () => {
    expect(isValidLogDate('2026-09-15')).toBe(true);
    expect(isValidLogDate('../../etc/passwd')).toBe(false);
    expect(isValidLogDate('2026-9-1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/geminiLog.test.ts`
Expected: FAIL — cannot resolve `../geminiLog` (module not created yet).

- [ ] **Step 3: Implement geminiLog.ts**

Create `geminiLog.ts` at the repo root:

```ts
import fs from 'fs';
import path from 'path';

export type GeminiLogSource = 'gemini' | 'heuristic' | 'gemini-fallback';

export interface GeminiCommandCounts {
  mine: number; chop: number; build: number;
  stockpiles: number; zones: number; orders: number;
}

export interface GeminiLogRecord {
  ts: string;
  cycleId: string;
  source: GeminiLogSource;
  model: string;
  latencyMs: number;
  ok: boolean;
  error: string | null;
  directive: string;
  request: { fortressSummary: unknown; overworldSummary: unknown };
  prompt: { system: string; user: string } | null;
  response: { raw: string | null; parsed: unknown };
  usage: { promptTokens: number; candidatesTokens: number; totalTokens: number } | null;
  statusSummary: string;
  commandCounts: GeminiCommandCounts;
}

export interface GeminiLogInput {
  cycleId: string;
  source: GeminiLogSource;
  model: string;
  latencyMs: number;
  ok: boolean;
  error?: string | null;
  directive?: string;
  fortressSummary?: unknown;
  overworldSummary?: unknown;
  prompt?: { system: string; user: string } | null;
  responseRaw?: string | null;
  usage?: { promptTokens: number; candidatesTokens: number; totalTokens: number } | null;
  parsed: any;
}

function countCommands(parsed: any): GeminiCommandCounts {
  const c = (parsed && parsed.commands) || {};
  const len = (v: any) => (Array.isArray(v) ? v.length : 0);
  return {
    mine: len(c.mine), chop: len(c.chop), build: len(c.build),
    stockpiles: len(c.stockpiles), zones: len(c.zones), orders: len(c.orders),
  };
}

export function buildGeminiLogRecord(input: GeminiLogInput): GeminiLogRecord {
  return {
    ts: new Date().toISOString(),
    cycleId: input.cycleId,
    source: input.source,
    model: input.model,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    ok: input.ok,
    error: input.error ?? null,
    directive: input.directive ?? '',
    request: {
      fortressSummary: input.fortressSummary ?? null,
      overworldSummary: input.overworldSummary ?? null,
    },
    prompt: input.prompt ?? null,
    response: { raw: input.responseRaw ?? null, parsed: input.parsed ?? null },
    usage: input.usage ?? null,
    statusSummary: (input.parsed && input.parsed.statusSummary) || 'UNKNOWN',
    commandCounts: countCommands(input.parsed),
  };
}

export function logsDir(baseDir?: string): string {
  return baseDir ?? path.join(process.cwd(), 'logs');
}

function logFilePath(dateOrTs: string, baseDir?: string): string {
  const day = dateOrTs.slice(0, 10);
  return path.join(logsDir(baseDir), `gemini-${day}.jsonl`);
}

export function appendGeminiLog(record: GeminiLogRecord, baseDir?: string): void {
  let line: string;
  try {
    line = JSON.stringify(record);
  } catch {
    line = JSON.stringify({
      ts: record.ts, cycleId: record.cycleId, source: record.source,
      ok: record.ok, error: 'unserializable-record',
    });
  }
  // Mirror to stdout so Cloud Run / Cloud Logging captures it in production.
  console.log(`[gemini-log] ${line}`);
  try {
    fs.mkdirSync(logsDir(baseDir), { recursive: true });
    fs.appendFileSync(logFilePath(record.ts, baseDir), line + '\n');
  } catch (err: any) {
    console.error('[gemini-log] failed to append log file:', err?.message);
  }
}

export function isValidLogDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function readGeminiLogEntries(
  opts: { date?: string; baseDir?: string } = {},
): GeminiLogRecord[] {
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  if (!isValidLogDate(date)) return [];
  let raw: string;
  try {
    raw = fs.readFileSync(logFilePath(date, opts.baseDir), 'utf8');
  } catch {
    return [];
  }
  const out: GeminiLogRecord[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try { out.push(JSON.parse(trimmed) as GeminiLogRecord); } catch { /* skip malformed */ }
  }
  return out;
}

export interface GeminiLogAggregates {
  totalCycles: number;
  bySource: Record<string, number>;
  errorRate: number;
  latency: { avg: number; p50: number; p95: number };
  statusDistribution: Record<string, number>;
  avgCommandsPerCycle: GeminiCommandCounts;
  topDirectives: { directive: string; count: number }[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function computeGeminiLogAggregates(entries: GeminiLogRecord[]): GeminiLogAggregates {
  const total = entries.length;
  const bySource: Record<string, number> = {};
  const statusDistribution: Record<string, number> = {};
  const directives: Record<string, number> = {};
  const sum: GeminiCommandCounts = { mine: 0, chop: 0, build: 0, stockpiles: 0, zones: 0, orders: 0 };
  const latencies: number[] = [];
  let errors = 0;

  for (const e of entries) {
    bySource[e.source] = (bySource[e.source] || 0) + 1;
    statusDistribution[e.statusSummary] = (statusDistribution[e.statusSummary] || 0) + 1;
    if (e.directive) directives[e.directive] = (directives[e.directive] || 0) + 1;
    if (!e.ok) errors++;
    if (typeof e.latencyMs === 'number') latencies.push(e.latencyMs);
    const c = e.commandCounts;
    if (c) {
      sum.mine += c.mine || 0; sum.chop += c.chop || 0; sum.build += c.build || 0;
      sum.stockpiles += c.stockpiles || 0; sum.zones += c.zones || 0; sum.orders += c.orders || 0;
    }
  }
  latencies.sort((a, b) => a - b);
  const avg = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const div = total || 1;

  return {
    totalCycles: total,
    bySource,
    errorRate: total ? errors / total : 0,
    latency: { avg: Math.round(avg), p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
    statusDistribution,
    avgCommandsPerCycle: {
      mine: sum.mine / div, chop: sum.chop / div, build: sum.build / div,
      stockpiles: sum.stockpiles / div, zones: sum.zones / div, orders: sum.orders / div,
    },
    topDirectives: Object.entries(directives)
      .map(([directive, count]) => ({ directive, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/geminiLog.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → no errors.

```bash
git add geminiLog.ts tests/geminiLog.test.ts
git commit -m "feat(ai-logs): add Gemini log record builder, appender, reader, aggregator

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Log every AI cycle from the server step route

**Files:**
- Modify: `server.ts` (import `geminiLog`; restructure `POST /api/df-ai/step` to log all three paths; wire `rateLimitMiddleware` into the route)

**Interfaces:**
- Consumes: `buildGeminiLogRecord`, `appendGeminiLog`, `GEMINI_MODEL`.
- Produces: every `/api/df-ai/step` response includes `cycleId: string`; a JSONL record is appended per cycle.

- [ ] **Step 1: Add the import**

At the top of `server.ts`, after the existing imports:

```ts
import {
  buildGeminiLogRecord,
  appendGeminiLog,
  readGeminiLogEntries,
  computeGeminiLogAggregates,
  isValidLogDate,
} from "./geminiLog";
```

- [ ] **Step 2: Restructure the step route to log every path**

Replace the body of `app.post("/api/df-ai/step", ...)` (currently lines 247–443). Keep the existing `systemPrompt`, `userPrompt`, and `config`/`responseSchema` contents **exactly as they are today** — only move the prompt building above the `try` (so the `catch` can log it) and add the logging calls. The route becomes:

```ts
app.post("/api/df-ai/step", rateLimitMiddleware(), async (req, res) => {
  const body = req.body || {};
  const ai = getGeminiClient();
  const cycleId = `cyc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const start = Date.now();
  const { fortressSummary, overworldSummary, directive, historyLogs } = body;

  if (!ai) {
    const heuristicPlan = generateHeuristicDfAiPlan(body);
    appendGeminiLog(buildGeminiLogRecord({
      cycleId, source: "heuristic", model: GEMINI_MODEL, latencyMs: Date.now() - start,
      ok: true, directive, fortressSummary, overworldSummary, prompt: null,
      responseRaw: null, usage: null, parsed: heuristicPlan,
    }));
    return res.json({ cycleId, ...heuristicPlan });
  }

  const systemPrompt = `...UNCHANGED — keep current content from lines 260-270...`;
  const userPrompt = `...UNCHANGED — keep current content from lines 272-287...`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      config: { /* UNCHANGED — keep current responseMimeType + responseSchema from lines 297-426 */ },
    });

    const parsed = JSON.parse(response.text || "{}");
    const usageMeta = (response as any).usageMetadata;
    appendGeminiLog(buildGeminiLogRecord({
      cycleId, source: "gemini", model: GEMINI_MODEL, latencyMs: Date.now() - start,
      ok: true, directive, fortressSummary, overworldSummary,
      prompt: { system: systemPrompt, user: userPrompt },
      responseRaw: response.text ?? null,
      usage: usageMeta ? {
        promptTokens: usageMeta.promptTokenCount ?? 0,
        candidatesTokens: usageMeta.candidatesTokenCount ?? 0,
        totalTokens: usageMeta.totalTokenCount ?? 0,
      } : null,
      parsed,
    }));
    return res.json({ cycleId, source: "gemini", ...parsed });
  } catch (err: any) {
    const fallbackPlan = generateHeuristicDfAiPlan(body);
    appendGeminiLog(buildGeminiLogRecord({
      cycleId, source: "gemini-fallback", model: GEMINI_MODEL, latencyMs: Date.now() - start,
      ok: false, error: err?.message, directive, fortressSummary, overworldSummary,
      prompt: { system: systemPrompt, user: userPrompt }, responseRaw: null, usage: null,
      parsed: fallbackPlan,
    }));
    console.error("Gemini DF-AI step failed, using heuristic fallback:", err?.message);
    return res.json({ cycleId, ...fallbackPlan, source: "df-ai-heuristic-fallback", error: err?.message });
  }
});
```

> Implementer note: paste the real `systemPrompt`/`userPrompt`/`config` bodies verbatim from the current file — they are unchanged. Only their position (above `try`) and the added `appendGeminiLog` calls + `model: GEMINI_MODEL` differ.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification — logs are written on the heuristic path**

Run: `npm run dev` (starts `tsx server.ts` on port 3000).
In another shell:

```bash
curl -s -X POST http://localhost:3000/api/df-ai/step \
  -H 'Content-Type: application/json' \
  -d '{"fortressSummary":{"population":7},"directive":"test cycle"}' | head -c 200
```

Expected: JSON response containing `"cycleId"` and `"source":"df-ai-heuristic-engine"`; and:

```bash
ls logs/ && tail -n 1 logs/gemini-$(date -u +%F).jsonl
```

Expected: a `gemini-YYYY-MM-DD.jsonl` file whose last line is a JSON record with `"source":"heuristic"` and a `"commandCounts"` object. Stop the dev server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add server.ts
git commit -m "feat(ai-logs): log every df-ai cycle (gemini/heuristic/fallback) to JSONL

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Read endpoint GET /api/df-ai/logs

**Files:**
- Modify: `server.ts` (add the route after the step route)

**Interfaces:**
- Consumes: `readGeminiLogEntries`, `computeGeminiLogAggregates`, `isValidLogDate` (Task 3), `rateLimitMiddleware` (existing).
- Produces: `GET /api/df-ai/logs?date=YYYY-MM-DD&limit=N` → `{ date, entries: GeminiLogRecord[], aggregates: GeminiLogAggregates }` (entries newest-first).

- [ ] **Step 1: Add the route**

In `server.ts`, immediately after the `POST /api/df-ai/step` route:

```ts
// Read Gemini decision logs for the in-app analytics panel and CLI parity.
app.get("/api/df-ai/logs", rateLimitMiddleware(), (req, res) => {
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
  if (dateParam && !isValidLogDate(dateParam)) {
    return res.status(400).json({ error: "Invalid date; expected YYYY-MM-DD" });
  }
  const limit = Math.min(1000, Math.max(1, parseInt(String(req.query.limit ?? "200"), 10) || 200));
  const all = readGeminiLogEntries({ date: dateParam });
  const aggregates = computeGeminiLogAggregates(all);
  return res.json({
    date: dateParam ?? new Date().toISOString().slice(0, 10),
    entries: all.slice(-limit).reverse(),
    aggregates,
  });
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

With `npm run dev` running and at least one cycle logged (Task 4):

```bash
curl -s "http://localhost:3000/api/df-ai/logs?limit=5" | head -c 400
curl -s "http://localhost:3000/api/df-ai/logs?date=bad" -o /dev/null -w "%{http_code}\n"
```

Expected: first returns `{"date":...,"entries":[...],"aggregates":{...}}`; second prints `400`.

- [ ] **Step 4: Commit**

```bash
git add server.ts
git commit -m "feat(ai-logs): add GET /api/df-ai/logs read endpoint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: CLI analyzer

**Files:**
- Create: `scripts/analyze-gemini-logs.ts`
- (`analyze:ai` script was already added in Task 1)

**Interfaces:**
- Consumes: `readGeminiLogEntries`, `computeGeminiLogAggregates`, `isValidLogDate` (Task 3).
- Produces: `npm run analyze:ai [YYYY-MM-DD]` prints aggregates for that day (default: today).

- [ ] **Step 1: Implement the CLI**

Create `scripts/analyze-gemini-logs.ts`:

```ts
import { readGeminiLogEntries, computeGeminiLogAggregates, isValidLogDate } from '../geminiLog';

const arg = process.argv[2];
const date = arg && isValidLogDate(arg) ? arg : new Date().toISOString().slice(0, 10);

const entries = readGeminiLogEntries({ date });
if (entries.length === 0) {
  console.log(`No Gemini log entries for ${date} (logs/gemini-${date}.jsonl).`);
  process.exit(0);
}

const agg = computeGeminiLogAggregates(entries);
console.log(`\n=== Gemini DF-AI log analysis: ${date} (${agg.totalCycles} cycles) ===\n`);
console.log('Source split :', agg.bySource);
console.log('Error rate   :', (agg.errorRate * 100).toFixed(1) + '%');
console.log('Latency      :', `avg ${agg.latency.avg}ms | p50 ${agg.latency.p50}ms | p95 ${agg.latency.p95}ms`);
console.log('Status dist  :', agg.statusDistribution);
console.log('Avg cmds/cyc :', Object.fromEntries(
  Object.entries(agg.avgCommandsPerCycle).map(([k, v]) => [k, (v as number).toFixed(2)]),
));
console.log('Top directives:');
for (const d of agg.topDirectives) console.log(`  ${d.count}x  ${d.directive}`);
console.log('');
```

- [ ] **Step 2: Verify it runs against real logs**

Ensure at least one cycle is logged (from Task 4), then:

Run: `npm run analyze:ai`
Expected: prints a "Gemini DF-AI log analysis" block with `Source split : { heuristic: N }` and non-empty status distribution. (With no logs for today it prints the "No Gemini log entries" line and exits 0.)

- [ ] **Step 3: Commit**

```bash
git add scripts/analyze-gemini-logs.ts
git commit -m "feat(ai-logs): add analyze-gemini-logs CLI (npm run analyze:ai)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: In-app "AI Analytics" panel

**Files:**
- Create: `src/components/AiAnalyticsModal.tsx`
- Modify: `src/components/DfAiToolbar.tsx` (new `onOpenAnalytics` prop + button)
- Modify: `src/App.tsx` (modal state, wire prop, render modal)

**Interfaces:**
- Consumes: `GET /api/df-ai/logs` (Task 5).
- Produces: a modal opened from the DF-AI toolbar; read-only; no new game state.

- [ ] **Step 1: Create the modal component**

Create `src/components/AiAnalyticsModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { BarChart3, X, RefreshCw } from 'lucide-react';

interface CommandCounts {
  mine: number; chop: number; build: number; stockpiles: number; zones: number; orders: number;
}
interface LogEntry {
  ts: string; cycleId: string; source: string; model: string; latencyMs: number;
  ok: boolean; error: string | null; directive: string; statusSummary: string;
  commandCounts: CommandCounts;
}
interface Aggregates {
  totalCycles: number;
  bySource: Record<string, number>;
  errorRate: number;
  latency: { avg: number; p50: number; p95: number };
  statusDistribution: Record<string, number>;
  avgCommandsPerCycle: CommandCounts;
  topDirectives: { directive: string; count: number }[];
}
interface LogsResponse { date: string; entries: LogEntry[]; aggregates: Aggregates; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ua' | 'en';
}

export const AiAnalyticsModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/df-ai/logs?limit=100');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  const t = (ua: string, en: string) => (lang === 'ua' ? ua : en);
  const agg = data?.aggregates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-stone-900 border border-amber-800/70 rounded-lg shadow-2xl text-stone-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-900/60 bg-stone-950/70">
          <div className="flex items-center gap-2 font-cinzel">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{t('Аналітика рішень Gemini', 'Gemini Decision Analytics')}</span>
            {data && <span className="text-xs text-stone-500">({data.date})</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded hover:bg-stone-800 text-amber-300" title={t('Оновити', 'Refresh')}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-800 text-stone-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {error && <div className="text-red-400 text-sm">{t('Помилка завантаження:', 'Load error:')} {error}</div>}
          {!error && !agg && <div className="text-stone-400 text-sm">{t('Завантаження…', 'Loading…')}</div>}

          {agg && agg.totalCycles === 0 && (
            <div className="text-stone-400 text-sm">
              {t('Ще немає записів за сьогодні. Запустіть кілька AI-кроків.', 'No cycles logged today yet. Run a few AI steps.')}
            </div>
          )}

          {agg && agg.totalCycles > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={t('Циклів', 'Cycles')} value={String(agg.totalCycles)} />
                <Stat label={t('Помилок', 'Error rate')} value={`${(agg.errorRate * 100).toFixed(0)}%`} />
                <Stat label={t('Латентність (сер.)', 'Latency avg')} value={`${agg.latency.avg}ms`} />
                <Stat label="p95" value={`${agg.latency.p95}ms`} />
              </div>

              <Section title={t('Джерела рішень', 'Decision sources')}>
                <KeyVals map={agg.bySource} />
              </Section>

              <Section title={t('Розподіл статусів', 'Status distribution')}>
                <KeyVals map={agg.statusDistribution} />
              </Section>

              <Section title={t('Сер. команд за цикл', 'Avg commands / cycle')}>
                <KeyVals map={Object.fromEntries(
                  Object.entries(agg.avgCommandsPerCycle).map(([k, v]) => [k, Number(v).toFixed(2)]),
                )} />
              </Section>

              <Section title={t('Останні цикли', 'Recent cycles')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-stone-500 text-left">
                      <tr>
                        <th className="py-1 pr-3">{t('Час', 'Time')}</th>
                        <th className="py-1 pr-3">{t('Джерело', 'Source')}</th>
                        <th className="py-1 pr-3">{t('Статус', 'Status')}</th>
                        <th className="py-1 pr-3">ms</th>
                        <th className="py-1 pr-3">{t('Команди (d/c/b)', 'Cmds (d/c/b)')}</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {data!.entries.map(e => (
                        <tr key={e.cycleId} className="border-t border-stone-800/60">
                          <td className="py-1 pr-3 text-stone-400">{e.ts.slice(11, 19)}</td>
                          <td className={`py-1 pr-3 ${e.ok ? 'text-emerald-400' : 'text-red-400'}`}>{e.source}</td>
                          <td className="py-1 pr-3 text-amber-300">{e.statusSummary}</td>
                          <td className="py-1 pr-3 text-stone-400">{e.latencyMs}</td>
                          <td className="py-1 pr-3 text-stone-300">
                            {e.commandCounts.mine}/{e.commandCounts.chop}/{e.commandCounts.build}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-stone-950/70 border border-stone-800 rounded p-2">
    <div className="text-[10px] uppercase text-stone-500">{label}</div>
    <div className="text-lg font-bold text-amber-300 font-mono">{value}</div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-[11px] uppercase font-bold text-stone-400 mb-1">{title}</div>
    {children}
  </div>
);

const KeyVals: React.FC<{ map: Record<string, string | number> }> = ({ map }) => (
  <div className="flex flex-wrap gap-1.5">
    {Object.entries(map).map(([k, v]) => (
      <span key={k} className="text-xs bg-stone-950/70 border border-stone-800 rounded px-2 py-0.5 font-mono">
        <span className="text-stone-400">{k}</span> <span className="text-amber-300 font-semibold">{String(v)}</span>
      </span>
    ))}
  </div>
);
```

- [ ] **Step 2: Add the toolbar button**

In `src/components/DfAiToolbar.tsx`:
- Add `BarChart3` to the `lucide-react` import.
- Add `onOpenAnalytics: () => void;` to `DfAiToolbarProps` and destructure it in the component signature.
- Add this button just before the DFHack Console button (before the `{/* DFHack Console Open Button */}` comment):

```tsx
        <button
          id="btn-open-ai-analytics"
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs bg-stone-950 hover:bg-stone-900 border border-amber-700/60 text-amber-300 font-mono transition-colors shadow-sm"
          title={lang === 'ua' ? 'Аналітика рішень Gemini (логи)' : 'Gemini decision analytics (logs)'}
        >
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span>{lang === 'ua' ? 'Аналітика' : 'Analytics'}</span>
        </button>
```

- [ ] **Step 3: Wire the modal into App.tsx**

In `src/App.tsx`:
- Add the import: `import { AiAnalyticsModal } from './components/AiAnalyticsModal';`
- Add state near the other modal flags (after `isDfHackOpen`): `const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);`
- Pass the prop to `<DfAiToolbar ... />`: `onOpenAnalytics={() => setIsAnalyticsOpen(true)}`
- Render the modal beside the other modals (e.g. after `<DfHackConsoleModal ... />`):

```tsx
      <AiAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        lang={lang}
      />
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run: `npm run dev`, open `http://localhost:3000`.
- Click the DF-AI toolbar **"Analytics"** button → modal opens.
- Click **AI Step** a few times (toolbar), then **Refresh** in the modal.
- Expected: "Cycles" count rises, "Decision sources" shows `heuristic`, "Recent cycles" table fills with rows (source `df-ai-heuristic-engine`/`heuristic`, a status, a latency, command counts). Close the modal.

- [ ] **Step 6: Commit**

```bash
git add src/components/AiAnalyticsModal.tsx src/components/DfAiToolbar.tsx src/App.tsx
git commit -m "feat(ai-logs): in-app AI Analytics panel over /api/df-ai/logs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `npm test` → all suites pass (serverModel, geminiLog, simulationEngine.purity).
- [ ] `npx tsc --noEmit` → clean.
- [ ] `npm run dev`, run several AI steps, confirm `logs/gemini-<today>.jsonl` grows.
- [ ] `npm run analyze:ai` → prints sane aggregates.
- [ ] In-app Analytics panel renders those aggregates.

---

## Self-Review (against the spec)

**Spec coverage:**
- Model single-sourced → Task 1. ✔
- Pure copy-on-write reducer (tiles + dwarf skills/currentTask/thoughts + items) → Task 2. ✔
- JSONL log schema + append + stdout mirror → Task 3 (module) + Task 4 (wiring). ✔
- `GET /api/df-ai/logs` with date validation → Task 5. ✔
- CLI analyzer `npm run analyze:ai` → Task 6. ✔
- In-app analytics panel (bilingual) → Task 7. ✔
- `logs/` ignored + `package-lock.json` committed → Task 1. ✔
- Reducer purity test (deep-freeze) → Task 2. ✔

**Type consistency:** `GeminiLogRecord`, `GeminiLogInput`, `GeminiLogAggregates`, `GeminiCommandCounts`, `buildGeminiLogRecord`, `appendGeminiLog`, `readGeminiLogEntries`, `computeGeminiLogAggregates`, `isValidLogDate`, `cloneTilesSpine`, `getWritableTile` — names/signatures identical across Tasks 2–7. ✔

**Placeholder scan:** The only "UNCHANGED" markers (Task 4) point to large existing code blocks (`systemPrompt`/`userPrompt`/`config`) that must be preserved verbatim — with explicit source line ranges — rather than re-pasted; this is a preservation instruction, not an unfilled requirement. ✔

**Scope:** Focused on Phases 0+1; Phases 2–4 (execute all AI commands, economy, combat) are explicitly deferred. ✔

**Deviation noted:** `taskIndex` is intentionally updated in place (idempotent delete+set; derived cache), documented in Task 2; the purity test avoids a frozen input index by omitting `taskIndex`.
