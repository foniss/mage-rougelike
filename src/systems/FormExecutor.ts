import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { FormId, BladeVisual, BeamVisual, OrbVisual, MineVisual, NovaVisual } from '../config/spellComponents';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CoreEffectExecutor, EffectContext } from './CoreEffectExecutor';
import { StatusEffectSystem } from './StatusEffectSystem';
import { BuildupSystem } from './BuildupSystem';
import { ENEMY_RADIUS, ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS } from '../config/constants';
import { Player } from '../entities/Player';
import { BladeVisuals } from '../visuals/BladeVisuals';
import { BeamVisuals } from '../visuals/BeamVisuals';
import { MineVisuals } from '../visuals/MineVisuals';
import { NovaVisuals } from '../visuals/NovaVisuals';

export interface FormContext {
  scene: Phaser.Scene; spell: Spell; player: Player;
  targetX: number; targetY: number;
  enemies: Enemy[]; projectiles: Projectile[];
  statusEffects: StatusEffectSystem; buildupSystem: BuildupSystem;
  castId: number;
  onHit?: (enemy: Enemy) => void; isEcho?: boolean;
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

  private static makeEffectCtx(ctx: FormContext, sx: number, sy: number): EffectContext {
    return { scene: ctx.scene, spell: ctx.spell, sourceX: sx, sourceY: sy, enemies: ctx.enemies, statusEffects: ctx.statusEffects, buildupSystem: ctx.buildupSystem, castId: ctx.castId };
  }

