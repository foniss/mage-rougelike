// src/scenes/GrimoireScene.ts

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellBuilder, Spell } from '../systems/SpellBuilder';
import { SpellValidator } from '../systems/SpellValidator';
import {
  CoreId, FormId, PrefixId, SuffixId,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
} from '../config/spellComponents';
import { ROOM_WIDTH, ROOM_HEIGHT, SPELL_SLOT_COUNT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, GLASS } from '../config/uiStyles';
import { getCoreTheme } from '../visuals/CoreVisualTheme';

// ── Button data for refresh ───────────────────────────────────────────────
interface CompBtn {
  id: string | null;
  bg: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  sub: Phaser.GameObjects.Text;
  dot: Phaser.GameObjects.Arc;
  color: number;
}

export class GrimoireScene extends Phaser.Scene {
  private gs!: GrimoireSystem;
  private slot = 0;

  // Selections
  private sP: PrefixId | null = null;
  private sC: CoreId | null = null;
  private sF: FormId | null = null;
  private sS: SuffixId | null = null;

  private spell: Spell | null = null;

  // Button arrays
  private prefBtns: CompBtn[] = [];
  private coreBtns: CompBtn[] = [];
  private formBtns: CompBtn[] = [];
  private sufBtns: CompBtn[] = [];

  // Preview elements
  private pvName!: Phaser.GameObjects.Text;
  private pvParts!: Phaser.GameObjects.Text;
  private pvStats!: Phaser.GameObjects.Text;
  private pvError!: Phaser.GameObjects.Text;
  private pvDot!: Phaser.GameObjects.Arc;
  private pvGlow!: Phaser.GameObjects.Arc;
  private particleTimer: Phaser.Time.TimerEvent | null = null;

  // Prepare button
  private prepBtn!: Phaser.GameObjects.Rectangle;
  private prepTxt!: Phaser.GameObjects.Text;

  // Slot buttons
  private slotBorders: Phaser.GameObjects.Rectangle[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];

  constructor() { super({ key: 'GrimoireScene' }); }

  init(data: { grimoireSystem: GrimoireSystem }): void {
    this.gs = data.grimoireSystem;
    this.slot = this.gs.activeSlotIndex;
    const ex = this.gs.slots[this.slot]?.spell;
    if (ex) {
      this.sC = ex.core.id; this.sF = ex.form.id;
      this.sP = ex.prefix?.id as PrefixId ?? null;
      this.sS = ex.suffix?.id as SuffixId ?? null;
    } else {
      this.sP = null; this.sC = null; this.sF = null; this.sS = null;
    }
  }

