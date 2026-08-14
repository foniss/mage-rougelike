// src/systems/CombatSystem.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { SpellCaster } from './SpellCaster';
import { ENEMY_DAMAGE } from '../config/constants';
import { FormType } from '../config/forms';

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Enemy[];
  private projectiles: Projectile[];

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Enemy[],
    projectiles: Projectile[]
  ) {
    this.scene       = scene;
    this.player      = player;
    this.enemies     = enemies;
    this.projectiles = projectiles;
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

          // Apply core effect if this is a spell bolt
          if (proj.spell && proj.spell.form === FormType.BOLT) {
            SpellCaster.applyCoreEffect(
              this.scene, proj.spell, enemy, this.enemies
            );
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