import Phaser from 'phaser';
import { ENEMY_MAX_HP, ENEMY_SPEED, ENEMY_RADIUS, PLAYER_RADIUS } from '../config/constants';
import { Spell } from '../systems/SpellBuilder';
import { CombatFX, getSpellTier } from '../visuals/CombatFX';

export interface DamageSource { castId: number; }

export interface EnemySeparationConfig {
  /** Radius within which enemies repel each other. */
  separationRadius: number;
  /** Strength of enemy-enemy repulsion (pixels/sec contribution). */
  separationStrength: number;
  /** Minimum distance enemies maintain from the player sprite. */
  playerKeepDistance: number;
  /** Contact damage cooldown in ms. */
  contactCooldownMs: number;
}

const DEFAULT_SEP: EnemySeparationConfig = {
  separationRadius: 40,
  separationStrength: 120,
  playerKeepDistance: 26,
  contactCooldownMs: 1000,
};

export class Enemy {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hp: number = ENEMY_MAX_HP;
  public maxHp: number = ENEMY_MAX_HP;
  public alive: boolean = true;
  public lastContactDamageTime: number = 0;

  public isFrozen: boolean = false;
  public isBound: boolean = false;
  public isStunned: boolean = false;
  public bindAnchorX: number = 0;
  public bindAnchorY: number = 0;
  public bindRadius: number = 30;

  /** Configurable separation — can be overridden for elites/bosses. */
  public separation: EnemySeparationConfig = { ...DEFAULT_SEP };

  private lastHitSpell: Spell | null = null;
  private lastHitSourceX: number = 0;
  private lastHitSourceY: number = 0;

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
    this.sprite.setCircle(ENEMY_RADIUS, this.sprite.width / 2 - ENEMY_RADIUS, this.sprite.height / 2 - ENEMY_RADIUS);
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

  setTarget(target: Phaser.Physics.Arcade.Sprite): void { this.targetSprite = target; }

  /**
   * Main update — call with the full enemy array for separation steering.
   * Falls back to solo update if no array provided.
   */
  update(allEnemies?: Enemy[]): void {
    if (!this.alive) return;
    this.moveTowardTarget(allEnemies);
    this.updateHpBar();
  }

  private moveTowardTarget(allEnemies?: Enemy[]): void {
    if (this.isFrozen || this.isStunned) {
      this.sprite.setVelocity(0, 0);
      return;
    }
    if (!this.targetSprite || !this.targetSprite.active) {
      this.sprite.setVelocity(0, 0);
      return;
    }

    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    const ex = this.sprite.x, ey = this.sprite.y;
    const tx = this.targetSprite.x, ty = this.targetSprite.y;

    // ── Bind constraint ───────────────────────────────────────────────
    if (this.isBound) {
      const distFromAnchor = Phaser.Math.Distance.Between(ex, ey, this.bindAnchorX, this.bindAnchorY);
      if (distFromAnchor > this.bindRadius) {
        const angleToAnchor = Phaser.Math.Angle.Between(ex, ey, this.bindAnchorX, this.bindAnchorY);
        this.sprite.setVelocity(Math.cos(angleToAnchor) * currentSpeed, Math.sin(angleToAnchor) * currentSpeed);
        return;
      }
    }

    // ── Chase vector ──────────────────────────────────────────────────
    const distToTarget = Phaser.Math.Distance.Between(ex, ey, tx, ty);
    let chaseX = 0, chaseY = 0;

    if (distToTarget > this.separation.playerKeepDistance) {
      // Chase normally
      const angle = Phaser.Math.Angle.Between(ex, ey, tx, ty);
      chaseX = Math.cos(angle) * currentSpeed;
      chaseY = Math.sin(angle) * currentSpeed;
    } else if (distToTarget > 0) {
      // Within keep-distance — stop advancing but don't flee
      chaseX = 0;
      chaseY = 0;
    }

    // ── Enemy-enemy separation ────────────────────────────────────────
    let sepX = 0, sepY = 0;

    if (allEnemies) {
      const sepRad = this.separation.separationRadius;
      const sepStr = this.separation.separationStrength;

      for (const other of allEnemies) {
        if (other === this || !other.alive) continue;
        const dx = ex - other.sprite.x;
        const dy = ey - other.sprite.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < sepRad && dist > 0.1) {
          // Strength increases as enemies get closer (inverse linear)
          const factor = (sepRad - dist) / sepRad;
          const nx = dx / dist;
          const ny = dy / dist;
          sepX += nx * sepStr * factor;
          sepY += ny * sepStr * factor;
        } else if (dist <= 0.1) {
          // Nearly overlapping — push in random direction to break deadlock
          const randAngle = Math.random() * Math.PI * 2;
          sepX += Math.cos(randAngle) * sepStr * 0.5;
          sepY += Math.sin(randAngle) * sepStr * 0.5;
        }
      }
    }

