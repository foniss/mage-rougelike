// src/systems/SpellCaster.ts

import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { StatusEffectSystem } from './StatusEffectSystem';
import { FormExecutor, FormContext } from './FormExecutor';
import { CoreEffectExecutor, EffectContext } from './CoreEffectExecutor';
import { PrefixVisuals } from '../visuals/PrefixVisuals';
import { SuffixVisuals } from '../visuals/SuffixVisuals';
import {
  EchoesBehavior,
  DevouringBehavior,
  BindingBehavior,
  ReapingBehavior,
  DetonationBehavior,
} from '../config/spellComponents';

export interface CastContext {
  scene: Phaser.Scene;
  spell: Spell;
  player: Player;
  targetX: number;
  targetY: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  statusEffects: StatusEffectSystem;
  /** Unique cast identity used to attribute delayed damage and kill effects. */
  castId?: number;
}

export class SpellCaster {
  private static nextCastId = 1;

  static cast(ctx: CastContext): void {
    const { scene, spell, player, enemies, projectiles, statusEffects } = ctx;
    const castId = ctx.castId ?? SpellCaster.nextCastId++;

    // Greater cast effect
    if (spell.prefix?.behavior.type === 'greater') {
      PrefixVisuals.renderGreaterCastEffect(
        scene, player.sprite.x, player.sprite.y,
        spell.visual, 30,
      );
    }

    const formCtx: FormContext = {
      scene, spell, player,
      targetX: ctx.targetX, targetY: ctx.targetY,
      enemies, projectiles, statusEffects,
      castId,
      onHit: (enemy) => SpellCaster.applyOnHit({ ...ctx, castId }, enemy),
    };

    // Start kill attribution before executing an immediate form (Blade/Nova),
    // so a first-hit kill is still credited to this cast.
    if (spell.suffix && ['devouring', 'reaping', 'detonation'].includes(spell.suffix.behavior.type)) {
      SpellCaster.setupSuffixWatchers({ ...ctx, castId });
    }

    // Execute the form
    FormExecutor.execute(formCtx);

    // Handle echo suffix
    if (spell.suffix?.behavior.type === 'echoes' && !spell.isEcho) {
      const echoBehavior = spell.suffix.behavior as EchoesBehavior;
      scene.time.delayedCall(echoBehavior.echoDelay, () => {
        // Echo activation visual
        SuffixVisuals.renderEchoActivation(
          scene, player.sprite.x, player.sprite.y, spell.visual,
        );

        const echoSpell: Spell = {
          ...spell,
          damage: Math.round(spell.damage * echoBehavior.echoDamageMultiplier),
          isEcho: true,
          suffix: echoBehavior.canEchoRecursively ? spell.suffix : null,
        };

        const echoCtx: CastContext = { ...ctx, spell: echoSpell };
        SpellCaster.cast(echoCtx);
      });
    }

  }

