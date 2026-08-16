import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { ShopGenerator, ShopItem } from '../systems/dungeon/ShopGenerator';
import { RewardType, REST_HEAL_PERCENT, RoomType } from '../config/dungeonConfig';
import { RoomEnvironment } from '../visuals/environment/RoomEnvironment';
import { ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS, PLAYER_RADIUS } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, OC } from '../config/uiStyles';
import { CoreId, FormId, PrefixId, SuffixId } from '../config/spellComponents';
import { Player } from '../entities/Player';
import { InteractionSystem } from '../systems/InteractionSystem';
import { drawMerchant, drawRestShrine } from '../visuals/environment/RoomNPCs';

export class ShopRestScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private shopItems: ShopItem[] = [];
  private hasRested = false;
  private player!: Player;
  private interaction!: InteractionSystem;
  private uiOpen = false;
  private uiContainer!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'ShopRestScene' }); }

  init(data: { dungeon: DungeonState }): void {
    this.dungeon = data.dungeon;
    this.uiOpen = false;
    const room = this.dungeon.getCurrentRoom();
    if (!room.shopState) {
      room.shopState = { items: ShopGenerator.generateShop(this.dungeon.progression, this.dungeon.currentLayerIndex), hasRested: false };
    }
    this.shopItems = room.shopState.items;
    this.hasRested = room.shopState.hasRested;
  }

  create(): void {
    const layerIdx = this.dungeon.currentLayerIndex;
    const sinId = this.dungeon.getCurrentLayer()?.sinId ?? null;

    // Environment
    RoomEnvironment.create({ scene: this, roomType: RoomType.SHOP_REST, layerIndex: layerIdx, sinId, drawWalls: true });

    // Player
    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT * 0.7);
    this.syncPlayer();

    // NPCs
    const merchantX = ROOM_WIDTH * 0.35, merchantY = ROOM_HEIGHT * 0.35;
    const restX = ROOM_WIDTH * 0.65, restY = ROOM_HEIGHT * 0.35;

    drawMerchant(this, merchantX, merchantY);
    drawRestShrine(this, restX, restY);

    // Labels above NPCs
    this.add.text(merchantX, merchantY - 50, 'MERCHANT', uiText(10, '#ccaa44', true)).setOrigin(0.5).setDepth(9);
    this.add.text(restX, restY - 50, 'REST SHRINE', uiText(10, '#44cc88', true)).setOrigin(0.5).setDepth(9);

    // Interaction system
    this.interaction = new InteractionSystem(this, this.player);

    this.interaction.addInteractable({
      x: merchantX, y: merchantY, radius: 60,
      prompt: 'SHOP', enabled: true,
      onInteract: () => this.openShopUI(),
    });

    this.interaction.addInteractable({
      x: restX, y: restY, radius: 60,
      prompt: this.hasRested ? 'ALREADY RESTED' : 'REST',
      enabled: !this.hasRested,
      onInteract: () => this.doRest(),
    });

    // UI container for overlays (hidden by default)
    this.uiContainer = this.add.container(0, 0).setDepth(90).setAlpha(0);

    // Continue button — Shop/Rest allows leaving anytime (shopping/resting is optional)
    const contBtn = createGlassPanel(this, ROOM_WIDTH / 2, ROOM_HEIGHT - 30, 200, 34, 85, 0.7);
    contBtn.setStrokeStyle(1, 0x55cc66, 0.5).setInteractive({ useHandCursor: true });
    this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT - 30, 'CONTINUE →', uiText(12, '#88ee88', true)).setOrigin(0.5).setDepth(86);
    contBtn.on('pointerdown', () => {
      this.dungeon.advanceRoom();
      this.scene.start('DungeonMapScene', { dungeon: this.dungeon });
    });
    // Note: Shop/Rest is the pre-boss room — player can always leave

    // Controls hint
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

  // ── Shop UI ─────────────────────────────────────────────────────────────

  private openShopUI(): void {
    if (this.uiOpen) return;
    this.uiOpen = true;

    const prog = this.dungeon.progression;
    const cx = ROOM_WIDTH / 2;

    // Overlay background
    this.uiContainer.removeAll(true);
    const overlay = this.add.rectangle(cx, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6);
    this.uiContainer.add(overlay);

    const panel = this.add.rectangle(cx, ROOM_HEIGHT / 2, 460, 380, OC.panel, 0.95).setStrokeStyle(1, OC.purple, 0.4);
    this.uiContainer.add(panel);

    const title = this.add.text(cx, ROOM_HEIGHT / 2 - 170, 'MERCHANT', uiText(18, '#ccaa44', true)).setOrigin(0.5);
    applyTextShadow(title);
    this.uiContainer.add(title);

    this.uiContainer.add(this.add.text(cx, ROOM_HEIGHT / 2 - 148, `Gold: ${prog.gold}`, uiText(11, '#ccaa44')).setOrigin(0.5));

    // Shop items
    let dy = ROOM_HEIGHT / 2 - 120;
    for (let i = 0; i < this.shopItems.length; i++) {
      const item = this.shopItems[i];
      const iy = dy + i * 48;
      const canAfford = prog.gold >= item.price && !item.purchased;

      const card = this.add.rectangle(cx, iy, 420, 40, OC.panel2, 0.7).setStrokeStyle(1, canAfford ? 0xccaa44 : 0x333344, canAfford ? 0.4 : 0.2);
      this.uiContainer.add(card);

      if (canAfford) {
        card.setInteractive({ useHandCursor: true });
        card.on('pointerover', () => card.setFillStyle(0x211932, 0.85));
        card.on('pointerout', () => card.setFillStyle(OC.panel2, 0.7));
        card.on('pointerdown', () => {
          if (!prog.spendGold(item.price)) return;
          item.purchased = true;
          this.applyShopReward(item);
          this.closeUI();
          this.openShopUI(); // Refresh
        });
      }

      this.uiContainer.add(this.add.text(cx - 190, iy, item.displayName, uiText(12, canAfford ? '#ccddee' : '#555566', canAfford)).setOrigin(0, 0.5));
      const priceColor = item.purchased ? '#44aa44' : canAfford ? '#ffcc44' : '#664444';
      const priceText = item.purchased ? 'PURCHASED' : `${item.price} Gold`;
      this.uiContainer.add(this.add.text(cx + 190, iy, priceText, uiText(11, priceColor)).setOrigin(1, 0.5));
    }

    // Close button
    const closeBtn = this.add.rectangle(cx, ROOM_HEIGHT / 2 + 160, 160, 34, OC.panel2, 0.7).setStrokeStyle(1, OC.purple, 0.4).setInteractive({ useHandCursor: true });
    this.uiContainer.add(closeBtn);
    this.uiContainer.add(this.add.text(cx, ROOM_HEIGHT / 2 + 160, 'CLOSE', uiText(12, '#aabbcc', true)).setOrigin(0.5));
    closeBtn.on('pointerdown', () => this.closeUI());

    this.uiContainer.setAlpha(1);
  }

  private closeUI(): void {
    this.uiContainer.removeAll(true);
    this.uiContainer.setAlpha(0);
    this.uiOpen = false;
  }

  // ── Rest ─────────────────────────────────────────────────────────────────

  private doRest(): void {
    if (this.hasRested) return;
    const prog = this.dungeon.progression;
    const healed = prog.rest();
    this.hasRested = true;
    this.dungeon.getCurrentRoom().shopState!.hasRested = true;

    // Sync player HP
    this.player.hp = prog.currentHp;
    this.player.maxHp = prog.maxHp;

    // Visual feedback
    const txt = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, `RESTED  +${healed} HP`, uiText(14, '#88ffbb', true)).setOrigin(0.5).setDepth(90);
    applyTextShadow(txt);
    this.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 1500, delay: 500, onComplete: () => txt.destroy() });

    // Flash on rest shrine
    const flash = this.add.circle(ROOM_WIDTH * 0.65, ROOM_HEIGHT * 0.35, 25, 0x44cc88, 0.4).setDepth(9);
    this.tweens.add({ targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 600, onComplete: () => flash.destroy() });
  }

  // ── Shop reward application (unchanged) ─────────────────────────────────

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
    this.syncPlayer();
  }
}
