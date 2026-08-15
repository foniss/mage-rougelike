// src/scenes/GrimoireScene.ts

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellBuilder, Spell } from '../systems/SpellBuilder';
import { SpellValidator } from '../systems/SpellValidator';
import { CoreId, FormId, PrefixId, SuffixId, CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY, getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds } from '../config/spellComponents';
import { ROOM_WIDTH, ROOM_HEIGHT, SPELL_SLOT_COUNT } from '../config/constants';
import { uiText, applyTextShadow, createGlassPanel, GLASS } from '../config/uiStyles';
import { getCoreTheme } from '../visuals/CoreVisualTheme';

type CompItem = { id: string | null; name: string; mana: number; color: number; desc: string };

interface CompCard {
  id: string | null; category: 'prefix' | 'core' | 'form' | 'suffix';
  container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text; sub: Phaser.GameObjects.Text;
  check: Phaser.GameObjects.Text; lock: Phaser.GameObjects.Text;
  color: number; desc: string; lockReason: string; locked: boolean;
  baseW: number; baseH: number;
}

interface ChainSlot { box: Phaser.GameObjects.Rectangle; border: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text }
interface LoadoutCard { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Rectangle; border: Phaser.GameObjects.Rectangle; numTxt: Phaser.GameObjects.Text; nameTxt: Phaser.GameObjects.Text; manaTxt: Phaser.GameObjects.Text; glow: Phaser.GameObjects.Rectangle }
interface RecentEntry { name: string; color: number; manaCost: number; sP: PrefixId | null; sC: CoreId; sF: FormId; sS: SuffixId | null }

const OC = {
  void: 0x07050c, panel: 0x0d0915, panel2: 0x110c1b,
  purple: 0x8f6bc2, purpleBright: 0xbda1f4,
  crimson: 0x9c384c, crimsonBright: 0xe16a78,
  gold: 0xc39b58, bone: 0xd8d0c2, blue: 0x7194cc, black: 0x020106,
};

function formSym(id: string, n: string): string {
  const l = (n || id || '').toLowerCase();
  if (l.includes('blade') || l.includes('slash')) return '⚔';
  if (l.includes('beam') || l.includes('ray')) return '➳';
  if (l.includes('orb') || l.includes('sphere')) return '●';
  if (l.includes('mine') || l.includes('trap')) return '◆';
  if (l.includes('nova') || l.includes('burst')) return '✺';
  return '◇';
}

function coreSym(id: string, n: string): string {
  const l = (n || id || '').toLowerCase();
  if (l.includes('fire') || l.includes('flame')) return '🜂';
  if (l.includes('ice') || l.includes('frost')) return '❄';
  if (l.includes('wind') || l.includes('air')) return '≋';
  if (l.includes('storm') || l.includes('lightning') || l.includes('thunder')) return '⚡';
  if (l.includes('cosmic') || l.includes('void') || l.includes('star')) return '✦';
  return '◈';
}

export class GrimoireScene extends Phaser.Scene {
  private gs!: GrimoireSystem;
  private slot = 0;
  private sP: PrefixId | null = null;
  private sC: CoreId | null = null;
  private sF: FormId | null = null;
  private sS: SuffixId | null = null;
  private spell: Spell | null = null;

  private prefCards: CompCard[] = [];
  private coreCards: CompCard[] = [];
  private formCards: CompCard[] = [];
  private sufCards: CompCard[] = [];
  private chain: ChainSlot[] = [];
  private loadoutCards: LoadoutCard[] = [];
  private recentCards: LoadoutCard[] = [];
  private recentSpells: RecentEntry[] = [];

  private pvGlow!: Phaser.GameObjects.Arc;
  private pvOrb!: Phaser.GameObjects.Arc;
  private pvRing!: Phaser.GameObjects.Arc;
  private pvName!: Phaser.GameObjects.Text;
  private pvError!: Phaser.GameObjects.Text;
  private particleTimer: Phaser.Time.TimerEvent | null = null;

  private statManaVal!: Phaser.GameObjects.Text;
  private statCdVal!: Phaser.GameObjects.Text;
  private statManaCard!: Phaser.GameObjects.Rectangle;
  private statCdCard!: Phaser.GameObjects.Rectangle;
  private extraStatsTxt!: Phaser.GameObjects.Text;

