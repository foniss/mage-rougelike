import Phaser from 'phaser';
import { Spell, SpellBuilder } from '../systems/SpellBuilder';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { CoreId, FormId, PrefixId, SuffixId, CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY, getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds } from '../config/spellComponents';
import { getSpellTier, SpellTier } from '../visuals/CombatFX';
import { uiText, applyTextShadow, OC, GLASS } from '../config/uiStyles';

interface DropRow { label: string; items: { id: string | null; name: string; color: number }[]; selected: string | null; onChange: (id: string | null) => void; }

export class DevSpellPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private grimoire: GrimoireSystem;
  private onSpellChanged: (spell: Spell | null) => void;

  private selPrefix: PrefixId | null = null;
  private selCore: CoreId | null = null;
  private selForm: FormId | null = null;
  private selSuffix: SuffixId | null = null;
  private currentSpell: Spell | null = null;
  private activeSlot = 0;

  // Live UI refs
  private spellNameTxt!: Phaser.GameObjects.Text;
  private statsTxt!: Phaser.GameObjects.Text;
  private tierTxt!: Phaser.GameObjects.Text;
  private errorTxt!: Phaser.GameObjects.Text;
  private slotBtns: Phaser.GameObjects.Rectangle[] = [];
  private slotLabels: Phaser.GameObjects.Text[] = [];

  private readonly W = 290;

  constructor(scene: Phaser.Scene, x: number, y: number, grimoire: GrimoireSystem, onSpellChanged: (spell: Spell | null) => void) {
    this.scene = scene;
    this.grimoire = grimoire;
    this.onSpellChanged = onSpellChanged;
    this.container = scene.add.container(x, y).setDepth(100);
    this.build();
  }

  private build(): void {
    const W = this.W;
    // Background
    const bg = this.scene.add.rectangle(0, 0, W, 620, OC.panel, 0.95).setOrigin(0, 0).setStrokeStyle(1, OC.purple, 0.4);
    this.container.add(bg);

    this.addLabel(W / 2, 10, '◈ SPELL FORGE ◈', 14, '#c2b0df', true);
    this.addLabel(W / 2, 28, 'DEV COMBAT ARENA', 8, '#6e5d80');
    this.addLine(36);

    let dy = 44;

    // Component selectors
    dy = this.buildSelector(dy, 'PREFIX', this.getPrefixItems(), null, (id) => { this.selPrefix = id as PrefixId | null; this.rebuild(); });
    dy = this.buildSelector(dy, 'CORE', this.getCoreItems(), null, (id) => { this.selCore = id as CoreId | null; this.rebuild(); });
    dy = this.buildSelector(dy, 'FORM', this.getFormItems(), null, (id) => { this.selForm = id as FormId | null; this.rebuild(); });
    dy = this.buildSelector(dy, 'SUFFIX', this.getSuffixItems(), null, (id) => { this.selSuffix = id as SuffixId | null; this.rebuild(); });

    dy += 4;
    this.addLine(dy); dy += 8;

    // Spell preview
    this.spellNameTxt = this.addLabel(W / 2, dy, '— Select Core + Form —', 13, '#888899', true);
    dy += 20;
    this.tierTxt = this.addLabel(W / 2, dy, '', 10, '#667788');
    dy += 16;
    this.statsTxt = this.addLabel(14, dy, '', 10, '#99aabb');
    this.statsTxt.setOrigin(0, 0);
    dy += 55;
    this.errorTxt = this.addLabel(W / 2, dy, '', 9, '#e16a78');
    dy += 18;

    this.addLine(dy); dy += 8;

    // Slot assignment
    this.addLabel(W / 2, dy, 'ASSIGN TO SLOT', 10, '#9988aa', true);
    dy += 18;

    for (let i = 0; i < 3; i++) {
      const bx = 14 + i * ((W - 28) / 3) + ((W - 28) / 3) / 2;
      const btn = this.scene.add.rectangle(bx, dy + 14, (W - 40) / 3, 28, OC.panel2, 0.7).setStrokeStyle(1, OC.purple, 0.3).setInteractive({ useHandCursor: true });
      const label = this.addLabel(bx, dy + 14, `Slot ${i + 1}`, 11, '#aabbcc', true);
      btn.on('pointerdown', () => this.assignToSlot(i));
      btn.on('pointerover', () => btn.setFillStyle(0x211932, 0.85));
      btn.on('pointerout', () => this.refreshSlotBtn(i));
      this.container.add(btn);
      this.slotBtns.push(btn);
      this.slotLabels.push(label);
    }
    dy += 38;

    this.addLine(dy); dy += 8;

    // Quick presets
    this.addLabel(W / 2, dy, 'QUICK PRESETS', 10, '#9988aa', true);
    dy += 16;

    const presets: { label: string; core: CoreId; form: FormId }[] = [
      { label: 'Fire Orb', core: CoreId.FIRE, form: FormId.ORB },
      { label: 'Ice Blade', core: CoreId.ICE, form: FormId.BLADE },
      { label: 'Storm Beam', core: CoreId.STORM, form: FormId.BEAM },
      { label: 'Wind Nova', core: CoreId.WIND, form: FormId.NOVA },
      { label: 'Cosmic Mine', core: CoreId.COSMIC, form: FormId.MINE },
    ];

    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      const bx = 14 + (i % 3) * ((W - 28) / 3) + ((W - 28) / 3) / 2;
      const by = dy + Math.floor(i / 3) * 28;
      const btn = this.scene.add.rectangle(bx, by + 12, (W - 40) / 3, 24, OC.panel2, 0.6).setStrokeStyle(1, CORE_REGISTRY[p.core].visual.color, 0.3).setInteractive({ useHandCursor: true });
      this.addLabel(bx, by + 12, p.label, 9, '#' + CORE_REGISTRY[p.core].visual.color.toString(16).padStart(6, '0'));
      btn.on('pointerdown', () => { this.selPrefix = null; this.selCore = p.core; this.selForm = p.form; this.selSuffix = null; this.rebuild(); });
      btn.on('pointerover', () => btn.setFillStyle(0x211932, 0.8));
      btn.on('pointerout', () => btn.setFillStyle(OC.panel2, 0.6));
      this.container.add(btn);
    }
  }

  private buildSelector(y: number, label: string, items: { id: string | null; name: string; color: number }[], initial: string | null, onChange: (id: string | null) => void): number {
    this.addLabel(10, y, label, 9, '#776b88', true).setOrigin(0, 0.5);

    const btnW = (this.W - 20);
    const rowH = 20;
    const startY = y + 10;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const col = i % 4;
      const row = Math.floor(i / 4);
      const bw = (btnW - 6) / 4;
      const bx = 10 + col * (bw + 2) + bw / 2;
      const by = startY + row * (rowH + 2) + rowH / 2;
      const hex = '#' + item.color.toString(16).padStart(6, '0');

      const btn = this.scene.add.rectangle(bx, by, bw, rowH, OC.panel2, 0.65).setStrokeStyle(1, item.color, 0.25).setInteractive({ useHandCursor: true });
      const txt = this.addLabel(bx, by, item.id ? item.name.replace(/^of\s+/i, '').substring(0, 7) : '—', 8, item.id ? hex : '#666677');

      btn.on('pointerdown', () => { onChange(item.id); });
      btn.on('pointerover', () => btn.setStrokeStyle(1.5, item.color, 0.7));
      btn.on('pointerout', () => btn.setStrokeStyle(1, item.color, 0.25));
      this.container.add(btn);
    }

    const rows = Math.ceil(items.length / 4);
    return startY + rows * (rowH + 2) + 6;
  }

  private rebuild(): void {
    if (!this.selCore || !this.selForm) {
      this.currentSpell = null;
      this.spellNameTxt.setText('— Select Core + Form —').setColor('#888899');
      this.tierTxt.setText('');
      this.statsTxt.setText('');
      this.errorTxt.setText('').setAlpha(0);
      this.onSpellChanged(null);
      return;
    }

    const result = SpellBuilder.build(this.selCore, this.selForm, this.selPrefix, this.selSuffix);

    if (result.success && result.spell) {
      this.currentSpell = result.spell;
      const s = result.spell;
      const hex = '#' + s.visual.color.toString(16).padStart(6, '0');
      this.spellNameTxt.setText(s.name).setColor(hex);

      const tier = getSpellTier(s);
      const tierLabel = tier === 0 ? 'BASIC' : tier === 2 ? 'TIER 2 (Core+Form)' : 'TIER 3 (Modified)';
      this.tierTxt.setText(`Tier: ${tier}  ·  ${tierLabel}`).setColor(tier === 3 ? '#e16a78' : tier === 2 ? '#ccaa44' : '#667788');

      const cdSec = (s.cooldown / 1000).toFixed(2);
      const statusType = s.statusEffect.type !== 'none' ? s.statusEffect.type.toUpperCase() : '—';
      this.statsTxt.setText(`Damage: ${s.damage}    Mana: ${s.manaCost}\nCooldown: ${cdSec}s\nStatus: ${statusType}\nTarget: ${s.targetingType}`);

      this.errorTxt.setText('').setAlpha(0);
      this.onSpellChanged(s);
    } else {
      this.currentSpell = null;
      this.spellNameTxt.setText('INVALID').setColor('#e16a78');
      this.tierTxt.setText('');
      this.statsTxt.setText('');
      this.errorTxt.setText(result.error).setAlpha(1);
      this.onSpellChanged(null);
    }

    this.refreshSlots();
  }

  private assignToSlot(slot: number): void {
    if (!this.currentSpell || !this.selCore || !this.selForm) return;
    this.grimoire.assignToSlot(slot, this.selCore, this.selForm, this.selPrefix, this.selSuffix);
    this.activeSlot = slot;
    this.grimoire.setActiveSlot(slot);
    this.refreshSlots();
  }

  private refreshSlots(): void {
    for (let i = 0; i < 3; i++) this.refreshSlotBtn(i);
  }

  private refreshSlotBtn(i: number): void {
    const spell = this.grimoire.slots[i]?.spell;
    const isActive = i === this.activeSlot;
    if (spell) {
      this.slotLabels[i].setText(spell.name.substring(0, 12)).setColor('#' + spell.visual.color.toString(16).padStart(6, '0'));
      this.slotBtns[i].setFillStyle(isActive ? 0x1c1830 : OC.panel2, isActive ? 0.85 : 0.7);
      this.slotBtns[i].setStrokeStyle(isActive ? 2 : 1, isActive ? spell.visual.color : OC.purple, isActive ? 0.7 : 0.3);
    } else {
      this.slotLabels[i].setText(`Slot ${i + 1}`).setColor('#667788');
      this.slotBtns[i].setFillStyle(OC.panel2, 0.7).setStrokeStyle(1, OC.purple, 0.3);
    }
  }

  private getPrefixItems(): { id: string | null; name: string; color: number }[] {
    const items: { id: string | null; name: string; color: number }[] = [{ id: null, name: 'None', color: 0x555566 }];
    for (const id of getAllPrefixIds()) items.push({ id, name: PREFIX_REGISTRY[id].displayName, color: 0x88cc88 });
    return items;
  }

  private getCoreItems(): { id: string | null; name: string; color: number }[] {
    return getAllCoreIds().map(id => ({ id, name: CORE_REGISTRY[id].displayName, color: CORE_REGISTRY[id].visual.color }));
  }

  private getFormItems(): { id: string | null; name: string; color: number }[] {
    return getAllFormIds().map(id => ({ id, name: FORM_REGISTRY[id].displayName, color: 0x8888dd }));
  }

  private getSuffixItems(): { id: string | null; name: string; color: number }[] {
    const items: { id: string | null; name: string; color: number }[] = [{ id: null, name: 'None', color: 0x555566 }];
    for (const id of getAllSuffixIds()) items.push({ id, name: SUFFIX_REGISTRY[id].displayName, color: 0xccaa66 });
    return items;
  }

  private addLabel(x: number, y: number, text: string, size: number, color: string, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add.text(x, y, text, uiText(size, color, bold)).setOrigin(0.5).setDepth(101);
    applyTextShadow(t);
    this.container.add(t);
    return t;
  }

  private addLine(y: number): void {
    const line = this.scene.add.rectangle(this.W / 2, y, this.W - 20, 1, OC.purple, 0.15);
    this.container.add(line);
  }

  getCurrentSpell(): Spell | null { return this.currentSpell; }
  getActiveSlot(): number { return this.activeSlot; }

  destroy(): void { this.container.destroy(); }
}
