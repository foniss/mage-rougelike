// src/systems/SpellCaster.ts
//
// Handles the actual execution of spells — Bolt, Nova, Beam —
// and applies Core effects (Burn, Slow, Chain) to enemies.

import Phaser from 'phaser';
import { SpellDefinition } from '../config/spells';
import { FormType } from '../config/forms';
import { CoreType } from '../config/cores';
import { BurnEffect, SlowEffect, ChainEffect } from '../config/cores';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import {
  PROJECTILE_SPEED,
  NOVA_RADIUS,
  BEAM_WIDTH,
  BEAM_RANGE,
} from '../config/constants';

export interface CastContext {
  scene: Phaser.Scene;
  spell: SpellDefinition;
  playerX: number;
  playerY: number;
  targetX: number;
  targetY: number;
  enemies: Enemy[];
  projectiles: Projectile[];
}

export class SpellCaster {

  /**
   * Execute a spell. Routes to the correct form handler.
   */
  static cast(ctx: CastContext): void {
    switch (ctx.spell.form) {
      case FormType.BOLT:
        SpellCaster.castBolt(ctx);
        break;
      case FormType.NOVA:
        SpellCaster.castNova(ctx);
        break;
      case FormType.BEAM:
        SpellCaster.castBeam(ctx);
        break;
    }
  }

  // ── BOLT ────────────────────────────────────────────────────────────────

  private static castBolt(ctx: CastContext): void {
    const angle = Phaser.Math.Angle.Between(
      ctx.playerX, ctx.playerY,
      ctx.targetX, ctx.targetY
    );

    const spawnDist = 24;
    const spawnX = ctx.playerX + Math.cos(angle) * spawnDist;
    const spawnY = ctx.playerY + Math.sin(angle) * spawnDist;

    const projectile = new Projectile(ctx.scene, {
      x: spawnX,
      y: spawnY,
      angle,
      spell: ctx.spell,
    });
    ctx.projectiles.push(projectile);
  }

  // ── NOVA ────────────────────────────────────────────────────────────────

  private static castNova(ctx: CastContext): void {
    const { scene, spell, targetX, targetY, enemies } = ctx;

    // Visual: expanding ring at target position
    const ring = scene.add.circle(targetX, targetY, 10, spell.color, 0.4);
    ring.setDepth(20);
    ring.setStrokeStyle(2, spell.color, 0.8);

    scene.tweens.add({
      targets: ring,
      scaleX: NOVA_RADIUS / 10,
      scaleY: NOVA_RADIUS / 10,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Inner flash
    const flash = scene.add.circle(targetX, targetY, NOVA_RADIUS * 0.3, spell.glowColor, 0.5);
    flash.setDepth(19);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // Damage all enemies in radius
    const hitEnemies: Enemy[] = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(
        targetX, targetY,
        enemy.sprite.x, enemy.sprite.y
      );
      if (dist <= NOVA_RADIUS) {
        enemy.takeDamage(spell.damage);
        hitEnemies.push(enemy);
      }
    }

    // Apply core effect to all hit enemies
    for (const enemy of hitEnemies) {
      SpellCaster.applyCoreEffect(scene, spell, enemy, enemies);
    }
  }

  // ── BEAM ────────────────────────────────────────────────────────────────

  private static castBeam(ctx: CastContext): void {
    const { scene, spell, playerX, playerY, targetX, targetY, enemies } = ctx;

    const angle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
    const endX = playerX + Math.cos(angle) * BEAM_RANGE;
    const endY = playerY + Math.sin(angle) * BEAM_RANGE;

    // Visual: line from player to end
    const beamLine = scene.add.line(
      0, 0,
      playerX, playerY,
      endX, endY,
      spell.color, 0.8
    );
    beamLine.setOrigin(0, 0);
    beamLine.setLineWidth(BEAM_WIDTH / 2);
    beamLine.setDepth(20);

    // Inner brighter line
    const beamInner = scene.add.line(
      0, 0,
      playerX, playerY,
      endX, endY,
      spell.glowColor, 0.6
    );
    beamInner.setOrigin(0, 0);
    beamInner.setLineWidth(BEAM_WIDTH / 4);
    beamInner.setDepth(21);

    // Fade out beam
    scene.tweens.add({
      targets: [beamLine, beamInner],
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        beamLine.destroy();
        beamInner.destroy();
      },
    });

    // Check which enemies intersect the beam line
    const hitEnemies: Enemy[] = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dist = SpellCaster.pointToLineDistance(
        enemy.sprite.x, enemy.sprite.y,
        playerX, playerY,
        endX, endY
      );

      // Check if enemy is close enough to the beam AND between player and end
      if (dist <= BEAM_WIDTH + 16) {
        // Also check the enemy is between player and beam end (not behind player)
        const dotProduct = SpellCaster.dotAlongLine(
          enemy.sprite.x, enemy.sprite.y,
          playerX, playerY,
          endX, endY
        );
        if (dotProduct >= 0 && dotProduct <= 1) {
          enemy.takeDamage(spell.damage);
          hitEnemies.push(enemy);

          // Small hit flash on enemy
          const hitFlash = scene.add.circle(
            enemy.sprite.x, enemy.sprite.y,
            12, spell.color, 0.6
          );
          hitFlash.setDepth(22);
          scene.tweens.add({
            targets: hitFlash,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: () => hitFlash.destroy(),
          });
        }
      }
    }

