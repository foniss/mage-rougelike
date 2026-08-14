// src/scenes/GrimoireScene.ts

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';
import { CORES, getAllCoreTypes } from '../config/cores';
import { FORMS, getAllFormTypes } from '../config/forms';

export class GrimoireScene extends Phaser.Scene {
  private grimoireSystem!: GrimoireSystem;

  // UI elements
  private overlay!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Rectangle;
  private panelBorder!: Phaser.GameObjects.Rectangle;
  private inputBox!: Phaser.GameObjects.Rectangle;
  private inputText!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Rectangle;
  private feedbackText!: Phaser.GameObjects.Text;

  // State
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
    this.createComponentLists();
    this.createExamples();
    this.createControls();
    this.createFeedback();
    this.setupInput();
    this.startCursorBlink();

    this.tweens.add({
      targets: [this.overlay, this.panel, this.panelBorder],
      alpha: { from: 0, to: undefined },
      duration: 200,
      ease: 'Power2',
    });
  }

  // ── Overlay ──────────────────────────────────────────────────────────────

  private createOverlay(): void {
    this.overlay = this.add.rectangle(
      ROOM_WIDTH / 2, ROOM_HEIGHT / 2,
      ROOM_WIDTH, ROOM_HEIGHT,
      0x000000, 0.6
    );
    this.overlay.setDepth(200);
  }

  // ── Panel ────────────────────────────────────────────────────────────────

  private createPanel(): void {
    const panelW = 520;
    const panelH = 520;
    const cx = ROOM_WIDTH / 2;
    const cy = ROOM_HEIGHT / 2;

    this.panelBorder = this.add.rectangle(cx, cy, panelW + 4, panelH + 4, 0x4a3f6b, 0.8);
    this.panelBorder.setDepth(201);

    this.panel = this.add.rectangle(cx, cy, panelW, panelH, 0x12101e, 0.95);
    this.panel.setDepth(202);

    const inner = this.add.rectangle(cx, cy, panelW - 16, panelH - 16, 0x000000, 0);
    inner.setDepth(203);
    inner.setStrokeStyle(1, 0x3a2f5a, 0.5);
  }

  // ── Title ────────────────────────────────────────────────────────────────

  private createTitle(): void {
    const cx = ROOM_WIDTH / 2;
    const topY = ROOM_HEIGHT / 2 - 235;

    this.add.text(cx - 130, topY, '✦', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#6b5b95',
    }).setDepth(210).setOrigin(0.5);

    this.add.text(cx, topY, 'GRIMOIRE', {
      fontFamily: '"Courier New", monospace', fontSize: '28px', color: '#c8b8e8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(210);

    this.add.text(cx + 130, topY, '✦', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#6b5b95',
    }).setDepth(210).setOrigin(0.5);

    this.add.rectangle(cx, topY + 22, 340, 1, 0x3a2f5a, 0.6).setDepth(210);
  }

  // ── Input Area ───────────────────────────────────────────────────────────

  private createInputArea(): void {
    const cx = ROOM_WIDTH / 2;
    const inputY = ROOM_HEIGHT / 2 - 180;

    this.add.text(cx, inputY, 'Type Spell (CORE + FORM):', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#8878a8',
    }).setOrigin(0.5).setDepth(210);

    const boxW = 380;
    const boxH = 36;
    const boxY = inputY + 28;

    this.inputBox = this.add.rectangle(cx, boxY, boxW, boxH, 0x0a0818, 0.9);
    this.inputBox.setDepth(210);
    this.inputBox.setStrokeStyle(1, 0x4a3f6b, 0.8);

    this.inputText = this.add.text(cx - boxW / 2 + 12, boxY, '', {
      fontFamily: '"Courier New", monospace', fontSize: '18px', color: '#e8d8ff',
    }).setOrigin(0, 0.5).setDepth(211);

    this.cursor = this.add.rectangle(cx - boxW / 2 + 12, boxY, 2, 20, 0xe8d8ff, 1);
    this.cursor.setDepth(211).setOrigin(0, 0.5);
  }

  // ── Component Lists (Cores & Forms) ──────────────────────────────────────

  private createComponentLists(): void {
    const cx = ROOM_WIDTH / 2;
    const startY = ROOM_HEIGHT / 2 - 115;

    // ── CORES column (left) ──
    const coreX = cx - 130;

    this.add.text(coreX, startY, 'CORES', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#7868a8', fontStyle: 'bold',
    }).setDepth(210);

    this.add.rectangle(coreX + 30, startY + 15, 100, 1, 0x3a2f5a, 0.4).setDepth(210);

    let y = startY + 28;
    for (const coreType of getAllCoreTypes()) {
      const core = CORES[coreType];
      const colorHex = '#' + core.color.toString(16).padStart(6, '0');

      this.add.text(coreX, y, `● ${core.displayName.toUpperCase()}`, {
        fontFamily: '"Courier New", monospace', fontSize: '14px', color: colorHex, fontStyle: 'bold',
      }).setDepth(210);

      this.add.text(coreX + 10, y + 18, core.description, {
        fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555577',
      }).setDepth(210);

      this.add.text(coreX + 10, y + 30, `DMG: ${core.baseDamage}`, {
        fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#444466',
      }).setDepth(210);

      y += 50;
    }

    // ── FORMS column (right) ──
    const formX = cx + 70;

    this.add.text(formX, startY, 'FORMS', {
      fontFamily: '"Courier New", monospace', fontSize: '13px', color: '#7868a8', fontStyle: 'bold',
    }).setDepth(210);

    this.add.rectangle(formX + 30, startY + 15, 100, 1, 0x3a2f5a, 0.4).setDepth(210);

    y = startY + 28;
    for (const formType of getAllFormTypes()) {
      const form = FORMS[formType];

      this.add.text(formX, y, `◆ ${form.displayName.toUpperCase()}`, {
        fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#aaaacc', fontStyle: 'bold',
      }).setDepth(210);

      this.add.text(formX + 10, y + 18, form.description, {
        fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#555577',
      }).setDepth(210);

      this.add.text(formX + 10, y + 30, `MP: ${form.baseManaCost}`, {
        fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#444466',
      }).setDepth(210);

      y += 50;
    }

    // Vertical divider between columns
    this.add.rectangle(cx - 20, startY + 80, 1, 150, 0x3a2f5a, 0.3).setDepth(210);
  }

  // ── Examples ─────────────────────────────────────────────────────────────

  private createExamples(): void {
    const cx = ROOM_WIDTH / 2;
    const exY = ROOM_HEIGHT / 2 + 115;

    this.add.rectangle(cx, exY - 12, 340, 1, 0x3a2f5a, 0.3).setDepth(210);

    this.add.text(cx, exY, 'Examples:  FIRE BOLT  ·  ICE NOVA  ·  LIGHTNING BEAM', {
      fontFamily: '"Courier New", monospace', fontSize: '10px', color: '#555577',
    }).setOrigin(0.5).setDepth(210);
  }

  // ── Controls ─────────────────────────────────────────────────────────────

  private createControls(): void {
    const cx = ROOM_WIDTH / 2;
    const bottomY = ROOM_HEIGHT / 2 + 230;

    this.add.rectangle(cx, bottomY - 15, 340, 1, 0x3a2f5a, 0.4).setDepth(210);

    this.add.text(cx, bottomY, 'ENTER = Prepare Spell    ESC / TAB = Close', {
      fontFamily: '"Courier New", monospace', fontSize: '11px', color: '#555570',
    }).setOrigin(0.5).setDepth(210);
  }

  // ── Feedback ─────────────────────────────────────────────────────────────

  private createFeedback(): void {
    const cx = ROOM_WIDTH / 2;
    const fbY = ROOM_HEIGHT / 2 - 120;

    this.feedbackText = this.add.text(cx, fbY, '', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#ff4444', fontStyle: 'bold',
    });
    this.feedbackText.setOrigin(0.5).setDepth(212).setAlpha(0);
  }

  // ── Input Handling ───────────────────────────────────────────────────────

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
        if (this.currentInput.length < 25) {
          this.currentInput += event.key.toUpperCase();
          this.updateInputDisplay();
        }
      }
    });
  }

  private updateInputDisplay(): void {
    this.inputText.setText(this.currentInput);

    const textWidth = this.inputText.width;
    const boxLeft = ROOM_WIDTH / 2 - 190 + 12;
    this.cursor.setX(boxLeft + textWidth + 2);

    this.feedbackText.setAlpha(0);
  }

  // ── Spell Preparation ────────────────────────────────────────────────────

  private attemptPrepareSpell(): void {
    const result = this.grimoireSystem.attemptPrepare(this.currentInput);

    if (result.success) {
      this.feedbackText.setText('✦ ' + result.spell!.name + ' Prepared ✦');
      this.feedbackText.setColor('#88ff88');
      this.feedbackText.setAlpha(1);

      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('spell-prepared', result.spell);

      this.time.delayedCall(600, () => {
        this.closeGrimoire();
      });
    } else {
      this.feedbackText.setText(result.message);
      this.feedbackText.setColor('#ff4444');
      this.feedbackText.setAlpha(1);

      this.tweens.add({
        targets: this.inputBox,
        x: { from: this.inputBox.x - 4, to: this.inputBox.x + 4 },
        duration: 50,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.inputBox.setX(ROOM_WIDTH / 2);
        },
      });

      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: this.feedbackText,
          alpha: 0,
          duration: 300,
        });
      });
    }
  }

  // ── Cursor Blink ──────────────────────────────────────────────────────────

  private startCursorBlink(): void {
    this.cursorBlinkTimer = this.time.addEvent({
      delay: 530,
      callback: () => {
        this.cursor.setAlpha(this.cursor.alpha > 0 ? 0 : 1);
      },
      loop: true,
    });
  }

  // ── Close ─────────────────────────────────────────────────────────────────

  private closeGrimoire(): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    const gameScene = this.scene.get('GameScene');
    gameScene.events.emit('grimoire-closed');

    if (this.cursorBlinkTimer) this.cursorBlinkTimer.destroy();
    this.scene.stop('GrimoireScene');
  }
}