  /**
   * Set up watchers for suffix on-kill effects.
   */
  private static setupSuffixWatchers(ctx: CastContext): void {
    const { scene, spell, enemies, statusEffects } = ctx;
    if (!spell.suffix) return;

    const behavior = spell.suffix.behavior;
    const watchDuration = 3000;

    const onEnemyDied = (enemy: Enemy, source?: { castId: number }) => {
      if (source?.castId !== ctx.castId) return;
      if (behavior.type === 'devouring') {
        const devBehavior = behavior as DevouringBehavior;
        if (ctx.player.alive) {
          ctx.player.mana = Math.min(
            ctx.player.maxMana,
            ctx.player.mana + devBehavior.manaRestoreOnKill
          );

          // Devouring visual
          SuffixVisuals.renderDevouringEffect(
            scene,
            enemy.sprite.x, enemy.sprite.y,
            ctx.player.sprite.x, ctx.player.sprite.y,
            devBehavior.manaRestoreOnKill,
            spell.visual,
          );
        }
      }

      if (behavior.type === 'reaping') {
        const reapBehavior = behavior as ReapingBehavior;
        let targetsLeft = reapBehavior.maxAdditionalTargets;

        const seekNext = (fromX: number, fromY: number) => {
          if (targetsLeft <= 0) return;
          let closest: Enemy | null = null;
          let closestDist = Infinity;
          for (const e of enemies) {
            if (!e.alive) continue;
            const d = Phaser.Math.Distance.Between(fromX, fromY, e.sprite.x, e.sprite.y);
            if (d <= reapBehavior.seekRange && d < closestDist) {
              closestDist = d;
              closest = e;
            }
          }
          if (closest) {
            targetsLeft--;
            const seekDmg = Math.round(spell.damage * reapBehavior.seekDamagePercent);

            // Reaping visual
            SuffixVisuals.renderReapingSeek(
              scene, fromX, fromY,
              closest.sprite.x, closest.sprite.y,
              spell.visual, reapBehavior.seekDamagePercent,
            );

            // Delay damage slightly so visual plays first
            const target = closest;
            scene.time.delayedCall(250, () => {
              if (target.alive) {
                target.takeDamage(seekDmg, { castId: ctx.castId! });
                const eCtx: EffectContext = {
                  scene, spell, sourceX: fromX, sourceY: fromY,
                  enemies, statusEffects, castId: ctx.castId!,
                };
                CoreEffectExecutor.apply(eCtx, target);
              }
            });
          }
        };

        seekNext(enemy.sprite.x, enemy.sprite.y);
      }

      if (behavior.type === 'detonation') {
        const detBehavior = behavior as DetonationBehavior;
        const ex = enemy.sprite.x, ey = enemy.sprite.y;

        // Detonation visual
        SuffixVisuals.renderDetonationExplosion(
          scene, ex, ey, detBehavior.explosionRadius, spell.visual,
        );

        const detDmg = Math.round(spell.damage * detBehavior.explosionDamagePercent);
        for (const e of enemies) {
          if (!e.alive) continue;
          const d = Phaser.Math.Distance.Between(ex, ey, e.sprite.x, e.sprite.y);
          if (d <= detBehavior.explosionRadius) {
            e.takeDamage(detDmg, detBehavior.canChainDetonate ? { castId: ctx.castId! } : undefined);
          }
        }
      }
    };

    scene.events.on('enemy-died', onEnemyDied);
    scene.time.delayedCall(watchDuration, () => {
      scene.events.off('enemy-died', onEnemyDied);
    });
  }

  /**
   * Called by CombatSystem when a spell projectile hits an enemy.
   */
  static applyOnHit(ctx: CastContext, enemy: Enemy): void {
    const eCtx: EffectContext = {
      scene: ctx.scene,
      spell: ctx.spell,
      sourceX: ctx.player.sprite.x,
      sourceY: ctx.player.sprite.y,
      enemies: ctx.enemies,
      statusEffects: ctx.statusEffects,
      castId: ctx.castId ?? 0,
    };
    CoreEffectExecutor.apply(eCtx, enemy);

    if (ctx.spell.suffix?.behavior.type === 'binding') {
      SpellCaster.applyBinding(ctx, enemy, ctx.spell.suffix.behavior as BindingBehavior);
    }
  }

  private static applyBinding(ctx: CastContext, enemy: Enemy, behavior: BindingBehavior): void {
    const existing = enemy.sprite.getData('bindingEffect') as {
      expireTimer: Phaser.Time.TimerEvent;
      updateTimer: Phaser.Time.TimerEvent;
      visual: ReturnType<typeof SuffixVisuals.createBindingVisual>;
    } | undefined;
    if (existing) {
      existing.expireTimer.destroy();
      existing.updateTimer.destroy();
      existing.visual.destroy();
    }

    enemy.isBound = true;
    enemy.bindAnchorX = enemy.sprite.x;
    enemy.bindAnchorY = enemy.sprite.y;
    enemy.bindRadius = behavior.bindRadius;
    const visual = SuffixVisuals.createBindingVisual(
      ctx.scene, enemy.sprite.x, enemy.sprite.y,
      behavior.bindRadius, behavior.bindDuration, ctx.spell.visual,
    );
    const updateTimer = ctx.scene.time.addEvent({
      delay: 16, loop: true,
      callback: () => {
        if (enemy.alive && enemy.isBound) visual.update(enemy.sprite.x, enemy.sprite.y);
      },
    });
    const expireTimer = ctx.scene.time.delayedCall(behavior.bindDuration * 1000, () => {
      enemy.isBound = false;
      updateTimer.destroy();
      visual.destroy();
      enemy.sprite.data?.remove('bindingEffect');
    });
    enemy.sprite.setData('bindingEffect', { expireTimer, updateTimer, visual });
  }
}
