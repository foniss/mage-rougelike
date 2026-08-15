// src/scenes/RewardScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { Reward } from '../systems/dungeon/RewardGenerator';
import { RewardType, RoomType, SIN_DEFINITIONS } from '../config/dungeonConfig';
import { SinGenerator } from '../systems/dungeon/SinGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class RewardScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private rewards: Reward[] = [];
  private roomType!: RoomType;

  constructor() { super({ key: 'RewardScene' }); }

  init(data: { dungeon: DungeonState; rewards: Reward[]; roomType: RoomType }): void {
    this.dungeon = data.dungeon;
    this.rewards = data.rewards;
    this.roomType = data.roomType;
  }

  create(): void {
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);
    this.add.text(cx, 50, 'VICTORY', uiText(22, '#ffcc44', true)).setOrigin(0.5);

    // Sin boss: award sin relic
    if (this.roomType === RoomType.SIN_BOSS) {
      const layer = this.dungeon.getCurrentLayer();
      if (layer.sinId) {
        const relic = SinGenerator.createSinRelic(layer.sinId);
        prog.addSinRelic(relic);
        prog.defeatSin(layer.sinId);
        this.add.text(cx, 100, `Sin Relic: ${relic.name}`, uiText(16, '#ff8844', true)).setOrigin(0.5);
      }
    }

    // Display rewards
    for (let i = 0; i < this.rewards.length; i++) {
      const r = this.rewards[i];
      const ry = 160 + i * 50;
      this.add.text(cx, ry, r.displayName, uiText(14, '#ccddee', true)).setOrigin(0.5);
      this.applyReward(r);
    }

    // Continue
    const contBtn = createGlassPanel(this, cx, ROOM_HEIGHT - 80, 200, 40, 10);
    contBtn.setInteractive({ useHandCursor: true });
    this.add.text(cx, ROOM_HEIGHT - 80, 'CONTINUE', uiText(13, '#88ee88', true)).setOrigin(0.5).setDepth(11);

    contBtn.on('pointerdown', () => {
      const hasMoreRooms = this.dungeon.advanceRoom();
      if (hasMoreRooms) {
        this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
      } else {
        const hasMoreLayers = this.dungeon.advanceLayer();
        if (hasMoreLayers) {
          this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
        } else {
          // Run won!
          this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
        }
      }
    });
  }

  private applyReward(r: Reward): void {
    const prog = this.dungeon.progression;
    switch (r.type) {
      case RewardType.GOLD: prog.addGold(r.amount || 0); break;
      case RewardType.CORE: if (r.id) prog.addCore(r.id as CoreId); break;
      case RewardType.FORM: if (r.id) prog.addForm(r.id as FormId); break;
      case RewardType.PREFIX: if (r.id) prog.addPrefix(r.id as PrefixId); break;
      case RewardType.SUFFIX: if (r.id) prog.addSuffix(r.id as SuffixId); break;
    }
  }
}