  private static executeBlade(ctx: FormContext): void {
    const { scene, spell, player, enemies } = ctx;
    const fv = spell.form.formVisual as BladeVisual;
    const px = player.sprite.x, py = player.sprite.y;
    const aimAngle = player.getAimAngle();
    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;

    BladeVisuals.render({ scene, x: px, y: py, aimAngle, range: fv.range, arcAngleDeg: fv.arcAngle, swingDuration: fv.swingDuration, visual: spell.visual, sizeMultiplier: sizeMult, coreId: spell.core.id });

    const range = fv.range * sizeMult;
    const halfArc = Phaser.Math.DegToRad(fv.arcAngle * sizeMult / 2);
    const eCtx = FormExecutor.makeEffectCtx(ctx, px, py);
    const hitInfo = { spell, sourceX: px, sourceY: py };

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(px, py, enemy.sprite.x, enemy.sprite.y);
      if (dist > range) continue;
      const a2e = Phaser.Math.Angle.Between(px, py, enemy.sprite.x, enemy.sprite.y);
      let ad = a2e - aimAngle;
      while (ad > Math.PI) ad -= Math.PI * 2;
      while (ad < -Math.PI) ad += Math.PI * 2;
      if (Math.abs(ad) <= halfArc) {
        enemy.takeDamage(spell.damage, { castId: ctx.castId }, hitInfo);
        FormExecutor.applyOnHit(ctx, eCtx, enemy);
      }
    }
  }

  private static executeBeam(ctx: FormContext): void {
    const { scene, spell, player, enemies } = ctx;
    const fv = spell.form.formVisual as BeamVisual;
    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;
    const bw = fv.width * sizeMult;
    const br = fv.range * sizeMult;

    // Compute initial beam — but tick damage will use live player/mouse position
    const px0 = player.sprite.x, py0 = player.sprite.y;
    const angle0 = Phaser.Math.Angle.Between(px0, py0, ctx.targetX, ctx.targetY);
    const endX0 = px0 + Math.cos(angle0) * br, endY0 = py0 + Math.sin(angle0) * br;

    // Render initial beam visual (static for the visual — we'll handle tracking in tick damage)
    BeamVisuals.render({ scene, startX: px0, startY: py0, endX: endX0, endY: endY0, width: fv.width, castDuration: fv.castDuration, visual: spell.visual, sizeMultiplier: sizeMult, coreId: spell.core.id, player });

    const hitInfo = { spell, sourceX: px0, sourceY: py0 };

    // Initial hit uses snapshot position
    const eCtx0 = FormExecutor.makeEffectCtx(ctx, px0, py0);
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = FormExecutor.pointToLineDist(enemy.sprite.x, enemy.sprite.y, px0, py0, endX0, endY0);
      const t = FormExecutor.dotAlongLine(enemy.sprite.x, enemy.sprite.y, px0, py0, endX0, endY0);
      if (dist <= bw + ENEMY_RADIUS && t >= 0 && t <= 1) {
        enemy.takeDamage(spell.damage, { castId: ctx.castId }, hitInfo);
        FormExecutor.applyOnHit(ctx, eCtx0, enemy);
      }
    }

    // Tick damage — tracks live player position and mouse aim
    const beamHitSet = new Set<Enemy>(); // track which enemies were hit this tick to prevent double-hit per tick
    const tt = scene.time.addEvent({
      delay: fv.tickInterval,
      repeat: Math.floor(fv.castDuration / fv.tickInterval) - 1,
      callback: () => {
        // Use CURRENT player position and aim direction
        const cpx = player.sprite.x, cpy = player.sprite.y;
        const pointer = scene.input.activePointer;
        const liveAngle = Phaser.Math.Angle.Between(cpx, cpy, pointer.worldX, pointer.worldY);
        const liveEndX = cpx + Math.cos(liveAngle) * br;
        const liveEndY = cpy + Math.sin(liveAngle) * br;
        const liveHitInfo = { spell, sourceX: cpx, sourceY: cpy };
        const liveECtx = FormExecutor.makeEffectCtx(ctx, cpx, cpy);

        beamHitSet.clear();
        for (const enemy of enemies) {
          if (!enemy.alive || beamHitSet.has(enemy)) continue;
          const dist = FormExecutor.pointToLineDist(enemy.sprite.x, enemy.sprite.y, cpx, cpy, liveEndX, liveEndY);
          const t = FormExecutor.dotAlongLine(enemy.sprite.x, enemy.sprite.y, cpx, cpy, liveEndX, liveEndY);
          if (dist <= bw + ENEMY_RADIUS && t >= 0 && t <= 1) {
            beamHitSet.add(enemy);
            enemy.takeDamage(Math.round(spell.damage * 0.3), { castId: ctx.castId }, liveHitInfo);
            FormExecutor.applyOnHit(ctx, liveECtx, enemy);
          }
        }
      },
    });
    scene.time.delayedCall(fv.castDuration, () => tt.destroy());
  }

  private static executeOrb(ctx: FormContext): void {
    const { scene, spell, player } = ctx;
    const angle = Phaser.Math.Angle.Between(player.sprite.x, player.sprite.y, ctx.targetX, ctx.targetY);
    const sd = 24;
    const p = new Projectile(scene, {
      x: player.sprite.x + Math.cos(angle) * sd,
      y: player.sprite.y + Math.sin(angle) * sd,
      angle, spell, castId: ctx.castId, returnTarget: player,
    });
    ctx.projectiles.push(p);
  }

  private static executeMine(ctx: FormContext): void {
    const { scene, spell, enemies } = ctx;
    const fv = spell.form.formVisual as MineVisual;
    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;
    let mineX = Phaser.Math.Clamp(ctx.targetX, WALL_THICKNESS + 10, ROOM_WIDTH - WALL_THICKNESS - 10);
    let mineY = Phaser.Math.Clamp(ctx.targetY, WALL_THICKNESS + 10, ROOM_HEIGHT - WALL_THICKNESS - 10);
    const er = fv.explosionRadius * sizeMult;
    const tr = fv.triggerRadius * sizeMult;

    const mv = MineVisuals.create(scene, mineX, mineY, fv.triggerRadius, spell.visual, sizeMult, spell.core.id);
    let armed = false, detonated = false;

    scene.time.delayedCall(fv.armDelay, () => { if (!detonated) { armed = true; mv.setArmed(); } });

    const ct = scene.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!armed || detonated) return;
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          if (Phaser.Math.Distance.Between(mineX, mineY, enemy.sprite.x, enemy.sprite.y) <= tr) { detonate(); return; }
        }
      },
    });

    scene.time.delayedCall(fv.lifetime, () => { if (!detonated) { detonated = true; ct.destroy(); mv.expire(); } });

    const detonate = () => {
      detonated = true; ct.destroy(); mv.detonate(fv.explosionRadius);
      const eCtx = FormExecutor.makeEffectCtx(ctx, mineX, mineY);
      const hitInfo = { spell, sourceX: mineX, sourceY: mineY };
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (Phaser.Math.Distance.Between(mineX, mineY, enemy.sprite.x, enemy.sprite.y) <= er) {
          enemy.takeDamage(spell.damage, { castId: ctx.castId }, hitInfo);
          FormExecutor.applyOnHit(ctx, eCtx, enemy);
        }
      }
    };
  }

  private static executeNova(ctx: FormContext): void {
    const { scene, spell, enemies } = ctx;
    const fv = spell.form.formVisual as NovaVisual;
    const cx = ctx.targetX, cy = ctx.targetY;
    const sizeMult = spell.prefix?.behavior.type === 'greater' ? spell.prefix.behavior.sizeMultiplier : 1;
    const nr = fv.radius * sizeMult;

    NovaVisuals.render({ scene, x: cx, y: cy, radius: fv.radius, expandDuration: fv.expandDuration, visual: spell.visual, sizeMultiplier: sizeMult, coreId: spell.core.id });

    const eCtx = FormExecutor.makeEffectCtx(ctx, cx, cy);
    const hitInfo = { spell, sourceX: cx, sourceY: cy };

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (Phaser.Math.Distance.Between(cx, cy, enemy.sprite.x, enemy.sprite.y) <= nr) {
        enemy.takeDamage(spell.damage, { castId: ctx.castId }, hitInfo);
        FormExecutor.applyOnHit(ctx, eCtx, enemy);
      }
    }
  }

  static pointToLineDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1; const ls = dx * dx + dy * dy;
    if (ls === 0) return Phaser.Math.Distance.Between(px, py, x1, y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / ls;
    t = Math.max(0, Math.min(1, t));
    return Phaser.Math.Distance.Between(px, py, x1 + t * dx, y1 + t * dy);
  }

  static dotAlongLine(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1; const ls = dx * dx + dy * dy;
    if (ls === 0) return 0;
    return ((px - x1) * dx + (py - y1) * dy) / ls;
  }

  private static applyOnHit(ctx: FormContext, effectContext: EffectContext, enemy: Enemy): void {
    if (ctx.onHit) ctx.onHit(enemy);
    else CoreEffectExecutor.apply(effectContext, enemy);
  }
}
