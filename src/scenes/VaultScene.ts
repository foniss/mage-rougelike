// src/scenes/VaultScene.ts

import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { VaultCategory, VAULT_REWARDS, RewardType, MANA_PER_NEW_COMPONENT } from '../config/dungeonConfig';
import { RewardGenerator, RewardBundle, RewardChoice } from '../systems/dungeon/RewardGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, createGlowPanel, fadeInUp, pulseGlow, hexColor } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';
import { ChoiceCard } from '../ui/ChoiceCard';
import { OccultButton } from '../ui/OccultButton';
import { TransitionHelper } from '../ui/TransitionHelper';

export class VaultScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private selectedCategory: VaultCategory | null = null;
  private categoryCards: Phaser.GameObjects.Rectangle[] = [];
  private rewardBundle: RewardBundle | null = null;
  private choiceCards: ChoiceCard[] = [];
  private continueBtn!: OccultButton;
  private canContinue = false;
  private state: 'category' | 'choices' = 'category';
  private selectedChoice: RewardChoice | null = null;

  constructor() { super({ key: 'VaultScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; }

  create(): void {
    TransitionHelper.fadeSceneIn(this);
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

      // Selection border
      const selectBorder = this.add.rectangle(cardX, cy, cardW - 4, cardH - 4, 0x000000, 0).setStrokeStyle(3, c.color, 1).setDepth(12).setVisible(false);

      card.on('pointerover', () => {
        if (this.selectedCategory !== c.cat) {
          card.setStrokeStyle(2, c.color, 0.8);
        }
      });
      card.on('pointerout', () => {
        if (this.selectedCategory !== c.cat) {
          card.setStrokeStyle(1, c.color, 0.4);
        }
      });
      card.on('pointerdown', () => this.selectCategory(c.cat, card, selectBorder, c.color));

      this.categoryCards.push(card);
      card.setData('category', c.cat);
      card.setData('selectBorder', selectBorder);
      card.setData('color', c.color);
    }

    // Current stats
    this.add.text(cx, ROOM_HEIGHT - 40, `Gold: ${prog.gold}  |  Cores: ${prog.getCoreCount()}  Forms: ${prog.getFormCount()}  Prefixes: ${prog.getPrefixCount()}  Suffixes: ${prog.getSuffixCount()}`, uiText(9, '#667788')).setOrigin(0.5);
  }

  private selectCategory(category: VaultCategory, card: Phaser.GameObjects.Rectangle, selectBorder: Phaser.GameObjects.Rectangle, color: number): void {
    // Deselect previous
    if (this.selectedCategory) {
      const prevCard = this.categoryCards.find(c => c.getData('category') === this.selectedCategory);
      if (prevCard) {
        const prevBorder = prevCard.getData('selectBorder');
        const prevColor = prevCard.getData('color');
        prevBorder.setVisible(false);
        prevCard.setStrokeStyle(1, prevColor, 0.4);
      }
    }

    // Select new
    this.selectedCategory = category;
    selectBorder.setVisible(true);
    card.setStrokeStyle(2, color, 0.8);

    // Generate reward bundle for this category
    const prog = this.dungeon.progression;
    this.rewardBundle = RewardGenerator.generateVaultRewards(category, prog);

    // If it's Fortune (gold only), apply immediately and continue
    if (category === VaultCategory.FORTUNE) {
      if (this.rewardBundle.gold.amount && this.rewardBundle.gold.amount > 0) {
        prog.addGold(this.rewardBundle.gold.amount);
      }
      this.dungeon.advanceRoom();
      TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
      return;
    }

    // Otherwise, show choices
    this.showChoices();
  }

  private showChoices(): void {
    if (!this.rewardBundle || this.rewardBundle.choices.length === 0) {
      // No choices available, just continue
      this.dungeon.advanceRoom();
      TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
      return;
    }

    this.state = 'choices';

    // Hide category cards
    for (const card of this.categoryCards) {
      card.setVisible(false);
      card.disableInteractive();
      const border = card.getData('selectBorder');
      if (border) border.setVisible(false);
    }

    // Update title
    const cx = ROOM_WIDTH / 2;
    this.add.text(cx, 40, 'THE VAULT', uiText(22, '#ffcc44', true)).setOrigin(0.5);
    const catLabel = this.getCategoryLabel(this.rewardBundle.category);
    const catColor = this.getCategoryColor(this.rewardBundle.category);
    const catHex = hexColor(catColor);
    this.add.text(cx, 70, `Choose your ${catLabel}:`, uiText(12, catHex, true)).setOrigin(0.5);

    // Create choice cards
    const startY = 150;
    const cardWidth = 280;
    const cardHeight = 140;
    const spacing = 20;
    this.createChoiceCards(startY, cx, cardWidth, cardHeight, spacing);
this.createContinueButton();
  }

  private createChoiceCards(startY: number, cx: number, cardWidth: number, cardHeight: number, spacing: number): void {
    const totalWidth = this.rewardBundle!.choices.length * cardWidth + (this.rewardBundle!.choices.length - 1) * spacing;
    const startX = cx - totalWidth / 2 + cardWidth / 2;

    this.rewardBundle!.choices.forEach((choice, index) => {
      const x = startX + index * (cardWidth + spacing);
      const y = startY + cardHeight / 2;
      
      let rewardText = '';
      if (choice.type === RewardType.CORE || choice.type === RewardType.FORM) {
        rewardText = `+${MANA_PER_NEW_COMPONENT} Max Mana`;
      }

      const card = new ChoiceCard({
        scene: this,
        x, y,
        width: cardWidth,
        height: cardHeight,
        title: choice.displayName,
        category: choice.categoryLabel,
        description: choice.description,
        categoryColor: choice.categoryColor,
        rewardText,
        onClick: () => {
          this.selectChoice(choice, card);
        }
      });
      
      this.choiceCards.push(card);
      fadeInUp(this, card, index, 14, 60);
    });
  }

  private selectChoice(choice: RewardChoice, card: ChoiceCard): void {
    if (this.selectedChoice) {
      const prev = this.choiceCards.find(c => (c as any).config.title === this.selectedChoice!.displayName && (c as any).config.description === this.selectedChoice!.description);
      if (prev) prev.setSelected(false);
    }

    this.selectedChoice = choice;
    card.setSelected(true);
    this.enableContinueButton();
  }

  private createContinueButton(): void {
    const cx = ROOM_WIDTH / 2;
    const y = ROOM_HEIGHT - 60;

    this.continueBtn = new OccultButton({
      scene: this,
      x: cx, y,
      width: 220, height: 44,
      text: 'CONTINUE',
      variant: 'primary',
      disabled: true,
      onClick: () => {
        if (this.canContinue) {
          this.applySelectedAndContinue();
        }
      }
    });
  }

  private enableContinueButton(): void {
    this.canContinue = true;
    this.continueBtn.setDisabled(false);
    pulseGlow(this, this.continueBtn);
  }

  private applySelectedAndContinue(): void {
    // Apply the selected choice
    if (this.selectedChoice) {
      this.applyRewardChoice(this.selectedChoice);
    }

    // Advance dungeon
    this.dungeon.advanceRoom();
    TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
  }

  private applyRewardChoice(choice: RewardChoice): boolean {
    const prog = this.dungeon.progression;
    switch (choice.type) {
      case RewardType.CORE:
        return choice.id ? prog.addCore(choice.id as CoreId) : false;
      case RewardType.FORM:
        return choice.id ? prog.addForm(choice.id as FormId) : false;
      case RewardType.PREFIX:
        return choice.id ? prog.addPrefix(choice.id as PrefixId) : false;
      case RewardType.SUFFIX:
        return choice.id ? prog.addSuffix(choice.id as SuffixId) : false;
      default:
        return false;
    }
  }

  private getCategoryLabel(category: string): string {
    switch (category) {
      case 'core': return 'CORE';
      case 'form': return 'FORM';
      case 'prefix': return 'PREFIX';
      case 'suffix': return 'SUFFIX';
      default: return '';
    }
  }

  private getCategoryColor(category: string): number {
    switch (category) {
      case 'core': return 0xff8844;
      case 'form': return 0x8888ff;
      case 'prefix': return 0x88cc88;
      case 'suffix': return 0xccaa66;
      default: return 0x888888;
    }
  }
}
