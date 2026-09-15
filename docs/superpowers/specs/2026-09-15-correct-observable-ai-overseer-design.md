# Design: Correct & Observable AI Overseer

- **Date:** 2026-09-15
- **Status:** Design approved by user; pending written-spec review
- **Scope:** Sub-project 1 of the "maximally develop functionality" effort (Phases 0 + 1)
- **Repo:** `Dwarf/Dwarf` (branch `feat/ai-overseer-correctness-observability`)

## 1. Context

The project is an interactive Dwarf Fortress web simulation (React 19 + Vite 6 + Express +
Google Gemini) with an autonomous "df-ai" overseer modeled after Ben Lubar's DFHack plugin.
A prior analysis surfaced two correctness defects plus a missing observability capability the
user explicitly wants:

1. **Gemini never actually runs.** `server.ts` health-check pings `gemini-2.5-flash`, but the
   real generation call uses `gemini-3.8-flash` — not a valid model id. Every live call throws
   and silently falls back to the heuristic engine, so the "Gemini overseer" is heuristic-only.
2. **Impure tick reducer.** `runSimulationTick` mutates the previous React state's `tiles`
   array (and nested dwarf `skills`/`currentTask`/`thoughts` and `item` objects) in place, then
   returns the same references inside a new wrapper object. Because `main.tsx` wraps the app in
   `<StrictMode>`, React double-invokes state updaters in development, so mutations apply twice
   per tick in dev; it also breaks referential-equality memoization for any `tiles` consumer.
3. **No Gemini decision logging.** There is no durable record of what the overseer decided, so
   the AI's behavior cannot be analyzed after the fact.

The user's goal: develop functionality maximally, make everything function correctly, and write
Gemini logs to a file for later analysis. Local testing runs on the heuristic engine (no local
`GEMINI_API_KEY`); the Gemini code path must be correct so it works when Google AI Studio
injects the key at runtime.

## 2. Goals / Non-goals

### Goals (this sub-project)
- One source of truth for the Gemini model id, used by both health-check and generation.
- `runSimulationTick` is a pure reducer: it never mutates any object reachable from its input
  state, and is idempotent under StrictMode double-invocation.
- Every AI overseer cycle is logged as one JSONL record to a local file, mirrored to stdout.
- The logs are analyzable via a CLI script and an in-app "AI Analytics" panel.
- Git hygiene: `logs/` ignored; `package-lock.json` committed.

### Non-goals (deferred to later phases)
- Executing the currently-ignored AI commands (`craft_furniture`, `summon_migrants`, …) — Phase 2.
- Workshop production chains, crafting, trade — Phase 3.
- Combat, injuries, deaths, sieges — Phase 4.
- Chasing a newer Gemini model than `gemini-2.5-flash`; no cloud logging infrastructure.

## 3. Roadmap (phased decomposition of "все")

| Phase | Block | Delivers | Depends on |
|------:|-------|----------|------------|
| **0** | Correctness (model id + pure reducer) | Gemini is actually callable; deterministic sim | — |
| **1** | Observability (Gemini JSONL logs + CLI + in-app panel) | The lens used to analyze every later system | 0 |
| **2** | AI overseer end-to-end (execute ALL schema commands) | Gemini meaningfully affects the world | 0, 1 |
| **3** | Production & economy (workshop chains, crafting, trade) | The AI has a real economy to manage | 2 |
| **4** | Combat (attacks, injuries, deaths, sieges) | Highest-risk system, built last with logs in hand | 2, 3 |

Ordering rationale: correctness → log lens → AI completeness → economy (so the AI has something
to optimize) → combat (riskiest, debugged with the analytics tooling already in place). Each
phase gets its own spec → plan → implementation cycle. **This sub-project = Phases 0 + 1.**

## 4. Design — Sub-project 1

### 4.1 Correctness

