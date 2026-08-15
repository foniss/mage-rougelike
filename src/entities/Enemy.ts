// src/entities/Enemy.ts

import Phaser from 'phaser';
import {
  ENEMY_MAX_HP,
  ENEMY_SPEED,
  ENEMY_RADIUS,
} from '../config/constants';

/** Identifies the cast responsible for damage without coupling enemies to spell systems. */
export interface DamageSource {
  castId: number;
}

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hp: number = ENEMY_MAX_HP;
  public maxHp: number = ENEMY_MAX_HP;
  public alive: boolean = true;
  public lastContactDamageTime: number = 0;

  // Status flags for external systems
  public isFrozen: boolean = false;
  public isBound: boolean = false;
  public isStunned: boolean = false;
  public bindAnchorX: number = 0;
  public bindAnchorY: number = 0;
  public bindRadius: number = 30;

  private scene: Phaser.Scene;
  private targetSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private hpBarBg: Phaser.GameObjects.Sprite;
  private hpBarFill: Phaser.GameObjects.Sprite;
  private maxHpBarWidth: number;

  private baseSpeed: number = ENEMY_SPEED;
  private speedMultiplier: number = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(x, y, 'enemy');
    this.sprite.setCircle(
      ENEMY_RADIUS,
      this.sprite.width / 2 - ENEMY_RADIUS,
      this.sprite.height / 2 - ENEMY_RADIUS
    );
    this.sprite.setDepth(9);
    this.sprite.setData('owner', this);

    this.maxHpBarWidth = ENEMY_RADIUS * 2 + 6;
    this.hpBarBg = scene.add.sprite(x, y - ENEMY_RADIUS - 10, 'enemy-hp-bg');
    this.hpBarFill = scene.add.sprite(x, y - ENEMY_RADIUS - 10, 'enemy-hp-fill');
    this.hpBarBg.setDepth(15);
    this.hpBarFill.setDepth(16);
    this.hpBarBg.setAlpha(0);
    this.hpBarFill.setAlpha(0);
  }

  setTarget(target: Phaser.Physics.Arcade.Sprite): void {
    this.targetSprite = target;
  }

  update(): void {
    if (!this.alive) return;
    this.moveTowardTarget();
    this.updateHpBar();
  }

  private moveTowardTarget(): void {
    if (this.isFrozen || this.isStunned) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    if (!this.targetSprite || !this.targetSprite.active) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    const currentSpeed = this.baseSpeed * this.speedMultiplier;

    // If bound, clamp position to bind radius
    if (this.isBound) {
      const distFromAnchor = Phaser.Math.Distance.Between(
        this.sprite.x, this.sprite.y,
        this.bindAnchorX, this.bindAnchorY
      );
      if (distFromAnchor > this.bindRadius) {
        const angleToAnchor = Phaser.Math.Angle.Between(
          this.sprite.x, this.sprite.y,
          this.bindAnchorX, this.bindAnchorY
        );
        this.sprite.setVelocity(
          Math.cos(angleToAnchor) * currentSpeed,
          Math.sin(angleToAnchor) * currentSpeed
        );
        return;
      }
    }

    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this.targetSprite.x, this.targetSprite.y
    );
    this.sprite.setVelocity(
      Math.cos(angle) * currentSpeed,
      Math.sin(angle) * currentSpeed
    );
  }

  private updateHpBar(): void {
    const barY = this.sprite.y - ENEMY_RADIUS - 12;
    this.hpBarBg.setPosition(this.sprite.x, barY);
    const hpRatio = this.hp / this.maxHp;
    this.hpBarFill.setScale(hpRatio, 1);
    this.hpBarFill.setPosition(
      this.sprite.x - (this.maxHpBarWidth * (1 - hpRatio)) / 2,
      barY
    );
  }

  canDealContactDamage(now: number): boolean {
    if (this.isFrozen || this.isStunned) return false;
    return now - this.lastContactDamageTime >= 1000;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  applyKnockback(angle: number, force: number, duration: number): void {
    if (!this.alive || this.isFrozen) return;
    this.sprite.setVelocity(
      Math.cos(angle) * force,
      Math.sin(angle) * force
    );
    this.isStunned = true;
    this.scene.time.delayedCall(duration * 1000, () => {
      this.isStunned = false;
    });
  }

  takeDamage(amount: number, source?: DamageSource): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.hpBarBg.setAlpha(0.8);
    this.hpBarFill.setAlpha(1);

    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.die(source);
    }
  }

  private die(source?: DamageSource): void {
    this.alive = false;
    this.scene.events.emit('enemy-died', this, source);
    this.scene.tweens.add({
      targets: [this.sprite, this.hpBarBg, this.hpBarFill],
      alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: 300, ease: 'Power2',
      onComplete: () => { this.destroy(); },
    });
  }

  destroy(): void {
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
  }
}
