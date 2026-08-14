// src/systems/FormExecutor.ts

import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { FormId, BladeVisual, BeamVisual, OrbVisual, MineVisual, NovaVisual } from '../config/spellComponents';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CoreEffectExecutor, EffectContext } from './CoreEffectExecutor';
import { StatusEffectSystem } from './StatusEffectSystem';
import { ENEMY_RADIUS, ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS } from '../config/constants';
import { Player } from '../entities/Player';

export interface FormContext {
  scene: Phaser.Scene;
  spell: Spell;
  player: Player;
  targetX: number;
  targetY: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  statusEffects: StatusEffectSystem;
  isEcho?: boolean;
}

export class FormExecutor {

  static execute(ctx: FormContext): void {
    switch (ctx.spell.form.id) {
      case FormId.BLADE: FormExecutor.executeBlade(ctx); break;
      case FormId.BEAM: FormExecutor.executeBeam(ctx); break;
      case FormId.ORB: FormExecutor.executeOrb(ctx); break;
      case FormId.MINE: FormExecutor.executeMine(ctx); break;
      case FormId.NOVA: FormExecutor.executeNova(ctx); break;
    }
  }

  // ── BLADE ───────────────────────────────────────────────────────────────

  private static executeBlade(ctx: FormContext): void {
    const { scene, spell, player, enemies } = ctx;
    const fv = spell.form.formVisual as BladeVisual;
    const px = player.sprite.x, py = player.sprite.y;
    const aimAngle = player.getAimAngle();

    let range = fv.range;
    let arcAngle = fv.arcAngle;
    if (spell.prefix?.behavior.type === 'greater') {
      range *= spell.prefix.behavior.sizeMultiplier;
      arcAngle *= spell.prefix.behavior.sizeMultiplier;
    }

    const halfArc = Phaser.Math.DegToRad(arcAngle / 2);

    // Visual arc
    const gfx = scene.add.graphics().setDepth(20);
    gfx.fillStyle(spell.visual.color, 0.3);
    gfx.beginPath();
    gfx.moveTo(px, py);
    gfx.arc(px, py, range, aimAngle - halfArc, aimAngle + halfArc, false);
    gfx.closePath();
    gfx.fillPath();

    gfx.lineStyle(2, spell.visual.glowColor, 0.6);
    gfx.beginPath();
    gfx.arc(px, py, range, aimAngle - halfArc, aimAngle + halfArc, false);
    gfx.strokePath();

    scene.tweens.add({
      targets: gfx, alpha: 0, duration: fv.swingDuration,
      onComplete: () => gfx.destroy(),
    });

    // Hit enemies in arc
    const eCtx: EffectContext = {
      scene, spell, sourceX: px, sourceY: py,
      enemies, statusEffects: ctx.statusEffects,
    };

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.sprite.x, enemy.sprite.y);
      if (dist > range) continue;

