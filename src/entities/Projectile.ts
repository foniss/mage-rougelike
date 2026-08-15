// src/entities/Projectile.ts

import Phaser from 'phaser';
import {
  PROJECTILE_SPEED, PROJECTILE_RADIUS, PROJECTILE_LIFETIME,
  BASIC_ATTACK_DAMAGE, WALL_THICKNESS, ROOM_WIDTH, ROOM_HEIGHT,
} from '../config/constants';
import { Spell } from '../systems/SpellBuilder';
import { OrbVisual } from '../config/spellComponents';
import { OrbVisuals, OrbVisualAttachment } from '../visuals/OrbVisuals';
import { PrefixVisuals } from '../visuals/PrefixVisuals';

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
  public isReturning: boolean = false;

  private scene: Phaser.Scene;
  private lifetime: Phaser.Time.TimerEvent;
  private trail: Phaser.GameObjects.Arc[] = [];
  private trailTimer: Phaser.Time.TimerEvent | null = null;
  private damageAura: Phaser.Time.TimerEvent | null = null;
  private orbVisual: OrbVisualAttachment | null = null;
  private isOrb: boolean = false;
  private greaterAura: Phaser.GameObjects.Arc | null = null;
  private expandingTrailTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, config: ProjectileConfig) {
    this.scene = scene;
    this.spell = config.spell;

    let speed = PROJECTILE_SPEED;
    let radius = PROJECTILE_RADIUS;
    let lifetime = PROJECTILE_LIFETIME;

    if (config.spell) {
      this.damage = config.spell.damage;

      if (config.spell.form.id === 'ORB') {
        this.isOrb = true;
        const ov = config.spell.form.formVisual as OrbVisual;
        speed = ov.speed;
        radius = ov.radius;
        lifetime = ov.lifetime;
      }

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

    if (this.isOrb && config.spell) {
      this.sprite.setAlpha(0);
      const sizeMult = config.spell.prefix?.behavior.type === 'greater'
        ? config.spell.prefix.behavior.sizeMultiplier : 1;

      this.orbVisual = OrbVisuals.attach(
        scene, this.sprite, config.spell.visual,
        (config.spell.form.formVisual as OrbVisual).radius, sizeMult,
        config.spell.core.id,
      );

      // Greater aura for orb
      if (config.spell.prefix?.behavior.type === 'greater') {
        this.greaterAura = PrefixVisuals.renderGreaterOrbAura(
          scene, config.x, config.y, config.spell.visual,
          (config.spell.form.formVisual as OrbVisual).radius * sizeMult,
        );
      }
    } else if (config.spell) {
      this.sprite.setTint(config.spell.visual.color);
    }

    this.sprite.setVelocity(
      Math.cos(config.angle) * speed,
      Math.sin(config.angle) * speed
    );
    this.sprite.setRotation(config.angle);

    this.lifetime = scene.time.delayedCall(lifetime, () => { this.destroy(); });

    if (config.spell && !this.isOrb) {
      this.startTrail(config.spell.visual.trailColor);
    }

    // ── Prefix behaviors ──────────────────────────────────────────────────

    if (config.spell?.prefix?.behavior.type === 'expanding') {
      const expandBehavior = config.spell.prefix.behavior;
      scene.tweens.add({
        targets: this.sprite,
        scaleX: expandBehavior.endScale * displayScale,
        scaleY: expandBehavior.endScale * displayScale,
        duration: lifetime * 0.8,
        ease: 'Linear',
      });
      // Expanding particles
      this.expandingTrailTimer = scene.time.addEvent({
        delay: 80, loop: true,
        callback: () => {
          if (!this.active || !this.sprite.active || !this.spell) return;
          PrefixVisuals.renderExpandingParticle(
            scene, this.sprite.x, this.sprite.y,
            this.sprite.scaleX, this.spell.visual,
          );
        },
      });
    }

    if (config.spell?.prefix?.behavior.type === 'homing') {
      this.setupHoming(config.spell);
    }

    if (config.spell?.prefix?.behavior.type === 'splitting') {
      this.setupSplitting(config.spell, config.angle, lifetime);
    }

    if (config.spell?.prefix?.behavior.type === 'returning') {
      this.setupReturning(config.spell, config.x, config.y, speed, lifetime);
    }

    // Piercing trail
    if (config.spell?.prefix?.behavior.type === 'piercing') {
      this.startPiercingTrail(config.spell);
    }
  }

  // ── Homing with visual feedback ─────────────────────────────────────────

  private setupHoming(spell: Spell): void {
    if (spell.prefix?.behavior.type !== 'homing') return;
    const hb = spell.prefix.behavior;
    let indicatorCounter = 0;

    this.scene.time.addEvent({
      delay: 50, loop: true,
      callback: () => {
        if (!this.active || !this.sprite.active) return;
        const enemies = this.scene.children.list.filter(
          (c): c is Phaser.Physics.Arcade.Sprite =>
            c instanceof Phaser.Physics.Arcade.Sprite && c.texture.key === 'enemy'
        );
        let closest: Phaser.Physics.Arcade.Sprite | null = null;
        let closestDist = Infinity;
        for (const e of enemies) {
          const d = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, e.x, e.y);
          if (d < hb.trackingRange && d < closestDist) { closestDist = d; closest = e; }
        }
        if (closest) {
          const ta = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, closest.x, closest.y);
          const ca = Math.atan2(this.sprite.body!.velocity.y, this.sprite.body!.velocity.x);
          let diff = ta - ca;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = Phaser.Math.Clamp(diff, -hb.turnRate * 0.05, hb.turnRate * 0.05);
          const na = ca + turn;
          const sp = Math.sqrt(this.sprite.body!.velocity.x ** 2 + this.sprite.body!.velocity.y ** 2);
          this.sprite.setVelocity(Math.cos(na) * sp, Math.sin(na) * sp);

          // Visual: homing indicator every 4th frame
          indicatorCounter++;
          if (indicatorCounter % 4 === 0 && spell) {
            PrefixVisuals.renderHomingIndicator(
              this.scene, this.sprite.x, this.sprite.y,
              closest.x, closest.y, spell.visual,
            );
          }

          // Visual: curved trail
          PrefixVisuals.renderHomingTrail(this.scene, this.sprite.x, this.sprite.y, spell.visual);
        }
      },
    });
  }

  // ── Splitting with visual feedback ──────────────────────────────────────

  private setupSplitting(spell: Spell, _angle: number, lifetime: number): void {
    if (spell.prefix?.behavior.type !== 'splitting') return;
    const sb = spell.prefix.behavior;

    this.scene.time.delayedCall(lifetime * sb.splitAtPercent, () => {
      if (!this.active) return;
      const ba = Math.atan2(this.sprite.body!.velocity.y, this.sprite.body!.velocity.x);
      const spread = Phaser.Math.DegToRad(sb.splitAngleSpread);

      // Visual: split moment
      PrefixVisuals.renderSplitMoment(
        this.scene, this.sprite.x, this.sprite.y,
        spell.visual, sb.splitCount, ba, sb.splitAngleSpread,
      );

      for (let i = 0; i < sb.splitCount; i++) {
        const f = sb.splitCount === 1 ? 0 : (i / (sb.splitCount - 1)) - 0.5;
        const sa = ba + f * spread * 2;
        const ss: Spell = {
          ...spell,
          damage: Math.round(spell.damage * sb.splitDamagePercent),
          prefix: null,
        };
        const p = new Projectile(this.scene, {
          x: this.sprite.x, y: this.sprite.y, angle: sa, spell: ss,
        });
        this.scene.events.emit('projectile-created', p);
      }
      this.destroy();
    });
  }

  // ── Returning with visual feedback ──────────────────────────────────────

  private setupReturning(spell: Spell, sx: number, sy: number, speed: number, lifetime: number): void {
    if (spell.prefix?.behavior.type !== 'returning') return;
    const rb = spell.prefix.behavior;

    this.scene.time.delayedCall(lifetime * 0.5, () => {
      if (!this.active) return;
      this.isReturning = true;
      const ra = Phaser.Math.Angle.Between(this.sprite.x, this.sprite.y, sx, sy);
      this.sprite.setVelocity(Math.cos(ra) * rb.returnSpeed, Math.sin(ra) * rb.returnSpeed);
      this.damage = Math.round(this.damage * rb.returnDamagePercent);

      // Visual: return moment
      PrefixVisuals.renderReturnMoment(
        this.scene, this.sprite.x, this.sprite.y,
        spell.visual, ra,
      );
    });
  }

  // ── Piercing trail ──────────────────────────────────────────────────────

  private startPiercingTrail(spell: Spell): void {
    // Replace the standard trail with a piercing-specific one
    if (this.trailTimer) {
      this.trailTimer.destroy();
      this.trailTimer = null;
    }

    this.trailTimer = this.scene.time.addEvent({
      delay: 35, loop: true,
      callback: () => {
        if (!this.active || !this.sprite.active || !spell) return;
        PrefixVisuals.renderPiercingTrail(
          this.scene, this.sprite.x, this.sprite.y,
          this.sprite.body?.velocity.x || 0,
          this.sprite.body?.velocity.y || 0,
          spell.visual,
        );
      },
    });
  }

  // ── Standard trail ──────────────────────────────────────────────────────

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
            const i = this.trail.indexOf(dot);
            if (i !== -1) this.trail.splice(i, 1);
          },
        });
      },
    });
  }

  update(): void {
    if (!this.active) return;

    if (this.orbVisual) this.orbVisual.update();
    if (this.greaterAura && this.sprite.active) {
      this.greaterAura.setPosition(this.sprite.x, this.sprite.y);
    }

    // Return trail particles
    if (this.isReturning && this.spell && this.sprite.active) {
      if (Math.random() > 0.5) {
        PrefixVisuals.renderReturnTrail(
          this.scene, this.sprite.x, this.sprite.y, this.spell.visual,
        );
      }
    }

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
    if (this.expandingTrailTimer) this.expandingTrailTimer.destroy();
    for (const dot of this.trail) dot.destroy();
    this.trail = [];

    if (this.orbVisual) { this.orbVisual.destroy(); this.orbVisual = null; }
    if (this.greaterAura) { this.greaterAura.destroy(); this.greaterAura = null; }

    if (this.sprite.active) {
      this.scene.tweens.add({
        targets: this.sprite, alpha: 0, scaleX: 2, scaleY: 2, duration: 100,
        onComplete: () => { this.lifetime.destroy(); this.sprite.destroy(); },
      });
    }
  }
}