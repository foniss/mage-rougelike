// src/scenes/HUDScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { SpellSlotBar } from '../ui/SpellSlotBar';
import { ROOM_WIDTH, ROOM_HEIGHT, COLOR_HP_BAR, COLOR_MANA_BAR, COLOR_BAR_BG, SPELL_SLOT_COUNT } from '../config/constants';
import { uiText, createGlassPanel, tweenBarWidth } from '../config/uiStyles';

export class HUDScene extends Phaser.Scene {
  private player: Player | null = null;
  private grimoireSystem: GrimoireSystem | null = null;
  private dungeonState: DungeonState | null = null;

  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaBarFill!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private relicText!: Phaser.GameObjects.Text;
  private spellSlotBar!: SpellSlotBar;

  private lastHpWidth = -1;
  private lastManaWidth = -1;

  private readonly BAR_W = 168;
  private readonly PAD = 14;

  constructor() { super({ key: 'HUDScene' }); }

  init(data: { player: Player; grimoireSystem: GrimoireSystem; dungeonState?: DungeonState }): void {
    this.player = data.player;
    this.grimoireSystem = data.grimoireSystem;
    this.dungeonState = data.dungeonState || null;
    this.lastHpWidth = -1;
    this.lastManaWidth = -1;
  }

  create(): void {
    this.events.on('set-player', (p: Player) => { this.player = p; });
    this.events.on('set-grimoire', (g: GrimoireSystem) => { this.grimoireSystem = g; });

    const gs = this.scene.get('GameScene');
    gs.events.on('update-hud', this.updateHud, this);

    this.buildResourcePanel();
    if (this.dungeonState) this.buildDungeonStatusPanel();
    this.buildControlsHint();

    // Spell slot bar sits on its own frosted shelf for separation from gameplay
    const shelfH = 48;
    createGlassPanel(this, ROOM_WIDTH / 2, ROOM_HEIGHT - shelfH / 2, ROOM_WIDTH, shelfH, 40, 0.35)
      .setStrokeStyle(0, 0, 0);
    this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - shelfH, ROOM_WIDTH, 1, 0x6a5a8a, 0.2).setDepth(40);

    this.spellSlotBar = new SpellSlotBar(this, ROOM_HEIGHT - 38);
    this.spellSlotBar.buildSlots(SPELL_SLOT_COUNT);
  }

  // ── Resource panel: HP + Mana grouped under one frosted card ─────────────

  private buildResourcePanel(): void {
    const panelW = this.BAR_W + 54;
    const panelH = 56;
    const px = this.PAD + panelW / 2;
    const py = this.PAD + panelH / 2;

    createGlassPanel(this, px, py, panelW, panelH, 30, 0.68);

    const barX = px - panelW / 2 + 44;
    const hpY = py - 12;
    const manaY = py + 12;

    // HP row
    this.add.text(px - panelW / 2 + 10, hpY, '♥', uiText(14, '#ff6666', true)).setOrigin(0, 0.5).setDepth(31);
    this.add.rectangle(barX + this.BAR_W / 2, hpY, this.BAR_W, 10, COLOR_BAR_BG, 0.7).setDepth(31)
      .setStrokeStyle(1, 0x000000, 0.3);
    this.hpBarFill = this.add.rectangle(barX, hpY, this.BAR_W, 8, COLOR_HP_BAR, 0.95).setOrigin(0, 0.5).setDepth(32);
    this.hpText = this.add.text(barX, hpY - 13, 'HP', uiText(8, '#88bb99', true)).setDepth(32);

    // Mana row
    this.add.text(px - panelW / 2 + 10, manaY, '✦', uiText(13, '#6699ff', true)).setOrigin(0, 0.5).setDepth(31);
    this.add.rectangle(barX + this.BAR_W / 2, manaY, this.BAR_W, 10, COLOR_BAR_BG, 0.7).setDepth(31)
      .setStrokeStyle(1, 0x000000, 0.3);
    this.manaBarFill = this.add.rectangle(barX, manaY, this.BAR_W, 8, COLOR_MANA_BAR, 0.95).setOrigin(0, 0.5).setDepth(32);
    this.manaText = this.add.text(barX, manaY - 13, 'MP', uiText(8, '#6688cc', true)).setDepth(32);
  }

  // ── Dungeon status: Gold + Relics, top-right ──────────────────────────────

  private buildDungeonStatusPanel(): void {
    const panelW = 150;
    const panelH = 40;
    const px = ROOM_WIDTH - this.PAD - panelW / 2;
    const py = this.PAD + panelH / 2;

    createGlassPanel(this, px, py, panelW, panelH, 30, 0.68);

    this.add.text(px - panelW / 2 + 12, py - 9, '◈', uiText(12, '#ffcc44', true)).setOrigin(0, 0.5).setDepth(31);
    this.goldText = this.add.text(px - panelW / 2 + 28, py - 9, '', uiText(11, '#ffcc44', true)).setOrigin(0, 0.5).setDepth(31);

    this.add.text(px - panelW / 2 + 12, py + 9, '☉', uiText(12, '#ff8844', true)).setOrigin(0, 0.5).setDepth(31);
    this.relicText = this.add.text(px - panelW / 2 + 28, py + 9, '', uiText(11, '#ff8844', true)).setOrigin(0, 0.5).setDepth(31);
  }

  private buildControlsHint(): void {
    this.add.text(ROOM_WIDTH - this.PAD, ROOM_HEIGHT - 58,
      'WASD Move · Click Cast · 1-3 Slots · TAB Grimoire',
      uiText(8, '#44556690')).setOrigin(1, 0).setDepth(30);
  }

  // ── Live updates ───────────────────────────────────────────────────────

  private updateHud(): void {
    if (!this.player) return;

    const hpPct = Math.max(0, Math.min(1, this.player.hp / this.player.maxHp));
    const manaPct = Math.max(0, Math.min(1, this.player.mana / this.player.maxMana));
    const targetHpW = this.BAR_W * hpPct;
    const targetManaW = this.BAR_W * manaPct;

    if (Math.abs(targetHpW - this.lastHpWidth) > 0.5) {
      tweenBarWidth(this, this.hpBarFill, targetHpW, 220);
      this.lastHpWidth = targetHpW;
    }
    if (Math.abs(targetManaW - this.lastManaWidth) > 0.5) {
      tweenBarWidth(this, this.manaBarFill, targetManaW, 220);
      this.lastManaWidth = targetManaW;
    }

    // Low-HP warning tint
    const lowHp = hpPct < 0.25;
    this.hpBarFill.setFillStyle(lowHp ? 0xff4444 : COLOR_HP_BAR, 0.95);

    this.hpText.setText(`HP  ${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    this.manaText.setText(`MP  ${Math.ceil(this.player.mana)}/${this.player.maxMana}`);

    if (this.dungeonState) {
      this.goldText.setText(`${this.dungeonState.progression.gold}`);
      this.relicText.setText(`${this.dungeonState.progression.sinRelics.length} / 3`);
    }

    if (this.grimoireSystem) {
      this.spellSlotBar.update(this.grimoireSystem.slots, this.grimoireSystem.activeSlotIndex);
    }
  }
}