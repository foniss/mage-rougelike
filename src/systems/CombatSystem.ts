// src/systems/CombatSystem.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { SpellCaster, CastContext } from './SpellCaster';
import { StatusEffectSystem } from './StatusEffectSystem';
import { LightningChainSystem } from './LightningChainSystem';
import { ENEMY_DAMAGE } from '../config/constants';

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Enemy[];
  private projectiles: Projectile[];
  private statusEffects: StatusEffectSystem;
  private lightningChain: LightningChainSystem;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[],
    statusEffects: StatusEffectSystem,
    lightningChain: LightningChainSystem
  ) {
    this.scene          = scene;
    this.player         = player;
    this.enemies        = enemies;
    this.projectiles    = projectiles;
    this.statusEffects  = statusEffects;
    this.lightningChain = lightningChain;
  }

  update(): void {
    this.checkProjectileEnemyCollisions();
    this.checkEnemyPlayerCollisions();
  }

  private checkProjectileEnemyCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        const dist = Phaser.Math.Distance.Between(
          proj.sprite.x, proj.sprite.y,
          enemy.sprite.x, enemy.sprite.y
        );

        if (dist < 24) {
          enemy.takeDamage(proj.damage);

          // Apply core effect if this is a spell projectile
          if (proj.spell && proj.spell.targetingType === 'projectile') {
            const ctx: CastContext = {
              scene: this.scene,
              spell: proj.spell,
              playerX: this.player.sprite.x,
              playerY: this.player.sprite.y,
              targetX: enemy.sprite.x,
              targetY: enemy.sprite.y,
              enemies: this.enemies,
              projectiles: this.projectiles,
              statusEffects: this.statusEffects,
              lightningChain: this.lightningChain,
            };
            SpellCaster.applyCoreEffect(ctx, enemy);
          }

          proj.destroy();
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
        enemy.sprite.x,       enemy.sprite.y
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