  create(): void {
    this.prefBtns = []; this.coreBtns = [];
    this.formBtns = []; this.sufBtns = [];
    this.slotBorders = []; this.slotLabels = [];
    this.spell = null;

    const W = ROOM_WIDTH;
    const H = ROOM_HEIGHT;
    const cx = W / 2;

    // ── Overlay — semi-transparent so you can see combat ──────────────────
    const overlay = this.add.rectangle(cx, H / 2, W, H, 0x020204, 0.25).setDepth(200);
    overlay.setInteractive();

    // ── Main panel — centered, doesn't fill the whole screen ──────────────
    const panelW = Math.min(920, W - 40);
    const panelH = Math.min(640, H - 40);
    const panelY = H / 2;

    // Shadow
    this.add.rectangle(cx + 2, panelY + 2, panelW, panelH, 0x000000, 0.3)
      .setDepth(201);

    // Panel body
    createGlassPanel(this, cx, panelY, panelW, panelH, 202, 0.92);

    // Inner highlight line
    this.add.rectangle(cx, panelY, panelW - 12, panelH - 12, 0, 0)
      .setDepth(203).setStrokeStyle(0.5, 0x6a5a8a, 0.15);

    // ── Title ─────────────────────────────────────────────────────────────
    const titleY = panelY - panelH / 2 + 32;
    const title = this.add.text(cx, titleY, 'GRIMOIRE', uiText(22, '#d8ccf0', true))
      .setOrigin(0.5).setDepth(210);
    applyTextShadow(title);

    const subtitle = this.add.text(cx, titleY + 26, 'Construct your spell', uiText(12, '#8888aa'))
      .setOrigin(0.5).setDepth(210);
    applyTextShadow(subtitle);

    this.add.rectangle(cx, titleY + 44, panelW - 60, 1, GLASS.accentLine, 0.2).setDepth(210);

    // ── Close button ──────────────────────────────────────────────────────
    const clX = cx + panelW / 2 - 28;
    const clY = panelY - panelH / 2 + 28;
    const clBtn = this.add.circle(clX, clY, 14, 0x220e18, 0.7).setDepth(230);
    clBtn.setStrokeStyle(1, 0x885566, 0.5).setInteractive({ useHandCursor: true });
    const clTxt = this.add.text(clX, clY, '✕', uiText(13, '#cc8888', true))
      .setOrigin(0.5).setDepth(231);
    applyTextShadow(clTxt);
    clBtn.on('pointerover', () => clBtn.setFillStyle(0x331820, 0.9));
    clBtn.on('pointerout', () => clBtn.setFillStyle(0x220e18, 0.7));
    clBtn.on('pointerdown', () => this.doClose());

    // ── Layout positions ──────────────────────────────────────────────────
    const contentLeft = cx - panelW / 2 + 28;
    const contentRight = cx + panelW / 2 - 28;
    const contentW = contentRight - contentLeft;
    const rowAreaW = contentW * 0.58;
    const previewAreaW = contentW * 0.38;
    const rowLeft = contentLeft;
    const previewLeft = contentRight - previewAreaW;
    const rowTop = titleY + 60;

    // Vertical divider
    this.add.rectangle(previewLeft - 14, panelY, 1, panelH - 120, GLASS.accentLine, 0.12).setDepth(210);

    // ── Component Rows (left side) ────────────────────────────────────────
    const rowGap = 10;
    const rowH = (panelH - 180) / 4 - rowGap;

    this.buildComponentRow(rowLeft, rowTop, rowAreaW, rowH,
      '1. PREFIX', '#7aba7a', false, this.getPrefixItems(),
      (id) => { this.sP = id as PrefixId | null; this.refresh(); },
      this.prefBtns, this.sP,
    );

    this.buildComponentRow(rowLeft, rowTop + (rowH + rowGap), rowAreaW, rowH,
      '2. CORE', '#e8a050', true, this.getCoreItems(),
      (id) => { this.sC = id as CoreId | null; this.refresh(); },
      this.coreBtns, this.sC,
    );

    this.buildComponentRow(rowLeft, rowTop + (rowH + rowGap) * 2, rowAreaW, rowH,
      '3. FORM', '#8080cc', true, this.getFormItems(),
      (id) => { this.sF = id as FormId | null; this.refresh(); },
      this.formBtns, this.sF,
    );

    this.buildComponentRow(rowLeft, rowTop + (rowH + rowGap) * 3, rowAreaW, rowH,
      '4. SUFFIX', '#c8a858', false, this.getSuffixItems(),
      (id) => { this.sS = id as SuffixId | null; this.refresh(); },
      this.sufBtns, this.sS,
    );

    // ── Preview Panel (right side) ────────────────────────────────────────
    this.buildPreview(previewLeft, rowTop, previewAreaW, panelH - 180);

    // ── Bottom bar: slots + prepare + controls ────────────────────────────
    const bottomY = panelY + panelH / 2 - 32;
    this.add.rectangle(cx, bottomY - 16, panelW - 60, 1, GLASS.accentLine, 0.15).setDepth(210);

    this.buildSlotBar(cx - 180, bottomY);
    this.buildPrepareButton(cx + 140, bottomY);

    const ctrl = this.add.text(cx + panelW / 2 - 30, bottomY, 'TAB / ESC\nto close', uiText(9, '#55556688'))
      .setOrigin(1, 0.5).setDepth(210);
    applyTextShadow(ctrl);

    // ── Initial state ─────────────────────────────────────────────────────
    this.refresh();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPONENT ROW BUILDER
  // ═══════════════════════════════════════════════════════════════════════

  private buildComponentRow(
    x: number, y: number, w: number, h: number,
    label: string, labelColor: string, required: boolean,
    items: { id: string | null; name: string; mana: number; color: number; desc: string }[],
    onSelect: (id: string | null) => void,
    btnArray: CompBtn[],
    currentId: string | null,
  ): void {
    // Row background
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x08060e, 0.35).setDepth(205);

    // Label
    const reqStar = required ? '  ✦' : '';
    const lbl = this.add.text(x + 8, y + 4, label + reqStar, uiText(11, labelColor, true)).setDepth(210);
    applyTextShadow(lbl);

    // Buttons
    const btnGap = 6;
    const btnCount = items.length;
    const btnAreaW = w - 16;
    const btnW = Math.floor((btnAreaW - (btnCount - 1) * btnGap) / btnCount);
    const btnH = h - 28;
    const btnY = y + 24;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const bx = x + 8 + i * (btnW + btnGap) + btnW / 2;
      const by = btnY + btnH / 2;
      const hex = '#' + item.color.toString(16).padStart(6, '0');

      const bg = this.add.rectangle(bx, by, btnW, btnH, 0x0e0c18, 0.6).setDepth(215);
      const border = this.add.rectangle(bx, by, btnW, btnH, 0, 0).setDepth(216);
      border.setStrokeStyle(1, item.color, 0.2);
      bg.setInteractive({ useHandCursor: true });

      // Color indicator dot
      const dot = this.add.circle(bx, by - btnH / 2 + 12, 5,
        item.id ? item.color : 0x444455, item.id ? 0.6 : 0.2,
      ).setDepth(217);

      // Name
      const nameT = this.add.text(bx, by + 2, item.name, uiText(11, item.id ? hex : '#888899', true))
        .setOrigin(0.5).setDepth(217);
      applyTextShadow(nameT);

      // Mana cost subtitle
      const subStr = item.id ? `+${item.mana} MP` : '';
      const subT = this.add.text(bx, by + 18, subStr, uiText(9, '#6699aa'))
        .setOrigin(0.5).setDepth(217);
      applyTextShadow(subT);

      // Hover
      bg.on('pointerover', () => {
        bg.setFillStyle(0x1a1630, 0.8);
        // Show description tooltip
      });
      bg.on('pointerout', () => {
        const sel = this.isBtnSelected(btnArray, item.id);
        bg.setFillStyle(sel ? 0x1a1830 : 0x0e0c18, sel ? 0.8 : 0.6);
      });
      bg.on('pointerdown', () => {
        onSelect(item.id);
      });

      btnArray.push({ id: item.id, bg, border, label: nameT, sub: subT, dot, color: item.color });
    }
  }

  private isBtnSelected(arr: CompBtn[], id: string | null): boolean {
    if (arr === this.prefBtns) return this.sP === id;
    if (arr === this.coreBtns) return this.sC === id;
    if (arr === this.formBtns) return this.sF === id;
    if (arr === this.sufBtns) return this.sS === id;
    return false;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ITEM BUILDERS
  // ═══════════════════════════════════════════════════════════════════════

  private getPrefixItems() {
    const items: { id: string | null; name: string; mana: number; color: number; desc: string }[] = [
      { id: null, name: 'None', mana: 0, color: 0x666677, desc: 'No prefix' },
    ];
    for (const id of getAllPrefixIds()) {
      const p = PREFIX_REGISTRY[id];
      items.push({ id, name: p.displayName, mana: p.manaCost, color: 0x88cc88, desc: p.description });
    }
    return items;
  }

  private getCoreItems() {
    const items: { id: string | null; name: string; mana: number; color: number; desc: string }[] = [];
    for (const id of getAllCoreIds()) {
      const c = CORE_REGISTRY[id];
      items.push({ id, name: c.displayName, mana: c.manaCost, color: c.visual.color, desc: c.description });
    }
    return items;
  }

  private getFormItems() {
    const items: { id: string | null; name: string; mana: number; color: number; desc: string }[] = [];
    for (const id of getAllFormIds()) {
      const f = FORM_REGISTRY[id];
      items.push({ id, name: f.displayName, mana: f.manaCost, color: 0x8888dd, desc: f.description });
    }
    return items;
  }

  private getSuffixItems() {
    const items: { id: string | null; name: string; mana: number; color: number; desc: string }[] = [
      { id: null, name: 'None', mana: 0, color: 0x666677, desc: 'No suffix' },
    ];
    for (const id of getAllSuffixIds()) {
      const s = SUFFIX_REGISTRY[id];
      items.push({ id, name: s.displayName, mana: s.manaCost, color: 0xccaa66, desc: s.description });
    }
    return items;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PREVIEW PANEL
  // ═══════════════════════════════════════════════════════════════════════

  private buildPreview(x: number, y: number, w: number, h: number): void {
    // Preview background
    this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x06050c, 0.5).setDepth(205);

    const cx = x + w / 2;
    const titleY = y + 8;

    const pvTitle = this.add.text(cx, titleY, 'SPELL PREVIEW', uiText(10, '#667788', true))
      .setOrigin(0.5).setDepth(210);
    applyTextShadow(pvTitle);

    // Visual orb
    this.pvGlow = this.add.circle(cx, y + 60, 28, 0x333355, 0.08).setDepth(210);
    this.pvDot = this.add.circle(cx, y + 60, 14, 0x444466, 0.3).setDepth(211);

    // Spell name
    this.pvName = this.add.text(cx, y + 94, '—', uiText(16, '#8899aa', true))
      .setOrigin(0.5).setDepth(210).setWordWrapWidth(w - 20);
    applyTextShadow(this.pvName);

    // Component breakdown
    this.pvParts = this.add.text(x + 14, y + 120, '', {
      ...uiText(11, '#7788aa'),
      lineSpacing: 6,
    }).setDepth(210);
    applyTextShadow(this.pvParts);

    // Stats
    this.pvStats = this.add.text(x + 14, y + 210, '', {
      ...uiText(12, '#99aacc'),
      lineSpacing: 5,
    }).setDepth(210);
    applyTextShadow(this.pvStats);

    // Error
    this.pvError = this.add.text(cx, y + 160, '', {
      ...uiText(12, '#ee6666', true),
      wordWrap: { width: w - 24 },
      align: 'center',
    }).setOrigin(0.5, 0).setDepth(210).setAlpha(0);
    applyTextShadow(this.pvError);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SLOT BAR
  // ═══════════════════════════════════════════════════════════════════════

  private buildSlotBar(x: number, y: number): void {
    const slotLbl = this.add.text(x, y - 12, 'SAVE TO SLOT', uiText(9, '#667788', true))
      .setDepth(210);
    applyTextShadow(slotLbl);

    const sw = 70, gap = 6;
    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      const bx = x + i * (sw + gap) + sw / 2;

      const bg = this.add.rectangle(bx, y + 8, sw, 24, 0x0e0c18, 0.5).setDepth(215);
      bg.setInteractive({ useHandCursor: true });

      const border = this.add.rectangle(bx, y + 8, sw, 24, 0, 0).setDepth(216);
      border.setStrokeStyle(1, 0x444466, 0.4);

      const existing = this.gs.slots[i]?.spell;
      const slotLabel = existing ? existing.name.substring(0, 8) : `Slot ${i + 1}`;
      const slotColor = i === this.slot ? '#ccddee' : '#778899';

      const txt = this.add.text(bx, y + 8, slotLabel, uiText(10, slotColor))
        .setOrigin(0.5).setDepth(217);
      applyTextShadow(txt);

      bg.on('pointerover', () => bg.setFillStyle(0x181630, 0.7));
      bg.on('pointerout', () => bg.setFillStyle(0x0e0c18, 0.5));
      bg.on('pointerdown', () => {
        this.slot = i;
        // Load this slot's spell into editor
        const sl = this.gs.slots[i]?.spell;
        if (sl) {
          this.sC = sl.core.id; this.sF = sl.form.id;
          this.sP = sl.prefix?.id as PrefixId ?? null;
          this.sS = sl.suffix?.id as SuffixId ?? null;
        } else {
          this.sP = null; this.sC = null; this.sF = null; this.sS = null;
        }
        this.refresh();
      });

      this.slotBorders.push(border);
      this.slotLabels.push(txt);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PREPARE BUTTON
  // ═══════════════════════════════════════════════════════════════════════

  private buildPrepareButton(x: number, y: number): void {
    this.prepBtn = this.add.rectangle(x, y, 180, 36, 0x0e0c18, 0.5).setDepth(215);
    this.prepBtn.setStrokeStyle(1, 0x446644, 0.3);
    this.prepBtn.setInteractive({ useHandCursor: true });

    this.prepTxt = this.add.text(x, y, '✦  PREPARE SPELL', uiText(12, '#668866', true))
      .setOrigin(0.5).setDepth(216);
    applyTextShadow(this.prepTxt);

    this.prepBtn.on('pointerover', () => {
      if (this.spell) this.prepBtn.setFillStyle(0x142a18, 0.75);
    });
    this.prepBtn.on('pointerout', () => {
      this.prepBtn.setFillStyle(this.spell ? 0x102210 : 0x0e0c18, this.spell ? 0.6 : 0.5);
    });
    this.prepBtn.on('pointerdown', () => {
      if (this.spell) this.doPrepare();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REFRESH — updates everything after any selection change
  // ═══════════════════════════════════════════════════════════════════════

  private refresh(): void {
    this.refreshButtons(this.prefBtns, this.sP);
    this.refreshButtons(this.coreBtns, this.sC);
    this.refreshButtons(this.formBtns, this.sF);
    this.refreshButtons(this.sufBtns, this.sS);
    this.refreshCompatibility();
    this.refreshPreview();
    this.refreshPrepare();
    this.refreshSlots();
  }

  private refreshButtons(btns: CompBtn[], selectedId: string | null): void {
    for (const b of btns) {
      const sel = b.id === selectedId;
      const hex = '#' + b.color.toString(16).padStart(6, '0');

      b.bg.setFillStyle(sel ? 0x1a1830 : 0x0e0c18, sel ? 0.8 : 0.6);
      b.border.setStrokeStyle(
        sel ? 2 : 1,
        sel ? 0xffffff : b.color,
        sel ? 0.7 : 0.2,
      );
      b.dot.setFillStyle(b.id ? b.color : 0x444455, sel ? 0.9 : 0.5);
      if (sel && b.id) {
        b.dot.setStrokeStyle(1.5, 0xffffff, 0.6);
      } else {
        b.dot.setStrokeStyle(0);
      }
    }
  }

  private refreshCompatibility(): void {
    // Prefixes
    for (const b of this.prefBtns) {
      if (b.id === null) { b.label.setAlpha(1); continue; }
      let ok = true;
      if (this.sC && this.sF) {
        const r = SpellValidator.validate(this.sC, this.sF, b.id as PrefixId, this.sS);
        ok = !r.errors.some(e => e.field === 'prefix' || e.field === 'combination');
      }
      b.label.setAlpha(ok ? 1 : 0.25);
      b.sub.setAlpha(ok ? 1 : 0.25);
      b.dot.setAlpha(ok ? (b.id === this.sP ? 0.9 : 0.5) : 0.1);
      if (!ok && this.sP === b.id) { this.sP = null; }
      if (ok) { b.bg.setInteractive({ useHandCursor: true }); }
      else { b.bg.disableInteractive(); }
    }

    // Suffixes
    for (const b of this.sufBtns) {
      if (b.id === null) { b.label.setAlpha(1); continue; }
      let ok = true;
      if (this.sC && this.sF) {
        const r = SpellValidator.validate(this.sC, this.sF, this.sP, b.id as SuffixId);
        ok = !r.errors.some(e => e.field === 'suffix' || e.field === 'combination');
      }
      b.label.setAlpha(ok ? 1 : 0.25);
      b.sub.setAlpha(ok ? 1 : 0.25);
      b.dot.setAlpha(ok ? (b.id === this.sS ? 0.9 : 0.5) : 0.1);
      if (!ok && this.sS === b.id) { this.sS = null; }
      if (ok) { b.bg.setInteractive({ useHandCursor: true }); }
      else { b.bg.disableInteractive(); }
    }
  }

  private refreshPreview(): void {
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }

    if (!this.sC || !this.sF) {
      this.spell = null;
      this.pvName.setText('Select Core + Form').setColor('#8899aa');
      this.pvParts.setText('');
      this.pvStats.setText('');
      this.pvError.setAlpha(0);
      this.pvDot.setFillStyle(0x444466, 0.3);
      this.pvGlow.setFillStyle(0x333355, 0.08);
      return;
    }

    const result = SpellBuilder.build(this.sC, this.sF, this.sP, this.sS);

    if (result.success && result.spell) {
      const s = result.spell;
      this.spell = s;
      const hex = '#' + s.visual.color.toString(16).padStart(6, '0');

      this.pvName.setText(s.name).setColor(hex);
      this.pvDot.setFillStyle(s.visual.color, 0.6);
      this.pvGlow.setFillStyle(s.visual.color, 0.15);

      this.pvParts.setText(
        (s.prefix ? `▸ ${s.prefix.displayName}\n` : '') +
        `▸ ${s.core.displayName}\n` +
        `▸ ${s.form.displayName}` +
        (s.suffix ? `\n▸ ${s.suffix.displayName}` : ''),
      );

      const cd = (s.cooldown / 1000).toFixed(2);
      const eff = s.statusEffect.type !== 'none' ? s.statusEffect.type.toUpperCase() : '—';
      this.pvStats.setText(
        `Mana      ${s.manaCost}\n` +
        `Cooldown  ${cd}s\n` +
        `Damage    ${s.damage}\n` +
        `Targeting ${s.targetingType}\n` +
        `Effect    ${eff}`,
      );

      this.pvError.setAlpha(0);

      // Core-themed particles around preview orb
      const theme = getCoreTheme(s.core.id);
      this.particleTimer = this.time.addEvent({
        delay: 250, loop: true,
        callback: () => {
          if (!this.pvDot.active) return;
          const m = this.pvDot.getWorldTransformMatrix();
          theme.spawnAmbientParticle(this, m.tx, m.ty, s.visual);
        },
      });
    } else {
      this.spell = null;
      this.pvName.setText('Invalid Combination').setColor('#ee6666');
      this.pvParts.setText('');
      this.pvStats.setText('');
      this.pvError.setText(result.error + (result.suggestion ? '\n' + result.suggestion : '')).setAlpha(1);
      this.pvDot.setFillStyle(0x442222, 0.25);
      this.pvGlow.setFillStyle(0x331111, 0.06);
    }
  }

  private refreshPrepare(): void {
    if (this.spell) {
      this.prepBtn.setFillStyle(0x102210, 0.6).setStrokeStyle(1, 0x55cc66, 0.5);
      this.prepTxt.setColor('#88ee88');
    } else {
      this.prepBtn.setFillStyle(0x0e0c18, 0.5).setStrokeStyle(1, 0x446644, 0.25);
      this.prepTxt.setColor('#668866');
    }
  }

  private refreshSlots(): void {
    for (let i = 0; i < this.slotBorders.length; i++) {
      const active = i === this.slot;
      this.slotBorders[i].setStrokeStyle(
        active ? 1.5 : 1,
        active ? 0xaabbdd : 0x444466,
        active ? 0.7 : 0.3,
      );
      this.slotLabels[i].setColor(active ? '#ccddee' : '#778899');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════════════════════════════════════

  private doPrepare(): void {
    if (!this.sC || !this.sF || !this.spell) return;
    this.gs.assignToSlot(this.slot, this.sC, this.sF, this.sP, this.sS);
    this.gs.setActiveSlot(this.slot);
    this.scene.get('GameScene').events.emit('spell-slots-updated');
    this.doClose();
  }

  doClose(): void {
    if (this.particleTimer) this.particleTimer.destroy();
    const gameScene = this.scene.get('GameScene') as { forceCloseGrimoire: () => void };
    if (gameScene?.forceCloseGrimoire) gameScene.forceCloseGrimoire();
  }
}