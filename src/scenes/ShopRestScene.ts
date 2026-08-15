// src/scenes/ShopRestScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { ShopGenerator, ShopItem } from '../systems/dungeon/ShopGenerator';
import { RewardType } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class ShopRestScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private shopItems: ShopItem[] = [];

  constructor() { super({ key: 'ShopRestScene' }); }

  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; }

  create(): void {
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);

    this.add.text(cx, 40, 'SHOP & REST', uiText(22, '#44cc88', true)).setOrigin(0.5);

    // Shop items
    this.shopItems = ShopGenerator.generateShop(prog, this.dungeon.currentLayerIndex);
    const shopStartY = 100;

    for (let i = 0; i < this.shopItems.length; i++) {
      const item = this.shopItems[i];
      const iy = shopStartY + i * 60;
      const btn = createGlassPanel(this, cx - 100, iy, 360, 48, 10);
      btn.setInteractive({ useHandCursor: true });

      this.add.text(cx - 260, iy, item.displayName, uiText(12, '#ccddee', true)).setOrigin(0, 0.5).setDepth(11);
      this.add.text(cx + 60, iy, `${item.price} Gold`, uiText(11, prog.gold >= item.price ? '#ffcc44' : '#884444')).setOrigin(0, 0.5).setDepth(11);

      btn.on('pointerdown', () => {
        if (item.purchased || !prog.spendGold(item.price)) return;
        item.purchased = true;
        this.applyReward(item);
        this.scene.restart({ dungeon: this.dungeon });
      });
    }

    // Rest button
    const restY = cy + 120;
    const restBtn = createGlassPanel(this, cx, restY, 250, 50, 10);
    restBtn.setInteractive({ useHandCursor: true });
    this.add.text(cx, restY, `REST (Heal ${Math.floor(prog.maxHp * 0.3)} HP)`, uiText(13, '#88ffaa', true)).setOrigin(0.5).setDepth(11);
    restBtn.on('pointerdown', () => {
      prog.rest();
      this.scene.restart({ dungeon: this.dungeon });
    });

    // Continue
    const contBtn = createGlassPanel(this, cx, ROOM_HEIGHT - 60, 200, 40, 10);
    contBtn.setInteractive({ useHandCursor: true });
    this.add.text(cx, ROOM_HEIGHT - 60, 'CONTINUE', uiText(13, '#88ee88', true)).setOrigin(0.5).setDepth(11);
    contBtn.on('pointerdown', () => {
      this.dungeon.advanceRoom();
      this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
    });

    // Stats
    this.add.text(20, ROOM_HEIGHT - 30, `HP: ${prog.currentHp}/${prog.maxHp}  Gold: ${prog.gold}`, uiText(10, '#8899aa'));
  }

  private applyReward(item: ShopItem): void {
    const prog = this.dungeon.progression;
    switch (item.reward.type) {
      case RewardType.MAX_HP: prog.upgradeMaxHp(item.reward.amount || 15); break;
      case RewardType.MAX_MANA: prog.upgradeMaxMana(item.reward.amount || 15); break;
      case RewardType.CORE: if (item.reward.id) prog.addCore(item.reward.id as CoreId); break;
      case RewardType.FORM: if (item.reward.id) prog.addForm(item.reward.id as FormId); break;
      case RewardType.PREFIX: if (item.reward.id) prog.addPrefix(item.reward.id as PrefixId); break;
      case RewardType.SUFFIX: if (item.reward.id) prog.addSuffix(item.reward.id as SuffixId); break;
    }
  }
}