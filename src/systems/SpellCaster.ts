// src/systems/SpellCaster.ts

import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { BurnConfig, SlowConfig, ChainConfig } from '../config/spellComponents';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { StatusEffectSystem } from './StatusEffectSystem';
import { LightningChainSystem } from './LightningChainSystem';
import {
  NOVA_RADIUS,
  BEAM_WIDTH,
  BEAM_RANGE,
} from '../config/constants';

export interface CastContext {
  scene: Phaser.Scene;
  spell: Spell;
  playerX: number;
  playerY: number;
  targetX: number;
  targetY: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  statusEffects: StatusEffectSystem;
  lightningChain: LightningChainSystem;
}

export class SpellCaster {

  static cast(ctx: CastContext): void {
    switch (ctx.spell.targetingType) {
      case 'projectile':
        SpellCaster.castBolt(ctx);
        break;
      case 'aoe':
        SpellCaster.castNova(ctx);
        break;
      case 'line':
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

    let novaRadius = NOVA_RADIUS;
    if (spell.prefix?.behavior.type === 'greater') {
      novaRadius *= spell.prefix.behavior.sizeMultiplier;
    }

    const ring = scene.add.circle(targetX, targetY, 10, spell.visual.color, 0.4);
    ring.setDepth(20);
    ring.setStrokeStyle(2, spell.visual.color, 0.8);

    scene.tweens.add({
      targets: ring,
      scaleX: novaRadius / 10,
      scaleY: novaRadius / 10,
      alpha: 0,
      duration: spell.form.visual.duration,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    const flash = scene.add.circle(targetX, targetY, novaRadius * 0.3, spell.visual.glowColor, 0.5);
    flash.setDepth(19);
    scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    const hitEnemies: Enemy[] = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(
        targetX, targetY,
        enemy.sprite.x, enemy.sprite.y
      );
      if (dist <= novaRadius) {
        enemy.takeDamage(spell.damage);
        hitEnemies.push(enemy);
      }
    }

    for (const enemy of hitEnemies) {
      SpellCaster.applyCoreEffect(ctx, enemy);
    }
  }

  // ── BEAM ────────────────────────────────────────────────────────────────

  private static castBeam(ctx: CastContext): void {
    const { scene, spell, playerX, playerY, targetX, targetY, enemies } = ctx;

    const angle = Phaser.Math.Angle.Between(playerX, playerY, targetX, targetY);
    const endX = playerX + Math.cos(angle) * BEAM_RANGE;
    const endY = playerY + Math.sin(angle) * BEAM_RANGE;

    let beamWidth = BEAM_WIDTH;
    if (spell.prefix?.behavior.type === 'greater') {
      beamWidth *= spell.prefix.behavior.sizeMultiplier;
    }

    const beamLine = scene.add.line(
      0, 0, playerX, playerY, endX, endY, spell.visual.color, 0.8
    );
    beamLine.setOrigin(0, 0);
    beamLine.setLineWidth(beamWidth / 2);
    beamLine.setDepth(20);

    const beamInner = scene.add.line(
      0, 0, playerX, playerY, endX, endY, spell.visual.glowColor, 0.6
    );
    beamInner.setOrigin(0, 0);
    beamInner.setLineWidth(beamWidth / 4);
    beamInner.setDepth(21);

    scene.tweens.add({
      targets: [beamLine, beamInner],
      alpha: 0,
      duration: spell.form.visual.duration,
      ease: 'Power2',
      onComplete: () => {
        beamLine.destroy();
        beamInner.destroy();
      },
    });

    const hitEnemies: Enemy[] = [];
    for (const enemy of enemies) {
      if (!enemy.alive) continue;

      const dist = SpellCaster.pointToLineDistance(
        enemy.sprite.x, enemy.sprite.y,
        playerX, playerY, endX, endY
      );

      if (dist <= beamWidth + 16) {
        const t = SpellCaster.dotAlongLine(
          enemy.sprite.x, enemy.sprite.y,
          playerX, playerY, endX, endY
        );
        if (t >= 0 && t <= 1) {
          enemy.takeDamage(spell.damage);
          hitEnemies.push(enemy);

          const hitFlash = scene.add.circle(
            enemy.sprite.x, enemy.sprite.y,
            12, spell.visual.color, 0.6
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

    for (const enemy of hitEnemies) {
      SpellCaster.applyCoreEffect(ctx, enemy);
    }
  }

  // ── Core Effect ─────────────────────────────────────────────────────────

  static applyCoreEffect(ctx: CastContext, enemy: Enemy): void {
    if (!enemy.alive) return;

    const effect = ctx.spell.statusEffect;

    switch (effect.type) {
      case 'burn': {
        const burn = effect as BurnConfig;
        ctx.statusEffects.applyBurn(enemy, burn.damagePerSecond, burn.duration);
        break;
      }
      case 'slow': {
        const slow = effect as SlowConfig;
        ctx.statusEffects.applySlow(enemy, slow.slowPercent, slow.duration);
        break;
      }
      case 'chain': {
        const chain = effect as ChainConfig;
        ctx.lightningChain.executeChain(
          enemy, ctx.enemies, chain.maxTargets, chain.chainRange, ctx.spell.damage
        );
        break;
      }
      case 'none':
        break;
    }
  }

  // ── Geometry ────────────────────────────────────────────────────────────

  private static pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
  }

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