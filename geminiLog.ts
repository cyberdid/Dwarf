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
