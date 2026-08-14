// src/scenes/GameScene.ts

import Phaser from 'phaser';
import { Player, CastResult } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CombatSystem } from '../systems/CombatSystem';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellCaster } from '../systems/SpellCaster';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { Spell } from '../systems/SpellBuilder';
import { ENEMY_RADIUS } from '../config/constants';
import {
  ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS, ENEMY_COUNT, GRIMOIRE_SLOW_FACTOR,
} from '../config/constants';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private combatSystem!: CombatSystem;
  private grimoireSystem!: GrimoireSystem;
  private statusEffectSystem!: StatusEffectSystem;
  private gameOver = false;
  private grimoireOpen = false;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;
  private devTestKey!: Phaser.Input.Keyboard.Key;
  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;

  constructor() { super({ key: 'GameScene' }); }

  create(): void {
    this.gameOver = false;
    this.grimoireOpen = false;
    this.enemies = [];
    this.projectiles = [];

    this.grimoireSystem = new GrimoireSystem();
    this.statusEffectSystem = new StatusEffectSystem(this);

    this.createRoom();
    this.createPlayer();
    this.createEnemies();
    this.setupCombat();
    this.setupInput();
    this.createGameOverUI();
    this.createFeedbackText();

    if (!this.scene.isActive('HUDScene')) {
      this.scene.launch('HUDScene', { player: this.player });
    } else {
      this.scene.get('HUDScene').events.emit('set-player', this.player);
    }

    this.events.on('player-died', this.onPlayerDied, this);
    this.events.on('enemy-died', this.onEnemyDied, this);
    this.events.on('spell-prepared', this.onSpellPrepared, this);
    this.events.on('grimoire-closed', this.onGrimoireClosed, this);
    this.events.on('projectile-created', (proj: Projectile) => {
      this.projectiles.push(proj);
    });

    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
  }

  private createRoom(): void {
    this.add.sprite(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 'floor').setDepth(0);
    this.add.sprite(ROOM_WIDTH / 2, WALL_THICKNESS / 2, 'wall-h').setDepth(5);
    this.add.sprite(ROOM_WIDTH / 2, ROOM_HEIGHT - WALL_THICKNESS / 2, 'wall-h').setDepth(5);
    this.add.sprite(WALL_THICKNESS / 2, ROOM_HEIGHT / 2, 'wall-v').setDepth(5);
    this.add.sprite(ROOM_WIDTH - WALL_THICKNESS / 2, ROOM_HEIGHT / 2, 'wall-v').setDepth(5);
    const decs = [
      { x: 150, y: 150 }, { x: ROOM_WIDTH - 150, y: 150 },
      { x: 150, y: ROOM_HEIGHT - 150 }, { x: ROOM_WIDTH - 150, y: ROOM_HEIGHT - 150 },
      { x: ROOM_WIDTH / 2, y: 200 }, { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 200 },
    ];
    for (const d of decs) this.add.sprite(d.x, d.y, 'decoration').setDepth(1).setAlpha(0.5);
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(WALL_THICKNESS + 20, ROOM_WIDTH - WALL_THICKNESS - 20);
      const y = Phaser.Math.Between(WALL_THICKNESS + 20, ROOM_HEIGHT - WALL_THICKNESS - 20);
      const dot = this.add.circle(x, y, 1.5, 0x6666aa, 0.3).setDepth(2);
      this.tweens.add({
        targets: dot, x: x + Phaser.Math.Between(-30, 30), y: y + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.1, to: 0.4 }, duration: Phaser.Math.Between(3000, 6000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
  }

  private createEnemies(): void {
    const spawns = [
      { x: 150, y: 150 }, { x: ROOM_WIDTH - 150, y: 150 },
      { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 150 }, { x: ROOM_WIDTH / 2, y: 200 },
    ];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const pos = spawns[i % spawns.length];
      const enemy = new Enemy(this, pos.x, pos.y);
      enemy.setTarget(this.player.sprite);
      this.enemies.push(enemy);
    }
  }

  private setupCombat(): void {
    this.combatSystem = new CombatSystem(
      this, this.player, this.enemies, this.projectiles, this.statusEffectSystem,
    );
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.gameOver && !this.grimoireOpen)
        this.handleLeftClick(pointer);
    });
    if (this.input.keyboard) {
      this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      this.input.keyboard.addCapture('TAB');
      this.devTestKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F12);
    }
  }

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    if (this.player.hasPreparedSpell()) {
      this.handleSpellCast(pointer);
    } else {
      this.fireBasicAttack();
    }
  }

  private handleSpellCast(pointer: Phaser.Input.Pointer): void {
    const spell = this.player.preparedSpell!;
    if (spell.targetingType === 'melee' || spell.targetingType === 'placement') {
      const result = this.player.canCastPreparedSpell();
      if (result === CastResult.SUCCESS) this.executePreparedSpell(pointer.worldX, pointer.worldY);
      else this.showCastError(result);
      return;
    }
    const enemy = this.findEnemyAtPoint(pointer.worldX, pointer.worldY);
    const result = this.player.canCastPreparedSpell();
    if (result === CastResult.SUCCESS) {
      this.executePreparedSpell(enemy ? enemy.sprite.x : pointer.worldX, enemy ? enemy.sprite.y : pointer.worldY);
    } else {
      this.showCastError(result);
    }
  }

  private showCastError(result: CastResult): void {
    switch (result) {
      case CastResult.NOT_ENOUGH_MANA: this.showFeedback('Not Enough Mana', '#ff4444'); break;
      case CastResult.ON_COOLDOWN: this.showFeedback('On Cooldown', '#ffaa00'); break;
    }
  }

  private findEnemyAtPoint(x: number, y: number): Enemy | null {
    const radius = ENEMY_RADIUS + 30;
    let closest: Enemy | null = null;
    let closestDist = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(x, y, e.sprite.x, e.sprite.y);
      if (d < radius && d < closestDist) { closestDist = d; closest = e; }
    }
    return closest;
  }

  private executePreparedSpell(targetX: number, targetY: number): void {
    const spell = this.player.consumePreparedSpell();
    SpellCaster.cast({
      scene: this, spell, player: this.player,
      targetX, targetY,
      enemies: this.enemies, projectiles: this.projectiles,
      statusEffects: this.statusEffectSystem,
    });
    const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
    this.showFeedback(spell.name + '!', hex);
    this.events.emit('spell-cast');
  }

  private fireBasicAttack(): void {
    if (!this.player.canBasicAttack()) return;
    this.player.doBasicAttack();
    const angle = this.player.getAimAngle();
    const d = 24;
    const proj = new Projectile(this, {
      x: this.player.sprite.x + Math.cos(angle) * d,
      y: this.player.sprite.y + Math.sin(angle) * d,
      angle, spell: null,
    });
    this.projectiles.push(proj);
  }

  private createFeedbackText(): void {
    this.feedbackText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 + 60, '', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
  }

  private showFeedback(msg: string, color: string): void {
    if (this.feedbackTimer) { this.feedbackTimer.destroy(); this.feedbackTimer = null; }
    this.feedbackText.setPosition(this.player.sprite.x, this.player.sprite.y - 40)
      .setText(msg).setColor(color).setAlpha(1);
    this.tweens.add({ targets: this.feedbackText, y: this.feedbackText.y - 20, alpha: 0, duration: 1200, ease: 'Power2' });
    this.feedbackTimer = this.time.delayedCall(1500, () => { this.feedbackText.setAlpha(0); });
  }

  private openGrimoire(): void {
    if (this.grimoireOpen || this.gameOver) return;
    this.grimoireOpen = true;
    this.time.timeScale = GRIMOIRE_SLOW_FACTOR;
    this.physics.world.timeScale = 1 / GRIMOIRE_SLOW_FACTOR;
    this.player.sprite.setVelocity(0, 0);
    this.scene.launch('GrimoireScene', { grimoireSystem: this.grimoireSystem });
    this.scene.bringToTop('GrimoireScene');
  }

  private closeGrimoire(): void {
    if (!this.grimoireOpen) return;
    this.grimoireOpen = false;
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
  }

  private onSpellPrepared(spell: Spell): void {
    this.player.preparedSpell = spell;
    const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
    this.showFeedback(spell.name + ' Prepared', hex);
  }

  private onGrimoireClosed(): void { this.closeGrimoire(); }

  private onPlayerDied(): void {
    this.gameOver = true;
    this.gameOverText.setText('YOU DIED\n\nPress R to restart').setAlpha(1);
    for (const e of this.enemies) { if (e.alive) e.sprite.setVelocity(0, 0); }
    if (this.grimoireOpen) { this.scene.stop('GrimoireScene'); this.closeGrimoire(); }
  }

  private onEnemyDied(enemy: Enemy): void {
    this.statusEffectSystem.removeAllEffects(enemy);
    const i = this.enemies.indexOf(enemy);
    if (i !== -1) this.enemies.splice(i, 1);
    if (this.enemies.length === 0 && !this.gameOver) {
      this.time.delayedCall(2000, () => {
        if (!this.gameOver) {
          this.createEnemies();
          this.combatSystem = new CombatSystem(
            this, this.player, this.enemies, this.projectiles, this.statusEffectSystem,
          );
        }
      });
    }
  }

  private createGameOverUI(): void {
    this.gameOverText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, '', {
      fontFamily: '"Courier New", monospace', fontSize: '32px', color: '#cc3333',
      align: 'center', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
  }

  update(): void {
    // Dev test mode
    if (this.devTestKey && Phaser.Input.Keyboard.JustDown(this.devTestKey)) {
      this.scene.pause('GameScene');
      this.scene.launch('DevTestScene');
      return;
    }

    if (this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      if (!this.gameOver) {
        if (this.grimoireOpen) { this.scene.stop('GrimoireScene'); this.closeGrimoire(); }
        else { this.openGrimoire(); }
      }
    }
    if (this.gameOver) { if (this.restartKey?.isDown) this.restartGame(); return; }
    if (!this.grimoireOpen) { this.player.update(); }
    else { this.player.sprite.setVelocity(0, 0); }
    for (const e of this.enemies) e.update();
    for (const p of this.projectiles) p.update();
    this.combatSystem.update();
    this.combatSystem.cleanupProjectiles();
    this.statusEffectSystem.update();
    this.events.emit('update-hud');
  }

  private restartGame(): void {
    this.events.off('player-died', this.onPlayerDied, this);
    this.events.off('enemy-died', this.onEnemyDied, this);
    this.events.off('spell-prepared', this.onSpellPrepared, this);
    this.events.off('grimoire-closed', this.onGrimoireClosed, this);
    this.statusEffectSystem.clearAll();
    if (this.scene.isActive('GrimoireScene')) this.scene.stop('GrimoireScene');
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
    this.scene.restart();
  }
}