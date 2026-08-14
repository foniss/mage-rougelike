// src/entities/Projectile.ts

import Phaser from 'phaser';
import {
  PROJECTILE_SPEED,
  PROJECTILE_RADIUS,
  PROJECTILE_LIFETIME,
  BASIC_ATTACK_DAMAGE,
  WALL_THICKNESS,
  ROOM_WIDTH,
  ROOM_HEIGHT,
} from '../config/constants';
import { SpellDefinition } from '../config/spells';

export interface ProjectileConfig {
  x: number;
  y: number;
  angle: number;
  spell: SpellDefinition | null;
}

export class Projectile {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public damage: number;
  public active: boolean = true;
  public spell: SpellDefinition | null;

  private scene: Phaser.Scene;
  private lifetime: Phaser.Time.TimerEvent;
  private trail: Phaser.GameObjects.Circle[] = [];
  private trailTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config: ProjectileConfig) {
    this.scene = scene;
    this.spell = config.spell;

    const damage = config.spell ? config.spell.damage : BASIC_ATTACK_DAMAGE;
    const speed  = config.spell ? 450 : PROJECTILE_SPEED;
    this.damage  = damage;

    this.sprite = scene.physics.add.sprite(config.x, config.y, 'projectile');
    this.sprite.setCircle(
      PROJECTILE_RADIUS,
      this.sprite.width / 2 - PROJECTILE_RADIUS,
      this.sprite.height / 2 - PROJECTILE_RADIUS
    );
    this.sprite.setDepth(8);
    this.sprite.setData('owner', this);

    if (config.spell) {
      this.sprite.setTint(config.spell.color);
    }

    this.sprite.setVelocity(
      Math.cos(config.angle) * speed,
      Math.sin(config.angle) * speed
    );
    this.sprite.setRotation(config.angle);

    this.lifetime = scene.time.delayedCall(PROJECTILE_LIFETIME, () => {
      this.destroy();
    });

    if (config.spell) {
      this.startTrail(config.spell.trailColor);
    }
  }

  private startTrail(color: number): void {
    this.trailTimer = this.scene.time.addEvent({
      delay: 40,
      callback: () => {
        if (!this.active || !this.sprite.active) return;

        const dot = this.scene.add.circle(
          this.sprite.x, this.sprite.y,
          3, color, 0.6
        );
        dot.setDepth(7);
        this.trail.push(dot);

        this.scene.tweens.add({
          targets: dot,
          alpha: 0,
          scaleX: 0.1,
          scaleY: 0.1,
          duration: 200,
          onComplete: () => {
            dot.destroy();
            const idx = this.trail.indexOf(dot);
            if (idx !== -1) this.trail.splice(idx, 1);
          },
        });
      },
      loop: true,
    });
  }

  update(): void {
    if (!this.active) return;

    if (
      this.sprite.x < WALL_THICKNESS ||
      this.sprite.x > ROOM_WIDTH  - WALL_THICKNESS ||
      this.sprite.y < WALL_THICKNESS ||
      this.sprite.y > ROOM_HEIGHT - WALL_THICKNESS
    ) {
      this.destroy();
    }
  }

  destroy(): void {
    if (!this.active) return;
    this.active = false;

    if (this.trailTimer) this.trailTimer.destroy();
    for (const dot of this.trail) dot.destroy();
    this.trail = [];

    if (this.sprite.active) {
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 100,
        onComplete: () => {
          this.lifetime.destroy();
          this.sprite.destroy();
        },
      });
    }
  }
}