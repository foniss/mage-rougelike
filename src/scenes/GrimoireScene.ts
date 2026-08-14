// src/scenes/GrimoireScene.ts

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellBuilder, Spell } from '../systems/SpellBuilder';
import { SpellValidator } from '../systems/SpellValidator';
import { SlotPanel, SlotContent } from '../ui/SlotPanel';
import { SpellPreview } from '../ui/SpellPreview';
import { ComponentPicker, PickerItem } from '../ui/ComponentPicker';
import {
  CoreId, FormId, PrefixId, SuffixId,
  CoreComponent, FormComponent, PrefixComponent, SuffixComponent,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
} from '../config/spellComponents';
import { ROOM_WIDTH, ROOM_HEIGHT } from '../config/constants';

type ActiveSlot = 'prefix' | 'core' | 'form' | 'suffix';

export class GrimoireScene extends Phaser.Scene {
  private grimoireSystem!: GrimoireSystem;

  // UI layers
  private overlay!: Phaser.GameObjects.Rectangle;
  private panelBorder!: Phaser.GameObjects.Rectangle;
  private panel!: Phaser.GameObjects.Rectangle;

  // Slot panels
  private prefixSlot!: SlotPanel;
  private coreSlot!: SlotPanel;
  private formSlot!: SlotPanel;
  private suffixSlot!: SlotPanel;

  // Spell preview
  private spellPreview!: SpellPreview;

  // Component pickers
  private currentPicker: ComponentPicker | null = null;
  private activeSlot: ActiveSlot = 'core';

  // Slot tab buttons
  private tabButtons: { slot: ActiveSlot; bg: Phaser.GameObjects.Rectangle; text: Phaser.GameObjects.Text }[] = [];

  // Selected IDs
  private selectedPrefix: PrefixId | null = null;
  private selectedCore: CoreId | null = null;
  private selectedForm: FormId | null = null;
  private selectedSuffix: SuffixId | null = null;

  // Text input (kept for power-users)
  private inputBox!: Phaser.GameObjects.Rectangle;
  private inputText!: Phaser.GameObjects.Text;
  private cursor!: Phaser.GameObjects.Rectangle;
  private currentInput = '';
  private cursorBlinkTimer!: Phaser.Time.TimerEvent;

  // Prepare button
  private prepareBtn!: Phaser.GameObjects.Rectangle;
  private prepareBtnText!: Phaser.GameObjects.Text;

  private isOpen = false;

  constructor() { super({ key: 'GrimoireScene' }); }

  init(data: { grimoireSystem: GrimoireSystem }): void {
    this.grimoireSystem = data.grimoireSystem;
  }

  create(): void {
    this.isOpen = true;
    this.currentInput = '';

    this.createOverlay();
    this.createPanel();
    this.createTitle();
    this.createSlots();
    this.createTabButtons();
    this.createSpellPreview();
    this.createPickerArea();
    this.createTextInput();
    this.createPrepareButton();
    this.createControls();
    this.setupInput();
    this.startCursorBlink();

    // Default to Core tab
    this.switchTab('core');

    this.tweens.add({
      targets: [this.overlay, this.panel, this.panelBorder],
      alpha: { from: 0, to: undefined }, duration: 200, ease: 'Power2',
    });
  }

  // ── Layout ──────────────────────────────────────────────────────────────

