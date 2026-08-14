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
import { ENEMY_RADIUS } from '../config/constants';

export interface CastContext {
  scene: Phaser.Scene;
  spell: Spell;
  player: Player;
  targetX: number;
  targetY: number;
  enemies: Enemy[];
  projectiles: Projectile[];
  statusEffects: StatusEffectSystem;
}

export class SpellCaster {

  static cast(ctx: CastContext): void {
    const { scene, spell, player, enemies, projectiles, statusEffects } = ctx;

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
    };

    // Execute the form
    FormExecutor.execute(formCtx);

    // Handle suffix on-kill effects
    if (spell.suffix) {
      SpellCaster.setupSuffixWatchers(ctx);
    }

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

    // Handle binding suffix
    if (spell.suffix?.behavior.type === 'binding') {
      const bindBehavior = spell.suffix.behavior as BindingBehavior;
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const dist = Phaser.Math.Distance.Between(
          ctx.targetX, ctx.targetY,
          enemy.sprite.x, enemy.sprite.y
        );
        if (dist <= bindBehavior.bindRadius + ENEMY_RADIUS + 20) {
          enemy.isBound = true;
          enemy.bindAnchorX = enemy.sprite.x;
          enemy.bindAnchorY = enemy.sprite.y;
          enemy.bindRadius = bindBehavior.bindRadius;

          // Create binding visual
          const bindVisual = SuffixVisuals.createBindingVisual(
            scene, enemy.sprite.x, enemy.sprite.y,
            bindBehavior.bindRadius, bindBehavior.bindDuration,
            spell.visual,
          );

          // Update binding visual to follow enemy
          const updateTimer = scene.time.addEvent({
            delay: 16, loop: true,
            callback: () => {
              if (enemy.alive && enemy.isBound) {
                bindVisual.update(enemy.sprite.x, enemy.sprite.y);
              }
            },
          });

          scene.time.delayedCall(bindBehavior.bindDuration * 1000, () => {
            enemy.isBound = false;
            updateTimer.destroy();
            bindVisual.destroy();
          });
        }
      }
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

    const onEnemyDied = (enemy: Enemy) => {
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
                target.takeDamage(seekDmg);
                const eCtx: EffectContext = {
                  scene, spell, sourceX: fromX, sourceY: fromY,
                  enemies, statusEffects,
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
            e.takeDamage(detDmg);
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
    };
    CoreEffectExecutor.apply(eCtx, enemy);
  }
}