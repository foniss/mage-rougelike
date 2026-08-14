// src/scenes/GrimoireScene.ts

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';

export class GrimoireScene extends Phaser.Scene {
  private grimoireSystem!: GrimoireSystem;
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Rectangle;
  private panelBorder!: Phaser.GameObjects.Rectangle;
  private inputBox!: Phaser.GameObjects.Rectangle;
  private inputText!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Rectangle;
  private feedbackText!: Phaser.GameObjects.Text;
  private currentInput = '';
  private cursorBlinkTimer!: Phaser.Time.TimerEvent;
  private isOpen = false;
  private scrollY = 0;
  private contentContainer!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'GrimoireScene' }); }

  init(data: { grimoireSystem: GrimoireSystem }): void {
    this.grimoireSystem = data.grimoireSystem;
  }

  create(): void {
    this.isOpen = true;
    this.currentInput = '';
    this.scrollY = 0;

    this.createOverlay();
    this.createPanel();
    this.createTitle();
    this.createInputArea();
    this.createFeedback();
    this.createComponentDisplay();
    this.createControls();
    this.setupInput();
    this.startCursorBlink();

    this.tweens.add({
      targets: [this.overlay, this.panel, this.panelBorder],
      alpha: { from: 0, to: undefined }, duration: 200, ease: 'Power2',
    });
  }

  private createOverlay(): void {
    this.overlay = this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6).setDepth(200);
  }

  private createPanel(): void {
    const w = 700, h = 650, cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.panelBorder = this.add.rectangle(cx, cy, w + 4, h + 4, 0x4a3f6b, 0.8).setDepth(201);
    this.panel = this.add.rectangle(cx, cy, w, h, 0x12101e, 0.95).setDepth(202);
    this.add.rectangle(cx, cy, w - 16, h - 16, 0x000000, 0).setDepth(203).setStrokeStyle(1, 0x3a2f5a, 0.5);
  }

  private createTitle(): void {
    const cx = ROOM_WIDTH / 2, topY = ROOM_HEIGHT / 2 - 300;
    this.txt(cx - 140, topY, '✦', 16, '#6b5b95').setOrigin(0.5);
    this.txt(cx, topY, 'GRIMOIRE', 28, '#c8b8e8', true).setOrigin(0.5);
    this.txt(cx + 140, topY, '✦', 16, '#6b5b95').setOrigin(0.5);
    this.add.rectangle(cx, topY + 22, 400, 1, 0x3a2f5a, 0.6).setDepth(210);
  }

  private createInputArea(): void {
    const cx = ROOM_WIDTH / 2, inputY = ROOM_HEIGHT / 2 - 245;
    this.txt(cx, inputY, '[PREFIX] + CORE + FORM + [SUFFIX]', 11, '#8878a8').setOrigin(0.5);
    const boxW = 500, boxH = 34, boxY = inputY + 24;
    this.inputBox = this.add.rectangle(cx, boxY, boxW, boxH, 0x0a0818, 0.9).setDepth(210).setStrokeStyle(1, 0x4a3f6b, 0.8);
    this.inputText = this.add.text(cx - boxW / 2 + 12, boxY, '', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#e8d8ff',
    }).setOrigin(0, 0.5).setDepth(211);
    this.cursor = this.add.rectangle(cx - boxW / 2 + 12, boxY, 2, 18, 0xe8d8ff, 1).setDepth(211).setOrigin(0, 0.5);
  }

  private createFeedback(): void {
    this.feedbackText = this.txt(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 - 193, '', 13, '#ff4444', true).setOrigin(0.5);
    this.feedbackText.setDepth(212).setAlpha(0);
  }

  private createComponentDisplay(): void {
    const cx = ROOM_WIDTH / 2;
    const startY = ROOM_HEIGHT / 2 - 175;
    const colW = 150;

    // ── Cores ──
    const coreX = cx - 310;
    this.txt(coreX, startY, 'CORES', 10, '#ffaaaa', true);
    let y = startY + 16;
    for (const core of this.grimoireSystem.getCores()) {
      const hex = '#' + core.visual.color.toString(16).padStart(6, '0');
      this.txt(coreX, y, core.displayName.toUpperCase(), 11, hex, true);
      this.txt(coreX + 2, y + 13, core.description, 7, '#555577');
      this.txt(coreX + 2, y + 22, `DMG:${core.baseDamage} MP:+${core.manaCost}`, 7, '#444466');
      y += 35;
    }

    // ── Forms ──
    const formX = coreX + colW;
    this.txt(formX, startY, 'FORMS', 10, '#ffaaaa', true);
    y = startY + 16;
    for (const form of this.grimoireSystem.getForms()) {
      this.txt(formX, y, form.displayName.toUpperCase(), 11, '#aaaacc', true);
      this.txt(formX + 2, y + 13, form.description, 7, '#555577');
      this.txt(formX + 2, y + 22, `MP:+${form.manaCost} CD:${form.cooldown}ms`, 7, '#444466');
      y += 35;
    }

    // ── Prefixes ──
    const prefX = formX + colW;
    this.txt(prefX, startY, 'PREFIXES', 10, '#88cc88', true);
    y = startY + 16;
    for (const prefix of this.grimoireSystem.getPrefixes()) {
      this.txt(prefX, y, prefix.displayName.toUpperCase(), 10, '#aaccaa', true);
      this.txt(prefX + 2, y + 12, prefix.description, 7, '#555577');
      const compat = prefix.compatibleForms === 'all' ? 'All' :
        (prefix.compatibleForms as string[]).join(',');
      this.txt(prefX + 2, y + 21, `MP:+${prefix.manaCost} [${compat}]`, 7, '#444466');
      y += 33;
    }

    // ── Suffixes ──
    const sufX = prefX + colW + 10;
    this.txt(sufX, startY, 'SUFFIXES', 10, '#ccaa88', true);
    y = startY + 16;
    for (const suffix of this.grimoireSystem.getSuffixes()) {
      this.txt(sufX, y, suffix.displayName.toUpperCase(), 10, '#ccbb99', true);
      this.txt(sufX + 2, y + 12, suffix.description, 7, '#555577');
      this.txt(sufX + 2, y + 21, `MP:+${suffix.manaCost}`, 7, '#444466');
      y += 33;
    }

    // Dividers
    for (const dx of [coreX + colW - 10, formX + colW - 10, prefX + colW]) {
      this.add.rectangle(dx, startY + 100, 1, 200, 0x3a2f5a, 0.15).setDepth(210);
    }

    // Examples
    const exY = ROOM_HEIGHT / 2 + 245;
    this.add.rectangle(cx, exY - 10, 500, 1, 0x3a2f5a, 0.3).setDepth(210);
    this.txt(cx, exY + 2, 'FIRE BLADE  ·  HOMING ICE ORB  ·  GREATER STORM NOVA OF ECHOES', 9, '#555577').setOrigin(0.5);
    this.txt(cx, exY + 16, 'COSMIC MINE OF DETONATION  ·  PIERCING WIND ORB OF REAPING', 9, '#555577').setOrigin(0.5);
  }

  private createControls(): void {
    const cx = ROOM_WIDTH / 2, bottomY = ROOM_HEIGHT / 2 + 295;
    this.add.rectangle(cx, bottomY - 12, 400, 1, 0x3a2f5a, 0.4).setDepth(210);
    this.txt(cx, bottomY, 'ENTER = Prepare    ESC / TAB = Close', 11, '#555570').setOrigin(0.5);
  }

  private txt(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace', fontSize: size + 'px', color, fontStyle: bold ? 'bold' : 'normal',
    }).setDepth(210);
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (!this.isOpen) return;
      event.stopPropagation();
      if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); this.closeGrimoire(); return; }
      if (event.key === 'Enter') { this.attemptPrepareSpell(); return; }
      if (event.key === 'Backspace') { event.preventDefault(); this.currentInput = this.currentInput.slice(0, -1); this.updateInputDisplay(); return; }
      if (event.key.length === 1 && /[a-zA-Z\s]/.test(event.key)) {
        if (this.currentInput.length < 40) { this.currentInput += event.key.toUpperCase(); this.updateInputDisplay(); }
      }
    });
  }

  private updateInputDisplay(): void {
    this.inputText.setText(this.currentInput);
    this.cursor.setX(ROOM_WIDTH / 2 - 250 + 12 + this.inputText.width + 2);
    this.feedbackText.setAlpha(0);
  }

  private attemptPrepareSpell(): void {
    const result = this.grimoireSystem.attemptPrepare(this.currentInput);
    if (result.success) {
      this.feedbackText.setText('✦ ' + result.spell!.name + ' ✦').setColor('#88ff88').setAlpha(1);
      this.scene.get('GameScene').events.emit('spell-prepared', result.spell);
      this.time.delayedCall(600, () => this.closeGrimoire());
    } else {
      this.feedbackText.setText(result.message).setColor('#ff4444').setAlpha(1);
      this.tweens.add({
        targets: this.inputBox, x: { from: this.inputBox.x - 4, to: this.inputBox.x + 4 },
        duration: 50, yoyo: true, repeat: 3,
        onComplete: () => this.inputBox.setX(ROOM_WIDTH / 2),
      });
      this.time.delayedCall(2500, () => {
        this.tweens.add({ targets: this.feedbackText, alpha: 0, duration: 300 });
      });
    }
  }

  private startCursorBlink(): void {
    this.cursorBlinkTimer = this.time.addEvent({
      delay: 530, loop: true,
      callback: () => { this.cursor.setAlpha(this.cursor.alpha > 0 ? 0 : 1); },
    });
  }

  private closeGrimoire(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.scene.get('GameScene').events.emit('grimoire-closed');
    if (this.cursorBlinkTimer) this.cursorBlinkTimer.destroy();
    this.scene.stop('GrimoireScene');
  }
}