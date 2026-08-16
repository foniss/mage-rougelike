import Phaser from 'phaser';
import { uiText, applyTextShadow, OC } from '../config/uiStyles';
import { RoomType } from '../config/dungeonConfig';

export interface ArenaConfig {
  staticEnemies: boolean;
  infiniteMana: boolean;
  infiniteHp: boolean;
  noCooldowns: boolean;
}

export interface ArenaCallbacks {
  onSpawnOne: () => void;
  onSpawnTanky: () => void;
  onSpawnGroup: () => void;
  onClearEnemies: () => void;
  onResetArena: () => void;
  onChangeEnv: (roomType: RoomType, layer: number) => void;
}

const ROOM_OPTIONS: { id: RoomType; label: string }[] = [
  { id: RoomType.NORMAL, label: 'Normal' },
  { id: RoomType.ELITE, label: 'Elite' },
  { id: RoomType.SIN_BOSS, label: 'Sin Boss' },
  { id: RoomType.DEVIL, label: 'Devil' },
  { id: RoomType.SHOP_REST, label: 'Shop/Rest' },
  { id: RoomType.SHRINE, label: 'Shrine' },
  { id: RoomType.SACRIFICE, label: 'Sacrifice' },
  { id: RoomType.VAULT, label: 'Vault' },
];

