// src/ui/DevArenaControls.ts
//
// Arena configuration controls for the dev test scene.

import Phaser from 'phaser';

export interface ArenaConfig {
  basicEnemyCount: number;
  tankyEnemyCount: number;
  groupedEnemyCount: number;
  staticEnemies: boolean;
  infiniteMana: boolean;
  noCooldowns: boolean;
}

export class DevArenaControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: ArenaConfig;
  private onReset: (config: ArenaConfig) => void;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    onReset: (config: ArenaConfig) => void,
  ) {
    this.scene = scene;
    this.onReset = onReset;
    this.config = {
      basicEnemyCount: 3,
      tankyEnemyCount: 1,
      groupedEnemyCount: 5,
      staticEnemies: true,
      infiniteMana: true,
      noCooldowns: false,
    };
    this.container = scene.add.container(x, y).setDepth(100);
    this.create();
  }

  private create(): void {
    const panelW = 200;
    const bg = this.scene.add.rectangle(0, 0, panelW, 320, 0x0c0a18, 0.95);
    bg.setOrigin(0, 0).setStrokeStyle(1, 0x3a2f5a, 0.6);
    this.container.add(bg);

    this.addText(panelW / 2, 10, '⚙ ARENA', 12, '#ccbbee', true).setOrigin(0.5, 0);
    this.addLine(10, 28, panelW - 20);

    let dy = 38;

    // Toggles
    dy = this.addToggle(dy, 'Static Enemies', this.config.staticEnemies, (v) => { this.config.staticEnemies = v; });
    dy = this.addToggle(dy, 'Infinite Mana', this.config.infiniteMana, (v) => { this.config.infiniteMana = v; });
    dy = this.addToggle(dy, 'No Cooldowns', this.config.noCooldowns, (v) => { this.config.noCooldowns = v; });

    dy += 8;
    this.addLine(10, dy, panelW - 20);
    dy += 12;

    // Counters
    dy = this.addCounter(dy, 'Basic Enemies', this.config.basicEnemyCount, 0, 10,
      (v) => { this.config.basicEnemyCount = v; });
    dy = this.addCounter(dy, 'Tanky Enemies', this.config.tankyEnemyCount, 0, 5,
      (v) => { this.config.tankyEnemyCount = v; });
    dy = this.addCounter(dy, 'Grouped Enemies', this.config.groupedEnemyCount, 0, 15,
      (v) => { this.config.groupedEnemyCount = v; });

    dy += 10;
    this.addLine(10, dy, panelW - 20);
    dy += 14;

    // Reset button
    const resetBtn = this.scene.add.rectangle(panelW / 2, dy + 12, panelW - 20, 28, 0x332222, 0.8);
    resetBtn.setStrokeStyle(1, 0xaa4444, 0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    this.container.add(resetBtn);

    const resetTxt = this.addText(panelW / 2, dy + 12, '↻ RESET ARENA', 10, '#aa6666', true);
    resetTxt.setOrigin(0.5);

    resetBtn.on('pointerdown', () => {
      this.onReset(this.config);
      resetBtn.setFillStyle(0x553333, 1);
      this.scene.time.delayedCall(100, () => resetBtn.setFillStyle(0x332222, 0.8));
    });

    dy += 38;

    // Exit hint
    this.addText(panelW / 2, dy, 'F12 = Exit Test Mode', 8, '#555566').setOrigin(0.5, 0);
  }

  getConfig(): ArenaConfig {
    return { ...this.config };
  }

  private addToggle(y: number, label: string, initial: boolean, onChange: (v: boolean) => void): number {
    let value = initial;

    const txt = this.addText(10, y, label, 9, '#888899');

    const boxSize = 14;
    const box = this.scene.add.rectangle(175, y + 6, boxSize, boxSize, value ? 0x44aa44 : 0x333344, 0.8);
    box.setStrokeStyle(1, 0x555566, 0.5);
    box.setInteractive({ useHandCursor: true });
    this.container.add(box);

    const check = this.addText(175, y + 6, value ? '✓' : '', 10, '#ffffff');
    check.setOrigin(0.5);

    box.on('pointerdown', () => {
      value = !value;
      box.setFillStyle(value ? 0x44aa44 : 0x333344, 0.8);
      check.setText(value ? '✓' : '');
      onChange(value);
    });

    return y + 24;
  }

  private addCounter(
    y: number, label: string,
    initial: number, min: number, max: number,
    onChange: (v: number) => void,
  ): number {
    let value = initial;

    this.addText(10, y, label, 9, '#888899');

    const valueText = this.addText(155, y + 1, String(value), 10, '#aaaacc', true);
    valueText.setOrigin(0.5, 0);

    // Minus button
    const minusBtn = this.scene.add.rectangle(130, y + 7, 16, 16, 0x333344, 0.8);
    minusBtn.setStrokeStyle(1, 0x555566, 0.3);
    minusBtn.setInteractive({ useHandCursor: true });
    this.container.add(minusBtn);
    this.addText(130, y + 7, '-', 10, '#aaaaaa').setOrigin(0.5);

    // Plus button
    const plusBtn = this.scene.add.rectangle(180, y + 7, 16, 16, 0x333344, 0.8);
    plusBtn.setStrokeStyle(1, 0x555566, 0.3);
    plusBtn.setInteractive({ useHandCursor: true });
    this.container.add(plusBtn);
    this.addText(180, y + 7, '+', 10, '#aaaaaa').setOrigin(0.5);

    minusBtn.on('pointerdown', () => {
      if (value > min) { value--; valueText.setText(String(value)); onChange(value); }
    });
    plusBtn.on('pointerdown', () => {
      if (value < max) { value++; valueText.setText(String(value)); onChange(value); }
    });

    return y + 26;
  }

  private addText(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace', fontSize: size + 'px',
      color, fontStyle: bold ? 'bold' : 'normal',
    });
    this.container.add(t);
    return t;
  }

  private addLine(x: number, y: number, width: number): void {
    const line = this.scene.add.rectangle(x + width / 2, y, width, 1, 0x3a2f5a, 0.3);
    this.container.add(line);
  }

  destroy(): void {
    this.container.destroy();
  }
}