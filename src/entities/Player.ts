// src/entities/Player.ts

import Phaser from 'phaser';
import {
  PLAYER_MAX_HP,
  PLAYER_MAX_MANA,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  MANA_REGEN_RATE,
  MANA_REGEN_INTERVAL,
  BASIC_ATTACK_MANA_COST,
  BASIC_ATTACK_COOLDOWN,
  SPELL_CAST_COOLDOWN,
  WALL_THICKNESS,
  ROOM_WIDTH,
  ROOM_HEIGHT,
} from '../config/constants';
import { SpellDefinition } from '../config/spells';

export enum CastResult {
  SUCCESS = 'SUCCESS',
  NOT_ENOUGH_MANA = 'NOT_ENOUGH_MANA',
  ON_COOLDOWN = 'ON_COOLDOWN',
  NO_SPELL = 'NO_SPELL',
  DEAD = 'DEAD',
}

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  public hp: number = PLAYER_MAX_HP;
  public maxHp: number = PLAYER_MAX_HP;
  public mana: number = PLAYER_MAX_MANA;
  public maxMana: number = PLAYER_MAX_MANA;
  public alive: boolean = true;

  public preparedSpell: SpellDefinition | null = null;

  private scene: Phaser.Scene;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private directionIndicator: Phaser.GameObjects.Sprite;
  private lastAttackTime: number = 0;
  private lastSpellCastTime: number = 0;
  private manaRegenTimer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCircle(
      PLAYER_RADIUS,
      this.sprite.width / 2 - PLAYER_RADIUS,
      this.sprite.height / 2 - PLAYER_RADIUS
    );
    this.sprite.setDepth(10);
    this.sprite.setData('owner', this);

    this.directionIndicator = scene.add.sprite(x, y, 'direction-indicator');
    this.directionIndicator.setDepth(11);
    this.directionIndicator.setAlpha(0.8);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    this.manaRegenTimer = scene.time.addEvent({
      delay: MANA_REGEN_INTERVAL,
      callback: this.regenMana,
      callbackScope: this,
      loop: true,
    });
  }

  update(): void {
    if (!this.alive) {
      this.sprite.setVelocity(0, 0);
      return;
    }
    this.handleMovement();
    this.handleAiming();
    this.clampToRoom();
  }

  private handleMovement(): void {
    let vx = 0;
    let vy = 0;

    if (this.wasd.A.isDown || this.cursors.left.isDown)  vx = -1;
    if (this.wasd.D.isDown || this.cursors.right.isDown) vx =  1;
    if (this.wasd.W.isDown || this.cursors.up.isDown)    vy = -1;
    if (this.wasd.S.isDown || this.cursors.down.isDown)  vy =  1;

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.sprite.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);
  }

  private handleAiming(): void {
    const pointer = this.scene.input.activePointer;
    const angle = Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      pointer.worldX, pointer.worldY
    );

    const indicatorDist = PLAYER_RADIUS + 8;
    this.directionIndicator.setPosition(
      this.sprite.x + Math.cos(angle) * indicatorDist,
      this.sprite.y + Math.sin(angle) * indicatorDist
    );
    this.directionIndicator.setRotation(angle);
  }

  private clampToRoom(): void {
    const minX = WALL_THICKNESS + PLAYER_RADIUS;
    const maxX = ROOM_WIDTH  - WALL_THICKNESS - PLAYER_RADIUS;
    const minY = WALL_THICKNESS + PLAYER_RADIUS;
    const maxY = ROOM_HEIGHT - WALL_THICKNESS - PLAYER_RADIUS;

    if (this.sprite.x < minX) this.sprite.x = minX;
    if (this.sprite.x > maxX) this.sprite.x = maxX;
    if (this.sprite.y < minY) this.sprite.y = minY;
    if (this.sprite.y > maxY) this.sprite.y = maxY;
  }

  // ── Basic Attack ──────────────────────────────────────────────────────────

  canBasicAttack(): boolean {
    const now = this.scene.time.now;
    return (
      this.alive &&
      this.mana >= BASIC_ATTACK_MANA_COST &&
      now - this.lastAttackTime >= BASIC_ATTACK_COOLDOWN
    );
  }

  doBasicAttack(): void {
    this.mana -= BASIC_ATTACK_MANA_COST;
    this.lastAttackTime = this.scene.time.now;
  }

  // ── Prepared Spell ────────────────────────────────────────────────────────

  canCastPreparedSpell(): CastResult {
    if (!this.alive) return CastResult.DEAD;
    if (!this.preparedSpell) return CastResult.NO_SPELL;

    const now = this.scene.time.now;
    if (now - this.lastSpellCastTime < SPELL_CAST_COOLDOWN) {
      return CastResult.ON_COOLDOWN;
    }

    if (this.mana < this.preparedSpell.manaCost) {
      return CastResult.NOT_ENOUGH_MANA;
    }

    return CastResult.SUCCESS;
  }

  consumePreparedSpell(): SpellDefinition {
    const spell = this.preparedSpell!;
    this.mana -= spell.manaCost;
    this.lastSpellCastTime = this.scene.time.now;
    this.preparedSpell = null;
    return spell;
  }

  hasPreparedSpell(): boolean {
    return this.preparedSpell !== null;
  }

  // ── Damage ────────────────────────────────────────────────────────────────

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp -= amount;

    this.sprite.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    }
  }

  private die(): void {
    this.alive = false;
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(0.4);
    this.directionIndicator.setAlpha(0);
    this.scene.events.emit('player-died');
  }

  private regenMana(): void {
    if (!this.alive) return;
    const amount = (MANA_REGEN_RATE * MANA_REGEN_INTERVAL) / 1000;
    this.mana = Math.min(this.maxMana, this.mana + amount);
  }

  getAimAngle(): number {
    const pointer = this.scene.input.activePointer;
    return Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      pointer.worldX, pointer.worldY
    );
  }

  getAngleToPoint(x: number, y: number): number {
    return Phaser.Math.Angle.Between(
      this.sprite.x, this.sprite.y,
      x, y
    );
  }

  destroy(): void {
    this.manaRegenTimer.destroy();
    this.directionIndicator.destroy();
    this.sprite.destroy();
  }
}