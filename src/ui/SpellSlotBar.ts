// src/ui/SpellSlotBar.ts
// HUD element showing the player's spell slots at the bottom of the screen.

import Phaser from 'phaser';
import { SpellSlot } from '../systems/GrimoireSystem';
import { ROOM_WIDTH } from '../config/constants';

export class SpellSlotBar {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private slotElements: {
    bg: Phaser.GameObjects.Rectangle;
    border: Phaser.GameObjects.Rectangle;
    nameText: Phaser.GameObjects.Text;
    keyText: Phaser.GameObjects.Text;
    dot: Phaser.GameObjects.Arc;
  }[] = [];

  constructor(scene: Phaser.Scene, y: number) {
    this.scene = scene;
    this.container = scene.add.container(0, y);
  }

  buildSlots(slotCount: number): void {
    const slotW = 140;
    const slotH = 32;
    const gap = 8;
    const totalW = slotCount * slotW + (slotCount - 1) * gap;
    const startX = (ROOM_WIDTH - totalW) / 2;

    for (let i = 0; i < slotCount; i++) {
      const sx = startX + i * (slotW + gap) + slotW / 2;
      const sy = slotH / 2;

      const bg = this.scene.add.rectangle(sx, sy, slotW, slotH, 0x111122, 0.7);
      this.container.add(bg);

      const border = this.scene.add.rectangle(sx, sy, slotW, slotH);
      border.setFillStyle(0, 0).setStrokeStyle(1, 0x333355, 0.5);
      this.container.add(border);

      const keyText = this.scene.add.text(sx - slotW / 2 + 6, sy, `${i + 1}`, {
        fontFamily: '"Courier New", monospace', fontSize: '10px',
        color: '#555566', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.container.add(keyText);

      const dot = this.scene.add.circle(sx - slotW / 2 + 22, sy, 3, 0x555566, 0.3);
      this.container.add(dot);

      const nameText = this.scene.add.text(sx - slotW / 2 + 32, sy, '[ Empty ]', {
        fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555566',
      }).setOrigin(0, 0.5);
      this.container.add(nameText);

      this.slotElements.push({ bg, border, nameText, keyText, dot });
    }
  }

  update(slots: SpellSlot[], activeIndex: number): void {
    for (let i = 0; i < this.slotElements.length; i++) {
      const el = this.slotElements[i];
      const slot = slots[i];
      const isActive = i === activeIndex;

      if (slot?.spell) {
        const hex = '#' + slot.spell.visual.color.toString(16).padStart(6, '0');
        el.nameText.setText(slot.spell.name).setColor(hex);
        el.dot.setFillStyle(slot.spell.visual.color, 0.7);
        el.bg.setFillStyle(isActive ? 0x1a1a33 : 0x111122, isActive ? 0.9 : 0.7);
        el.border.setStrokeStyle(isActive ? 2 : 1, isActive ? slot.spell.visual.color : 0x333355, isActive ? 0.7 : 0.4);
      } else {
        el.nameText.setText('[ Empty ]').setColor('#555566');
        el.dot.setFillStyle(0x555566, 0.3);
        el.bg.setFillStyle(isActive ? 0x151525 : 0x111122, 0.7);
        el.border.setStrokeStyle(isActive ? 1.5 : 1, isActive ? 0x555577 : 0x333355, isActive ? 0.5 : 0.3);
      }

      el.keyText.setColor(isActive ? '#aaaacc' : '#555566');
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}