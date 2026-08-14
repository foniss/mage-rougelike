// src/systems/CoreEffectExecutor.ts

import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import {
  BurnConfig,
  ChillConfig,
  KnockbackConfig,
  ShockConfig,
  GravityConfig,
} from '../config/spellComponents';
import { Enemy } from '../entities/Enemy';
import { StatusEffectSystem } from './StatusEffectSystem';
import { CHAIN_ARC_SEGMENTS, CHAIN_ARC_OFFSET, CHAIN_ARC_COLOR, CHAIN_ARC_GLOW_COLOR, CHAIN_ARC_WIDTH, CHAIN_ARC_GLOW_WIDTH, CHAIN_ARC_DURATION, CHAIN_DELAY_BETWEEN, CHAIN_HIT_FLASH_COLOR, CHAIN_HIT_FLASH_RADIUS, CHILL_TINT, FREEZE_TINT, ENEMY_RADIUS } from '../config/constants';

export interface EffectContext {
  scene: Phaser.Scene;
  spell: Spell;
  sourceX: number;
  sourceY: number;
  enemies: Enemy[];
  statusEffects: StatusEffectSystem;
  onKillCallback?: (enemy: Enemy) => void;
}

export class CoreEffectExecutor {

  static apply(ctx: EffectContext, enemy: Enemy): void {
    if (!enemy.alive) return;
    const effect = ctx.spell.statusEffect;

    switch (effect.type) {
      case 'burn':
        CoreEffectExecutor.applyBurn(ctx, enemy, effect as BurnConfig);
        break;
      case 'chill':
        CoreEffectExecutor.applyChill(ctx, enemy, effect as ChillConfig);
        break;
      case 'knockback':
        CoreEffectExecutor.applyKnockback(ctx, enemy, effect as KnockbackConfig);
        break;
      case 'shock':
        CoreEffectExecutor.applyShock(ctx, enemy, effect as ShockConfig);
        break;
      case 'gravity':
        CoreEffectExecutor.applyGravity(ctx, enemy, effect as GravityConfig);
        break;
      case 'none':
        break;
    }
  }

  private static applyBurn(ctx: EffectContext, enemy: Enemy, cfg: BurnConfig): void {
    ctx.statusEffects.applyBurn(enemy, cfg.damagePerSecond, cfg.duration);
  }

  private static applyChill(ctx: EffectContext, enemy: Enemy, cfg: ChillConfig): void {
    if (!enemy.alive) return;
    const scene = ctx.scene;

    // Read or initialize chill stacks
    let stacks: number = enemy.sprite.getData('chillStacks') || 0;
    stacks = Math.min(stacks + 1, cfg.maxStacks);
    enemy.sprite.setData('chillStacks', stacks);

    // Clear previous stack timer
    const prevTimer = enemy.sprite.getData('chillTimer') as Phaser.Time.TimerEvent | undefined;
    if (prevTimer) prevTimer.destroy();

    if (stacks >= cfg.freezeThreshold) {
      // FREEZE
      enemy.isFrozen = true;
      enemy.sprite.setTint(FREEZE_TINT);
      enemy.setSpeedMultiplier(0);
      enemy.sprite.setData('chillStacks', 0);

      // Freeze visual
      const freezeRing = scene.add.circle(enemy.sprite.x, enemy.sprite.y, ENEMY_RADIUS + 8, FREEZE_TINT, 0.3);
      freezeRing.setDepth(8).setStrokeStyle(2, FREEZE_TINT, 0.6);

      const updateFreeze = scene.time.addEvent({
        delay: 16, loop: true,
        callback: () => { if (enemy.alive) freezeRing.setPosition(enemy.sprite.x, enemy.sprite.y); },
      });

      scene.time.delayedCall(cfg.freezeDuration * 1000, () => {
        enemy.isFrozen = false;
        enemy.setSpeedMultiplier(1);
        if (enemy.sprite.active) enemy.sprite.clearTint();
        freezeRing.destroy();
        updateFreeze.destroy();
      });
    } else {
      // Slow based on stacks
      const slowAmount = stacks * cfg.slowPerStack;
      enemy.setSpeedMultiplier(1 - slowAmount);
      enemy.sprite.setTint(CHILL_TINT);

      const timer = scene.time.delayedCall(cfg.stackDuration * 1000, () => {
        const currentStacks: number = enemy.sprite.getData('chillStacks') || 0;
        if (currentStacks > 0) {
          enemy.sprite.setData('chillStacks', currentStacks - 1);
          const remaining = currentStacks - 1;
          if (remaining <= 0) {
            enemy.setSpeedMultiplier(1);
            if (enemy.sprite.active) enemy.sprite.clearTint();
          } else {
            enemy.setSpeedMultiplier(1 - remaining * cfg.slowPerStack);
          }
        }
      });
      enemy.sprite.setData('chillTimer', timer);
    }
  }

