// src/scenes/HUDScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellSlotBar } from '../ui/SpellSlotBar';
import {
  ROOM_WIDTH, ROOM_HEIGHT,
  COLOR_HP_BAR, COLOR_MANA_BAR, COLOR_BAR_BG, SPELL_SLOT_COUNT,
} from '../config/constants';
import { uiText, applyTextShadow } from '../config/uiStyles';

export class HUDScene extends Phaser.Scene {
  private player: Player | null = null;
  private grimoireSystem: GrimoireSystem | null = null;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaBarFill!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private spellSlotBar!: SpellSlotBar;
  private readonly BW = 220;
  private readonly BX = 24;

  constructor() { super({ key: 'HUDScene' }); }

  init(data: { player: Player; grimoireSystem: GrimoireSystem }): void {
    this.player = data.player;
    this.grimoireSystem = data.grimoireSystem;
  }

  create(): void {
    this.events.on('set-player', (p: Player) => { this.player = p; });
    this.events.on('set-grimoire', (g: GrimoireSystem) => { this.grimoireSystem = g; });

    const gs = this.scene.get('GameScene');
    const bind = () => gs.events.on('update-hud', this.updateHud, this);
    bind(); gs.events.on('create', bind);

    const labelStyle = uiText(12, '#99aabb', true);
    const valueStyle = uiText(13, '#ccddee');

    // HP
    const hpLabel = this.add.text(this.BX, 20, 'HP', labelStyle);
    applyTextShadow(hpLabel);
    this.add.rectangle(this.BX + 38 + this.BW / 2, 28, this.BW, 18, COLOR_BAR_BG, 0.75);
    this.hpBarFill = this.add.rectangle(this.BX + 38, 28, this.BW, 14, COLOR_HP_BAR, 1).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.BX + 38 + this.BW + 10, 20, '100 / 100', valueStyle);
    applyTextShadow(this.hpText);

    // MP
    const mpLabel = this.add.text(this.BX, 48, 'MP', labelStyle);
    applyTextShadow(mpLabel);
    this.add.rectangle(this.BX + 38 + this.BW / 2, 56, this.BW, 18, COLOR_BAR_BG, 0.75);
    this.manaBarFill = this.add.rectangle(this.BX + 38, 56, this.BW, 14, COLOR_MANA_BAR, 1).setOrigin(0, 0.5);
    this.manaText = this.add.text(this.BX + 38 + this.BW + 10, 48, '100 / 100', valueStyle);
    applyTextShadow(this.manaText);

    // Controls
    const controls = this.add.text(
      ROOM_WIDTH - 24, 20,
      'WASD — Move\nMouse — Aim\nClick — Cast\n1–3 — Slot\nTAB — Grimoire\nR — Restart',
      { ...uiText(11, '#667788'), lineSpacing: 4, align: 'right' },
    ).setOrigin(1, 0);
    applyTextShadow(controls);

    this.spellSlotBar = new SpellSlotBar(this, ROOM_HEIGHT - 52);
    this.spellSlotBar.buildSlots(SPELL_SLOT_COUNT);
  }

  private updateHud(): void {
    if (!this.player) return;
    this.hpBarFill.width = this.BW * Math.max(0, this.player.hp / this.player.maxHp);
    this.manaBarFill.width = this.BW * Math.max(0, this.player.mana / this.player.maxMana);
    this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp}`);
    this.manaText.setText(`${Math.ceil(this.player.mana)} / ${this.player.maxMana}`);

    if (this.grimoireSystem) {
      this.spellSlotBar.update(this.grimoireSystem.slots, this.grimoireSystem.activeSlotIndex);
    }
  }
}
