// src/systems/CoreEffectExecutor.ts
//
// Core hit → increment buildup on the BuildupSystem.
// NO direct status application. Status only fires when buildup completes.
// The BuildupSystem calls back into activateStatus() when threshold is reached.

import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { CoreId } from '../config/spellComponents';
import { Enemy } from '../entities/Enemy';
import { StatusEffectSystem } from './StatusEffectSystem';
import { BuildupSystem } from './BuildupSystem';
import { ENEMY_RADIUS } from '../config/constants';
import { getCoreTheme } from '../visuals/CoreVisualTheme';
import { BalanceManager } from './BalanceManager';

export interface EffectContext {
  scene: Phaser.Scene;
  spell: Spell;
  sourceX: number;
  sourceY: number;
  enemies: Enemy[];
  statusEffects: StatusEffectSystem;
  buildupSystem: BuildupSystem;
  castId: number;
}

export class CoreEffectExecutor {

  /**
   * Called on every Core spell hit.
   * Adds buildup — does NOT directly apply status.
   */
  static apply(ctx: EffectContext, enemy: Enemy): void {
    if (!enemy.alive) return;

    const coreId = ctx.spell.core.id;
    const theme = getCoreTheme(coreId);

    // Small core-themed impact VFX on every hit (scaled by tier, handled by CombatFX)
    theme.renderImpact(ctx.scene, enemy.sprite.x, enemy.sprite.y, ctx.spell.visual, 12);

    // Increment buildup — BuildupSystem handles threshold check and activation callback
    ctx.buildupSystem.addBuildup(
      enemy, coreId,
      ctx.sourceX, ctx.sourceY,
      ctx.enemies, ctx.castId,
    );
  }

  /**
   * Called by BuildupSystem when a Core's buildup reaches threshold.
   * THIS is where the actual status effect gets applied.
   */
  static activateStatus(
    scene: Phaser.Scene,
    enemy: Enemy,
    coreId: CoreId,
    sourceX: number,
    sourceY: number,
    enemies: Enemy[],
    castId: number,
    statusEffects: StatusEffectSystem,
  ): void {
    if (!enemy.alive) return;

    const bal = BalanceManager.core(coreId);
    const theme = getCoreTheme(coreId);

    // Strong activation impact
    theme.renderImpact(scene, enemy.sprite.x, enemy.sprite.y, {
      color: theme.getGlowConfig().color,
      glowColor: theme.getGlowConfig().color,
      trailColor: theme.getGlowConfig().color,
    }, 25);

    switch (coreId) {
      case CoreId.FIRE:
        CoreEffectExecutor.activateBurn(scene, enemy, bal, statusEffects, castId, theme);
        break;
      case CoreId.ICE:
        CoreEffectExecutor.activateFreeze(scene, enemy, bal, theme);
        break;
      case CoreId.WIND:
        CoreEffectExecutor.activateKnockback(scene, enemy, bal, sourceX, sourceY, theme);
        break;
      case CoreId.STORM:
        CoreEffectExecutor.activateShock(scene, enemy, bal, enemies, castId, theme);
        break;
      case CoreId.COSMIC:
        CoreEffectExecutor.activateGravity(scene, enemy, bal, enemies, theme);
        break;
    }
  }

  // ── FIRE: Burn DOT ────────────────────────────────────────────────────

