/**
 * 3D Perlin Noise implementation directly ported from kevshakes/dwarf-fortress-simulation/utils/noise.py
 */

export class PerlinNoise3D {
  private p: number[];

  constructor(seed: number = 1337) {
    // Generate permutation table based on seed
    const pTemp = Array.from({ length: 256 }, (_, i) => i);
    // Pseudo-random shuffle with seed
    let s = seed;
    const pseudoRandom = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    for (let i = pTemp.length - 1; i > 0; i--) {
      const j = Math.floor(pseudoRandom() * (i + 1));
      [pTemp[i], pTemp[j]] = [pTemp[j], pTemp[i]];
    }

    // Duplicate for 512 length to handle wrapping
    this.p = [...pTemp, ...pTemp];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public sample(x: number, y: number, z: number): number {
    // Find unit cube that contains point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    // Find relative x, y, z of point in cube
    const fx = x - Math.floor(x);
    const fy = y - Math.floor(y);
    const fz = z - Math.floor(z);

    // Compute fade curves
    const u = this.fade(fx);
    const v = this.fade(fy);
    const w = this.fade(fz);

    // Hash coordinates of 8 cube corners
    const A = this.p[X] + Y;
    const AA = this.p[A] + Z;
    const AB = this.p[A + 1] + Z;
    const B = this.p[X + 1] + Y;
    const BA = this.p[B] + Z;
    const BB = this.p[B + 1] + Z;

    // Blend results from 8 corners
    return this.lerp(
      w,
      this.lerp(
        v,
        this.lerp(u, this.grad(this.p[AA], fx, fy, fz), this.grad(this.p[BA], fx - 1, fy, fz)),
        this.lerp(u, this.grad(this.p[AB], fx, fy - 1, fz), this.grad(this.p[BB], fx - 1, fy - 1, fz))
      ),
      this.lerp(
        v,
        this.lerp(u, this.grad(this.p[AA + 1], fx, fy, fz - 1), this.grad(this.p[BA + 1], fx - 1, fy, fz - 1)),
        this.lerp(u, this.grad(this.p[AB + 1], fx, fy - 1, fz - 1), this.grad(this.p[BB + 1], fx - 1, fy - 1, fz - 1))
      )
    );
  }

  /**
   * Fractal Brownian Motion (octaves of Perlin noise)
   */
  public fbm(x: number, y: number, z: number, octaves: number = 3, persistence: number = 0.5): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.sample(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }
}