#### 4.1.1 Gemini model constant
- Keep a single module-level `const GEMINI_MODEL = "gemini-2.5-flash"` in `server.ts`.
- Use it in **both** the `/api/health` ping and the `/api/df-ai/step` `generateContent` call.
- Remove the hard-coded `"gemini-3.8-flash"` literals (generation call + the `source` echo).
- Update client-visible model strings (`dfAiClient.ts` `INITIAL_DF_AI_STATE.aiModel`, fallback
  labels, and the "Gemini 3.8 Flash" copy in `App.tsx`/`DfAiToolbar.tsx`) to reflect the real
  model. These are cosmetic; the functional fix is the generation call.

#### 4.1.2 Pure tick reducer (copy-on-write)
**Principle:** `runSimulationTick` must not mutate any object reachable from its input `state`.
Every node it writes is cloned before the write (copy-on-write); unwritten nodes keep their
existing references so memoization elsewhere still benefits.

**Approach — chosen: copy-on-write.** Rejected alternatives: full deep-clone of the ~74k-tile
array every tick (allocation-heavy at speed) and removing `<StrictMode>` (hides the bug class,
leaves memoization broken).

**Hotspots to fix (all currently mutate input state):**
- **Tiles.** Introduce a small tile-writer helper seeded with `state.tiles`. On the first write
  to a coordinate it lazily clones the `[z]` layer array, the `[z][y]` row array, and the
  `[z][y][x]` tile object, swapping the copies into a new top-level `tiles` structure; reads for
  unwritten coordinates fall through to the base. Returns the new `tiles` at the end. This covers
  mining/chopping/building completions and fog-of-war reveals.
- **Dwarves.** In the `dwarves.map`, when a field is mutated, replace its container with a fresh
  copy: `skills` (currently `updatedDwarf.skills.X.xp += …` mutates the shared object),
  `currentTask` (`task.progress += 1`), and `thoughts` (`unshift`/`pop`). `needs` is already
  reassigned to a new object and is fine.
- **Items.** `items` is already a new array, but individual item objects are mutated
  (`itemToMove.x = …`, `item.claimedByDwarfId = …`). Clone an item object before mutating it, or
  build a replacement array with new objects for changed items.

**Verification of purity:** a lightweight test deep-freezes a minimal `FortressState` and asserts
`runSimulationTick` runs without throwing (a mutation of a frozen object throws in strict mode).

### 4.2 Observability

#### 4.2.1 Log record schema (JSONL, one object per line)
```json
{
  "ts": "2026-09-15T12:34:56.789Z",
  "cycleId": "cyc_<epoch>_<rand>",
  "source": "gemini | heuristic | gemini-fallback",
  "model": "gemini-2.5-flash",
  "latencyMs": 812,
  "ok": true,
  "error": null,
  "directive": "Balanced autonomous growth (Standard df-ai)",
  "request": { "fortressSummary": { "...subset..." }, "overworldSummary": { "..." } },
  "prompt": { "system": "…", "user": "…" },
  "response": { "raw": "<model text or null>", "parsed": { "...plan..." } },
  "usage": { "promptTokens": 0, "candidatesTokens": 0, "totalTokens": 0 },
  "statusSummary": "BOOZE_EMERGENCY",
  "commandCounts": { "mine": 4, "chop": 2, "build": 1, "stockpiles": 0, "zones": 0, "orders": 1 }
}
```
- `prompt` is populated on the Gemini path; on the pure-heuristic path it is `null`.
- Written on **every** cycle. With no key, all records are `source: "heuristic"`, so the pipeline
  is exercised immediately in local dev.
- `fortressSummary` is stored as a trimmed subset (no full tile arrays) to keep records small.

#### 4.2.2 Logger module (`geminiLogger.ts`, server-side)
- Appends one line to `logs/gemini-YYYY-MM-DD.jsonl` (date from UTC), creating `logs/` if absent.
- Mirrors each record to `stdout` as a single line (Cloud Run captures this in Cloud Logging,
  covering the ephemeral-filesystem case in production).
- Append failures are swallowed and reported to `console.error` — logging must never break a game
  cycle. Serialization is guarded against circular structures.

