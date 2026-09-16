import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('Gemini model id is single-sourced (gemini-3.8-flash)', () => {
  it('server.ts single-sources GEMINI_MODEL to gemini-3.8-flash and uses it as the model', () => {
    const src = read('server.ts');
    expect(src).toMatch(/const GEMINI_MODEL\s*=\s*["']gemini-3\.8-flash["']/);
    expect(src).toMatch(/model:\s*GEMINI_MODEL/);
  });

  it('server.ts does not hardcode the model literal in the generation call (uses the single constant)', () => {
    // The only occurrence of the model id in server.ts is the GEMINI_MODEL constant definition.
    const occurrences = (read('server.ts').match(/gemini-3\.8-flash/g) || []).length;
    expect(occurrences).toBe(1);
  });

  it('the client references the gemini-3.8-flash model label', () => {
    expect(read('src/engine/dfAiClient.ts')).toContain('gemini-3.8-flash');
  });

  it('no .ts/.tsx file under src/ reintroduces the stale gemini-2.5 model in any casing or separator', () => {
    const stalePattern = /gemini[\s-]?2\.5/i;
    const srcRoot = path.join(process.cwd(), 'src');

    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(fullPath);
        if (/\.(ts|tsx)$/.test(entry.name)) return [fullPath];
        return [];
      });

    const offenders = walk(srcRoot).filter(file =>
      stalePattern.test(fs.readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
