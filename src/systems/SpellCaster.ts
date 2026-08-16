import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { StatusEffectSystem } from './StatusEffectSystem';
import { BuildupSystem } from './BuildupSystem';
import { FormExecutor, FormContext } from './FormExecutor';
import { CoreEffectExecutor, EffectContext } from './CoreEffectExecutor';
import { PrefixVisuals } from '../visuals/PrefixVisuals';
import { SuffixVisuals } from '../visuals/SuffixVisuals';
import { EchoesBehavior, DevouringBehavior, BindingBehavior, ReapingBehavior, DetonationBehavior } from '../config/spellComponents';

export interface CastContext {
  scene: Phaser.Scene;
  spell: Spell;
  player: Player;
  targetX: number;
  targetY: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  statusEffects: StatusEffectSystem;
  buildupSystem: BuildupSystem;
  castId?: number;
}

export class SpellCaster {
  private static nextCastId = 1;

  static cast(ctx: CastContext): void {
    const { scene, spell, player, enemies, projectiles, statusEffects, buildupSystem } = ctx;
    const castId = ctx.castId ?? SpellCaster.nextCastId++;

    if (spell.prefix?.behavior.type === 'greater') {
      PrefixVisuals.renderGreaterCastEffect(scene, player.sprite.x, player.sprite.y, spell.visual, 30);
    }

    const formCtx: FormContext = {
      scene, spell, player,
      targetX: ctx.targetX, targetY: ctx.targetY,
      enemies, projectiles, statusEffects, buildupSystem, castId,
      onHit: (enemy) => SpellCaster.applyOnHit({ ...ctx, castId }, enemy),
    };

    if (spell.suffix && ['devouring', 'reaping', 'detonation'].includes(spell.suffix.behavior.type)) {
      SpellCaster.setupSuffixWatchers({ ...ctx, castId });
    }

    FormExecutor.execute(formCtx);

    if (spell.suffix?.behavior.type === 'echoes' && !spell.isEcho) {
      const eb = spell.suffix.behavior as EchoesBehavior;
      scene.time.delayedCall(eb.echoDelay, () => {
        SuffixVisuals.renderEchoActivation(scene, player.sprite.x, player.sprite.y, spell.visual);
        const echoSpell: Spell = {
          ...spell,
          damage: Math.round(spell.damage * eb.echoDamageMultiplier),
          isEcho: true,
          suffix: eb.canEchoRecursively ? spell.suffix : null,
        };
        SpellCaster.cast({ ...ctx, spell: echoSpell });
      });
    }
  }

  private static setupSuffixWatchers(ctx: CastContext): void {
    const { scene, spell, enemies, statusEffects, buildupSystem } = ctx;
    if (!spell.suffix) return;
    const behavior = spell.suffix.behavior;
    const watchDuration = 3000;

    const onEnemyDied = (enemy: Enemy, source?: { castId: number }) => {
      if (source?.castId !== ctx.castId) return;

      if (behavior.type === 'devouring') {
        const db = behavior as DevouringBehavior;
        if (ctx.player.alive) {
          ctx.player.mana = Math.min(ctx.player.maxMana, ctx.player.mana + db.manaRestoreOnKill);
          SuffixVisuals.renderDevouringEffect(scene, enemy.sprite.x, enemy.sprite.y, ctx.player.sprite.x, ctx.player.sprite.y, db.manaRestoreOnKill, spell.visual);
        }
      }

      if (behavior.type === 'reaping') {
        const rb = behavior as ReapingBehavior;
        let tl = rb.maxAdditionalTargets;
        const seekNext = (fx: number, fy: number) => {
          if (tl <= 0) return;
          let closest: Enemy | null = null, cd = Infinity;
          for (const e of enemies) {
            if (!e.alive) continue;
            const d = Phaser.Math.Distance.Between(fx, fy, e.sprite.x, e.sprite.y);
            if (d <= rb.seekRange && d < cd) { cd = d; closest = e; }
          }
          if (closest) {
            tl--;
            const sd = Math.round(spell.damage * rb.seekDamagePercent);
            SuffixVisuals.renderReapingSeek(scene, fx, fy, closest.sprite.x, closest.sprite.y, spell.visual, rb.seekDamagePercent);
            const target = closest;
            scene.time.delayedCall(250, () => {
              if (target.alive) {
                target.takeDamage(sd, { castId: ctx.castId! });
                // Reaping damage applies buildup too
                const eCtx: EffectContext = { scene, spell, sourceX: fx, sourceY: fy, enemies, statusEffects, buildupSystem, castId: ctx.castId! };
                CoreEffectExecutor.apply(eCtx, target);
              }
            });
          }
        };
        seekNext(enemy.sprite.x, enemy.sprite.y);
      }

      if (behavior.type === 'detonation') {
        const db = behavior as DetonationBehavior;
        const ex = enemy.sprite.x, ey = enemy.sprite.y;
        SuffixVisuals.renderDetonationExplosion(scene, ex, ey, db.explosionRadius, spell.visual);
        const dd = Math.round(spell.damage * db.explosionDamagePercent);
        for (const e of enemies) {
          if (!e.alive) continue;
          const d = Phaser.Math.Distance.Between(ex, ey, e.sprite.x, e.sprite.y);
          if (d <= db.explosionRadius) {
            e.takeDamage(dd, db.canChainDetonate ? { castId: ctx.castId! } : undefined);
          }
        }
      }
    };

    scene.events.on('enemy-died', onEnemyDied);
    scene.time.delayedCall(watchDuration, () => {
      scene.events.off('enemy-died', onEnemyDied);
    });
  }

  static applyOnHit(ctx: CastContext, enemy: Enemy): void {
    const eCtx: EffectContext = {
      scene: ctx.scene,
      spell: ctx.spell,
      sourceX: ctx.player.sprite.x,
      sourceY: ctx.player.sprite.y,
      enemies: ctx.enemies,
      statusEffects: ctx.statusEffects,
      buildupSystem: ctx.buildupSystem,
      castId: ctx.castId ?? 0,
    };
    CoreEffectExecutor.apply(eCtx, enemy);

    if (ctx.spell.suffix?.behavior.type === 'binding') {
      SpellCaster.applyBinding(ctx, enemy, ctx.spell.suffix.behavior as BindingBehavior);
    }
  }

  private static applyBinding(ctx: CastContext, enemy: Enemy, behavior: BindingBehavior): void {
    const existing = enemy.sprite.getData('bindingEffect') as any;
    if (existing) { existing.expireTimer.destroy(); existing.updateTimer.destroy(); existing.visual.destroy(); }
    enemy.isBound = true;
    enemy.bindAnchorX = enemy.sprite.x;
    enemy.bindAnchorY = enemy.sprite.y;
    enemy.bindRadius = behavior.bindRadius;
    const visual = SuffixVisuals.createBindingVisual(ctx.scene, enemy.sprite.x, enemy.sprite.y, behavior.bindRadius, behavior.bindDuration, ctx.spell.visual);
    const updateTimer = ctx.scene.time.addEvent({ delay: 16, loop: true, callback: () => { if (enemy.alive && enemy.isBound) visual.update(enemy.sprite.x, enemy.sprite.y); } });
    const expireTimer = ctx.scene.time.delayedCall(behavior.bindDuration * 1000, () => { enemy.isBound = false; updateTimer.destroy(); visual.destroy(); enemy.sprite.data?.remove('bindingEffect'); });
    enemy.sprite.setData('bindingEffect', { expireTimer, updateTimer, visual });
  }
}
