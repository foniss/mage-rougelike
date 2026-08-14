// src/ui/DevSpellPanel.ts
//
// Developer spell assembly panel with dropdowns, stats display,
// and cast button. Sits on the left side of the test scene.

import Phaser from 'phaser';
import { Spell, SpellBuilder } from '../systems/SpellBuilder';
import { SpellValidator } from '../systems/SpellValidator';
import {
  CoreId, FormId, PrefixId, SuffixId,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
} from '../config/spellComponents';

interface DropdownOption {
  id: string | null;
  label: string;
  color: number;
}

export class DevSpellPanel {
  private scene: Phaser.Scene;
  private x: number;
  private y: number;
  private container: Phaser.GameObjects.Container;

  private selectedPrefix: PrefixId | null = null;
  private selectedCore: CoreId | null = null;
  private selectedForm: FormId | null = null;
  private selectedSuffix: SuffixId | null = null;

  private currentSpell: Spell | null = null;
  private onSpellChanged: (spell: Spell | null) => void;
  private onCastRequested: (spell: Spell) => void;

  // UI elements
  private spellNameText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private effectsText!: Phaser.GameObjects.Text;
  private compatText!: Phaser.GameObjects.Text;
  private castBtn!: Phaser.GameObjects.Rectangle;
  private castBtnText!: Phaser.GameObjects.Text;

