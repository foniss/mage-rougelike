// src/scenes/DungeonMapScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { DungeonGenerator } from '../systems/dungeon/DungeonGenerator';
import { RoomType, SIN_DEFINITIONS, getCombatConfig } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel } from '../config/uiStyles';

export class DungeonMapScene extends Phaser.Scene {
  private dungeon!: DungeonState;

  constructor() { super({ key: 'DungeonMapScene' }); }

  init(data?: { dungeon?: DungeonState }): void {
    if (data?.dungeon) {
      this.dungeon = data.dungeon;
    } else {
      this.dungeon = DungeonGenerator.generateRun();
    }
  }

  create(): void {
    this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1).setDepth(0);

    const layer = this.dungeon.getCurrentLayer();
    const room = this.dungeon.getCurrentRoom();
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

    // Layer info
    const layerNum = layer.layerIndex + 1;
    const sinName = layer.sinId ? SIN_DEFINITIONS[layer.sinId].displayName : 'The Devil';
    const headerT = this.add.text(cx, 40, `LAYER ${layerNum} — ${sinName}`, uiText(20, '#d8ccf0', true)).setOrigin(0.5).setDepth(10);
    applyTextShadow(headerT);

    // Room progress bar
    const barY = 80;
    const barW = 600;
    const roomCount = layer.rooms.length;
    const dotGap = barW / (roomCount - 1);
    const startX = cx - barW / 2;

    // Line
    this.add.rectangle(cx, barY, barW, 2, 0x3a2a5a, 0.4).setDepth(5);

    for (let i = 0; i < roomCount; i++) {
      const r = layer.rooms[i];
      const dx = startX + i * dotGap;
      const color = r.completed ? 0x55cc55 : r.isCurrent ? 0xffcc44 : 0x555577;
      const size = r.isCurrent ? 8 : 6;

      this.add.circle(dx, barY, size, color, r.completed || r.isCurrent ? 0.8 : 0.3).setDepth(6);
      this.add.text(dx, barY + 16, `${i + 1}`, uiText(9, r.isCurrent ? '#ffcc44' : '#777799')).setOrigin(0.5).setDepth(6);
    }

    // Current room
    const roomNum = room.roomIndex + 1;

    if (!room.chosen && room.choice) {
      // Show two card choices
      this.showRoomChoice(room);
    } else {
      // Show room to enter
      this.showRoomEntry(room);
    }