      const angleToEnemy = Phaser.Math.Angle.Between(px, py, enemy.sprite.x, enemy.sprite.y);
      let angleDiff = angleToEnemy - aimAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= halfArc) {
        enemy.takeDamage(spell.damage);
        CoreEffectExecutor.apply(eCtx, enemy);
      }
    }
  }

  // ── BEAM ────────────────────────────────────────────────────────────────

  private static executeBeam(ctx: FormContext): void {
    const { scene, spell, player, enemies } = ctx;
    const fv = spell.form.formVisual as BeamVisual;
    const px = player.sprite.x, py = player.sprite.y;
    const angle = Phaser.Math.Angle.Between(px, py, ctx.targetX, ctx.targetY);

    let beamWidth = fv.width;
    let beamRange = fv.range;
    if (spell.prefix?.behavior.type === 'greater') {
      beamWidth *= spell.prefix.behavior.sizeMultiplier;
      beamRange *= spell.prefix.behavior.sizeMultiplier;
    }

    const endX = px + Math.cos(angle) * beamRange;
    const endY = py + Math.sin(angle) * beamRange;

    // Track which enemies have been hit to avoid double-hitting
    const hitSet = new Set<Enemy>();
    let ticksRemaining = Math.floor(fv.castDuration / fv.tickInterval);

    // Create beam visual
    const beamGfx = scene.add.graphics().setDepth(20);
    const beamGlow = scene.add.graphics().setDepth(19);

    const drawBeam = (alpha: number) => {
      beamGfx.clear();
      beamGfx.lineStyle(beamWidth / 2, spell.visual.color, alpha);
      beamGfx.lineBetween(px, py, endX, endY);
      beamGlow.clear();
      beamGlow.lineStyle(beamWidth, spell.visual.glowColor, alpha * 0.3);
      beamGlow.lineBetween(px, py, endX, endY);
    };

    drawBeam(0.8);

    const eCtx: EffectContext = {
      scene, spell, sourceX: px, sourceY: py,
      enemies, statusEffects: ctx.statusEffects,
    };

    // Tick damage
    const tickTimer = scene.time.addEvent({
      delay: fv.tickInterval, repeat: ticksRemaining - 1,
      callback: () => {
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const dist = FormExecutor.pointToLineDist(
            enemy.sprite.x, enemy.sprite.y, px, py, endX, endY
          );
          const t = FormExecutor.dotAlongLine(
            enemy.sprite.x, enemy.sprite.y, px, py, endX, endY
          );
          if (dist <= beamWidth + ENEMY_RADIUS && t >= 0 && t <= 1) {
            enemy.takeDamage(spell.damage * 0.3);
            CoreEffectExecutor.apply(eCtx, enemy);
          }
        }
      },
    });

    // Initial hit
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = FormExecutor.pointToLineDist(
        enemy.sprite.x, enemy.sprite.y, px, py, endX, endY
      );
      const t = FormExecutor.dotAlongLine(
        enemy.sprite.x, enemy.sprite.y, px, py, endX, endY
      );
      if (dist <= beamWidth + ENEMY_RADIUS && t >= 0 && t <= 1) {
        enemy.takeDamage(spell.damage);
        CoreEffectExecutor.apply(eCtx, enemy);
      }
    }

    // Fade out after cast duration
    scene.time.delayedCall(fv.castDuration, () => {
      tickTimer.destroy();
      scene.tweens.add({
        targets: [beamGfx, beamGlow], alpha: 0, duration: 200,
        onComplete: () => { beamGfx.destroy(); beamGlow.destroy(); },
      });
    });
  }

  // ── ORB ─────────────────────────────────────────────────────────────────

  private static executeOrb(ctx: FormContext): void {
    const { scene, spell, player } = ctx;
    const angle = Phaser.Math.Angle.Between(
      player.sprite.x, player.sprite.y, ctx.targetX, ctx.targetY
    );
    const spawnDist = 24;
    const projectile = new Projectile(scene, {
      x: player.sprite.x + Math.cos(angle) * spawnDist,
      y: player.sprite.y + Math.sin(angle) * spawnDist,
      angle, spell,
    });
    ctx.projectiles.push(projectile);
  }

  // ── MINE ────────────────────────────────────────────────────────────────

  private static executeMine(ctx: FormContext): void {
    const { scene, spell, enemies } = ctx;
    const fv = spell.form.formVisual as MineVisual;

    let mineX = ctx.targetX;
    let mineY = ctx.targetY;
    // Clamp to room
    mineX = Phaser.Math.Clamp(mineX, WALL_THICKNESS + 10, ROOM_WIDTH - WALL_THICKNESS - 10);
    mineY = Phaser.Math.Clamp(mineY, WALL_THICKNESS + 10, ROOM_HEIGHT - WALL_THICKNESS - 10);

    let explosionRadius = fv.explosionRadius;
    let triggerRadius = fv.triggerRadius;
    if (spell.prefix?.behavior.type === 'greater') {
      explosionRadius *= spell.prefix.behavior.sizeMultiplier;
      triggerRadius *= spell.prefix.behavior.sizeMultiplier;
    }

    // Mine visual
    const mineCircle = scene.add.circle(mineX, mineY, fv.radius, spell.visual.color, 0.6);
    mineCircle.setDepth(6).setStrokeStyle(1, spell.visual.glowColor, 0.5);

    const triggerRing = scene.add.circle(mineX, mineY, triggerRadius, spell.visual.color, 0.05);
    triggerRing.setDepth(5).setStrokeStyle(1, spell.visual.color, 0.15);

    // Pulse animation
    scene.tweens.add({
      targets: mineCircle, scaleX: 1.2, scaleY: 1.2,
      duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    let armed = false;
    let detonated = false;

    // Arm after delay
    scene.time.delayedCall(fv.armDelay, () => { armed = true; });

    // Check for enemies
    const checkTimer = scene.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!armed || detonated) return;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const dist = Phaser.Math.Distance.Between(mineX, mineY, enemy.sprite.x, enemy.sprite.y);
          if (dist <= triggerRadius) {
            detonate();
            return;
          }
        }
      },
    });

    // Auto-expire
    scene.time.delayedCall(fv.lifetime, () => {
      if (!detonated) {
        detonated = true;
        checkTimer.destroy();
        scene.tweens.add({
          targets: [mineCircle, triggerRing], alpha: 0, duration: 300,
          onComplete: () => { mineCircle.destroy(); triggerRing.destroy(); },
        });
      }
    });

    const detonate = () => {
      detonated = true;
      checkTimer.destroy();

      // Explosion visual
      const explosion = scene.add.circle(mineX, mineY, 10, spell.visual.color, 0.5);
      explosion.setDepth(20).setStrokeStyle(2, spell.visual.glowColor, 0.8);

      scene.tweens.add({
        targets: explosion,
        scaleX: explosionRadius / 10, scaleY: explosionRadius / 10,
        alpha: 0, duration: 350, ease: 'Power2',
        onComplete: () => explosion.destroy(),
      });

      mineCircle.destroy();
      triggerRing.destroy();

      const eCtx: EffectContext = {
        scene, spell, sourceX: mineX, sourceY: mineY,
        enemies, statusEffects: ctx.statusEffects,
      };

      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dist = Phaser.Math.Distance.Between(mineX, mineY, enemy.sprite.x, enemy.sprite.y);
        if (dist <= explosionRadius) {
          enemy.takeDamage(spell.damage);
          CoreEffectExecutor.apply(eCtx, enemy);
        }
      }
    };
  }

  // ── NOVA ────────────────────────────────────────────────────────────────

  private static executeNova(ctx: FormContext): void {
    const { scene, spell, enemies } = ctx;
    const fv = spell.form.formVisual as NovaVisual;

    let novaRadius = fv.radius;
    if (spell.prefix?.behavior.type === 'greater') {
      novaRadius *= spell.prefix.behavior.sizeMultiplier;
    }

    const cx = ctx.targetX, cy = ctx.targetY;

    const ring = scene.add.circle(cx, cy, 10, spell.visual.color, 0.4);
    ring.setDepth(20).setStrokeStyle(2, spell.visual.color, 0.8);

    scene.tweens.add({
      targets: ring,
      scaleX: novaRadius / 10, scaleY: novaRadius / 10,
      alpha: 0, duration: fv.expandDuration, ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    const flash = scene.add.circle(cx, cy, novaRadius * 0.3, spell.visual.glowColor, 0.5);
    flash.setDepth(19);
    scene.tweens.add({
      targets: flash, alpha: 0, scaleX: 3, scaleY: 3,
      duration: 300, onComplete: () => flash.destroy(),
    });

    const eCtx: EffectContext = {
      scene, spell, sourceX: cx, sourceY: cy,
      enemies, statusEffects: ctx.statusEffects,
    };

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(cx, cy, enemy.sprite.x, enemy.sprite.y);
      if (dist <= novaRadius) {
        enemy.takeDamage(spell.damage);
        CoreEffectExecutor.apply(eCtx, enemy);
      }
    }
  }

  // ── Geometry ────────────────────────────────────────────────────────────

  static pointToLineDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
  }

  static dotAlongLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return 0;
    return ((px - x1) * dx + (py - y1) * dy) / lenSq;
  }
}