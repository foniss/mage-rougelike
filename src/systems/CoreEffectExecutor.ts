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
import {
  CHILL_TINT, FREEZE_TINT, ENEMY_RADIUS,
} from '../config/constants';
import { getCoreTheme } from '../visuals/CoreVisualTheme';

export interface EffectContext {
  scene: Phaser.Scene;
  spell: Spell;
  sourceX: number;
  sourceY: number;
  enemies: Enemy[];
  statusEffects: StatusEffectSystem;
  castId: number;
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

  // ── BURN ────────────────────────────────────────────────────────────────

  private static applyBurn(ctx: EffectContext, enemy: Enemy, cfg: BurnConfig): void {
    const theme = getCoreTheme(ctx.spell.core.id);

    // Visual hit feedback
    theme.renderImpact(ctx.scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 15);

    ctx.statusEffects.applyBurn(enemy, cfg.damagePerSecond, cfg.duration, { castId: ctx.castId });

    // Ongoing burn visuals on the enemy
    const burnVisualTimer = ctx.scene.time.addEvent({
      delay: 180,
      repeat: Math.floor((cfg.duration * 1000) / 180),
      callback: () => {
        if (!enemy.alive || !enemy.sprite.active) {
          burnVisualTimer.destroy();
          return;
        }
        theme.renderStatusOnEnemy(ctx.scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual);
      },
    });
  }

  // ── CHILL ───────────────────────────────────────────────────────────────

  private static applyChill(ctx: EffectContext, enemy: Enemy, cfg: ChillConfig): void {
    if (!enemy.alive) return;
    const scene = ctx.scene;
    const theme = getCoreTheme(ctx.spell.core.id);

    // Hit feedback
    theme.renderImpact(scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 15);

    // Read or initialize chill stacks
    let stacks: number = enemy.sprite.getData('chillStacks') || 0;
    stacks = Math.min(stacks + 1, cfg.maxStacks);
    enemy.sprite.setData('chillStacks', stacks);

    // Clear previous stack timer
    const prevTimer = enemy.sprite.getData('chillTimer') as Phaser.Time.TimerEvent | undefined;
    if (prevTimer) prevTimer.destroy();

    // Clear previous chill visual timer
    const prevVisTimer = enemy.sprite.getData('chillVisualTimer') as Phaser.Time.TimerEvent | undefined;
    if (prevVisTimer) prevVisTimer.destroy();

    if (stacks >= cfg.freezeThreshold) {
      // FREEZE
      enemy.isFrozen = true;
      enemy.sprite.setTint(FREEZE_TINT);
      enemy.setSpeedMultiplier(0);
      enemy.sprite.setData('chillStacks', 0);

      // Freeze visual — ice ring
      const freezeRing = scene.add.circle(
        enemy.sprite.x, enemy.sprite.y,
        ENEMY_RADIUS + 8, FREEZE_TINT, 0.3
      ).setDepth(8).setStrokeStyle(2, FREEZE_TINT, 0.6);

      // Ice crystal visuals on frozen enemy
      const freezeVisTimer = scene.time.addEvent({
        delay: 150, loop: true,
        callback: () => {
          if (!enemy.alive || !enemy.isFrozen) return;
          theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 4);
          freezeRing.setPosition(enemy.sprite.x, enemy.sprite.y);
        },
      });

      scene.time.delayedCall(cfg.freezeDuration * 1000, () => {
        enemy.isFrozen = false;
        enemy.setSpeedMultiplier(1);
        if (enemy.sprite.active) enemy.sprite.clearTint();
        freezeRing.destroy();
        freezeVisTimer.destroy();

        // Shatter effect
        theme.renderImpact(scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 25);
      });
    } else {
      // Slow based on stacks
      const slowAmount = stacks * cfg.slowPerStack;
      enemy.setSpeedMultiplier(1 - slowAmount);
      enemy.sprite.setTint(CHILL_TINT);

      // Ongoing chill visuals proportional to stacks
      const chillVisTimer = scene.time.addEvent({
        delay: 250, loop: true,
        callback: () => {
          if (!enemy.alive || !enemy.sprite.active) {
            chillVisTimer.destroy();
            return;
          }
          const currentStacks: number = enemy.sprite.getData('chillStacks') || 0;
          if (currentStacks > 0) {
            theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, currentStacks);
          }
        },
      });
      enemy.sprite.setData('chillVisualTimer', chillVisTimer);

