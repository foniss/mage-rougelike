// src/systems/CombatSystem.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { SpellCaster, CastContext } from './SpellCaster';
import { StatusEffectSystem } from './StatusEffectSystem';
import { PrefixVisuals } from '../visuals/PrefixVisuals';
import { ENEMY_DAMAGE, ENEMY_RADIUS } from '../config/constants';
import { OrbVisual } from '../config/spellComponents';

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Enemy[];
  private projectiles: Projectile[];
  private statusEffects: StatusEffectSystem;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[],
    statusEffects: StatusEffectSystem,
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.projectiles = projectiles;
    this.statusEffects = statusEffects;
  }

  update(): void {
    this.checkProjectileEnemyCollisions();
    this.checkEnemyPlayerCollisions();
  }

  private checkProjectileEnemyCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) continue;

      // Orb aura damage
      if (proj.spell?.form.id === 'ORB') {
        const ov = proj.spell.form.formVisual as OrbVisual;
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          const dist = Phaser.Math.Distance.Between(
            proj.sprite.x, proj.sprite.y,
            enemy.sprite.x, enemy.sprite.y
          );
          if (dist <= ov.damageRadius) {
            const lastTick = proj.sprite.getData('lastAuraTick') || 0;
            const now = this.scene.time.now;
            if (now - lastTick >= ov.damageTickInterval) {
              proj.sprite.setData('lastAuraTick', now);
              const auraDamage = Math.round(proj.damage * 0.2);
              enemy.takeDamage(auraDamage, proj.castId === null ? undefined : { castId: proj.castId });

              if (proj.spell) {
                const ctx: CastContext = {
                  scene: this.scene, spell: proj.spell, player: this.player,
                  targetX: enemy.sprite.x, targetY: enemy.sprite.y,
                  enemies: this.enemies, projectiles: this.projectiles,
                  statusEffects: this.statusEffects,
                  castId: proj.castId ?? undefined,
                };
                SpellCaster.applyOnHit(ctx, enemy);
              }
            }
          }
        }
      }

      // Direct collision
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        const dist = Phaser.Math.Distance.Between(
          proj.sprite.x, proj.sprite.y,
          enemy.sprite.x, enemy.sprite.y
        );

        const hitRadius = proj.spell?.form.id === 'ORB' ? 20 : 24;

        if (dist < hitRadius) {
          const usesReturningRules = proj.isReturning || proj.spell?.prefix?.behavior.type === 'returning';
          if ((proj.maxPierceTargets > 0 || usesReturningRules) && proj.hitEnemies.has(enemy)) continue;

          enemy.takeDamage(proj.damage, proj.castId === null ? undefined : { castId: proj.castId });

          if (proj.spell) {
            const ctx: CastContext = {
              scene: this.scene, spell: proj.spell, player: this.player,
              targetX: enemy.sprite.x, targetY: enemy.sprite.y,
              enemies: this.enemies, projectiles: this.projectiles,
              statusEffects: this.statusEffects,
              castId: proj.castId ?? undefined,
            };
            SpellCaster.applyOnHit(ctx, enemy);
          }

          // Handle piercing
          if (proj.maxPierceTargets > 0) {
            proj.hitEnemies.add(enemy);
            proj.pierceCount++;

            // Piercing visual feedback
            if (proj.spell) {
              PrefixVisuals.renderPierceMoment(
                this.scene,
                proj.sprite.x, proj.sprite.y,
                enemy.sprite.x, enemy.sprite.y,
                proj.spell.visual,
                proj.pierceCount,
                proj.maxPierceTargets,
              );
            }

            proj.damage = Math.round(proj.damage * proj.damageRetainPercent);
            if (proj.pierceCount >= proj.maxPierceTargets) {
              proj.destroy();
            }
          } else if (usesReturningRules) {
            proj.hitEnemies.add(enemy);
          } else {
            proj.destroy();
          }
          break;
        }
      }
    }
  }

  private checkEnemyPlayerCollisions(): void {
    if (!this.player.alive) return;
    const now = this.scene.time.now;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      const dist = Phaser.Math.Distance.Between(
        this.player.sprite.x, this.player.sprite.y,
        enemy.sprite.x, enemy.sprite.y
      );
      if (dist < 30 && enemy.canDealContactDamage(now)) {
        this.player.takeDamage(ENEMY_DAMAGE);
        enemy.lastContactDamageTime = now;
      }
    }
  }

  cleanupProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].active) {
        this.projectiles.splice(i, 1);
      }
    }
  }
}
