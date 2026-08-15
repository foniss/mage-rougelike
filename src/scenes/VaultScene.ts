// src/scenes/VaultScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { VaultCategory, VAULT_REWARDS, RewardType } from '../config/dungeonConfig';
import { RewardGenerator, Reward } from '../systems/dungeon/RewardGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class VaultScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  constructor() { super({ key: 'VaultScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; }

  create(): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);
    this.add.text(cx, 50, 'THE VAULT', uiText(22, '#ffcc44', true)).setOrigin(0.5);
    this.add.text(cx, 80, 'Choose your reward category', uiText(12, '#8899aa')).setOrigin(0.5);

    const categories = [
      { cat: VaultCategory.FOUNDATION, label: 'Foundation', desc: 'Core or Form', color: 0xff8844, x: cx - 200 },
      { cat: VaultCategory.ARSENAL, label: 'Arsenal', desc: 'Prefix or Suffix', color: 0x8888ff, x: cx },
      { cat: VaultCategory.FORTUNE, label: 'Fortune', desc: 'Gold', color: 0xffcc44, x: cx + 200 },
    ];

    for (const c of categories) {
      const card = createGlassPanel(this, c.x, cy, 170, 200, 10);
      card.setStrokeStyle(1, c.color, 0.5).setInteractive({ useHandCursor: true });
      this.add.text(c.x, cy - 30, c.label, uiText(16, '#' + c.color.toString(16).padStart(6, '0'), true)).setOrigin(0.5).setDepth(11);
      this.add.text(c.x, cy + 10, c.desc, uiText(10, '#8899aa')).setOrigin(0.5).setDepth(11);

      card.on('pointerdown', () => {
        const rewards = RewardGenerator.generateVaultRewards(c.cat, this.dungeon.progression);
        for (const r of rewards) this.applyReward(r);
        this.dungeon.advanceRoom();
        this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
      });
    }
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