// src/entities/Enemy.ts

import Phaser from 'phaser';
import {
  ENEMY_MAX_HP,
  ENEMY_SPEED,
  ENEMY_RADIUS,
} from '../config/constants';

interface ActiveBurn {
  damagePerSecond: number;
  remainingTime: number;  // seconds
  timer: Phaser.Time.TimerEvent;
  visual: Phaser.GameObjects.Circle | null;
}

interface ActiveSlow {
  slowPercent: number;
  remainingTime: number;  // seconds
  timer: Phaser.Time.TimerEvent;
  visual: Phaser.GameObjects.Circle | null;
}

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hp: number = ENEMY_MAX_HP;
  public maxHp: number = ENEMY_MAX_HP;
  public alive: boolean = true;
  public lastContactDamageTime: number = 0;

  private scene: Phaser.Scene;
  private targetSprite: Phaser.Physics.Arcade.Sprite | null = null;
  private hpBarBg: Phaser.GameObjects.Sprite;
  private hpBarFill: Phaser.GameObjects.Sprite;
  private maxHpBarWidth: number;

  // Status effects
  private activeBurn: ActiveBurn | null = null;
  private activeSlow: ActiveSlow | null = null;
  private baseSpeed: number = ENEMY_SPEED;
  private currentSpeed: number = ENEMY_SPEED;

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

    // HP bar
    this.maxHpBarWidth = ENEMY_RADIUS * 2 + 6;
    this.hpBarBg   = scene.add.sprite(x, y - ENEMY_RADIUS - 10, 'enemy-hp-bg');
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
    this.updateStatusVisuals();
  }

  private moveTowardTarget(): void {
    if (!this.targetSprite || !this.targetSprite.active) {
      this.sprite.setVelocity(0, 0);
      return;
    }
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      this.targetSprite.x, this.targetSprite.y
    );
    this.sprite.setVelocity(
      Math.cos(angle) * this.currentSpeed,
      Math.sin(angle) * this.currentSpeed
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

  private updateStatusVisuals(): void {
    if (this.activeBurn?.visual) {
      this.activeBurn.visual.setPosition(this.sprite.x, this.sprite.y);
    }
    if (this.activeSlow?.visual) {
      this.activeSlow.visual.setPosition(this.sprite.x, this.sprite.y);
    }
  }

  canDealContactDamage(now: number): boolean {
    return now - this.lastContactDamageTime >= 1000;
  }

  // ── Damage ────────────────────────────────────────────────────────────────

  takeDamage(amount: number): void {
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
      this.die();
    }
  }

  // ── Status Effects ────────────────────────────────────────────────────────

  applyBurn(damagePerSecond: number, duration: number): void {
    if (!this.alive) return;

    // Remove existing burn
    if (this.activeBurn) {
      this.activeBurn.timer.destroy();
      if (this.activeBurn.visual) this.activeBurn.visual.destroy();
    }

    // Visual indicator
    const burnVisual = this.scene.add.circle(
      this.sprite.x, this.sprite.y,
      ENEMY_RADIUS + 6, 0xff4400, 0.2
    );
    burnVisual.setDepth(8);

    // Burn tick every 0.5 seconds
    const tickInterval = 500;
    const totalTicks = Math.ceil((duration * 1000) / tickInterval);
    let ticksRemaining = totalTicks;
    const damagePerTick = (damagePerSecond * tickInterval) / 1000;

    const burnTimer = this.scene.time.addEvent({
      delay: tickInterval,
      callback: () => {
        if (!this.alive) {
          burnTimer.destroy();
          if (burnVisual) burnVisual.destroy();
          this.activeBurn = null;
          return;
        }

        this.takeDamage(damagePerTick);

        // Small burn flash
        const flash = this.scene.add.circle(
          this.sprite.x + Phaser.Math.Between(-8, 8),
          this.sprite.y + Phaser.Math.Between(-8, 8),
          4, 0xff6600, 0.6
        );
        flash.setDepth(22);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          y: flash.y - 10,
          duration: 300,
          onComplete: () => flash.destroy(),
        });

        ticksRemaining--;
        if (ticksRemaining <= 0) {
          burnTimer.destroy();
          if (burnVisual) burnVisual.destroy();
          this.activeBurn = null;
        }
      },
      loop: true,
    });

    this.activeBurn = {
      damagePerSecond,
      remainingTime: duration,
      timer: burnTimer,
      visual: burnVisual,
    };
  }

  applySlow(slowPercent: number, duration: number): void {
    if (!this.alive) return;

    // Remove existing slow
    if (this.activeSlow) {
      this.activeSlow.timer.destroy();
      if (this.activeSlow.visual) this.activeSlow.visual.destroy();
    }

    // Apply slow
    this.currentSpeed = this.baseSpeed * (1 - slowPercent);

    // Tint enemy blue
    this.sprite.setTint(0x4488ff);

    // Visual indicator
    const slowVisual = this.scene.add.circle(
      this.sprite.x, this.sprite.y,
      ENEMY_RADIUS + 4, 0x44ccff, 0.15
    );
    slowVisual.setDepth(8);

    // Remove slow after duration
    const slowTimer = this.scene.time.delayedCall(duration * 1000, () => {
      this.currentSpeed = this.baseSpeed;
      if (this.sprite.active) this.sprite.clearTint();
      if (slowVisual) slowVisual.destroy();
      this.activeSlow = null;
    });

    this.activeSlow = {
      slowPercent,
      remainingTime: duration,
      timer: slowTimer,
      visual: slowVisual,
    };
  }

  // ── Death ─────────────────────────────────────────────────────────────────

  private die(): void {
    this.alive = false;

    // Clean up status effects
    if (this.activeBurn) {
      this.activeBurn.timer.destroy();
      if (this.activeBurn.visual) this.activeBurn.visual.destroy();
      this.activeBurn = null;
    }
    if (this.activeSlow) {
      this.activeSlow.timer.destroy();
      if (this.activeSlow.visual) this.activeSlow.visual.destroy();
      this.activeSlow = null;
    }

    this.scene.tweens.add({
      targets: [this.sprite, this.hpBarBg, this.hpBarFill],
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      },
    });

    this.scene.events.emit('enemy-died', this);
  }

  destroy(): void {
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
  }
}