    // ── Player soft repulsion (prevent deep overlap) ──────────────────
    let playerRepX = 0, playerRepY = 0;
    const playerSoftDist = PLAYER_RADIUS + ENEMY_RADIUS + 4; // visual non-overlap distance

    if (distToTarget < playerSoftDist && distToTarget > 0.1) {
      const factor = (playerSoftDist - distToTarget) / playerSoftDist;
      const nx = (ex - tx) / distToTarget;
      const ny = (ey - ty) / distToTarget;
      playerRepX = nx * 60 * factor;
      playerRepY = ny * 60 * factor;
    }

    // ── Combine and clamp ─────────────────────────────────────────────
    let finalX = chaseX + sepX + playerRepX;
    let finalY = chaseY + sepY + playerRepY;

    // Clamp to max speed so separation can't make enemies fly
    const finalSpeed = Math.sqrt(finalX * finalX + finalY * finalY);
    const maxSpeed = currentSpeed * 1.3; // allow slight burst from separation
    if (finalSpeed > maxSpeed && finalSpeed > 0) {
      finalX = (finalX / finalSpeed) * maxSpeed;
      finalY = (finalY / finalSpeed) * maxSpeed;
    }

    this.sprite.setVelocity(finalX, finalY);
  }

  private updateHpBar(): void {
    const barY = this.sprite.y - ENEMY_RADIUS - 12;
    this.hpBarBg.setPosition(this.sprite.x, barY);
    const hpRatio = this.hp / this.maxHp;
    this.hpBarFill.setScale(hpRatio, 1);
    this.hpBarFill.setPosition(this.sprite.x - (this.maxHpBarWidth * (1 - hpRatio)) / 2, barY);
  }

  canDealContactDamage(now: number): boolean {
    if (this.isFrozen || this.isStunned) return false;
    return now - this.lastContactDamageTime >= this.separation.contactCooldownMs;
  }

  setSpeedMultiplier(multiplier: number): void { this.speedMultiplier = multiplier; }
  getSpeedMultiplier(): number { return this.speedMultiplier; }

  applyKnockback(angle: number, force: number, duration: number): void {
    if (!this.alive || this.isFrozen) return;
    this.sprite.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
    this.isStunned = true;
    this.scene.time.delayedCall(duration * 1000, () => { this.isStunned = false; });
  }

  takeDamage(amount: number, source?: DamageSource, hitInfo?: { spell?: Spell | null; sourceX?: number; sourceY?: number }): void {
    if (!this.alive) return;
    this.hp -= amount;
    this.hpBarBg.setAlpha(0.8);
    this.hpBarFill.setAlpha(1);

    if (hitInfo?.spell !== undefined) this.lastHitSpell = hitInfo.spell;
    if (hitInfo?.sourceX !== undefined) this.lastHitSourceX = hitInfo.sourceX;
    if (hitInfo?.sourceY !== undefined) this.lastHitSourceY = hitInfo.sourceY;

    const spell = hitInfo?.spell ?? this.lastHitSpell;
    const tier = getSpellTier(spell ?? null);
    const color = spell ? spell.visual.color : 0x00d4ff;
    const sx = hitInfo?.sourceX ?? this.lastHitSourceX;
    const sy = hitInfo?.sourceY ?? this.lastHitSourceY;

    CombatFX.onHit(this.scene, this.sprite.x, this.sprite.y, amount, spell ?? null, tier);
    CombatFX.enemyHitReaction(this.scene, this.sprite, sx, sy, tier, color);

    if (this.hp <= 0) { this.hp = 0; this.die(source); }
  }

  private die(source?: DamageSource): void {
    this.alive = false;
    const spell = this.lastHitSpell;
    const tier = getSpellTier(spell);
    CombatFX.onKill(this.scene, this.sprite.x, this.sprite.y, spell, tier);
    this.scene.events.emit('enemy-died', this, source);
    this.scene.tweens.add({
      targets: [this.sprite, this.hpBarBg, this.hpBarFill],
      alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: 250, ease: 'Power2',
      onComplete: () => { this.destroy(); },
    });
  }

  destroy(): void {
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.sprite.destroy();
  }
}
