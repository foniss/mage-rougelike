// src/scenes/GameScene.ts

import Phaser from 'phaser';
import { Player, CastResult } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CombatSystem } from '../systems/CombatSystem';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellCaster } from '../systems/SpellCaster';
import { SpellDefinition } from '../config/spells';
import { FormType } from '../config/forms';
import { ENEMY_RADIUS } from '../config/constants';
import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  WALL_THICKNESS,
  ENEMY_COUNT,
  GRIMOIRE_SLOW_FACTOR,
} from '../config/constants';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private combatSystem!: CombatSystem;
  private grimoireSystem!: GrimoireSystem;
  private gameOver: boolean = false;
  private grimoireOpen: boolean = false;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;

  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.gameOver     = false;
    this.grimoireOpen = false;
    this.enemies      = [];
    this.projectiles  = [];

    this.grimoireSystem = new GrimoireSystem();

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

    this.events.on('player-died',     this.onPlayerDied,     this);
    this.events.on('enemy-died',      this.onEnemyDied,      this);
    this.events.on('spell-prepared',  this.onSpellPrepared,  this);
    this.events.on('grimoire-closed', this.onGrimoireClosed, this);

    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
  }

  // ── Room ────────────────────────────────────────────────────────────────

  private createRoom(): void {
    this.add.sprite(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 'floor').setDepth(0);

    this.add.sprite(ROOM_WIDTH / 2,                  WALL_THICKNESS / 2,               'wall-h').setDepth(5);
    this.add.sprite(ROOM_WIDTH / 2,                  ROOM_HEIGHT - WALL_THICKNESS / 2, 'wall-h').setDepth(5);
    this.add.sprite(WALL_THICKNESS / 2,              ROOM_HEIGHT / 2,                  'wall-v').setDepth(5);
    this.add.sprite(ROOM_WIDTH - WALL_THICKNESS / 2, ROOM_HEIGHT / 2,                  'wall-v').setDepth(5);

    const decorPositions = [
      { x: 150,               y: 150 },
      { x: ROOM_WIDTH - 150,  y: 150 },
      { x: 150,               y: ROOM_HEIGHT - 150 },
      { x: ROOM_WIDTH - 150,  y: ROOM_HEIGHT - 150 },
      { x: ROOM_WIDTH / 2,    y: 200 },
      { x: ROOM_WIDTH / 2,    y: ROOM_HEIGHT - 200 },
    ];
    for (const pos of decorPositions) {
      this.add.sprite(pos.x, pos.y, 'decoration').setDepth(1).setAlpha(0.5);
    }

    this.addAmbientParticles();
  }

  private addAmbientParticles(): void {
    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(WALL_THICKNESS + 20, ROOM_WIDTH  - WALL_THICKNESS - 20);
      const y = Phaser.Math.Between(WALL_THICKNESS + 20, ROOM_HEIGHT - WALL_THICKNESS - 20);

      const dot = this.add.circle(x, y, 1.5, 0x6666aa, 0.3);
      dot.setDepth(2);

      this.tweens.add({
        targets: dot,
        x:     x + Phaser.Math.Between(-30, 30),
        y:     y + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.1, to: 0.4 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo:   true,
        repeat: -1,
        ease:   'Sine.easeInOut',
      });
    }
  }

  // ── Entities ─────────────────────────────────────────────────────────────

  private createPlayer(): void {
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
  }

  private createEnemies(): void {
    const spawnPositions = [
      { x: 150,               y: 150 },
      { x: ROOM_WIDTH - 150,  y: 150 },
      { x: ROOM_WIDTH / 2,    y: ROOM_HEIGHT - 150 },
    ];

    for (let i = 0; i < ENEMY_COUNT; i++) {
      const pos = spawnPositions[i % spawnPositions.length];
      const enemy = new Enemy(this, pos.x, pos.y);
      enemy.setTarget(this.player.sprite);
      this.enemies.push(enemy);
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private setupCombat(): void {
    this.combatSystem = new CombatSystem(
      this, this.player, this.enemies, this.projectiles
    );
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.gameOver && !this.grimoireOpen) {
        this.handleLeftClick(pointer);
      }
    });

    if (this.input.keyboard) {
      this.restartKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.R
      );
      this.tabKey = this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.TAB
      );
      this.input.keyboard.addCapture('TAB');
    }
  }

  // ── Click Handling ────────────────────────────────────────────────────────

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    if (this.player.hasPreparedSpell()) {
      this.handleSpellCast(pointer);
    } else {
      this.fireBasicAttack();
    }
  }

  private handleSpellCast(pointer: Phaser.Input.Pointer): void {
    const clickX = pointer.worldX;
    const clickY = pointer.worldY;

    // For Bolt: need to click on an enemy
    // For Nova and Beam: click on an enemy to target
    const targetEnemy = this.findEnemyAtPoint(clickX, clickY);

    if (!targetEnemy) {
      this.showFeedback('No target', '#888888');
      return;
    }

    const result = this.player.canCastPreparedSpell();

    switch (result) {
      case CastResult.SUCCESS:
        this.executePreparedSpell(targetEnemy);
        break;
      case CastResult.NOT_ENOUGH_MANA:
        this.showFeedback('Not Enough Mana', '#ff4444');
        break;
      case CastResult.ON_COOLDOWN:
        this.showFeedback('On Cooldown', '#ffaa00');
        break;
      default:
        break;
    }
  }

  private findEnemyAtPoint(x: number, y: number): Enemy | null {
    const clickRadius = ENEMY_RADIUS + 20;
    let closestEnemy: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      const dist = Phaser.Math.Distance.Between(
        x, y,
        enemy.sprite.x, enemy.sprite.y
      );

      if (dist < clickRadius && dist < closestDist) {
        closestDist = dist;
        closestEnemy = enemy;
      }
    }

    return closestEnemy;
  }

  private executePreparedSpell(targetEnemy: Enemy): void {
    const spell = this.player.consumePreparedSpell();

    SpellCaster.cast({
      scene: this,
      spell,
      playerX: this.player.sprite.x,
      playerY: this.player.sprite.y,
      targetX: targetEnemy.sprite.x,
      targetY: targetEnemy.sprite.y,
      enemies: this.enemies,
      projectiles: this.projectiles,
    });

    const colorHex = '#' + spell.color.toString(16).padStart(6, '0');
    this.showFeedback(spell.name + '!', colorHex);
    this.events.emit('spell-cast');
  }

  private fireBasicAttack(): void {
    if (!this.player.canBasicAttack()) return;
    this.player.doBasicAttack();

    const angle     = this.player.getAimAngle();
    const spawnDist = 24;
    const spawnX    = this.player.sprite.x + Math.cos(angle) * spawnDist;
    const spawnY    = this.player.sprite.y + Math.sin(angle) * spawnDist;

    const projectile = new Projectile(this, {
      x: spawnX,
      y: spawnY,
      angle,
      spell: null,
    });
    this.projectiles.push(projectile);
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  private createFeedbackText(): void {
    this.feedbackText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 + 60, '', {
      fontFamily: '"Courier New", monospace',
      fontSize:   '16px',
      color:      '#ffffff',
      fontStyle:  'bold',
      stroke:     '#000000',
      strokeThickness: 3,
    });
    this.feedbackText.setOrigin(0.5);
    this.feedbackText.setDepth(50);
    this.feedbackText.setAlpha(0);
  }

  private showFeedback(message: string, color: string): void {
    if (this.feedbackTimer) {
      this.feedbackTimer.destroy();
      this.feedbackTimer = null;
    }

    this.feedbackText.setPosition(
      this.player.sprite.x,
      this.player.sprite.y - 40
    );
    this.feedbackText.setText(message);
    this.feedbackText.setColor(color);
    this.feedbackText.setAlpha(1);

    this.tweens.add({
      targets: this.feedbackText,
      y: this.feedbackText.y - 20,
      alpha: 0,
      duration: 1200,
      ease: 'Power2',
    });

    this.feedbackTimer = this.time.delayedCall(1500, () => {
      this.feedbackText.setAlpha(0);
    });
  }

  // ── Grimoire ──────────────────────────────────────────────────────────────

  private openGrimoire(): void {
    if (this.grimoireOpen || this.gameOver) return;
    this.grimoireOpen = true;

    this.time.timeScale = GRIMOIRE_SLOW_FACTOR;
    this.physics.world.timeScale = 1 / GRIMOIRE_SLOW_FACTOR;

    this.player.sprite.setVelocity(0, 0);

    this.scene.launch('GrimoireScene', {
      grimoireSystem: this.grimoireSystem,
    });
    this.scene.bringToTop('GrimoireScene');
  }

  private closeGrimoire(): void {
    if (!this.grimoireOpen) return;
    this.grimoireOpen = false;

    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private onSpellPrepared(spell: SpellDefinition): void {
    this.player.preparedSpell = spell;

    const colorHex = '#' + spell.color.toString(16).padStart(6, '0');
    this.showFeedback(spell.name + ' Prepared', colorHex);
  }

  private onGrimoireClosed(): void {
    this.closeGrimoire();
  }

  private onPlayerDied(): void {
    this.gameOver = true;
    this.gameOverText.setText('YOU DIED\n\nPress R to restart');
    this.gameOverText.setAlpha(1);

    for (const enemy of this.enemies) {
      if (enemy.alive) enemy.sprite.setVelocity(0, 0);
    }

    if (this.grimoireOpen) {
      this.scene.stop('GrimoireScene');
      this.closeGrimoire();
    }
  }

  private onEnemyDied(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) this.enemies.splice(index, 1);

    if (this.enemies.length === 0 && !this.gameOver) {
      this.time.delayedCall(2000, () => {
        if (!this.gameOver) {
          this.createEnemies();
          this.combatSystem = new CombatSystem(
            this, this.player, this.enemies, this.projectiles
          );
        }
      });
    }
  }

  private createGameOverUI(): void {
    this.gameOverText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, '', {
      fontFamily: '"Courier New", monospace',
      fontSize:   '32px',
      color:      '#cc3333',
      align:      'center',
      stroke:     '#000000',
      strokeThickness: 4,
    });
    this.gameOverText.setOrigin(0.5);
    this.gameOverText.setDepth(100);
    this.gameOverText.setAlpha(0);
  }

  // ── Main Loop ─────────────────────────────────────────────────────────────

  update(): void {
    if (this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      if (!this.gameOver) {
        if (this.grimoireOpen) {
          this.scene.stop('GrimoireScene');
          this.closeGrimoire();
        } else {
          this.openGrimoire();
        }
      }
    }

    if (this.gameOver) {
      if (this.restartKey?.isDown) this.restartGame();
      return;
    }

    if (!this.grimoireOpen) {
      this.player.update();
    } else {
      this.player.sprite.setVelocity(0, 0);
    }

    for (const enemy of this.enemies)     enemy.update();
    for (const proj  of this.projectiles) proj.update();

    this.combatSystem.update();
    this.combatSystem.cleanupProjectiles();

    this.events.emit('update-hud');
  }

  private restartGame(): void {
    this.events.off('player-died',     this.onPlayerDied,     this);
    this.events.off('enemy-died',      this.onEnemyDied,      this);
    this.events.off('spell-prepared',  this.onSpellPrepared,  this);
    this.events.off('grimoire-closed', this.onGrimoireClosed, this);

    if (this.scene.isActive('GrimoireScene')) {
      this.scene.stop('GrimoireScene');
    }

    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;

    this.scene.restart();
  }
}