// src/scenes/GrimoireScene.ts
//
// VISUAL / UX REDESIGN ONLY.
//
// SpellBuilder, SpellValidator, spell component data, combat behavior,
// mana/cooldown/balance, and the underlying spell system are untouched.
//
// This scene is intentionally:
// - NO vertical scrolling
// - NO horizontal scrolling
// - NO nested scrolling
// - responsive
// - dynamically reflowed
// - optimized for fast real-time combat decisions
// - themed around a dark roguelike / occult / demonic grimoire aesthetic

import Phaser from 'phaser';
import { GrimoireSystem } from '../systems/GrimoireSystem';
import { SpellBuilder, Spell } from '../systems/SpellBuilder';
import { SpellValidator } from '../systems/SpellValidator';

import {
  CoreId,
  FormId,
  PrefixId,
  SuffixId,
  CORE_REGISTRY,
  FORM_REGISTRY,
  PREFIX_REGISTRY,
  SUFFIX_REGISTRY,
  getAllCoreIds,
  getAllFormIds,
  getAllPrefixIds,
  getAllSuffixIds,
} from '../config/spellComponents';

import {
  ROOM_WIDTH,
  ROOM_HEIGHT,
  SPELL_SLOT_COUNT,
} from '../config/constants';

import {
  uiText,
  applyTextShadow,
  createGlassPanel,
  GLASS,
} from '../config/uiStyles';

import { getCoreTheme } from '../visuals/CoreVisualTheme';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

type CompItem = {
  id: string | null;
  name: string;
  mana: number;
  color: number;
  desc: string;
};

interface CompCard {
  id: string | null;
  category: 'prefix' | 'core' | 'form' | 'suffix';

  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;

  icon: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
  sub: Phaser.GameObjects.Text;

  check: Phaser.GameObjects.Text;
  lock: Phaser.GameObjects.Text;

  color: number;
  desc: string;
  lockReason: string;
  locked: boolean;

  baseW: number;
  baseH: number;
}

interface ChainSlot {
  box: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  value: Phaser.GameObjects.Text;
}

interface LoadoutCard {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  border: Phaser.GameObjects.Rectangle;
  numTxt: Phaser.GameObjects.Text;
  nameTxt: Phaser.GameObjects.Text;
  manaTxt: Phaser.GameObjects.Text;
  glow: Phaser.GameObjects.Rectangle;
}

interface RecentEntry {
  name: string;
  color: number;
  manaCost: number;
  sP: PrefixId | null;
  sC: CoreId;
  sF: FormId;
  sS: SuffixId | null;
}

// ═══════════════════════════════════════════════════════════════════════
// OCCULT PALETTE
// ═══════════════════════════════════════════════════════════════════════

const OCCULT = {
  void: 0x07050c,
  panel: 0x0d0915,
  panel2: 0x110c1b,

  purple: 0x8f6bc2,
  purpleBright: 0xbda1f4,

  crimson: 0x9c384c,
  crimsonBright: 0xe16a78,

  blood: 0x6d202d,

  gold: 0xc39b58,
  goldBright: 0xe4c47a,

  bone: 0xd8d0c2,
  muted: 0x777185,
  dim: 0x4b4655,

  green: 0x70b67a,
  blue: 0x7194cc,

  black: 0x020106,
};

// ═══════════════════════════════════════════════════════════════════════
// SYMBOL HELPERS
// ═══════════════════════════════════════════════════════════════════════

function formSymbol(id: string, name: string): string {
  const n = (name || id || '').toLowerCase();

  if (
    n.includes('blade') ||
    n.includes('slash') ||
    n.includes('sword')
  ) return '⚔';

  if (
    n.includes('beam') ||
    n.includes('ray') ||
    n.includes('lance')
  ) return '➳';

  if (
    n.includes('orb') ||
    n.includes('sphere') ||
    n.includes('ball')
  ) return '●';

  if (
    n.includes('mine') ||
    n.includes('trap') ||
    n.includes('rune')
  ) return '◆';

  if (
    n.includes('nova') ||
    n.includes('burst') ||
    n.includes('blast')
  ) return '✺';

  return '◇';
}

function coreSymbol(id: string, name: string): string {
  const n = (name || id || '').toLowerCase();

  if (
    n.includes('fire') ||
    n.includes('flame') ||
    n.includes('ember')
  ) return '🜂';

  if (
    n.includes('ice') ||
    n.includes('frost') ||
    n.includes('cold')
  ) return '❄';

  if (
    n.includes('wind') ||
    n.includes('air') ||
    n.includes('gale')
  ) return '≋';

  if (
    n.includes('storm') ||
    n.includes('lightning') ||
    n.includes('electric') ||
    n.includes('thunder')
  ) return '⚡';

  if (
    n.includes('cosmic') ||
    n.includes('void') ||
    n.includes('star') ||
    n.includes('astral')
  ) return '✦';

  return '◈';
}

// Prefix / suffix deliberately use DIFFERENT marks.
// They no longer rely on identical generic icons.

const PREFIX_SYMBOL = '⌁';
const SUFFIX_SYMBOL = '✦';

// ═══════════════════════════════════════════════════════════════════════
// SCENE
// ═══════════════════════════════════════════════════════════════════════

export class GrimoireScene extends Phaser.Scene {
  private gs!: GrimoireSystem;
  private slot = 0;

  // ── Selections ──────────────────────────────────────────────────────

  private sP: PrefixId | null = null;
  private sC: CoreId | null = null;
  private sF: FormId | null = null;
  private sS: SuffixId | null = null;

  private spell: Spell | null = null;

  // ── Component cards ─────────────────────────────────────────────────

  private prefCards: CompCard[] = [];
  private coreCards: CompCard[] = [];
  private formCards: CompCard[] = [];
  private sufCards: CompCard[] = [];

  // ── Forge chain ─────────────────────────────────────────────────────

  private chain: ChainSlot[] = [];

  // ── Preview ─────────────────────────────────────────────────────────

  private pvGlow!: Phaser.GameObjects.Arc;
  private pvOrb!: Phaser.GameObjects.Arc;
  private pvRing!: Phaser.GameObjects.Arc;

  private pvName!: Phaser.GameObjects.Text;
  private pvError!: Phaser.GameObjects.Text;

  private particleTimer: Phaser.Time.TimerEvent | null = null;

  // ── Stats ───────────────────────────────────────────────────────────

  private statManaVal!: Phaser.GameObjects.Text;
  private statCdVal!: Phaser.GameObjects.Text;

  private statManaCard!: Phaser.GameObjects.Rectangle;
  private statCdCard!: Phaser.GameObjects.Rectangle;

  private extraStatsTxt!: Phaser.GameObjects.Text;

  // ── Loadout ─────────────────────────────────────────────────────────

  private loadoutCards: LoadoutCard[] = [];
  private recentCards: LoadoutCard[] = [];

  // Persists through scene restarts.
  private recentSpells: RecentEntry[] = [];

  // ── Forge button ───────────────────────────────────────────────────

  private prepBtn!: Phaser.GameObjects.Rectangle;
  private prepGlow!: Phaser.GameObjects.Rectangle;
  private prepTxt!: Phaser.GameObjects.Text;
  private prepReason!: Phaser.GameObjects.Text;

  private prepTween: Phaser.Tweens.Tween | null = null;

  // ── Tooltip ─────────────────────────────────────────────────────────

