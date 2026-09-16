import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildGeminiLogRecord, appendGeminiLog, readGeminiLogEntries,
  computeGeminiLogAggregates, isValidLogDate,
} from '../geminiLog';

const base = (over: any = {}) => buildGeminiLogRecord({
  cycleId: 'c', source: 'heuristic', model: 'gemini-3.8-flash',
  latencyMs: 10, ok: true, directive: 'grow',
  parsed: { statusSummary: 'S', commands: {} }, ...over,
});

describe('buildGeminiLogRecord', () => {
  it('counts commands, extracts status, rounds latency', () => {
    const rec = buildGeminiLogRecord({
      cycleId: 'c1', source: 'heuristic', model: 'gemini-3.8-flash',
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

  it('handles unserializable records (circular refs) via fallback', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gemlog-'));
    const circular: any = {};
    circular.self = circular;
    const rec = buildGeminiLogRecord({
      cycleId: 'circ', source: 'heuristic', model: 'm', latencyMs: 1, ok: true, parsed: circular,
    });
    expect(() => appendGeminiLog(rec, dir)).not.toThrow();
    const back = readGeminiLogEntries({ date: rec.ts.slice(0, 10), baseDir: dir });
    expect(back.length).toBe(1);
    expect((back[0] as any).error).toBe('unserializable-record');
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
