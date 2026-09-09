/**
 * High-Performance 2D Particle VFX Engine for Pilgrimage / Dwarf Fortress
 * Simulates subterranean dust, wood chips, blacksmith sparks, furnace embers,
 * water ripples, and cavern mist.
 */

export type ParticleType =
  | 'dust'
  | 'spark'
  | 'woodchip'
  | 'leaf'
  | 'smoke'
  | 'ember'
  | 'water_splash'
  | 'footstep'
  | 'rune_sparkle';

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: ParticleType;
  rotation?: number;
  vRot?: number;
  gravity?: number;
}

class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 600;

  public emit(particle: Omit<Particle, 'life'> & { life?: number }) {
    if (this.particles.length >= this.maxParticles) {
      // Evict oldest particle
      this.particles.shift();
    }
    this.particles.push({
      ...particle,
      life: particle.life ?? particle.maxLife,
    });
  }

  // Mining impact: rock dust, chips & metallic sparks
  public emitMiningSparks(x: number, y: number, z: number, material: string) {
    const isHardRock = material === 'granite' || material === 'obsidian' || material.startsWith('ore_');
    const sparkCount = isHardRock ? 8 : 4;
    const dustCount = 6;

    // Rock chips & sparks
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      this.emit({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        size: 1.5 + Math.random() * 2,
        color: isHardRock ? (Math.random() > 0.4 ? '#fef08a' : '#f59e0b') : '#a8a29e',
        alpha: 1.0,
        maxLife: 15 + Math.floor(Math.random() * 15),
        type: 'spark',
        gravity: 0.12,
      });
    }

    // Billowing rock dust
    for (let i = 0; i < dustCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.8;
      this.emit({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.2,
        size: 3.5 + Math.random() * 4,
        color: '#786b59',
        alpha: 0.65,
        maxLife: 25 + Math.floor(Math.random() * 20),
        type: 'dust',
        gravity: -0.02,
      });
    }
  }

  // Tree chopping: wood fragments and fluttering leaves
  public emitWoodcutting(x: number, y: number, z: number) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.random() * Math.PI) - Math.PI; // Upwards burst
      const speed = 1.0 + Math.random() * 2.0;
      this.emit({
        x,
        y,
        z,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.0 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? '#b45309' : '#d97706',
        alpha: 0.9,
        maxLife: 20 + Math.floor(Math.random() * 15),
        type: 'woodchip',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        gravity: 0.1,
      });
    }

    for (let i = 0; i < 4; i++) {
      this.emit({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 8,
        z,
        vx: (Math.random() - 0.5) * 0.8,
        vy: 0.4 + Math.random() * 0.6,
        size: 3.0 + Math.random() * 2.0,
        color: Math.random() > 0.4 ? '#4ade80' : '#15803d',
        alpha: 0.8,
        maxLife: 30 + Math.floor(Math.random() * 20),
        type: 'leaf',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.15,
        gravity: 0.02,
      });
    }
  }

  // Workshop / Forge embers and rising chimney smoke
  public emitForgeEffects(x: number, y: number, z: number) {
    if (Math.random() < 0.4) {
      // Glowing ember
      this.emit({
        x: x + (Math.random() - 0.5) * 10,
        y: y + 2,
        z,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.6 - Math.random() * 0.8,
        size: 1.5 + Math.random() * 1.5,
        color: Math.random() > 0.4 ? '#fb923c' : '#facc15',
        alpha: 1.0,
        maxLife: 28 + Math.floor(Math.random() * 15),
        type: 'ember',
        gravity: -0.01,
      });
    }

    if (Math.random() < 0.25) {
      // Smoke puff
      this.emit({
        x: x + (Math.random() - 0.5) * 6,
        y: y - 4,
        z,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5 - Math.random() * 0.5,
        size: 4 + Math.random() * 4,
        color: '#3d3429',
        alpha: 0.5,
        maxLife: 40 + Math.floor(Math.random() * 20),
        type: 'smoke',
        gravity: -0.02,
      });
    }
  }

  // Magma bubbling spark
  public emitMagmaBubble(x: number, y: number, z: number) {
    this.emit({
      x: x + (Math.random() - 0.5) * 16,
      y: y + (Math.random() - 0.5) * 16,
      z,
      vx: (Math.random() - 0.5) * 0.6,
      vy: -0.8 - Math.random() * 0.8,
      size: 2.0 + Math.random() * 2.0,
      color: '#fbbf24',
      alpha: 1.0,
      maxLife: 20 + Math.floor(Math.random() * 10),
      type: 'ember',
      gravity: 0.05,
    });
  }

  // Dwarf footsteps puff
  public emitFootstep(x: number, y: number, z: number) {
    this.emit({
      x: x + (Math.random() - 0.5) * 6,
      y: y + 8,
      z,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -0.1,
      size: 2.5 + Math.random() * 2,
      color: '#52432a',
      alpha: 0.35,
      maxLife: 15 + Math.floor(Math.random() * 10),
      type: 'footstep',
      gravity: -0.01,
    });
  }

  // Update physics step
  public update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life--;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      if (p.gravity) p.vy += p.gravity;
      if (p.vRot) p.rotation = (p.rotation || 0) + p.vRot;

      // Type-specific behaviors
      if (p.type === 'smoke' || p.type === 'dust') {
        p.size += 0.08; // Expand
        p.vx *= 0.95; // Air drag
      } else if (p.type === 'spark') {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }
    }
  }

  // Render all active particles on the current Z level
  public render(ctx: CanvasRenderingContext2D, currentZ: number) {
    for (const p of this.particles) {
      if (p.z !== currentZ) continue;

      const progress = p.life / p.maxLife;
      const currentAlpha = p.alpha * (p.type === 'smoke' || p.type === 'dust' ? Math.sin(progress * Math.PI) : progress);

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, currentAlpha));

      if (p.type === 'spark' || p.type === 'ember') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'woodchip' || p.type === 'leaf') {
        ctx.translate(p.x, p.y);
        if (p.rotation) ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.type === 'smoke' || p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

export const particleManager = new ParticleSystem();
