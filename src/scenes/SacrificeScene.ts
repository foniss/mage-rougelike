// src/scenes/SacrificeScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardGenerator, Reward } from '../systems/dungeon/RewardGenerator';
import { RewardType } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class SacrificeScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  constructor() { super({ key: 'SacrificeScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; }

  create(): void {
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);
    this.add.text(cx, 50, 'SACRIFICE', uiText(22, '#ff4466', true)).setOrigin(0.5);
    this.add.text(cx, 80, 'Sacrifice a component for a chance at something greater', uiText(11, '#8899aa')).setOrigin(0.5);

    const candidates = prog.getSacrificeCandidates();
    const startY = 130;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const iy = startY + i * 36;
      const btn = createGlassPanel(this, cx, iy, 300, 30, 10);
      btn.setInteractive({ useHandCursor: true });
      this.add.text(cx, iy, `${c.type.toUpperCase()}: ${c.name}`, uiText(11, '#ccddee')).setOrigin(0.5).setDepth(11);

      btn.on('pointerdown', () => {
        // Remove component
        switch (c.type) {
          case 'core': prog.removeCore(c.id as CoreId); break;
          case 'form': prog.removeForm(c.id as FormId); break;
          case 'prefix': prog.removePrefix(c.id as PrefixId); break;
          case 'suffix': prog.removeSuffix(c.id as SuffixId); break;
        }

        // Roll reward
        const tier = RewardGenerator.rollSacrificeTier();
        const reward = RewardGenerator.generateSacrificeReward(tier, prog);
        if (reward) this.applyReward(reward);

        this.dungeon.advanceRoom();
        this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
      });
    }

    // Skip
    const skipBtn = createGlassPanel(this, cx, ROOM_HEIGHT - 60, 200, 40, 10);
    skipBtn.setInteractive({ useHandCursor: true });
    this.add.text(cx, ROOM_HEIGHT - 60, 'LEAVE', uiText(13, '#88ee88', true)).setOrigin(0.5).setDepth(11);
    skipBtn.on('pointerdown', () => {
      this.dungeon.advanceRoom();
      this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
    });
  }

  private applyReward(r: Reward): void {
    const prog = this.dungeon.progression;
    switch (r.type) {
      case RewardType.CORE: if (r.id) prog.addCore(r.id as CoreId); break;
      case RewardType.FORM: if (r.id) prog.addForm(r.id as FormId); break;
      case RewardType.PREFIX: if (r.id) prog.addPrefix(r.id as PrefixId); break;
      case RewardType.SUFFIX: if (r.id) prog.addSuffix(r.id as SuffixId); break;
    }
  }
}