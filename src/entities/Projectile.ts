// src/entities/Projectile.ts

import Phaser from 'phaser';
import {
  PROJECTILE_SPEED, PROJECTILE_RADIUS, PROJECTILE_LIFETIME,
  BASIC_ATTACK_DAMAGE, WALL_THICKNESS, ROOM_WIDTH, ROOM_HEIGHT,
} from '../config/constants';
import { Spell } from '../systems/SpellBuilder';
import { OrbVisual } from '../config/spellComponents';

export interface ProjectileConfig {
  x: number;
  y: number;
  angle: number;
  spell: Spell | null;
}

export class Projectile {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public damage: number;
  public active: boolean = true;
  public spell: Spell | null;
  public pierceCount: number = 0;
  public maxPierceTargets: number = 0;
  public damageRetainPercent: number = 1;
  public hitEnemies: Set<string> = new Set();

  private scene: Phaser.Scene;
  private lifetime: Phaser.Time.TimerEvent;
  private trail: Phaser.GameObjects.Circle[] = [];
  private trailTimer: Phaser.Time.TimerEvent | null = null;
  private damageAura: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config: ProjectileConfig) {
    this.scene = scene;
    this.spell = config.spell;

    // Get speed from form visual config or use default
    let speed = PROJECTILE_SPEED;
    let radius = PROJECTILE_RADIUS;
    let lifetime = PROJECTILE_LIFETIME;

    if (config.spell) {
      this.damage = config.spell.damage;

      if (config.spell.form.id === 'ORB') {
        const ov = config.spell.form.formVisual as OrbVisual;
        speed = ov.speed;
        radius = ov.radius;
        lifetime = ov.lifetime;
      }

      // Prefix behaviors
      if (config.spell.prefix?.behavior.type === 'greater') {
        radius *= config.spell.prefix.behavior.sizeMultiplier;
      }
      if (config.spell.prefix?.behavior.type === 'expanding') {
        radius *= config.spell.prefix.behavior.startScale;
      }
      if (config.spell.prefix?.behavior.type === 'piercing') {
        this.maxPierceTargets = config.spell.prefix.behavior.maxPierceTargets;
        this.damageRetainPercent = config.spell.prefix.behavior.damageRetainPercent;
      }
    } else {
      this.damage = BASIC_ATTACK_DAMAGE;
    }

    this.sprite = scene.physics.add.sprite(config.x, config.y, 'projectile');
    this.sprite.setCircle(radius, this.sprite.width / 2 - radius, this.sprite.height / 2 - radius);

    const displayScale = radius / PROJECTILE_RADIUS;
    if (displayScale !== 1) this.sprite.setScale(displayScale);

    this.sprite.setDepth(8);
    this.sprite.setData('owner', this);

    if (config.spell) {
      this.sprite.setTint(config.spell.visual.color);
    }

    this.sprite.setVelocity(
      Math.cos(config.angle) * speed,
      Math.sin(config.angle) * speed
    );
    this.sprite.setRotation(config.angle);

    this.lifetime = scene.time.delayedCall(lifetime, () => { this.destroy(); });

    if (config.spell) {
      this.startTrail(config.spell.visual.trailColor);
    }

    // Orb damage aura
    if (config.spell?.form.id === 'ORB') {
      this.setupOrbAura(config.spell);
    }

    // Expanding prefix
    if (config.spell?.prefix?.behavior.type === 'expanding') {
      const expandBehavior = config.spell.prefix.behavior;
      scene.tweens.add({
        targets: this.sprite,
        scaleX: expandBehavior.endScale * displayScale,
        scaleY: expandBehavior.endScale * displayScale,
        duration: lifetime * 0.8,
        ease: 'Linear',
      });
    }

    // Homing prefix
    if (config.spell?.prefix?.behavior.type === 'homing') {
      this.setupHoming(config.spell);
    }

    // Splitting prefix
    if (config.spell?.prefix?.behavior.type === 'splitting') {
      this.setupSplitting(config.spell, config.angle, lifetime);
    }

    // Returning prefix
    if (config.spell?.prefix?.behavior.type === 'returning') {
      this.setupReturning(config.spell, config.x, config.y, speed, lifetime);
    }
  }

  private setupOrbAura(spell: Spell): void {
    const ov = spell.form.formVisual as OrbVisual;
    // Damage nearby enemies periodically
    this.damageAura = this.scene.time.addEvent({
      delay: ov.damageTickInterval,
      loop: true,
      callback: () => {
        if (!this.active) return;
        // We don't have direct access to enemies here,
        // so the aura damage is handled by CombatSystem checking proximity
      },
    });
  }

  private setupHoming(spell: Spell): void {
    if (spell.prefix?.behavior.type !== 'homing') return;
    const homingBehavior = spell.prefix.behavior;

    this.scene.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!this.active || !this.sprite.active) return;

        // Find nearest enemy
        const enemies = this.scene.children.list.filter(
          (child): child is Phaser.Physics.Arcade.Sprite =>
            child instanceof Phaser.Physics.Arcade.Sprite &&
            child.getData('owner') instanceof Object &&
            child !== this.sprite &&
            child.texture.key === 'enemy'
        );

        let closest: Phaser.Physics.Arcade.Sprite | null = null;
        let closestDist = Infinity;

        for (const e of enemies) {
          const d = Phaser.Math.Distance.Between(
            this.sprite.x, this.sprite.y, e.x, e.y
          );
          if (d < homingBehavior.trackingRange && d < closestDist) {
            closestDist = d;
            closest = e;
          }
        }

        if (closest) {
          const targetAngle = Phaser.Math.Angle.Between(
            this.sprite.x, this.sprite.y, closest.x, closest.y
          );
          const currentAngle = Math.atan2(
            this.sprite.body!.velocity.y,
            this.sprite.body!.velocity.x
          );
          let angleDiff = targetAngle - currentAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          const turnAmount = Phaser.Math.Clamp(
            angleDiff, -homingBehavior.turnRate * 0.05, homingBehavior.turnRate * 0.05
          );
          const newAngle = currentAngle + turnAmount;
          const speed = Math.sqrt(
            this.sprite.body!.velocity.x ** 2 + this.sprite.body!.velocity.y ** 2
          );
          this.sprite.setVelocity(
            Math.cos(newAngle) * speed,
            Math.sin(newAngle) * speed
          );
        }
      },
    });
  }

  private setupSplitting(spell: Spell, originalAngle: number, lifetime: number): void {
    if (spell.prefix?.behavior.type !== 'splitting') return;
    const splitBehavior = spell.prefix.behavior;

    this.scene.time.delayedCall(lifetime * splitBehavior.splitAtPercent, () => {
      if (!this.active) return;

      const baseAngle = Math.atan2(
        this.sprite.body!.velocity.y, this.sprite.body!.velocity.x
      );
      const spreadRad = Phaser.Math.DegToRad(splitBehavior.splitAngleSpread);

      for (let i = 0; i < splitBehavior.splitCount; i++) {
        const fraction = splitBehavior.splitCount === 1 ? 0 :
          (i / (splitBehavior.splitCount - 1)) - 0.5;
        const splitAngle = baseAngle + fraction * spreadRad * 2;

        const splitSpell: Spell = {
          ...spell,
          damage: Math.round(spell.damage * splitBehavior.splitDamagePercent),
          prefix: null, // Don't split again
        };

        const proj = new Projectile(this.scene, {
          x: this.sprite.x, y: this.sprite.y,
          angle: splitAngle, spell: splitSpell,
        });

        // Add to game's projectile array via event
        this.scene.events.emit('projectile-created', proj);
      }

      this.destroy();
    });
  }

  private setupReturning(spell: Spell, startX: number, startY: number, speed: number, lifetime: number): void {
    if (spell.prefix?.behavior.type !== 'returning') return;
    const returnBehavior = spell.prefix.behavior;

    this.scene.time.delayedCall(lifetime * 0.5, () => {
      if (!this.active) return;

      // Reverse direction back toward start
      const returnAngle = Phaser.Math.Angle.Between(
        this.sprite.x, this.sprite.y, startX, startY
      );
      this.sprite.setVelocity(
        Math.cos(returnAngle) * returnBehavior.returnSpeed,
        Math.sin(returnAngle) * returnBehavior.returnSpeed
      );
      this.damage = Math.round(this.damage * returnBehavior.returnDamagePercent);
    });
  }

  private startTrail(color: number): void {
    this.trailTimer = this.scene.time.addEvent({
      delay: 40, loop: true,
      callback: () => {
        if (!this.active || !this.sprite.active) return;
        const dot = this.scene.add.circle(
          this.sprite.x, this.sprite.y, 3, color, 0.6
        ).setDepth(7);
        this.trail.push(dot);
        this.scene.tweens.add({
          targets: dot, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 200,
          onComplete: () => {
            dot.destroy();
            const idx = this.trail.indexOf(dot);
            if (idx !== -1) this.trail.splice(idx, 1);
          },
        });
      },
    });
  }

  update(): void {
    if (!this.active) return;
    if (
      this.sprite.x < WALL_THICKNESS || this.sprite.x > ROOM_WIDTH - WALL_THICKNESS ||
      this.sprite.y < WALL_THICKNESS || this.sprite.y > ROOM_HEIGHT - WALL_THICKNESS
    ) {
      this.destroy();
    }
  }

  destroy(): void {
    if (!this.active) return;
    this.active = false;
    if (this.trailTimer) this.trailTimer.destroy();
    if (this.damageAura) this.damageAura.destroy();
    for (const dot of this.trail) dot.destroy();
    this.trail = [];
    if (this.sprite.active) {
      this.scene.tweens.add({
        targets: this.sprite, alpha: 0, scaleX: 2, scaleY: 2, duration: 100,
        onComplete: () => { this.lifetime.destroy(); this.sprite.destroy(); },
      });
    }
  }
}