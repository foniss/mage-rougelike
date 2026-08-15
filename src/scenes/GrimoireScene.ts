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
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardGenerator, Reward } from '../systems/dungeon/RewardGenerator';
import { RoomType, RoomCombatConfig } from '../config/dungeonConfig';
import {
  ENEMY_RADIUS, ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS,
  ENEMY_COUNT, GRIMOIRE_TIME_SCALE, SPELL_SLOT_COUNT,
  ENEMY_MAX_HP, ENEMY_SPEED, ENEMY_DAMAGE,
} from '../config/constants';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private combatSystem!: CombatSystem;
  public grimoireSystem!: GrimoireSystem;
  private statusEffectSystem!: StatusEffectSystem;
  private gameOver = false;
  private combatWon = false;
  private grimoireOpen = false;
  private lastGrimoireToggle = 0;
  private gameOverText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;

  // Dungeon integration
  private dungeonState: DungeonState | null = null;
  private roomType: RoomType | null = null;
  private combatConfig: RoomCombatConfig | null = null;

  constructor() { super({ key: 'GameScene' }); }

  init(data?: { dungeon?: DungeonState; roomType?: RoomType; combatConfig?: RoomCombatConfig }): void {
    this.dungeonState = data?.dungeon || null;
    this.roomType = data?.roomType || null;
    this.combatConfig = data?.combatConfig || null;
  }

  create(): void {
    this.gameOver = false;
    this.combatWon = false;
    this.grimoireOpen = false;
    this.lastGrimoireToggle = 0;
    this.enemies = [];
    this.projectiles = [];

    this.grimoireSystem = new GrimoireSystem();
    this.statusEffectSystem = new StatusEffectSystem(this);

    // Connect progression if in dungeon mode
    if (this.dungeonState) {
      this.grimoireSystem.setProgression(this.dungeonState.progression);
    }

    this.createRoom();
    this.createPlayer();
    this.createEnemies();
    this.combatSystem = new CombatSystem(
      this, this.player, this.enemies, this.projectiles, this.statusEffectSystem,
    );
    this.createGameOverUI();
    this.createFeedbackText();

    // Launch HUD
    this.scene.launch('HUDScene', {
      player: this.player,
      grimoireSystem: this.grimoireSystem,
      dungeonState: this.dungeonState,
    });

    this.events.on('player-died', this.onPlayerDied, this);
    this.events.on('enemy-died', this.onEnemyDied, this);
    this.events.on('spell-slots-updated', () => {
      this.player.activeSpell = this.grimoireSystem.getActiveSpell();
      this.events.emit('update-hud');
    });
    this.events.on('projectile-created', (proj: Projectile) => {
      this.projectiles.push(proj);
    });

    if (this.input.keyboard) {
      this.input.keyboard.addCapture('TAB');
    }

    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;

    // Room type indicator
    if (this.roomType) {
      const label = this.roomType === RoomType.SIN_BOSS ? 'SIN BOSS' :
                     this.roomType === RoomType.DEVIL ? 'THE DEVIL' :
                     this.roomType === RoomType.ELITE ? 'ELITE' : 'COMBAT';
      const color = this.roomType === RoomType.ELITE ? '#ff8844' :
                     this.roomType === RoomType.SIN_BOSS || this.roomType === RoomType.DEVIL ? '#ff4444' : '#88aacc';
      const indicator = this.add.text(ROOM_WIDTH / 2, 16, label, {
        fontFamily: '"Segoe UI", sans-serif', fontSize: '12px', color, fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(50).setAlpha(0.6);
    }
  }

  // ── Room ────────────────────────────────────────────────────────────────

  private createRoom(): void {
    this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x0f0f1a, 1).setDepth(0);

    // Subtle grid
    const gfx = this.add.graphics().setDepth(1);
    gfx.lineStyle(1, 0x1a1a2e, 0.08);
    for (let x = 0; x < ROOM_WIDTH; x += 64) gfx.lineBetween(x, 0, x, ROOM_HEIGHT);
    for (let y = 0; y < ROOM_HEIGHT; y += 64) gfx.lineBetween(0, y, ROOM_WIDTH, y);

    // Walls
    this.add.rectangle(ROOM_WIDTH / 2, WALL_THICKNESS / 2, ROOM_WIDTH, WALL_THICKNESS, 0x16213e, 1).setDepth(5);
    this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - WALL_THICKNESS / 2, ROOM_WIDTH, WALL_THICKNESS, 0x16213e, 1).setDepth(5);
    this.add.rectangle(WALL_THICKNESS / 2, ROOM_HEIGHT / 2, WALL_THICKNESS, ROOM_HEIGHT, 0x16213e, 1).setDepth(5);
    this.add.rectangle(ROOM_WIDTH - WALL_THICKNESS / 2, ROOM_HEIGHT / 2, WALL_THICKNESS, ROOM_HEIGHT, 0x16213e, 1).setDepth(5);

    // Ambient particles
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(WALL_THICKNESS + 30, ROOM_WIDTH - WALL_THICKNESS - 30);
      const y = Phaser.Math.Between(WALL_THICKNESS + 30, ROOM_HEIGHT - WALL_THICKNESS - 30);
      const dot = this.add.circle(x, y, 1 + Math.random(), 0x6666aa, 0.12).setDepth(2);
      this.tweens.add({
        targets: dot, x: x + Phaser.Math.Between(-30, 30), y: y + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.06, to: 0.2 }, duration: Phaser.Math.Between(4000, 7000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT / 2);

    // Sync stats from dungeon progression
    if (this.dungeonState) {
      const prog = this.dungeonState.progression;
      this.player.maxHp = prog.maxHp;
      this.player.hp = prog.currentHp;
      this.player.maxMana = prog.maxMana;
      this.player.mana = prog.maxMana;
    }
  }

  private createEnemies(): void {
    const config = this.combatConfig;
    const count = config?.enemyCount || ENEMY_COUNT;
    const hpMult = config?.enemyHpMultiplier || 1;
    const spdMult = config?.enemySpeedMultiplier || 1;
    const dmgMult = config?.enemyDamageMultiplier || 1;

    const spawns = [
      { x: 150, y: 150 }, { x: ROOM_WIDTH - 150, y: 150 },
      { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 150 }, { x: ROOM_WIDTH / 2, y: 200 },
      { x: 200, y: ROOM_HEIGHT / 2 }, { x: ROOM_WIDTH - 200, y: ROOM_HEIGHT / 2 },
      { x: ROOM_WIDTH / 2, y: 150 }, { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 200 },
    ];

    for (let i = 0; i < count; i++) {
      const pos = spawns[i % spawns.length];
      const enemy = new Enemy(this, pos.x, pos.y);
      enemy.setTarget(this.player.sprite);

      // Apply combat config scaling
      enemy.maxHp = Math.round(ENEMY_MAX_HP * hpMult);
      enemy.hp = enemy.maxHp;

      this.enemies.push(enemy);
    }
  }

  // ── Grimoire ────────────────────────────────────────────────────────────

  private openGrimoire(): void {
    if (this.grimoireOpen || this.gameOver || this.combatWon) return;
    this.grimoireOpen = true;
    this.lastGrimoireToggle = Date.now();
    this.time.timeScale = GRIMOIRE_TIME_SCALE;
    this.physics.world.timeScale = 1 / GRIMOIRE_TIME_SCALE;
    this.player.sprite.setVelocity(0, 0);
    this.scene.launch('GrimoireScene', { grimoireSystem: this.grimoireSystem });
    this.scene.bringToTop('GrimoireScene');
    this.scene.bringToTop('HUDScene');
  }

  public forceCloseGrimoire(): void {
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
    if (this.scene.isActive('GrimoireScene')) this.scene.stop('GrimoireScene');
    this.grimoireOpen = false;
    this.lastGrimoireToggle = Date.now();
  }

  // ── Combat ──────────────────────────────────────────────────────────────

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    if (this.player.activeSpell) {
      const result = this.player.canCastActiveSpell();
      if (result === CastResult.SUCCESS) {
        const enemy = this.findEnemyAtPoint(pointer.worldX, pointer.worldY);
        const spell = this.player.castActiveSpell();
        SpellCaster.cast({
          scene: this, spell, player: this.player,
          targetX: enemy ? enemy.sprite.x : pointer.worldX,
          targetY: enemy ? enemy.sprite.y : pointer.worldY,
          enemies: this.enemies, projectiles: this.projectiles,
          statusEffects: this.statusEffectSystem,
        });
        const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
        this.showFeedback(spell.name + '!', hex);
      } else if (result === CastResult.NOT_ENOUGH_MANA) {
        this.showFeedback('Not Enough Mana', '#ff4444');
      } else if (result === CastResult.ON_COOLDOWN) {
        this.showFeedback('On Cooldown', '#ffaa00');
      }
    } else {
      if (this.player.canBasicAttack()) {
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

  // ── UI ──────────────────────────────────────────────────────────────────

  private createFeedbackText(): void {
    this.feedbackText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 + 60, '', {
      fontFamily: '"Segoe UI", sans-serif', fontSize: '14px', color: '#ffffff',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
  }

  private showFeedback(msg: string, color: string): void {
    if (this.feedbackTimer) { this.feedbackTimer.destroy(); this.feedbackTimer = null; }
    this.feedbackText.setPosition(this.player.sprite.x, this.player.sprite.y - 40)
      .setText(msg).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.feedbackText, y: this.feedbackText.y - 20, alpha: 0,
      duration: 1200, ease: 'Power2',
    });
    this.feedbackTimer = this.time.delayedCall(1500, () => { this.feedbackText.setAlpha(0); });
  }

  private createGameOverUI(): void {
    this.gameOverText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, '', {
      fontFamily: '"Segoe UI", sans-serif', fontSize: '28px', color: '#cc3333',
      align: 'center', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
  }

  // ── Events ──────────────────────────────────────────────────────────────

  private onPlayerDied(): void {
    this.gameOver = true;

    if (this.dungeonState) {
      this.dungeonState.progression.currentHp = 0;
      this.dungeonState.endRun(false);
      this.gameOverText.setText('DEFEATED').setAlpha(1);

      this.time.delayedCall(2000, () => {
        if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
        this.scene.start('RunOverScene', { dungeon: this.dungeonState, victory: false });
      });
    } else {
      this.gameOverText.setText('YOU DIED\n\nPress R to restart').setAlpha(1);
    }
  }

  private onEnemyDied(enemy: Enemy): void {
    this.statusEffectSystem.removeAllEffects(enemy);
    const i = this.enemies.indexOf(enemy);
    if (i !== -1) this.enemies.splice(i, 1);

    // Check if all enemies defeated
    if (this.enemies.length === 0 && !this.gameOver && !this.combatWon) {
      this.combatWon = true;

      if (this.dungeonState && this.roomType) {
        // Save player HP back to progression
        this.dungeonState.progression.currentHp = this.player.hp;

        // Generate rewards based on room type
        const prog = this.dungeonState.progression;
        const layerIdx = this.dungeonState.currentLayerIndex;
        let rewards: Reward[];

        switch (this.roomType) {
          case RoomType.NORMAL:
            rewards = RewardGenerator.generateNormalRewards(prog, layerIdx);
            break;
          case RoomType.ELITE:
            rewards = RewardGenerator.generateEliteRewards(prog, layerIdx);
            break;
          case RoomType.SIN_BOSS:
          case RoomType.DEVIL:
            rewards = RewardGenerator.generateSinBossRewards(prog);
            break;
          default:
            rewards = [];
        }

        // Show victory then transition to rewards
        this.showFeedback('VICTORY!', '#ffcc44');
        this.time.delayedCall(1500, () => {
          if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
          this.scene.start('RewardScene', {
            dungeon: this.dungeonState,
            rewards,
            roomType: this.roomType,
          });
        });
      } else {
        // Non-dungeon mode: respawn enemies
        this.time.delayedCall(2000, () => {
          if (!this.gameOver) {
            this.createEnemies();
            this.combatSystem = new CombatSystem(
              this, this.player, this.enemies, this.projectiles, this.statusEffectSystem,
            );
            this.combatWon = false;
          }
        });
      }
    }
  }

  // ── Main Loop ───────────────────────────────────────────────────────────

  update(): void {
    if (!this.input.keyboard) return;
    const now = Date.now();
    const keys = this.input.keyboard;

    // TAB — grimoire toggle
    const tabDown = keys.checkDown(keys.addKey('TAB', false), 500);
    if (tabDown && now - this.lastGrimoireToggle > 400 && !this.gameOver && !this.combatWon) {
      if (this.grimoireOpen) {
        this.forceCloseGrimoire();
      } else {
        this.openGrimoire();
      }
    }

    // ESC — close grimoire
    const escDown = keys.checkDown(keys.addKey('ESC', false), 500);
    if (escDown && this.grimoireOpen && now - this.lastGrimoireToggle > 400) {
      this.forceCloseGrimoire();
    }

    // R — restart (non-dungeon mode only)
    if (!this.dungeonState && this.gameOver) {
      if (keys.checkDown(keys.addKey('R', false), 0)) {
        this.restartGame();
      }
    }

    // Slot keys 1-3
    if (!this.grimoireOpen && !this.gameOver && !this.combatWon) {
      const slotKeyCodes = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
      for (let i = 0; i < SPELL_SLOT_COUNT && i < slotKeyCodes.length; i++) {
        if (keys.checkDown(keys.addKey(slotKeyCodes[i], false), 300)) {
          this.grimoireSystem.setActiveSlot(i);
          this.player.activeSpell = this.grimoireSystem.getActiveSpell();
          const slotSpell = this.grimoireSystem.slots[i]?.spell;
          if (slotSpell) {
            const hex = '#' + slotSpell.visual.color.toString(16).padStart(6, '0');
            this.showFeedback(`Slot ${i + 1}: ${slotSpell.name}`, hex);
          } else {
            this.showFeedback(`Slot ${i + 1}: Empty`, '#555566');
          }
          this.events.emit('update-hud');
        }
      }
    }

    if (this.gameOver || this.combatWon) return;

    // Mouse click — cast spell
    if (!this.grimoireOpen) {
      const pointer = this.input.activePointer;
      if (pointer.isDown && pointer.leftButtonDown() && pointer.getDuration() < 100) {
        this.handleLeftClick(pointer);
      }
      this.player.update();
    } else {
      this.player.sprite.setVelocity(0, 0);
    }

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
    this.statusEffectSystem.clearAll();
    this.forceCloseGrimoire();
    if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
    this.scene.restart();
  }
}