  private static activateBurn(
    scene: Phaser.Scene, enemy: Enemy, bal: any,
    statusEffects: StatusEffectSystem, castId: number, theme: any,
  ): void {
    const dps = bal.status.damagePerSecond ?? 8;
    const dur = bal.status.durationSec ?? 3;

    statusEffects.applyBurn(enemy, dps, dur, { castId });

    // Persistent burn particles while burning
    const bvt = scene.time.addEvent({
      delay: 180, repeat: Math.floor((dur * 1000) / 180),
      callback: () => {
        if (!enemy.alive || !enemy.sprite.active) { bvt.destroy(); return; }
        theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, {
          color: 0xff6600, glowColor: 0xff9944, trailColor: 0xff3300,
        });
      },
    });
  }

  // ── ICE: Freeze (full stop) ───────────────────────────────────────────

  private static activateFreeze(
    scene: Phaser.Scene, enemy: Enemy, bal: any, theme: any,
  ): void {
    const dur = bal.status.freezeDurationSec ?? 2;

    enemy.isFrozen = true;
    enemy.setSpeedMultiplier(0);
    enemy.sprite.setTint(0x4466cc);

    // Freeze ring
    const fr = scene.add.circle(enemy.sprite.x, enemy.sprite.y, ENEMY_RADIUS + 8, 0x4466cc, 0.3)
      .setDepth(8).setStrokeStyle(2, 0x4466cc, 0.6);

    const fvt = scene.time.addEvent({
      delay: 150, loop: true,
      callback: () => {
        if (!enemy.alive || !enemy.isFrozen) return;
        theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, {
          color: 0x44ccff, glowColor: 0x88ddff, trailColor: 0x2299cc,
        }, 4);
        fr.setPosition(enemy.sprite.x, enemy.sprite.y);
      },
    });

    scene.time.delayedCall(dur * 1000, () => {
      enemy.isFrozen = false;
      enemy.setSpeedMultiplier(1);
      if (enemy.sprite.active) enemy.sprite.clearTint();
      fr.destroy();
      fvt.destroy();
      // Shatter effect on thaw
      theme.renderImpact(scene, enemy.sprite.x, enemy.sprite.y, {
        color: 0x44ccff, glowColor: 0x88ddff, trailColor: 0x2299cc,
      }, 25);
    });
  }

  // ── WIND: Knockback ───────────────────────────────────────────────────

  private static activateKnockback(
    scene: Phaser.Scene, enemy: Enemy, bal: any,
    sourceX: number, sourceY: number, theme: any,
  ): void {
    const force = bal.status.knockbackForce ?? 350;
    const dur = bal.status.knockbackDurationSec ?? 0.4;

    const angle = Phaser.Math.Angle.Between(sourceX, sourceY, enemy.sprite.x, enemy.sprite.y);
    enemy.applyKnockback(angle, force, dur);

    theme.renderImpact(scene, enemy.sprite.x, enemy.sprite.y, {
      color: 0x88ffbb, glowColor: 0xbbffdd, trailColor: 0x55cc88,
    }, 20);

    theme.renderArc(scene, sourceX, sourceY, enemy.sprite.x, enemy.sprite.y, {
      color: 0x88ffbb, glowColor: 0xbbffdd, trailColor: 0x55cc88,
    });

    // Wind trail during knockback
    const tt = scene.time.addEvent({
      delay: 40, repeat: Math.floor((dur * 1000) / 40),
      callback: () => {
        if (!enemy.alive || !enemy.sprite.active) return;
        theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, {
          color: 0x88ffbb, glowColor: 0xbbffdd, trailColor: 0x55cc88,
        });
      },
    });
  }

  // ── STORM: Shock (stun + chain arcs) ──────────────────────────────────

  private static activateShock(
    scene: Phaser.Scene, enemy: Enemy, bal: any,
    enemies: Enemy[], castId: number, theme: any,
  ): void {
    const stunDur = bal.status.stunDurationSec ?? 1.0;
    const arcRange = bal.status.arcRange ?? 120;
    const arcDmgPct = bal.status.arcDamagePercent ?? 0.3;
    const maxArcs = bal.status.maxArcTargets ?? 2;

    // Stun the primary target
    enemy.isStunned = true;
    enemy.sprite.setTint(0xaa88ff);

    const svt = scene.time.addEvent({
      delay: 100, repeat: Math.floor((stunDur * 1000) / 100),
      callback: () => {
        if (!enemy.alive || !enemy.sprite.active) return;
        theme.renderStatusOnEnemy(scene, enemy.sprite.x, enemy.sprite.y, {
          color: 0xaa88ff, glowColor: 0xccaaff, trailColor: 0x8866dd,
        });
      },
    });

    scene.time.delayedCall(stunDur * 1000, () => {
      enemy.isStunned = false;
      if (enemy.sprite.active) enemy.sprite.clearTint();
      svt.destroy();
    });

    // Chain arcs to nearby enemies (damage only, no buildup)
    let arcsLeft = maxArcs;
    const hitSet = new Set<Enemy>();
    hitSet.add(enemy);

    for (const other of enemies) {
      if (arcsLeft <= 0) break;
      if (!other.alive || hitSet.has(other)) continue;
      const dist = Phaser.Math.Distance.Between(enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y);
      if (dist <= arcRange) {
        hitSet.add(other);
        arcsLeft--;
        // Chain damage — flat amount based on Core base damage
        const arcDmg = Math.round(BalanceManager.core(CoreId.STORM).baseDamage * arcDmgPct);
        other.takeDamage(arcDmg, { castId });
        theme.renderArc(scene, enemy.sprite.x, enemy.sprite.y, other.sprite.x, other.sprite.y, {
          color: 0xaa88ff, glowColor: 0xccaaff, trailColor: 0x8866dd,
        });
        theme.renderImpact(scene, other.sprite.x, other.sprite.y, {
          color: 0xaa88ff, glowColor: 0xccaaff, trailColor: 0x8866dd,
        }, 12);
      }
    }
  }

  // ── COSMIC: Gravity Pull ──────────────────────────────────────────────

  private static activateGravity(
    scene: Phaser.Scene, enemy: Enemy, bal: any,
    enemies: Enemy[], theme: any,
  ): void {
    const pullRadius = bal.status.pullRadius ?? 120;
    const pullForce = bal.status.pullForce ?? 150;
    const pullDur = bal.status.pullDurationSec ?? 2.0;

    const cx = enemy.sprite.x, cy = enemy.sprite.y;
    const visual = { color: 0xdd66ff, glowColor: 0xee99ff, trailColor: 0xbb44dd };

    theme.renderImpact(scene, cx, cy, visual, pullRadius * 0.3);

    // Gravity well visual
    const well = scene.add.circle(cx, cy, pullRadius, visual.color, 0.06).setDepth(7).setStrokeStyle(1, visual.color, 0.2);
    const iw = scene.add.circle(cx, cy, pullRadius * 0.3, visual.glowColor, 0.1).setDepth(7);

    const pullLines: Phaser.GameObjects.Line[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const sx = cx + Math.cos(a) * pullRadius, sy = cy + Math.sin(a) * pullRadius;
      const l = scene.add.line(0, 0, sx, sy, cx, cy, visual.trailColor, 0.15).setOrigin(0, 0).setLineWidth(0.5).setDepth(7);
      pullLines.push(l);
    }

    // Mark all enemies in range as gravity-affected (reduced separation burst)
    const affectedEnemies = new Set<Enemy>();
    for (const e of enemies) {
      if (!e.alive || e.isFrozen) continue;
      const dist = Phaser.Math.Distance.Between(cx, cy, e.sprite.x, e.sprite.y);
      if (dist <= pullRadius) affectedEnemies.add(e);
    }

    // Minimum orbit distance — enemies cluster around center but don't collapse to a single point
    const minOrbitDist = 18;

    const startTime = scene.time.now;
    const pe = scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        const elapsed = scene.time.now - startTime;
        if (elapsed >= pullDur * 1000) {
          pe.destroy();
          affectedEnemies.clear();
          scene.tweens.add({
            targets: [well, iw, ...pullLines], alpha: 0, duration: 300,
            onComplete: () => { well.destroy(); iw.destroy(); for (const l of pullLines) l.destroy(); },
          });
          return;
        }
        for (const e of enemies) {
          if (!e.alive || e.isFrozen) continue;
          const dist = Phaser.Math.Distance.Between(cx, cy, e.sprite.x, e.sprite.y);
          if (dist <= pullRadius && dist > minOrbitDist) {
            // Pull toward center but stop at minOrbitDist
            const a = Phaser.Math.Angle.Between(e.sprite.x, e.sprite.y, cx, cy);
            const pullAmount = pullForce * (1 - dist / pullRadius) * 0.016;
            const newDist = Math.max(minOrbitDist, dist - pullAmount);
            const ratio = newDist / dist;
            e.sprite.x = cx + (e.sprite.x - cx) * ratio;
            e.sprite.y = cy + (e.sprite.y - cy) * ratio;
            affectedEnemies.add(e);
          } else if (dist <= minOrbitDist && dist > 0.1) {
            // Already at orbit distance — apply gentle tangential drift to prevent stacking
            const tangentAngle = Phaser.Math.Angle.Between(cx, cy, e.sprite.x, e.sprite.y) + Math.PI * 0.5;
            e.sprite.x += Math.cos(tangentAngle) * 0.5;
            e.sprite.y += Math.sin(tangentAngle) * 0.5;
          }
        }
        if (Math.random() > 0.6) {
          const a = Math.random() * Math.PI * 2;
          const d = pullRadius * (0.5 + Math.random() * 0.5);
          theme.spawnAmbientParticle(scene, cx + Math.cos(a) * d, cy + Math.sin(a) * d, visual);
        }
      },
    });
  }
}
