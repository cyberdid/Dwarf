import { describe, it, expect } from 'vitest';
import { DEFAULT_MODEL, PRIMARY_MODEL, FALLBACK_MODELS, generateHeuristicDfAiPlan } from '../server';

describe('Server Model Configuration & Consistency', () => {
  it('cleanly defines DEFAULT_MODEL as gemini-3.8-flash', () => {
    expect(DEFAULT_MODEL).toBe('gemini-3.8-flash');
  });

  it('PRIMARY_MODEL defaults to gemini-3.8-flash without divergence', () => {
    // If no custom env override is provided, PRIMARY_MODEL must equal DEFAULT_MODEL
    const expectedModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    expect(PRIMARY_MODEL).toBe(expectedModel);
  });

  it('generateHeuristicDfAiPlan outputs consistent model property matching PRIMARY_MODEL', () => {
    const mockBody = {
      fortressSummary: {
        population: 7,
        stocks: { ale: 50, food: 50, wood: 20, stone: 30 },
        surfaceZ: 14,
      },
    };
    const plan = generateHeuristicDfAiPlan(mockBody);
    expect(plan).toHaveProperty('model', PRIMARY_MODEL);
    expect(plan.model).toBe('gemini-3.8-flash');
  });

  it('heuristic plan with fallback reason maintains consistent model identifier', () => {
    const mockBody = {
      fortressSummary: { population: 7 },
    };
    const plan = generateHeuristicDfAiPlan(mockBody, 'quota exceeded');
    expect(plan.model).toBe('gemini-3.8-flash');
    expect(plan.isFallback).toBe(true);
  });

  it('ensures fallback candidate models array exists and includes valid fallbacks', () => {
    expect(Array.isArray(FALLBACK_MODELS)).toBe(true);
    expect(FALLBACK_MODELS.length).toBeGreaterThan(0);
  });
});
