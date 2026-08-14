// src/ui/SpellPreview.ts
//
// Shows the assembled spell name, stats, and effects.
// Updates in real-time as slots change.

import Phaser from 'phaser';
import { Spell } from '../systems/SpellBuilder';

export class SpellPreview {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private x: number;
  private y: number;

  private bg!: Phaser.GameObjects.Rectangle;
  private border!: Phaser.GameObjects.Rectangle;
  private spellNameText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private effectsHeaderText!: Phaser.GameObjects.Text;
  private effectsText!: Phaser.GameObjects.Text;
  private errorText!: Phaser.GameObjects.Text;
  private errorSuggestionText!: Phaser.GameObjects.Text;
  private validIcon!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.container = scene.add.container(x, y).setDepth(220);
    this.create();
  }

  private create(): void {
    const w = 440;
    const h = 170;

    // Background
    this.bg = this.scene.add.rectangle(0, 0, w, h, 0x0a0818, 0.9);
    this.container.add(this.bg);

    // Border
    this.border = this.scene.add.rectangle(0, 0, w, h);
    this.border.setFillStyle(0x000000, 0);
    this.border.setStrokeStyle(1, 0x3a2f5a, 0.4);
    this.container.add(this.border);

    // Valid/Invalid icon
    this.validIcon = this.scene.add.text(-w / 2 + 14, -h / 2 + 10, '◆', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#555566',
    });
    this.container.add(this.validIcon);

    // Spell name
    this.spellNameText = this.scene.add.text(0, -h / 2 + 14, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: '#888899',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(this.spellNameText);

    // Separator
    const sep = this.scene.add.rectangle(0, -h / 2 + 38, w - 40, 1, 0x3a2f5a, 0.3);
    this.container.add(sep);

    // Stats line
    this.statsText = this.scene.add.text(-w / 2 + 20, -h / 2 + 46, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#777799',
      lineSpacing: 3,
    });
    this.container.add(this.statsText);

    // Effects header
    this.effectsHeaderText = this.scene.add.text(-w / 2 + 20, -h / 2 + 90, 'Effects:', {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      color: '#666688',
      fontStyle: 'bold',
    });
    this.container.add(this.effectsHeaderText);

    // Effects list
    this.effectsText = this.scene.add.text(-w / 2 + 20, -h / 2 + 104, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      color: '#888899',
      lineSpacing: 2,
    });
    this.container.add(this.effectsText);

    // Error message (shown when invalid)
    this.errorText = this.scene.add.text(0, -10, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#ff5555',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.errorText);

    // Error suggestion
    this.errorSuggestionText = this.scene.add.text(0, 12, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#887766',
      align: 'center',
      wordWrap: { width: w - 40 },
    }).setOrigin(0.5, 0);
    this.container.add(this.errorSuggestionText);

    this.showEmpty();
  }

  showSpell(spell: Spell): void {
    this.showValid();

    // Name with color
    const colorHex = '#' + spell.visual.color.toString(16).padStart(6, '0');
    this.spellNameText.setText(spell.name).setColor(colorHex);

    // Stats
    const cdSeconds = (spell.cooldown / 1000).toFixed(2);
    const statsLines = [
      `Mana Cost: ${spell.manaCost}`,
      `Cooldown:  ${cdSeconds}s`,
      `Damage:    ${spell.damage}`,
      `Targeting: ${spell.targetingType.charAt(0).toUpperCase() + spell.targetingType.slice(1)}`,
    ];
    this.statsText.setText(statsLines.join('\n'));

    // Effects list
    const effects: string[] = [];

    // Core effect
    if (spell.statusEffect.type !== 'none') {
      const effectName = spell.statusEffect.type.charAt(0).toUpperCase() + spell.statusEffect.type.slice(1);
      effects.push(`• ${effectName} (${spell.core.displayName})`);
    }

    // Prefix effect
    if (spell.prefix) {
      effects.push(`• ${spell.prefix.displayName} (${spell.prefix.behavior.type})`);
    }

    // Suffix effect
    if (spell.suffix) {
      effects.push(`• ${spell.suffix.displayName} (${spell.suffix.behavior.type})`);
    }

    this.effectsHeaderText.setVisible(effects.length > 0);
    this.effectsText.setText(effects.join('\n'));

    this.border.setStrokeStyle(1.5, spell.visual.color, 0.4);
    this.validIcon.setText('✦').setColor(colorHex);
  }

  showError(error: string, suggestion?: string): void {
    this.spellNameText.setText('Invalid Combination').setColor('#ff5555');
    this.statsText.setText('');
    this.effectsHeaderText.setVisible(false);
    this.effectsText.setText('');

    this.errorText.setText(error).setAlpha(1);
    if (suggestion) {
      this.errorSuggestionText.setText(suggestion).setAlpha(0.8);
    } else {
      this.errorSuggestionText.setText('').setAlpha(0);
    }

    this.border.setStrokeStyle(1.5, 0xff4444, 0.5);
    this.validIcon.setText('✕').setColor('#ff4444');
  }

  showEmpty(): void {
    this.spellNameText.setText('Select Core + Form').setColor('#555566');
    this.statsText.setText('');
    this.effectsHeaderText.setVisible(false);
    this.effectsText.setText('');
    this.errorText.setText('').setAlpha(0);
    this.errorSuggestionText.setText('').setAlpha(0);
    this.border.setStrokeStyle(1, 0x3a2f5a, 0.3);
    this.validIcon.setText('◆').setColor('#555566');
  }

  private showValid(): void {
    this.errorText.setText('').setAlpha(0);
    this.errorSuggestionText.setText('').setAlpha(0);
  }

  destroy(): void {
    this.container.destroy();
  }
}