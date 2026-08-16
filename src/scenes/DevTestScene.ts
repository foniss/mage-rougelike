import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { CombatSystem } from '../systems/CombatSystem';
import { StatusEffectSystem } from '../systems/StatusEffectSystem';
import { BuildupSystem } from '../systems/BuildupSystem';
import { CoreEffectExecutor } from '../systems/CoreEffectExecutor';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellCaster } from '../systems/SpellCaster';
import { DevArenaControls, ArenaCallbacks } from '../ui/DevArenaControls';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { getSpellTier } from '../visuals/CombatFX';
import { BALANCE } from '../config/balance';
import { ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS, PLAYER_MAX_HP, PLAYER_MAX_MANA, ENEMY_MAX_HP, GRIMOIRE_TIME_SCALE, SPELL_SLOT_COUNT } from '../config/constants';
import { uiText, applyTextShadow, OC, createGlassPanel } from '../config/uiStyles';
import { RoomType } from '../config/dungeonConfig';
import { RoomEnvironment } from '../visuals/environment/RoomEnvironment';

export class DevTestScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private combatSystem!: CombatSystem;
  private statusEffectSystem!: StatusEffectSystem;
  private buildupSystem!: BuildupSystem;
  private grimoire!: GrimoireSystem;
  private arenaControls!: DevArenaControls;

  private exitKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private slotKeys: Phaser.Input.Keyboard.Key[] = [];
  private lastCastTime: number = 0;
  private createTime: number = 0;
  private grimoireOpen = false;
  private envRoomType: RoomType = RoomType.NORMAL;
  private envLayer: number = 0;

  private dungeonState: DungeonState | null = null;

  // Debug panel texts
  private dbgSpell!: Phaser.GameObjects.Text;
  private dbgStats!: Phaser.GameObjects.Text;
  private dbgTarget!: Phaser.GameObjects.Text;
  private dbgPlayer!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'DevTestScene' }); }

  init(data?: { dungeon?: DungeonState }): void {
    this.dungeonState = data?.dungeon ?? null;
  }

  create(): void {
    this.enemies = [];
    this.projectiles = [];
    this.lastCastTime = 0;
    this.createTime = this.time.now;
    this.grimoireOpen = false;

    this.statusEffectSystem = new StatusEffectSystem(this);
    this.buildupSystem = new BuildupSystem(this, (scene, enemy, coreId, sourceX, sourceY, enemies, castId) => {
      CoreEffectExecutor.activateStatus(scene, enemy, coreId, sourceX, sourceY, enemies, castId, this.statusEffectSystem);
    });

    // All components unlocked — no progression filter
    this.grimoire = new GrimoireSystem();

    this.buildArena();
    this.createPlayer();
    this.spawnDefaultEnemies();
    this.rebuildCombat();

    // Right panel: controls
    const callbacks: ArenaCallbacks = {
      onSpawnOne: () => this.spawnNormal(),
      onSpawnTanky: () => this.spawnTanky(),
      onSpawnGroup: () => this.spawnGroup(),
      onClearEnemies: () => this.clearEnemies(),
      onResetArena: () => this.resetArena(),
      onChangeEnv: (roomType, layer) => this.changeEnvironment(roomType, layer),
    };
    this.arenaControls = new DevArenaControls(this, ROOM_WIDTH - 210, 0, callbacks);

    // Bottom-left debug panel
    this.buildDebugPanel();

    this.setupInput();

    // Events
    this.events.on('projectile-created', (proj: Projectile) => { this.projectiles.push(proj); });
    this.events.on('enemy-died', (enemy: Enemy) => {
      this.statusEffectSystem.removeAllEffects(enemy);
      this.buildupSystem.removeEnemy(enemy);
      const i = this.enemies.indexOf(enemy);
      if (i !== -1) this.enemies.splice(i, 1);
    });
    // Listen for grimoire forge updates
    this.events.on('spell-slots-updated', () => {
      this.player.activeSpell = this.grimoire.getActiveSpell();
    });
  }

  // ── Arena ───────────────────────────────────────────────────────────────

  private buildArena(): void {
    // Use the real environment system with current theme selection
    RoomEnvironment.create({
      scene: this,
      roomType: this.envRoomType,
      layerIndex: this.envLayer,
      drawWalls: true,
    });

    // Title overlay (on top of environment)
    const tp = createGlassPanel(this, ROOM_WIDTH / 2, 14, 300, 22, 50, 0.7);
    tp.setStrokeStyle(1, OC.crimson, 0.35);
    const tt = this.add.text(ROOM_WIDTH / 2, 14, '◈  DEV COMBAT ARENA  ◈', uiText(11, '#e16a78', true)).setOrigin(0.5).setDepth(51);
    applyTextShadow(tt);

    this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT - 10, 'F2 Exit  ·  WASD Move  ·  Click Cast  ·  TAB Grimoire  ·  1/2/3 Slots', uiText(7, '#3a3a5580')).setOrigin(0.5).setDepth(50);
  }

  private changeEnvironment(roomType: RoomType, layer: number): void {
    this.envRoomType = roomType;
    this.envLayer = layer;

    // Save enemy/player/projectile state
    const playerX = this.player.sprite.x, playerY = this.player.sprite.y;
    const playerHp = this.player.hp, playerMana = this.player.mana;
    const activeSpell = this.player.activeSpell;

    // Store enemy positions/hp
    const enemyData = this.enemies.filter(e => e.alive).map(e => ({
      x: e.sprite.x, y: e.sprite.y, hp: e.hp, maxHp: e.maxHp,
      isTanky: e.maxHp > ENEMY_MAX_HP,
    }));

    // Clean up everything
    this.statusEffectSystem.clearAll();
    this.buildupSystem.clearAll();
    for (const p of this.projectiles) if (p.active) p.destroy();
    this.projectiles = [];
    for (const e of this.enemies) if (e.sprite.active) e.destroy();
    this.enemies = [];
    this.player.destroy();

    // Remove all scene children except the controls, debug panel containers (depth 100+)
    const keep: Phaser.GameObjects.GameObject[] = [];
    this.children.each((child: Phaser.GameObjects.GameObject) => {
      if ((child as any).depth >= 100) keep.push(child);
    });
    this.children.removeAll(false);
    for (const k of keep) this.children.add(k);

    // Rebuild arena with new theme
    this.buildArena();

    // Restore player
    this.player = new Player(this, playerX, playerY);
    this.player.hp = playerHp;
    this.player.maxHp = PLAYER_MAX_HP;
    this.player.mana = playerMana;
    this.player.maxMana = PLAYER_MAX_MANA;
    this.player.activeSpell = activeSpell;

    // Restore enemies
    for (const ed of enemyData) {
      const enemy = new Enemy(this, ed.x, ed.y);
      if (ed.isTanky) {
        enemy.hp = ed.hp;
        enemy.maxHp = ed.maxHp;
        enemy.sprite.setTint(0x884444);
        enemy.sprite.setScale(1.3);
        enemy.separation.separationRadius = 55;
        enemy.separation.separationStrength = 160;
        enemy.separation.playerKeepDistance = 32;
      } else {
        enemy.hp = ed.hp;
        enemy.maxHp = ed.maxHp;
      }
      const cfg = this.arenaControls?.getConfig();
      if (cfg && !cfg.staticEnemies) enemy.setTarget(this.player.sprite);
      this.enemies.push(enemy);
    }

    this.rebuildCombat();
  }

  private createPlayer(): void {
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
    this.player.hp = PLAYER_MAX_HP;
    this.player.maxHp = PLAYER_MAX_HP;
    this.player.mana = PLAYER_MAX_MANA;
    this.player.maxMana = PLAYER_MAX_MANA;
  }

  // ── Enemies ─────────────────────────────────────────────────────────────

  private spawnDefaultEnemies(): void {
    this.spawnEnemyAt(ROOM_WIDTH / 2 + 130, ROOM_HEIGHT / 2, false);
  }

  private spawnNormal(): void {
    const a = this.player.getAimAngle();
    const x = Phaser.Math.Clamp(this.player.sprite.x + Math.cos(a) * 130, WALL_THICKNESS + 20, ROOM_WIDTH - WALL_THICKNESS - 20);
    const y = Phaser.Math.Clamp(this.player.sprite.y + Math.sin(a) * 130, WALL_THICKNESS + 20, ROOM_HEIGHT - WALL_THICKNESS - 20);
    this.spawnEnemyAt(x, y, false);
  }

  private spawnTanky(): void {
    const a = this.player.getAimAngle();
    const x = Phaser.Math.Clamp(this.player.sprite.x + Math.cos(a) * 140, WALL_THICKNESS + 20, ROOM_WIDTH - WALL_THICKNESS - 20);
    const y = Phaser.Math.Clamp(this.player.sprite.y + Math.sin(a) * 140, WALL_THICKNESS + 20, ROOM_HEIGHT - WALL_THICKNESS - 20);
    this.spawnEnemyAt(x, y, true);
  }

  private spawnGroup(): void {
    const cx = this.player.sprite.x, cy = this.player.sprite.y;
    const offsets = [
      { dx: 130, dy: 0 }, { dx: -130, dy: 0 }, { dx: 0, dy: -110 },
      { dx: 90, dy: 90 }, { dx: -90, dy: 90 },
    ];
    for (const o of offsets) {
      const x = Phaser.Math.Clamp(cx + o.dx, WALL_THICKNESS + 20, ROOM_WIDTH - WALL_THICKNESS - 20);
      const y = Phaser.Math.Clamp(cy + o.dy, WALL_THICKNESS + 20, ROOM_HEIGHT - WALL_THICKNESS - 20);
      this.spawnEnemyAt(x, y, false);
    }
  }

  private spawnEnemyAt(x: number, y: number, tanky: boolean): void {
    const enemy = new Enemy(this, x, y);
    if (tanky) {
      const t = BALANCE.enemy.tanky;
      enemy.hp = t.maxHp;
      enemy.maxHp = t.maxHp;
      enemy.sprite.setTint(0x884444);
      enemy.sprite.setScale(1.3);
      enemy.separation.separationRadius = 55;
      enemy.separation.separationStrength = 160;
      enemy.separation.playerKeepDistance = 32;
    }
    const cfg = this.arenaControls?.getConfig();
    if (cfg && !cfg.staticEnemies) enemy.setTarget(this.player.sprite);
    this.enemies.push(enemy);
    this.rebuildCombat();
  }

  private clearEnemies(): void {
    for (const e of this.enemies) {
      this.statusEffectSystem.removeAllEffects(e);
      if (e.sprite.active) e.destroy();
    }
    this.enemies = [];
    this.rebuildCombat();
  }

  private resetArena(): void {
    this.clearEnemies();
    for (const p of this.projectiles) if (p.active) p.destroy();
    this.projectiles = [];
    this.player.hp = this.player.maxHp;
    this.player.mana = this.player.maxMana;
    this.player.alive = true;
    this.player.sprite.setAlpha(1);
    this.player.sprite.setPosition(ROOM_WIDTH / 2, ROOM_HEIGHT / 2);
    this.spawnDefaultEnemies();
  }

  private rebuildCombat(): void {
    this.combatSystem = new CombatSystem(this, this.player, this.enemies, this.projectiles, this.statusEffectSystem, this.buildupSystem);
  }

  // ── Casting ─────────────────────────────────────────────────────────────

  private castActiveSpell(): void {
    const spell = this.player.activeSpell;
    if (!spell) {
      // Basic attack
      const angle = this.player.getAimAngle();
      const d = 24;
      const proj = new Projectile(this, {
        x: this.player.sprite.x + Math.cos(angle) * d,
        y: this.player.sprite.y + Math.sin(angle) * d,
        angle, spell: null,
      });
      this.projectiles.push(proj);
      return;
    }

    const cfg = this.arenaControls.getConfig();
    const cd = cfg.noCooldowns ? 80 : spell.cooldown;
    const now = this.time.now;
    if (now - this.lastCastTime < cd) return;
    this.lastCastTime = now;

    if (cfg.infiniteMana) this.player.mana = this.player.maxMana;

    const pointer = this.input.activePointer;
    SpellCaster.cast({
      scene: this, spell, player: this.player,
      targetX: pointer.worldX, targetY: pointer.worldY,
      enemies: this.enemies, projectiles: this.projectiles,
      statusEffects: this.statusEffectSystem,
      buildupSystem: this.buildupSystem,
    });
  }

  // ── Grimoire ────────────────────────────────────────────────────────────

  private openGrimoire(): void {
    if (this.grimoireOpen) return;
    this.grimoireOpen = true;
    this.time.timeScale = GRIMOIRE_TIME_SCALE;
    this.physics.world.timeScale = 1 / GRIMOIRE_TIME_SCALE;
    this.player.sprite.setVelocity(0, 0);
    this.scene.launch('GrimoireScene', { grimoireSystem: this.grimoire });
    this.scene.bringToTop('GrimoireScene');
  }

  private closeGrimoire(): void {
    if (!this.grimoireOpen) return;
    this.grimoireOpen = false;
    this.time.timeScale = 1;
    this.physics.world.timeScale = 1;
    if (this.scene.isActive('GrimoireScene')) this.scene.stop('GrimoireScene');
    // Sync active spell from grimoire
    this.player.activeSpell = this.grimoire.getActiveSpell();
  }

  // Called by GrimoireScene when it closes itself via its own close button
  public forceCloseGrimoire(): void {
    this.closeGrimoire();
  }

  // ── Debug panel (bottom-left, larger) ───────────────────────────────────

  private buildDebugPanel(): void {
    const panelW = 380, panelH = 200;
    const px = 10, py = ROOM_HEIGHT - panelH - 10;
    const container = this.add.container(px, py).setDepth(100);

    const bg = this.add.rectangle(0, 0, panelW, panelH, OC.panel, 0.92).setOrigin(0, 0).setStrokeStyle(1, OC.purple, 0.35);
    container.add(bg);

    const title = this.add.text(panelW / 2, 12, '◈ COMBAT DEBUG', uiText(13, '#9988aa', true)).setOrigin(0.5).setDepth(101);
    applyTextShadow(title);
    container.add(title);

    this.dbgSpell = this.add.text(12, 34, '', uiText(12, '#aabbcc')).setDepth(101).setLineSpacing(4);
    container.add(this.dbgSpell);

    this.dbgStats = this.add.text(12, 72, '', uiText(11, '#8899aa')).setDepth(101).setLineSpacing(4);
    container.add(this.dbgStats);

    this.dbgPlayer = this.add.text(12, 118, '', uiText(11, '#88aa88')).setDepth(101).setLineSpacing(4);
    container.add(this.dbgPlayer);

    this.dbgTarget = this.add.text(12, 148, '', uiText(11, '#cc8888')).setDepth(101).setLineSpacing(4);
    container.add(this.dbgTarget);
  }

  private updateDebug(): void {
    const spell = this.player.activeSpell;

    if (spell) {
      const tier = getSpellTier(spell);
      const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
      this.dbgSpell.setText(`Spell: ${spell.name}   Tier: ${tier}`).setColor(hex);

      const pfx = spell.prefix?.displayName || '—';
      const sfx = spell.suffix?.displayName || '—';
      this.dbgStats.setText(
        `Dmg: ${spell.damage}   Mana: ${spell.manaCost}   CD: ${(spell.cooldown / 1000).toFixed(2)}s\n` +
        `Core: ${spell.core.displayName}  Form: ${spell.form.displayName}  Prefix: ${pfx}  Suffix: ${sfx}\n` +
        `Status: ${spell.statusEffect.type.toUpperCase()}`
      );
    } else {
      this.dbgSpell.setText('Spell: Basic Attack   Tier: 0').setColor('#667788');
      this.dbgStats.setText('Dmg: 20   Mana: 5   CD: 0.30s\nNo modifiers\nStatus: —');
    }

    // Player
    this.dbgPlayer.setText(`HP: ${Math.ceil(this.player.hp)}/${this.player.maxHp}   Mana: ${Math.ceil(this.player.mana)}/${this.player.maxMana}   Slot: ${this.grimoire.activeSlotIndex + 1}`);

    // Nearest enemy
    let nearest: Enemy | null = null;
    let nd = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, e.sprite.x, e.sprite.y);
      if (d < nd) { nd = d; nearest = e; }
    }

    if (nearest) {
      const parts = [`Target HP: ${Math.ceil(nearest.hp)}/${nearest.maxHp}   Dist: ${Math.round(nd)}`];
      const statuses: string[] = [];
      if (nearest.isFrozen) statuses.push('FROZEN');
      if (nearest.isStunned) statuses.push('STUNNED');
      // Show all active buildups from BuildupSystem
      const buildups = this.buildupSystem.getAllBuildups(nearest);
      const icons: Record<string, string> = { FIRE: '🔥', ICE: '❄', WIND: '💨', STORM: '⚡', COSMIC: '🌀' };
      for (const [coreId, bu] of buildups) {
        statuses.push(`${icons[coreId] || '◈'}${bu.current}/${bu.threshold}`);
      }
      if (statuses.length > 0) parts.push(statuses.join('  '));
      this.dbgTarget.setText(parts.join('\n'));
    } else {
      this.dbgTarget.setText('No enemies');
    }
  }

  // ── Input ───────────────────────────────────────────────────────────────

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.exitKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F2);
    this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.input.keyboard.addCapture('TAB');

    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      const codes = [Phaser.Input.Keyboard.KeyCodes.ONE, Phaser.Input.Keyboard.KeyCodes.TWO, Phaser.Input.Keyboard.KeyCodes.THREE];
      if (i < codes.length) this.slotKeys.push(this.input.keyboard.addKey(codes[i]));
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.grimoireOpen) return;
      // Avoid casting when clicking on the right-side controls panel
      if (pointer.worldX > ROOM_WIDTH - 215) return;
      if (pointer.leftButtonDown()) this.castActiveSpell();
    });
  }

  // ── Update ──────────────────────────────────────────────────────────────

  update(): void {
    // F2 exit
    if (this.time.now - this.createTime > 500 && Phaser.Input.Keyboard.JustDown(this.exitKey)) {
      if (this.grimoireOpen) this.closeGrimoire();
      this.exitArena();
      return;
    }

    // TAB grimoire toggle
    if (Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      if (this.grimoireOpen) this.closeGrimoire();
      else this.openGrimoire();
    }

    // ESC close grimoire
    if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.grimoireOpen) this.closeGrimoire();
    }

    // Slot switching (only when grimoire closed)
    if (!this.grimoireOpen) {
      for (let i = 0; i < this.slotKeys.length; i++) {
        if (Phaser.Input.Keyboard.JustDown(this.slotKeys[i])) {
          this.grimoire.setActiveSlot(i);
          this.player.activeSpell = this.grimoire.getActiveSpell();
        }
      }
    }

    // Listen for grimoire spell-slot updates
    // (GrimoireScene emits this on the GameScene key, but we handle it here)
    this.player.activeSpell = this.grimoire.getActiveSpell();

    const cfg = this.arenaControls.getConfig();
    if (cfg.infiniteMana) this.player.mana = this.player.maxMana;
    if (cfg.infiniteHp) { this.player.hp = this.player.maxHp; this.player.alive = true; this.player.sprite.setAlpha(1); }

    if (!this.grimoireOpen) {
      this.player.update();
    } else {
      this.player.sprite.setVelocity(0, 0);
    }

    for (const enemy of this.enemies) {
      if (cfg.staticEnemies) { enemy.update(); enemy.sprite.setVelocity(0, 0); }
      else enemy.update(this.enemies);
    }

    for (const proj of this.projectiles) proj.update();

    this.combatSystem.update();
    this.combatSystem.cleanupProjectiles();
    this.statusEffectSystem.update();
    this.buildupSystem.update();
    this.updateDebug();
  }

  private exitArena(): void {
    this.statusEffectSystem.clearAll();
    for (const p of this.projectiles) if (p.active) p.destroy();
    if (this.dungeonState) {
      this.scene.start('DungeonMapScene', { dungeon: this.dungeonState });
    } else {
      this.scene.start('BootScene');
    }
  }
}
