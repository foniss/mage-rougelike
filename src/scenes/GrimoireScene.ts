// src/scenes/GrimoireScene.ts

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellBuilder, Spell } from '../systems/SpellBuilder';
import { SpellValidator } from '../systems/SpellValidator';
import { ComponentRow, ComponentOption } from '../ui/ComponentRow';
import { SpellAssemblyPreview } from '../ui/SpellAssemblyPreview';
import {
  CoreId, FormId, PrefixId, SuffixId,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
} from '../config/spellComponents';
import { ROOM_WIDTH, ROOM_HEIGHT, SPELL_SLOT_COUNT } from '../config/constants';

export class GrimoireScene extends Phaser.Scene {
  private grimoireSystem!: GrimoireSystem;
  private targetSlotIndex: number = 0;

  private selectedPrefix: PrefixId | null = null;
  private selectedCore: CoreId | null = null;
  private selectedForm: FormId | null = null;
  private selectedSuffix: SuffixId | null = null;

  private prefixRow!: ComponentRow;
  private coreRow!: ComponentRow;
  private formRow!: ComponentRow;
  private suffixRow!: ComponentRow;
  private preview!: SpellAssemblyPreview;

  private castBtn!: Phaser.GameObjects.Rectangle;
  private castBtnText!: Phaser.GameObjects.Text;
  private slotBtns: Phaser.GameObjects.Rectangle[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];

  private currentSpell: Spell | null = null;

  constructor() { super({ key: 'GrimoireScene' }); }

  init(data: { grimoireSystem: GrimoireSystem; slotIndex?: number }): void {
    this.grimoireSystem = data.grimoireSystem;
    this.targetSlotIndex = data.slotIndex ?? this.grimoireSystem.activeSlotIndex;
  }

  create(): void {
    this.currentSpell = null;
    this.slotBtns = [];
    this.slotTexts = [];

    // Load existing slot config
    const existing = this.grimoireSystem.slots[this.targetSlotIndex]?.spell;
    if (existing) {
      this.selectedCore = existing.core.id;
      this.selectedForm = existing.form.id;
      this.selectedPrefix = existing.prefix?.id as PrefixId ?? null;
      this.selectedSuffix = existing.suffix?.id as SuffixId ?? null;
    } else {
      this.selectedPrefix = null;
      this.selectedCore = null;
      this.selectedForm = null;
      this.selectedSuffix = null;
    }

    this.createOverlay();
    this.createBookPanel();
    this.createTitle();
    this.createComponentRows();
    this.createPreview();
    this.createSlotSelector();
    this.createHistory();
    this.createCastButton();
    this.createCloseButton();
    this.createControls();

    this.rebuildPreview();
    this.updateCompatibility();
  }

  // ── Layout ──────────────────────────────────────────────────────────────

  private createOverlay(): void {
    const overlay = this.add.rectangle(
      ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT, 0x000000, 0.55
    ).setDepth(200);
    // Make overlay interactive so clicks don't pass through to game
    overlay.setInteractive();
  }