  private prepBtn!: Phaser.GameObjects.Rectangle;
  private prepGlow!: Phaser.GameObjects.Rectangle;
  private prepTxt!: Phaser.GameObjects.Text;
  private prepReason!: Phaser.GameObjects.Text;
  private prepTween: Phaser.Tweens.Tween | null = null;

  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private tooltipTitle!: Phaser.GameObjects.Text;
  private tooltipBody!: Phaser.GameObjects.Text;
  private tooltipContainer!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'GrimoireScene' }); }

  // Helper: add text with shadow
  private t(x: number, y: number, txt: string, size: number, color: string, bold = false, depth = 210): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, txt, uiText(size, color, bold)).setDepth(depth);
    applyTextShadow(t);
    return t;
  }

  init(data: { grimoireSystem: GrimoireSystem }): void {
    this.gs = data.grimoireSystem;
    this.slot = this.gs.activeSlotIndex;
    const ex = this.gs.slots[this.slot]?.spell;
    if (ex) { this.sC = ex.core.id; this.sF = ex.form.id; this.sP = ex.prefix?.id as PrefixId ?? null; this.sS = ex.suffix?.id as SuffixId ?? null; }
    else { this.sP = null; this.sC = null; this.sF = null; this.sS = null; }
  }

  create(): void {
    this.prefCards = []; this.coreCards = []; this.formCards = []; this.sufCards = [];
    this.chain = []; this.loadoutCards = []; this.recentCards = []; this.spell = null;

    const W = ROOM_WIDTH, H = ROOM_HEIGHT, cx = W / 2;

    // Overlay
    this.add.rectangle(cx, H / 2, W, H, OC.black, 0.48).setDepth(200).setInteractive();

    // Panel
    const pW = Math.min(1240, W - 28), pH = Math.min(850, H - 28), pY = H / 2;
    this.add.rectangle(cx + 3, pY + 4, pW, pH, 0x000000, 0.5).setDepth(201);
    createGlassPanel(this, cx, pY, pW, pH, 202, 0.96);
    this.add.rectangle(cx, pY, pW - 10, pH - 10, 0, 0).setDepth(203).setStrokeStyle(1, OC.purple, 0.18);

    // Header
    const tY = pY - pH / 2 + 31;
    this.t(cx, tY, 'GRIMOIRE', 25, '#e6dcf5', true).setOrigin(0.5);
    this.t(cx, tY + 25, 'THE FORBIDDEN ARTS', 10, '#806c9c', true).setOrigin(0.5);
    this.t(cx - 145, tY + 25, '◈', 8, '#6e4d83', true, 211).setOrigin(0.5);
    this.t(cx + 145, tY + 25, '◈', 8, '#6e4d83', true, 211).setOrigin(0.5);

    // Close button
    const clX = cx + pW / 2 - 27, clY = pY - pH / 2 + 27;
    const clBtn = this.add.circle(clX, clY, 14, 0x260d18, 0.85).setDepth(230).setStrokeStyle(1, OC.crimsonBright, 0.45).setInteractive({ useHandCursor: true });
    this.t(clX, clY, '✕', 12, '#d17b87', true, 231).setOrigin(0.5);
    clBtn.on('pointerover', () => clBtn.setFillStyle(0x3a121d, 0.95));
    clBtn.on('pointerout', () => clBtn.setFillStyle(0x260d18, 0.85));
    clBtn.on('pointerdown', () => this.doClose());

    // Content bounds
    const cTop = tY + 48, cBot = pY + pH / 2 - 42;
    const cLeft = cx - pW / 2 + 22, cRight = cx + pW / 2 - 22;
    const cW = cRight - cLeft, colGap = 18;
    const lW = Math.floor(cW * 0.30), cenW = Math.floor(cW * 0.42), rW = cW - lW - cenW - colGap * 2;
    const lX = cLeft, cenX = lX + lW + colGap, rX = cenX + cenW + colGap;
    const midY = (cTop + cBot) / 2, colH = cBot - cTop - 18;

    // Column dividers
    this.add.rectangle(lX + lW + colGap / 2, midY, 1, colH, OC.purple, 0.11).setDepth(209);
    this.add.rectangle(cenX + cenW + colGap / 2, midY, 1, colH, OC.purple, 0.11).setDepth(209);

    this.buildTooltip();
    this.buildComponentArea(lX, cTop, lW, cBot - cTop);
    this.buildForgeCenter(cenX, cTop, cenW, cBot - cTop);
    this.buildLoadoutAndForge(rX, cTop, rW, cBot - cTop);

    this.t(cRight, pY + pH / 2 - 17, 'TAB / ESC  CLOSE', 9, '#62586d').setOrigin(1, 0.5);
    this.refresh();
  }

  // ── Tooltip ──────────────────────────────────────────────────────────

  private buildTooltip(): void {
    this.tooltipContainer = this.add.container(0, 0).setDepth(500).setAlpha(0);
    this.tooltipBg = this.add.rectangle(0, 0, 210, 60, OC.panel, 0.98).setOrigin(0, 0).setStrokeStyle(1, OC.purple, 0.55);
    this.tooltipTitle = this.add.text(9, 7, '', uiText(11, '#e0d0ff', true)).setOrigin(0, 0);
    this.tooltipBody = this.add.text(9, 24, '', { ...uiText(9, '#aaa0bd'), wordWrap: { width: 190 } }).setOrigin(0, 0);
    applyTextShadow(this.tooltipTitle); applyTextShadow(this.tooltipBody);
    this.tooltipContainer.add([this.tooltipBg, this.tooltipTitle, this.tooltipBody]);
  }

  private showTooltip(x: number, y: number, title: string, body: string, accent: number): void {
    this.tooltipTitle.setText(title).setColor('#' + accent.toString(16).padStart(6, '0'));
    this.tooltipBody.setText(body);
    const h = 30 + this.tooltipBody.height + 10;
    this.tooltipBg.setSize(210, h).setStrokeStyle(1, accent, 0.55);
    const tx = Phaser.Math.Clamp(x, 8, ROOM_WIDTH - 218);
    const ty = Phaser.Math.Clamp(y, 8, ROOM_HEIGHT - 8 - h);
    this.tooltipContainer.setPosition(tx, ty).setAlpha(1);
  }

  private hideTooltip(): void { this.tooltipContainer.setAlpha(0); }

  // ── Left: Components ─────────────────────────────────────────────────

  private buildComponentArea(x: number, y: number, w: number, h: number): void {
    const sections: { label: string; color: string; cat: CompCard['category']; items: CompItem[]; arr: CompCard[]; cb: (id: string | null) => void }[] = [];

    const pref = this.getPrefixItems(), cores = this.getCoreItems(), forms = this.getFormItems(), suf = this.getSuffixItems();
    if (pref.length > 1) sections.push({ label: 'PREFIX', color: '#7fc48b', cat: 'prefix', items: pref, arr: this.prefCards, cb: (id) => { this.sP = id as PrefixId | null; this.refresh(); } });
    if (cores.length > 0) sections.push({ label: 'CORE', color: '#dba05d', cat: 'core', items: cores, arr: this.coreCards, cb: (id) => { this.sC = id as CoreId | null; this.refresh(); } });
    if (forms.length > 0) sections.push({ label: 'FORM', color: '#8e8ee2', cat: 'form', items: forms, arr: this.formCards, cb: (id) => { this.sF = id as FormId | null; this.refresh(); } });
    if (suf.length > 1) sections.push({ label: 'SUFFIX', color: '#d2b06b', cat: 'suffix', items: suf, arr: this.sufCards, cb: (id) => { this.sS = id as SuffixId | null; this.refresh(); } });

    if (sections.length === 0) return;
    const sGap = 9, sH = (h - sGap * Math.max(0, sections.length - 1)) / sections.length;
    let cy = y;
    for (const s of sections) { this.buildSection(x, cy, w, sH, s.label, s.color, s.cat, s.items, s.cb, s.arr); cy += sH + sGap; }
  }

  private buildSection(x: number, y: number, w: number, h: number, label: string, lc: string, cat: CompCard['category'], items: CompItem[], onSelect: (id: string | null) => void, arr: CompCard[]): void {
    const accent = Phaser.Display.Color.HexStringToColor(lc).color;
    this.add.rectangle(x + w / 2, y + h / 2, w, h, OC.panel, 0.48).setDepth(205).setStrokeStyle(1, accent, 0.14);
    this.t(x + 9, y + 7, label, 13, lc, true, 212);
    const desc = cat === 'prefix' ? 'MODIFIER' : cat === 'core' ? 'ESSENCE' : cat === 'form' ? 'DELIVERY' : 'TWIST';
    this.t(x + w - 9, y + 9, desc, 7, '#635a6d', true, 212).setOrigin(1, 0);

    const pad = 29, bPad = 7, hPad = 8, gap = 6;
    const aW = w - hPad * 2, aH = h - pad - bPad;
    const minCW = 62, maxCW = 105;
    let cols = Phaser.Math.Clamp(Math.floor((aW + gap) / (minCW + gap)), 1, items.length);
    const rows = Math.ceil(items.length / cols);
    const cW = Phaser.Math.Clamp((aW - gap * (cols - 1)) / cols, minCW, maxCW);
    const cH = Phaser.Math.Clamp((aH - gap * (rows - 1)) / rows, 47, 72);
    const gW = cols * cW + (cols - 1) * gap, gH = rows * cH + (rows - 1) * gap;
    const gX = x + (w - gW) / 2, gY = y + pad + Math.max(0, (aH - gH) / 2);

    for (let i = 0; i < items.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const bx = gX + col * (cW + gap) + cW / 2, by = gY + row * (cH + gap) + cH / 2;
      this.buildCard(bx, by, cW, cH, items[i], cat, onSelect, arr);
    }
  }

  private buildCard(bx: number, by: number, w: number, h: number, item: CompItem, cat: CompCard['category'], onSelect: (id: string | null) => void, arr: CompCard[]): void {
    const container = this.add.container(bx, by).setDepth(215);
    const bg = this.add.rectangle(0, 0, w, h, OC.panel2, 0.72).setOrigin(0.5);
    const border = this.add.rectangle(0, 0, w, h, 0, 0).setOrigin(0.5).setStrokeStyle(1, item.color, 0.22);
    const hex = '#' + item.color.toString(16).padStart(6, '0');

    let sym = '—';
    if (item.id !== null) sym = cat === 'core' ? coreSym(item.id, item.name) : cat === 'form' ? formSym(item.id, item.name) : cat === 'prefix' ? '⌁' : '✦';
    const iSz = (cat === 'core' || cat === 'form') ? Phaser.Math.Clamp(Math.floor(h * 0.29), 12, 20) : Phaser.Math.Clamp(Math.floor(h * 0.24), 11, 16);

    const icon = this.add.text(0, -h * 0.25, sym, uiText(iSz, item.id ? hex : '#686373', true)).setOrigin(0.5);
    applyTextShadow(icon);

    let dn = item.name;
    if (cat === 'suffix') dn = dn.replace(/^of\s+/i, '').trim();
    const nSz = w >= 92 ? 11 : w >= 72 ? 10 : 9;
    const nameTxt = this.add.text(0, h * 0.08, dn, { ...uiText(nSz, item.id ? hex : '#888494', true), align: 'center', wordWrap: { width: w - 10 } }).setOrigin(0.5);
    applyTextShadow(nameTxt);

    const subTxt = this.add.text(0, h / 2 - 9, item.id ? `+${item.mana} MP` : '', uiText(8, '#75889b', true)).setOrigin(0.5);
    applyTextShadow(subTxt);

    const check = this.add.text(w / 2 - 9, -h / 2 + 9, '◆', uiText(7, '#ffffff', true)).setOrigin(0.5).setAlpha(0);
    const lock = this.add.text(w / 2 - 9, -h / 2 + 9, '⊘', uiText(9, '#a85e6c', true)).setOrigin(0.5).setAlpha(0);

    container.add([bg, border, icon, nameTxt, subTxt, check, lock]);
    bg.setInteractive({ useHandCursor: true });

    const card: CompCard = { id: item.id, category: cat, container, bg, border, icon, name: nameTxt, sub: subTxt, check, lock, color: item.color, desc: item.desc, lockReason: '', locked: false, baseW: w, baseH: h };

    bg.on('pointerover', () => {
      if (!card.locked) { this.tweens.add({ targets: container, scaleX: 1.035, scaleY: 1.035, duration: 100, ease: 'Sine.Out' }); border.setStrokeStyle(this.isSel(card) ? 2 : 1.5, this.isSel(card) ? 0xffffff : card.color, this.isSel(card) ? 0.9 : 0.6); }
      const wm = container.getWorldTransformMatrix();
      this.showTooltip(Phaser.Math.Clamp(wm.tx - w / 2, 8, ROOM_WIDTH - 218), wm.ty + h / 2 + 7, item.id ? dn : 'None', card.locked ? card.lockReason : item.desc || '', card.color);
    });
    bg.on('pointerout', () => { this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120, ease: 'Sine.Out' }); this.refreshCard(card); this.hideTooltip(); });
    bg.on('pointerdown', () => { if (!card.locked) onSelect(item.id); });

    arr.push(card);
  }

  private isSel(c: CompCard): boolean { return c.category === 'prefix' ? this.sP === c.id : c.category === 'core' ? this.sC === c.id : c.category === 'form' ? this.sF === c.id : this.sS === c.id; }

  private refreshCard(c: CompCard): void {
    const s = this.isSel(c);
    c.bg.setFillStyle(c.locked ? 0x09070d : s ? 0x24183a : OC.panel2, c.locked ? 0.5 : s ? 0.9 : 0.72);
    c.border.setStrokeStyle(s ? 2 : 1, s ? OC.bone : c.color, c.locked ? 0.1 : s ? 0.9 : 0.24);
    c.icon.setAlpha(c.locked ? 0.28 : 1); c.name.setAlpha(c.locked ? 0.3 : 1); c.sub.setAlpha(c.locked ? 0.28 : 1);
    c.check.setAlpha(s && !c.locked ? 1 : 0); c.lock.setAlpha(c.locked ? 0.85 : 0);
    c.container.setScale(1);
  }

  // ── Item sources ──────────────────────────────────────────────────────

  private getPrefixItems(): CompItem[] {
    const items: CompItem[] = [{ id: null, name: 'None', mana: 0, color: 0x666677, desc: 'No prefix applied.' }];
    for (const id of getAllPrefixIds()) { const p = PREFIX_REGISTRY[id]; items.push({ id, name: p.displayName, mana: p.manaCost, color: 0x88cc88, desc: p.description }); }
    return items;
  }

  private getCoreItems(): CompItem[] {
    return getAllCoreIds().map(id => { const c = CORE_REGISTRY[id]; return { id, name: c.displayName, mana: c.manaCost, color: c.visual.color, desc: c.description }; });
  }

  private getFormItems(): CompItem[] {
    return getAllFormIds().map(id => { const f = FORM_REGISTRY[id]; return { id, name: f.displayName, mana: f.manaCost, color: 0x8888dd, desc: f.description }; });
  }

  private getSuffixItems(): CompItem[] {
    const items: CompItem[] = [{ id: null, name: 'None', mana: 0, color: 0x666677, desc: 'No suffix applied.' }];
    for (const id of getAllSuffixIds()) { const s = SUFFIX_REGISTRY[id]; items.push({ id, name: s.displayName, mana: s.manaCost, color: 0xccaa66, desc: s.description }); }
    return items;
  }

  // ── Center: Forge ─────────────────────────────────────────────────────

  private buildForgeCenter(x: number, y: number, w: number, h: number): void {
    const cx = x + w / 2;
    this.t(cx, y + 4, 'SPELL FORGE', 14, '#c2b0df', true, 212).setOrigin(0.5);
    this.t(cx, y + 22, 'BIND THE FOUR ASPECTS', 8, '#6c6178', true, 212).setOrigin(0.5);

    // Chain slots
    const chY = y + 57, chGap = 10, chW = (w - chGap * 3) / 4, chH = 58;
    const labels = ['PREFIX', 'CORE', 'FORM', 'SUFFIX'];
    for (let i = 0; i < 4; i++) {
      const bx = x + i * (chW + chGap) + chW / 2;
      const box = this.add.rectangle(bx, chY, chW, chH, OC.panel2, 0.72).setDepth(213);
      const border = this.add.rectangle(bx, chY, chW, chH, 0, 0).setDepth(214).setStrokeStyle(1, 0x57506a, 0.35);
      const lbl = this.t(bx, chY - chH / 2 - 9, labels[i], 8, '#776b88', true, 214).setOrigin(0.5);
      const val = this.add.text(bx, chY, '—', { ...uiText(10, '#858097', true), align: 'center' }).setOrigin(0.5).setDepth(215).setWordWrapWidth(chW - 8, true);
      applyTextShadow(val);
      this.chain.push({ box, border, label: lbl, value: val });
      if (i < 3) { this.t(bx + chW / 2 + chGap / 2, chY, '›', 17, '#725b86', true, 214).setOrigin(0.5); }
    }

    // Preview orb
    const pvY = chY + chH / 2 + 116, r = Math.min(78, w * 0.22, h * 0.16);
    this.pvGlow = this.add.circle(cx, pvY, r + 30, OC.purple, 0.06).setDepth(210);
    this.pvRing = this.add.circle(cx, pvY, r + 17, 0, 0).setDepth(211).setStrokeStyle(1, OC.purple, 0.25);
    this.pvOrb = this.add.circle(cx, pvY, r, 0x2a2340, 0.26).setDepth(212).setStrokeStyle(2, OC.purpleBright, 0.4);
    const mark = this.t(cx, pvY, '◈', Math.max(24, r * 0.55), '#8c6db5', true, 213).setOrigin(0.5).setAlpha(0.28);
    this.tweens.add({ targets: mark, angle: 360, duration: 16000, repeat: -1, ease: 'Linear' });

    // Spell name
    const nY = pvY + r + 31;
    this.pvName = this.add.text(cx, nY, 'SELECT CORE + FORM', { ...uiText(18, '#9090a4', true), align: 'center', wordWrap: { width: w - 18 } }).setOrigin(0.5, 0).setDepth(212);
    applyTextShadow(this.pvName);

    // Stats
    const sY = nY + 57, scW = w * 0.43, scH = 48, sGap = w * 0.055;
    const mCx = cx - scW / 2 - sGap / 2, cCx = cx + scW / 2 + sGap / 2;

    this.statManaCard = this.add.rectangle(mCx, sY, scW, scH, OC.panel2, 0.75).setDepth(212).setStrokeStyle(1, OC.blue, 0.3);
    this.t(mCx, sY - 11, 'MANA', 8, '#7799cc', true, 213).setOrigin(0.5);
    this.statManaVal = this.t(mCx, sY + 9, '—', 15, '#d5e2ff', true, 213).setOrigin(0.5);

    this.statCdCard = this.add.rectangle(cCx, sY, scW, scH, OC.panel2, 0.75).setDepth(212).setStrokeStyle(1, 0x66b89e, 0.3);
    this.t(cCx, sY - 11, 'COOLDOWN', 8, '#77c5aa', true, 213).setOrigin(0.5);
    this.statCdVal = this.t(cCx, sY + 9, '—', 15, '#cfffe8', true, 213).setOrigin(0.5);

    this.extraStatsTxt = this.add.text(cx, sY + 42, '', { ...uiText(10, '#a8a0b5'), align: 'center', lineSpacing: 5 }).setOrigin(0.5, 0).setDepth(212);
    applyTextShadow(this.extraStatsTxt);

    this.pvError = this.add.text(cx, sY + 103, '', { ...uiText(10, '#e16a78', true), align: 'center', wordWrap: { width: w - 18 } }).setOrigin(0.5, 0).setDepth(212).setAlpha(0);
    applyTextShadow(this.pvError);
  }

  // ── Right: Loadout + Forge ────────────────────────────────────────────

  private buildLoadoutAndForge(x: number, y: number, w: number, h: number): void {
    const bcx = x + w / 2;
    this.t(x, y + 2, 'SPELL ARSENAL', 14, '#c0afd9', true, 212);
    this.t(x, y + 20, 'READY FOR BATTLE', 8, '#685d74', true, 212);

    // Loadout slots
    const cH = 54, cGap = 7, stY = y + 36;
    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      const cy = stY + i * (cH + cGap) + cH / 2;
      const cont = this.add.container(bcx, cy).setDepth(215);
      const glow = this.add.rectangle(0, 0, w + 8, cH + 8, OC.purple, 0.08).setAlpha(0);
      const bg = this.add.rectangle(0, 0, w, cH, OC.panel2, 0.62);
      const brd = this.add.rectangle(0, 0, w, cH, 0, 0).setStrokeStyle(1, 0x51485f, 0.38);
      bg.setInteractive({ useHandCursor: true });
      const num = this.add.text(-w / 2 + 16, 0, String(i + 1), uiText(15, '#9c8fc0', true)).setOrigin(0.5);
      const nm = this.add.text(-w / 2 + 34, -8, `Slot ${i + 1}`, uiText(11, '#aeb8d0', true)).setOrigin(0, 0.5).setWordWrapWidth(w - 48);
      const mp = this.add.text(-w / 2 + 34, 11, '', uiText(9, '#75899d', true)).setOrigin(0, 0.5);
      [num, nm, mp].forEach(t => applyTextShadow(t));
      cont.add([glow, bg, brd, num, nm, mp]);

      bg.on('pointerover', () => bg.setFillStyle(0x211932, 0.8));
      bg.on('pointerout', () => bg.setFillStyle(i === this.slot ? 0x1b1730 : OC.panel2, i === this.slot ? 0.78 : 0.62));
      bg.on('pointerdown', () => {
        this.slot = i;
        const sl = this.gs.slots[i]?.spell;
        if (sl) { this.sC = sl.core.id; this.sF = sl.form.id; this.sP = sl.prefix?.id as PrefixId ?? null; this.sS = sl.suffix?.id as SuffixId ?? null; }
        else { this.sP = null; this.sC = null; this.sF = null; this.sS = null; }
        this.refresh();
      });

      this.loadoutCards.push({ container: cont, bg, border: brd, numTxt: num, nameTxt: nm, manaTxt: mp, glow });
    }

    // Forge button
    const btnY = stY + SPELL_SLOT_COUNT * (cH + cGap) + 27, btnH = 60;
    this.prepGlow = this.add.rectangle(bcx, btnY, w + 12, btnH + 12, OC.crimson, 0.09).setDepth(214).setAlpha(0);
    this.prepBtn = this.add.rectangle(bcx, btnY, w, btnH, OC.panel2, 0.7).setDepth(215).setStrokeStyle(1, 0x574b61, 0.4).setInteractive({ useHandCursor: true });
    this.prepTxt = this.t(bcx, btnY - 4, 'FORGE SPELL', 15, '#777080', true, 216).setOrigin(0.5);
    this.prepReason = this.add.text(bcx, btnY + btnH / 2 + 10, '', { ...uiText(9, '#8e6870'), align: 'center', wordWrap: { width: w } }).setOrigin(0.5, 0).setDepth(215);
    applyTextShadow(this.prepReason);

    this.prepBtn.on('pointerover', () => { if (this.spell) { this.prepBtn.setFillStyle(0x351a23, 0.9); this.tweens.add({ targets: this.prepBtn, scaleX: 1.02, scaleY: 1.04, duration: 100 }); } });
    this.prepBtn.on('pointerout', () => { this.prepBtn.setFillStyle(this.spell ? 0x29151d : OC.panel2, this.spell ? 0.75 : 0.7); this.tweens.add({ targets: this.prepBtn, scaleX: 1, scaleY: 1, duration: 100 }); });
    this.prepBtn.on('pointerdown', () => { if (this.spell) this.doPrepare(); });

    // Recent
    const rtY = btnY + btnH / 2 + 43;
    this.t(x, rtY, 'RECENT', 13, '#a495ba', true, 212);
    this.t(x + w, rtY + 2, 'RECALL', 7, '#5f566a', true, 212).setOrigin(1, 0);

    const rH = 38, rGap = 6, rsY = rtY + 24;
    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      const cy = rsY + i * (rH + rGap) + rH / 2;
      const cont = this.add.container(bcx, cy).setDepth(215);
      const glow = this.add.rectangle(0, 0, w + 6, rH + 6, OC.gold, 0.06).setAlpha(0);
      const bg = this.add.rectangle(0, 0, w, rH, 0x09070e, 0.58);
      const brd = this.add.rectangle(0, 0, w, rH, 0, 0).setStrokeStyle(1, 0x51485f, 0.24);
      bg.setInteractive({ useHandCursor: true });
      const num = this.add.text(-w / 2 + 13, 0, '', uiText(11, '#c7aa69', true)).setOrigin(0.5);
      const nm = this.add.text(-w / 2 + 28, 0, '—', uiText(10, '#9ba5ba', true)).setOrigin(0, 0.5).setWordWrapWidth(w - 70);
      const mp = this.add.text(w / 2 - 10, 0, '', uiText(9, '#75899d', true)).setOrigin(1, 0.5);
      [num, nm, mp].forEach(t => applyTextShadow(t));
      cont.add([glow, bg, brd, num, nm, mp]);

      bg.on('pointerover', () => { if (this.recentSpells[i]) bg.setFillStyle(0x211932, 0.78); });
      bg.on('pointerout', () => bg.setFillStyle(0x09070e, 0.58));
      bg.on('pointerdown', () => { const e = this.recentSpells[i]; if (e) { this.sP = e.sP; this.sC = e.sC; this.sF = e.sF; this.sS = e.sS; this.refresh(); } });

      this.recentCards.push({ container: cont, bg, border: brd, numTxt: num, nameTxt: nm, manaTxt: mp, glow });
    }
  }

  // ── Refresh ───────────────────────────────────────────────────────────

  private refresh(): void {
    this.refreshCompat();
    [...this.prefCards, ...this.coreCards, ...this.formCards, ...this.sufCards].forEach(c => this.refreshCard(c));
    this.refreshChain(); this.refreshPreview(); this.refreshPrepare(); this.refreshLoadout(); this.refreshRecent();
  }

  private refreshChain(): void {
    const entries = [
      { id: this.sP, reg: this.sP ? PREFIX_REGISTRY[this.sP] : null, col: 0x88cc88 },
      { id: this.sC, reg: this.sC ? CORE_REGISTRY[this.sC] : null, col: this.sC ? CORE_REGISTRY[this.sC].visual.color : 0x8888aa },
      { id: this.sF, reg: this.sF ? FORM_REGISTRY[this.sF] : null, col: 0x8888dd },
      { id: this.sS, reg: this.sS ? SUFFIX_REGISTRY[this.sS] : null, col: 0xccaa66 },
    ];
    for (let i = 0; i < 4; i++) {
      const e = entries[i], s = this.chain[i]; if (!s) continue;
      if (e.id && e.reg) {
        let dn = e.reg.displayName; if (i === 3) dn = dn.replace(/^of\s+/i, '').trim();
        s.value.setText(dn).setColor('#' + e.col.toString(16).padStart(6, '0'));
        s.border.setStrokeStyle(1.5, e.col, 0.68); s.box.setFillStyle(0x191323, 0.78);
      } else { s.value.setText('—').setColor('#666078'); s.border.setStrokeStyle(1, 0x55506a, 0.25); s.box.setFillStyle(0x0c0912, 0.55); }
    }
  }

  private refreshCompat(): void {
    const checkCards = (cards: CompCard[], field: 'prefix' | 'suffix', sel: () => string | null, clear: () => void) => {
      for (const c of cards) {
        if (c.id === null) { c.locked = false; c.lockReason = ''; continue; }
        let ok = true, reason = 'Incompatible with current selection.';
        if (this.sC && this.sF) {
          const args: [CoreId, FormId, PrefixId | null, SuffixId | null] = field === 'prefix'
            ? [this.sC, this.sF, c.id as PrefixId, this.sS]
            : [this.sC, this.sF, this.sP, c.id as SuffixId];
          const r = SpellValidator.validate(...args);
          const err = r.errors.find((e: any) => e.field === field || e.field === 'combination');
          ok = !err; if (err?.message) reason = err.message;
        }
        c.locked = !ok; c.lockReason = reason;
        if (!ok && sel() === c.id) clear();
        if (ok) c.bg.setInteractive({ useHandCursor: true }); else c.bg.disableInteractive();
      }
    };
    checkCards(this.prefCards, 'prefix', () => this.sP, () => { this.sP = null; });
    checkCards(this.sufCards, 'suffix', () => this.sS, () => { this.sS = null; });
    for (const c of [...this.coreCards, ...this.formCards]) { c.locked = false; c.lockReason = ''; }
  }

  private refreshPreview(): void {
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }
    if (!this.sC || !this.sF) {
      this.spell = null; this.pvName.setText('SELECT CORE + FORM').setColor('#8d8898');
      this.statManaVal.setText('—'); this.statCdVal.setText('—'); this.extraStatsTxt.setText(''); this.pvError.setAlpha(0);
      this.pvOrb.setFillStyle(0x302842, 0.24).setStrokeStyle(1.5, 0x77678d, 0.4);
      this.pvGlow.setFillStyle(0x45305c, 0.07); this.pvRing.setStrokeStyle(1, 0x665676, 0.22);
      return;
    }
    const result = SpellBuilder.build(this.sC, this.sF, this.sP, this.sS);
    if (result.success && result.spell) {
      const s = result.spell; this.spell = s;
      const hex = '#' + s.visual.color.toString(16).padStart(6, '0');
      this.pvName.setText(s.name).setColor(hex);
      this.tweens.add({ targets: this.pvName, alpha: { from: 0.35, to: 1 }, duration: 200 });
      this.pvOrb.setFillStyle(s.visual.color, 0.34).setStrokeStyle(2, s.visual.color, 0.72);
      this.pvGlow.setFillStyle(s.visual.color, 0.16); this.pvRing.setStrokeStyle(1, s.visual.color, 0.38);
      this.statManaVal.setText(String(s.manaCost)); this.statCdVal.setText(`${(s.cooldown / 1000).toFixed(2)}s`);
      const eff = s.statusEffect.type !== 'none' ? s.statusEffect.type.toUpperCase() : '—';
      this.extraStatsTxt.setText(`DAMAGE  ${s.damage}     TARGET  ${s.targetingType}\nSTATUS  ${eff}`);
      this.pvError.setAlpha(0);
      const theme = getCoreTheme(s.core.id);
      this.particleTimer = this.time.addEvent({ delay: 220, loop: true, callback: () => { if (!this.pvOrb.active) return; const m = this.pvOrb.getWorldTransformMatrix(); theme.spawnAmbientParticle(this, m.tx, m.ty, s.visual); } });
    } else {
      this.spell = null; this.pvName.setText('INVALID RITUAL').setColor('#e16a78');
      this.statManaVal.setText('—'); this.statCdVal.setText('—'); this.extraStatsTxt.setText('');
      this.pvError.setText(result.error + (result.suggestion ? '\n' + result.suggestion : '')).setAlpha(1);
      this.pvOrb.setFillStyle(0x442027, 0.25).setStrokeStyle(1.5, 0x914652, 0.55);
      this.pvGlow.setFillStyle(0x4c1824, 0.08); this.pvRing.setStrokeStyle(1, 0x71343f, 0.32);
    }
  }

  private refreshPrepare(): void {
    if (this.prepTween) { this.prepTween.stop(); this.prepTween = null; }
    if (this.spell) {
      this.prepBtn.setFillStyle(0x2a151d, 0.78).setStrokeStyle(1.5, OC.crimsonBright, 0.72);
      this.prepTxt.setColor('#ffd3d8'); this.prepReason.setText('BIND THIS RITUAL TO SLOT ' + (this.slot + 1));
      this.prepGlow.setAlpha(0.42);
      this.prepTween = this.tweens.add({ targets: this.prepGlow, alpha: { from: 0.28, to: 0.62 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {
      this.prepBtn.setFillStyle(OC.panel2, 0.62).setStrokeStyle(1, 0x51485f, 0.3);
      this.prepTxt.setColor('#6e6875'); this.prepGlow.setAlpha(0);
      this.prepReason.setText(this.sC && this.sF ? 'This ritual cannot be forged.' : 'Choose an Essence and Delivery.');
    }
  }

  private refreshLoadout(): void {
    for (let i = 0; i < this.loadoutCards.length; i++) {
      const lc = this.loadoutCards[i], a = i === this.slot, sp = this.gs.slots[i]?.spell;
      lc.nameTxt.setText(sp ? sp.name : 'Empty').setColor(a ? '#e2e7ff' : sp ? '#aeb9d0' : '#666173');
      lc.manaTxt.setText(sp ? `${sp.manaCost} MP` : '');
      lc.bg.setFillStyle(a ? 0x1c1830 : OC.panel2, a ? 0.8 : 0.62);
      lc.border.setStrokeStyle(a ? 1.5 : 1, a ? OC.purpleBright : 0x51485f, a ? 0.72 : 0.3);
      lc.glow.setAlpha(a ? 0.45 : 0);
    }
  }

  private refreshRecent(): void {
    for (let i = 0; i < this.recentCards.length; i++) {
      const rc = this.recentCards[i], e = this.recentSpells[i];
      if (e) { rc.numTxt.setText('★'); rc.nameTxt.setText(e.name).setColor('#' + e.color.toString(16).padStart(6, '0')); rc.manaTxt.setText(`${e.manaCost} MP`); rc.border.setStrokeStyle(1, e.color, 0.4); }
      else { rc.numTxt.setText(''); rc.nameTxt.setText('—').setColor('#55505f'); rc.manaTxt.setText(''); rc.border.setStrokeStyle(1, 0x44404d, 0.2); }
    }
  }

  // ── Actions ───────────────────────────────────────────────────────────

  private doPrepare(): void {
    if (!this.sC || !this.sF || !this.spell) return;
    // Record recent
    const entry: RecentEntry = { name: this.spell.name, color: this.spell.visual.color, manaCost: this.spell.manaCost, sP: this.sP, sC: this.sC, sF: this.sF, sS: this.sS };
    this.recentSpells = this.recentSpells.filter(e => !(e.sP === entry.sP && e.sC === entry.sC && e.sF === entry.sF && e.sS === entry.sS));
    this.recentSpells.unshift(entry);
    if (this.recentSpells.length > SPELL_SLOT_COUNT) this.recentSpells.length = SPELL_SLOT_COUNT;
    // Assign
    this.gs.assignToSlot(this.slot, this.sC, this.sF, this.sP, this.sS);
    this.gs.setActiveSlot(this.slot);
    this.scene.get('GameScene').events.emit('spell-slots-updated');
    this.doClose();
  }

  doClose(): void {
    if (this.particleTimer) { this.particleTimer.destroy(); this.particleTimer = null; }
    if (this.prepTween) { this.prepTween.stop(); this.prepTween = null; }
    const gs = this.scene.get('GameScene') as unknown as { forceCloseGrimoire: () => void };
    if (gs?.forceCloseGrimoire) gs.forceCloseGrimoire();
  }
}