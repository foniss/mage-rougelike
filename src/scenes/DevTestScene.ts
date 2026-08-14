// src/scenes/DevTestScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CombatSystem } from '../systems/CombatSystem';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { SpellCaster } from '../systems/SpellCaster';
import { FormExecutor } from '../systems/FormExecutor';
import { Spell } from '../systems/SpellBuilder';
import { DevSpellPanel } from '../ui/DevSpellPanel';
import { DevArenaControls, ArenaConfig } from '../ui/DevArenaControls';
import {
  ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS,
  ENEMY_MAX_HP, PLAYER_MAX_MANA,
} from '../config/constants';

export class DevTestScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private combatSystem!: CombatSystem;
  private statusEffectSystem!: StatusEffectSystem;

  private spellPanel!: DevSpellPanel;
  private arenaControls!: DevArenaControls;

  private currentSpell: Spell | null = null;
  private arenaConfig!: ArenaConfig;
  private exitKey!: Phaser.Input.Keyboard.Key;
  private quickCastKey!: Phaser.Input.Keyboard.Key;
  private lastCastTime: number = 0;

  constructor() {
    super({ key: 'DevTestScene' });
  }

  create(): void {
    this.enemies = [];
    this.projectiles = [];
    this.currentSpell = null;
    this.lastCastTime = 0;

    this.statusEffectSystem = new StatusEffectSystem(this);

    this.createRoom();
    this.createPlayer();

    // UI Panels
    this.spellPanel = new DevSpellPanel(
      this, 0, 0,
      (spell) => { this.currentSpell = spell; },
      (spell) => { this.castSpellAtCursor(spell); },
    );

    this.arenaControls = new DevArenaControls(
      this, ROOM_WIDTH - 200, 0,
      (config) => { this.resetArena(config); },
    );

    this.arenaConfig = this.arenaControls.getConfig();
    this.spawnEnemies();
    this.setupCombat();
    this.setupInput();

    // Listen for projectile creation from splitting etc.
    this.events.on('projectile-created', (proj: Projectile) => {
      this.projectiles.push(proj);
    });

    this.events.on('enemy-died', (enemy: Enemy) => {
      this.statusEffectSystem.removeAllEffects(enemy);
      const i = this.enemies.indexOf(enemy);
      if (i !== -1) this.enemies.splice(i, 1);
    });

    // Dev mode label
    this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT - 12, '⚙ DEV SPELL TEST MODE — F12 to exit', {
      fontFamily: '"Courier New", monospace', fontSize: '10px',
      color: '#555566',
    }).setOrigin(0.5).setDepth(100);
  }

  private createRoom(): void {
    // Slightly larger arena area (use full room)
    this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x12101e, 1).setDepth(0);

    // Grid
    const gfx = this.add.graphics().setDepth(1);
    gfx.lineStyle(1, 0x1a1833, 0.3);
    for (let x = 0; x < ROOM_WIDTH; x += 48) gfx.lineBetween(x, 0, x, ROOM_HEIGHT);
    for (let y = 0; y < ROOM_HEIGHT; y += 48) gfx.lineBetween(0, y, ROOM_WIDTH, y);

    // Walls
    this.add.sprite(ROOM_WIDTH / 2, WALL_THICKNESS / 2, 'wall-h').setDepth(5);
    this.add.sprite(ROOM_WIDTH / 2, ROOM_HEIGHT - WALL_THICKNESS / 2, 'wall-h').setDepth(5);
    this.add.sprite(WALL_THICKNESS / 2, ROOM_HEIGHT / 2, 'wall-v').setDepth(5);
    this.add.sprite(ROOM_WIDTH - WALL_THICKNESS / 2, ROOM_HEIGHT / 2, 'wall-v').setDepth(5);

    // Range markers
    const cx = ROOM_WIDTH / 2 + 40;
    const cy = ROOM_HEIGHT / 2;
    const ranges = [50, 100, 150, 200, 300];
    for (const r of ranges) {
      const rangeCircle = this.add.circle(cx, cy, r, 0x000000, 0).setDepth(2);
      rangeCircle.setStrokeStyle(0.5, 0x2a2a44, 0.2);
      this.add.text(cx + r + 2, cy - 6, `${r}`, {
        fontFamily: '"Courier New", monospace', fontSize: '7px', color: '#333344',
      }).setDepth(2);
    }
  }

  private createPlayer(): void {
    this.player = new Player(this, ROOM_WIDTH / 2 - 100, ROOM_HEIGHT / 2);
  }

  private spawnEnemies(): void {
    // Clear existing
    for (const e of this.enemies) {
      this.statusEffectSystem.removeAllEffects(e);
      if (e.sprite.active) e.sprite.destroy();
    }
    this.enemies = [];

    const cfg = this.arenaConfig;
    const arenaCenter = { x: ROOM_WIDTH / 2 + 80, y: ROOM_HEIGHT / 2 };

    // Basic enemies (spread out)
    for (let i = 0; i < cfg.basicEnemyCount; i++) {
      const angle = (i / Math.max(cfg.basicEnemyCount, 1)) * Math.PI * 2;
      const dist = 120;
      const x = arenaCenter.x + Math.cos(angle) * dist;
      const y = arenaCenter.y + Math.sin(angle) * dist;
      const enemy = new Enemy(this, x, y);
      if (!cfg.staticEnemies) enemy.setTarget(this.player.sprite);
      this.enemies.push(enemy);
    }

    // Tanky enemies (further out)
    for (let i = 0; i < cfg.tankyEnemyCount; i++) {
      const angle = (i / Math.max(cfg.tankyEnemyCount, 1)) * Math.PI * 2 + 0.3;
      const dist = 180;
      const x = arenaCenter.x + Math.cos(angle) * dist;
      const y = arenaCenter.y + Math.sin(angle) * dist;
      const enemy = new Enemy(this, x, y);
      enemy.hp = 300;
      enemy.maxHp = 300;
      enemy.sprite.setTint(0x884444);
      enemy.sprite.setScale(1.3);
      if (!cfg.staticEnemies) enemy.setTarget(this.player.sprite);
      this.enemies.push(enemy);

      // Label
      this.add.text(x, y - 28, 'TANKY', {
        fontFamily: '"Courier New", monospace', fontSize: '7px', color: '#664444',
      }).setOrigin(0.5).setDepth(20);
    }

    // Grouped enemies (clustered together)
    const groupCenter = { x: arenaCenter.x + 100, y: arenaCenter.y - 50 };
    for (let i = 0; i < cfg.groupedEnemyCount; i++) {
      const ox = (Math.random() - 0.5) * 50;
      const oy = (Math.random() - 0.5) * 50;
      const enemy = new Enemy(this, groupCenter.x + ox, groupCenter.y + oy);
      if (!cfg.staticEnemies) enemy.setTarget(this.player.sprite);
      this.enemies.push(enemy);
    }

    if (cfg.groupedEnemyCount > 0) {
      this.add.text(groupCenter.x, groupCenter.y - 40, 'GROUPED', {
        fontFamily: '"Courier New", monospace', fontSize: '7px', color: '#446644',
      }).setOrigin(0.5).setDepth(20);
    }
  }

  private setupCombat(): void {
    this.combatSystem = new CombatSystem(
      this, this.player, this.enemies, this.projectiles, this.statusEffectSystem,
    );
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F12);
    this.quickCastKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // Left click to cast
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && pointer.worldX > 280) {
        if (this.currentSpell) {
          this.castSpellAtPoint(this.currentSpell, pointer.worldX, pointer.worldY);
        }
      }
    });
  }

  private castSpellAtCursor(spell: Spell): void {
    const pointer = this.input.activePointer;
    this.castSpellAtPoint(spell, pointer.worldX, pointer.worldY);
  }

  private castSpellAtPoint(spell: Spell, tx: number, ty: number): void {
    const now = this.time.now;
    const cd = this.arenaConfig.noCooldowns ? 100 : spell.cooldown;
    if (now - this.lastCastTime < cd) return;
    this.lastCastTime = now;

    // Infinite mana
    if (this.arenaConfig.infiniteMana) {
      this.player.mana = PLAYER_MAX_MANA;
    }

    SpellCaster.cast({
      scene: this,
      spell,
      player: this.player,
      targetX: tx,
      targetY: ty,
      enemies: this.enemies,
      projectiles: this.projectiles,
      statusEffects: this.statusEffectSystem,
    });
  }

  private resetArena(config: ArenaConfig): void {
    this.arenaConfig = config;

    // Clean up projectiles
    for (const p of this.projectiles) {
      if (p.active) p.destroy();
    }
    this.projectiles = [];

    // Respawn enemies
    this.spawnEnemies();
    this.setupCombat();

    // Reset player
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.player.alive = true;
    this.player.sprite.setAlpha(1);
    this.player.sprite.setPosition(ROOM_WIDTH / 2 - 100, ROOM_HEIGHT / 2);
  }

  update(): void {
    // Exit
    if (Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      this.exitTestMode();
      return;
    }

    // Quick cast (Q key)
    if (this.quickCastKey.isDown && this.currentSpell) {
      const pointer = this.input.activePointer;
      this.castSpellAtPoint(this.currentSpell, pointer.worldX, pointer.worldY);
    }

    // Infinite mana
    if (this.arenaConfig.infiniteMana) {
      this.player.mana = PLAYER_MAX_MANA;
    }

    this.player.update();

    for (const enemy of this.enemies) {
      if (this.arenaConfig.staticEnemies) {
        enemy.sprite.setVelocity(0, 0);
      }
      enemy.update();
    }

    for (const proj of this.projectiles) proj.update();

    this.combatSystem.update();
    this.combatSystem.cleanupProjectiles();
    this.statusEffectSystem.update();
  }

  private exitTestMode(): void {
    // Clean up
    this.statusEffectSystem.clearAll();
    for (const p of this.projectiles) if (p.active) p.destroy();
    this.projectiles = [];

    this.spellPanel.destroy();
    this.arenaControls.destroy();

    this.scene.stop('DevTestScene');
    this.scene.resume('GameScene');
  }
}