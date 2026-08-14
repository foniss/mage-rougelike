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
import { BladeVisuals } from '../visuals/BladeVisuals';
import { BeamVisuals } from '../visuals/BeamVisuals';
import { MineVisuals } from '../visuals/MineVisuals';
import { NovaVisuals } from '../visuals/NovaVisuals';

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

    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;

    // Render visuals
    BladeVisuals.render({
      scene, x: px, y: py,
      aimAngle,
      range: fv.range,
      arcAngleDeg: fv.arcAngle,
      swingDuration: fv.swingDuration,
      visual: spell.visual,
      sizeMultiplier: sizeMult,
    });

    // Hit detection
    const range = fv.range * sizeMult;
    const halfArc = Phaser.Math.DegToRad(fv.arcAngle * sizeMult / 2);

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

    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;
    const beamWidth = fv.width * sizeMult;
    const beamRange = fv.range * sizeMult;
    const endX = px + Math.cos(angle) * beamRange;
    const endY = py + Math.sin(angle) * beamRange;

    // Render visuals
    BeamVisuals.render({
      scene, startX: px, startY: py, endX, endY,
      width: fv.width,
      castDuration: fv.castDuration,
      visual: spell.visual,
      sizeMultiplier: sizeMult,
    });

    const eCtx: EffectContext = {
      scene, spell, sourceX: px, sourceY: py,
      enemies, statusEffects: ctx.statusEffects,
    };

    // Initial hit
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = FormExecutor.pointToLineDist(enemy.sprite.x, enemy.sprite.y, px, py, endX, endY);
      const t = FormExecutor.dotAlongLine(enemy.sprite.x, enemy.sprite.y, px, py, endX, endY);
      if (dist <= beamWidth + ENEMY_RADIUS && t >= 0 && t <= 1) {
        enemy.takeDamage(spell.damage);
        CoreEffectExecutor.apply(eCtx, enemy);
      }
    }

    // Tick damage
    const tickTimer = scene.time.addEvent({
      delay: fv.tickInterval, repeat: Math.floor(fv.castDuration / fv.tickInterval) - 1,
      callback: () => {
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const dist = FormExecutor.pointToLineDist(enemy.sprite.x, enemy.sprite.y, px, py, endX, endY);
          const t = FormExecutor.dotAlongLine(enemy.sprite.x, enemy.sprite.y, px, py, endX, endY);
          if (dist <= beamWidth + ENEMY_RADIUS && t >= 0 && t <= 1) {
            enemy.takeDamage(Math.round(spell.damage * 0.3));
            CoreEffectExecutor.apply(eCtx, enemy);
          }
        }
      },
    });

    scene.time.delayedCall(fv.castDuration, () => tickTimer.destroy());
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

    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;
    let mineX = Phaser.Math.Clamp(ctx.targetX, WALL_THICKNESS + 10, ROOM_WIDTH - WALL_THICKNESS - 10);
    let mineY = Phaser.Math.Clamp(ctx.targetY, WALL_THICKNESS + 10, ROOM_HEIGHT - WALL_THICKNESS - 10);

    const explosionRadius = fv.explosionRadius * sizeMult;
    const triggerRadius = fv.triggerRadius * sizeMult;

    // Create visual mine
    const mineVisual = MineVisuals.create(
      scene, mineX, mineY, fv.triggerRadius, spell.visual, sizeMult,
    );

    let armed = false;
    let detonated = false;

    scene.time.delayedCall(fv.armDelay, () => {
      if (!detonated) {
        armed = true;
        mineVisual.setArmed();
      }
    });

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

    scene.time.delayedCall(fv.lifetime, () => {
      if (!detonated) {
        detonated = true;
        checkTimer.destroy();
        mineVisual.expire();
      }
    });

    const detonate = () => {
      detonated = true;
      checkTimer.destroy();
      mineVisual.detonate(fv.explosionRadius);

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
    const cx = ctx.targetX, cy = ctx.targetY;

    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;
    const novaRadius = fv.radius * sizeMult;

    // Render visuals
    NovaVisuals.render({
      scene, x: cx, y: cy,
      radius: fv.radius,
      expandDuration: fv.expandDuration,
      visual: spell.visual,
      sizeMultiplier: sizeMult,
    });

    // Hit detection
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