export class DevArenaControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private config: ArenaConfig;
  private callbacks: ArenaCallbacks;

  private selectedRoomType: RoomType = RoomType.NORMAL;
  private selectedLayer: number = 0;
  private roomLabel!: Phaser.GameObjects.Text;
  private layerLabel!: Phaser.GameObjects.Text;

  private readonly W = 210;

  constructor(scene: Phaser.Scene, x: number, y: number, callbacks: ArenaCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.config = { staticEnemies: true, infiniteMana: true, infiniteHp: true, noCooldowns: false };
    this.container = scene.add.container(x, y).setDepth(100);
    this.build();
  }

  private build(): void {
    const W = this.W;

    const bg = this.scene.add.rectangle(0, 0, W, 560, OC.panel, 0.94).setOrigin(0, 0).setStrokeStyle(1, OC.purple, 0.4);
    this.container.add(bg);

    this.lbl(W / 2, 14, '◈ ARENA CONTROLS', 13, '#c2b0df', true);
    this.line(30);

    let dy = 38;

    // ── Toggles ────────────────────────────────────────────────
    dy = this.toggle(dy, 'Static Enemies', this.config.staticEnemies, (v) => { this.config.staticEnemies = v; });
    dy = this.toggle(dy, 'Infinite Mana', this.config.infiniteMana, (v) => { this.config.infiniteMana = v; });
    dy = this.toggle(dy, 'Infinite HP', this.config.infiniteHp, (v) => { this.config.infiniteHp = v; });
    dy = this.toggle(dy, 'No Cooldowns', this.config.noCooldowns, (v) => { this.config.noCooldowns = v; });

    dy += 6;
    this.line(dy);
    dy += 10;

    // ── Enemies ────────────────────────────────────────────────
    this.lbl(W / 2, dy, 'ENEMIES', 12, '#bbaacc', true);
    dy += 18;
    dy = this.btn(dy, 'Spawn Normal', '#dd8866', this.callbacks.onSpawnOne);
    dy = this.btn(dy, 'Spawn Tanky', '#cc7755', this.callbacks.onSpawnTanky);
    dy = this.btn(dy, 'Spawn Group (5)', '#ddaa66', this.callbacks.onSpawnGroup);
    dy = this.btn(dy, 'Clear Enemies', '#aaaaaa', this.callbacks.onClearEnemies);
    dy = this.btn(dy, 'Reset Arena', '#dd6666', this.callbacks.onResetArena);

    dy += 6;
    this.line(dy);
    dy += 10;

    // ── Environment Theme ──────────────────────────────────────
    this.lbl(W / 2, dy, 'ENVIRONMENT', 12, '#bbaacc', true);
    dy += 18;

    // Room type selector
    this.lbl(12, dy + 10, 'Room:', 10, '#8899aa').setOrigin(0, 0.5);
    const roomBtnBg = this.scene.add.rectangle(W / 2 + 30, dy + 10, W - 70, 22, OC.panel2, 0.8).setStrokeStyle(1, OC.purple, 0.35).setInteractive({ useHandCursor: true });
    this.container.add(roomBtnBg);
    this.roomLabel = this.lbl(W / 2 + 30, dy + 10, 'Normal', 11, '#ccbbdd');
    const roomArrow = this.lbl(W - 16, dy + 10, '▼', 8, '#776688');

    let roomIdx = 0;
    roomBtnBg.on('pointerdown', () => {
      roomIdx = (roomIdx + 1) % ROOM_OPTIONS.length;
      this.selectedRoomType = ROOM_OPTIONS[roomIdx].id;
      this.roomLabel.setText(ROOM_OPTIONS[roomIdx].label);
      this.callbacks.onChangeEnv(this.selectedRoomType, this.selectedLayer);
    });
    roomBtnBg.on('pointerover', () => roomBtnBg.setFillStyle(0x211932, 0.9));
    roomBtnBg.on('pointerout', () => roomBtnBg.setFillStyle(OC.panel2, 0.8));

    dy += 28;

    // Layer selector
    this.lbl(12, dy + 10, 'Layer:', 10, '#8899aa').setOrigin(0, 0.5);
    const layerBtnBg = this.scene.add.rectangle(W / 2 + 30, dy + 10, W - 70, 22, OC.panel2, 0.8).setStrokeStyle(1, OC.purple, 0.35).setInteractive({ useHandCursor: true });
    this.container.add(layerBtnBg);
    this.layerLabel = this.lbl(W / 2 + 30, dy + 10, 'Layer 1', 11, '#ccbbdd');

    layerBtnBg.on('pointerdown', () => {
      this.selectedLayer = (this.selectedLayer + 1) % 4;
      this.layerLabel.setText(`Layer ${this.selectedLayer + 1}`);
      this.callbacks.onChangeEnv(this.selectedRoomType, this.selectedLayer);
    });
    layerBtnBg.on('pointerover', () => layerBtnBg.setFillStyle(0x211932, 0.9));
    layerBtnBg.on('pointerout', () => layerBtnBg.setFillStyle(OC.panel2, 0.8));

    dy += 34;
    this.line(dy);
    dy += 10;

    // ── Hints ──────────────────────────────────────────────────
    this.lbl(W / 2, dy, 'TAB = Grimoire', 10, '#667788');
    dy += 15;
    this.lbl(W / 2, dy, '1/2/3 = Slots', 10, '#667788');
    dy += 15;
    this.lbl(W / 2, dy, 'Click = Cast', 10, '#667788');
    dy += 15;
    this.lbl(W / 2, dy, 'F2 = Exit Arena', 10, '#667788');
  }

  private toggle(y: number, label: string, initial: boolean, onChange: (v: boolean) => void): number {
    let value = initial;
    this.lbl(14, y + 10, label, 11, '#99aabb').setOrigin(0, 0.5);
    const box = this.scene.add.rectangle(this.W - 24, y + 10, 16, 16, value ? 0x44aa44 : 0x333344, 0.8).setStrokeStyle(1, 0x555566, 0.5).setInteractive({ useHandCursor: true });
    const check = this.lbl(this.W - 24, y + 10, value ? '✓' : '', 11, '#ffffff');
    this.container.add(box);
    box.on('pointerdown', () => { value = !value; box.setFillStyle(value ? 0x44aa44 : 0x333344, 0.8); check.setText(value ? '✓' : ''); onChange(value); });
    return y + 26;
  }

  private btn(y: number, label: string, colorHex: string, onClick: () => void): number {
    const W = this.W;
    const b = this.scene.add.rectangle(W / 2, y + 14, W - 16, 28, OC.panel2, 0.7).setStrokeStyle(1, OC.purple, 0.25).setInteractive({ useHandCursor: true });
    this.lbl(W / 2, y + 14, label, 12, colorHex);
    this.container.add(b);
    b.on('pointerdown', () => { onClick(); b.setFillStyle(0x211932, 0.9); this.scene.time.delayedCall(100, () => b.setFillStyle(OC.panel2, 0.7)); });
    b.on('pointerover', () => b.setFillStyle(0x211932, 0.8));
    b.on('pointerout', () => b.setFillStyle(OC.panel2, 0.7));
    return y + 34;
  }

  private lbl(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, uiText(size, color, bold)).setOrigin(0.5).setDepth(101);
    applyTextShadow(t);
    this.container.add(t);
    return t;
  }

  private line(y: number): void {
    this.container.add(this.scene.add.rectangle(this.W / 2, y, this.W - 16, 1, OC.purple, 0.15));
  }

  getConfig(): ArenaConfig { return { ...this.config }; }
  destroy(): void { this.container.destroy(); }
}
