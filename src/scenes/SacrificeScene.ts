import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardGenerator, RewardBundle, RewardChoice } from '../systems/dungeon/RewardGenerator';
import { RewardType, SACRIFICE_TIER_WEIGHTS, RoomType } from '../config/dungeonConfig';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, hexColor, OC } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';
import { OccultButton } from '../ui/OccultButton';
import { TransitionHelper } from '../ui/TransitionHelper';
import { RoomEnvironment } from '../visuals/environment/RoomEnvironment';
import { Player } from '../entities/Player';
import { InteractionSystem } from '../systems/InteractionSystem';
import { drawRitualist } from '../visuals/environment/RoomNPCs';

export class SacrificeScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private player!: Player;
  private interaction!: InteractionSystem;
  private uiOpen = false;
  private uiContainer!: Phaser.GameObjects.Container;
  private resolved = false;
  private contBtn!: Phaser.GameObjects.Rectangle;
  private contTxt!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'SacrificeScene' }); }

  init(data: { dungeon: DungeonState }): void {
    this.dungeon = data.dungeon;
    this.resolved = false;
    this.uiOpen = false;
  }

  create(): void {
    const layerIdx = this.dungeon.currentLayerIndex;
    const sinId = this.dungeon.getCurrentLayer()?.sinId ?? null;

    RoomEnvironment.create({ scene: this, roomType: RoomType.SACRIFICE, layerIndex: layerIdx, sinId, drawWalls: true });

    // Player
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT * 0.75);
    const prog = this.dungeon.progression;
    this.player.maxHp = prog.maxHp;
    this.player.hp = prog.currentHp;

    // Ritualist NPC at center
    const ritX = ROOM_WIDTH / 2, ritY = ROOM_HEIGHT * 0.35;
    drawRitualist(this, ritX, ritY);
    this.add.text(ritX, ritY - 60, 'RITUALIST', uiText(10, '#cc4455', true)).setOrigin(0.5).setDepth(9);

    // Interaction
    this.interaction = new InteractionSystem(this, this.player);
    this.interaction.addInteractable({
      x: ritX, y: ritY, radius: 65,
      prompt: 'SACRIFICE', enabled: true,
      onInteract: () => this.openSacrificeUI(),
    });

    // UI container
    this.uiContainer = this.add.container(0, 0).setDepth(90).setAlpha(0);

    // Continue button — hidden until sacrifice is done
    this.contBtn = createGlassPanel(this, ROOM_WIDTH / 2, ROOM_HEIGHT - 30, 200, 34, 85, 0.7);
    this.contBtn.setStrokeStyle(1, 0x55cc66, 0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.contTxt = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT - 30, 'CONTINUE →', uiText(12, '#88ee88', true)).setOrigin(0.5).setDepth(86).setVisible(false);
    this.contBtn.on('pointerdown', () => this.completeRoom());

    this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT - 10, 'WASD Move  ·  E Interact', uiText(7, '#44445580')).setOrigin(0.5).setDepth(85);
  }

  update(): void {
    if (!this.uiOpen) {
      this.player.update();
      this.interaction.update();
    } else {
      this.player.sprite.setVelocity(0, 0);
    }
  }

  // ── Sacrifice UI ────────────────────────────────────────────────────────

  private openSacrificeUI(): void {
    if (this.uiOpen || this.resolved) return;
    this.uiOpen = true;
    this.showOfferingPanel();
  }

  private showOfferingPanel(): void {
    this.uiContainer.removeAll(true);
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6);
    this.uiContainer.add(overlay);

    const panel = this.add.rectangle(cx, cy, 460, 420, OC.panel, 0.95).setStrokeStyle(1, 0xcc2233, 0.4);
    this.uiContainer.add(panel);

    this.uiContainer.add(this.add.text(cx, cy - 190, 'SACRIFICE', uiText(18, '#ff4466', true)).setOrigin(0.5));
    this.uiContainer.add(this.add.text(cx, cy - 168, 'Offer a component to the void...', uiText(10, '#8899aa')).setOrigin(0.5));

    // Tier chances
    const total = SACRIFICE_TIER_WEIGHTS.common + SACRIFICE_TIER_WEIGHTS.rare + SACRIFICE_TIER_WEIGHTS.epic;
    const commonPct = Math.round((SACRIFICE_TIER_WEIGHTS.common / total) * 100);
    const rarePct = Math.round((SACRIFICE_TIER_WEIGHTS.rare / total) * 100);
    const epicPct = Math.round((SACRIFICE_TIER_WEIGHTS.epic / total) * 100);
    this.uiContainer.add(this.add.text(cx, cy - 148, `Common ${commonPct}%  ·  Rare ${rarePct}%  ·  Epic ${epicPct}%`, uiText(8, '#667788')).setOrigin(0.5));

    const candidates = prog.getSacrificeCandidates();

    if (candidates.length === 0) {
      this.uiContainer.add(this.add.text(cx, cy, 'Nothing to sacrifice.', uiText(13, '#887766')).setOrigin(0.5));
    } else {
      let dy = cy - 120;
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const iy = dy + i * 38;
        const typeColors: Record<string, number> = { core: 0xff8844, form: 0x8888ff, prefix: 0x88cc88, suffix: 0xccaa66 };
        const color = typeColors[c.type] || 0x888888;
        const hex = '#' + color.toString(16).padStart(6, '0');

        const btn = this.add.rectangle(cx, iy, 380, 32, OC.panel2, 0.7).setStrokeStyle(1, color, 0.3).setInteractive({ useHandCursor: true });
        this.uiContainer.add(btn);
        this.uiContainer.add(this.add.text(cx - 170, iy, c.type.toUpperCase(), uiText(8, hex, true)).setOrigin(0, 0.5));
        this.uiContainer.add(this.add.text(cx, iy, c.name, uiText(11, '#ccddee', true)).setOrigin(0.5));

        btn.on('pointerover', () => btn.setStrokeStyle(1.5, color, 0.7));
        btn.on('pointerout', () => btn.setStrokeStyle(1, color, 0.3));
        btn.on('pointerdown', () => this.doSacrifice(c));
      }
    }

    // Close/Leave button — sacrifice is optional, player can decline
    const closeBtn = this.add.rectangle(cx, cy + 180, 140, 30, OC.panel2, 0.7).setStrokeStyle(1, OC.purple, 0.3).setInteractive({ useHandCursor: true });
    this.uiContainer.add(closeBtn);
    this.uiContainer.add(this.add.text(cx, cy + 180, 'DECLINE', uiText(11, '#aabbcc')).setOrigin(0.5));
    closeBtn.on('pointerdown', () => {
      this.closeUI();
      // Sacrifice is optional — show continue button even without sacrificing
      this.contBtn.setVisible(true);
      this.contTxt.setVisible(true);
    });

    this.uiContainer.setAlpha(1);
  }

  // ── Sacrifice logic (preserved from original) ──────────────────────────

  private doSacrifice(candidate: { type: string; id: string; name: string }): void {
    if (this.resolved) return;
    this.resolved = true;

    const prog = this.dungeon.progression;

    let removed = false;
    switch (candidate.type) {
      case 'core': removed = prog.removeCore(candidate.id as CoreId); break;
      case 'form': removed = prog.removeForm(candidate.id as FormId); break;
      case 'prefix': removed = prog.removePrefix(candidate.id as PrefixId); break;
      case 'suffix': removed = prog.removeSuffix(candidate.id as SuffixId); break;
    }

    if (!removed) { this.resolved = false; return; }

    const tier = RewardGenerator.rollSacrificeTier();
    const rewardBundle = RewardGenerator.generateSacrificeReward(tier, prog);

    let rewardName = 'Nothing';
    let rewardColor = 0x888888;

    if (rewardBundle && rewardBundle.choices.length > 0) {
      const choice = rewardBundle.choices[0];
      rewardName = choice.displayName;
      rewardColor = choice.categoryColor;

      switch (choice.type) {
        case RewardType.CORE: if (choice.id) prog.addCore(choice.id as CoreId); break;
        case RewardType.FORM: if (choice.id) prog.addForm(choice.id as FormId); break;
        case RewardType.PREFIX: if (choice.id) prog.addPrefix(choice.id as PrefixId); break;
        case RewardType.SUFFIX: if (choice.id) prog.addSuffix(choice.id as SuffixId); break;
        case RewardType.SIN_RELIC:
          const availSins = prog.getAvailableSins();
          const sinId = availSins.length > 0 ? availSins[0] : null;
          if (sinId) {
            prog.addSinRelic({ sinId, name: 'Sacrificial Relic', description: 'Born from sacrifice.' });
          }
          rewardName = 'Sacrificial Relic';
          rewardColor = 0xff4466;
          break;
      }
    }

    this.showResultPanel(candidate.name, tier, rewardName, rewardColor);
  }

  // ── Result panel ────────────────────────────────────────────────────────

  private showResultPanel(sacrificedName: string, tier: 'common' | 'rare' | 'epic', rewardName: string, rewardColor: number): void {
    this.uiContainer.removeAll(true);

    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

    const overlay = this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6);
    this.uiContainer.add(overlay);

    const panel = this.add.rectangle(cx, cy, 400, 300, OC.panel, 0.95).setStrokeStyle(1, 0xcc2233, 0.4);
    this.uiContainer.add(panel);

    this.uiContainer.add(this.add.text(cx, cy - 120, 'SACRIFICE', uiText(18, '#ff4466', true)).setOrigin(0.5));

    // What was sacrificed
    this.uiContainer.add(this.add.text(cx, cy - 70, 'Offered to the void:', uiText(10, '#8899aa')).setOrigin(0.5));
    const sacTxt = this.add.text(cx, cy - 50, sacrificedName, uiText(14, '#ff6677', true)).setOrigin(0.5);
    applyTextShadow(sacTxt);
    this.uiContainer.add(sacTxt);

    // Tier
    const tierColors: Record<string, number> = { common: 0x8899aa, rare: 0xaa88ff, epic: 0xff4466 };
    const tierLabels: Record<string, string> = { common: 'COMMON', rare: 'RARE', epic: '✦ EPIC ✦' };
    const tierHex = hexColor(tierColors[tier] || 0x888888);

    this.uiContainer.add(this.add.text(cx, cy - 20, 'The void answers...', uiText(9, '#667788')).setOrigin(0.5));
    const tierTxt = this.add.text(cx, cy, tierLabels[tier], uiText(16, tierHex, true)).setOrigin(0.5);
    applyTextShadow(tierTxt);
    this.uiContainer.add(tierTxt);

    // What was received
    this.uiContainer.add(this.add.text(cx, cy + 35, 'Received:', uiText(10, '#8899aa')).setOrigin(0.5));
    const rewardHex = hexColor(rewardColor);
    const rewardTxt = this.add.text(cx, cy + 58, rewardName, uiText(18, rewardHex, true)).setOrigin(0.5);
    applyTextShadow(rewardTxt);
    this.uiContainer.add(rewardTxt);

    // Entrance animation
    rewardTxt.setAlpha(0);
    this.tweens.add({ targets: rewardTxt, alpha: 1, y: cy + 54, duration: 400, delay: 300, ease: 'Cubic.easeOut' });

    // Continue button
    const closeBtn = this.add.rectangle(cx, cy + 110, 180, 34, OC.panel2, 0.7).setStrokeStyle(1, 0x55cc66, 0.4).setInteractive({ useHandCursor: true });
    this.uiContainer.add(closeBtn);
    this.uiContainer.add(this.add.text(cx, cy + 110, 'CONTINUE', uiText(12, '#88ee88', true)).setOrigin(0.5));
    closeBtn.on('pointerdown', () => {
      this.closeUI();
      // Sacrifice complete — show room continue button
      this.contBtn.setVisible(true);
      this.contTxt.setVisible(true);
    });

    this.uiContainer.setAlpha(1);

    // Ritual flash at altar position
    const ritX = ROOM_WIDTH / 2, ritY = ROOM_HEIGHT * 0.35;
    const flash = this.add.circle(ritX, ritY, 25, 0xcc2233, 0.4).setDepth(9);
    this.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 800, onComplete: () => flash.destroy() });
  }

  private closeUI(): void {
    this.uiContainer.removeAll(true);
    this.uiContainer.setAlpha(0);
    this.uiOpen = false;
  }

  private completeRoom(): void {
    this.dungeon.advanceRoom();
    TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
  }
}