      const timer = scene.time.delayedCall(cfg.stackDuration * 1000, () => {
        const currentStacks: number = enemy.sprite.getData('chillStacks') || 0;
        if (currentStacks > 0) {
          enemy.sprite.setData('chillStacks', currentStacks - 1);
          const remaining = currentStacks - 1;
          if (remaining <= 0) {
            enemy.setSpeedMultiplier(1);
            if (enemy.sprite.active) enemy.sprite.clearTint();
            chillVisTimer.destroy();
          } else {
            enemy.setSpeedMultiplier(1 - remaining * cfg.slowPerStack);
          }
        }
      });
      enemy.sprite.setData('chillTimer', timer);
    }
  }

  // ── KNOCKBACK ───────────────────────────────────────────────────────────

  private static applyKnockback(ctx: EffectContext, enemy: Enemy, cfg: KnockbackConfig): void {
    const theme = getCoreTheme(ctx.spell.core.id);
    const angle = Phaser.Math.Angle.Between(
      ctx.sourceX, ctx.sourceY, enemy.sprite.x, enemy.sprite.y
    );
    enemy.applyKnockback(angle, cfg.force, cfg.duration);

    // Visual: impact at enemy position
    theme.renderImpact(ctx.scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 20);

    // Visual: directional arc from source to enemy
    theme.renderArc(
      ctx.scene,
      ctx.sourceX, ctx.sourceY,
      enemy.sprite.x, enemy.sprite.y,
      ctx.spell.visual,
    );

    // Wind trail behind the knocked-back enemy
    const trailTimer = ctx.scene.time.addEvent({
      delay: 40,
      repeat: Math.floor((cfg.duration * 1000) / 40),
      callback: () => {
        if (!enemy.alive || !enemy.sprite.active) return;
        theme.renderStatusOnEnemy(
          ctx.scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual
        );
      },
    });
  }

  // ── SHOCK ───────────────────────────────────────────────────────────────

  private static applyShock(ctx: EffectContext, enemy: Enemy, cfg: ShockConfig): void {
    const scene = ctx.scene;
    const theme = getCoreTheme(ctx.spell.core.id);

    // Impact visual
    theme.renderImpact(scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 18);

    // Stun chance
    if (Math.random() < cfg.stunChance) {
      enemy.isStunned = true;
      enemy.sprite.setTint(0xaa88ff);

      // Stun sparks on enemy
      const stunVisTimer = scene.time.addEvent({
        delay: 100,
        repeat: Math.floor((cfg.stunDuration * 1000) / 100),
        callback: () => {
          if (!enemy.alive || !enemy.sprite.active) return;
          theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual);
        },
      });

      scene.time.delayedCall(cfg.stunDuration * 1000, () => {
        enemy.isStunned = false;
        if (enemy.sprite.active) enemy.sprite.clearTint();
        stunVisTimer.destroy();
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
        other.takeDamage(arcDmg, { castId: ctx.castId });

        // Core-themed arc between enemies
        theme.renderArc(
          scene,
          enemy.sprite.x, enemy.sprite.y,
          other.sprite.x, other.sprite.y,
          ctx.spell.visual,
        );

        // Impact on the arced enemy
        theme.renderImpact(scene, other.sprite.x, other.sprite.y, ctx.spell.visual, 12);
      }
    }
  }

  // ── GRAVITY ─────────────────────────────────────────────────────────────

  private static applyGravity(ctx: EffectContext, enemy: Enemy, cfg: GravityConfig): void {
    const scene = ctx.scene;
    const theme = getCoreTheme(ctx.spell.core.id);
    const cx = enemy.sprite.x;
    const cy = enemy.sprite.y;

    // Impact at gravity center
    theme.renderImpact(scene, cx, cy, ctx.spell.visual, cfg.pullRadius * 0.3);

    // Gravity well visual
    const well = scene.add.circle(cx, cy, cfg.pullRadius, ctx.spell.visual.color, 0.06);
    well.setDepth(7).setStrokeStyle(1, ctx.spell.visual.color, 0.2);

    const innerWell = scene.add.circle(cx, cy, cfg.pullRadius * 0.3, ctx.spell.visual.glowColor, 0.1);
    innerWell.setDepth(7);

    // Gravity distortion lines (pulling inward)
    const lineCount = 8;
    const pullLines: Phaser.GameObjects.Line[] = [];
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const startDist = cfg.pullRadius;
      const sx = cx + Math.cos(angle) * startDist;
      const sy = cy + Math.sin(angle) * startDist;

      const line = scene.add.line(0, 0, sx, sy, cx, cy, ctx.spell.visual.trailColor, 0.15)
        .setOrigin(0, 0).setLineWidth(0.5).setDepth(7);
      pullLines.push(line);
    }

    // Ambient particles spiraling inward
    const startTime = scene.time.now;
    const pullEvent = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        const elapsed = scene.time.now - startTime;
        if (elapsed >= cfg.pullDuration * 1000) {
          pullEvent.destroy();
          scene.tweens.add({
            targets: [well, innerWell, ...pullLines], alpha: 0, duration: 300,
            onComplete: () => {
              well.destroy();
              innerWell.destroy();
              for (const l of pullLines) l.destroy();
            },
          });
          return;
        }

        // Pull enemies
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

        // Core-themed ambient particles
        if (Math.random() > 0.6) {
          const angle = Math.random() * Math.PI * 2;
          const dist = cfg.pullRadius * (0.5 + Math.random() * 0.5);
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          theme.spawnAmbientParticle(scene, px, py, ctx.spell.visual);
        }

        // Status visuals on enemies being pulled
        if (Math.random() > 0.8) {
          for (const e of ctx.enemies) {
            if (!e.alive) continue;
            const dist = Phaser.Math.Distance.Between(cx, cy, e.sprite.x, e.sprite.y);
            if (dist <= cfg.pullRadius) {
              theme.renderStatusOnEnemy(scene, e.sprite.x, e.sprite.y, ctx.spell.visual);
            }
          }
        }
      },
    });
  }
}
