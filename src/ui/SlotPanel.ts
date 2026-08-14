// src/ui/SlotPanel.ts
//
// A single spell component slot: PREFIX, CORE, FORM, or SUFFIX.
// Shows the selected component with name, icon, description, mana cost.
// Highlights when active, dims when empty, flashes red when invalid.

import Phaser from 'phaser';

export interface SlotConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  required: boolean;
  accentColor: number;
}

export interface SlotContent {
  id: string;
  displayName: string;
  description: string;
  manaCost: number;
  color: number;
}

export class SlotPanel {
  private scene: Phaser.Scene;
  private config: SlotConfig;
  private container: Phaser.GameObjects.Container;

  private bg!: Phaser.GameObjects.Rectangle;
  private border!: Phaser.GameObjects.Rectangle;
  private labelText!: Phaser.GameObjects.Text;
  private nameText!: Phaser.GameObjects.Text;
  private descText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private iconCircle!: Phaser.GameObjects.Arc;
  private emptyText!: Phaser.GameObjects.Text;
  private errorIndicator!: Phaser.GameObjects.Rectangle;

  private content: SlotContent | null = null;
  private hasError: boolean = false;
  private isActive: boolean = false;

  constructor(scene: Phaser.Scene, config: SlotConfig) {
    this.scene = scene;
    this.config = config;
    this.container = scene.add.container(config.x, config.y).setDepth(220);
    this.create();
  }

  private create(): void {
    const { width: w, height: h } = this.config;
    const hw = w / 2;

    // Background
    this.bg = this.scene.add.rectangle(0, 0, w, h, 0x0e0c1a, 0.9);
    this.container.add(this.bg);

    // Border
    this.border = this.scene.add.rectangle(0, 0, w, h);
    this.border.setFillStyle(0x000000, 0);
    this.border.setStrokeStyle(1, 0x3a2f5a, 0.5);
    this.container.add(this.border);

    // Error indicator (top bar)
    this.errorIndicator = this.scene.add.rectangle(0, -h / 2 + 2, w - 4, 3, 0xff4444, 0);
    this.container.add(this.errorIndicator);

    // Slot label (PREFIX, CORE, FORM, SUFFIX)
    const labelColor = this.config.required ? '#aa8888' : '#666677';
    this.labelText = this.scene.add.text(0, -h / 2 + 10, this.config.label, {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      color: labelColor,
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(this.labelText);

    // Required indicator
    if (this.config.required) {
      const reqDot = this.scene.add.text(hw - 8, -h / 2 + 8, '*', {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: '#ff6666',
      }).setOrigin(0.5, 0);
      this.container.add(reqDot);
    }

    // Icon circle
    this.iconCircle = this.scene.add.circle(0, -4, 10, 0x333355, 0.5);
    this.container.add(this.iconCircle);

    // Component name
    this.nameText = this.scene.add.text(0, 14, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#ccccee',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(this.nameText);

    // Description
    this.descText = this.scene.add.text(0, 30, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      color: '#666688',
      wordWrap: { width: w - 16 },
      align: 'center',
    }).setOrigin(0.5, 0);
    this.container.add(this.descText);

    // Mana cost
    this.manaText = this.scene.add.text(0, h / 2 - 16, '', {
      fontFamily: '"Courier New", monospace',
      fontSize: '9px',
      color: '#4488cc',
    }).setOrigin(0.5, 0);
    this.container.add(this.manaText);

    // Empty state text
    const emptyLabel = this.config.required ? '— empty —' : '— none —';
    this.emptyText = this.scene.add.text(0, 8, emptyLabel, {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#444455',
      fontStyle: 'italic',
    }).setOrigin(0.5, 0.5);
    this.container.add(this.emptyText);

    this.showEmpty();
  }

  setContent(content: SlotContent | null): void {
    this.content = content;
    this.hasError = false;

    if (!content) {
      this.showEmpty();
    } else {
      this.showFilled(content);
    }
  }

  setError(message: string): void {
    this.hasError = true;
    this.errorIndicator.setAlpha(1);
    this.border.setStrokeStyle(1.5, 0xff4444, 0.8);
    this.bg.setFillStyle(0x1a0c0c, 0.95);
  }

  clearError(): void {
    this.hasError = false;
    this.errorIndicator.setAlpha(0);

    if (this.content) {
      this.border.setStrokeStyle(1.5, this.content.color, 0.5);
      this.bg.setFillStyle(0x0e0c1a, 0.9);
    } else {
      this.border.setStrokeStyle(1, 0x3a2f5a, 0.3);
      this.bg.setFillStyle(0x0e0c1a, 0.7);
    }
  }

  setActive(active: boolean): void {
    this.isActive = active;
    if (active && !this.hasError) {
      this.border.setStrokeStyle(2, this.config.accentColor, 0.8);

      // Subtle glow pulse
      this.scene.tweens.add({
        targets: this.bg,
        alpha: { from: 0.85, to: 1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.killTweensOf(this.bg);
      this.bg.setAlpha(1);
    }
  }

  private showEmpty(): void {
    this.emptyText.setVisible(true);
    this.nameText.setVisible(false);
    this.descText.setVisible(false);
    this.manaText.setVisible(false);
    this.iconCircle.setFillStyle(0x222233, 0.3);
    this.border.setStrokeStyle(1, 0x3a2f5a, 0.3);
    this.bg.setFillStyle(0x0e0c1a, 0.7);
    this.errorIndicator.setAlpha(0);
  }

  private showFilled(content: SlotContent): void {
    this.emptyText.setVisible(false);
    this.nameText.setVisible(true).setText(content.displayName.toUpperCase());
    this.descText.setVisible(true).setText(content.description);
    this.manaText.setVisible(true).setText(`+${content.manaCost} MP`);

    const colorHex = '#' + content.color.toString(16).padStart(6, '0');
    this.nameText.setColor(colorHex);
    this.iconCircle.setFillStyle(content.color, 0.7);
    this.border.setStrokeStyle(1.5, content.color, 0.5);
    this.bg.setFillStyle(0x0e0c1a, 0.9);
    this.errorIndicator.setAlpha(0);
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.bg);
    this.container.destroy();
  }
}