  private tooltipBg!: Phaser.GameObjects.Rectangle;
  private tooltipTitle!: Phaser.GameObjects.Text;
  private tooltipBody!: Phaser.GameObjects.Text;
  private tooltipContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'GrimoireScene' });
  }

  // ═════════════════════════════════════════════════════════════════════
  // INIT
  // ═════════════════════════════════════════════════════════════════════

  init(data: { grimoireSystem: GrimoireSystem }): void {
    this.gs = data.grimoireSystem;
    this.slot = this.gs.activeSlotIndex;

    const ex = this.gs.slots[this.slot]?.spell;

    if (ex) {
      this.sC = ex.core.id;
      this.sF = ex.form.id;
      this.sP = ex.prefix?.id as PrefixId ?? null;
      this.sS = ex.suffix?.id as SuffixId ?? null;
    } else {
      this.sP = null;
      this.sC = null;
      this.sF = null;
      this.sS = null;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // CREATE
  // ═════════════════════════════════════════════════════════════════════

  create(): void {
    this.prefCards = [];
    this.coreCards = [];
    this.formCards = [];
    this.sufCards = [];

    this.chain = [];

    this.loadoutCards = [];
    this.recentCards = [];

    this.spell = null;

    const W = ROOM_WIDTH;
    const H = ROOM_HEIGHT;

    const cx = W / 2;

    // ─────────────────────────────────────────────────────────────────
    // DARKEN WORLD
    // ─────────────────────────────────────────────────────────────────

    const overlay = this.add
      .rectangle(cx, H / 2, W, H, OCCULT.black, 0.48)
      .setDepth(200);

    overlay.setInteractive();

    // ─────────────────────────────────────────────────────────────────
    // MAIN PANEL
    // ─────────────────────────────────────────────────────────────────

    const panelW = Math.min(1240, W - 28);
    const panelH = Math.min(850, H - 28);

    const panelY = H / 2;

    this.add
      .rectangle(
        cx + 3,
        panelY + 4,
        panelW,
        panelH,
        0x000000,
        0.5,
      )
      .setDepth(201);

    createGlassPanel(
      this,
      cx,
      panelY,
      panelW,
      panelH,
      202,
      0.96,
    );

    // Inner occult frame.
    this.add
      .rectangle(
        cx,
        panelY,
        panelW - 10,
        panelH - 10,
        0,
        0,
      )
      .setDepth(203)
      .setStrokeStyle(
        1,
        OCCULT.purple,
        0.18,
      );

    // ─────────────────────────────────────────────────────────────────
    // HEADER
    // ─────────────────────────────────────────────────────────────────

    const titleY = panelY - panelH / 2 + 31;

    const title = this.add
      .text(
        cx,
        titleY,
        'GRIMOIRE',
        uiText(25, '#e6dcf5', true),
      )
      .setOrigin(0.5)
      .setDepth(210);

    applyTextShadow(title);

    const subtitle = this.add
      .text(
        cx,
        titleY + 25,
        'THE FORBIDDEN ARTS',
        uiText(10, '#806c9c', true),
      )
      .setOrigin(0.5)
      .setDepth(210);

    applyTextShadow(subtitle);

    // Small occult ornaments instead of a long divider line.
    const ornamentLeft = this.add
      .text(
        cx - 145,
        titleY + 25,
        '◈',
        uiText(8, '#6e4d83', true),
      )
      .setOrigin(0.5)
      .setDepth(211);

    const ornamentRight = this.add
      .text(
        cx + 145,
        titleY + 25,
        '◈',
        uiText(8, '#6e4d83', true),
      )
      .setOrigin(0.5)
      .setDepth(211);

    applyTextShadow(ornamentLeft);
    applyTextShadow(ornamentRight);

    // NO horizontal section separator under component labels.

    // ─────────────────────────────────────────────────────────────────
    // CLOSE
    // ─────────────────────────────────────────────────────────────────

    const clX = cx + panelW / 2 - 27;
    const clY = panelY - panelH / 2 + 27;

    const clBtn = this.add
      .circle(
        clX,
        clY,
        14,
        0x260d18,
        0.85,
      )
      .setDepth(230);

    clBtn
      .setStrokeStyle(1, OCCULT.crimsonBright, 0.45)
      .setInteractive({
        useHandCursor: true,
      });

    const clTxt = this.add
      .text(
        clX,
        clY,
        '✕',
        uiText(12, '#d17b87', true),
      )
      .setOrigin(0.5)
      .setDepth(231);

    applyTextShadow(clTxt);

    clBtn.on(
      'pointerover',
      () => clBtn.setFillStyle(0x3a121d, 0.95),
    );

    clBtn.on(
      'pointerout',
      () => clBtn.setFillStyle(0x260d18, 0.85),
    );

    clBtn.on(
      'pointerdown',
      () => this.doClose(),
    );

    // ─────────────────────────────────────────────────────────────────
    // CONTENT AREA
    // ─────────────────────────────────────────────────────────────────

    const contentTop =
      titleY + 48;

    const contentBottom =
      panelY + panelH / 2 - 42;

    const contentLeft =
      cx - panelW / 2 + 22;

    const contentRight =
      cx + panelW / 2 - 22;

    const contentW =
      contentRight - contentLeft;

    // ─────────────────────────────────────────────────────────────────
    // RESPONSIVE THREE-COLUMN LAYOUT
    // ─────────────────────────────────────────────────────────────────

    const columnGap = 18;

    const leftW = Math.floor(contentW * 0.30);
    const centerW = Math.floor(contentW * 0.42);

    const rightW =
      contentW -
      leftW -
      centerW -
      columnGap * 2;

    const leftX = contentLeft;

    const centerX =
      leftX + leftW + columnGap;

    const rightX =
      centerX + centerW + columnGap;

    // Subtle vertical separators only between major columns.
    // These are intentionally short and low contrast.
    this.add
      .rectangle(
        leftX + leftW + columnGap / 2,
        (contentTop + contentBottom) / 2,
        1,
        contentBottom - contentTop - 18,
        OCCULT.purple,
        0.11,
      )
      .setDepth(209);

    this.add
      .rectangle(
        centerX + centerW + columnGap / 2,
        (contentTop + contentBottom) / 2,
        1,
        contentBottom - contentTop - 18,
        OCCULT.purple,
        0.11,
      )
      .setDepth(209);

    // ─────────────────────────────────────────────────────────────────
    // TOOLTIP
    // ─────────────────────────────────────────────────────────────────

    this.buildTooltip();

    // ─────────────────────────────────────────────────────────────────
    // LEFT COMPONENTS
    // ─────────────────────────────────────────────────────────────────

    this.buildComponentArea(
      leftX,
      contentTop,
      leftW,
      contentBottom - contentTop,
    );

    // ─────────────────────────────────────────────────────────────────
    // CENTER
    // ─────────────────────────────────────────────────────────────────

    this.buildForgeCenter(
      centerX,
      contentTop,
      centerW,
      contentBottom - contentTop,
    );

    // ─────────────────────────────────────────────────────────────────
    // RIGHT
    // ─────────────────────────────────────────────────────────────────

    this.buildLoadoutAndForge(
      rightX,
      contentTop,
      rightW,
      contentBottom - contentTop,
    );

    // ─────────────────────────────────────────────────────────────────
    // FOOTER
    // ─────────────────────────────────────────────────────────────────

    const hint = this.add
      .text(
        contentRight,
        panelY + panelH / 2 - 17,
        'TAB / ESC  CLOSE',
        uiText(9, '#62586d'),
      )
      .setOrigin(1, 0.5)
      .setDepth(210);

    applyTextShadow(hint);

    this.refresh();
  }

  // ═════════════════════════════════════════════════════════════════════
  // TOOLTIP
  // ═════════════════════════════════════════════════════════════════════

  private buildTooltip(): void {
    this.tooltipContainer = this.add
      .container(0, 0)
      .setDepth(500)
      .setAlpha(0);

    this.tooltipBg = this.add
      .rectangle(
        0,
        0,
        210,
        60,
        OCCULT.panel,
        0.98,
      )
      .setOrigin(0, 0);

    this.tooltipBg.setStrokeStyle(
      1,
      OCCULT.purple,
      0.55,
    );

    this.tooltipTitle = this.add
      .text(
        9,
        7,
        '',
        uiText(11, '#e0d0ff', true),
      )
      .setOrigin(0, 0);

    this.tooltipBody = this.add
      .text(
        9,
        24,
        '',
        {
          ...uiText(9, '#aaa0bd'),
          wordWrap: {
            width: 190,
          },
        },
      )
      .setOrigin(0, 0);

    applyTextShadow(this.tooltipTitle);
    applyTextShadow(this.tooltipBody);

    this.tooltipContainer.add([
      this.tooltipBg,
      this.tooltipTitle,
      this.tooltipBody,
    ]);
  }

  private showTooltip(
    x: number,
    y: number,
    title: string,
    body: string,
    accent: number,
  ): void {
    this.tooltipTitle.setText(title);

    this.tooltipTitle.setColor(
      '#' + accent.toString(16).padStart(6, '0'),
    );

    this.tooltipBody.setText(body);

    const tooltipW = 210;
    const h = 30 + this.tooltipBody.height + 10;

    this.tooltipBg.setSize(
      tooltipW,
      h,
    );

    this.tooltipBg.setStrokeStyle(
      1,
      accent,
      0.55,
    );

    let tx = x;
    let ty = y;

    if (
      tx + tooltipW >
      ROOM_WIDTH - 8
    ) {
      tx =
        ROOM_WIDTH -
        8 -
        tooltipW;
    }

    if (tx < 8) {
      tx = 8;
    }

    if (
      ty + h >
      ROOM_HEIGHT - 8
    ) {
      ty =
        ROOM_HEIGHT -
        8 -
        h;
    }

    if (ty < 8) {
      ty = 8;
    }

    this.tooltipContainer
      .setPosition(tx, ty)
      .setAlpha(1);
  }

  private hideTooltip(): void {
    this.tooltipContainer.setAlpha(0);
  }

  // ═════════════════════════════════════════════════════════════════════
  // LEFT COMPONENT AREA
  // ═════════════════════════════════════════════════════════════════════

  private buildComponentArea(
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const availableSections: Array<{
      label: string;
      color: string;
      category: CompCard['category'];
      items: CompItem[];
      array: CompCard[];
      callback: (id: string | null) => void;
    }> = [];

    const prefixes = this.getPrefixItems();
    const cores = this.getCoreItems();
    const forms = this.getFormItems();
    const suffixes = this.getSuffixItems();

    // Optional categories disappear completely if unavailable.
    //
    // Prefix / suffix include None entries, so they are considered
    // available only if there is an actual component.
    if (prefixes.length > 1) {
      availableSections.push({
        label: 'PREFIX',
        color: '#7fc48b',
        category: 'prefix',
        items: prefixes,
        array: this.prefCards,
        callback: (id) => {
          this.sP = id as PrefixId | null;
          this.refresh();
        },
      });
    }

    if (cores.length > 0) {
      availableSections.push({
        label: 'CORE',
        color: '#dba05d',
        category: 'core',
        items: cores,
        array: this.coreCards,
        callback: (id) => {
          this.sC = id as CoreId | null;
          this.refresh();
        },
      });
    }

    if (forms.length > 0) {
      availableSections.push({
        label: 'FORM',
        color: '#8e8ee2',
        category: 'form',
        items: forms,
        array: this.formCards,
        callback: (id) => {
          this.sF = id as FormId | null;
          this.refresh();
        },
      });
    }

    if (suffixes.length > 1) {
      availableSections.push({
        label: 'SUFFIX',
        color: '#d2b06b',
        category: 'suffix',
        items: suffixes,
        array: this.sufCards,
        callback: (id) => {
          this.sS = id as SuffixId | null;
          this.refresh();
        },
      });
    }

    if (availableSections.length === 0) {
      return;
    }

    const sectionGap = 9;

    const totalGap =
      sectionGap *
      Math.max(
        0,
        availableSections.length - 1,
      );

    const sectionH =
      (h - totalGap) /
      availableSections.length;

    let currentY = y;

    for (const section of availableSections) {
      this.buildComponentSection(
        x,
        currentY,
        w,
        sectionH,
        section.label,
        section.color,
        section.category,
        section.items,
        section.callback,
        section.array,
      );

      currentY += sectionH + sectionGap;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // COMPONENT SECTION
  // ═════════════════════════════════════════════════════════════════════

  private buildComponentSection(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    labelColor: string,
    category: CompCard['category'],
    items: CompItem[],
    onSelect: (id: string | null) => void,
    cardArray: CompCard[],
  ): void {
    // Section frame.
    const accent =
      Phaser.Display.Color.HexStringToColor(
        labelColor,
      ).color;

    this.add
      .rectangle(
        x + w / 2,
        y + h / 2,
        w,
        h,
        OCCULT.panel,
        0.48,
      )
      .setDepth(205)
      .setStrokeStyle(
        1,
        accent,
        0.14,
      );

    // Section title.
    const lbl = this.add
      .text(
        x + 9,
        y + 7,
        label,
        uiText(13, labelColor, true),
      )
      .setDepth(212);

    applyTextShadow(lbl);

    // Small category descriptor.
    const descriptor =
      category === 'prefix'
        ? 'MODIFIER'
        : category === 'core'
          ? 'ESSENCE'
          : category === 'form'
            ? 'DELIVERY'
            : 'TWIST';

    const descTxt = this.add
      .text(
        x + w - 9,
        y + 9,
        descriptor,
        uiText(7, '#635a6d', true),
      )
      .setOrigin(1, 0)
      .setDepth(212);

    applyTextShadow(descTxt);

    // No ugly horizontal divider here.

    const topPadding = 29;
    const bottomPadding = 7;
    const horizontalPadding = 8;

    const availableW =
      w -
      horizontalPadding * 2;

    const availableH =
      h -
      topPadding -
      bottomPadding;

    // Dynamic wrapping.
    //
    // We choose the number of columns based on the available width
    // and a sensible minimum card width.
    const minCardW = 62;
    const maxCardW = 105;
    const gap = 6;

    let columns = Math.max(
      1,
      Math.floor(
        (availableW + gap) /
        (minCardW + gap),
      ),
    );

    // Avoid unnecessarily tiny cards.
    columns = Math.min(
      columns,
      items.length,
    );

    const rows = Math.ceil(
      items.length / columns,
    );

    let cardW =
      (availableW -
        gap * (columns - 1)) /
      columns;

    cardW = Phaser.Math.Clamp(
      cardW,
      minCardW,
      maxCardW,
    );

    // If max width leaves unused room, center the grid.
    const actualGridW =
      columns * cardW +
      (columns - 1) * gap;

    const gridX =
      x +
      (w - actualGridW) / 2;

    const minCardH = 47;
    const maxCardH = 72;

    let cardH =
      (availableH -
        gap * (rows - 1)) /
      rows;

    cardH = Phaser.Math.Clamp(
      cardH,
      minCardH,
      maxCardH,
    );

    const actualGridH =
      rows * cardH +
      (rows - 1) * gap;

    const gridY =
      y +
      topPadding +
      Math.max(
        0,
        (availableH - actualGridH) / 2,
      );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      const row =
        Math.floor(i / columns);

      const col =
        i % columns;

      const bx =
        gridX +
        col * (cardW + gap) +
        cardW / 2;

      const by =
        gridY +
        row * (cardH + gap) +
        cardH / 2;

      this.buildCompCard(
        bx,
        by,
        cardW,
        cardH,
        item,
        category,
        onSelect,
        cardArray,
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // COMPONENT CARD
  // ═════════════════════════════════════════════════════════════════════

  private buildCompCard(
    bx: number,
    by: number,
    w: number,
    h: number,
    item: CompItem,
    category: CompCard['category'],
    onSelect: (id: string | null) => void,
    cardArray: CompCard[],
  ): void {
    const container =
      this.add
        .container(bx, by)
        .setDepth(215);

    const bg =
      this.add
        .rectangle(
          0,
          0,
          w,
          h,
          OCCULT.panel2,
          0.72,
        )
        .setOrigin(0.5);

    const border =
      this.add
        .rectangle(
          0,
          0,
          w,
          h,
          0,
          0,
        )
        .setOrigin(0.5);

    border.setStrokeStyle(
      1,
      item.color,
      0.22,
    );

    // ─────────────────────────────────────────────────────────────────
    // CATEGORY-SPECIFIC VISUAL LANGUAGE
    // ─────────────────────────────────────────────────────────────────

    let symbol = '◇';

    if (item.id === null) {
      symbol = '—';
    } else if (category === 'core') {
      symbol = coreSymbol(
        item.id,
        item.name,
      );
    } else if (category === 'form') {
      symbol = formSymbol(
        item.id,
        item.name,
      );
    } else if (category === 'prefix') {
      symbol = PREFIX_SYMBOL;
    } else {
      symbol = SUFFIX_SYMBOL;
    }

    const iconSize =
      category === 'core' ||
      category === 'form'
        ? Math.min(
            20,
            Math.max(
              12,
              Math.floor(h * 0.29),
            ),
          )
        : Math.min(
            16,
            Math.max(
              11,
              Math.floor(h * 0.24),
            ),
          );

    const hex =
      '#' +
      item.color
        .toString(16)
        .padStart(6, '0');

    const icon =
      this.add
        .text(
          0,
          -h * 0.25,
          symbol,
          uiText(
            iconSize,
            item.id
              ? hex
              : '#686373',
            true,
          ),
        )
        .setOrigin(0.5);

    applyTextShadow(icon);

    // ─────────────────────────────────────────────────────────────────
    // DISPLAY NAME
    // ─────────────────────────────────────────────────────────────────
    //
    // "of ..." is stripped visually from suffixes only.
    // Registry data remains untouched.

    let displayName =
      item.name;

    if (
      category === 'suffix'
    ) {
      displayName =
        displayName
          .replace(/^of\s+/i, '')
          .trim();
    }

    const nameSize =
      w >= 92
        ? 11
        : w >= 72
          ? 10
          : 9;

    const nameTxt =
      this.add
        .text(
          0,
          h * 0.08,
          displayName,
          {
            ...uiText(
              nameSize,
              item.id
                ? hex
                : '#888494',
              true,
            ),
            align: 'center',
            wordWrap: {
              width: w - 10,
            },
          },
        )
        .setOrigin(0.5);

    applyTextShadow(nameTxt);

    // Mana.
    const subTxt =
      this.add
        .text(
          0,
          h / 2 - 9,
          item.id
            ? `+${item.mana} MP`
            : '',
          uiText(
            8,
            '#75889b',
            true,
          ),
        )
        .setOrigin(0.5);

    applyTextShadow(subTxt);

    // Selection marker.
    const check =
      this.add
        .text(
          w / 2 - 9,
          -h / 2 + 9,
          '◆',
          uiText(
            7,
            '#ffffff',
            true,
          ),
        )
        .setOrigin(0.5)
        .setAlpha(0);

    // Lock marker.
    const lock =
      this.add
        .text(
          w / 2 - 9,
          -h / 2 + 9,
          '⊘',
          uiText(
            9,
            '#a85e6c',
            true,
          ),
        )
        .setOrigin(0.5)
        .setAlpha(0);

    container.add([
      bg,
      border,
      icon,
      nameTxt,
      subTxt,
      check,
      lock,
    ]);

    bg.setInteractive({
      useHandCursor: true,
    });

    const card: CompCard = {
      id: item.id,
      category,

      container,
      bg,
      border,

      icon,
      name: nameTxt,
      sub: subTxt,

      check,
      lock,

      color: item.color,
      desc: item.desc,

      lockReason: '',
      locked: false,

      baseW: w,
      baseH: h,
    };

    // ─────────────────────────────────────────────────────────────────
    // HOVER
    // ─────────────────────────────────────────────────────────────────

    bg.on(
      'pointerover',
      () => {
        if (!card.locked) {
          this.tweens.add({
            targets: container,
            scaleX: 1.035,
            scaleY: 1.035,
            duration: 100,
            ease: 'Sine.Out',
          });

          border.setStrokeStyle(
            this.isSelected(card)
              ? 2
              : 1.5,
            this.isSelected(card)
              ? 0xffffff
              : card.color,
            this.isSelected(card)
              ? 0.9
              : 0.6,
          );
        }

        const world =
          container.getWorldTransformMatrix();

        const title =
          item.id
            ? displayName
            : 'None';

        const body =
          card.locked
            ? card.lockReason
            : item.desc || '';

        let tooltipX =
          world.tx -
          w / 2;

        const tooltipY =
          world.ty +
          h / 2 +
          7;

        if (
          tooltipX + 210 >
          ROOM_WIDTH - 8
        ) {
          tooltipX =
            ROOM_WIDTH -
            218;
        }

        this.showTooltip(
          tooltipX,
          tooltipY,
          title,
          body,
          card.color,
        );
      },
    );

    bg.on(
      'pointerout',
      () => {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
          ease: 'Sine.Out',
        });

        this.refreshOneCard(card);
        this.hideTooltip();
      },
    );

    bg.on(
      'pointerdown',
      () => {
        if (card.locked) {
          return;
        }

        onSelect(item.id);
      },
    );

    cardArray.push(card);
  }

  // ═════════════════════════════════════════════════════════════════════
  // SELECTION
  // ═════════════════════════════════════════════════════════════════════

  private isSelected(
    card: CompCard,
  ): boolean {
    if (
      card.category === 'prefix'
    ) {
      return this.sP === card.id;
    }

    if (
      card.category === 'core'
    ) {
      return this.sC === card.id;
    }

    if (
      card.category === 'form'
    ) {
      return this.sF === card.id;
    }

    return this.sS === card.id;
  }

  private refreshOneCard(
    card: CompCard,
  ): void {
    const selected =
      this.isSelected(card);

    card.bg.setFillStyle(
      card.locked
        ? 0x09070d
        : selected
          ? 0x24183a
          : OCCULT.panel2,
      card.locked
        ? 0.5
        : selected
          ? 0.9
          : 0.72,
    );

    card.border.setStrokeStyle(
      selected
        ? 2
        : 1,
      selected
        ? OCCULT.bone
        : card.color,
      card.locked
        ? 0.1
        : selected
          ? 0.9
          : 0.24,
    );

    card.icon.setAlpha(
      card.locked
        ? 0.28
        : 1,
    );

    card.name.setAlpha(
      card.locked
        ? 0.3
        : 1,
    );

    card.sub.setAlpha(
      card.locked
        ? 0.28
        : 1,
    );

    card.check.setAlpha(
      selected &&
      !card.locked
        ? 1
        : 0,
    );

    card.lock.setAlpha(
      card.locked
        ? 0.85
        : 0,
    );

    card.container.setScale(1);
  }

  // ═════════════════════════════════════════════════════════════════════
  // REGISTRY SOURCES
  // ═════════════════════════════════════════════════════════════════════

  private getPrefixItems(): CompItem[] {
    const items: CompItem[] = [
      {
        id: null,
        name: 'None',
        mana: 0,
        color: 0x666677,
        desc: 'No prefix applied.',
      },
    ];

    for (
      const id of getAllPrefixIds()
    ) {
      const p =
        PREFIX_REGISTRY[id];

      items.push({
        id,
        name: p.displayName,
        mana: p.manaCost,
        color: 0x88cc88,
        desc: p.description,
      });
    }

    return items;
  }

  private getCoreItems(): CompItem[] {
    const items: CompItem[] = [];

    for (
      const id of getAllCoreIds()
    ) {
      const c =
        CORE_REGISTRY[id];

      items.push({
        id,
        name: c.displayName,
        mana: c.manaCost,
        color: c.visual.color,
        desc: c.description,
      });
    }

    return items;
  }

  private getFormItems(): CompItem[] {
    const items: CompItem[] = [];

    for (
      const id of getAllFormIds()
    ) {
      const f =
        FORM_REGISTRY[id];

      items.push({
        id,
        name: f.displayName,
        mana: f.manaCost,
        color: 0x8888dd,
        desc: f.description,
      });
    }

    return items;
  }

  private getSuffixItems(): CompItem[] {
    const items: CompItem[] = [
      {
        id: null,
        name: 'None',
        mana: 0,
        color: 0x666677,
        desc: 'No suffix applied.',
      },
    ];

    for (
      const id of getAllSuffixIds()
    ) {
      const s =
        SUFFIX_REGISTRY[id];

      items.push({
        id,
        name: s.displayName,
        mana: s.manaCost,
        color: 0xccaa66,
        desc: s.description,
      });
    }

    return items;
  }

  // ═════════════════════════════════════════════════════════════════════
  // CENTER — SPELL FORGE
  // ═════════════════════════════════════════════════════════════════════

  private buildForgeCenter(
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const cx =
      x + w / 2;

    // ─────────────────────────────────────────────────────────────────
    // TITLE
    // ─────────────────────────────────────────────────────────────────

    const forgeTitle =
      this.add
        .text(
          cx,
          y + 4,
          'SPELL FORGE',
          uiText(
            14,
            '#c2b0df',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(212);

    applyTextShadow(forgeTitle);

    const forgeSub =
      this.add
        .text(
          cx,
          y + 22,
          'BIND THE FOUR ASPECTS',
          uiText(
            8,
            '#6c6178',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(212);

    applyTextShadow(forgeSub);

    // ─────────────────────────────────────────────────────────────────
    // SPELL CHAIN
    // ─────────────────────────────────────────────────────────────────

    const chainY =
      y + 57;

    const chainLabels = [
      'PREFIX',
      'CORE',
      'FORM',
      'SUFFIX',
    ];

    const chainGap = 10;

    const chainBoxW =
      (w -
        chainGap * 3) /
      4;

    const chainBoxH = 58;

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const bx =
        x +
        i *
          (chainBoxW +
            chainGap) +
        chainBoxW / 2;

      const box =
        this.add
          .rectangle(
            bx,
            chainY,
            chainBoxW,
            chainBoxH,
            OCCULT.panel2,
            0.72,
          )
          .setDepth(213);

      const border =
        this.add
          .rectangle(
            bx,
            chainY,
            chainBoxW,
            chainBoxH,
            0,
            0,
          )
          .setDepth(214)
          .setStrokeStyle(
            1,
            0x57506a,
            0.35,
          );

      const lbl =
        this.add
          .text(
            bx,
            chainY -
              chainBoxH / 2 -
              9,
            chainLabels[i],
            uiText(
              8,
              '#776b88',
              true,
            ),
          )
          .setOrigin(0.5)
          .setDepth(214);

      const val =
        this.add
          .text(
            bx,
            chainY,
            '—',
            {
              ...uiText(
                10,
                '#858097',
                true,
              ),
              align: 'center',
            },
          )
          .setOrigin(0.5)
          .setDepth(215);

      val.setWordWrapWidth(
        chainBoxW - 8,
        true,
      );

      applyTextShadow(lbl);
      applyTextShadow(val);

      this.chain.push({
        box,
        border,
        label: lbl,
        value: val,
      });

      if (i < 3) {
        const ax =
          bx +
          chainBoxW / 2 +
          chainGap / 2;

        const arrow =
          this.add
            .text(
              ax,
              chainY,
              '›',
              uiText(
                17,
                '#725b86',
                true,
              ),
            )
            .setOrigin(0.5)
            .setDepth(214);

        applyTextShadow(arrow);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // RITUAL PREVIEW
    // ─────────────────────────────────────────────────────────────────

    const previewY =
      chainY +
      chainBoxH / 2 +
      116;

    const radius =
      Math.min(
        78,
        w * 0.22,
        h * 0.16,
      );

    this.pvGlow =
      this.add
        .circle(
          cx,
          previewY,
          radius + 30,
          OCCULT.purple,
          0.06,
        )
        .setDepth(210);

    this.pvRing =
      this.add
        .circle(
          cx,
          previewY,
          radius + 17,
          0,
          0,
        )
        .setDepth(211)
        .setStrokeStyle(
          1,
          OCCULT.purple,
          0.25,
        );

    this.pvOrb =
      this.add
        .circle(
          cx,
          previewY,
          radius,
          0x2a2340,
          0.26,
        )
        .setDepth(212)
        .setStrokeStyle(
          2,
          OCCULT.purpleBright,
          0.4,
        );

    // Occult ring marks.
    const ritualMarks =
      this.add
        .text(
          cx,
          previewY,
          '◈',
          uiText(
            Math.max(
              24,
              radius * 0.55,
            ),
            '#8c6db5',
            true,
          ),
        )
        .setOrigin(0.5)
        .setAlpha(0.28)
        .setDepth(213);

    applyTextShadow(ritualMarks);

    this.tweens.add({
      targets: ritualMarks,
      angle: 360,
      duration: 16000,
      repeat: -1,
      ease: 'Linear',
    });

    // ─────────────────────────────────────────────────────────────────
    // SPELL NAME
    // ─────────────────────────────────────────────────────────────────

    const nameY =
      previewY +
      radius +
      31;

    this.pvName =
      this.add
        .text(
          cx,
          nameY,
          'SELECT CORE + FORM',
          {
            ...uiText(
              18,
              '#9090a4',
              true,
            ),
            align: 'center',
            wordWrap: {
              width: w - 18,
            },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(212);

    applyTextShadow(this.pvName);

    // ─────────────────────────────────────────────────────────────────
    // STATS
    // ─────────────────────────────────────────────────────────────────

    const statsY =
      nameY + 57;

    const statCardW =
      w * 0.43;

    const statCardH = 48;

    const statGap =
      w * 0.055;

    const manaCx =
      cx -
      statCardW / 2 -
      statGap / 2;

    const cdCx =
      cx +
      statCardW / 2 +
      statGap / 2;

    this.statManaCard =
      this.add
        .rectangle(
          manaCx,
          statsY,
          statCardW,
          statCardH,
          OCCULT.panel2,
          0.75,
        )
        .setDepth(212)
        .setStrokeStyle(
          1,
          OCCULT.blue,
          0.3,
        );

    const manaLbl =
      this.add
        .text(
          manaCx,
          statsY - 11,
          'MANA',
          uiText(
            8,
            '#7799cc',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(213);

    this.statManaVal =
      this.add
        .text(
          manaCx,
          statsY + 9,
          '—',
          uiText(
            15,
            '#d5e2ff',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(213);

    applyTextShadow(manaLbl);
    applyTextShadow(
      this.statManaVal,
    );

    this.statCdCard =
      this.add
        .rectangle(
          cdCx,
          statsY,
          statCardW,
          statCardH,
          OCCULT.panel2,
          0.75,
        )
        .setDepth(212)
        .setStrokeStyle(
          1,
          0x66b89e,
          0.3,
        );

    const cdLbl =
      this.add
        .text(
          cdCx,
          statsY - 11,
          'COOLDOWN',
          uiText(
            8,
            '#77c5aa',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(213);

    this.statCdVal =
      this.add
        .text(
          cdCx,
          statsY + 9,
          '—',
          uiText(
            15,
            '#cfffe8',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(213);

    applyTextShadow(cdLbl);
    applyTextShadow(
      this.statCdVal,
    );

    // ─────────────────────────────────────────────────────────────────
    // EXTRA SPELL INFORMATION
    // ─────────────────────────────────────────────────────────────────

    const extraY =
      statsY + 42;

    this.extraStatsTxt =
      this.add
        .text(
          cx,
          extraY,
          '',
          {
            ...uiText(
              10,
              '#a8a0b5',
            ),
            align: 'center',
            lineSpacing: 5,
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(212);

    applyTextShadow(
      this.extraStatsTxt,
    );

    // ─────────────────────────────────────────────────────────────────
    // ERROR
    // ─────────────────────────────────────────────────────────────────

    this.pvError =
      this.add
        .text(
          cx,
          extraY + 61,
          '',
          {
            ...uiText(
              10,
              '#e16a78',
              true,
            ),
            align: 'center',
            wordWrap: {
              width: w - 18,
            },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(212)
        .setAlpha(0);

    applyTextShadow(
      this.pvError,
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // RIGHT — ARSENAL / LOADOUT / FORGE
  // ═════════════════════════════════════════════════════════════════════

  private buildLoadoutAndForge(
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // ─────────────────────────────────────────────────────────────────
    // ARSENAL HEADER
    // ─────────────────────────────────────────────────────────────────

    const title =
      this.add
        .text(
          x,
          y + 2,
          'SPELL ARSENAL',
          uiText(
            14,
            '#c0afd9',
            true,
          ),
        )
        .setDepth(212);

    applyTextShadow(title);

    const subtitle =
      this.add
        .text(
          x,
          y + 20,
          'READY FOR BATTLE',
          uiText(
            8,
            '#685d74',
            true,
          ),
        )
        .setDepth(212);

    applyTextShadow(subtitle);

    // ─────────────────────────────────────────────────────────────────
    // LOADOUT CARDS
    // ─────────────────────────────────────────────────────────────────

    const cardH = 54;
    const cardGap = 7;

    const startY =
      y + 36;

    for (
      let i = 0;
      i < SPELL_SLOT_COUNT;
      i++
    ) {
      const cy =
        startY +
        i *
          (cardH +
            cardGap) +
        cardH / 2;

      const container =
        this.add
          .container(
            x + w / 2,
            cy,
          )
          .setDepth(215);

      const glow =
        this.add
          .rectangle(
            0,
            0,
            w + 8,
            cardH + 8,
            OCCULT.purple,
            0.08,
          )
          .setAlpha(0);

      const bg =
        this.add
          .rectangle(
            0,
            0,
            w,
            cardH,
            OCCULT.panel2,
            0.62,
          );

      const border =
        this.add
          .rectangle(
            0,
            0,
            w,
            cardH,
            0,
            0,
          )
          .setStrokeStyle(
            1,
            0x51485f,
            0.38,
          );

      bg.setInteractive({
        useHandCursor: true,
      });

      const numTxt =
        this.add
          .text(
            -w / 2 + 16,
            0,
            String(i + 1),
            uiText(
              15,
              '#9c8fc0',
              true,
            ),
          )
          .setOrigin(0.5);

      const nameTxt =
        this.add
          .text(
            -w / 2 + 34,
            -8,
            `Slot ${i + 1}`,
            uiText(
              11,
              '#aeb8d0',
              true,
            ),
          )
          .setOrigin(0, 0.5)
          .setWordWrapWidth(
            w - 48,
          );

      const manaTxt =
        this.add
          .text(
            -w / 2 + 34,
            11,
            '',
            uiText(
              9,
              '#75899d',
              true,
            ),
          )
          .setOrigin(0, 0.5);

      applyTextShadow(numTxt);
      applyTextShadow(nameTxt);
      applyTextShadow(manaTxt);

      container.add([
        glow,
        bg,
        border,
        numTxt,
        nameTxt,
        manaTxt,
      ]);

      bg.on(
        'pointerover',
        () => {
          bg.setFillStyle(
            0x211932,
            0.8,
          );
        },
      );

      bg.on(
        'pointerout',
        () => {
          const active =
            i === this.slot;

          bg.setFillStyle(
            active
              ? 0x1b1730
              : OCCULT.panel2,
            active
              ? 0.78
              : 0.62,
          );
        },
      );

      bg.on(
        'pointerdown',
        () => {
          this.slot = i;

          const sl =
            this.gs.slots[i]?.spell;

          if (sl) {
            this.sC =
              sl.core.id;

            this.sF =
              sl.form.id;

            this.sP =
              sl.prefix?.id as
                PrefixId ??
              null;

            this.sS =
              sl.suffix?.id as
                SuffixId ??
              null;
          } else {
            this.sP = null;
            this.sC = null;
            this.sF = null;
            this.sS = null;
          }

          this.refresh();
        },
      );

      this.loadoutCards.push({
        container,
        bg,
        border,
        numTxt,
        nameTxt,
        manaTxt,
        glow,
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // FORGE BUTTON
    // ─────────────────────────────────────────────────────────────────

    const btnY =
      startY +
      SPELL_SLOT_COUNT *
        (cardH +
          cardGap) +
      27;

    const btnH = 60;

    const btnCx =
      x + w / 2;

    this.prepGlow =
      this.add
        .rectangle(
          btnCx,
          btnY,
          w + 12,
          btnH + 12,
          OCCULT.crimson,
          0.09,
        )
        .setDepth(214)
        .setAlpha(0);

    this.prepBtn =
      this.add
        .rectangle(
          btnCx,
          btnY,
          w,
          btnH,
          OCCULT.panel2,
          0.7,
        )
        .setDepth(215)
        .setStrokeStyle(
          1,
          0x574b61,
          0.4,
        );

    this.prepBtn.setInteractive({
      useHandCursor: true,
    });

    this.prepTxt =
      this.add
        .text(
          btnCx,
          btnY - 4,
          'FORGE SPELL',
          uiText(
            15,
            '#777080',
            true,
          ),
        )
        .setOrigin(0.5)
        .setDepth(216);

    applyTextShadow(
      this.prepTxt,
    );

    this.prepReason =
      this.add
        .text(
          btnCx,
          btnY +
            btnH / 2 +
            10,
          '',
          {
            ...uiText(
              9,
              '#8e6870',
            ),
            align: 'center',
            wordWrap: {
              width: w,
            },
          },
        )
        .setOrigin(0.5, 0)
        .setDepth(215);

    applyTextShadow(
      this.prepReason,
    );

    this.prepBtn.on(
      'pointerover',
      () => {
        if (!this.spell) {
          return;
        }

        this.prepBtn.setFillStyle(
          0x351a23,
          0.9,
        );

        this.tweens.add({
          targets: this.prepBtn,
          scaleX: 1.02,
          scaleY: 1.04,
          duration: 100,
        });
      },
    );

    this.prepBtn.on(
      'pointerout',
      () => {
        this.prepBtn.setFillStyle(
          this.spell
            ? 0x29151d
            : OCCULT.panel2,
          this.spell
            ? 0.75
            : 0.7,
        );

        this.tweens.add({
          targets: this.prepBtn,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
        });
      },
    );

    this.prepBtn.on(
      'pointerdown',
      () => {
        if (this.spell) {
          this.doPrepare();
        }
      },
    );

    // ─────────────────────────────────────────────────────────────────
    // RECENT
    // ─────────────────────────────────────────────────────────────────

    const recentTitleY =
      btnY +
      btnH / 2 +
      43;

    const recentTitle =
      this.add
        .text(
          x,
          recentTitleY,
          'RECENT',
          uiText(
            13,
            '#a495ba',
            true,
          ),
        )
        .setDepth(212);

    applyTextShadow(
      recentTitle,
    );

    const recentHint =
      this.add
        .text(
          x + w,
          recentTitleY + 2,
          'RECALL',
          uiText(
            7,
            '#5f566a',
            true,
          ),
        )
        .setOrigin(1, 0)
        .setDepth(212);

    applyTextShadow(
      recentHint,
    );

    const rCardH = 38;
    const rCardGap = 6;

    const rStartY =
      recentTitleY + 24;

    const recentCount =
      SPELL_SLOT_COUNT;

    for (
      let i = 0;
      i < recentCount;
      i++
    ) {
      const cy =
        rStartY +
        i *
          (rCardH +
            rCardGap) +
        rCardH / 2;

      const container =
        this.add
          .container(
            x + w / 2,
            cy,
          )
          .setDepth(215);

      const glow =
        this.add
          .rectangle(
            0,
            0,
            w + 6,
            rCardH + 6,
            OCCULT.gold,
            0.06,
          )
          .setAlpha(0);

      const bg =
        this.add
          .rectangle(
            0,
            0,
            w,
            rCardH,
            0x09070e,
            0.58,
          );

      const border =
        this.add
          .rectangle(
            0,
            0,
            w,
            rCardH,
            0,
            0,
          )
          .setStrokeStyle(
            1,
            0x51485f,
            0.24,
          );

      bg.setInteractive({
        useHandCursor: true,
      });

      const numTxt =
        this.add
          .text(
            -w / 2 + 13,
            0,
            '',
            uiText(
              11,
              '#c7aa69',
              true,
            ),
          )
          .setOrigin(0.5);

      const nameTxt =
        this.add
          .text(
            -w / 2 + 28,
            0,
            '—',
            uiText(
              10,
              '#9ba5ba',
              true,
            ),
          )
          .setOrigin(0, 0.5)
          .setWordWrapWidth(
            w - 70,
          );

      const manaTxt =
        this.add
          .text(
            w / 2 - 10,
            0,
            '',
            uiText(
              9,
              '#75899d',
              true,
            ),
          )
          .setOrigin(1, 0.5);

      applyTextShadow(numTxt);
      applyTextShadow(nameTxt);
      applyTextShadow(manaTxt);

      container.add([
        glow,
        bg,
        border,
        numTxt,
        nameTxt,
        manaTxt,
      ]);

      bg.on(
        'pointerover',
        () => {
          if (
            this.recentSpells[i]
          ) {
            bg.setFillStyle(
              0x211932,
              0.78,
            );
          }
        },
      );

      bg.on(
        'pointerout',
        () => {
          bg.setFillStyle(
            0x09070e,
            0.58,
          );
        },
      );

      bg.on(
        'pointerdown',
        () => {
          const entry =
            this.recentSpells[i];

          if (!entry) {
            return;
          }

          this.sP =
            entry.sP;

          this.sC =
            entry.sC;

          this.sF =
            entry.sF;

          this.sS =
            entry.sS;

          this.refresh();
        },
      );

      this.recentCards.push({
        container,
        bg,
        border,
        numTxt,
        nameTxt,
        manaTxt,
        glow,
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // REFRESH
  // ═════════════════════════════════════════════════════════════════════

  private refresh(): void {
    this.refreshCompatibility();

    for (
      const c of this.prefCards
    ) {
      this.refreshOneCard(c);
    }

    for (
      const c of this.coreCards
    ) {
      this.refreshOneCard(c);
    }

    for (
      const c of this.formCards
    ) {
      this.refreshOneCard(c);
    }

    for (
      const c of this.sufCards
    ) {
      this.refreshOneCard(c);
    }

    this.refreshChain();
    this.refreshPreview();
    this.refreshPrepare();
    this.refreshLoadout();
    this.refreshRecent();
  }

  // ═════════════════════════════════════════════════════════════════════
  // CHAIN
  // ═════════════════════════════════════════════════════════════════════

  private refreshChain(): void {
    const entries: {
      id: string | null;
      reg: any;
      hexColor: number;
    }[] = [
      {
        id: this.sP,
        reg: this.sP
          ? PREFIX_REGISTRY[
              this.sP
            ]
          : null,
        hexColor: 0x88cc88,
      },
      {
        id: this.sC,
        reg: this.sC
          ? CORE_REGISTRY[
              this.sC
            ]
          : null,
        hexColor:
          this.sC
            ? CORE_REGISTRY[
                this.sC
              ].visual.color
            : 0x8888aa,
      },
      {
        id: this.sF,
        reg: this.sF
          ? FORM_REGISTRY[
              this.sF
            ]
          : null,
        hexColor: 0x8888dd,
      },
      {
        id: this.sS,
        reg: this.sS
          ? SUFFIX_REGISTRY[
              this.sS
            ]
          : null,
        hexColor: 0xccaa66,
      },
    ];

    for (
      let i = 0;
      i < 4;
      i++
    ) {
      const e =
        entries[i];

      const slotUi =
        this.chain[i];

      if (
        e.id &&
        e.reg
      ) {
        const hex =
          '#' +
          e.hexColor
            .toString(16)
            .padStart(6, '0');

        let displayName =
          e.reg.displayName;

        // Cosmetic only.
        if (i === 3) {
          displayName =
            displayName
              .replace(
                /^of\s+/i,
                '',
              )
              .trim();
        }

        slotUi.value
          .setText(displayName)
          .setColor(hex);

        slotUi.border.setStrokeStyle(
          1.5,
          e.hexColor,
          0.68,
        );

        slotUi.box.setFillStyle(
          0x191323,
          0.78,
        );
      } else {
        slotUi.value
          .setText('—')
          .setColor('#666078');

        slotUi.border.setStrokeStyle(
          1,
          0x55506a,
          0.25,
        );

        slotUi.box.setFillStyle(
          0x0c0912,
          0.55,
        );
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // COMPATIBILITY
  // ═════════════════════════════════════════════════════════════════════

  private refreshCompatibility(): void {
    for (
      const c of this.prefCards
    ) {
      if (
        c.id === null
      ) {
        c.locked = false;
        c.lockReason = '';
        continue;
      }

      let ok = true;

      let reason =
        'Incompatible with current selection.';

      if (
        this.sC &&
        this.sF
      ) {
        const r =
          SpellValidator.validate(
            this.sC,
            this.sF,
            c.id as PrefixId,
            this.sS,
          );

        const err =
          r.errors.find(
            (e: any) =>
              e.field ===
                'prefix' ||
              e.field ===
                'combination',
          );

        ok = !err;

        if (
          err &&
          (err as any).message
        ) {
          reason =
            (err as any)
              .message;
        }
      }

      c.locked = !ok;
      c.lockReason = reason;

      if (
        !ok &&
        this.sP === c.id
      ) {
        this.sP = null;
      }

      if (ok) {
        c.bg.setInteractive({
          useHandCursor: true,
        });
      } else {
        c.bg.disableInteractive();
      }
    }

    for (
      const c of this.sufCards
    ) {
      if (
        c.id === null
      ) {
        c.locked = false;
        c.lockReason = '';
        continue;
      }

      let ok = true;

      let reason =
        'Incompatible with current selection.';

      if (
        this.sC &&
        this.sF
      ) {
        const r =
          SpellValidator.validate(
            this.sC,
            this.sF,
            this.sP,
            c.id as SuffixId,
          );

        const err =
          r.errors.find(
            (e: any) =>
              e.field ===
                'suffix' ||
              e.field ===
                'combination',
          );

        ok = !err;

        if (
          err &&
          (err as any).message
        ) {
          reason =
            (err as any)
              .message;
        }
      }

      c.locked = !ok;
      c.lockReason = reason;

      if (
        !ok &&
        this.sS === c.id
      ) {
        this.sS = null;
      }

      if (ok) {
        c.bg.setInteractive({
          useHandCursor: true,
        });
      } else {
        c.bg.disableInteractive();
      }
    }

    // Core and Form remain selectable.
    for (
      const c of this.coreCards
    ) {
      c.locked = false;
      c.lockReason = '';
    }

    for (
      const c of this.formCards
    ) {
      c.locked = false;
      c.lockReason = '';
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // PREVIEW
  // ═════════════════════════════════════════════════════════════════════

  private refreshPreview(): void {
    if (
      this.particleTimer
    ) {
      this.particleTimer.destroy();
      this.particleTimer = null;
    }

    if (
      !this.sC ||
      !this.sF
    ) {
      this.spell = null;

      this.pvName
        .setText(
          'SELECT CORE + FORM',
        )
        .setColor('#8d8898');

      this.statManaVal.setText('—');
      this.statCdVal.setText('—');

      this.extraStatsTxt.setText('');

      this.pvError.setAlpha(0);

      this.pvOrb
        .setFillStyle(
          0x302842,
          0.24,
        )
        .setStrokeStyle(
          1.5,
          0x77678d,
          0.4,
        );

      this.pvGlow.setFillStyle(
        0x45305c,
        0.07,
      );

      this.pvRing.setStrokeStyle(
        1,
        0x665676,
        0.22,
      );

      return;
    }

    const result =
      SpellBuilder.build(
        this.sC,
        this.sF,
        this.sP,
        this.sS,
      );

    if (
      result.success &&
      result.spell
    ) {
      const s =
        result.spell;

      this.spell = s;

      const hex =
        '#' +
        s.visual.color
          .toString(16)
          .padStart(6, '0');

      this.pvName
        .setText(s.name)
        .setColor(hex);

      this.tweens.add({
        targets: this.pvName,
        alpha: {
          from: 0.35,
          to: 1,
        },
        duration: 200,
      });

      this.pvOrb
        .setFillStyle(
          s.visual.color,
          0.34,
        )
        .setStrokeStyle(
          2,
          s.visual.color,
          0.72,
        );

      this.pvGlow.setFillStyle(
        s.visual.color,
        0.16,
      );

      this.pvRing.setStrokeStyle(
        1,
        s.visual.color,
        0.38,
      );

      this.statManaVal.setText(
        String(
          s.manaCost,
        ),
      );

      this.statCdVal.setText(
        `${(
          s.cooldown / 1000
        ).toFixed(2)}s`,
      );

      const eff =
        s.statusEffect.type !==
        'none'
          ? s.statusEffect.type.toUpperCase()
          : '—';

      this.extraStatsTxt.setText(
        `DAMAGE  ${s.damage}     TARGET  ${s.targetingType}\nSTATUS  ${eff}`,
      );

      this.pvError.setAlpha(0);

      const theme =
        getCoreTheme(
          s.core.id,
        );

      this.particleTimer =
        this.time.addEvent({
          delay: 220,
          loop: true,

          callback: () => {
            if (
              !this.pvOrb.active
            ) {
              return;
            }

            const m =
              this.pvOrb.getWorldTransformMatrix();

            theme.spawnAmbientParticle(
              this,
              m.tx,
              m.ty,
              s.visual,
            );
          },
        });
    } else {
      this.spell = null;

      this.pvName
        .setText(
          'INVALID RITUAL',
        )
        .setColor(
          '#e16a78',
        );

      this.statManaVal.setText(
        '—',
      );

      this.statCdVal.setText(
        '—',
      );

      this.extraStatsTxt.setText(
        '',
      );

      this.pvError
        .setText(
          result.error +
            (
              result.suggestion
                ? '\n' +
                  result.suggestion
                : ''
            ),
        )
        .setAlpha(1);

      this.pvOrb
        .setFillStyle(
          0x442027,
          0.25,
        )
        .setStrokeStyle(
          1.5,
          0x914652,
          0.55,
        );

      this.pvGlow.setFillStyle(
        0x4c1824,
        0.08,
      );

      this.pvRing.setStrokeStyle(
        1,
        0x71343f,
        0.32,
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // FORGE BUTTON
  // ═════════════════════════════════════════════════════════════════════

  private refreshPrepare(): void {
    if (
      this.prepTween
    ) {
      this.prepTween.stop();
      this.prepTween = null;
    }

    if (
      this.spell
    ) {
      this.prepBtn
        .setFillStyle(
          0x2a151d,
          0.78,
        )
        .setStrokeStyle(
          1.5,
          OCCULT.crimsonBright,
          0.72,
        );

      this.prepTxt.setColor(
        '#ffd3d8',
      );

      this.prepTxt.setText(
        'FORGE SPELL',
      );

      this.prepReason.setText(
        'BIND THIS RITUAL TO SLOT ' +
          (this.slot + 1),
      );

      this.prepGlow.setAlpha(
        0.42,
      );

      this.prepTween =
        this.tweens.add({
          targets:
            this.prepGlow,

          alpha: {
            from: 0.28,
            to: 0.62,
          },

          duration: 1100,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.InOut',
        });
    } else {
      this.prepBtn
        .setFillStyle(
          OCCULT.panel2,
          0.62,
        )
        .setStrokeStyle(
          1,
          0x51485f,
          0.3,
        );

      this.prepTxt.setColor(
        '#6e6875',
      );

      this.prepTxt.setText(
        'FORGE SPELL',
      );

      this.prepGlow.setAlpha(
        0,
      );

      this.prepReason.setText(
        this.sC &&
        this.sF
          ? 'This ritual cannot be forged.'
          : 'Choose an Essence and Delivery.',
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // LOADOUT
  // ═════════════════════════════════════════════════════════════════════

  private refreshLoadout(): void {
    for (
      let i = 0;
      i <
      this.loadoutCards.length;
      i++
    ) {
      const lc =
        this.loadoutCards[i];

      const active =
        i === this.slot;

      const existing =
        this.gs.slots[i]?.spell;

      lc.nameTxt.setText(
        existing
          ? existing.name
          : 'Empty',
      );

      lc.manaTxt.setText(
        existing
          ? `${existing.manaCost} MP`
          : '',
      );

      lc.nameTxt.setColor(
        active
          ? '#e2e7ff'
          : existing
            ? '#aeb9d0'
            : '#666173',
      );

      lc.bg.setFillStyle(
        active
          ? 0x1c1830
          : OCCULT.panel2,
        active
          ? 0.8
          : 0.62,
      );

      lc.border.setStrokeStyle(
        active
          ? 1.5
          : 1,
        active
          ? OCCULT.purpleBright
          : 0x51485f,
        active
          ? 0.72
          : 0.3,
      );

      lc.glow.setAlpha(
        active
          ? 0.45
          : 0,
      );
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RECENT
  // ═════════════════════════════════════════════════════════════════════

  private refreshRecent(): void {
    for (
      let i = 0;
      i <
      this.recentCards.length;
      i++
    ) {
      const rc =
        this.recentCards[i];

      const entry =
        this.recentSpells[i];

      if (entry) {
        const hex =
          '#' +
          entry.color
            .toString(16)
            .padStart(6, '0');

        rc.numTxt.setText(
          '★',
        );

        rc.nameTxt
          .setText(
            entry.name,
          )
          .setColor(hex);

        rc.manaTxt.setText(
          `${entry.manaCost} MP`,
        );

        rc.border.setStrokeStyle(
          1,
          entry.color,
          0.4,
        );
      } else {
        rc.numTxt.setText(
          '',
        );

        rc.nameTxt
          .setText('—')
          .setColor(
            '#55505f',
          );

        rc.manaTxt.setText(
          '',
        );

        rc.border.setStrokeStyle(
          1,
          0x44404d,
          0.2,
        );
      }
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // RECENT SPELL RECORDING
  // ═════════════════════════════════════════════════════════════════════

  private recordRecent(): void {
    if (
      !this.spell ||
      !this.sC ||
      !this.sF
    ) {
      return;
    }

    const entry: RecentEntry = {
      name:
        this.spell.name,

      color:
        this.spell.visual.color,

      manaCost:
        this.spell.manaCost,

      sP: this.sP,
      sC: this.sC,
      sF: this.sF,
      sS: this.sS,
    };

    this.recentSpells =
      this.recentSpells.filter(
        (e) =>
          !(
            e.sP === entry.sP &&
            e.sC === entry.sC &&
            e.sF === entry.sF &&
            e.sS === entry.sS
          ),
      );

    this.recentSpells.unshift(
      entry,
    );

    if (
      this.recentSpells.length >
      SPELL_SLOT_COUNT
    ) {
      this.recentSpells.length =
        SPELL_SLOT_COUNT;
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // PREPARE
  // ═════════════════════════════════════════════════════════════════════

  private doPrepare(): void {
    if (
      !this.sC ||
      !this.sF ||
      !this.spell
    ) {
      return;
    }

    this.recordRecent();

    this.gs.assignToSlot(
      this.slot,
      this.sC,
      this.sF,
      this.sP,
      this.sS,
    );

    this.gs.setActiveSlot(
      this.slot,
    );

    this.scene
      .get('GameScene')
      .events.emit(
        'spell-slots-updated',
      );

    this.doClose();
  }

  // ═════════════════════════════════════════════════════════════════════
  // CLOSE
  // ═════════════════════════════════════════════════════════════════════

  doClose(): void {
    if (
      this.particleTimer
    ) {
      this.particleTimer.destroy();
      this.particleTimer = null;
    }

    if (
      this.prepTween
    ) {
      this.prepTween.stop();
      this.prepTween = null;
    }

    const gameScene =
      this.scene.get(
        'GameScene',
      ) as unknown as {
        forceCloseGrimoire:
          () => void;
      };

    if (
      gameScene?.forceCloseGrimoire
    ) {
      gameScene.forceCloseGrimoire();
    }
  }
}