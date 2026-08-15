// src/scenes/SacrificeScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardGenerator } from '../systems/dungeon/RewardGenerator';
import { RewardType, SACRIFICE_TIER_WEIGHTS } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';

export class SacrificeScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private resolved = false;
  constructor() { super({ key: 'SacrificeScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; this.resolved = false; }

  create(): void {
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x06050a, 1);

    this.add.text(cx, 40, 'SACRIFICE', uiText(22, '#ff4466', true)).setOrigin(0.5);
    this.add.text(cx, 70, 'Offer a component to the void...', uiText(12, '#8899aa')).setOrigin(0.5);

    // Tier chances display
    const total = SACRIFICE_TIER_WEIGHTS.common + SACRIFICE_TIER_WEIGHTS.rare + SACRIFICE_TIER_WEIGHTS.epic;
    const commonPct = Math.round((SACRIFICE_TIER_WEIGHTS.common / total) * 100);
    const rarePct = Math.round((SACRIFICE_TIER_WEIGHTS.rare / total) * 100);
    const epicPct = Math.round((SACRIFICE_TIER_WEIGHTS.epic / total) * 100);
    this.add.text(cx, 94, `Common ${commonPct}%  ·  Rare ${rarePct}%  ·  Epic ${epicPct}%`, uiText(9, '#667788')).setOrigin(0.5);

    const candidates = prog.getSacrificeCandidates();

    if (candidates.length === 0) {
      this.add.text(cx, cy, 'Nothing to sacrifice.', uiText(14, '#887766')).setOrigin(0.5);
    } else {
      const startY = 130;
      const colW = 300;
      const rowH = 36;

      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const iy = startY + i * (rowH + 4);
        const typeLabel = c.type.toUpperCase();

        const typeColors: Record<string, number> = {
          core: 0xff8844, form: 0x8888ff, prefix: 0x88cc88, suffix: 0xccaa66,
        };
        const color = typeColors[c.type] || 0x888888;
        const hex = '#' + color.toString(16).padStart(6, '0');

        const btn = createGlassPanel(this, cx, iy, colW, rowH, 10);
        btn.setStrokeStyle(1, color, 0.3).setInteractive({ useHandCursor: true });

        this.add.text(cx - colW / 2 + 12, iy, typeLabel, uiText(8, hex, true)).setOrigin(0, 0.5).setDepth(11);
        this.add.text(cx, iy, c.name, uiText(11, '#ccddee', true)).setOrigin(0.5).setDepth(11);

        btn.on('pointerover', () => btn.setStrokeStyle(1.5, color, 0.7));
        btn.on('pointerout', () => btn.setStrokeStyle(1, color, 0.3));
        btn.on('pointerdown', () => this.doSacrifice(c));
      }
    }

    // Leave button
    const leaveBtn = createGlassPanel(this, cx, ROOM_HEIGHT - 60, 200, 40, 10);
    leaveBtn.setStrokeStyle(1, 0x888888, 0.3).setInteractive({ useHandCursor: true });
    this.add.text(cx, ROOM_HEIGHT - 60, 'LEAVE', uiText(13, '#aabbcc', true)).setOrigin(0.5).setDepth(11);
    leaveBtn.on('pointerdown', () => {
      this.completeRoom();
    });
  }

  private doSacrifice(candidate: { type: string; id: string; name: string }): void {
    if (this.resolved) return;
    const prog = this.dungeon.progression;

    // Remove the sacrificed component
    let removed = false;
    switch (candidate.type) {
      case 'core': removed = prog.removeCore(candidate.id as CoreId); break;
      case 'form': removed = prog.removeForm(candidate.id as FormId); break;
      case 'prefix': removed = prog.removePrefix(candidate.id as PrefixId); break;
      case 'suffix': removed = prog.removeSuffix(candidate.id as SuffixId); break;
    }

    if (!removed) return;

    // Roll tier
    const tier = RewardGenerator.rollSacrificeTier();
    const reward = RewardGenerator.generateSacrificeReward(tier, prog);

    if (reward) {
      // Apply immediately
      switch (reward.type) {
        case RewardType.CORE: if (reward.id) prog.addCore(reward.id as CoreId); break;
        case RewardType.FORM: if (reward.id) prog.addForm(reward.id as FormId); break;
        case RewardType.PREFIX: if (reward.id) prog.addPrefix(reward.id as PrefixId); break;
        case RewardType.SUFFIX: if (reward.id) prog.addSuffix(reward.id as SuffixId); break;
        case RewardType.SIN_RELIC:
          // Sin relic from sacrifice — create a generic one
          prog.addSinRelic({
            sinId: prog.getAvailableSins()[0] || ('SACRIFICE' as any),
            name: 'Sacrificial Relic',
            description: 'Born from sacrifice.',
          });
          break;
      }
    }

    this.completeRoom();
  }

  private completeRoom(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.dungeon.advanceRoom();
    this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
  }
}