    // Player stats
    const prog = this.dungeon.progression;
    const statsY = ROOM_HEIGHT - 50;
    this.add.text(20, statsY, `HP: ${prog.currentHp}/${prog.maxHp}  |  Mana: ${prog.maxMana}  |  Gold: ${prog.gold}`, uiText(11, '#8899aa')).setDepth(10);
    this.add.text(20, statsY + 18, `Cores: ${prog.unlockedCores.size}  Forms: ${prog.unlockedForms.size}  Prefixes: ${prog.unlockedPrefixes.size}  Suffixes: ${prog.unlockedSuffixes.size}  Relics: ${prog.sinRelics.length}`, uiText(9, '#667788')).setDepth(10);
  }

  private showRoomChoice(room: any): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

    this.add.text(cx, cy - 160, 'CHOOSE YOUR PATH', uiText(16, '#ccbbee', true)).setOrigin(0.5).setDepth(10);

    // Card A
    this.createRoomCard(cx - 160, cy, room.choice.cardA, () => {
      this.dungeon.resolveChoice(room.choice.cardA);
      this.scene.restart({ dungeon: this.dungeon });
    });

    this.add.text(cx, cy, 'OR', uiText(14, '#666688', true)).setOrigin(0.5).setDepth(10);

    // Card B
    this.createRoomCard(cx + 160, cy, room.choice.cardB, () => {
      this.dungeon.resolveChoice(room.choice.cardB);
      this.scene.restart({ dungeon: this.dungeon });
    });
  }

  private showRoomEntry(room: any): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    const roomLabel = this.getRoomLabel(room.type);

    this.add.text(cx, cy - 60, `ROOM ${room.roomIndex + 1}`, uiText(14, '#8899aa', true)).setOrigin(0.5).setDepth(10);
    this.add.text(cx, cy - 30, roomLabel, uiText(22, this.getRoomColor(room.type), true)).setOrigin(0.5).setDepth(10);

    const enterBtn = this.add.rectangle(cx, cy + 40, 200, 44, 0x102210, 0.7).setDepth(10);
    enterBtn.setStrokeStyle(1, 0x55cc66, 0.5).setInteractive({ useHandCursor: true });
    this.add.text(cx, cy + 40, 'ENTER', uiText(14, '#88ee88', true)).setOrigin(0.5).setDepth(11);

    enterBtn.on('pointerover', () => enterBtn.setFillStyle(0x1a3a1a, 0.85));
    enterBtn.on('pointerout', () => enterBtn.setFillStyle(0x102210, 0.7));
    enterBtn.on('pointerdown', () => this.enterRoom(room));
  }

  private enterRoom(room: any): void {
    switch (room.type) {
      case RoomType.NORMAL:
      case RoomType.ELITE:
      case RoomType.SIN_BOSS:
      case RoomType.DEVIL:
        this.scene.start('GameScene', {
          dungeon: this.dungeon,
          roomType: room.type,
          combatConfig: getCombatConfig(room.type, this.dungeon.currentLayerIndex),
        });
        break;
      case RoomType.SHOP_REST:
        this.scene.start('ShopRestScene', { dungeon: this.dungeon });
        break;
      case RoomType.SHRINE:
        this.scene.start('ShrineScene', { dungeon: this.dungeon });
        break;
      case RoomType.VAULT:
        this.scene.start('VaultScene', { dungeon: this.dungeon });
        break;
      case RoomType.SACRIFICE:
        this.scene.start('SacrificeScene', { dungeon: this.dungeon });
        break;
    }
  }

  private createRoomCard(x: number, y: number, type: RoomType, onClick: () => void): void {
    const w = 200, h = 180;
    const card = createGlassPanel(this, x, y, w, h, 10, 0.8);
    card.setInteractive({ useHandCursor: true });

    const color = this.getRoomColor(type);
    const hex = '#' + color.toString(16).padStart(6, '0');

    this.add.text(x, y - 40, this.getRoomSymbol(type), uiText(28, hex)).setOrigin(0.5).setDepth(11);
    this.add.text(x, y + 10, this.getRoomLabel(type), uiText(14, hex, true)).setOrigin(0.5).setDepth(11);
    this.add.text(x, y + 32, this.getRoomDesc(type), uiText(9, '#8899aa')).setOrigin(0.5).setDepth(11);

    card.setStrokeStyle(1, color, 0.4);
    card.on('pointerover', () => card.setStrokeStyle(2, color, 0.8));
    card.on('pointerout', () => card.setStrokeStyle(1, color, 0.4));
    card.on('pointerdown', onClick);
  }

  private getRoomLabel(type: RoomType): string {
    const labels: Record<RoomType, string> = {
      [RoomType.NORMAL]: 'NORMAL', [RoomType.ELITE]: 'ELITE',
      [RoomType.SHRINE]: 'SHRINE', [RoomType.VAULT]: 'VAULT',
      [RoomType.SACRIFICE]: 'SACRIFICE', [RoomType.SHOP_REST]: 'SHOP & REST',
      [RoomType.SIN_BOSS]: 'SIN BOSS', [RoomType.DEVIL]: 'THE DEVIL',
    };
    return labels[type] || type;
  }

  private getRoomColor(type: RoomType): number {
    const colors: Record<RoomType, number> = {
      [RoomType.NORMAL]: 0x88aacc, [RoomType.ELITE]: 0xff8844,
      [RoomType.SHRINE]: 0xcc88ff, [RoomType.VAULT]: 0xffcc44,
      [RoomType.SACRIFICE]: 0xff4466, [RoomType.SHOP_REST]: 0x44cc88,
      [RoomType.SIN_BOSS]: 0xff2222, [RoomType.DEVIL]: 0xff0000,
    };
    return colors[type] || 0x888888;
  }

  private getRoomSymbol(type: RoomType): string {
    const syms: Record<RoomType, string> = {
      [RoomType.NORMAL]: '⚔', [RoomType.ELITE]: '★',
      [RoomType.SHRINE]: '✦', [RoomType.VAULT]: '◆',
      [RoomType.SACRIFICE]: '☠', [RoomType.SHOP_REST]: '🛒',
      [RoomType.SIN_BOSS]: '👹', [RoomType.DEVIL]: '😈',
    };
    return syms[type] || '?';
  }

  private getRoomDesc(type: RoomType): string {
    const descs: Record<RoomType, string> = {
      [RoomType.NORMAL]: 'Regular combat\nGold + Core/Form',
      [RoomType.ELITE]: 'Hard combat\nGold + Prefix/Suffix',
      [RoomType.SHRINE]: 'High-risk event\nUnusual rewards',
      [RoomType.VAULT]: 'Choose your reward\nGuaranteed value',
      [RoomType.SACRIFICE]: 'Trade a component\nRandom upgrade',
      [RoomType.SHOP_REST]: 'Buy upgrades\nRestore health',
      [RoomType.SIN_BOSS]: 'Defeat the Sin\nEarn Sin Relic',
      [RoomType.DEVIL]: 'Final battle',
    };
    return descs[type] || '';
  }
}