  private createOverlay(): void {
    this.overlay = this.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.65).setDepth(200);
  }

  private createPanel(): void {
    const w = 750, h = 660, cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.panelBorder = this.add.rectangle(cx, cy, w + 4, h + 4, 0x4a3f6b, 0.8).setDepth(201);
    this.panel = this.add.rectangle(cx, cy, w, h, 0x100e1c, 0.97).setDepth(202);
    this.add.rectangle(cx, cy, w - 12, h - 12, 0x000000, 0).setDepth(203).setStrokeStyle(1, 0x3a2f5a, 0.4);
  }

  private createTitle(): void {
    const cx = ROOM_WIDTH / 2, topY = ROOM_HEIGHT / 2 - 310;
    this.dtxt(cx - 140, topY, '✦', 16, '#6b5b95').setOrigin(0.5);
    this.dtxt(cx, topY, 'GRIMOIRE', 26, '#c8b8e8', true).setOrigin(0.5);
    this.dtxt(cx + 140, topY, '✦', 16, '#6b5b95').setOrigin(0.5);
    this.add.rectangle(cx, topY + 20, 420, 1, 0x3a2f5a, 0.5).setDepth(210);
  }

  // ── Slot Panels ─────────────────────────────────────────────────────────

  private createSlots(): void {
    const cx = ROOM_WIDTH / 2;
    const slotY = ROOM_HEIGHT / 2 - 255;
    const slotW = 130;
    const slotH = 100;
    const gap = 12;
    const totalW = slotW * 4 + gap * 3;
    const startX = cx - totalW / 2 + slotW / 2;

    // Connector arrows between slots
    for (let i = 0; i < 3; i++) {
      const arrowX = startX + (slotW + gap) * i + slotW / 2 + gap / 2;
      this.dtxt(arrowX, slotY, '+', 18, '#3a2f5a').setOrigin(0.5);
    }

    this.prefixSlot = new SlotPanel(this, {
      x: startX, y: slotY, width: slotW, height: slotH,
      label: 'PREFIX', required: false, accentColor: 0x88cc88,
    });

    this.coreSlot = new SlotPanel(this, {
      x: startX + slotW + gap, y: slotY, width: slotW, height: slotH,
      label: 'CORE', required: true, accentColor: 0xff8844,
    });

    this.formSlot = new SlotPanel(this, {
      x: startX + (slotW + gap) * 2, y: slotY, width: slotW, height: slotH,
      label: 'FORM', required: true, accentColor: 0x8888ff,
    });

    this.suffixSlot = new SlotPanel(this, {
      x: startX + (slotW + gap) * 3, y: slotY, width: slotW, height: slotH,
      label: 'SUFFIX', required: false, accentColor: 0xccaa66,
    });
  }

  // ── Tab Buttons ─────────────────────────────────────────────────────────

  private createTabButtons(): void {
    const cx = ROOM_WIDTH / 2;
    const tabY = ROOM_HEIGHT / 2 - 185;
    const tabs: { slot: ActiveSlot; label: string; color: number }[] = [
      { slot: 'prefix', label: 'Prefixes', color: 0x88cc88 },
      { slot: 'core', label: 'Cores', color: 0xff8844 },
      { slot: 'form', label: 'Forms', color: 0x8888ff },
      { slot: 'suffix', label: 'Suffixes', color: 0xccaa66 },
    ];

    const tabW = 120;
    const totalW = tabW * 4 + 8 * 3;
    const startX = cx - totalW / 2 + tabW / 2;

    for (let i = 0; i < tabs.length; i++) {
      const t = tabs[i];
      const tx = startX + i * (tabW + 8);

      const bg = this.add.rectangle(tx, tabY, tabW, 26, 0x1a1833, 0.8).setDepth(215);
      bg.setStrokeStyle(1, t.color, 0.3);
      bg.setInteractive({ useHandCursor: true });

      const hex = '#' + t.color.toString(16).padStart(6, '0');
      const text = this.add.text(tx, tabY, t.label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '11px',
        color: hex,
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(216);

      bg.on('pointerdown', () => this.switchTab(t.slot));
      bg.on('pointerover', () => bg.setFillStyle(0x222244, 0.9));
      bg.on('pointerout', () => {
        bg.setFillStyle(this.activeSlot === t.slot ? 0x222244 : 0x1a1833, 0.8);
      });

      this.tabButtons.push({ slot: t.slot, bg, text });
    }
  }

  // ── Spell Preview ───────────────────────────────────────────────────────

  private createSpellPreview(): void {
    const cx = ROOM_WIDTH / 2;
    const previewY = ROOM_HEIGHT / 2 + 170;
    this.spellPreview = new SpellPreview(this, cx, previewY);
  }

  // ── Picker Area ─────────────────────────────────────────────────────────

  private createPickerArea(): void {
    // Background for picker area
    const cx = ROOM_WIDTH / 2;
    const pickerY = ROOM_HEIGHT / 2 - 30;
    this.add.rectangle(cx, pickerY, 520, 280, 0x0a0816, 0.6).setDepth(214);
    this.add.rectangle(cx, pickerY, 520, 280).setFillStyle(0, 0)
      .setStrokeStyle(1, 0x2a1f4a, 0.3).setDepth(214);
  }

  private switchTab(slot: ActiveSlot): void {
    this.activeSlot = slot;

    // Update tab highlights
    for (const tab of this.tabButtons) {
      const active = tab.slot === slot;
      tab.bg.setFillStyle(active ? 0x222244 : 0x1a1833, 0.8);
      tab.bg.setStrokeStyle(active ? 2 : 1,
        active ? 0xffffff : parseInt(tab.text.style.color!.replace('#', ''), 16), active ? 0.5 : 0.3);
    }

    // Update slot highlights
    this.prefixSlot.setActive(slot === 'prefix');
    this.coreSlot.setActive(slot === 'core');
    this.formSlot.setActive(slot === 'form');
    this.suffixSlot.setActive(slot === 'suffix');

    // Rebuild picker
    this.buildPicker(slot);
  }

  private buildPicker(slot: ActiveSlot): void {
    if (this.currentPicker) {
      this.currentPicker.destroy();
      this.currentPicker = null;
    }

    const cx = ROOM_WIDTH / 2;
    const pickerY = ROOM_HEIGHT / 2 - 150;
    const pickerW = 480;

    let items: PickerItem[] = [];

    switch (slot) {
      case 'prefix':
        items = this.buildPrefixItems();
        break;
      case 'core':
        items = this.buildCoreItems();
        break;
      case 'form':
        items = this.buildFormItems();
        break;
      case 'suffix':
        items = this.buildSuffixItems();
        break;
    }

    this.currentPicker = new ComponentPicker(
      this, cx, pickerY, pickerW, items,
      (item) => this.onPickerSelect(slot, item),
    );

    // Set current selection
    switch (slot) {
      case 'prefix': this.currentPicker.setSelectedId(this.selectedPrefix); break;
      case 'core': this.currentPicker.setSelectedId(this.selectedCore); break;
      case 'form': this.currentPicker.setSelectedId(this.selectedForm); break;
      case 'suffix': this.currentPicker.setSelectedId(this.selectedSuffix); break;
    }
  }

  private buildPrefixItems(): PickerItem[] {
    return getAllPrefixIds().map(id => {
      const p = PREFIX_REGISTRY[id];
      let compatible = true;
      let reason: string | undefined;

      if (this.selectedForm) {
        const result = SpellValidator.validate(
          this.selectedCore, this.selectedForm, id, this.selectedSuffix,
        );
        const prefixError = result.errors.find(e => e.field === 'prefix' || e.field === 'combination');
        if (prefixError) {
          compatible = false;
          reason = prefixError.suggestion || prefixError.message;
        }
      }

      return {
        id, displayName: p.displayName, description: p.description,
        manaCost: p.manaCost, color: 0x88cc88, compatible, incompatReason: reason,
      };
    });
  }

  private buildCoreItems(): PickerItem[] {
    return getAllCoreIds().map(id => {
      const c = CORE_REGISTRY[id];
      return {
        id, displayName: c.displayName, description: c.description,
        manaCost: c.manaCost, color: c.visual.color, compatible: true,
      };
    });
  }

  private buildFormItems(): PickerItem[] {
    return getAllFormIds().map(id => {
      const f = FORM_REGISTRY[id];
      return {
        id, displayName: f.displayName, description: f.description,
        manaCost: f.manaCost, color: 0x8888ff, compatible: true,
      };
    });
  }

  private buildSuffixItems(): PickerItem[] {
    return getAllSuffixIds().map(id => {
      const s = SUFFIX_REGISTRY[id];
      let compatible = true;
      let reason: string | undefined;

      if (this.selectedForm) {
        const result = SpellValidator.validate(
          this.selectedCore, this.selectedForm, this.selectedPrefix, id,
        );
        const suffixError = result.errors.find(e => e.field === 'suffix' || e.field === 'combination');
        if (suffixError) {
          compatible = false;
          reason = suffixError.suggestion || suffixError.message;
        }
      }

      return {
        id, displayName: s.displayName, description: s.description,
        manaCost: s.manaCost, color: 0xccaa66, compatible, incompatReason: reason,
      };
    });
  }

  // ── Selection ───────────────────────────────────────────────────────────

  private onPickerSelect(slot: ActiveSlot, item: PickerItem | null): void {
    switch (slot) {
      case 'prefix':
        this.selectedPrefix = item ? item.id as PrefixId : null;
        this.updateSlotContent('prefix');
        break;
      case 'core':
        this.selectedCore = item ? item.id as CoreId : null;
        this.updateSlotContent('core');
        break;
      case 'form':
        this.selectedForm = item ? item.id as FormId : null;
        this.updateSlotContent('form');
        break;
      case 'suffix':
        this.selectedSuffix = item ? item.id as SuffixId : null;
        this.updateSlotContent('suffix');
        break;
    }

    this.rebuildPreview();
    this.updateTextInput();

    // Rebuild pickers for prefix/suffix since compatibility may have changed
    if (slot === 'form' || slot === 'core') {
      if (this.activeSlot === 'prefix' || this.activeSlot === 'suffix') {
        this.buildPicker(this.activeSlot);
      }
    }
  }

  private updateSlotContent(slot: ActiveSlot): void {
    switch (slot) {
      case 'prefix': {
        if (this.selectedPrefix) {
          const p = PREFIX_REGISTRY[this.selectedPrefix];
          this.prefixSlot.setContent({
            id: p.id, displayName: p.displayName, description: p.description,
            manaCost: p.manaCost, color: 0x88cc88,
          });
        } else {
          this.prefixSlot.setContent(null);
        }
        break;
      }
      case 'core': {
        if (this.selectedCore) {
          const c = CORE_REGISTRY[this.selectedCore];
          this.coreSlot.setContent({
            id: c.id, displayName: c.displayName, description: c.description,
            manaCost: c.manaCost, color: c.visual.color,
          });
        } else {
          this.coreSlot.setContent(null);
        }
        break;
      }
      case 'form': {
        if (this.selectedForm) {
          const f = FORM_REGISTRY[this.selectedForm];
          this.formSlot.setContent({
            id: f.id, displayName: f.displayName, description: f.description,
            manaCost: f.manaCost, color: 0x8888ff,
          });
        } else {
          this.formSlot.setContent(null);
        }
        break;
      }
      case 'suffix': {
        if (this.selectedSuffix) {
          const s = SUFFIX_REGISTRY[this.selectedSuffix];
          this.suffixSlot.setContent({
            id: s.id, displayName: s.displayName, description: s.description,
            manaCost: s.manaCost, color: 0xccaa66,
          });
        } else {
          this.suffixSlot.setContent(null);
        }
        break;
      }
    }
  }

  // ── Preview ─────────────────────────────────────────────────────────────

  private rebuildPreview(): void {
    // Clear all slot errors
    this.prefixSlot.clearError();
    this.coreSlot.clearError();
    this.formSlot.clearError();
    this.suffixSlot.clearError();

    if (!this.selectedCore || !this.selectedForm) {
      this.spellPreview.showEmpty();
      this.setPrepareEnabled(false);
      return;
    }

    const result = SpellBuilder.build(
      this.selectedCore, this.selectedForm,
      this.selectedPrefix, this.selectedSuffix,
    );

    if (result.success && result.spell) {
      this.spellPreview.showSpell(result.spell);
      this.setPrepareEnabled(true);
    } else {
      this.spellPreview.showError(result.error, result.suggestion);
      this.setPrepareEnabled(false);

      // Highlight which slot has the error
      const validation = SpellValidator.validate(
        this.selectedCore, this.selectedForm,
        this.selectedPrefix, this.selectedSuffix,
      );
      for (const err of validation.errors) {
        switch (err.field) {
          case 'prefix': this.prefixSlot.setError(err.message); break;
          case 'suffix': this.suffixSlot.setError(err.message); break;
          case 'core': this.coreSlot.setError(err.message); break;
          case 'form': this.formSlot.setError(err.message); break;
          case 'combination':
            // Highlight the most relevant slot
            if (this.selectedPrefix) this.prefixSlot.setError(err.message);
            if (this.selectedSuffix) this.suffixSlot.setError(err.message);
            break;
        }
      }
    }
  }

  // ── Text Input (power-user) ─────────────────────────────────────────────

  private createTextInput(): void {
    const cx = ROOM_WIDTH / 2;
    const inputY = ROOM_HEIGHT / 2 + 275;

    this.dtxt(cx - 250, inputY - 2, 'Or type:', 9, '#555566');

    const boxW = 380, boxH = 26;
    this.inputBox = this.add.rectangle(cx + 30, inputY, boxW, boxH, 0x0a0818, 0.7).setDepth(215);
    this.inputBox.setStrokeStyle(1, 0x3a2f5a, 0.5);

    this.inputText = this.add.text(cx + 30 - boxW / 2 + 8, inputY, '', {
      fontFamily: '"Courier New", monospace', fontSize: '12px', color: '#ccbbee',
    }).setOrigin(0, 0.5).setDepth(216);

    this.cursor = this.add.rectangle(cx + 30 - boxW / 2 + 8, inputY, 2, 14, 0xccbbee, 1)
      .setDepth(216).setOrigin(0, 0.5);
  }

  private updateTextInput(): void {
    // Sync text input from slot selections
    const parts: string[] = [];
    if (this.selectedPrefix) parts.push(PREFIX_REGISTRY[this.selectedPrefix].displayName.toUpperCase());
    if (this.selectedCore) parts.push(this.selectedCore);
    if (this.selectedForm) parts.push(this.selectedForm);
    if (this.selectedSuffix) parts.push(SUFFIX_REGISTRY[this.selectedSuffix].displayName.toUpperCase());
    this.currentInput = parts.join(' ');
    this.inputText.setText(this.currentInput);

    const boxLeft = ROOM_WIDTH / 2 + 30 - 190 + 8;
    this.cursor.setX(boxLeft + this.inputText.width + 2);
  }

  // ── Prepare Button ──────────────────────────────────────────────────────

  private createPrepareButton(): void {
    const cx = ROOM_WIDTH / 2;
    const btnY = ROOM_HEIGHT / 2 + 310;

    this.prepareBtn = this.add.rectangle(cx, btnY, 200, 34, 0x224422, 0.8).setDepth(215);
    this.prepareBtn.setStrokeStyle(1, 0x44aa44, 0.5);
    this.prepareBtn.setInteractive({ useHandCursor: true });

    this.prepareBtnText = this.add.text(cx, btnY, '✦ PREPARE SPELL ✦', {
      fontFamily: '"Courier New", monospace',
      fontSize: '12px',
      color: '#66aa66',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(216);

    this.prepareBtn.on('pointerover', () => {
      this.prepareBtn.setFillStyle(0x336633, 0.9);
    });
    this.prepareBtn.on('pointerout', () => {
      this.prepareBtn.setFillStyle(0x224422, 0.8);
    });
    this.prepareBtn.on('pointerdown', () => {
      this.attemptPrepare();
    });

    this.setPrepareEnabled(false);
  }

  private setPrepareEnabled(enabled: boolean): void {
    if (enabled) {
      this.prepareBtn.setFillStyle(0x224422, 0.8);
      this.prepareBtn.setStrokeStyle(1, 0x44aa44, 0.5);
      this.prepareBtnText.setColor('#66aa66');
      this.prepareBtn.setInteractive({ useHandCursor: true });
    } else {
      this.prepareBtn.setFillStyle(0x181818, 0.5);
      this.prepareBtn.setStrokeStyle(1, 0x333333, 0.3);
      this.prepareBtnText.setColor('#444444');
      this.prepareBtn.disableInteractive();
    }
  }

  private attemptPrepare(): void {
    if (!this.selectedCore || !this.selectedForm) return;

    const result = SpellBuilder.build(
      this.selectedCore, this.selectedForm,
      this.selectedPrefix, this.selectedSuffix,
    );

    if (result.success && result.spell) {
      this.scene.get('GameScene').events.emit('spell-prepared', result.spell);
      this.time.delayedCall(300, () => this.closeGrimoire());
    }
  }

  // ── Controls ────────────────────────────────────────────────────────────

  private createControls(): void {
    const cx = ROOM_WIDTH / 2;
    this.dtxt(cx + 150, ROOM_HEIGHT / 2 + 310, 'ESC / TAB = Close', 10, '#444455');
  }

  // ── Input ───────────────────────────────────────────────────────────────

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
        // Try text input first, then slot-based
        if (this.currentInput.trim().length > 3) {
          const result = SpellBuilder.parseAndBuild(this.currentInput);
          if (result.success && result.spell) {
            this.scene.get('GameScene').events.emit('spell-prepared', result.spell);
            this.time.delayedCall(300, () => this.closeGrimoire());
            return;
          }
        }
        this.attemptPrepare();
        return;
      }

      // Text input for power users
      if (event.key === 'Backspace') {
        event.preventDefault();
        this.currentInput = this.currentInput.slice(0, -1);
        this.syncFromTextInput();
        return;
      }

      if (event.key.length === 1 && /[a-zA-Z\s]/.test(event.key)) {
        if (this.currentInput.length < 45) {
          this.currentInput += event.key.toUpperCase();
          this.syncFromTextInput();
        }
      }
    });
  }

  /**
   * When the user types in the text box, try to parse and update the slot UI.
   */
  private syncFromTextInput(): void {
    this.inputText.setText(this.currentInput);
    const boxLeft = ROOM_WIDTH / 2 + 30 - 190 + 8;
    this.cursor.setX(boxLeft + this.inputText.width + 2);

    // Try to parse
    const result = SpellBuilder.parseAndBuild(this.currentInput);
    if (result.success && result.spell) {
      this.selectedPrefix = result.spell.prefix?.id as PrefixId || null;
      this.selectedCore = result.spell.core.id;
      this.selectedForm = result.spell.form.id;
      this.selectedSuffix = result.spell.suffix?.id as SuffixId || null;

      this.updateSlotContent('prefix');
      this.updateSlotContent('core');
      this.updateSlotContent('form');
      this.updateSlotContent('suffix');
      this.rebuildPreview();

      if (this.currentPicker) {
        this.buildPicker(this.activeSlot);
      }
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private dtxt(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: size + 'px',
      color,
      fontStyle: bold ? 'bold' : 'normal',
    }).setDepth(210);
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