#### 4.2.3 Read endpoint `GET /api/df-ai/logs`
- Query params: `date=YYYY-MM-DD` (default today), `limit=N` (default 200, capped).
- Returns `{ entries: [...latest N...], aggregates: {...} }` computed from the file.
- Reuses the existing per-IP rate limiter. Reads only from the `logs/` directory (fixed path;
  `date` validated against `^\d{4}-\d{2}-\d{2}$` — no path traversal).

#### 4.2.4 CLI analyzer (`scripts/analyze-gemini-logs.mjs`)
- Plain Node ESM, zero dependencies. Usage: `node scripts/analyze-gemini-logs.mjs [file|date]`.
- Prints: total cycles; gemini vs heuristic vs fallback split; avg/p50/p95 latency; error rate;
  status-summary distribution; mean commands per cycle by type; top directives.
- Exposed as `npm run analyze:ai`.

#### 4.2.5 In-app "AI Analytics" panel (`AiAnalyticsModal.tsx`)
- New modal, opened from the DF-AI toolbar. Fetches `/api/df-ai/logs` and renders the aggregates
  plus a scrollable table of recent cycles (time, source, status, latency, command counts,
  error). Bilingual (UA/EN) like the rest of the UI. Read-only; no new game state.

## 5. Components (files added / touched)

**Added**
- `geminiLogger.ts` — append-JSONL + stdout logger and the log record type.
- `scripts/analyze-gemini-logs.mjs` — CLI analyzer.
- `src/components/AiAnalyticsModal.tsx` — in-app analytics panel.
- `docs/superpowers/specs/2026-09-15-correct-observable-ai-overseer-design.md` — this spec.

**Touched**
- `server.ts` — single `GEMINI_MODEL`; log every cycle; add `GET /api/df-ai/logs`.
- `src/engine/simulationEngine.ts` — copy-on-write pure reducer.
- `src/engine/dfAiClient.ts` — real model label; pass a `cycleId` through.
- `src/App.tsx`, `src/components/DfAiToolbar.tsx` — open the analytics modal; model copy.
- `.gitignore` — add `logs/`.
- `package.json` — `analyze:ai` script.
- `package-lock.json` — committed (git hygiene).

## 6. Data flow

Autopilot/step → `executeDfAiStep` builds summaries → `POST /api/df-ai/step` → server calls
Gemini (or heuristic) → **server writes one JSONL log record** → response returns to client →
client applies commands via the pure reducer helpers. Separately: analytics panel / CLI →
read `logs/*.jsonl` (panel via `GET /api/df-ai/logs`) → aggregates.

## 7. Error handling
- Gemini failure → existing heuristic fallback, logged as `source: "gemini-fallback"` with the
  `error` message captured.
- Log write failure → swallowed, `console.error`; never blocks a cycle.
- `/api/df-ai/logs` for a missing/date-invalid file → `{ entries: [], aggregates: {} }`, HTTP 200
  (empty, not an error); malformed `date` → 400.

## 8. Testing & verification
- `npx tsc --noEmit` passes cleanly.
- Reducer purity: deep-freeze test asserts `runSimulationTick` does not throw and does not alter
  the input state's tile/dwarf/item references.
- Manual: `npm run dev`, run AI cycles, confirm `logs/gemini-<today>.jsonl` grows with
  `source: "heuristic"` records; `npm run analyze:ai` prints sane aggregates; the in-app panel
  renders them.
- Sanity: simulation behavior (mining, hauling, needs, fog) is unchanged before/after the reducer
  refactor.

## 9. Risks & mitigations
- **Reducer refactor changes sim behavior.** Mitigate: mechanical clone-before-write only, no
  logic changes; purity test + manual before/after comparison.
- **Copy-on-write cost from early-game fog reveals.** Bounded (radius-4 sphere per dwarf, only
  unrevealed tiles; shrinks as the map is explored) and strictly cheaper than full-clone.
- **Ephemeral filesystem on Cloud Run.** stdout mirror → Cloud Logging covers production; the
  local file covers the "analyze later" workflow the user asked for.

## 10. Open questions
None outstanding. Model is fixed to `gemini-2.5-flash`; logs are JSONL + stdout; local testing
runs on the heuristic engine.
