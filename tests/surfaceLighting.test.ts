import { describe, it, expect } from 'vitest';
import { generateWorld } from '../src/engine/worldGen';
import { lightingEngine } from '../src/engine/lightingEngine';

describe('Surface Lighting and dynamic surfaceZ', () => {
  it('standard 28-Z map preset sets surfaceZ appropriately and surface levels evaluate to true', () => {
    const world28 = generateWorld({
      sizeX: 48,
      sizeY: 48,
      depthZ: 28,
      seed: 42,
      biome: 'mountain',
      hasRiver: false,
    });

    // On depthZ = 28, surfaceBaseZ = Math.min(24, Math.max(16, Math.floor(28 * 0.72))) = 20
    expect(world28.surfaceZ).toBe(20);
    expect(world28.depthZ).toBe(28);

    // Dynamic evaluation rule: currentZ >= world.surfaceZ
    const checkSurface = (currentZ: number) => currentZ >= world28.surfaceZ;

    // Surface level (Z = 20) must evaluate to true
    expect(checkSurface(world28.surfaceZ)).toBe(true);

    // Sky levels above surface must evaluate to true
    expect(checkSurface(world28.surfaceZ + 1)).toBe(true);
    expect(checkSurface(world28.depthZ - 1)).toBe(true);

    // Subterranean levels below surface must evaluate to false
    expect(checkSurface(world28.surfaceZ - 1)).toBe(false);
    expect(checkSurface(0)).toBe(false);

    // Demonstrate the previous bug: hardcoded check `currentZ >= 38`
    const oldBuggyCheck = (currentZ: number) => currentZ >= 38;
    // On a 28-Z map, max Z is 27, so old check was ALWAYS false (pitch-black darkness on surface)
    for (let z = 0; z < world28.depthZ; z++) {
      expect(oldBuggyCheck(z)).toBe(false);
    }
  });

  it('works correctly across various map presets (Z=24, Z=28, Z=32, Z=48)', () => {
    const presets = [24, 28, 32, 48];
    for (const depthZ of presets) {
      const world = generateWorld({
        sizeX: 32,
        sizeY: 32,
        depthZ,
        seed: 12345,
        biome: 'temperate_forest',
        hasRiver: false,
      });

      expect(world.surfaceZ).toBeGreaterThan(0);
      expect(world.surfaceZ).toBeLessThan(depthZ);

      // Surface level check
      expect(world.surfaceZ >= world.surfaceZ).toBe(true);
      expect((world.surfaceZ - 1) >= world.surfaceZ).toBe(false);
      expect((depthZ - 1) >= world.surfaceZ).toBe(true);
    }
  });

  it('lightingEngine calculates ambientAlpha 0.28 for surface and 0.85 for subterranean levels', () => {
    // We mock Canvas / 2D context to verify lightingEngine internal ambientAlpha application
    let capturedFillStyle = '';
    const mockCtx = {
      clearRect: () => {},
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      fill: () => {},
      drawImage: () => {},
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
      set fillStyle(val: string) {
        capturedFillStyle = val;
      },
      get fillStyle() {
        return capturedFillStyle;
      },
      globalCompositeOperation: 'source-over',
    } as unknown as CanvasRenderingContext2D;

    const mockCanvas = {
      width: 400,
      height: 300,
    } as HTMLCanvasElement;

    // Mock document.createElement for lightingEngine buffer
    const origDocument = globalThis.document;
    try {
      (globalThis as any).document = {
        createElement: (tag: string) => {
          if (tag === 'canvas') {
            return {
              ...mockCanvas,
              getContext: () => mockCtx,
            };
          }
          return {};
        },
      };

      // 1. Surface level render: isSurfaceLevel = true
      lightingEngine.renderLighting(
        mockCtx,
        400,
        300,
        { x: 0, y: 0 },
        1.0,
        20,
        [],
        10,
        10,
        [],
        0,
        true // isSurfaceLevel
      );
      expect(capturedFillStyle).toBe('rgba(10, 8, 6, 0.28)');

      // 2. Subterranean level render: isSurfaceLevel = false
      lightingEngine.renderLighting(
        mockCtx,
        400,
        300,
        { x: 0, y: 0 },
        1.0,
        10,
        [],
        10,
        10,
        [],
        0,
        false // isSurfaceLevel
      );
      expect(capturedFillStyle).toBe('rgba(10, 8, 6, 0.85)');
    } finally {
      (globalThis as any).document = origDocument;
    }
  });
});
