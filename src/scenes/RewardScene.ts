// src/scenes/RewardScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { Reward } from '../systems/dungeon/RewardGenerator';
import { RewardType, RoomType, SIN_DEFINITIONS, REWARD_DISPLAY, MANA_PER_NEW_COMPONENT } from '../config/dungeonConfig';
import { SinGenerator } from '../systems/dungeon/SinGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel } from '../config/uiStyles';
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

    this.add.text(cx, 40, 'VICTORY', uiText(24, '#ffcc44', true)).setOrigin(0.5);

    // Sin boss: award sin relic FIRST
    let sinRelicAwarded = false;
    if (this.roomType === RoomType.SIN_BOSS) {
      const layer = this.dungeon.getCurrentLayer();
      if (layer.sinId) {
        const relic = SinGenerator.createSinRelic(layer.sinId);
        prog.addSinRelic(relic);
        prog.defeatSin(layer.sinId);
        sinRelicAwarded = true;

        const sinDef = SIN_DEFINITIONS[layer.sinId];
        const sinHex = '#' + sinDef.color.toString(16).padStart(6, '0');

        this.add.text(cx, 90, '✦ SIN RELIC OBTAINED ✦', uiText(14, sinHex, true)).setOrigin(0.5);
        this.add.text(cx, 115, relic.name, uiText(16, '#ffcc88', true)).setOrigin(0.5);
        this.add.text(cx, 138, relic.description, uiText(10, '#8899aa')).setOrigin(0.5);
      }
    }

    // Apply and display rewards
    const startY = sinRelicAwarded ? 180 : 100;

    for (let i = 0; i < this.rewards.length; i++) {
      const r = this.rewards[i];
      const ry = startY + i * 70;

      // Apply the reward
      const applied = this.applyReward(r);

      // Display
      const display = REWARD_DISPLAY[r.type] || { label: '?', color: 0x888888 };
      const hex = '#' + display.color.toString(16).padStart(6, '0');

      const card = createGlassPanel(this, cx, ry, 400, 55, 10, 0.7);
      card.setStrokeStyle(1, display.color, 0.4);

      // Type label
      this.add.text(cx - 180, ry - 10, display.label.toUpperCase(), uiText(9, hex, true)).setOrigin(0, 0.5).setDepth(11);

      // Reward name
      this.add.text(cx - 180, ry + 8, r.displayName, uiText(14, '#ddddee', true)).setOrigin(0, 0.5).setDepth(11);

      // Description
      this.add.text(cx + 180, ry - 4, r.description, uiText(9, '#8899aa')).setOrigin(1, 0.5).setDepth(11);

      // +25 Mana indicator for new cores/forms
      if (applied && (r.type === RewardType.CORE || r.type === RewardType.FORM)) {
        this.add.text(cx + 180, ry + 12, `+${MANA_PER_NEW_COMPONENT} Max Mana`, uiText(10, '#4488ff', true)).setOrigin(1, 0.5).setDepth(11);
      }

      // "NEW" badge
      if (r.isNew && applied) {
        this.add.text(cx + 190, ry - 18, 'NEW', uiText(8, '#ffcc44', true)).setOrigin(0.5).setDepth(12);
      }
    }

    // Stats summary
    const summaryY = startY + this.rewards.length * 70 + 20;
    this.add.text(cx, summaryY, `HP: ${prog.currentHp}/${prog.maxHp}  |  Mana: ${prog.maxMana}  |  Gold: ${prog.gold}`, uiText(11, '#8899aa')).setOrigin(0.5);
    this.add.text(cx, summaryY + 20, `Cores: ${prog.getCoreCount()}  Forms: ${prog.getFormCount()}  Prefixes: ${prog.getPrefixCount()}  Suffixes: ${prog.getSuffixCount()}  Relics: ${prog.sinRelics.length}`, uiText(9, '#667788')).setOrigin(0.5);

    // Continue button
    const contBtn = createGlassPanel(this, cx, ROOM_HEIGHT - 60, 220, 44, 10);
    contBtn.setStrokeStyle(1, 0x55cc66, 0.5).setInteractive({ useHandCursor: true });
    const contTxt = this.add.text(cx, ROOM_HEIGHT - 60, 'CONTINUE', uiText(14, '#88ee88', true)).setOrigin(0.5).setDepth(11);
    applyTextShadow(contTxt);

    contBtn.on('pointerover', () => contBtn.setFillStyle(0x1a3a1a, 0.85));
    contBtn.on('pointerout', () => contBtn.setFillStyle(0x0c0a14, 0.65));
    contBtn.on('pointerdown', () => {
      const hasMoreRooms = this.dungeon.advanceRoom();
      if (hasMoreRooms) {
        this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
      } else {
        const hasMoreLayers = this.dungeon.advanceLayer();
        this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
      }
    });
  }

  /** Apply reward to progression. Returns true if it was a new acquisition. */
  private applyReward(r: Reward): boolean {
    const prog = this.dungeon.progression;
    switch (r.type) {
      case RewardType.GOLD:
        prog.addGold(r.amount || 0);
        return false;
      case RewardType.CORE:
        return r.id ? prog.addCore(r.id as CoreId) : false;
      case RewardType.FORM:
        return r.id ? prog.addForm(r.id as FormId) : false;
      case RewardType.PREFIX:
        return r.id ? prog.addPrefix(r.id as PrefixId) : false;
      case RewardType.SUFFIX:
        return r.id ? prog.addSuffix(r.id as SuffixId) : false;
      case RewardType.MAX_HP:
        prog.upgradeMaxHp(r.amount || 15);
        return true;
      case RewardType.MAX_MANA:
        prog.upgradeMaxMana(r.amount || 15);
        return true;
      default:
        return false;
    }
  }
}