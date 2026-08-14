// src/ui/SpellSlotBar.ts
// HUD element showing the player's spell slots at the bottom of the screen.

import Phaser from 'phaser';
import { SpellSlot } from '../systems/GrimoireSystem';
import { ROOM_WIDTH } from '../config/constants';
import { uiText, applyTextShadow } from '../config/uiStyles';

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
    const slotW = 160;
    const slotH = 36;
    const gap = 10;
    const totalW = slotCount * slotW + (slotCount - 1) * gap;
    const startX = (ROOM_WIDTH - totalW) / 2;

    for (let i = 0; i < slotCount; i++) {
      const sx = startX + i * (slotW + gap) + slotW / 2;
      const sy = slotH / 2;

      const bg = this.scene.add.rectangle(sx, sy, slotW, slotH, 0x0c0a14, 0.65);
      this.container.add(bg);

      const border = this.scene.add.rectangle(sx, sy, slotW, slotH);
      border.setFillStyle(0, 0).setStrokeStyle(1, 0x444466, 0.55);
      this.container.add(border);

      const keyText = this.scene.add.text(sx - slotW / 2 + 10, sy, `${i + 1}`, uiText(12, '#778899', true))
        .setOrigin(0, 0.5);
      applyTextShadow(keyText);
      this.container.add(keyText);

      const dot = this.scene.add.circle(sx - slotW / 2 + 28, sy, 4, 0x555566, 0.4);
      this.container.add(dot);

      const nameText = this.scene.add.text(sx - slotW / 2 + 38, sy, 'Empty', uiText(12, '#778899'))
        .setOrigin(0, 0.5);
      applyTextShadow(nameText);
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
        el.dot.setFillStyle(slot.spell.visual.color, 0.8);
        el.bg.setFillStyle(isActive ? 0x181628 : 0x0c0a14, isActive ? 0.78 : 0.65);
        el.border.setStrokeStyle(isActive ? 2 : 1, isActive ? slot.spell.visual.color : 0x444466, isActive ? 0.75 : 0.45);
      } else {
        el.nameText.setText('Empty').setColor('#778899');
        el.dot.setFillStyle(0x555566, 0.35);
        el.bg.setFillStyle(isActive ? 0x141220 : 0x0c0a14, 0.65);
        el.border.setStrokeStyle(isActive ? 1.5 : 1, isActive ? 0x666688 : 0x444466, isActive ? 0.55 : 0.4);
      }

      el.keyText.setColor(isActive ? '#ccccee' : '#778899');
    }
  }

  destroy(): void {
    this.container.destroy();
  }
}
