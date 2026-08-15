// src/systems/StatusEffectSystem.ts
//
// Manages Burn and Slow status effects on enemies.
// Designed to be reusable — any spell form (Bolt, Nova, Beam)
// calls the same applyBurn / applySlow methods.

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import {
  ENEMY_RADIUS,
  BURN_TICK_INTERVAL,
  BURN_PARTICLE_INTERVAL,
  BURN_PARTICLE_COLORS,
  BURN_PARTICLE_SIZE_MIN,
  BURN_PARTICLE_SIZE_MAX,
  BURN_PARTICLE_LIFETIME,
  BURN_PARTICLE_RISE,
  SLOW_TINT,
  SLOW_RING_COLOR,
  SLOW_RING_ALPHA,
  SLOW_CRYSTAL_COUNT,
  SLOW_CRYSTAL_COLOR,
} from '../config/constants';

// ── Internal Data Structures ──────────────────────────────────────────────

interface ActiveBurn {
  enemy: Enemy;
  damagePerSecond: number;
  remainingMs: number;
  tickTimer: Phaser.Time.TimerEvent;
  particleTimer: Phaser.Time.TimerEvent;
  particles: Phaser.GameObjects.Arc[];
}

interface ActiveSlow {
  enemy: Enemy;
  slowPercent: number;
  remainingMs: number;
  expireTimer: Phaser.Time.TimerEvent;
  ring: Phaser.GameObjects.Arc;
  crystals: Phaser.GameObjects.Arc[];
  crystalTween: Phaser.Tweens.Tween | null;
}

// ── System ────────────────────────────────────────────────────────────────

export class StatusEffectSystem {
  private scene: Phaser.Scene;
  private activeBurns: Map<Enemy, ActiveBurn> = new Map();
  private activeSlows: Map<Enemy, ActiveSlow> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  BURN
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Apply or refresh a Burn effect on an enemy.
   * If the enemy already has a burn, refresh duration (and update damage if higher).
   */
  applyBurn(enemy: Enemy, damagePerSecond: number, durationSeconds: number): void {
    if (!enemy.alive) return;

    const totalMs = durationSeconds * 1000;

    // Flash the enemy orange on hit
    this.flashEnemy(enemy, 0xff6600, 150);

    const existing = this.activeBurns.get(enemy);
    if (existing) {
      // Refresh: reset remaining time, upgrade damage if higher
      existing.remainingMs = totalMs;
      if (damagePerSecond > existing.damagePerSecond) {
        existing.damagePerSecond = damagePerSecond;
      }
      return;
    }

    // Create new burn
    const particles: Phaser.GameObjects.Arc[] = [];

    // Damage tick timer
    const tickTimer = this.scene.time.addEvent({
      delay: BURN_TICK_INTERVAL,
      callback: () => {
        const burn = this.activeBurns.get(enemy);
        if (!burn || !enemy.alive) {
          this.removeBurn(enemy);
          return;
        }

        // Deal tick damage
        const tickDamage = (burn.damagePerSecond * BURN_TICK_INTERVAL) / 1000;
        enemy.takeDamage(tickDamage);

        // Brief flash on each tick
        this.flashEnemy(enemy, 0xff4400, 80);

        // Reduce remaining time
        burn.remainingMs -= BURN_TICK_INTERVAL;
        if (burn.remainingMs <= 0) {
          this.removeBurn(enemy);
        }
      },
      loop: true,
    });

    // Particle emitter timer — spawn flame particles
    const particleTimer = this.scene.time.addEvent({
      delay: BURN_PARTICLE_INTERVAL,
      callback: () => {
        const burn = this.activeBurns.get(enemy);
        if (!burn || !enemy.alive) return;

        this.spawnBurnParticle(enemy, particles);
      },
      loop: true,
    });

    this.activeBurns.set(enemy, {
      enemy,
      damagePerSecond,
      remainingMs: totalMs,
      tickTimer,
      particleTimer,
      particles,
    });
  }

  private spawnBurnParticle(enemy: Enemy, particles: Phaser.GameObjects.Arc[]): void {
    const color = Phaser.Utils.Array.GetRandom(BURN_PARTICLE_COLORS);
    const size = Phaser.Math.Between(BURN_PARTICLE_SIZE_MIN, BURN_PARTICLE_SIZE_MAX);

    // Spawn around the enemy's position
    const offsetX = Phaser.Math.Between(-ENEMY_RADIUS, ENEMY_RADIUS);
    const offsetY = Phaser.Math.Between(-ENEMY_RADIUS * 0.5, ENEMY_RADIUS * 0.5);

    const particle = this.scene.add.circle(
      enemy.sprite.x + offsetX,
      enemy.sprite.y + offsetY,
      size,
      color,
      0.8
    );
    particle.setDepth(22);
    particles.push(particle);

    // Animate: rise upward and fade
    this.scene.tweens.add({
      targets: particle,
      y: particle.y - BURN_PARTICLE_RISE - Phaser.Math.Between(0, 8),
      alpha: 0,
      scaleX: { from: 1, to: 0.3 },
      scaleY: { from: 1, to: 0.3 },
      duration: BURN_PARTICLE_LIFETIME + Phaser.Math.Between(-50, 100),
      ease: 'Power1',
      onComplete: () => {
        particle.destroy();
        const idx = particles.indexOf(particle);
        if (idx !== -1) particles.splice(idx, 1);
      },
    });
  }

