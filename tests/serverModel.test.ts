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

  it('no .ts/.tsx file under src/ contains a stale "Gemini 3.8" reference in any casing or separator', () => {
    const staleModelPattern = /gemini[\s-]?3\.8/i;
    const srcRoot = path.join(process.cwd(), 'src');

    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(fullPath);
        if (/\.(ts|tsx)$/.test(entry.name)) return [fullPath];
        return [];
      });

    const offenders = walk(srcRoot).filter(file =>
      staleModelPattern.test(fs.readFileSync(file, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
