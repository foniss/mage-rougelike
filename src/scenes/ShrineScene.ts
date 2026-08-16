import Phaser from 'phaser';
import { DungeonState } from '../systems/dungeon/DungeonState';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, OC } from '../config/uiStyles';
import { RoomType } from '../config/dungeonConfig';
import { RoomEnvironment } from '../visuals/environment/RoomEnvironment';
import { Player } from '../entities/Player';
import { InteractionSystem } from '../systems/InteractionSystem';
import { drawRestShrine } from '../visuals/environment/RoomNPCs';

export class ShrineScene extends Phaser.Scene {
  private dungeon!: DungeonState;
  private player!: Player;
  private interaction!: InteractionSystem;
  private shrineDone = false;
  private contBtn!: Phaser.GameObjects.Rectangle;
  private contTxt!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'ShrineScene' }); }
  init(data: { dungeon: DungeonState }): void { this.dungeon = data.dungeon; this.shrineDone = false; }

  create(): void {
    const layerIdx = this.dungeon.currentLayerIndex;
    const sinId = this.dungeon.getCurrentLayer()?.sinId ?? null;

    RoomEnvironment.create({ scene: this, roomType: RoomType.SHRINE, layerIndex: layerIdx, sinId, drawWalls: true });

    this.player = new Player(this, ROOM_WIDTH / 2, ROOM_HEIGHT * 0.7);
    const prog = this.dungeon.progression;
    this.player.maxHp = prog.maxHp;
    this.player.hp = prog.currentHp;

    const shrineX = ROOM_WIDTH / 2, shrineY = ROOM_HEIGHT * 0.38;
    drawRestShrine(this, shrineX, shrineY);
    this.add.text(shrineX, shrineY - 55, 'MYSTERIOUS SHRINE', uiText(10, '#cc88ff', true)).setOrigin(0.5).setDepth(9);

    this.interaction = new InteractionSystem(this, this.player);
    this.interaction.addInteractable({
      x: shrineX, y: shrineY, radius: 65,
      prompt: 'PRAY', enabled: true,
      onInteract: () => this.prayShrineEffect(),
    });

    // Continue button — hidden until shrine is used
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
    this.player.update();
    this.interaction.update();
  }

  private prayShrineEffect(): void {
    if (this.shrineDone) return;
    this.shrineDone = true;

    const prog = this.dungeon.progression;
    const healAmt = Math.floor(prog.maxHp * 0.15);
    prog.heal(healAmt);
    this.player.hp = prog.currentHp;

    // Disable further interaction
    this.interaction = new InteractionSystem(this, this.player);

    // Show continue button
    this.contBtn.setVisible(true);
    this.contTxt.setVisible(true);

    // Visual feedback
    const shrineX = ROOM_WIDTH / 2, shrineY = ROOM_HEIGHT * 0.38;
    const flash = this.add.circle(shrineX, shrineY, 30, 0xcc88ff, 0.4).setDepth(9);
    this.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 800, onComplete: () => flash.destroy() });

    const txt = this.add.text(this.player.sprite.x, this.player.sprite.y - 30, `BLESSED  +${healAmt} HP`, uiText(14, '#cc88ff', true)).setOrigin(0.5).setDepth(90);
    applyTextShadow(txt);
    this.tweens.add({ targets: txt, y: txt.y - 25, alpha: 0, duration: 1500, delay: 500, onComplete: () => txt.destroy() });
  }
}
