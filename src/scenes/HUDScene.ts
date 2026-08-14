// src/scenes/HUDScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellSlotBar } from '../ui/SpellSlotBar';
import { ROOM_WIDTH, COLOR_HP_BAR, COLOR_MANA_BAR, COLOR_BAR_BG, SPELL_SLOT_COUNT } from '../config/constants';

export class HUDScene extends Phaser.Scene {
  private player: Player | null = null;
  private grimoireSystem: GrimoireSystem | null = null;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaBarFill!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private spellSlotBar!: SpellSlotBar;
  private readonly BW = 200;
  private readonly BX = 20;

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

    const ls = { fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888888' };
    const vs = { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#aaaaaa' };

    // HP
    this.add.text(this.BX, 16, 'HP', ls);
    this.add.rectangle(this.BX + 35 + this.BW / 2, 24, this.BW, 16, COLOR_BAR_BG, 0.8);
    this.hpBarFill = this.add.rectangle(this.BX + 35, 24, this.BW, 12, COLOR_HP_BAR, 1).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.BX + 35 + this.BW + 8, 17, '100/100', vs);

    // MP
    this.add.text(this.BX, 40, 'MP', ls);
    this.add.rectangle(this.BX + 35 + this.BW / 2, 48, this.BW, 16, COLOR_BAR_BG, 0.8);
    this.manaBarFill = this.add.rectangle(this.BX + 35, 48, this.BW, 12, COLOR_MANA_BAR, 1).setOrigin(0, 0.5);
    this.manaText = this.add.text(this.BX + 35 + this.BW + 8, 41, '100/100', vs);

    // Controls
    this.add.text(ROOM_WIDTH - 220, 10,
      'WASD       — Move\nMouse      — Aim\nLeft Click — Cast\n1/2/3      — Slot\nTAB        — Grimoire\nR          — Restart',
      { fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555566', lineSpacing: 3 });

    // Spell slot bar at bottom
    this.spellSlotBar = new SpellSlotBar(this, 730);
    this.spellSlotBar.buildSlots(SPELL_SLOT_COUNT);
  }

  private updateHud(): void {
    if (!this.player) return;
    this.hpBarFill.width = this.BW * Math.max(0, this.player.hp / this.player.maxHp);
    this.manaBarFill.width = this.BW * Math.max(0, this.player.mana / this.player.maxMana);
    this.hpText.setText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    this.manaText.setText(`${Math.ceil(this.player.mana)}/${this.player.maxMana}`);

    if (this.grimoireSystem) {
      this.spellSlotBar.update(this.grimoireSystem.slots, this.grimoireSystem.activeSlotIndex);
    }
  }
}