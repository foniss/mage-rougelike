// src/systems/SpellCaster.ts

import Phaser from 'phaser';
import { Spell } from './SpellBuilder';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { StatusEffectSystem } from './StatusEffectSystem';
import { FormExecutor, FormContext } from './FormExecutor';
import { CoreEffectExecutor, EffectContext } from './CoreEffectExecutor';
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

    const formCtx: FormContext = {
      scene, spell, player,
      targetX: ctx.targetX, targetY: ctx.targetY,
      enemies, projectiles, statusEffects,
    };

    // Execute the form
    FormExecutor.execute(formCtx);

    // Handle suffix on-kill effects by watching for kills
    if (spell.suffix) {
      SpellCaster.setupSuffixWatchers(ctx);
    }

    // Handle echo suffix
    if (spell.suffix?.behavior.type === 'echoes' && !spell.isEcho) {
      const echoBehavior = spell.suffix.behavior as EchoesBehavior;
      scene.time.delayedCall(echoBehavior.echoDelay, () => {
        // Create echo spell with reduced damage
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
      // Apply binding to enemies near the target
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

          // Visual: binding circle
          const bindCircle = scene.add.circle(
            enemy.sprite.x, enemy.sprite.y,
            bindBehavior.bindRadius, spell.visual.color, 0.1
          ).setDepth(6).setStrokeStyle(1, spell.visual.color, 0.3);

          const updateBind = scene.time.addEvent({
            delay: 16, loop: true,
            callback: () => {
              if (enemy.alive) bindCircle.setPosition(enemy.bindAnchorX, enemy.bindAnchorY);
            },
          });

          scene.time.delayedCall(bindBehavior.bindDuration * 1000, () => {
            enemy.isBound = false;
            updateBind.destroy();
            scene.tweens.add({
              targets: bindCircle, alpha: 0, duration: 200,
              onComplete: () => bindCircle.destroy(),
            });
          });
        }
      }
    }
  }

  /**
   * Set up watchers for suffix on-kill effects.
   * Listens for enemy-died events that happen shortly after casting.
   */
  private static setupSuffixWatchers(ctx: CastContext): void {
    const { scene, spell, enemies, statusEffects } = ctx;
    if (!spell.suffix) return;

    const behavior = spell.suffix.behavior;
    const watchDuration = 3000; // How long after cast to watch for kills

    const onEnemyDied = (enemy: Enemy) => {
      if (behavior.type === 'devouring') {
        const devBehavior = behavior as DevouringBehavior;
        if (ctx.player.alive) {
          ctx.player.mana = Math.min(
            ctx.player.maxMana,
            ctx.player.mana + devBehavior.manaRestoreOnKill
          );
          // Visual feedback
          const manaText = scene.add.text(
            ctx.player.sprite.x, ctx.player.sprite.y - 30,
            `+${devBehavior.manaRestoreOnKill} MP`,
            { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#4488ff', fontStyle: 'bold' }
          ).setOrigin(0.5).setDepth(50);
          scene.tweens.add({
            targets: manaText, y: manaText.y - 20, alpha: 0, duration: 800,
            onComplete: () => manaText.destroy(),
          });
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
            closest.takeDamage(seekDmg);

            // Seek visual
            const seekLine = scene.add.line(0, 0,
              fromX, fromY, closest.sprite.x, closest.sprite.y,
              spell.visual.color, 0.5
            ).setOrigin(0, 0).setLineWidth(1).setDepth(20);
            scene.tweens.add({
              targets: seekLine, alpha: 0, duration: 300,
              onComplete: () => seekLine.destroy(),
            });

            // Apply core effect
            const eCtx: EffectContext = {
              scene, spell, sourceX: fromX, sourceY: fromY,
              enemies, statusEffects,
            };
            CoreEffectExecutor.apply(eCtx, closest);
          }
        };

        seekNext(enemy.sprite.x, enemy.sprite.y);
      }

      if (behavior.type === 'detonation') {
        const detBehavior = behavior as DetonationBehavior;
        const ex = enemy.sprite.x, ey = enemy.sprite.y;

        // Explosion visual
        const explosion = scene.add.circle(ex, ey, 10, spell.visual.color, 0.4);
        explosion.setDepth(20).setStrokeStyle(2, spell.visual.glowColor, 0.7);
        scene.tweens.add({
          targets: explosion,
          scaleX: detBehavior.explosionRadius / 10,
          scaleY: detBehavior.explosionRadius / 10,
          alpha: 0, duration: 300, ease: 'Power2',
          onComplete: () => explosion.destroy(),
        });

        const detDmg = Math.round(spell.damage * detBehavior.explosionDamagePercent);
        for (const e of enemies) {
          if (!e.alive) continue;
          const d = Phaser.Math.Distance.Between(ex, ey, e.sprite.x, e.sprite.y);
          if (d <= detBehavior.explosionRadius) {
            e.takeDamage(detDmg);
            // DO NOT chain detonate (canChainDetonate is false)
          }
        }
      }
    };

    scene.events.on('enemy-died', onEnemyDied);

    // Stop watching after watchDuration
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