    // Apply core effect to all hit enemies
    for (const enemy of hitEnemies) {
      SpellCaster.applyCoreEffect(scene, spell, enemy, enemies);
    }
  }

  // ── Core Effect Application ──────────────────────────────────────────────

  static applyCoreEffect(
    scene: Phaser.Scene,
    spell: SpellDefinition,
    enemy: Enemy,
    allEnemies: Enemy[]
  ): void {
    if (!enemy.alive) return;

    switch (spell.coreData.effect.type) {
      case 'burn': {
        const burnEffect = spell.coreData.effect as BurnEffect;
        enemy.applyBurn(burnEffect.damagePerSecond, burnEffect.duration);
        break;
      }
      case 'slow': {
        const slowEffect = spell.coreData.effect as SlowEffect;
        enemy.applySlow(slowEffect.slowPercent, slowEffect.duration);
        break;
      }
      case 'chain': {
        const chainEffect = spell.coreData.effect as ChainEffect;
        SpellCaster.executeChain(
          scene, spell, enemy, allEnemies,
          chainEffect.maxTargets, chainEffect.chainRange
        );
        break;
      }
    }
  }

  // ── Chain Logic ──────────────────────────────────────────────────────────

  private static executeChain(
    scene: Phaser.Scene,
    spell: SpellDefinition,
    startEnemy: Enemy,
    allEnemies: Enemy[],
    maxTargets: number,
    chainRange: number
  ): void {
    const hit: Set<Enemy> = new Set();
    hit.add(startEnemy);

    let current = startEnemy;
    let chainsLeft = maxTargets - 1; // First target already hit

    const chainStep = (prev: Enemy) => {
      if (chainsLeft <= 0) return;

      // Find closest unhit enemy in range
      let closest: Enemy | null = null;
      let closestDist = Infinity;

      for (const enemy of allEnemies) {
        if (!enemy.alive || hit.has(enemy)) continue;
        const dist = Phaser.Math.Distance.Between(
          prev.sprite.x, prev.sprite.y,
          enemy.sprite.x, enemy.sprite.y
        );
        if (dist <= chainRange && dist < closestDist) {
          closestDist = dist;
          closest = enemy;
        }
      }

      if (!closest) return;

      hit.add(closest);
      chainsLeft--;

      // Visual: chain lightning line
      const chainLine = scene.add.line(
        0, 0,
        prev.sprite.x, prev.sprite.y,
        closest.sprite.x, closest.sprite.y,
        spell.color, 0.7
      );
      chainLine.setOrigin(0, 0);
      chainLine.setLineWidth(1.5);
      chainLine.setDepth(20);

      scene.tweens.add({
        targets: chainLine,
        alpha: 0,
        duration: 400,
        onComplete: () => chainLine.destroy(),
      });

      // Damage the chained enemy (reduced damage for chains)
      const chainDamage = Math.round(spell.damage * 0.7);
      closest.takeDamage(chainDamage);

      // Continue chain after short delay
      const nextEnemy = closest;
      scene.time.delayedCall(100, () => {
        chainStep(nextEnemy);
      });
    };

    // Start chaining from the first enemy after a brief delay
    scene.time.delayedCall(80, () => {
      chainStep(startEnemy);
    });
  }

  // ── Geometry Helpers ─────────────────────────────────────────────────────

  /**
   * Distance from point (px,py) to line segment (x1,y1)-(x2,y2).
   */
  private static pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Phaser.Math.Distance.Between(px, py, x1, y1);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Phaser.Math.Distance.Between(px, py, projX, projY);
  }

  /**
   * Returns how far along the line segment (0-1) the point projects.
   */
  private static dotAlongLine(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    return ((px - x1) * dx + (py - y1) * dy) / lenSq;
  }
}