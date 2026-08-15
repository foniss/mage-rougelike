// src/scenes/VaultScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { VaultCategory, VAULT_REWARDS, RewardType, REWARD_DISPLAY, MANA_PER_NEW_COMPONENT } from '../config/dungeonConfig';
import { RewardGenerator, Reward } from '../systems/dungeon/RewardGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class VaultScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  constructor() { super({ key: 'VaultScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; }

  create(): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    const prog = this.dungeon.progression;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);

    this.add.text(cx, 40, 'THE VAULT', uiText(22, '#ffcc44', true)).setOrigin(0.5);
    this.add.text(cx, 70, 'Choose your reward', uiText(12, '#8899aa')).setOrigin(0.5);

    const categories: { cat: VaultCategory; label: string; desc: string; subDesc: string; color: number; icon: string }[] = [
      {
        cat: VaultCategory.FOUNDATION,
        label: 'Foundation',
        desc: 'Core or Form',
        subDesc: prog.hasUnownedCoreOrForm() ? `+${MANA_PER_NEW_COMPONENT} Max Mana` : 'All owned',
        color: 0xff8844,
        icon: '◈',
      },
      {
        cat: VaultCategory.ARSENAL,
        label: 'Arsenal',
        desc: 'Prefix or Suffix',
        subDesc: prog.hasUnownedPrefixOrSuffix() ? 'New modifier' : 'All owned',
        color: 0x8888ff,
        icon: '◆',
      },
      {
        cat: VaultCategory.FORTUNE,
        label: 'Fortune',
        desc: `${VAULT_REWARDS[VaultCategory.FORTUNE].goldMin}–${VAULT_REWARDS[VaultCategory.FORTUNE].goldMax} Gold`,
        subDesc: 'Guaranteed currency',
        color: 0xffcc44,
        icon: '✦',
      },
    ];

    const cardW = 200, cardH = 220, gap = 30;
    const totalW = categories.length * cardW + (categories.length - 1) * gap;
    const startX = cx - totalW / 2 + cardW / 2;

    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      const cardX = startX + i * (cardW + gap);
      const hex = '#' + c.color.toString(16).padStart(6, '0');

      const card = createGlassPanel(this, cardX, cy, cardW, cardH, 10, 0.75);
      card.setStrokeStyle(1, c.color, 0.4).setInteractive({ useHandCursor: true });

      this.add.text(cardX, cy - 60, c.icon, uiText(32, hex)).setOrigin(0.5).setDepth(11);
      this.add.text(cardX, cy - 10, c.label, uiText(16, hex, true)).setOrigin(0.5).setDepth(11);
      this.add.text(cardX, cy + 16, c.desc, uiText(10, '#aabbcc')).setOrigin(0.5).setDepth(11);
      this.add.text(cardX, cy + 36, c.subDesc, uiText(9, '#667788')).setOrigin(0.5).setDepth(11);

      card.on('pointerover', () => card.setStrokeStyle(2, c.color, 0.8));
      card.on('pointerout', () => card.setStrokeStyle(1, c.color, 0.4));
      card.on('pointerdown', () => {
        const rewards = RewardGenerator.generateVaultRewards(c.cat, prog);
        for (const r of rewards) this.applyReward(r);
        this.dungeon.advanceRoom();
        this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
      });
    }

    // Current stats
    this.add.text(cx, ROOM_HEIGHT - 40, `Gold: ${prog.gold}  |  Cores: ${prog.getCoreCount()}  Forms: ${prog.getFormCount()}  Prefixes: ${prog.getPrefixCount()}  Suffixes: ${prog.getSuffixCount()}`, uiText(9, '#667788')).setOrigin(0.5);
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