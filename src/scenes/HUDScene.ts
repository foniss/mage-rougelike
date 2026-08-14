// src/scenes/HUDScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ROOM_WIDTH, COLOR_HP_BAR, COLOR_MANA_BAR, COLOR_BAR_BG } from '../config/constants';

export class HUDScene extends Phaser.Scene {
  private player: Player | null = null;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private manaBarFill!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;
  private spellNameText!: Phaser.GameObjects.Text;
  private spellDot!: Phaser.GameObjects.Circle;
  private spellDetailText!: Phaser.GameObjects.Text;
  private spellHintText!: Phaser.GameObjects.Text;
  private readonly BW = 200;
  private readonly BX = 20;

  constructor() { super({ key: 'HUDScene' }); }
  init(data: { player: Player }): void { this.player = data.player; }

  create(): void {
    this.events.on('set-player', (p: Player) => { this.player = p; });
    const gs = this.scene.get('GameScene');
    const bind = () => gs.events.on('update-hud', this.updateBars, this);
    bind(); gs.events.on('create', bind);

    const ls = { fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888888' };
    const vs = { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#aaaaaa' };

    const hpY = 16;
    this.add.text(this.BX, hpY, 'HP', ls);
    this.add.rectangle(this.BX + 35 + this.BW / 2, hpY + 8, this.BW, 16, COLOR_BAR_BG, 0.8);
    this.hpBarFill = this.add.rectangle(this.BX + 35, hpY + 8, this.BW, 12, COLOR_HP_BAR, 1).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.BX + 35 + this.BW + 8, hpY + 1, '100/100', vs);

    const mY = 40;
    this.add.text(this.BX, mY, 'MP', ls);
    this.add.rectangle(this.BX + 35 + this.BW / 2, mY + 8, this.BW, 16, COLOR_BAR_BG, 0.8);
    this.manaBarFill = this.add.rectangle(this.BX + 35, mY + 8, this.BW, 12, COLOR_MANA_BAR, 1).setOrigin(0, 0.5);
    this.manaText = this.add.text(this.BX + 35 + this.BW + 8, mY + 1, '100/100', vs);

    const sY = 72;
    this.add.rectangle(this.BX + 125, sY + 26, 250, 56, 0x111122, 0.6).setStrokeStyle(1, 0x333355, 0.4);
    this.add.text(this.BX + 8, sY + 2, 'PREPARED:', { fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#666688', fontStyle: 'bold' });
    this.spellDot = this.add.circle(this.BX + 8, sY + 24, 5, 0x00d4ff, 1).setAlpha(0);
    this.spellNameText = this.add.text(this.BX + 20, sY + 17, 'None', { fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#555566' });
    this.spellDetailText = this.add.text(this.BX + 20, sY + 33, '', { fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555577' });
    this.spellHintText = this.add.text(this.BX + 20, sY + 45, '', { fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#444466' });

    this.add.text(ROOM_WIDTH - 230, 10,
      'WASD / Arrows  — Move\nMouse          — Aim\nLeft Click     — Attack/Cast\nTAB            — Grimoire\nR              — Restart',
      { fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#555566', lineSpacing: 4 });
  }

  private updateBars(): void {
    if (!this.player) return;
    this.hpBarFill.width = this.BW * Math.max(0, this.player.hp / this.player.maxHp);
    this.manaBarFill.width = this.BW * Math.max(0, this.player.mana / this.player.maxMana);
    this.hpText.setText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    this.manaText.setText(`${Math.ceil(this.player.mana)}/${this.player.maxMana}`);

    const spell = this.player.preparedSpell;
    if (spell) {
      const hex = '#' + spell.visual.color.toString(16).padStart(6, '0');
      this.spellNameText.setText(spell.name).setColor(hex);
      this.spellDot.setFillStyle(spell.visual.color, 1).setAlpha(1);
      const parts = [`DMG:${spell.damage}`, `MP:${spell.manaCost}`, `CD:${spell.cooldown}ms`];
      if (spell.statusEffect.type !== 'none') parts.push(spell.statusEffect.type.toUpperCase());
      this.spellDetailText.setText(parts.join('  ')).setAlpha(1);
      this.spellHintText.setText('Click to cast').setAlpha(1);
    } else {
      this.spellNameText.setText('None').setColor('#555566');
      this.spellDot.setAlpha(0);
      this.spellDetailText.setText('').setAlpha(0);
      this.spellHintText.setText('TAB to open Grimoire').setAlpha(0.6);
    }
  }
}