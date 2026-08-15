// src/scenes/ShopRestScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { ShopGenerator, ShopItem } from '../systems/dungeon/ShopGenerator';
import { RewardType, REST_HEAL_PERCENT, MANA_PER_NEW_COMPONENT } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class ShopRestScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private shopItems: ShopItem[] = [];
  private hasRested = false;

  constructor() { super({ key: 'ShopRestScene' }); }
  init(data: { dungeon: DungeonState }): void {
    this.dungeon = data.dungeon;
    const room = this.dungeon.getCurrentRoom();
    if (!room.shopState) {
      room.shopState = {
        items: ShopGenerator.generateShop(this.dungeon.progression, this.dungeon.currentLayerIndex),
        hasRested: false,
      };
    }
    this.shopItems = room.shopState.items;
    this.hasRested = room.shopState.hasRested;
  }

  create(): void {
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2;
    this.add.rectangle(cx, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x08070e, 1);

    // Title
    const title = this.add.text(cx, 30, 'SHOP & REST', uiText(22, '#44cc88', true)).setOrigin(0.5);
    applyTextShadow(title);
    this.add.text(cx, 56, 'Buy upgrades and restore health before the next battle', uiText(10, '#667788')).setOrigin(0.5);

    // Stats
    this.add.text(cx, 78, `Gold: ${prog.gold}  |  HP: ${prog.currentHp}/${prog.maxHp}`, uiText(11, '#8899aa')).setOrigin(0.5);

    // ── Shop Items ────────────────────────────────────────────────────────
    const shopY = 110;

    this.add.text(cx - 200, shopY, 'SHOP', uiText(12, '#ccaa44', true));

    for (let i = 0; i < this.shopItems.length; i++) {
      const item = this.shopItems[i];
      const iy = shopY + 22 + i * 52;
      const canAfford = prog.gold >= item.price && !item.purchased;

      const card = createGlassPanel(this, cx, iy, 420, 44, 10, 0.65);
      card.setStrokeStyle(1, canAfford ? 0xccaa44 : 0x444455, canAfford ? 0.4 : 0.2);

      if (canAfford) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0x1a1830, 0.8));
        card.on('pointerout', () => card.setFillStyle(0x0c0a14, 0.65));
        card.on('pointerdown', () => {
          if (!prog.spendGold(item.price)) return;
          item.purchased = true;
          this.applyShopReward(item);
          this.scene.restart({ dungeon: this.dungeon });
        });
      }

      // Item name
      this.add.text(cx - 190, iy, item.displayName, uiText(12, canAfford ? '#ccddee' : '#555566', canAfford)).setOrigin(0, 0.5).setDepth(11);

      // Price
      const priceColor = item.purchased ? '#44aa44' : canAfford ? '#ffcc44' : '#884444';
      const priceText = item.purchased ? 'PURCHASED' : `${item.price} Gold`;
      this.add.text(cx + 190, iy, priceText, uiText(11, priceColor)).setOrigin(1, 0.5).setDepth(11);
    }

    // ── Rest ──────────────────────────────────────────────────────────────
    const restY = shopY + 22 + this.shopItems.length * 52 + 30;
    this.add.text(cx - 200, restY, 'REST', uiText(12, '#88ffaa', true));

    const healAmount = Math.floor(prog.maxHp * REST_HEAL_PERCENT);
    const restCard = createGlassPanel(this, cx, restY + 30, 420, 44, 10, 0.65);
    restCard.setStrokeStyle(1, this.hasRested ? 0x444455 : 0x44cc88, 0.4);

    if (!this.hasRested) {
      restCard.setInteractive({ useHandCursor: true });
      restCard.on('pointerover', () => restCard.setFillStyle(0x102a18, 0.8));
      restCard.on('pointerout', () => restCard.setFillStyle(0x0c0a14, 0.65));
      restCard.on('pointerdown', () => {
        const healed = prog.rest();
        this.hasRested = true;
        this.dungeon.getCurrentRoom().shopState!.hasRested = true;
        this.scene.restart({ dungeon: this.dungeon });
      });
    }

    const restLabel = this.hasRested
      ? `Rested (HP: ${prog.currentHp}/${prog.maxHp})`
      : `Rest — Heal ${healAmount} HP (${Math.round(REST_HEAL_PERCENT * 100)}% of Max)`;
    this.add.text(cx, restY + 30, restLabel, uiText(12, this.hasRested ? '#557755' : '#88ffaa', !this.hasRested)).setOrigin(0.5).setDepth(11);

    // ── Continue Button ───────────────────────────────────────────────────
    const contY = ROOM_HEIGHT - 60;
    const contBtn = createGlassPanel(this, cx, contY, 220, 44, 10, 0.7);
    contBtn.setStrokeStyle(1, 0x55cc66, 0.5).setInteractive({ useHandCursor: true });
    const contTxt = this.add.text(cx, contY, 'CONTINUE TO BOSS', uiText(13, '#88ee88', true)).setOrigin(0.5).setDepth(11);
    applyTextShadow(contTxt);

    contBtn.on('pointerover', () => contBtn.setFillStyle(0x1a3a1a, 0.85));
    contBtn.on('pointerout', () => contBtn.setFillStyle(0x0c0a14, 0.7));
    contBtn.on('pointerdown', () => {
      this.dungeon.advanceRoom();
      this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
    });
  }

  private applyShopReward(item: ShopItem): void {
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
