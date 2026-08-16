import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { SpellCaster, CastContext } from './SpellCaster';
import { StatusEffectSystem } from './StatusEffectSystem';
import { BuildupSystem } from './BuildupSystem';
import { PrefixVisuals } from '../visuals/PrefixVisuals';
import { ENEMY_DAMAGE } from '../config/constants';
import { OrbVisual } from '../config/spellComponents';

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Enemy[];
  private projectiles: Projectile[];
  private statusEffects: StatusEffectSystem;
  private buildupSystem: BuildupSystem;

  constructor(scene: Phaser.Scene, player: Player, enemies: Enemy[], projectiles: Projectile[], statusEffects: StatusEffectSystem, buildupSystem: BuildupSystem) {
    this.scene = scene; this.player = player; this.enemies = enemies;
    this.projectiles = projectiles; this.statusEffects = statusEffects;
    this.buildupSystem = buildupSystem;
  }

  update(): void {
    this.checkProjectileEnemyCollisions();
    this.checkEnemyPlayerCollisions();
  }

  private makeCastCtx(proj: Projectile, tx: number, ty: number): CastContext {
    return {
      scene: this.scene, spell: proj.spell!, player: this.player,
      targetX: tx, targetY: ty,
      enemies: this.enemies, projectiles: this.projectiles,
      statusEffects: this.statusEffects, buildupSystem: this.buildupSystem,
      castId: proj.castId ?? undefined,
    };
  }

  private checkProjectileEnemyCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.active) continue;

      const hitInfo = { spell: proj.spell, sourceX: this.player.sprite.x, sourceY: this.player.sprite.y };

      // Orb aura damage
      if (proj.spell?.form.id === 'ORB') {
        const ov = proj.spell.form.formVisual as OrbVisual;
        for (const enemy of this.enemies) {
          if (!enemy.alive) continue;
          const dist = Phaser.Math.Distance.Between(proj.sprite.x, proj.sprite.y, enemy.sprite.x, enemy.sprite.y);
          if (dist <= ov.damageRadius) {
            const lt = proj.sprite.getData('lastAuraTick') || 0;
            const now = this.scene.time.now;
            if (now - lt >= ov.damageTickInterval) {
              proj.sprite.setData('lastAuraTick', now);
              const ad = Math.round(proj.damage * 0.2);
              enemy.takeDamage(ad, proj.castId === null ? undefined : { castId: proj.castId }, hitInfo);
              if (proj.spell) {
                SpellCaster.applyOnHit(this.makeCastCtx(proj, enemy.sprite.x, enemy.sprite.y), enemy);
              }
            }
          }
        }
      }

      // Direct collision
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        const dist = Phaser.Math.Distance.Between(proj.sprite.x, proj.sprite.y, enemy.sprite.x, enemy.sprite.y);
        const hr = proj.spell?.form.id === 'ORB' ? 20 : 24;

        if (dist < hr) {
          const urr = proj.isReturning || proj.spell?.prefix?.behavior.type === 'returning';
          if ((proj.maxPierceTargets > 0 || urr) && proj.hitEnemies.has(enemy)) continue;

          enemy.takeDamage(proj.damage, proj.castId === null ? undefined : { castId: proj.castId }, hitInfo);

          if (proj.spell) {
            SpellCaster.applyOnHit(this.makeCastCtx(proj, enemy.sprite.x, enemy.sprite.y), enemy);
          }

          if (proj.maxPierceTargets > 0) {
            proj.hitEnemies.add(enemy);
            proj.pierceCount++;
            if (proj.spell) PrefixVisuals.renderPierceMoment(this.scene, proj.sprite.x, proj.sprite.y, enemy.sprite.x, enemy.sprite.y, proj.spell.visual, proj.pierceCount, proj.maxPierceTargets);
            proj.damage = Math.round(proj.damage * proj.damageRetainPercent);
            if (proj.pierceCount >= proj.maxPierceTargets) proj.destroy();
          } else if (urr) {
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
      const dist = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, enemy.sprite.x, enemy.sprite.y);
      if (dist < 30 && enemy.canDealContactDamage(now)) {
        this.player.takeDamage(ENEMY_DAMAGE);
        enemy.lastContactDamageTime = now;
      }
    }
  }

  cleanupProjectiles(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (!this.projectiles[i].active) this.projectiles.splice(i, 1);
    }
  }
}
