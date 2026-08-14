// src/ui/ComponentRow.ts
// A horizontal row of clickable component buttons for one slot type.

import Phaser from 'phaser';

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

    // Row label
    const reqMark = required ? ' *' : '';
    scene.add.text(0, 0, label + reqMark, {
      fontFamily: '"Courier New", monospace', fontSize: '10px',
      color: labelColor, fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    // Note: we add to scene directly, not container, because container is positioned

    // Actually let's put label in container
    const lbl = scene.add.text(0, -18, label + reqMark, {
      fontFamily: '"Courier New", monospace', fontSize: '10px',
      color: labelColor, fontStyle: 'bold',
    });
    this.container.add(lbl);

    const btnW = 80;
    const btnH = 58;
    const gap = 6;
    let bx = 0;

    for (const opt of options) {
      const hex = '#' + opt.color.toString(16).padStart(6, '0');
      const dimHex = opt.compatible ? hex : '#444455';

      const bg = scene.add.rectangle(bx + btnW / 2, btnH / 2, btnW, btnH, 0x0e0c1a, 0.85);
      this.container.add(bg);

      const border = scene.add.rectangle(bx + btnW / 2, btnH / 2, btnW, btnH);
      border.setFillStyle(0, 0);
      border.setStrokeStyle(1, opt.compatible ? opt.color : 0x333344, opt.compatible ? 0.3 : 0.15);
      this.container.add(border);

      // Icon circle
      const icon = scene.add.circle(bx + btnW / 2, 16, 8,
        opt.id ? opt.color : 0x333344, opt.compatible ? 0.5 : 0.15);
      this.container.add(icon);

      // Name
      const nameText = scene.add.text(bx + btnW / 2, 32, opt.displayName, {
        fontFamily: '"Courier New", monospace', fontSize: '8px',
        color: dimHex, fontStyle: 'bold',
      }).setOrigin(0.5, 0);
      this.container.add(nameText);

      // Mana cost
      const manaStr = opt.id ? `+${opt.manaCost}` : '';
      const manaText = scene.add.text(bx + btnW / 2, 46, manaStr, {
        fontFamily: '"Courier New", monospace', fontSize: '7px', color: '#4488aa',
      }).setOrigin(0.5, 0);
      this.container.add(manaText);

      // Interactive
      bg.setInteractive({ useHandCursor: opt.compatible });
      bg.on('pointerover', () => {
        if (opt.compatible) bg.setFillStyle(0x1a1833, 0.95);
      });
      bg.on('pointerout', () => {
        const selected = this.selectedId === opt.id;
        bg.setFillStyle(selected ? 0x1a1a33 : 0x0e0c1a, selected ? 0.95 : 0.85);
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
      btn.label.setColor(compat ? hex : '#444455');
      btn.icon.setAlpha(compat ? 0.5 : 0.15);
      btn.border.setStrokeStyle(1, compat ? btn.option.color : 0x333344, compat ? 0.3 : 0.15);
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
      btn.bg.setFillStyle(selected ? 0x1a1a33 : 0x0e0c1a, selected ? 0.95 : 0.85);
      btn.border.setStrokeStyle(
        selected ? 2 : 1,
        selected ? 0xffffff : (btn.option.compatible ? btn.option.color : 0x333344),
        selected ? 0.6 : (btn.option.compatible ? 0.3 : 0.15),
      );
      btn.icon.setAlpha(selected ? 0.9 : (btn.option.compatible ? 0.5 : 0.15));

      // Selected checkmark
      if (selected && btn.option.id !== null) {
        btn.icon.setStrokeStyle(1.5, 0xffffff, 0.6);
      } else {
        btn.icon.setStrokeStyle(0);
      }
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}