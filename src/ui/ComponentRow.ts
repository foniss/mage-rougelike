// src/ui/ComponentRow.ts
// A horizontal row of clickable component buttons for one slot type.

import Phaser from 'phaser';
import { uiText, applyTextShadow } from '../config/uiStyles';

export interface ComponentOption {
  id: string | null;
  displayName: string;
  description: string;
  manaCost: number;
  color: number;
  compatible: boolean;
  incompatReason?: string;
}

export class ComponentRow {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private buttons: {
    bg: Phaser.GameObjects.Rectangle;
    border: Phaser.GameObjects.Rectangle;
    icon: Phaser.GameObjects.Arc;
    label: Phaser.GameObjects.Text;
    mana: Phaser.GameObjects.Text;
    option: ComponentOption;
  }[] = [];
  private selectedId: string | null = null;
  private onSelect: (opt: ComponentOption) => void;

  constructor(
    scene: Phaser.Scene, x: number, y: number,
    label: string, required: boolean, labelColor: string,
    options: ComponentOption[],
    onSelect: (opt: ComponentOption) => void,
  ) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.container = scene.add.container(x, y).setDepth(220);

    const reqMark = required ? ' *' : '';
    const lbl = scene.add.text(0, -20, label + reqMark, uiText(13, labelColor, true));
    applyTextShadow(lbl);
    this.container.add(lbl);

    const btnW = 86;
    const btnH = 64;
    const gap = 8;
    let bx = 0;

    for (const opt of options) {
      const hex = '#' + opt.color.toString(16).padStart(6, '0');
      const dimHex = opt.compatible ? hex : '#666677';

      const bg = scene.add.rectangle(bx + btnW / 2, btnH / 2, btnW, btnH, 0x12101c, 0.55);
      this.container.add(bg);

      const border = scene.add.rectangle(bx + btnW / 2, btnH / 2, btnW, btnH);
      border.setFillStyle(0, 0);
      border.setStrokeStyle(1, opt.compatible ? opt.color : 0x444455, opt.compatible ? 0.45 : 0.2);
      this.container.add(border);

      const icon = scene.add.circle(bx + btnW / 2, 18, 9,
        opt.id ? opt.color : 0x444455, opt.compatible ? 0.65 : 0.2);
      this.container.add(icon);

      const nameText = scene.add.text(bx + btnW / 2, 34, opt.displayName, uiText(11, dimHex, true))
        .setOrigin(0.5, 0);
      applyTextShadow(nameText);
      this.container.add(nameText);

      const manaStr = opt.id ? `+${opt.manaCost} MP` : '';
      const manaText = scene.add.text(bx + btnW / 2, 50, manaStr, uiText(10, '#66aacc'))
        .setOrigin(0.5, 0);
      applyTextShadow(manaText);
      this.container.add(manaText);

      bg.setInteractive({ useHandCursor: opt.compatible });
      bg.on('pointerover', () => {
        if (opt.compatible) bg.setFillStyle(0x1e1a30, 0.72);
      });
      bg.on('pointerout', () => {
        const selected = this.selectedId === opt.id;
        bg.setFillStyle(selected ? 0x221e38 : 0x12101c, selected ? 0.72 : 0.55);
      });
      bg.on('pointerdown', () => {
        if (!opt.compatible && opt.id !== null) return;
        this.select(opt);
      });

      this.buttons.push({ bg, border, icon, label: nameText, mana: manaText, option: opt });
      bx += btnW + gap;
    }
  }

  select(opt: ComponentOption): void {
    this.selectedId = opt.id;
    this.updateVisuals();
    this.onSelect(opt);
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
    this.updateVisuals();
  }

  updateCompatibility(compatCheck: (id: string | null) => boolean): void {
    for (const btn of this.buttons) {
      const compat = compatCheck(btn.option.id);
      btn.option.compatible = compat;
      const hex = '#' + btn.option.color.toString(16).padStart(6, '0');
      btn.label.setColor(compat ? hex : '#666677');
      btn.icon.setAlpha(compat ? 0.65 : 0.2);
      btn.border.setStrokeStyle(1, compat ? btn.option.color : 0x444455, compat ? 0.45 : 0.2);
      if (compat) {
        btn.bg.setInteractive({ useHandCursor: true });
      } else if (btn.option.id !== null) {
        btn.bg.disableInteractive();
      }
    }
  }

  private updateVisuals(): void {
    for (const btn of this.buttons) {
      const selected = this.selectedId === btn.option.id;
      btn.bg.setFillStyle(selected ? 0x221e38 : 0x12101c, selected ? 0.72 : 0.55);
      btn.border.setStrokeStyle(
        selected ? 2 : 1,
        selected ? 0xffffff : (btn.option.compatible ? btn.option.color : 0x444455),
        selected ? 0.75 : (btn.option.compatible ? 0.45 : 0.2),
      );
      btn.icon.setAlpha(selected ? 1 : (btn.option.compatible ? 0.65 : 0.2));

      if (selected && btn.option.id !== null) {
        btn.icon.setStrokeStyle(1.5, 0xffffff, 0.7);
      } else {
        btn.icon.setStrokeStyle(0);
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
