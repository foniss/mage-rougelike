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

  private currentInput: string = '';
  private cursorBlinkTimer!: Phaser.Time.TimerEvent;
  private isOpen: boolean = false;

  constructor() {
    super({ key: 'GrimoireScene' });
  }

  init(data: { grimoireSystem: GrimoireSystem }): void {
    this.grimoireSystem = data.grimoireSystem;
  }

  create(): void {
    this.isOpen = true;
    this.currentInput = '';

    this.createOverlay();
    this.createPanel();
    this.createTitle();
    this.createInputArea();
    this.createComponentColumns();
    this.createSyntaxHelp();
    this.createControls();
    this.createFeedback();
    this.setupInput();
    this.startCursorBlink();

    this.tweens.add({
      targets: [this.overlay, this.panel, this.panelBorder],
      alpha: { from: 0, to: undefined },
      duration: 200, ease: 'Power2',
    });
  }

  private createOverlay(): void {
    this.overlay = this.add.rectangle(
      ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.6
    ).setDepth(200);
  }

  private createPanel(): void {
    const w = 580, h = 580, cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.panelBorder = this.add.rectangle(cx, cy, w + 4, h + 4, 0x4a3f6b, 0.8).setDepth(201);
    this.panel = this.add.rectangle(cx, cy, w, h, 0x12101e, 0.95).setDepth(202);
    this.add.rectangle(cx, cy, w - 16, h - 16, 0x000000, 0).setDepth(203)
      .setStrokeStyle(1, 0x3a2f5a, 0.5);
  }

  private createTitle(): void {
    const cx = ROOM_WIDTH / 2, topY = ROOM_HEIGHT / 2 - 265;
    this.txt(cx - 140, topY, '✦', 16, '#6b5b95').setOrigin(0.5);
    this.txt(cx, topY, 'GRIMOIRE', 28, '#c8b8e8', true).setOrigin(0.5);
    this.txt(cx + 140, topY, '✦', 16, '#6b5b95').setOrigin(0.5);
    this.add.rectangle(cx, topY + 22, 380, 1, 0x3a2f5a, 0.6).setDepth(210);
  }

  private createInputArea(): void {
    const cx = ROOM_WIDTH / 2, inputY = ROOM_HEIGHT / 2 - 210;
    this.txt(cx, inputY, 'Type Spell:  [PREFIX] CORE FORM [SUFFIX]', 12, '#8878a8').setOrigin(0.5);

    const boxW = 420, boxH = 36, boxY = inputY + 28;
    this.inputBox = this.add.rectangle(cx, boxY, boxW, boxH, 0x0a0818, 0.9).setDepth(210);
    this.inputBox.setStrokeStyle(1, 0x4a3f6b, 0.8);

    this.inputText = this.add.text(cx - boxW / 2 + 12, boxY, '', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#e8d8ff',
    }).setOrigin(0, 0.5).setDepth(211);

    this.cursor = this.add.rectangle(cx - boxW / 2 + 12, boxY, 2, 20, 0xe8d8ff, 1)
      .setDepth(211).setOrigin(0, 0.5);
  }

  private createComponentColumns(): void {
    const cx = ROOM_WIDTH / 2;
    const startY = ROOM_HEIGHT / 2 - 145;

    // ── Column 1: Prefixes ──
    const col1X = cx - 240;
    this.txt(col1X, startY, 'PREFIXES', 11, '#7868a8', true);
    this.add.rectangle(col1X + 35, startY + 13, 80, 1, 0x3a2f5a, 0.4).setDepth(210);

    let y = startY + 22;
    this.txt(col1X, y, '(optional)', 9, '#444466');
    y += 16;
    for (const prefix of this.grimoireSystem.getPrefixes()) {
      this.txt(col1X, y, prefix.displayName.toUpperCase(), 12, '#aaaacc', true);
      this.txt(col1X + 4, y + 14, prefix.description, 8, '#555577');
      this.txt(col1X + 4, y + 24, `+${prefix.manaCost} MP  CD×${prefix.cooldownMultiplier}`, 8, '#444466');
      y += 40;
    }

    // ── Column 2: Cores ──
    const col2X = cx - 90;
    this.txt(col2X, startY, 'CORES', 11, '#7868a8', true);
    this.add.rectangle(col2X + 25, startY + 13, 70, 1, 0x3a2f5a, 0.4).setDepth(210);

    y = startY + 22;
    this.txt(col2X, y, '(required)', 9, '#ffaaaa');
    y += 16;
    for (const core of this.grimoireSystem.getCores()) {
      const hex = '#' + core.visual.color.toString(16).padStart(6, '0');
      this.txt(col2X, y, '● ' + core.displayName.toUpperCase(), 12, hex, true);
      this.txt(col2X + 4, y + 14, core.description, 8, '#555577');
      this.txt(col2X + 4, y + 24, `DMG:${core.baseDamage}  +${core.manaCost} MP`, 8, '#444466');
      y += 40;
    }

    // ── Column 3: Forms ──
    const col3X = cx + 60;
    this.txt(col3X, startY, 'FORMS', 11, '#7868a8', true);
    this.add.rectangle(col3X + 25, startY + 13, 70, 1, 0x3a2f5a, 0.4).setDepth(210);

    y = startY + 22;
    this.txt(col3X, y, '(required)', 9, '#ffaaaa');
    y += 16;
    for (const form of this.grimoireSystem.getForms()) {
      this.txt(col3X, y, '◆ ' + form.displayName.toUpperCase(), 12, '#aaaacc', true);
      this.txt(col3X + 4, y + 14, form.description, 8, '#555577');
      this.txt(col3X + 4, y + 24, `+${form.manaCost} MP  CD:${form.cooldown}ms`, 8, '#444466');
      y += 40;
    }

    // ── Column 4: Suffixes ──
    const col4X = cx + 210;
    this.txt(col4X, startY, 'SUFFIXES', 11, '#7868a8', true);
    this.add.rectangle(col4X + 35, startY + 13, 80, 1, 0x3a2f5a, 0.4).setDepth(210);

    y = startY + 22;
    this.txt(col4X, y, '(optional)', 9, '#444466');
    y += 16;
    for (const suffix of this.grimoireSystem.getSuffixes()) {
      this.txt(col4X, y, suffix.displayName.toUpperCase(), 12, '#aaaacc', true);
      this.txt(col4X + 4, y + 14, suffix.description, 8, '#555577');
      const formsStr = suffix.compatibleForms === 'all'
        ? 'All forms'
        : suffix.compatibleForms.join(', ');
      this.txt(col4X + 4, y + 24, `+${suffix.manaCost} MP  ${formsStr}`, 8, '#444466');
      y += 40;
    }

    // Vertical dividers
    this.add.rectangle(col2X - 15, startY + 75, 1, 150, 0x3a2f5a, 0.2).setDepth(210);
    this.add.rectangle(col3X - 15, startY + 75, 1, 150, 0x3a2f5a, 0.2).setDepth(210);
    this.add.rectangle(col4X - 15, startY + 75, 1, 150, 0x3a2f5a, 0.2).setDepth(210);
  }

  private createSyntaxHelp(): void {
    const cx = ROOM_WIDTH / 2, y = ROOM_HEIGHT / 2 + 140;
    this.add.rectangle(cx, y - 10, 440, 1, 0x3a2f5a, 0.3).setDepth(210);
    this.txt(cx, y, 'Examples:', 10, '#666688').setOrigin(0.5);
    this.txt(cx, y + 16, 'FIRE BOLT  ·  GREATER ICE NOVA  ·  LIGHTNING BEAM PIERCING', 10, '#555577').setOrigin(0.5);
    this.txt(cx, y + 30, 'SWIFT FIRE BOLT SEEKING', 10, '#555577').setOrigin(0.5);
  }

  private createControls(): void {
    const cx = ROOM_WIDTH / 2, bottomY = ROOM_HEIGHT / 2 + 260;
    this.add.rectangle(cx, bottomY - 15, 380, 1, 0x3a2f5a, 0.4).setDepth(210);
    this.txt(cx, bottomY, 'ENTER = Prepare Spell    ESC / TAB = Close', 11, '#555570').setOrigin(0.5);
  }

  private createFeedback(): void {
    const cx = ROOM_WIDTH / 2, fbY = ROOM_HEIGHT / 2 - 155;
    this.feedbackText = this.txt(cx, fbY, '', 14, '#ff4444', true).setOrigin(0.5);
    this.feedbackText.setDepth(212).setAlpha(0);
  }

  // ── Helper to create text with consistent depth ────────────────────────

  private txt(
    x: number, y: number, text: string,
    size: number, color: string, bold: boolean = false
  ): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: size + 'px',
      color,
      fontStyle: bold ? 'bold' : 'normal',
    });
    t.setDepth(210);
    return t;
  }

  // ── Input ─────────────────────────────────────────────────────────────

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (!this.isOpen) return;
      event.stopPropagation();

      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault();
        this.closeGrimoire();
        return;
      }
      if (event.key === 'Enter') {
        this.attemptPrepareSpell();
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        this.currentInput = this.currentInput.slice(0, -1);
        this.updateInputDisplay();
        return;
      }
      if (event.key.length === 1 && /[a-zA-Z\s]/.test(event.key)) {
        if (this.currentInput.length < 35) {
          this.currentInput += event.key.toUpperCase();
          this.updateInputDisplay();
        }
      }
    });
  }

  private updateInputDisplay(): void {
    this.inputText.setText(this.currentInput);
    const boxLeft = ROOM_WIDTH / 2 - 210 + 12;
    this.cursor.setX(boxLeft + this.inputText.width + 2);
    this.feedbackText.setAlpha(0);
  }

  private attemptPrepareSpell(): void {
    const result = this.grimoireSystem.attemptPrepare(this.currentInput);

    if (result.success) {
      this.feedbackText.setText('✦ ' + result.spell!.name + ' Prepared ✦');
      this.feedbackText.setColor('#88ff88').setAlpha(1);

      this.scene.get('GameScene').events.emit('spell-prepared', result.spell);

      this.time.delayedCall(600, () => { this.closeGrimoire(); });
    } else {
      this.feedbackText.setText(result.message);
      this.feedbackText.setColor('#ff4444').setAlpha(1);

      this.tweens.add({
        targets: this.inputBox,
        x: { from: this.inputBox.x - 4, to: this.inputBox.x + 4 },
        duration: 50, yoyo: true, repeat: 3,
        onComplete: () => { this.inputBox.setX(ROOM_WIDTH / 2); },
      });

      this.time.delayedCall(2000, () => {
        this.tweens.add({ targets: this.feedbackText, alpha: 0, duration: 300 });
      });
    }
  }

  private startCursorBlink(): void {
    this.cursorBlinkTimer = this.time.addEvent({
      delay: 530,
      callback: () => { this.cursor.setAlpha(this.cursor.alpha > 0 ? 0 : 1); },
      loop: true,
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