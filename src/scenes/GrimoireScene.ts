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
import {
  uiText, applyTextShadow, createGlassPanel, GLASS,
} from '../config/uiStyles';

const LEFT_PANEL_W = 500;
const RIGHT_PANEL_W = 340;

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
    this.createPanels();
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

  // ── Layout — edge panels keep the arena visible in the center ───────────

  private createOverlay(): void {
    // Very light full-screen tint — combat stays readable behind the UI
    const overlay = this.add.rectangle(
      ROOM_WIDTH / 2, ROOM_HEIGHT / 2, ROOM_WIDTH, ROOM_HEIGHT,
      GLASS.overlayTint, GLASS.overlayAlpha,
    ).setDepth(200);
    overlay.setInteractive();
  }

  private createPanels(): void {
    const leftW = Math.min(LEFT_PANEL_W, ROOM_WIDTH * 0.38);
    const rightW = Math.min(RIGHT_PANEL_W, ROOM_WIDTH * 0.3);

    createGlassPanel(this, leftW / 2, ROOM_HEIGHT / 2, leftW, ROOM_HEIGHT, 201);
    createGlassPanel(this, ROOM_WIDTH - rightW / 2, ROOM_HEIGHT / 2, rightW, ROOM_HEIGHT, 201);

    // Accent lines on inner edges
    this.add.rectangle(leftW, ROOM_HEIGHT / 2, 1, ROOM_HEIGHT, GLASS.accentLine, GLASS.accentLineAlpha).setDepth(202);
    this.add.rectangle(ROOM_WIDTH - rightW, ROOM_HEIGHT / 2, 1, ROOM_HEIGHT, GLASS.accentLine, GLASS.accentLineAlpha).setDepth(202);
  }

  private createTitle(): void {
    const topY = 28;
    const title = this.add.text(ROOM_WIDTH / 2, topY, 'GRIMOIRE', uiText(20, '#ddd0f0', true))
      .setOrigin(0.5).setDepth(210);
    applyTextShadow(title);

    const subtitle = this.add.text(ROOM_WIDTH / 2, topY + 24, 'Combat continues behind you', uiText(12, '#888899'))
      .setOrigin(0.5).setDepth(210);
    applyTextShadow(subtitle);
  }

  // ── Component Rows ──────────────────────────────────────────────────────

  private createComponentRows(): void {
    const leftW = Math.min(LEFT_PANEL_W, ROOM_WIDTH * 0.38);
    const leftX = 20;
    let rowY = 72;

    const prefixOpts = this.buildOptions('prefix');
    this.prefixRow = new ComponentRow(
      this, leftX, rowY, 'PREFIX', false, '#88cc88', prefixOpts,
      (opt) => { this.selectedPrefix = opt.id as PrefixId | null; this.onSelectionChanged(); },
    );
    this.prefixRow.setSelectedId(this.selectedPrefix);
    rowY += 96;

    const coreOpts = this.buildOptions('core');
    this.coreRow = new ComponentRow(
      this, leftX, rowY, 'CORE', true, '#ffaa66', coreOpts,
      (opt) => { this.selectedCore = opt.id as CoreId | null; this.onSelectionChanged(); },
    );
    this.coreRow.setSelectedId(this.selectedCore);
    rowY += 96;

    const formOpts = this.buildOptions('form');
    this.formRow = new ComponentRow(
      this, leftX, rowY, 'FORM', true, '#8888dd', formOpts,
      (opt) => { this.selectedForm = opt.id as FormId | null; this.onSelectionChanged(); },
    );
    this.formRow.setSelectedId(this.selectedForm);
    rowY += 96;

    const suffixOpts = this.buildOptions('suffix');
    this.suffixRow = new ComponentRow(
      this, leftX, rowY, 'SUFFIX', false, '#ccaa66', suffixOpts,
      (opt) => { this.selectedSuffix = opt.id as SuffixId | null; this.onSelectionChanged(); },
    );
    this.suffixRow.setSelectedId(this.selectedSuffix);

    // Left panel hint
    const hint = this.add.text(leftW / 2, ROOM_HEIGHT - 36, 'Click a component to select', uiText(11, '#666677'))
      .setOrigin(0.5).setDepth(210);
    applyTextShadow(hint);
  }

  private buildOptions(type: 'prefix' | 'core' | 'form' | 'suffix'): ComponentOption[] {
    const opts: ComponentOption[] = [];

    if (type === 'prefix' || type === 'suffix') {
      opts.push({
        id: null, displayName: 'None', description: '',
        manaCost: 0, color: 0x666677, compatible: true,
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
    const rightW = Math.min(RIGHT_PANEL_W, ROOM_WIDTH * 0.3);
    const cx = ROOM_WIDTH - rightW / 2;
    this.preview = new SpellAssemblyPreview(this, cx, ROOM_HEIGHT / 2 - 120);
  }

  // ── Slot Selector ───────────────────────────────────────────────────────

  private createSlotSelector(): void {
    const rightW = Math.min(RIGHT_PANEL_W, ROOM_WIDTH * 0.3);
    const cx = ROOM_WIDTH - rightW / 2;
    const sy = ROOM_HEIGHT / 2 + 40;

    const label = this.add.text(cx, sy, 'ASSIGN TO SLOT', uiText(12, '#778899', true))
      .setOrigin(0.5).setDepth(220);
    applyTextShadow(label);

    const slotW = 88;
    const gap = 8;
    const totalW = SPELL_SLOT_COUNT * slotW + (SPELL_SLOT_COUNT - 1) * gap;
    const startX = cx - totalW / 2 + slotW / 2;

    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      const bx = startX + i * (slotW + gap);
      const by = sy + 28;

      const btn = this.add.rectangle(bx, by, slotW, 28, 0x12101c, 0.55).setDepth(220);
      btn.setStrokeStyle(
        1, i === this.targetSlotIndex ? 0xaaaacc : 0x555566, 0.6,
      );
      btn.setInteractive({ useHandCursor: true });

      const existingSpell = this.grimoireSystem.slots[i]?.spell;
      const slotLabel = existingSpell
        ? existingSpell.name.substring(0, 9)
        : `Slot ${i + 1}`;

      const txt = this.add.text(bx, by, slotLabel, uiText(11, i === this.targetSlotIndex ? '#ccccee' : '#778899'))
        .setOrigin(0.5).setDepth(221);
      applyTextShadow(txt);

      btn.on('pointerdown', () => {
        this.targetSlotIndex = i;
        this.updateSlotBtnVisuals();

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
        active ? 2 : 1, active ? 0xccccee : 0x555566, active ? 0.8 : 0.45,
      );
      this.slotTexts[i].setColor(active ? '#ccccee' : '#778899');
    }
  }

  // ── History ─────────────────────────────────────────────────────────────

  private createHistory(): void {
    const rightW = Math.min(RIGHT_PANEL_W, ROOM_WIDTH * 0.3);
    const cx = ROOM_WIDTH - rightW / 2;
    const hy = ROOM_HEIGHT / 2 + 100;

    const label = this.add.text(cx, hy, 'RECENT SPELLS', uiText(12, '#667788', true))
      .setOrigin(0.5).setDepth(220);
    applyTextShadow(label);

    const history = this.grimoireSystem.history;
    for (let i = 0; i < Math.min(history.length, 5); i++) {
      const entry = history[i];
      const ey = hy + 22 + i * 26;
      const hex = '#' + entry.spell.visual.color.toString(16).padStart(6, '0');

      const hBg = this.add.rectangle(cx, ey, 280, 22, 0x12101c, 0.45).setDepth(220);
      hBg.setInteractive({ useHandCursor: true });

      const nameText = this.add.text(cx - 128, ey, entry.spell.name, uiText(11, hex))
        .setOrigin(0, 0.5).setDepth(221);
      applyTextShadow(nameText);

      const mpText = this.add.text(cx + 120, ey, `${entry.spell.manaCost} MP`, uiText(11, '#66aacc'))
        .setOrigin(1, 0.5).setDepth(221);
      applyTextShadow(mpText);

      hBg.on('pointerover', () => hBg.setFillStyle(0x1e1a30, 0.65));
      hBg.on('pointerout', () => hBg.setFillStyle(0x12101c, 0.45));
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
      const empty = this.add.text(cx, hy + 24, 'No spells created yet', uiText(11, '#556666'))
        .setOrigin(0.5).setDepth(220);
      applyTextShadow(empty);
    }
  }

  // ── Cast Button ─────────────────────────────────────────────────────────

  private createCastButton(): void {
    const rightW = Math.min(RIGHT_PANEL_W, ROOM_WIDTH * 0.3);
    const cx = ROOM_WIDTH - rightW / 2;
    const by = ROOM_HEIGHT - 72;

    this.castBtn = this.add.rectangle(cx, by, 240, 40, 0x12101c, 0.55).setDepth(220);
    this.castBtn.setStrokeStyle(1, 0x555566, 0.4);
    this.castBtn.setInteractive({ useHandCursor: true });

    this.castBtnText = this.add.text(cx, by, 'Prepare Spell', uiText(14, '#667788', true))
      .setOrigin(0.5).setDepth(221);
    applyTextShadow(this.castBtnText);

    this.castBtn.on('pointerover', () => {
      if (this.currentSpell) this.castBtn.setFillStyle(0x1a3020, 0.72);
    });
    this.castBtn.on('pointerout', () => {
      this.castBtn.setFillStyle(this.currentSpell ? 0x142818 : 0x12101c, 0.55);
    });
    this.castBtn.on('pointerdown', () => {
      this.prepareSpell();
    });

    this.setCastEnabled(false);
  }

  private setCastEnabled(enabled: boolean): void {
    if (enabled) {
      this.castBtn.setFillStyle(0x142818, 0.65)
        .setStrokeStyle(1, 0x55cc66, 0.6);
      this.castBtnText.setColor('#77ee88');
      this.castBtn.setInteractive({ useHandCursor: true });
    } else {
      this.castBtn.setFillStyle(0x12101c, 0.55)
        .setStrokeStyle(1, 0x555566, 0.35);
      this.castBtnText.setColor('#667788');
      this.castBtn.disableInteractive();
    }
  }

  // ── Close Button ────────────────────────────────────────────────────────

  private createCloseButton(): void {
    const rightW = Math.min(RIGHT_PANEL_W, ROOM_WIDTH * 0.3);
    const closeX = ROOM_WIDTH - 28;
    const closeY = 28;

    const closeBtn = this.add.circle(closeX, closeY, 16, 0x221018, 0.65).setDepth(230);
    closeBtn.setStrokeStyle(1, 0xaa6666, 0.55);
    closeBtn.setInteractive({ useHandCursor: true });

    const closeText = this.add.text(closeX, closeY, '✕', uiText(14, '#cc8888', true))
      .setOrigin(0.5).setDepth(231);
    applyTextShadow(closeText);

    closeBtn.on('pointerover', () => closeBtn.setFillStyle(0x331820, 0.8));
    closeBtn.on('pointerout', () => closeBtn.setFillStyle(0x221018, 0.65));
    closeBtn.on('pointerdown', () => {
      this.requestClose();
    });
  }

  // ── Controls Text ───────────────────────────────────────────────────────

  private createControls(): void {
    const controls = this.add.text(
      ROOM_WIDTH / 2, ROOM_HEIGHT - 18,
      'TAB / ESC — Close    ·    1–3 — Switch Slot',
      uiText(12, '#666677'),
    ).setOrigin(0.5).setDepth(210);
    applyTextShadow(controls);
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
    this.preview.destroy();
    this.prefixRow.destroy();
    this.coreRow.destroy();
    this.formRow.destroy();
    this.suffixRow.destroy();

    const gameScene = this.scene.get('GameScene') as { forceCloseGrimoire: () => void };
    gameScene.forceCloseGrimoire();
  }
}
