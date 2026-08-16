import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { RewardBundle, RewardChoice } from '../systems/dungeon/RewardGenerator';
import { RewardType, RoomType, SIN_DEFINITIONS, MANA_PER_NEW_COMPONENT } from '../config/dungeonConfig';
import { SinGenerator } from '../systems/dungeon/SinGenerator';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { RoomEnvironment } from '../visuals/environment/RoomEnvironment';
import { uiText, applyTextShadow, fadeInUp, pulseGlow, hexColor } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';
import { ChoiceCard } from '../ui/ChoiceCard';
import { OccultButton } from '../ui/OccultButton';
import { TransitionHelper } from '../ui/TransitionHelper';

export class RewardScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private rewardBundle!: RewardBundle;
  private roomType!: RoomType;
  private selectedChoice: RewardChoice | null = null;
  private choiceCards: ChoiceCard[] = [];
  private continueBtn!: OccultButton;
  private canContinue = false;

  constructor() { super({ key: 'RewardScene' }); }

  init(data: { dungeon: DungeonState; rewardBundle: RewardBundle; roomType: RoomType }): void {
    this.dungeon = data.dungeon;
    this.rewardBundle = data.rewardBundle;
    this.roomType = data.roomType;
    this.selectedChoice = null;
    this.canContinue = false;
  }

  create(): void {
    TransitionHelper.fadeSceneIn(this);
    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2;

    // Background
    RoomEnvironment.createBackground(this, this.roomType, this.dungeon.currentLayerIndex, this.dungeon.getCurrentLayer()?.sinId);

    // Title
    this.add.text(cx, 30, 'VICTORY', uiText(24, '#ffcc44', true)).setOrigin(0.5);

    let sinRelicAwarded = false;
    let startY = 80;

    // Sin boss: award sin relic
    if (this.roomType === RoomType.SIN_BOSS) {
      const layer = this.dungeon.getCurrentLayer();
      if (layer.sinId) {
        const relic = SinGenerator.createSinRelic(layer.sinId);
        prog.addSinRelic(relic);
        prog.defeatSin(layer.sinId);
        sinRelicAwarded = true;

        const sinDef = SIN_DEFINITIONS[layer.sinId];
        const sinHex = '#' + sinDef.color.toString(16).padStart(6, '0');

        this.add.text(cx, 70, '✦ SIN RELIC OBTAINED ✦', uiText(14, sinHex, true)).setOrigin(0.5);
        this.add.text(cx, 95, relic.name, uiText(16, '#ffcc88', true)).setOrigin(0.5);
        this.add.text(cx, 118, relic.description, uiText(10, '#8899aa')).setOrigin(0.5);
        startY = 150;
      }
    }

    // Gold reward (auto-granted)
    if (this.rewardBundle.gold.amount && this.rewardBundle.gold.amount > 0) {
      prog.addGold(this.rewardBundle.gold.amount);
      const gt = this.add.text(cx, startY, `+${this.rewardBundle.gold.amount} Gold`, uiText(14, '#ffcc44', true)).setOrigin(0.5);
      applyTextShadow(gt);
      startY += 35;
    }

    // Choice cards (if any)
    if (this.rewardBundle.choices.length > 0) {
      const catLabel = this.rewardBundle.category.toUpperCase();
      const catColor = this.getCategoryColor(this.rewardBundle.category);
      this.add.text(cx, startY, `Choose your reward: ${catLabel}`, uiText(12, hexColor(catColor), true)).setOrigin(0.5);
      startY += 30;
    }

    this.createChoiceCards(startY);

    // Stats summary
    const summaryY = ROOM_HEIGHT - 120;
    this.add.text(cx, summaryY, `HP: ${prog.currentHp}/${prog.maxHp}  |  Mana: ${prog.maxMana}  |  Gold: ${prog.gold}`, uiText(11, '#8899aa')).setOrigin(0.5);
    this.add.text(cx, summaryY + 20, `Cores: ${prog.getCoreCount()}  Forms: ${prog.getFormCount()}  Prefixes: ${prog.getPrefixCount()}  Suffixes: ${prog.getSuffixCount()}  Relics: ${prog.sinRelics.length}`, uiText(9, '#667788')).setOrigin(0.5);

    // Continue button
    this.createContinueButton();

    // FIX: If there are no choices to make, enable Continue immediately
    if (this.rewardBundle.choices.length === 0) {
      this.enableContinueButton();
    }
  }

  private createChoiceCards(startY: number): void {
    const cx = ROOM_WIDTH / 2;
    const cardWidth = 280, cardHeight = 140, spacing = 20;
    const totalWidth = this.rewardBundle.choices.length * cardWidth + (this.rewardBundle.choices.length - 1) * spacing;
    const startX = cx - totalWidth / 2 + cardWidth / 2;

    this.rewardBundle.choices.forEach((choice, index) => {
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
        },
      });

      this.choiceCards.push(card);
      fadeInUp(this, card, index, 14, 60);
    });
  }

  private selectChoice(choice: RewardChoice, card: ChoiceCard): void {
    for (const c of this.choiceCards) c.setSelected(false);
    this.selectedChoice = choice;
    card.setSelected(true);
    this.enableContinueButton();
  }

  private createContinueButton(): void {
    this.continueBtn = new OccultButton({
      scene: this,
      x: ROOM_WIDTH / 2,
      y: ROOM_HEIGHT - 60,
      width: 220,
      height: 44,
      text: 'CONTINUE',
      variant: 'primary',
      disabled: true,
      onClick: () => {
        if (this.canContinue) this.applySelectedAndContinue();
      },
    });
  }

  private enableContinueButton(): void {
    this.canContinue = true;
    this.continueBtn.setDisabled(false);
    pulseGlow(this, this.continueBtn);
  }

  private applySelectedAndContinue(): void {
    if (this.selectedChoice) this.applyRewardChoice(this.selectedChoice);

    const hasMoreRooms = this.dungeon.advanceRoom();
    if (hasMoreRooms) {
      TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
    } else {
      this.dungeon.advanceLayer();
      TransitionHelper.fadeSceneOut(this, 'DungeonMapScene', { dungeon: this.dungeon });
    }
  }

  private applyRewardChoice(choice: RewardChoice): boolean {
    const prog = this.dungeon.progression;
    switch (choice.type) {
      case RewardType.CORE: return choice.id ? prog.addCore(choice.id as CoreId) : false;
      case RewardType.FORM: return choice.id ? prog.addForm(choice.id as FormId) : false;
      case RewardType.PREFIX: return choice.id ? prog.addPrefix(choice.id as PrefixId) : false;
      case RewardType.SUFFIX: return choice.id ? prog.addSuffix(choice.id as SuffixId) : false;
      default: return false;
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
