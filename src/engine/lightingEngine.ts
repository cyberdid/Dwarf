/**
 * Dynamic 2D Volumetric Lighting & Raycasted Shadow Engine
 * Features:
 * - 2D raymarching / radial raycasting against solid masonry and rock walls
 * - Dynamic shadow-casting polygons behind corners and pillars
 * - Warm torchlight flicker and magma illumination
 * - Ambient subterranean occlusion & day/night surface ambiance
 */

import { Tile } from '../types/simulation';
import { TILE_SIZE, isSolid } from './tileGraphics';

export interface LightSource {
  x: number;
  y: number;
  radius: number;
  color: string;
  intensity: number;
  flickerSpeed?: number;
  flickerAmount?: number;
}

export class LightingEngine {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  private getBuffer(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
    if (!this.offscreenCtx) return null;
    return { canvas: this.offscreenCanvas, ctx: this.offscreenCtx };
  }

  /**
   * Cast rays from (lx, ly) in 360 degrees to find the visibility / illuminated polygon
   */
  private computeLightPolygon(
    lx: number,
    ly: number,
    radius: number,
    tiles: Tile[][],
    sizeX: number,
    sizeY: number
  ): Array<{ x: number; y: number }> {
    const numRays = 72; // Ray every 5 degrees for smooth polygon corners
    const points: Array<{ x: number; y: number }> = [];
    const stepSize = 7; // Step in pixels for raymarch

    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      let dist = 0;
      let hit = false;
      let finalX = lx;
      let finalY = ly;

      while (dist < radius) {
        dist += stepSize;
        const curX = lx + cos * dist;
        const curY = ly + sin * dist;

        const tileX = Math.floor(curX / TILE_SIZE);
        const tileY = Math.floor(curY / TILE_SIZE);

        if (tileX < 0 || tileX >= sizeX || tileY < 0 || tileY >= sizeY) {
          hit = true;
          finalX = curX;
          finalY = curY;
          break;
        }

        const tile = tiles[tileY]?.[tileX];
        if (tile && isSolid(tile)) {
          // Ray struck a wall: penetrate slightly so the front edge of the rock wall catches light
          finalX = lx + cos * Math.min(dist + 3, radius);
          finalY = ly + sin * Math.min(dist + 3, radius);
          hit = true;
          break;
        }
      }

      if (!hit) {
        finalX = lx + cos * radius;
        finalY = ly + sin * radius;
      }

      points.push({ x: finalX, y: finalY });
    }

    return points;
  }

  /**
   * Render dynamic illumination layer over the world viewport
   */
  public renderLighting(
    ctx: CanvasRenderingContext2D,
    viewWidth: number,
    viewHeight: number,
    pan: { x: number; y: number },
    zoom: number,
    currentZ: number,
    tiles: Tile[][][],
    sizeX: number,
    sizeY: number,
    lights: LightSource[],
    tick: number,
    isSurfaceLevel: boolean
  ) {
    const buffer = this.getBuffer(Math.ceil(viewWidth), Math.ceil(viewHeight));
    if (!buffer) return;
    const { canvas: lightCanvas, ctx: lCtx } = buffer;

    // Reset buffer
    lCtx.clearRect(0, 0, lightCanvas.width, lightCanvas.height);

    // 1. Ambient darkness fill
    // Underground: Deep obsidian/pitch black darkness
    // Surface: Soft warm twilight or sunlit air
    const ambientAlpha = isSurfaceLevel ? 0.28 : 0.85;
    lCtx.fillStyle = `rgba(10, 8, 6, ${ambientAlpha})`;
    lCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

    // 2. Punch holes of light through darkness using raycast polygons
    lCtx.save();
    lCtx.translate(pan.x, pan.y);
    lCtx.scale(zoom, zoom);

    const currentZTiles = tiles[currentZ] || [];

    for (const light of lights) {
      // Calculate organic flicker
      const fSpeed = light.flickerSpeed || 0.15;
      const fAmount = light.flickerAmount || 0.08;
      const flicker = Math.sin(tick * fSpeed + light.x * 0.5) * (light.radius * fAmount);
      const effectiveRadius = Math.max(10, light.radius + flicker);

      const poly = this.computeLightPolygon(
        light.x,
        light.y,
        effectiveRadius,
        currentZTiles,
        sizeX,
        sizeY
      );

      if (poly.length === 0) continue;

      // Cut out darkness (destination-out)
      lCtx.save();
      lCtx.globalCompositeOperation = 'destination-out';

      const cutoutGrad = lCtx.createRadialGradient(
        light.x,
        light.y,
        effectiveRadius * 0.1,
        light.x,
        light.y,
        effectiveRadius
      );
      cutoutGrad.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
      cutoutGrad.addColorStop(0.7, `rgba(0, 0, 0, ${light.intensity * 0.7})`);
      cutoutGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      lCtx.fillStyle = cutoutGrad;
      lCtx.beginPath();
      lCtx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        lCtx.lineTo(poly[i].x, poly[i].y);
      }
      lCtx.closePath();
      lCtx.fill();
      lCtx.restore();

      // Add warm color halo (source-over with soft alpha)
      lCtx.save();
      lCtx.globalCompositeOperation = 'source-over';
      const colorGrad = lCtx.createRadialGradient(
        light.x,
        light.y,
        2,
        light.x,
        light.y,
        effectiveRadius
      );
      colorGrad.addColorStop(0, light.color);
      colorGrad.addColorStop(0.5, light.color.replace(/[\d\.]+\)$/, '0.12)'));
      colorGrad.addColorStop(1, 'rgba(0,0,0,0)');

      lCtx.fillStyle = colorGrad;
      lCtx.beginPath();
      lCtx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        lCtx.lineTo(poly[i].x, poly[i].y);
      }
      lCtx.closePath();
      lCtx.fill();
      lCtx.restore();
    }

    lCtx.restore();

    // 3. Composite final lighting mask onto game canvas
    ctx.save();
    ctx.drawImage(lightCanvas, 0, 0);
    ctx.restore();
  }
}

export const lightingEngine = new LightingEngine();