  private static applyKnockback(ctx: EffectContext, enemy: Enemy, cfg: KnockbackConfig): void {
    const angle = Phaser.Math.Angle.Between(ctx.sourceX, ctx.sourceY, enemy.sprite.x, enemy.sprite.y);
    enemy.applyKnockback(angle, cfg.force, cfg.duration);

    // Wind visual
    const windLine = ctx.scene.add.line(0, 0,
      ctx.sourceX, ctx.sourceY,
      enemy.sprite.x, enemy.sprite.y,
      ctx.spell.visual.color, 0.4
    ).setOrigin(0, 0).setLineWidth(2).setDepth(20);

    ctx.scene.tweens.add({
      targets: windLine, alpha: 0, duration: 300,
      onComplete: () => windLine.destroy(),
    });
  }

  private static applyShock(ctx: EffectContext, enemy: Enemy, cfg: ShockConfig): void {
    const scene = ctx.scene;

    // Stun chance
    if (Math.random() < cfg.stunChance) {
      enemy.isStunned = true;
      enemy.sprite.setTint(0xaa88ff);
      scene.time.delayedCall(cfg.stunDuration * 1000, () => {
        enemy.isStunned = false;
        if (enemy.sprite.active) enemy.sprite.clearTint();
      });
    }

    // Arc to nearby enemies
    let arcsRemaining = cfg.maxArcTargets;
    const hitSet = new Set<Enemy>();
    hitSet.add(enemy);

    for (const other of ctx.enemies) {
      if (arcsRemaining <= 0) break;
      if (!other.alive || hitSet.has(other)) continue;

      const dist = Phaser.Math.Distance.Between(
        enemy.sprite.x, enemy.sprite.y,
        other.sprite.x, other.sprite.y
      );

      if (dist <= cfg.arcRange) {
        hitSet.add(other);
        arcsRemaining--;

        const arcDmg = Math.round(ctx.spell.damage * cfg.arcDamagePercent);
        other.takeDamage(arcDmg);

        // Draw arc
        const arcGfx = scene.add.graphics().setDepth(20);
        arcGfx.lineStyle(CHAIN_ARC_GLOW_WIDTH, ctx.spell.visual.glowColor, 0.3);
        arcGfx.lineBetween(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y);
        const arcCore = scene.add.graphics().setDepth(21);
        arcCore.lineStyle(CHAIN_ARC_WIDTH, ctx.spell.visual.color, 0.8);
        arcCore.lineBetween(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y);

        scene.tweens.add({
          targets: [arcGfx, arcCore], alpha: 0, duration: 250,
          onComplete: () => { arcGfx.destroy(); arcCore.destroy(); },
        });
      }
    }
  }

  private static applyGravity(ctx: EffectContext, enemy: Enemy, cfg: GravityConfig): void {
    const scene = ctx.scene;
    const cx = enemy.sprite.x;
    const cy = enemy.sprite.y;

    // Gravity well visual
    const well = scene.add.circle(cx, cy, cfg.pullRadius, ctx.spell.visual.color, 0.08);
    well.setDepth(7).setStrokeStyle(1, ctx.spell.visual.color, 0.3);

    const innerWell = scene.add.circle(cx, cy, cfg.pullRadius * 0.3, ctx.spell.visual.glowColor, 0.15);
    innerWell.setDepth(7);

    // Pull enemies each frame for pullDuration
    const startTime = scene.time.now;
    const pullEvent = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        const elapsed = scene.time.now - startTime;
        if (elapsed >= cfg.pullDuration * 1000) {
          pullEvent.destroy();
          scene.tweens.add({
            targets: [well, innerWell], alpha: 0, duration: 300,
            onComplete: () => { well.destroy(); innerWell.destroy(); },
          });
          return;
        }

        for (const e of ctx.enemies) {
          if (!e.alive || e.isFrozen) continue;
          const dist = Phaser.Math.Distance.Between(cx, cy, e.sprite.x, e.sprite.y);
          if (dist <= cfg.pullRadius && dist > 5) {
            const angle = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, cx, cy);
            const pullStrength = cfg.pullForce * (1 - dist / cfg.pullRadius);
            e.sprite.x += Math.cos(angle) * pullStrength * 0.016;
            e.sprite.y += Math.sin(angle) * pullStrength * 0.016;
          }
        }
      },
    });
  }
}