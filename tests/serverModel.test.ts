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