  // Dropdown state
  private activeDropdown: string | null = null;
  private dropdownContainer: Phaser.GameObjects.Container | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    onSpellChanged: (spell: Spell | null) => void,
    onCastRequested: (spell: Spell) => void,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.onSpellChanged = onSpellChanged;
    this.onCastRequested = onCastRequested;
    this.container = scene.add.container(x, y).setDepth(100);
    this.create();
  }

  private create(): void {
    // Panel background
    const panelW = 280;
    const panelH = 620;
    const bg = this.scene.add.rectangle(0, panelH / 2, panelW, panelH, 0x0c0a18, 0.95);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x3a2f5a, 0.6);
    this.container.add(bg);

    // Title
    this.addText(panelW / 2, 12, '⚙ SPELL TESTER', 14, '#ccbbee', true).setOrigin(0.5, 0);
    this.addLine(10, 32, panelW - 20);

    // Dropdowns
    let dy = 42;
    this.createSelector('PREFIX', dy, 'prefix', this.buildPrefixOptions());
    dy += 50;
    this.createSelector('CORE *', dy, 'core', this.buildCoreOptions());
    dy += 50;
    this.createSelector('FORM *', dy, 'form', this.buildFormOptions());
    dy += 50;
    this.createSelector('SUFFIX', dy, 'suffix', this.buildSuffixOptions());

    dy += 20;
    this.addLine(10, dy, panelW - 20);
    dy += 10;

    // Spell name
    this.spellNameText = this.addText(panelW / 2, dy, '— Select Core + Form —', 13, '#777788', true);
    this.spellNameText.setOrigin(0.5, 0).setWordWrapWidth(panelW - 20);
    dy += 24;

    // Compatibility status
    this.compatText = this.addText(10, dy, '', 9, '#ff5555');
    this.compatText.setWordWrapWidth(panelW - 20);
    dy += 20;

    this.addLine(10, dy, panelW - 20);
    dy += 10;

    // Stats
    this.addText(10, dy, 'STATS', 10, '#888899', true);
    dy += 16;
    this.statsText = this.addText(10, dy, 'Mana Cost: —\nCooldown: —\nDamage: —\nTargeting: —\nAoE/Range: —', 10, '#999aab');
    this.statsText.setLineSpacing(4);
    dy += 80;

    this.addLine(10, dy, panelW - 20);
    dy += 10;

    // Effects
    this.addText(10, dy, 'EFFECTS', 10, '#888899', true);
    dy += 16;
    this.effectsText = this.addText(10, dy, '—', 9, '#999aab');
    this.effectsText.setLineSpacing(3).setWordWrapWidth(panelW - 20);
    dy += 90;

    this.addLine(10, dy, panelW - 20);
    dy += 14;

    // Cast button
    this.castBtn = this.scene.add.rectangle(panelW / 2, dy + 14, panelW - 30, 32, 0x222233, 0.8);
    this.castBtn.setStrokeStyle(1, 0x555566, 0.5);
    this.castBtn.setInteractive({ useHandCursor: true });
    this.container.add(this.castBtn);

    this.castBtnText = this.addText(panelW / 2, dy + 14, 'CAST TEST SPELL', 11, '#555566', true);
    this.castBtnText.setOrigin(0.5);

    this.castBtn.on('pointerover', () => {
      if (this.currentSpell) this.castBtn.setFillStyle(0x334433, 0.9);
    });
    this.castBtn.on('pointerout', () => {
      this.castBtn.setFillStyle(this.currentSpell ? 0x223322 : 0x222233, 0.8);
    });
    this.castBtn.on('pointerdown', () => {
      if (this.currentSpell) {
        this.onCastRequested(this.currentSpell);
        // Flash
        this.castBtn.setFillStyle(0x446644, 1);
        this.scene.time.delayedCall(100, () => {
          this.castBtn.setFillStyle(0x223322, 0.8);
        });
      }
    });

    dy += 40;

    // Rapid cast hint
    this.addText(panelW / 2, dy + 8, 'Left Click = Cast at cursor\nQ = Quick cast at cursor\nHold Q = Rapid fire', 8, '#555566').setOrigin(0.5, 0);

    this.setCastEnabled(false);
  }

  // ── Dropdown Selectors ──────────────────────────────────────────────────

  private createSelector(
    label: string, y: number, slotKey: string,
    options: DropdownOption[],
  ): void {
    this.addText(10, y, label, 9, '#777788', true);

    const btnW = 250;
    const btnH = 24;
    const btnX = 15;
    const btnY = y + 14;

    const btn = this.scene.add.rectangle(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH, 0x161428, 0.9);
    btn.setStrokeStyle(1, 0x3a2f5a, 0.5);
    btn.setInteractive({ useHandCursor: true });
    this.container.add(btn);

    const selectedText = this.addText(btnX + 8, btnY + btnH / 2, '[ None ]', 10, '#666677');
    selectedText.setOrigin(0, 0.5);

    const arrow = this.addText(btnX + btnW - 12, btnY + btnH / 2, '▼', 8, '#555566');
    arrow.setOrigin(0.5);

    btn.on('pointerdown', () => {
      if (this.activeDropdown === slotKey) {
        this.closeDropdown();
      } else {
        this.openDropdown(slotKey, btnX, btnY + btnH, btnW, options, selectedText);
      }
    });
    btn.on('pointerover', () => btn.setFillStyle(0x1e1a30, 1));
    btn.on('pointerout', () => btn.setFillStyle(0x161428, 0.9));

    // Store reference for updating display
    btn.setData('selectedText', selectedText);
    btn.setData('slotKey', slotKey);
  }

  private openDropdown(
    slotKey: string, x: number, y: number, width: number,
    options: DropdownOption[],
    selectedText: Phaser.GameObjects.Text,
  ): void {
    this.closeDropdown();
    this.activeDropdown = slotKey;

    this.dropdownContainer = this.scene.add.container(this.x + x, this.y + y).setDepth(200);

    const itemH = 22;
    const totalH = options.length * itemH;

    // Background
    const ddBg = this.scene.add.rectangle(width / 2, totalH / 2, width, totalH, 0x14112a, 0.97);
    ddBg.setStrokeStyle(1, 0x4a3f6b, 0.6);
    this.dropdownContainer.add(ddBg);

    options.forEach((opt, i) => {
      const iy = i * itemH + itemH / 2;
      const itemBg = this.scene.add.rectangle(width / 2, iy, width - 2, itemH - 1, 0x14112a, 0.01);
      itemBg.setInteractive({ useHandCursor: true });
      this.dropdownContainer!.add(itemBg);

      const hex = '#' + opt.color.toString(16).padStart(6, '0');
      const label = opt.id ? `● ${opt.label}` : opt.label;
      const txt = this.scene.add.text(10, iy, label, {
        fontFamily: '"Courier New", monospace', fontSize: '10px',
        color: opt.id ? hex : '#666677',
      }).setOrigin(0, 0.5);
      this.dropdownContainer!.add(txt);

      itemBg.on('pointerover', () => itemBg.setFillStyle(0x222244, 0.8));
      itemBg.on('pointerout', () => itemBg.setFillStyle(0x14112a, 0.01));
      itemBg.on('pointerdown', () => {
        this.selectOption(slotKey, opt, selectedText);
        this.closeDropdown();
      });
    });
  }

  private closeDropdown(): void {
    if (this.dropdownContainer) {
      this.dropdownContainer.destroy();
      this.dropdownContainer = null;
    }
    this.activeDropdown = null;
  }

  private selectOption(
    slotKey: string, opt: DropdownOption,
    selectedText: Phaser.GameObjects.Text,
  ): void {
    const hex = opt.id ? '#' + opt.color.toString(16).padStart(6, '0') : '#666677';
    selectedText.setText(opt.id ? opt.label : '[ None ]').setColor(hex);

    switch (slotKey) {
      case 'prefix': this.selectedPrefix = opt.id as PrefixId | null; break;
      case 'core': this.selectedCore = opt.id as CoreId | null; break;
      case 'form': this.selectedForm = opt.id as FormId | null; break;
      case 'suffix': this.selectedSuffix = opt.id as SuffixId | null; break;
    }

    this.rebuildSpell();
  }

  // ── Spell Building ──────────────────────────────────────────────────────

  private rebuildSpell(): void {
    if (!this.selectedCore || !this.selectedForm) {
      this.currentSpell = null;
      this.spellNameText.setText('— Select Core + Form —').setColor('#777788');
      this.statsText.setText('Mana Cost: —\nCooldown: —\nDamage: —\nTargeting: —\nAoE/Range: —');
      this.effectsText.setText('—');
      this.compatText.setText('').setAlpha(0);
      this.setCastEnabled(false);
      this.onSpellChanged(null);
      return;
    }

    const result = SpellBuilder.build(
      this.selectedCore, this.selectedForm,
      this.selectedPrefix, this.selectedSuffix,
    );

    if (result.success && result.spell) {
      this.currentSpell = result.spell;
      const s = result.spell;
      const hex = '#' + s.visual.color.toString(16).padStart(6, '0');
      this.spellNameText.setText(s.name).setColor(hex);

      // Stats
      const cdSec = (s.cooldown / 1000).toFixed(2);
      let rangeStr = '—';
      if (s.form.formVisual) {
        const fv = s.form.formVisual as any;
        if (fv.range) rangeStr = `${fv.range}px`;
        if (fv.radius) rangeStr = `${fv.radius}px radius`;
        if (fv.explosionRadius) rangeStr += ` (exp: ${fv.explosionRadius}px)`;
      }

      this.statsText.setText(
        `Mana Cost: ${s.manaCost}\n` +
        `Cooldown:  ${cdSec}s\n` +
        `Damage:    ${s.damage}\n` +
        `Targeting: ${s.targetingType}\n` +
        `Range:     ${rangeStr}`
      );

      // Effects
      const effects: string[] = [];
      if (s.statusEffect.type !== 'none') {
        const se = s.statusEffect as any;
        let effectStr = `• ${s.statusEffect.type.toUpperCase()}`;
        if (se.duration) effectStr += ` (${se.duration}s)`;
        if (se.damagePerSecond) effectStr += ` ${se.damagePerSecond}/s`;
        if (se.slowPerStack) effectStr += ` ${se.slowPerStack * 100}%/stack`;
        if (se.pullRadius) effectStr += ` r:${se.pullRadius}`;
        if (se.arcRange) effectStr += ` arc:${se.arcRange}`;
        effects.push(effectStr);
      }
      if (s.prefix) {
        let prefStr = `• ${s.prefix.displayName}`;
        const pb = s.prefix.behavior as any;
        if (pb.sizeMultiplier) prefStr += ` (×${pb.sizeMultiplier} size)`;
        if (pb.turnRate) prefStr += ` (turn: ${pb.turnRate})`;
        if (pb.splitCount) prefStr += ` (→${pb.splitCount})`;
        if (pb.maxPierceTargets) prefStr += ` (pierce: ${pb.maxPierceTargets})`;
        effects.push(prefStr);
      }
      if (s.suffix) {
        let sufStr = `• ${s.suffix.displayName}`;
        const sb = s.suffix.behavior as any;
        if (sb.manaRestoreOnKill) sufStr += ` (+${sb.manaRestoreOnKill} MP)`;
        if (sb.bindDuration) sufStr += ` (${sb.bindDuration}s)`;
        if (sb.maxAdditionalTargets) sufStr += ` (×${sb.maxAdditionalTargets})`;
        if (sb.explosionRadius) sufStr += ` (r:${sb.explosionRadius})`;
        if (sb.echoDamageMultiplier) sufStr += ` (×${sb.echoDamageMultiplier})`;
        effects.push(sufStr);
      }
      this.effectsText.setText(effects.length > 0 ? effects.join('\n') : '— None —');

      this.compatText.setText('✓ Valid combination').setColor('#55aa55').setAlpha(0.7);
      this.setCastEnabled(true);
      this.onSpellChanged(s);
    } else {
      this.currentSpell = null;
      this.spellNameText.setText('INVALID').setColor('#ff5555');
      this.statsText.setText('Mana Cost: —\nCooldown: —\nDamage: —\nTargeting: —\nAoE/Range: —');
      this.effectsText.setText('—');
      this.compatText.setText(`✕ ${result.error}${result.suggestion ? '\n  ' + result.suggestion : ''}`).setColor('#ff5555').setAlpha(1);
      this.setCastEnabled(false);
      this.onSpellChanged(null);
    }
  }

  private setCastEnabled(enabled: boolean): void {
    if (enabled) {
      this.castBtn.setFillStyle(0x223322, 0.8).setStrokeStyle(1, 0x44aa44, 0.5);
      this.castBtnText.setColor('#66aa66');
      this.castBtn.setInteractive({ useHandCursor: true });
    } else {
      this.castBtn.setFillStyle(0x222233, 0.8).setStrokeStyle(1, 0x555566, 0.3);
      this.castBtnText.setColor('#555566');
      this.castBtn.disableInteractive();
    }
  }

  // ── Option Builders ─────────────────────────────────────────────────────

  private buildPrefixOptions(): DropdownOption[] {
    const opts: DropdownOption[] = [{ id: null, label: '[ None ]', color: 0x666677 }];
    for (const id of getAllPrefixIds()) {
      const p = PREFIX_REGISTRY[id];
      opts.push({ id, label: p.displayName, color: 0x88cc88 });
    }
    return opts;
  }

  private buildCoreOptions(): DropdownOption[] {
    const opts: DropdownOption[] = [{ id: null, label: '[ None ]', color: 0x666677 }];
    for (const id of getAllCoreIds()) {
      const c = CORE_REGISTRY[id];
      opts.push({ id, label: c.displayName, color: c.visual.color });
    }
    return opts;
  }

  private buildFormOptions(): DropdownOption[] {
    const opts: DropdownOption[] = [{ id: null, label: '[ None ]', color: 0x666677 }];
    for (const id of getAllFormIds()) {
      const f = FORM_REGISTRY[id];
      opts.push({ id, label: f.displayName, color: 0x8888ff });
    }
    return opts;
  }

  private buildSuffixOptions(): DropdownOption[] {
    const opts: DropdownOption[] = [{ id: null, label: '[ None ]', color: 0x666677 }];
    for (const id of getAllSuffixIds()) {
      const s = SUFFIX_REGISTRY[id];
      opts.push({ id, label: s.displayName, color: 0xccaa66 });
    }
    return opts;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private addText(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, {
      fontFamily: '"Courier New", monospace',
      fontSize: size + 'px',
      color,
      fontStyle: bold ? 'bold' : 'normal',
    });
    this.container.add(t);
    return t;
  }

  private addLine(x: number, y: number, width: number): void {
    const line = this.scene.add.rectangle(x + width / 2, y, width, 1, 0x3a2f5a, 0.3);
    this.container.add(line);
  }

  getCurrentSpell(): Spell | null {
    return this.currentSpell;
  }

  destroy(): void {
    this.closeDropdown();
    this.container.destroy();
  }
}