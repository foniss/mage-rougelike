// src/scenes/SacrificeScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardGenerator, RewardBundle, RewardChoice } from '../systems/dungeon/RewardGenerator';
import { RewardType, SACRIFICE_TIER_WEIGHTS } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, createGlowPanel, fadeInUp, pulseGlow, hexColor } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';
import { OccultButton } from '../ui/OccultButton';
import { TransitionHelper } from '../ui/TransitionHelper';

export class SacrificeScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private resolved = false;
  private selectedCandidate: { type: string; id: string; name: string } | null = null;
  private candidateButtons: Phaser.GameObjects.Rectangle[] = [];
  private sacrificeBtn!: OccultButton;
  private canSacrifice = false;

  constructor() { super({ key: 'SacrificeScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; this.resolved = false; }

  create(): void {
    TransitionHelper.fadeSceneIn(this);
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

        // Selection border
        const selectBorder = this.add.rectangle(cx, iy, colW - 4, rowH - 4, 0x000000, 0).setStrokeStyle(3, color, 1).setDepth(12).setVisible(false);

        btn.on('pointerover', () => {
          if (this.selectedCandidate !== c) {
            btn.setStrokeStyle(1.5, color, 0.7);
          }
        });
        btn.on('pointerout', () => {
          if (this.selectedCandidate !== c) {
            btn.setStrokeStyle(1, color, 0.3);
          }
        });
        btn.on('pointerdown', () => this.selectCandidate(c, btn, selectBorder));

        this.candidateButtons.push(btn);
        btn.setData('candidate', c);
        btn.setData('selectBorder', selectBorder);
        btn.setData('color', color);
      }
    }

    // Sacrifice button (initially disabled)
    this.createSacrificeButton();

    // Leave button
    const leaveBtn = new OccultButton({
      scene: this,
      x: cx, y: ROOM_HEIGHT - 60,
      width: 200, height: 40,
      text: 'LEAVE',
      variant: 'secondary',
      onClick: () => {
        this.completeRoom();
      }
    });
  }

  private selectCandidate(candidate: { type: string; id: string; name: string }, btn: Phaser.GameObjects.Rectangle, selectBorder: Phaser.GameObjects.Rectangle): void {
    // Deselect previous
    if (this.selectedCandidate) {
      const prevBtn = this.candidateButtons.find(b => b.getData('candidate') === this.selectedCandidate);
      if (prevBtn) {
        const prevBorder = prevBtn.getData('selectBorder');
        const prevColor = prevBtn.getData('color');
        prevBorder.setVisible(false);
        prevBtn.setStrokeStyle(1, prevColor, 0.3);
      }
    }

    // Select new
    this.selectedCandidate = candidate;
    selectBorder.setVisible(true);
    btn.setStrokeStyle(1.5, btn.getData('color'), 0.8);

    // Enable sacrifice button
    this.enableSacrificeButton();
  }

  private createSacrificeButton(): void {
    const cx = ROOM_WIDTH / 2;
    const y = ROOM_HEIGHT - 110;

    this.sacrificeBtn = new OccultButton({
      scene: this,
      x: cx, y,
      width: 220, height: 44,
      text: 'SACRIFICE',
      variant: 'primary',
      disabled: true,
      onClick: () => {
        if (this.canSacrifice) {
          this.doSacrifice();
        }
      }
    });
  }

  private enableSacrificeButton(): void {
    this.canSacrifice = true;
    this.sacrificeBtn.setDisabled(false);
    pulseGlow(this, this.sacrificeBtn);
  }

  private doSacrifice(): void {
    if (this.resolved || !this.selectedCandidate) return;
    const prog = this.dungeon.progression;

    // Remove the sacrificed component
    let removed = false;
    switch (this.selectedCandidate.type) {
      case 'core': removed = prog.removeCore(this.selectedCandidate.id as CoreId); break;
      case 'form': removed = prog.removeForm(this.selectedCandidate.id as FormId); break;
      case 'prefix': removed = prog.removePrefix(this.selectedCandidate.id as PrefixId); break;
      case 'suffix': removed = prog.removeSuffix(this.selectedCandidate.id as SuffixId); break;
    }

    if (!removed) return;

    // Roll tier
    const tier = RewardGenerator.rollSacrificeTier();
    const rewardBundle = RewardGenerator.generateSacrificeReward(tier, prog);

    if (rewardBundle) {
      // Apply the reward (player gets the first choice, or the sin relic)
      if (rewardBundle.choices.length > 0) {
        const choice = rewardBundle.choices[0];
        switch (choice.type) {
          case RewardType.CORE: if (choice.id) prog.addCore(choice.id as CoreId); break;
          case RewardType.FORM: if (choice.id) prog.addForm(choice.id as FormId); break;
          case RewardType.PREFIX: if (choice.id) prog.addPrefix(choice.id as PrefixId); break;
          case RewardType.SUFFIX: if (choice.id) prog.addSuffix(choice.id as SuffixId); break;
          case RewardType.SIN_RELIC:
            prog.addSinRelic({
              sinId: prog.getAvailableSins()[0] || ('SACRIFICE' as any),
              name: 'Sacrificial Relic',
              description: 'Born from sacrifice.',
            });
            break;
        }
      }
    }

    this.completeRoom();
  }

  private completeRoom(): void {
    if (this.resolved) return;
    this.resolved = true;
    this.dungeon.advanceRoom();
    TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
  }
}
