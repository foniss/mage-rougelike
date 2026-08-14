// src/scenes/HUDScene.ts

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ROOM_WIDTH, COLOR_HP_BAR, COLOR_MANA_BAR, COLOR_BAR_BG } from '../config/constants';

export class HUDScene extends Phaser.Scene {
  private player: Player | null = null;

  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;

  private manaBarBg!: Phaser.GameObjects.Rectangle;
  private manaBarFill!: Phaser.GameObjects.Rectangle;
  private manaText!: Phaser.GameObjects.Text;

  private spellNameText!: Phaser.GameObjects.Text;
  private spellDot!: Phaser.GameObjects.Circle;
  private spellHintText!: Phaser.GameObjects.Text;
  private spellDetailText!: Phaser.GameObjects.Text;

  private readonly BAR_WIDTH = 200;
  private readonly BAR_HEIGHT = 16;
  private readonly BAR_X = 20;

  constructor() {
    super({ key: 'HUDScene' });
  }

  init(data: { player: Player }): void {
    this.player = data.player;
  }

  create(): void {
    this.events.on('set-player', (p: Player) => { this.player = p; });

    const gameScene = this.scene.get('GameScene');
    const bindHud = () => gameScene.events.on('update-hud', this.updateBars, this);
    bindHud();
    gameScene.events.on('create', bindHud);

    const labelStyle = { fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#888888' };
    const valueStyle = { fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#aaaaaa' };

    // ── HP ──
    const hpY = 16;
    this.add.text(this.BAR_X, hpY, 'HP', labelStyle);
    this.hpBarBg = this.add.rectangle(
      this.BAR_X + 35 + this.BAR_WIDTH / 2, hpY + 8,
      this.BAR_WIDTH, this.BAR_HEIGHT, COLOR_BAR_BG, 0.8
    );
    this.hpBarFill = this.add.rectangle(
      this.BAR_X + 35, hpY + 8,
      this.BAR_WIDTH, this.BAR_HEIGHT - 4, COLOR_HP_BAR, 1
    ).setOrigin(0, 0.5);
    this.hpText = this.add.text(this.BAR_X + 35 + this.BAR_WIDTH + 8, hpY + 1, '100/100', valueStyle);

    // ── Mana ──
    const manaY = 40;
    this.add.text(this.BAR_X, manaY, 'MP', labelStyle);
    this.manaBarBg = this.add.rectangle(
      this.BAR_X + 35 + this.BAR_WIDTH / 2, manaY + 8,
      this.BAR_WIDTH, this.BAR_HEIGHT, COLOR_BAR_BG, 0.8
    );
    this.manaBarFill = this.add.rectangle(
      this.BAR_X + 35, manaY + 8,
      this.BAR_WIDTH, this.BAR_HEIGHT - 4, COLOR_MANA_BAR, 1
    ).setOrigin(0, 0.5);
    this.manaText = this.add.text(this.BAR_X + 35 + this.BAR_WIDTH + 8, manaY + 1, '100/100', valueStyle);

    // ── Prepared Spell ──
    const spellY = 72;
    this.add.rectangle(this.BAR_X + 125, spellY + 26, 250, 56, 0x111122, 0.6)
      .setStrokeStyle(1, 0x333355, 0.4);

    this.add.text(this.BAR_X + 8, spellY + 2, 'PREPARED:', {
      fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#666688', fontStyle: 'bold',
    });

    this.spellDot = this.add.circle(this.BAR_X + 8, spellY + 24, 5, 0x00d4ff, 1).setAlpha(0);

    this.spellNameText = this.add.text(this.BAR_X + 20, spellY + 17, 'None', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#555566',
    });

    this.spellDetailText = this.add.text(this.BAR_X + 20, spellY + 33, '', {
      fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555577',
    });

    this.spellHintText = this.add.text(this.BAR_X + 20, spellY + 45, '', {
      fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#444466',
    });

    // ── Controls ──
    this.add.text(ROOM_WIDTH - 230, 10,
      'WASD / Arrows  — Move\nMouse          — Aim\nLeft Click     — Attack / Cast\nTAB            — Grimoire\nR              — Restart',
      { fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#555566', lineSpacing: 4 }
    );
  }

  private updateBars(): void {
    if (!this.player) return;

    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    const manaRatio = Math.max(0, this.player.mana / this.player.maxMana);

    this.hpBarFill.width = this.BAR_WIDTH * hpRatio;
    this.manaBarFill.width = this.BAR_WIDTH * manaRatio;

    this.hpText.setText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    this.manaText.setText(`${Math.ceil(this.player.mana)}/${this.player.maxMana}`);

    const spell = this.player.preparedSpell;
    if (spell) {
      const colorHex = '#' + spell.visual.color.toString(16).padStart(6, '0');
      this.spellNameText.setText(spell.name).setColor(colorHex);
      this.spellDot.setFillStyle(spell.visual.color, 1).setAlpha(1);

      // Build detail line
      const parts: string[] = [];
      parts.push(`DMG:${spell.damage}`);
      parts.push(`MP:${spell.manaCost}`);
      parts.push(`CD:${spell.cooldown}ms`);
      if (spell.statusEffect.type !== 'none') {
        parts.push(spell.statusEffect.type.toUpperCase());
      }
      this.spellDetailText.setText(parts.join('  ')).setAlpha(1);

      this.spellHintText.setText('Click enemy to cast').setAlpha(1);
    } else {
      this.spellNameText.setText('None').setColor('#555566');
      this.spellDot.setAlpha(0);
      this.spellDetailText.setText('').setAlpha(0);
      this.spellHintText.setText('TAB to open Grimoire').setAlpha(0.6);
    }
  }
}