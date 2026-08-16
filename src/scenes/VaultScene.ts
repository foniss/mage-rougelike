import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { VaultCategory, VAULT_REWARDS, RewardType, MANA_PER_NEW_COMPONENT, RoomType } from '../config/dungeonConfig';
import { RewardGenerator, RewardBundle, RewardChoice } from '../systems/dungeon/RewardGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, hexColor, fadeInUp, pulseGlow, OC } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';
import { ChoiceCard } from '../ui/ChoiceCard';
import { OccultButton } from '../ui/OccultButton';
import { RoomEnvironment } from '../visuals/environment/RoomEnvironment';
import { Player } from '../entities/Player';
import { InteractionSystem } from '../systems/InteractionSystem';
import { drawVaultKeeper } from '../visuals/environment/RoomNPCs';

export class VaultScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private player!: Player;
  private interaction!: InteractionSystem;
  private uiOpen = false;
  private uiContainer!: Phaser.GameObjects.Container;

  private rewardBundle: RewardBundle | null = null;
  private selectedChoice: RewardChoice | null = null;
  private choiceCards: ChoiceCard[] = [];
  private confirmBtn: OccultButton | null = null;
  private canConfirm = false;
  private vaultDone = false;

  private contBtn!: Phaser.GameObjects.Rectangle;
  private contTxt!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'VaultScene' }); }

  init(data: { dungeon: DungeonState }): void {
    this.dungeon = data.dungeon;
    this.rewardBundle = null;
    this.selectedChoice = null;
    this.choiceCards = [];
    this.confirmBtn = null;
    this.canConfirm = false;
    this.uiOpen = false;
    this.vaultDone = false;
  }

  create(): void {
    const layerIdx = this.dungeon.currentLayerIndex;
    const sinId = this.dungeon.getCurrentLayer()?.sinId ?? null;

    RoomEnvironment.create({ scene: this, roomType: RoomType.VAULT, layerIndex: layerIdx, sinId, drawWalls: true });

    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT * 0.7);
    this.syncPlayer();

    const keeperX = ROOM_WIDTH / 2, keeperY = ROOM_HEIGHT * 0.35;
    drawVaultKeeper(this, keeperX, keeperY);
    this.add.text(keeperX, keeperY - 55, 'VAULT KEEPER', uiText(10, '#ccaa44', true)).setOrigin(0.5).setDepth(9);

    this.interaction = new InteractionSystem(this, this.player);
    this.interaction.addInteractable({
      x: keeperX, y: keeperY, radius: 65,
      prompt: 'OPEN VAULT', enabled: true,
      onInteract: () => this.openVaultUI(),
    });

    this.uiContainer = this.add.container(0, 0).setDepth(90).setAlpha(0);

    // Continue button — hidden until vault is done
    this.contBtn = createGlassPanel(this, ROOM_WIDTH / 2, ROOM_HEIGHT - 30, 200, 34, 85, 0.7);
    this.contBtn.setStrokeStyle(1, 0x55cc66, 0.5).setInteractive({ useHandCursor: true }).setVisible(false);
    this.contTxt = this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT - 30, 'CONTINUE →', uiText(12, '#88ee88', true)).setOrigin(0.5).setDepth(86).setVisible(false);
    this.contBtn.on('pointerdown', () => {
      this.dungeon.advanceRoom();
      this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
    });

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

  private syncPlayer(): void {
    const prog = this.dungeon.progression;
    this.player.maxHp = prog.maxHp;
    this.player.hp = prog.currentHp;
    this.player.maxMana = prog.maxMana;
    this.player.mana = prog.maxMana;
  }

  private showContinueButton(): void {
    this.contBtn.setVisible(true);
    this.contTxt.setVisible(true);
  }

  // ── Vault UI ────────────────────────────────────────────────────────────

  private openVaultUI(): void {
    if (this.uiOpen || this.vaultDone) return;
    this.uiOpen = true;
    this.showCategorySelection();
  }

  private showCategorySelection(): void {
    this.cleanupUI();

    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    const prog = this.dungeon.progression;

    const overlay = this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6);
    this.uiContainer.add(overlay);

    const panel = this.add.rectangle(cx, cy, 700, 320, OC.panel, 0.95).setStrokeStyle(1, OC.purple, 0.4);
    this.uiContainer.add(panel);

    this.uiContainer.add(this.add.text(cx, cy - 140, 'THE VAULT', uiText(20, '#ffcc44', true)).setOrigin(0.5));
    this.uiContainer.add(this.add.text(cx, cy - 115, 'Choose your reward', uiText(11, '#8899aa')).setOrigin(0.5));

    const categories: { cat: VaultCategory; label: string; desc: string; subDesc: string; color: number; icon: string }[] = [
      { cat: VaultCategory.FOUNDATION, label: 'Foundation', desc: 'Core or Form', subDesc: prog.hasUnownedCoreOrForm() ? `+${MANA_PER_NEW_COMPONENT} Max Mana` : 'All owned', color: 0xff8844, icon: '◈' },
      { cat: VaultCategory.ARSENAL, label: 'Arsenal', desc: 'Prefix or Suffix', subDesc: prog.hasUnownedPrefixOrSuffix() ? 'New modifier' : 'All owned', color: 0x8888ff, icon: '◆' },
      { cat: VaultCategory.FORTUNE, label: 'Fortune', desc: `${VAULT_REWARDS[VaultCategory.FORTUNE].goldMin}–${VAULT_REWARDS[VaultCategory.FORTUNE].goldMax} Gold`, subDesc: 'Guaranteed currency', color: 0xffcc44, icon: '✦' },
    ];

    const cardW = 180, gap = 20;
    const totalW = categories.length * cardW + (categories.length - 1) * gap;
    const startX = cx - totalW / 2 + cardW / 2;

    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      const cardX = startX + i * (cardW + gap);
      const hex = '#' + c.color.toString(16).padStart(6, '0');

      const card = this.add.rectangle(cardX, cy + 10, cardW, 180, OC.panel2, 0.75).setStrokeStyle(1, c.color, 0.4).setInteractive({ useHandCursor: true });
      this.uiContainer.add(card);

      this.uiContainer.add(this.add.text(cardX, cy - 50, c.icon, uiText(28, hex)).setOrigin(0.5));
      this.uiContainer.add(this.add.text(cardX, cy, c.label, uiText(14, hex, true)).setOrigin(0.5));
      this.uiContainer.add(this.add.text(cardX, cy + 20, c.desc, uiText(9, '#aabbcc')).setOrigin(0.5));
      this.uiContainer.add(this.add.text(cardX, cy + 36, c.subDesc, uiText(8, '#667788')).setOrigin(0.5));

      card.on('pointerover', () => card.setStrokeStyle(2, c.color, 0.8));
      card.on('pointerout', () => card.setStrokeStyle(1, c.color, 0.4));
      card.on('pointerdown', () => this.selectCategory(c.cat));
    }

    this.uiContainer.setAlpha(1);
  }

  private selectCategory(category: VaultCategory): void {
    const prog = this.dungeon.progression;
    const bundle = RewardGenerator.generateVaultRewards(category, prog);

    if (category === VaultCategory.FORTUNE) {
      if (bundle.gold.amount && bundle.gold.amount > 0) prog.addGold(bundle.gold.amount);
      this.vaultDone = true;
      this.closeUI();
      this.showContinueButton();
      const txt = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, `+${bundle.gold.amount} Gold`, uiText(16, '#ffcc44', true)).setOrigin(0.5).setDepth(95);
      applyTextShadow(txt);
      this.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 1500, delay: 500, onComplete: () => txt.destroy() });
      return;
    }

    if (bundle.choices.length === 0) {
      this.vaultDone = true;
      this.closeUI();
      this.showContinueButton();
      return;
    }

    this.rewardBundle = bundle;
    this.showChoiceSelection();
  }

  private showChoiceSelection(): void {
    this.cleanupUI();

    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    const bundle = this.rewardBundle!;

    // Overlay + title in the container (depth 90)
    const overlay = this.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6);
    this.uiContainer.add(overlay);

    const catLabel = bundle.category.toUpperCase();
    const catColor = bundle.category === 'core' ? 0xff8844 : bundle.category === 'form' ? 0x8888ff : bundle.category === 'prefix' ? 0x88cc88 : 0xccaa66;

    this.uiContainer.add(this.add.text(cx, cy - 140, 'THE VAULT', uiText(18, '#ffcc44', true)).setOrigin(0.5));
    this.uiContainer.add(this.add.text(cx, cy - 118, `Choose your ${catLabel}:`, uiText(11, hexColor(catColor), true)).setOrigin(0.5));

    this.uiContainer.setAlpha(1);

    // ChoiceCards — created OUTSIDE the container, set to high depth so they render ON TOP
    this.selectedChoice = null;
    this.canConfirm = false;
    this.choiceCards = [];

    const cardWidth = 260, cardHeight = 130, spacing = 16;
    const totalWidth = bundle.choices.length * cardWidth + (bundle.choices.length - 1) * spacing;
    const startX = cx - totalWidth / 2 + cardWidth / 2;

    bundle.choices.forEach((choice, index) => {
      const x = startX + index * (cardWidth + spacing);
      const y = cy + 10;

      let rewardText = '';
      if (choice.type === RewardType.CORE || choice.type === RewardType.FORM) rewardText = `+${MANA_PER_NEW_COMPONENT} Max Mana`;

      const card = new ChoiceCard({
        scene: this, x, y, width: cardWidth, height: cardHeight,
        title: choice.displayName, category: choice.categoryLabel,
        description: choice.description, categoryColor: choice.categoryColor,
        rewardText,
        onClick: () => this.selectChoice(choice, card),
      });
      card.setDepth(95); // Above uiContainer (depth 90)
      this.choiceCards.push(card);
      fadeInUp(this, card, index, 14, 60);
    });

    // Confirm button — also outside container, high depth
    this.confirmBtn = new OccultButton({
      scene: this, x: cx, y: cy + 120, width: 200, height: 40,
      text: 'CONFIRM', variant: 'primary', disabled: true,
      onClick: () => { if (this.canConfirm) this.applyChoiceAndClose(); },
    });
    this.confirmBtn.setDepth(95);
  }

  private selectChoice(choice: RewardChoice, card: ChoiceCard): void {
    for (const c of this.choiceCards) c.setSelected(false);
    this.selectedChoice = choice;
    card.setSelected(true);
    if (!this.canConfirm && this.confirmBtn) {
      this.canConfirm = true;
      this.confirmBtn.setDisabled(false);
      pulseGlow(this, this.confirmBtn);
    }
  }

  private applyChoiceAndClose(): void {
    if (this.selectedChoice) this.applyReward(this.selectedChoice);
    this.vaultDone = true;
    this.closeUI();
    this.showContinueButton();

    if (this.selectedChoice) {
      const txt = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, `${this.selectedChoice.displayName} acquired!`, uiText(14, hexColor(this.selectedChoice.categoryColor), true)).setOrigin(0.5).setDepth(95);
      applyTextShadow(txt);
      this.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 1500, delay: 500, onComplete: () => txt.destroy() });
    }
  }

  private cleanupUI(): void {
    for (const c of this.choiceCards) c.destroy();
    this.choiceCards = [];
    if (this.confirmBtn) { this.confirmBtn.destroy(); this.confirmBtn = null; }
    this.uiContainer.removeAll(true);
  }

  private closeUI(): void {
    this.cleanupUI();
    this.uiContainer.setAlpha(0);
    this.uiOpen = false;
  }

  private applyReward(choice: RewardChoice): void {
    const prog = this.dungeon.progression;
    switch (choice.type) {
      case RewardType.CORE: if (choice.id) prog.addCore(choice.id as CoreId); break;
      case RewardType.FORM: if (choice.id) prog.addForm(choice.id as FormId); break;
      case RewardType.PREFIX: if (choice.id) prog.addPrefix(choice.id as PrefixId); break;
      case RewardType.SUFFIX: if (choice.id) prog.addSuffix(choice.id as SuffixId); break;
    }
  }
}
