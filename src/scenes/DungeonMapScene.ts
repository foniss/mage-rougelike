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
    const cx = ROOM_WIDTH / 2;
    this.add.rectangle(cx, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x08070e, 1);

    // Check if run is over
    if (!this.dungeon.runActive) {
      this.scene.start('RunOverScene', { dungeon: this.dungeon, victory: this.dungeon.runWon });
      return;
    }

    const layer = this.dungeon.getCurrentLayer();
    const room = this.dungeon.getCurrentRoom();

    // ── Header: Layer + Sin info ──────────────────────────────────────────
    const layerNum = layer.layerIndex + 1;
    const sinName = layer.sinId ? SIN_DEFINITIONS[layer.sinId].displayName : 'The Devil';
    const sinColor = layer.sinId ? SIN_DEFINITIONS[layer.sinId].color : 0xff0000;
    const sinHex = '#' + sinColor.toString(16).padStart(6, '0');

    const headerT = this.add.text(cx, 28, `LAYER ${layerNum}`, uiText(20, '#d8ccf0', true)).setOrigin(0.5);
    applyTextShadow(headerT);
    this.add.text(cx, 52, `Domain of ${sinName}`, uiText(12, sinHex)).setOrigin(0.5);

    // ── Room progress dots ────────────────────────────────────────────────
    this.buildProgressBar(layer, 80);

    // ── Player stats bar ──────────────────────────────────────────────────
    this.buildStatsBar();

    // ── Room content ──────────────────────────────────────────────────────
    if (!room.chosen && room.choice) {
      this.showRoomChoice(room);
    } else {
      this.showRoomEntry(room);
    }
  }

  // ── Progress bar ────────────────────────────────────────────────────────

  private buildProgressBar(layer: any, y: number): void {
    const cx = ROOM_WIDTH / 2;
    const barW = Math.min(560, ROOM_WIDTH - 100);
    const roomCount = layer.rooms.length;
    const dotGap = barW / (roomCount - 1);
    const startX = cx - barW / 2;

    // Background line
    this.add.rectangle(cx, y, barW, 2, 0x3a2a5a, 0.3);

    // Completed progress line
    const completedCount = layer.rooms.filter((r: any) => r.completed).length;
    if (completedCount > 0) {
      const progressW = dotGap * completedCount;
      this.add.rectangle(startX + progressW / 2, y, progressW, 2, 0x55cc55, 0.6);
    }

    for (let i = 0; i < roomCount; i++) {
      const r = layer.rooms[i];
      const dx = startX + i * dotGap;

      let color = 0x444466;
      let size = 5;
      let alpha = 0.3;

      if (r.completed) {
        color = 0x55cc55; size = 6; alpha = 0.8;
      } else if (r.isCurrent) {
        color = 0xffcc44; size = 8; alpha = 1;
      }

      this.add.circle(dx, y, size, color, alpha);

      // Room type label
      const label = r.completed ? '✓' : r.isCurrent ? `${i + 1}` : `${i + 1}`;
      const labelColor = r.isCurrent ? '#ffcc44' : r.completed ? '#55cc55' : '#555577';
      this.add.text(dx, y + 16, label, uiText(8, labelColor)).setOrigin(0.5);

      // Room type name under current
      if (r.isCurrent) {
        const typeName = this.getRoomLabel(r.chosen ? r.type : 'CHOOSE');
        this.add.text(dx, y + 28, typeName, uiText(7, '#ffcc44')).setOrigin(0.5);
      }
    }
  }

  // ── Stats bar ───────────────────────────────────────────────────────────

  private buildStatsBar(): void {
    const prog = this.dungeon.progression;
    const y = ROOM_HEIGHT - 40;

    // HP bar
    const hpPct = prog.currentHp / prog.maxHp;
    const hpBarW = 120;
    this.add.rectangle(20 + hpBarW / 2, y, hpBarW, 8, 0x1a1a2a, 0.6);
    this.add.rectangle(20 + (hpBarW * hpPct) / 2, y, hpBarW * hpPct, 6, 0x44aa55, 0.8).setOrigin(0, 0.5);
    this.add.text(20, y - 12, `HP ${prog.currentHp}/${prog.maxHp}`, uiText(9, '#88aa99'));

    // Mana
    this.add.text(160, y - 12, `Mana ${prog.maxMana}`, uiText(9, '#6688cc'));

    // Gold
    this.add.text(260, y - 12, `Gold ${prog.gold}`, uiText(9, '#ccaa44'));

    // Components
    this.add.text(360, y - 12, `C:${prog.getCoreCount()} F:${prog.getFormCount()} P:${prog.getPrefixCount()} S:${prog.getSuffixCount()}`, uiText(8, '#778899'));

    // Relics
    if (prog.sinRelics.length > 0) {
      this.add.text(540, y - 12, `Relics: ${prog.sinRelics.length}`, uiText(9, '#ff8844'));
    }
  }

  // ── Room Choice (2 cards) ───────────────────────────────────────────────

  private showRoomChoice(room: any): void {
    const cx = ROOM_WIDTH / 2;
    const cy = ROOM_HEIGHT / 2 + 10;

    const chooseT = this.add.text(cx, cy - 170, 'CHOOSE YOUR PATH', uiText(18, '#ccbbee', true)).setOrigin(0.5);
    applyTextShadow(chooseT);

    this.add.text(cx, cy - 145, `Room ${room.roomIndex + 1} of 7`, uiText(10, '#777799')).setOrigin(0.5);

    // Card A (left)
    this.buildRoomCard(cx - 170, cy, room.choice.cardA, () => {
      this.dungeon.resolveChoice(room.choice.cardA);
      this.scene.restart({ dungeon: this.dungeon });
    });

    // OR divider
    this.add.text(cx, cy, 'OR', uiText(16, '#555577', true)).setOrigin(0.5);

    // Card B (right)
    this.buildRoomCard(cx + 170, cy, room.choice.cardB, () => {
      this.dungeon.resolveChoice(room.choice.cardB);
      this.scene.restart({ dungeon: this.dungeon });
    });
  }

  // ── Room Entry (single room to enter) ───────────────────────────────────

  private showRoomEntry(room: any): void {
    const cx = ROOM_WIDTH / 2;
    const cy = ROOM_HEIGHT / 2;

    const roomLabel = this.getRoomLabel(room.type);
    const roomColor = this.getRoomColor(room.type);
    const roomHex = '#' + roomColor.toString(16).padStart(6, '0');

    this.add.text(cx, cy - 100, `ROOM ${room.roomIndex + 1}`, uiText(12, '#8899aa')).setOrigin(0.5);

    // Room icon
    this.add.text(cx, cy - 55, this.getRoomSymbol(room.type), uiText(40, roomHex)).setOrigin(0.5);

    // Room name
    const nameT = this.add.text(cx, cy - 10, roomLabel, uiText(24, roomHex, true)).setOrigin(0.5);
    applyTextShadow(nameT);

    // Description
    this.add.text(cx, cy + 24, this.getRoomDesc(room.type), {
      ...uiText(11, '#8899aa'),
      align: 'center',
    }).setOrigin(0.5);

    // Reward hint
    const rewardHint = this.getRewardHint(room.type);
    if (rewardHint) {
      this.add.text(cx, cy + 50, rewardHint, uiText(10, '#667788')).setOrigin(0.5);
    }

    // Enter button
    const btn = createGlassPanel(this, cx, cy + 100, 220, 48, 10, 0.7);
    btn.setStrokeStyle(1.5, roomColor, 0.5).setInteractive({ useHandCursor: true });
    const btnTxt = this.add.text(cx, cy + 100, 'ENTER', uiText(16, roomHex, true)).setOrigin(0.5).setDepth(11);
    applyTextShadow(btnTxt);

    btn.on('pointerover', () => btn.setFillStyle(0x161228, 0.85));
    btn.on('pointerout', () => btn.setFillStyle(0x0c0a14, 0.7));
    btn.on('pointerdown', () => this.enterRoom(room));
  }

  // ── Room Card Builder ───────────────────────────────────────────────────

  private buildRoomCard(x: number, y: number, type: RoomType, onClick: () => void): void {
    const w = 240, h = 260;
    const color = this.getRoomColor(type);
    const hex = '#' + color.toString(16).padStart(6, '0');

    const card = createGlassPanel(this, x, y, w, h, 10, 0.75);
    card.setStrokeStyle(1, color, 0.35).setInteractive({ useHandCursor: true });

    // Icon
    this.add.text(x, y - 70, this.getRoomSymbol(type), uiText(36, hex)).setOrigin(0.5).setDepth(11);

    // Name
    const nameT = this.add.text(x, y - 20, this.getRoomLabel(type), uiText(18, hex, true)).setOrigin(0.5).setDepth(11);
    applyTextShadow(nameT);

    // Description
    this.add.text(x, y + 14, this.getRoomDesc(type), {
      ...uiText(10, '#8899aa'),
      align: 'center',
      wordWrap: { width: w - 30 },
    }).setOrigin(0.5).setDepth(11);

    // Reward hint
    const hint = this.getRewardHint(type);
    if (hint) {
      this.add.rectangle(x, y + 55, w - 30, 1, color, 0.15).setDepth(11);
      this.add.text(x, y + 70, hint, {
        ...uiText(9, '#667788'),
        align: 'center',
        wordWrap: { width: w - 30 },
      }).setOrigin(0.5).setDepth(11);
    }

    // Hover
    card.on('pointerover', () => {
      card.setStrokeStyle(2, color, 0.7);
      card.setFillStyle(0x161228, 0.85);
    });
    card.on('pointerout', () => {
      card.setStrokeStyle(1, color, 0.35);
      card.setFillStyle(0x0c0a14, 0.75);
    });
    card.on('pointerdown', onClick);
  }

  // ── Enter Room ──────────────────────────────────────────────────────────

  private enterRoom(room: any): void {
    const layerIdx = this.dungeon.currentLayerIndex;

    switch (room.type) {
      case RoomType.NORMAL:
      case RoomType.ELITE:
      case RoomType.SIN_BOSS:
      case RoomType.DEVIL:
        // Stop HUD scene so GameScene can launch its own
        if (this.scene.isActive('HUDScene')) this.scene.stop('HUDScene');
        this.scene.start('GameScene', {
          dungeon: this.dungeon,
          roomType: room.type,
          combatConfig: getCombatConfig(room.type, layerIdx),
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

  // ── Data Lookups ────────────────────────────────────────────────────────

  private getRoomLabel(type: RoomType | string): string {
    const labels: Record<string, string> = {
      NORMAL: 'NORMAL', ELITE: 'ELITE', SHRINE: 'SHRINE', VAULT: 'VAULT',
      SACRIFICE: 'SACRIFICE', SHOP_REST: 'SHOP & REST', SIN_BOSS: 'SIN BOSS',
      DEVIL: 'THE DEVIL', CHOOSE: 'CHOOSE',
    };
    return labels[type] || String(type);
  }

  private getRoomColor(type: RoomType): number {
    const colors: Record<string, number> = {
      NORMAL: 0x88aacc, ELITE: 0xff8844, SHRINE: 0xcc88ff, VAULT: 0xffcc44,
      SACRIFICE: 0xff4466, SHOP_REST: 0x44cc88, SIN_BOSS: 0xff4444, DEVIL: 0xff0000,
    };
    return colors[type] || 0x888888;
  }

  private getRoomSymbol(type: RoomType): string {
    const syms: Record<string, string> = {
      NORMAL: '⚔', ELITE: '★', SHRINE: '✦', VAULT: '◆',
      SACRIFICE: '☠', SHOP_REST: '♦', SIN_BOSS: '◉', DEVIL: '◉',
    };
    return syms[type] || '?';
  }

  private getRoomDesc(type: RoomType): string {
    const descs: Record<string, string> = {
      NORMAL: 'Standard combat encounter', ELITE: 'Difficult combat encounter',
      SHRINE: 'A mysterious magical shrine', VAULT: 'Choose a guaranteed reward',
      SACRIFICE: 'Trade a component\nfor a chance at something greater',
      SHOP_REST: 'Buy upgrades and restore health',
      SIN_BOSS: 'Face the Sin of this domain',
      DEVIL: 'The final battle awaits',
    };
    return descs[type] || '';
  }

  private getRewardHint(type: RoomType): string | null {
    const hints: Record<string, string> = {
      NORMAL: 'Reward: Gold + Core or Form',
      ELITE: 'Reward: Gold + Prefix or Suffix',
      VAULT: 'Choose: Foundation / Arsenal / Fortune',
      SACRIFICE: 'Roll: Common / Rare / Epic',
      SIN_BOSS: 'Reward: Gold + Sin Relic',
    };
    return hints[type] || null;
  }
}