  private createBookPanel(): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    this.add.rectangle(cx, cy, 780, 640, 0x2a1f3a, 0.9).setDepth(201);
    this.add.rectangle(cx, cy, 770, 630, 0x0e0c18, 0.97).setDepth(202);
    this.add.rectangle(cx, cy, 754, 614, 0, 0).setDepth(203)
      .setStrokeStyle(1, 0x3a2f5a, 0.3);
  }

  private createTitle(): void {
    const cx = ROOM_WIDTH / 2, topY = ROOM_HEIGHT / 2 - 295;
    this.add.text(cx - 130, topY, '✦', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#6b5b95',
    }).setOrigin(0.5).setDepth(210);
    this.add.text(cx, topY, 'GRIMOIRE', {
      fontFamily: '"Courier New", monospace', fontSize: '22px',
      color: '#c8b8e8', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(210);
    this.add.text(cx + 130, topY, '✦', {
      fontFamily: '"Courier New", monospace', fontSize: '14px', color: '#6b5b95',
    }).setOrigin(0.5).setDepth(210);
    this.add.rectangle(cx, topY + 18, 380, 1, 0x3a2f5a, 0.4).setDepth(210);
  }

  // ── Component Rows ──────────────────────────────────────────────────────

  private createComponentRows(): void {
    const leftX = ROOM_WIDTH / 2 - 365;
    let rowY = ROOM_HEIGHT / 2 - 248;

    const prefixOpts = this.buildOptions('prefix');
    this.prefixRow = new ComponentRow(
      this, leftX, rowY, 'PREFIX', false, '#88cc88', prefixOpts,
      (opt) => { this.selectedPrefix = opt.id as PrefixId | null; this.onSelectionChanged(); },
    );
    this.prefixRow.setSelectedId(this.selectedPrefix);
    rowY += 82;

    const coreOpts = this.buildOptions('core');
    this.coreRow = new ComponentRow(
      this, leftX, rowY, 'CORE', true, '#ffaa66', coreOpts,
      (opt) => { this.selectedCore = opt.id as CoreId | null; this.onSelectionChanged(); },
    );
    this.coreRow.setSelectedId(this.selectedCore);
    rowY += 82;

    const formOpts = this.buildOptions('form');
    this.formRow = new ComponentRow(
      this, leftX, rowY, 'FORM', true, '#8888dd', formOpts,
      (opt) => { this.selectedForm = opt.id as FormId | null; this.onSelectionChanged(); },
    );
    this.formRow.setSelectedId(this.selectedForm);
    rowY += 82;

    const suffixOpts = this.buildOptions('suffix');
    this.suffixRow = new ComponentRow(
      this, leftX, rowY, 'SUFFIX', false, '#ccaa66', suffixOpts,
      (opt) => { this.selectedSuffix = opt.id as SuffixId | null; this.onSelectionChanged(); },
    );
    this.suffixRow.setSelectedId(this.selectedSuffix);
  }

  private buildOptions(type: 'prefix' | 'core' | 'form' | 'suffix'): ComponentOption[] {
    const opts: ComponentOption[] = [];

    if (type === 'prefix' || type === 'suffix') {
      opts.push({
        id: null, displayName: 'None', description: '',
        manaCost: 0, color: 0x555566, compatible: true,
      });
    }

    switch (type) {
      case 'prefix':
        for (const id of getAllPrefixIds()) {
          const p = PREFIX_REGISTRY[id];
          opts.push({
            id, displayName: p.displayName, description: p.description,
            manaCost: p.manaCost, color: 0x88cc88, compatible: true,
          });
        }
        break;
      case 'core':
        for (const id of getAllCoreIds()) {
          const c = CORE_REGISTRY[id];
          opts.push({
            id, displayName: c.displayName, description: c.description,
            manaCost: c.manaCost, color: c.visual.color, compatible: true,
          });
        }
        break;
      case 'form':
        for (const id of getAllFormIds()) {
          const f = FORM_REGISTRY[id];
          opts.push({
            id, displayName: f.displayName, description: f.description,
            manaCost: f.manaCost, color: 0x8888dd, compatible: true,
          });
        }
        break;
      case 'suffix':
        for (const id of getAllSuffixIds()) {
          const s = SUFFIX_REGISTRY[id];
          opts.push({
            id, displayName: s.displayName, description: s.description,
            manaCost: s.manaCost, color: 0xccaa66, compatible: true,
          });
        }
        break;
    }
    return opts;
  }

  // ── Preview ─────────────────────────────────────────────────────────────

  private createPreview(): void {
    this.preview = new SpellAssemblyPreview(
      this, ROOM_WIDTH / 2 + 210, ROOM_HEIGHT / 2 - 100,
    );
  }

  // ── Slot Selector ───────────────────────────────────────────────────────

  private createSlotSelector(): void {
    const cx = ROOM_WIDTH / 2 + 210;
    const sy = ROOM_HEIGHT / 2 + 90;

    this.add.text(cx, sy, 'ASSIGN TO SLOT:', {
      fontFamily: '"Courier New", monospace', fontSize: '9px',
      color: '#666677', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(220);

    const slotW = 80;
    const gap = 8;
    const totalW = SPELL_SLOT_COUNT * slotW + (SPELL_SLOT_COUNT - 1) * gap;
    const startX = cx - totalW / 2 + slotW / 2;

    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      const bx = startX + i * (slotW + gap);
      const by = sy + 22;

      const btn = this.add.rectangle(bx, by, slotW, 24, 0x161428, 0.9).setDepth(220);
      btn.setStrokeStyle(
        1, i === this.targetSlotIndex ? 0xaaaacc : 0x3a2f5a, 0.5,
      );
      btn.setInteractive({ useHandCursor: true });

      const existingSpell = this.grimoireSystem.slots[i]?.spell;
      const slotLabel = existingSpell
        ? existingSpell.name.substring(0, 10)
        : `Slot ${i + 1}`;

      const txt = this.add.text(bx, by, slotLabel, {
        fontFamily: '"Courier New", monospace', fontSize: '8px',
        color: i === this.targetSlotIndex ? '#aaaacc' : '#555566',
      }).setOrigin(0.5).setDepth(221);

      btn.on('pointerdown', () => {
        this.targetSlotIndex = i;
        this.updateSlotBtnVisuals();

        // Load slot's spell into editor
        const slotSpell = this.grimoireSystem.slots[i]?.spell;
        if (slotSpell) {
          this.selectedCore = slotSpell.core.id;
          this.selectedForm = slotSpell.form.id;
          this.selectedPrefix = slotSpell.prefix?.id as PrefixId ?? null;
          this.selectedSuffix = slotSpell.suffix?.id as SuffixId ?? null;
        } else {
          this.selectedPrefix = null;
          this.selectedCore = null;
          this.selectedForm = null;
          this.selectedSuffix = null;
        }
        this.prefixRow.setSelectedId(this.selectedPrefix);
        this.coreRow.setSelectedId(this.selectedCore);
        this.formRow.setSelectedId(this.selectedForm);
        this.suffixRow.setSelectedId(this.selectedSuffix);
        this.onSelectionChanged();
      });

      this.slotBtns.push(btn);
      this.slotTexts.push(txt);
    }
  }

  private updateSlotBtnVisuals(): void {
    for (let i = 0; i < this.slotBtns.length; i++) {
      const active = i === this.targetSlotIndex;
      this.slotBtns[i].setStrokeStyle(
        active ? 2 : 1, active ? 0xaaaacc : 0x3a2f5a, active ? 0.7 : 0.4,
      );
      this.slotTexts[i].setColor(active ? '#aaaacc' : '#555566');
    }
  }

  // ── History ─────────────────────────────────────────────────────────────

  private createHistory(): void {
    const cx = ROOM_WIDTH / 2 + 210;
    const hy = ROOM_HEIGHT / 2 + 150;

    this.add.text(cx, hy, 'RECENT SPELLS:', {
      fontFamily: '"Courier New", monospace', fontSize: '9px',
      color: '#555566', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(220);

    const history = this.grimoireSystem.history;
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      const entry = history[i];
      const ey = hy + 16 + i * 20;
      const hex = '#' + entry.spell.visual.color.toString(16).padStart(6, '0');

      const hBg = this.add.rectangle(cx, ey, 260, 18, 0x111122, 0.5).setDepth(220);
      hBg.setInteractive({ useHandCursor: true });

      this.add.text(cx - 120, ey, entry.spell.name, {
        fontFamily: '"Courier New", monospace', fontSize: '8px', color: hex,
      }).setOrigin(0, 0.5).setDepth(221);

      this.add.text(cx + 110, ey, `${entry.spell.manaCost} MP`, {
        fontFamily: '"Courier New", monospace', fontSize: '8px', color: '#4488aa',
      }).setOrigin(1, 0.5).setDepth(221);

      hBg.on('pointerover', () => hBg.setFillStyle(0x222244, 0.7));
      hBg.on('pointerout', () => hBg.setFillStyle(0x111122, 0.5));
      hBg.on('pointerdown', () => {
        this.selectedPrefix = entry.prefixId;
        this.selectedCore = entry.coreId;
        this.selectedForm = entry.formId;
        this.selectedSuffix = entry.suffixId;
        this.prefixRow.setSelectedId(this.selectedPrefix);
        this.coreRow.setSelectedId(this.selectedCore);
        this.formRow.setSelectedId(this.selectedForm);
        this.suffixRow.setSelectedId(this.selectedSuffix);
        this.onSelectionChanged();
      });
    }

    if (history.length === 0) {
      this.add.text(cx, hy + 20, 'No spells created yet', {
        fontFamily: '"Courier New", monospace', fontSize: '8px',
        color: '#444455', fontStyle: 'italic',
      }).setOrigin(0.5).setDepth(220);
    }
  }

  // ── Cast Button ─────────────────────────────────────────────────────────

  private createCastButton(): void {
    const cx = ROOM_WIDTH / 2 + 210;
    const by = ROOM_HEIGHT / 2 + 270;

    this.castBtn = this.add.rectangle(cx, by, 220, 36, 0x1a1a22, 0.8).setDepth(220);
    this.castBtn.setStrokeStyle(1, 0x444455, 0.4);
    this.castBtn.setInteractive({ useHandCursor: true });

    this.castBtnText = this.add.text(cx, by, '✦  PREPARE SPELL  ✦', {
      fontFamily: '"Courier New", monospace', fontSize: '12px',
      color: '#555566', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(221);

    this.castBtn.on('pointerover', () => {
      if (this.currentSpell) this.castBtn.setFillStyle(0x223322, 0.9);
    });
    this.castBtn.on('pointerout', () => {
      this.castBtn.setFillStyle(this.currentSpell ? 0x1a2a1a : 0x1a1a22, 0.8);
    });
    this.castBtn.on('pointerdown', () => {
      this.prepareSpell();
    });

    this.setCastEnabled(false);
  }

  private setCastEnabled(enabled: boolean): void {
    if (enabled) {
      this.castBtn.setFillStyle(0x1a2a1a, 0.9)
        .setStrokeStyle(1, 0x44aa44, 0.5);
      this.castBtnText.setColor('#66cc66');
      this.castBtn.setInteractive({ useHandCursor: true });
    } else {
      this.castBtn.setFillStyle(0x1a1a22, 0.8)
        .setStrokeStyle(1, 0x444455, 0.3);
      this.castBtnText.setColor('#555566');
      this.castBtn.disableInteractive();
    }
  }

  // ── Close Button ────────────────────────────────────────────────────────

  private createCloseButton(): void {
    const closeX = ROOM_WIDTH / 2 + 375;
    const closeY = ROOM_HEIGHT / 2 - 300;

    const closeBtn = this.add.rectangle(closeX, closeY, 30, 30, 0x331111, 0.8).setDepth(230);
    closeBtn.setStrokeStyle(1, 0x664444, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });

    this.add.text(closeX, closeY, '✕', {
      fontFamily: '"Courier New", monospace', fontSize: '16px', color: '#aa6666',
    }).setOrigin(0.5).setDepth(231);

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x442222, 0.9));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x331111, 0.8));
    closeBtn.on('pointerdown', () => {
      this.requestClose();
    });
  }

  // ── Controls Text ───────────────────────────────────────────────────────

  private createControls(): void {
    this.add.text(ROOM_WIDTH / 2, ROOM_HEIGHT / 2 + 302, 'TAB / ESC = Close     1-3 = Switch Slot', {
      fontFamily: '"Courier New", monospace', fontSize: '9px', color: '#444455',
    }).setOrigin(0.5).setDepth(210);
  }

  // ── Selection Logic ─────────────────────────────────────────────────────

  private onSelectionChanged(): void {
    this.updateCompatibility();
    this.rebuildPreview();
  }

  private updateCompatibility(): void {
    this.prefixRow.updateCompatibility((id) => {
      if (id === null) return true;
      if (!this.selectedCore || !this.selectedForm) return true;
      const result = SpellValidator.validate(
        this.selectedCore, this.selectedForm, id as PrefixId, this.selectedSuffix,
      );
      return !result.errors.some(e => e.field === 'prefix' || e.field === 'combination');
    });

    this.suffixRow.updateCompatibility((id) => {
      if (id === null) return true;
      if (!this.selectedCore || !this.selectedForm) return true;
      const result = SpellValidator.validate(
        this.selectedCore, this.selectedForm, this.selectedPrefix, id as SuffixId,
      );
      return !result.errors.some(e => e.field === 'suffix' || e.field === 'combination');
    });
  }

  private rebuildPreview(): void {
    if (!this.selectedCore || !this.selectedForm) {
      this.currentSpell = null;
      this.preview.showEmpty();
      this.setCastEnabled(false);
      return;
    }

    const result = SpellBuilder.build(
      this.selectedCore, this.selectedForm,
      this.selectedPrefix, this.selectedSuffix,
    );

    if (result.success && result.spell) {
      this.currentSpell = result.spell;
      this.preview.showSpell(result.spell);
      this.setCastEnabled(true);
    } else {
      this.currentSpell = null;
      this.preview.showError(result.error, result.suggestion);
      this.setCastEnabled(false);
    }
  }

  // ── Prepare ─────────────────────────────────────────────────────────────

  private prepareSpell(): void {
    if (!this.selectedCore || !this.selectedForm) return;

    const spell = this.grimoireSystem.assignToSlot(
      this.targetSlotIndex,
      this.selectedCore, this.selectedForm,
      this.selectedPrefix, this.selectedSuffix,
    );

    if (spell) {
      this.grimoireSystem.setActiveSlot(this.targetSlotIndex);
      const gameScene = this.scene.get('GameScene');
      gameScene.events.emit('spell-slots-updated');
      this.requestClose();
    }
  }

  // ── Close ───────────────────────────────────────────────────────────────

  private requestClose(): void {
    // Clean up our UI objects
    this.preview.destroy();
    this.prefixRow.destroy();
    this.coreRow.destroy();
    this.formRow.destroy();
    this.suffixRow.destroy();

    // Tell GameScene to close the grimoire (restores time, stops this scene)
    const gameScene = this.scene.get('GameScene') as any;
    gameScene.forceCloseGrimoire();
  }
}