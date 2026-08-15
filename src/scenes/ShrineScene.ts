// src/scenes/ShrineScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, createGlassPanel } from '../config/uiStyles';

export class ShrineScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  constructor() { super({ key: 'ShrineScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; }

  create(): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);
    this.add.text(cx, 50, 'SHRINE', uiText(22, '#cc88ff', true)).setOrigin(0.5);
    this.add.text(cx, cy, 'A mysterious shrine stands before you...', uiText(13, '#8899aa')).setOrigin(0.5);

    // Modular: shrine events will be added here
    const skipBtn = createGlassPanel(this, cx, cy + 80, 200, 40, 10);
    skipBtn.setInteractive({ useHandCursor: true });
    this.add.text(cx, cy + 80, 'LEAVE', uiText(13, '#88ee88', true)).setOrigin(0.5).setDepth(11);
    skipBtn.on('pointerdown', () => {
      this.dungeon.advanceRoom();
      this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
    });
  }
}