  private removeBurn(enemy: Enemy): void {
    const burn = this.activeBurns.get(enemy);
    if (!burn) return;

    burn.tickTimer.destroy();
    burn.particleTimer.destroy();

    // Clean up remaining particles
    for (const p of burn.particles) {
      p.destroy();
    }
    burn.particles.length = 0;

    this.activeBurns.delete(enemy);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SLOW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Apply or refresh a Slow effect on an enemy.
   * If the enemy already has a slow, refresh duration.
   */
  applySlow(enemy: Enemy, slowPercent: number, durationSeconds: number): void {
    if (!enemy.alive) return;

    const totalMs = durationSeconds * 1000;

    // Flash the enemy blue on hit
    this.flashEnemy(enemy, 0x44ccff, 150);

    const existing = this.activeSlows.get(enemy);
    if (existing) {
      // Refresh: reset timer, update slow if stronger
      existing.expireTimer.destroy();

      if (slowPercent > existing.slowPercent) {
        existing.slowPercent = slowPercent;
        enemy.setSpeedMultiplier(1 - slowPercent);
      }

      existing.remainingMs = totalMs;
      existing.expireTimer = this.scene.time.delayedCall(totalMs, () => {
        this.removeSlow(enemy);
      });
      return;
    }

    // Apply speed reduction
    enemy.setSpeedMultiplier(1 - slowPercent);

    // Tint the enemy
    enemy.sprite.setTint(SLOW_TINT);

    // Visual: frosty ring around enemy
    const ring = this.scene.add.circle(
      enemy.sprite.x,
      enemy.sprite.y,
      ENEMY_RADIUS + 6,
      SLOW_RING_COLOR,
      SLOW_RING_ALPHA
    );
    ring.setDepth(8);
    ring.setStrokeStyle(1, SLOW_RING_COLOR, 0.4);

    // Visual: small orbiting ice crystals
    const crystals: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < SLOW_CRYSTAL_COUNT; i++) {
      const angle = (i / SLOW_CRYSTAL_COUNT) * Math.PI * 2;
      const cx = enemy.sprite.x + Math.cos(angle) * (ENEMY_RADIUS + 8);
      const cy = enemy.sprite.y + Math.sin(angle) * (ENEMY_RADIUS + 8);
      const crystal = this.scene.add.circle(cx, cy, 2, SLOW_CRYSTAL_COLOR, 0.7);
      crystal.setDepth(22);
      crystals.push(crystal);
    }

    // Orbit animation — we'll update positions in the scene update
    const crystalTween = this.scene.tweens.addCounter({
      from: 0,
      to: 360,
      duration: 2000,
      repeat: -1,
    });

    // Expiry timer
    const expireTimer = this.scene.time.delayedCall(totalMs, () => {
      this.removeSlow(enemy);
    });

    this.activeSlows.set(enemy, {
      enemy,
      slowPercent,
      remainingMs: totalMs,
      expireTimer,
      ring,
      crystals,
      crystalTween,
    });
  }

  private removeSlow(enemy: Enemy): void {
    const slow = this.activeSlows.get(enemy);
    if (!slow) return;

    slow.expireTimer.destroy();

    // Restore speed
    enemy.setSpeedMultiplier(1);

    // Remove tint (unless burning)
    if (enemy.sprite.active) {
      if (this.activeBurns.has(enemy)) {
        // Don't clear tint if burning — let burn visuals handle it
        enemy.sprite.clearTint();
      } else {
        enemy.sprite.clearTint();
      }
    }

    // Clean visuals
    slow.ring.destroy();
    if (slow.crystalTween) slow.crystalTween.destroy();
    for (const c of slow.crystals) c.destroy();
    slow.crystals.length = 0;

    this.activeSlows.delete(enemy);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  UPDATE — call from GameScene.update()
  // ══════════════════════════════════════════════════════════════════════════

  update(): void {
    // Update slow visual positions to follow enemies
    for (const [enemy, slow] of this.activeSlows) {
      if (!enemy.alive) {
        this.removeSlow(enemy);
        continue;
      }

      // Move ring with enemy
      slow.ring.setPosition(enemy.sprite.x, enemy.sprite.y);

      // Orbit crystals around enemy
      const tweenValue = slow.crystalTween ? Number((slow.crystalTween as Phaser.Tweens.Tween).getValue() ?? 0) : 0;
      const baseAngle = Phaser.Math.DegToRad(tweenValue);

      for (let i = 0; i < slow.crystals.length; i++) {
        const angle = baseAngle + (i / slow.crystals.length) * Math.PI * 2;
        const orbitRadius = ENEMY_RADIUS + 8;
        slow.crystals[i].setPosition(
          enemy.sprite.x + Math.cos(angle) * orbitRadius,
          enemy.sprite.y + Math.sin(angle) * orbitRadius
        );
      }
    }

    // Clean up burns on dead enemies
    for (const [enemy] of this.activeBurns) {
      if (!enemy.alive) {
        this.removeBurn(enemy);
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CLEANUP — call when enemy dies or scene restarts
  // ══════════════════════════════════════════════════════════════════════════

  removeAllEffects(enemy: Enemy): void {
    this.removeBurn(enemy);
    this.removeSlow(enemy);
  }

  clearAll(): void {
    for (const [enemy] of this.activeBurns) {
      this.removeBurn(enemy);
    }
    for (const [enemy] of this.activeSlows) {
      this.removeSlow(enemy);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private flashEnemy(enemy: Enemy, color: number, durationMs: number): void {
    if (!enemy.sprite.active) return;
    enemy.sprite.setTint(color);
    this.scene.time.delayedCall(durationMs, () => {
      if (!enemy.sprite.active) return;

      // Restore slow tint if slowed, otherwise clear
      if (this.activeSlows.has(enemy)) {
        enemy.sprite.setTint(SLOW_TINT);
      } else {
        enemy.sprite.clearTint();
      }
    });
  }
}