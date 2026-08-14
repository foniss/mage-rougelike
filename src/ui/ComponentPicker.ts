// src/ui/ComponentPicker.ts
//
// A compact scrollable list of components for a slot type.
// The user types to filter, or clicks to select.

import Phaser from 'phaser';

export interface PickerItem {
  id: string;
  displayName: string;
  description: string;
  manaCost: number;
  color: number;
  compatible: boolean;
  incompatReason?: string;
}

export class ComponentPicker {
  private scene: Phaser.Scene;
  private items: PickerItem[];
  private x: number;
  private y: number;
  private width: number;
  private container: Phaser.GameObjects.Container;
  private itemElements: {
    bg: Phaser.GameObjects.Rectangle;
    nameText: Phaser.GameObjects.Text;
    dot: Phaser.GameObjects.Arc;
    manaText: Phaser.GameObjects.Text;
    item: PickerItem;
  }[] = [];
  private onSelect: (item: PickerItem | null) => void;
  private selectedId: string | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number, width: number,
    items: PickerItem[],
    onSelect: (item: PickerItem | null) => void,
  ) {
    this.scene = scene;
    this.items = items;
    this.x = x;
    this.y = y;
    this.width = width;
    this.onSelect = onSelect;
    this.container = scene.add.container(x, y).setDepth(225);
    this.create();
  }

  private create(): void {
    const itemH = 24;
    let cy = 0;

    // "None" option for optional slots
    const noneBg = this.scene.add.rectangle(0, cy, this.width, itemH, 0x111122, 0.6);
    noneBg.setInteractive({ useHandCursor: true });
    this.container.add(noneBg);

    const noneText = this.scene.add.text(-this.width / 2 + 10, cy, '[ None ]', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#555566',
      fontStyle: 'italic',
    }).setOrigin(0, 0.5);
    this.container.add(noneText);

    noneBg.on('pointerover', () => { noneBg.setFillStyle(0x222244, 0.8); });
    noneBg.on('pointerout', () => {
      noneBg.setFillStyle(this.selectedId === null ? 0x1a1a33 : 0x111122, 0.6);
    });
    noneBg.on('pointerdown', () => {
      this.selectedId = null;
      this.updateHighlights();
      this.onSelect(null);
    });

    cy += itemH + 2;

    for (const item of this.items) {
      const bg = this.scene.add.rectangle(0, cy, this.width, itemH, 0x111122, 0.5);
      bg.setInteractive({ useHandCursor: true });
      this.container.add(bg);

      const colorHex = '#' + item.color.toString(16).padStart(6, '0');
      const dot = this.scene.add.circle(-this.width / 2 + 12, cy, 4, item.color, item.compatible ? 0.8 : 0.2);
      this.container.add(dot);

      const textColor = item.compatible ? colorHex : '#444455';
      const nameText = this.scene.add.text(-this.width / 2 + 22, cy, item.displayName.toUpperCase(), {
        fontFamily: '"Courier New", monospace',
        fontSize: '10px',
        color: textColor,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      const manaText = this.scene.add.text(this.width / 2 - 10, cy, `+${item.manaCost}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        color: item.compatible ? '#4488aa' : '#333344',
      }).setOrigin(1, 0.5);
      this.container.add(manaText);

      if (!item.compatible) {
        // Strikethrough effect
        const strike = this.scene.add.rectangle(0, cy, this.width - 20, 1, 0x444455, 0.3);
        this.container.add(strike);
      }

      // Hover
      bg.on('pointerover', () => {
        if (item.compatible) {
          bg.setFillStyle(0x222244, 0.8);
        } else {
          bg.setFillStyle(0x221111, 0.6);
        }
      });
      bg.on('pointerout', () => {
        const selected = this.selectedId === item.id;
        bg.setFillStyle(selected ? 0x1a1a33 : 0x111122, selected ? 0.8 : 0.5);
      });
      bg.on('pointerdown', () => {
        if (!item.compatible) return; // Can't select incompatible
        this.selectedId = item.id;
        this.updateHighlights();
        this.onSelect(item);
      });

      this.itemElements.push({ bg, nameText, dot, manaText, item });
      cy += itemH + 2;
    }
  }

  setSelectedId(id: string | null): void {
    this.selectedId = id;
    this.updateHighlights();
  }

  updateCompatibility(compatibleIds: Set<string>): void {
    for (const el of this.itemElements) {
      const compat = compatibleIds.has(el.item.id);
      el.item.compatible = compat;
      const colorHex = '#' + el.item.color.toString(16).padStart(6, '0');
      el.nameText.setColor(compat ? colorHex : '#444455');
      el.dot.setAlpha(compat ? 0.8 : 0.2);
      el.manaText.setColor(compat ? '#4488aa' : '#333344');
    }
  }

  private updateHighlights(): void {
    for (const el of this.itemElements) {
      const selected = this.selectedId === el.item.id;
      el.bg.setFillStyle(selected ? 0x1a1a33 : 0x111122, selected ? 0.8 : 0.5);
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}