// src/scenes/GameScene.ts

import Phaser from 'phaser';
import { Player, CastResult } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CombatSystem } from '../systems/CombatSystem';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellCaster } from '../systems/SpellCaster';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardGenerator } from '../systems/dungeon/RewardGenerator';
import { Reward } from '../systems/dungeon/RewardGenerator';
import {
  ENEMY_RADIUS, ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS,
  ENEMY_COUNT, GRIMOIRE_TIME_SCALE, SPELL_SLOT_COUNT, ENEMY_MAX_HP,
} from '../config/constants';
import { RoomType, RoomCombatConfig } from '../config/dungeonConfig';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private combatSystem!: CombatSystem;
  public grimoireSystem!: GrimoireSystem;
  private statusEffectSystem!: StatusEffectSystem;
  private dungeonState: DungeonState | null = null;
  private roomType: RoomType | null = null;
  private combatConfig: RoomCombatConfig | null = null;
  private gameOver = false;
  private combatResolved = false; // prevents double-processing victory
  private grimoireOpen = false;
  private grimoireToggleTime = 0;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private devTestKey!: Phaser.Input.Keyboard.Key;
  private slotKeys: Phaser.Input.Keyboard.Key[] = [];
  private feedbackText!: Phaser.GameObjects.Text;
  private feedbackTimer: Phaser.Time.TimerEvent | null = null;

  constructor() { super({ key: 'GameScene' }); }

  init(data?: { dungeon?: DungeonState; roomType?: RoomType; combatConfig?: RoomCombatConfig }): void {
    this.dungeonState = data?.dungeon ?? null;
    this.roomType = data?.roomType ?? null;
    this.combatConfig = data?.combatConfig ?? null;
  }

  create(): void {
    this.gameOver = false;
    this.combatResolved = false;
    this.grimoireOpen = false;
    this.grimoireToggleTime = 0;
    this.enemies = [];
    this.projectiles = [];
    this.slotKeys = [];

    this.grimoireSystem = new GrimoireSystem();
    if (this.dungeonState) {
      this.grimoireSystem.setProgression(this.dungeonState.progression);
    }
    this.statusEffectSystem = new StatusEffectSystem(this);

    this.createRoom();
    this.createPlayer();
    this.syncPlayerFromProgression();
    this.createEnemies();
    this.setupCombat();
    this.setupInput();
    this.createGameOverUI();
    this.createFeedbackText();
    this.launchHUD();

    this.events.on('player-died', this.onPlayerDied, this);
    this.events.on('enemy-died', this.onEnemyDied, this);
    this.events.on('spell-slots-updated', this.onSpellSlotsUpdated, this);
    this.events.on('projectile-created', (proj: Projectile) => {
      this.projectiles.push(proj);
    });

    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;

    // Show room type indicator during dungeon runs
    if (this.dungeonState && this.roomType) {
      this.buildRoomIndicator();
    }
  }

  // ── Room ────────────────────────────────────────────────────────────────

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
    for (const d of decs) {
      this.add.sprite(d.x, d.y, 'decoration').setDepth(1).setAlpha(0.5);
    }

    for (let i = 0; i < 15; i++) {
      const x = Phaser.Math.Between(WALL_THICKNESS + 20, ROOM_WIDTH - WALL_THICKNESS - 20);
      const y = Phaser.Math.Between(WALL_THICKNESS + 20, ROOM_HEIGHT - WALL_THICKNESS - 20);
      const dot = this.add.circle(x, y, 1.5, 0x6666aa, 0.3).setDepth(2);
      this.tweens.add({
        targets: dot,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        alpha: { from: 0.1, to: 0.4 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  private buildRoomIndicator(): void {
    const labels: Partial<Record<RoomType, string>> = {
      [RoomType.NORMAL]: 'COMBAT',
      [RoomType.ELITE]: 'ELITE COMBAT',
      [RoomType.SIN_BOSS]: 'SIN BOSS',
      [RoomType.DEVIL]: 'THE DEVIL',
    };
    const colors: Partial<Record<RoomType, string>> = {
      [RoomType.NORMAL]: '#88aacc',
      [RoomType.ELITE]: '#ff8844',
      [RoomType.SIN_BOSS]: '#ff4444',
      [RoomType.DEVIL]: '#ff0000',
    };

    const label = labels[this.roomType!] ?? 'COMBAT';
    const color = colors[this.roomType!] ?? '#88aacc';

    const layer = this.dungeonState!.currentLayerIndex + 1;
    const room = this.dungeonState!.currentRoomIndex + 1;

    this.add.text(ROOM_WIDTH / 2, 14, `${label}  ·  Layer ${layer}  ·  Room ${room}`, {
      fontFamily: '"Segoe UI", sans-serif',
      fontSize: '11px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50).setAlpha(0.7);
  }

  // ── Player ───────────────────────────────────────────────────────────────

  private createPlayer(): void {
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
  }

  private syncPlayerFromProgression(): void {
    if (!this.dungeonState) return;
    const prog = this.dungeonState.progression;
    this.player.maxHp = prog.maxHp;
    this.player.hp = prog.currentHp;
    this.player.maxMana = prog.maxMana;
    this.player.mana = prog.maxMana;
  }

  // ── Enemies ───────────────────────────────────────────────────────────────

  private createEnemies(): void {
    // Read scaling from combat config when in dungeon mode
    const count = this.combatConfig?.enemyCount ?? ENEMY_COUNT;
    const hpMult = this.combatConfig?.enemyHpMultiplier ?? 1;

    const spawns = [
      { x: 150, y: 150 },
      { x: ROOM_WIDTH - 150, y: 150 },
      { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 150 },
      { x: ROOM_WIDTH / 2, y: 200 },
      { x: 200, y: ROOM_HEIGHT / 2 },
      { x: ROOM_WIDTH - 200, y: ROOM_HEIGHT / 2 },
      { x: ROOM_WIDTH / 2, y: 150 },
      { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT - 200 },
    ];

    for (let i = 0; i < count; i++) {
      const pos = spawns[i % spawns.length];
      const enemy = new Enemy(this, pos.x, pos.y);
      enemy.setTarget(this.player.sprite);

      // Apply dungeon scaling
      const scaledHp = Math.round(ENEMY_MAX_HP * hpMult);
      enemy.maxHp = scaledHp;
      enemy.hp = scaledHp;

      this.enemies.push(enemy);
    }
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private setupCombat(): void {
    this.combatSystem = new CombatSystem(
      this, this.player, this.enemies, this.projectiles, this.statusEffectSystem,
    );
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.gameOver && !this.grimoireOpen && !this.combatResolved) {
        this.handleLeftClick(pointer);
      }
    });

    if (this.input.keyboard) {
      this.restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.devTestKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);

      this.input.keyboard.addCapture('TAB');

      const keyCodes = [
        Phaser.Input.Keyboard.KeyCodes.ONE,
        Phaser.Input.Keyboard.KeyCodes.TWO,
        Phaser.Input.Keyboard.KeyCodes.THREE,
        Phaser.Input.Keyboard.KeyCodes.FOUR,
        Phaser.Input.Keyboard.KeyCodes.FIVE,
      ];
      for (let i = 0; i < SPELL_SLOT_COUNT && i < keyCodes.length; i++) {
        this.slotKeys.push(this.input.keyboard.addKey(keyCodes[i]));
      }
    }
  }

  private launchHUD(): void {
    if (!this.scene.isActive('HUDScene')) {
      this.scene.launch('HUDScene', {
        player: this.player,
        grimoireSystem: this.grimoireSystem,
        dungeonState: this.dungeonState,
      });
    } else {
      const hud = this.scene.get('HUDScene');
      hud.events.emit('set-player', this.player);
      hud.events.emit('set-grimoire', this.grimoireSystem);
    }
  }

  // ── Combat Input ──────────────────────────────────────────────────────────

  private handleLeftClick(pointer: Phaser.Input.Pointer): void {
    if (this.player.activeSpell) {
      this.handleSpellCast(pointer);
    } else {
      this.fireBasicAttack();
    }
  }

  private handleSpellCast(pointer: Phaser.Input.Pointer): void {
    const spell = this.player.activeSpell!;

    if (spell.targetingType === 'melee' || spell.targetingType === 'placement') {
      const result = this.player.canCastActiveSpell();
      if (result === CastResult.SUCCESS) {
        this.executeCast(pointer.worldX, pointer.worldY);
      } else {
        this.showCastError(result);
      }
      return;
    }

    const enemy = this.findEnemyAtPoint(pointer.worldX, pointer.worldY);
    const result = this.player.canCastActiveSpell();
    if (result === CastResult.SUCCESS) {
      this.executeCast(
        enemy ? enemy.sprite.x : pointer.worldX,
        enemy ? enemy.sprite.y : pointer.worldY,
      );
    } else {
      this.showCastError(result);
    }
  }

  private showCastError(result: CastResult): void {
    if (result === CastResult.NOT_ENOUGH_MANA) this.showFeedback('Not Enough Mana', '#ff4444');
    else if (result === CastResult.ON_COOLDOWN) this.showFeedback('On Cooldown', '#ffaa00');
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

  private executeCast(tx: number, ty: number): void {
    const spell = this.player.castActiveSpell();
    SpellCaster.cast({
      scene: this, spell, player: this.player,
      targetX: tx, targetY: ty,
      enemies: this.enemies, projectiles: this.projectiles,
      statusEffects: this.statusEffectSystem,
    });
    const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
    this.showFeedback(spell.name + '!', hex);
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

  // ── UI ────────────────────────────────────────────────────────────────────

  private createFeedbackText(): void {
    this.feedbackText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 + 60, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
  }

  private showFeedback(msg: string, color: string): void {
    if (this.feedbackTimer) { this.feedbackTimer.destroy(); this.feedbackTimer = null; }
    this.feedbackText
      .setPosition(this.player.sprite.x, this.player.sprite.y - 40)
      .setText(msg).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: this.feedbackText, y: this.feedbackText.y - 20, alpha: 0,
      duration: 1200, ease: 'Power2',
    });
    this.feedbackTimer = this.time.delayedCall(1500, () => {
      this.feedbackText.setAlpha(0);
    });
  }

  private createGameOverUI(): void {
    this.gameOverText = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '32px',
      color: '#cc3333',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(100).setAlpha(0);
  }

  // ── Grimoire ──────────────────────────────────────────────────────────────

  private openGrimoire(): void {
    if (this.grimoireOpen || this.gameOver || this.combatResolved) return;
    this.grimoireOpen = true;
    this.grimoireToggleTime = Date.now();
    this.time.timeScale = GRIMOIRE_TIME_SCALE;
    this.physics.world.timeScale = 1 / GRIMOIRE_TIME_SCALE;
    this.player.sprite.setVelocity(0, 0);
    this.scene.launch('GrimoireScene', { grimoireSystem: this.grimoireSystem });
    this.scene.bringToTop('GrimoireScene');
    this.scene.bringToTop('HUDScene');
  }

  public forceCloseGrimoire(): void {
    if (!this.grimoireOpen) return;
    this.grimoireOpen = false;
    this.grimoireToggleTime = Date.now();
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
    if (this.scene.isActive('GrimoireScene')) {
      this.scene.stop('GrimoireScene');
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private onSpellSlotsUpdated(): void {
    this.player.activeSpell = this.grimoireSystem.getActiveSpell();
    this.events.emit('update-hud');
  }

  private onPlayerDied(): void {
    this.gameOver = true;

    if (this.grimoireOpen) this.forceCloseGrimoire();
    for (const e of this.enemies) { if (e.alive) e.sprite.setVelocity(0, 0); }

    if (this.dungeonState) {
      // Dungeon mode: save HP, end run, go to run-over screen
      this.dungeonState.progression.currentHp = 0;
      this.dungeonState.endRun(false);
      this.gameOverText.setText('DEFEATED').setAlpha(1);

      this.time.delayedCall(2000, () => {
        if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
        this.scene.start('RunOverScene', {
          dungeon: this.dungeonState,
          victory: false,
        });
      });
    } else {
      // Standalone mode: show restart prompt
      this.gameOverText.setText('YOU DIED\n\nPress R to restart').setAlpha(1);
    }
  }

  private onEnemyDied(enemy: Enemy): void {
    this.statusEffectSystem.removeAllEffects(enemy);
    const i = this.enemies.indexOf(enemy);
    if (i !== -1) this.enemies.splice(i, 1);

    // All enemies cleared
    if (this.enemies.length === 0 && !this.gameOver && !this.combatResolved) {
      this.combatResolved = true;

      if (this.dungeonState && this.roomType) {
        // ── Dungeon mode: generate rewards and transition ──────────────────
        this.dungeonState.progression.currentHp = this.player.hp;

        const prog = this.dungeonState.progression;
        const layerIdx = this.dungeonState.currentLayerIndex;

        let rewards: Reward[] = [];
        switch (this.roomType) {
          case RoomType.NORMAL:
            rewards = RewardGenerator.generateNormalRewards(prog, layerIdx);
            break;
          case RoomType.ELITE:
            rewards = RewardGenerator.generateEliteRewards(prog, layerIdx);
            break;
          case RoomType.SIN_BOSS:
            rewards = RewardGenerator.generateSinBossRewards(prog);
            break;
          case RoomType.DEVIL:
            rewards = RewardGenerator.generateDevilRewards(prog);
            break;
          default:
            rewards = [];
        }

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
        // ── Standalone mode: respawn enemies ──────────────────────────────
        this.time.delayedCall(2000, () => {
          if (!this.gameOver) {
            this.createEnemies();
            this.setupCombat();
            this.combatResolved = false;
          }
        });
      }
    }
  }

  // ── Main Loop ─────────────────────────────────────────────────────────────

  update(): void {
    // ── F12: open dev test mode ───────────────────────────────────────────
    if (this.devTestKey && Phaser.Input.Keyboard.JustDown(this.devTestKey)) {
      if (this.grimoireOpen) this.forceCloseGrimoire();
      if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
      this.scene.pause('GameScene');
      this.scene.launch('DevTestScene');
      return;
    }

    // ── TAB: toggle Grimoire ──────────────────────────────────────────────
    if (this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      const now = Date.now();
      if (now - this.grimoireToggleTime > 300 && !this.gameOver && !this.combatResolved) {
        if (this.grimoireOpen) {
          this.forceCloseGrimoire();
        } else {
          this.openGrimoire();
        }
      }
    }

    // ── ESC: close Grimoire ───────────────────────────────────────────────
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.grimoireOpen) this.forceCloseGrimoire();
    }

    // ── Number keys: switch spell slot ───────────────────────────────────
    if (!this.grimoireOpen && !this.gameOver && !this.combatResolved) {
      for (let i = 0; i < this.slotKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(this.slotKeys[i])) {
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

    // ── R: restart (standalone mode only) ─────────────────────────────────
    if (!this.dungeonState && this.gameOver) {
      if (this.restartKey?.isDown) this.restartGame();
      return;
    }

    if (this.gameOver || this.combatResolved) return;

    // ── Normal game update ─────────────────────────────────────────────────
    if (!this.grimoireOpen) {
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
    this.events.off('spell-slots-updated', this.onSpellSlotsUpdated, this);
    this.statusEffectSystem.clearAll();
    if (this.grimoireOpen) this.forceCloseGrimoire();
    if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
    this.scene.restart();
  }
}