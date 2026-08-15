// src/scenes/HUDScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { SpellSlotBar } from '../ui/SpellSlotBar';
import { ROOM_WIDTH, ROOM_HEIGHT, COLOR_HP_BAR, COLOR_MANA_BAR, COLOR_BAR_BG, SPELL_SLOT_COUNT } from '../config/constants';
import { uiText, applyTextShadow } from '../config/uiStyles';

export class HUDScene extends Phaser.Scene {
  private player: Player | null = null;
  private grimoireSystem: GrimoireSystem | null = null;
  private dungeonState: DungeonState | null = null;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaBarFill!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private dungeonInfoText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private spellSlotBar!: SpellSlotBar;
  private readonly BW = 160;
  private readonly BX = 14;

  constructor() { super({ key: 'HUDScene' }); }

  init(data: { player: Player; grimoireSystem: GrimoireSystem; dungeonState?: DungeonState }): void {
    this.player = data.player;
    this.grimoireSystem = data.grimoireSystem;
    this.dungeonState = data.dungeonState || null;
  }

  create(): void {
    this.events.on('set-player', (p: Player) => { this.player = p; });
    this.events.on('set-grimoire', (g: GrimoireSystem) => { this.grimoireSystem = g; });

    const gs = this.scene.get('GameScene');
    gs.events.on('update-hud', this.updateHud, this);

    // HP bar
    this.add.rectangle(this.BX + 22 + this.BW / 2, 16, this.BW, 8, COLOR_BAR_BG, 0.6);
    this.hpBarFill = this.add.rectangle(this.BX + 22, 16, this.BW, 6, COLOR_HP_BAR, 0.8).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.BX, 6, 'HP', uiText(8, '#88aa99'));

    // Mana bar
    this.add.rectangle(this.BX + 22 + this.BW / 2, 30, this.BW, 8, COLOR_BAR_BG, 0.6);
    this.manaBarFill = this.add.rectangle(this.BX + 22, 30, this.BW, 6, COLOR_MANA_BAR, 0.8).setOrigin(0, 0.5);
    this.manaText = this.add.text(this.BX, 24, 'MP', uiText(8, '#6688cc'));

    // Dungeon info
    this.dungeonInfoText = this.add.text(this.BX + this.BW + 40, 8, '', uiText(9, '#8899aa'));
    this.goldText = this.add.text(this.BX + this.BW + 40, 22, '', uiText(9, '#ccaa44'));

    // Controls hint
    this.add.text(ROOM_WIDTH - 140, 8, 'WASD Move\nClick Cast\n1-3 Slots\nTAB Grimoire', uiText(7, '#44556680'));

    // Spell slot bar
    this.spellSlotBar = new SpellSlotBar(this, ROOM_HEIGHT - 36);
    this.spellSlotBar.buildSlots(SPELL_SLOT_COUNT);
  }

  private updateHud(): void {
    if (!this.player) return;

    // HP
    const hpPct = Math.max(0, this.player.hp / this.player.maxHp);
    this.hpBarFill.width = this.BW * hpPct;
    this.hpText.setText(`HP ${Math.ceil(this.player.hp)}/${this.player.maxHp}`);

    // Mana
    const manaPct = Math.max(0, this.player.mana / this.player.maxMana);
    this.manaBarFill.width = this.BW * manaPct;
    this.manaText.setText(`MP ${Math.ceil(this.player.mana)}/${this.player.maxMana}`);

    // Dungeon info
    if (this.dungeonState) {
      const layer = this.dungeonState.currentLayerIndex + 1;
      const room = this.dungeonState.currentRoomIndex + 1;
      this.dungeonInfoText.setText(`Layer ${layer} · Room ${room}`);
      this.goldText.setText(`Gold: ${this.dungeonState.progression.gold}`);
    }

    // Spell slots
    if (this.grimoireSystem) {
      this.spellSlotBar.update(this.grimoireSystem.slots, this.grimoireSystem.activeSlotIndex);
    }
  }
}