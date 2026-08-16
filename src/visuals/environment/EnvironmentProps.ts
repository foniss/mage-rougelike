// src/visuals/environment/EnvironmentProps.ts
//
// Procedural environmental prop system.
// Purely visual — NO physics bodies, NO collision, NO gameplay objects.
// Props are placed in safe edge zones away from the central combat area.

import Phaser from 'phaser';
import { ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS } from '../../config/constants';
import { RoomType, SinId, SIN_DEFINITIONS } from '../../config/dungeonConfig';
import { LayerColors, RoomAccent } from './LayerTheme';

// ── Placement zones ─────────────────────────────────────────────────────

const INSET = WALL_THICKNESS + 12;
const SAFE_MARGIN = 100; // keep this clear around center for gameplay

interface Pos { x: number; y: number; }

function edgePositions(count: number, seed: number): Pos[] {
  const positions: Pos[] = [];
  const rng = seedRng(seed);
  const minX = INSET + 10, maxX = ROOM_WIDTH - INSET - 10;
  const minY = INSET + 10, maxY = ROOM_HEIGHT - INSET - 10;
  const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

  for (let i = 0; i < count * 3 && positions.length < count; i++) {
    const edge = Math.floor(rng() * 4);
    let x: number, y: number;
    switch (edge) {
      case 0: x = minX + rng() * (maxX - minX); y = minY + rng() * 50; break; // top
      case 1: x = minX + rng() * (maxX - minX); y = maxY - rng() * 50; break; // bottom
      case 2: x = minX + rng() * 50; y = minY + rng() * (maxY - minY); break; // left
      default: x = maxX - rng() * 50; y = minY + rng() * (maxY - minY); break; // right
    }
    // Reject if too close to center
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (dist > SAFE_MARGIN) positions.push({ x, y });
  }
  return positions;
}

function cornerPositions(seed: number): Pos[] {
  const rng = seedRng(seed);
  const off = 50 + rng() * 30;
  return [
    { x: INSET + off, y: INSET + off },
    { x: ROOM_WIDTH - INSET - off, y: INSET + off },
    { x: INSET + off, y: ROOM_HEIGHT - INSET - off },
    { x: ROOM_WIDTH - INSET - off, y: ROOM_HEIGHT - INSET - off },
  ];
}

function centerPos(): Pos { return { x: ROOM_WIDTH / 2, y: ROOM_HEIGHT / 2 }; }

// Simple seeded RNG
function seedRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ── Prop Drawing Functions ──────────────────────────────────────────────

function drawCrystal(scene: Phaser.Scene, x: number, y: number, color: number, size: number, layer: number): void {
  const gfx = scene.add.graphics().setDepth(4);
  const h = size * (1.5 + Math.random() * 0.5);
  const w = size * 0.4;

  // Shadow
  gfx.fillStyle(0x000000, 0.3);
  gfx.fillEllipse(x, y + h * 0.4, w * 2.5, 6);

  // Crystal body — dark silhouette
  const bodyColor = Phaser.Display.Color.IntegerToColor(color).darken(60).color;
  gfx.fillStyle(bodyColor, 0.8);
  gfx.fillTriangle(x - w, y + h * 0.3, x + w, y + h * 0.3, x + w * 0.2, y - h * 0.5);
  gfx.fillTriangle(x - w * 0.5, y + h * 0.3, x + w * 0.8, y + h * 0.3, x - w * 0.3, y - h * 0.4);

  // Inner highlight facet
  gfx.fillStyle(color, 0.25);
  gfx.fillTriangle(x - w * 0.3, y + h * 0.2, x + w * 0.4, y + h * 0.1, x + w * 0.1, y - h * 0.35);

  // Bright edge
  gfx.fillStyle(color, 0.4);
  gfx.fillTriangle(x + w * 0.3, y + h * 0.25, x + w * 0.6, y + h * 0.1, x + w * 0.15, y - h * 0.3);

  // Top highlight
  gfx.fillStyle(0xffffff, 0.15);
  gfx.fillTriangle(x, y - h * 0.35, x + w * 0.15, y - h * 0.15, x - w * 0.1, y - h * 0.2);

  // Glow
  const glow = scene.add.circle(x, y - h * 0.1, size * 0.8, color, 0.06).setDepth(3);
  scene.tweens.add({
    targets: glow, alpha: { from: 0.03, to: 0.09 },
    duration: 2000 + Math.random() * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

function drawPillar(scene: Phaser.Scene, x: number, y: number, theme: LayerColors, height: number, damaged: boolean): void {
  const gfx = scene.add.graphics().setDepth(4);
  const w = 14, h = height;

  // Shadow
  gfx.fillStyle(0x000000, 0.25);
  gfx.fillEllipse(x, y + 4, w * 2, 8);

  // Base
  gfx.fillStyle(theme.wallBase, 0.9);
  gfx.fillRect(x - w * 0.7, y - 4, w * 1.4, 8);

  // Pillar body
  gfx.fillStyle(theme.wallHighlight, 0.7);
  gfx.fillRect(x - w / 2, y - h, w, h);

  // Darker right side for depth
  gfx.fillStyle(theme.wallBase, 0.5);
  gfx.fillRect(x + w * 0.1, y - h, w * 0.4, h);

  // Edge highlight left
  gfx.fillStyle(0xffffff, 0.04);
  gfx.fillRect(x - w / 2, y - h, 2, h);

  // Top cap
  gfx.fillStyle(theme.wallHighlight, 0.8);
  gfx.fillRect(x - w * 0.7, y - h - 4, w * 1.4, 6);

  // Rune mark
  gfx.fillStyle(theme.runeColor, theme.runeAlpha * 1.5);
  gfx.fillRect(x - 2, y - h * 0.6, 4, 4);

  if (damaged) {
    // Crack lines
    gfx.lineStyle(1, 0x000000, 0.3);
    gfx.lineBetween(x - 3, y - h * 0.3, x + 2, y - h * 0.5);
    gfx.lineBetween(x + 2, y - h * 0.5, x - 1, y - h * 0.7);
    // Missing top chunk
    gfx.fillStyle(theme.floorBase, 1);
    gfx.fillTriangle(x + w * 0.2, y - h - 4, x + w * 0.7, y - h - 4, x + w * 0.5, y - h + 6);
  }
}

function drawCandle(scene: Phaser.Scene, x: number, y: number, color: number, size: number): void {
  const gfx = scene.add.graphics().setDepth(4);
  const h = 8 + size * 6;

  // Holder
  gfx.fillStyle(0x1a1520, 0.9);
  gfx.fillRect(x - 3, y - 2, 6, 4);

  // Wax body
  gfx.fillStyle(0x2a2030, 0.8);
  gfx.fillRect(x - 2, y - h, 4, h);

  // Flame — animated circle
  const flame = scene.add.circle(x, y - h - 3, 2.5 + size, color, 0.7).setDepth(4);
  const flameCore = scene.add.circle(x, y - h - 3, 1.5, 0xffffcc, 0.6).setDepth(4);

  scene.tweens.add({
    targets: [flame, flameCore],
    y: y - h - 4 - size * 0.5,
    scaleX: { from: 0.9, to: 1.1 }, scaleY: { from: 1.1, to: 0.9 },
    alpha: { from: 0.5, to: 0.8 },
    duration: 400 + Math.random() * 300, yoyo: true, repeat: -1,
  });

  // Local glow
  const glow = scene.add.circle(x, y - h * 0.5, 12 + size * 4, color, 0.04).setDepth(3);
  scene.tweens.add({
    targets: glow, alpha: { from: 0.02, to: 0.06 },
    duration: 800 + Math.random() * 400, yoyo: true, repeat: -1,
  });
}

function drawRuneStone(scene: Phaser.Scene, x: number, y: number, color: number, alpha: number): void {
  const gfx = scene.add.graphics().setDepth(4);

  // Stone body
  gfx.fillStyle(0x1a1825, 0.7);
  const sw = 8 + Math.random() * 4, sh = 10 + Math.random() * 6;
  gfx.fillRoundedRect(x - sw / 2, y - sh, sw, sh, 2);

  // Edge highlight
  gfx.fillStyle(0x2a2535, 0.4);
  gfx.fillRect(x - sw / 2, y - sh, 2, sh);

  // Rune glyph
  gfx.fillStyle(color, alpha);
  gfx.fillRect(x - 1.5, y - sh * 0.7, 3, 3);
  gfx.fillRect(x - 1, y - sh * 0.4, 2, 2);

  // Glow pulse
  const dot = scene.add.circle(x, y - sh * 0.5, 3, color, alpha * 0.5).setDepth(4);
  scene.tweens.add({
    targets: dot, alpha: { from: alpha * 0.2, to: alpha * 0.7 },
    duration: 2500 + Math.random() * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

function drawRubble(scene: Phaser.Scene, x: number, y: number, theme: LayerColors, count: number): void {
  const gfx = scene.add.graphics().setDepth(3);
  for (let i = 0; i < count; i++) {
    const ox = (Math.random() - 0.5) * 20;
    const oy = (Math.random() - 0.5) * 12;
    const s = 2 + Math.random() * 4;
    const bright = Math.random() > 0.5;
    gfx.fillStyle(bright ? theme.wallHighlight : theme.wallBase, 0.5 + Math.random() * 0.3);
    gfx.fillRect(x + ox - s / 2, y + oy - s / 2, s, s * 0.7);
  }
}

function drawObelisk(scene: Phaser.Scene, x: number, y: number, color: number, height: number): void {
  const gfx = scene.add.graphics().setDepth(4);
  const w = 10, h = height;

  // Shadow
  gfx.fillStyle(0x000000, 0.3);
  gfx.fillEllipse(x, y + 4, w * 2, 8);

  // Body
  gfx.fillStyle(0x151020, 0.9);
  gfx.fillTriangle(x - w, y, x + w, y, x, y - h);

  // Highlight facet
  gfx.fillStyle(0x201830, 0.6);
  gfx.fillTriangle(x, y, x + w, y, x + w * 0.3, y - h * 0.9);

  // Rune line
  gfx.lineStyle(1, color, 0.3);
  gfx.lineBetween(x, y - h * 0.2, x, y - h * 0.8);

  // Top glow
  const glow = scene.add.circle(x, y - h, 6, color, 0.15).setDepth(4);
  scene.tweens.add({
    targets: glow, alpha: { from: 0.08, to: 0.2 }, scaleX: { from: 0.8, to: 1.2 }, scaleY: { from: 0.8, to: 1.2 },
    duration: 2000 + Math.random() * 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

function drawAltar(scene: Phaser.Scene, x: number, y: number, color: number, theme: LayerColors): void {
  const gfx = scene.add.graphics().setDepth(4);

  // Base platform
  gfx.fillStyle(theme.wallBase, 0.8);
  gfx.fillRect(x - 24, y - 4, 48, 10);
  gfx.fillStyle(theme.wallHighlight, 0.6);
  gfx.fillRect(x - 24, y - 4, 48, 3);

  // Altar body
  gfx.fillStyle(0x151020, 0.9);
  gfx.fillRect(x - 18, y - 20, 36, 18);
  gfx.fillStyle(0x201830, 0.5);
  gfx.fillRect(x - 18, y - 20, 36, 3);

  // Rune markings
  gfx.lineStyle(1, color, 0.25);
  gfx.strokeRect(x - 14, y - 17, 28, 12);
  gfx.fillStyle(color, 0.2);
  gfx.fillRect(x - 2, y - 14, 4, 4);

  // Glow
  const glow = scene.add.circle(x, y - 14, 16, color, 0.06).setDepth(3);
  scene.tweens.add({
    targets: glow, alpha: { from: 0.03, to: 0.08 },
    duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

function drawFloatingFragment(scene: Phaser.Scene, x: number, y: number, color: number, size: number): void {
  const frag = scene.add.rectangle(x, y, size, size * 1.4, color, 0.2).setDepth(4).setAngle(Math.random() * 360);
  const outline = scene.add.rectangle(x, y, size, size * 1.4, 0x000000, 0).setDepth(4).setAngle(frag.angle).setStrokeStyle(0.5, color, 0.15);

  const baseY = y;
  scene.tweens.add({
    targets: [frag, outline],
    y: baseY - 4 - Math.random() * 4,
    angle: frag.angle + (Math.random() - 0.5) * 20,
    duration: 3000 + Math.random() * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
  });
}

// ── Room Composition ────────────────────────────────────────────────────

export class EnvironmentProps {

  static populate(scene: Phaser.Scene, roomType: RoomType, layerIndex: number, theme: LayerColors, accent: RoomAccent, sinId?: SinId | null): void {
    const seed = Math.floor(Math.random() * 99999);
    const rng = seedRng(seed);
    const runeCol = accent.extraRuneColor ?? theme.runeColor;
    const accentCol = accent.accentColor;
    const damaged = layerIndex >= 2;

    switch (roomType) {
      case RoomType.NORMAL: EnvironmentProps.normalRoom(scene, theme, runeCol, rng, damaged, layerIndex); break;
      case RoomType.ELITE: EnvironmentProps.eliteRoom(scene, theme, accentCol, rng, layerIndex); break;
      case RoomType.SIN_BOSS: EnvironmentProps.bossRoom(scene, theme, sinId, rng, layerIndex); break;
      case RoomType.DEVIL: EnvironmentProps.devilRoom(scene, theme, rng); break;
      case RoomType.SHOP_REST: EnvironmentProps.shopRoom(scene, theme, rng); break;
      case RoomType.SHRINE: EnvironmentProps.shrineRoom(scene, theme, runeCol, rng); break;
      case RoomType.SACRIFICE: EnvironmentProps.sacrificeRoom(scene, theme, rng); break;
      case RoomType.VAULT: EnvironmentProps.vaultRoom(scene, theme, rng); break;
    }
  }

  // ── Normal ────────────────────────────────────────────────────────────

  private static normalRoom(scene: Phaser.Scene, theme: LayerColors, runeCol: number, rng: () => number, damaged: boolean, layer: number): void {
    const corners = cornerPositions(Math.floor(rng() * 9999));
    // 2-3 pillars
    const pillarCount = 2 + (rng() > 0.5 ? 1 : 0);
    for (let i = 0; i < pillarCount && i < corners.length; i++) {
      drawPillar(scene, corners[i].x, corners[i].y, theme, 30 + rng() * 15, damaged && rng() > 0.5);
    }

    // 2-4 rubble clusters
    const rubblePos = edgePositions(2 + Math.floor(rng() * 3), Math.floor(rng() * 9999));
    for (const p of rubblePos) drawRubble(scene, p.x, p.y, theme, 3 + Math.floor(rng() * 4));

    // 1-2 crystals
    const crystalPos = edgePositions(1 + (rng() > 0.6 ? 1 : 0), Math.floor(rng() * 9999));
    const crystalCol = layer >= 2 ? theme.ambientAltColor : theme.ambientColor;
    for (const p of crystalPos) drawCrystal(scene, p.x, p.y, crystalCol, 6 + rng() * 4, layer);

    // 2-3 candles along edges
    const candlePos = edgePositions(2 + (rng() > 0.5 ? 1 : 0), Math.floor(rng() * 9999));
    for (const p of candlePos) drawCandle(scene, p.x, p.y, 0xffaa44, rng());

    // 1-2 rune stones
    const runePos = edgePositions(1 + (rng() > 0.5 ? 1 : 0), Math.floor(rng() * 9999));
    for (const p of runePos) drawRuneStone(scene, p.x, p.y, runeCol, theme.runeAlpha * 2);

    // Layer 3+: floating fragments
    if (layer >= 2) {
      const fragPos = edgePositions(2 + Math.floor(rng() * 2), Math.floor(rng() * 9999));
      for (const p of fragPos) drawFloatingFragment(scene, p.x, p.y - 20, theme.ambientAltColor, 4 + rng() * 4);
    }
  }

  // ── Elite ─────────────────────────────────────────────────────────────

  private static eliteRoom(scene: Phaser.Scene, theme: LayerColors, accentCol: number, rng: () => number, layer: number): void {
    const corners = cornerPositions(Math.floor(rng() * 9999));
    // All 4 corners get pillars — some damaged
    for (let i = 0; i < 4; i++) {
      drawPillar(scene, corners[i].x, corners[i].y, theme, 35 + rng() * 10, rng() > 0.3);
    }

    // More rubble (corrupted feel)
    const rubblePos = edgePositions(4 + Math.floor(rng() * 2), Math.floor(rng() * 9999));
    for (const p of rubblePos) drawRubble(scene, p.x, p.y, theme, 4 + Math.floor(rng() * 4));

    // Corrupted crystals
    const crystalPos = edgePositions(2 + Math.floor(rng() * 2), Math.floor(rng() * 9999));
    for (const p of crystalPos) drawCrystal(scene, p.x, p.y, accentCol, 7 + rng() * 5, layer);

    // Candles with accent color
    const candlePos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of candlePos) drawCandle(scene, p.x, p.y, accentCol, 0.5 + rng() * 0.5);

    // Rune stones
    const runePos = edgePositions(2, Math.floor(rng() * 9999));
    for (const p of runePos) drawRuneStone(scene, p.x, p.y, accentCol, 0.2);

    // Floating fragments
    const fragPos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of fragPos) drawFloatingFragment(scene, p.x, p.y - 15, accentCol, 5 + rng() * 3);
  }

  // ── Sin Boss ──────────────────────────────────────────────────────────

  private static bossRoom(scene: Phaser.Scene, theme: LayerColors, sinId: SinId | null | undefined, rng: () => number, layer: number): void {
    const sinColor = sinId ? SIN_DEFINITIONS[sinId].color : 0xff4444;

    // Grand pillars at all corners
    const corners = cornerPositions(Math.floor(rng() * 9999));
    for (const c of corners) {
      drawPillar(scene, c.x, c.y, theme, 45 + rng() * 10, layer >= 3);
    }

    // Obelisks flanking the arena
    const obeliskPositions = edgePositions(4, Math.floor(rng() * 9999));
    for (const p of obeliskPositions) drawObelisk(scene, p.x, p.y, sinColor, 35 + rng() * 15);

    // Sin-colored crystals
    const crystalPos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of crystalPos) drawCrystal(scene, p.x, p.y, sinColor, 8 + rng() * 5, layer);

    // Candles
    const candlePos = edgePositions(4, Math.floor(rng() * 9999));
    for (const p of candlePos) drawCandle(scene, p.x, p.y, sinColor, 0.5 + rng() * 0.5);

    // Floating fragments
    const fragPos = edgePositions(4 + Math.floor(rng() * 2), Math.floor(rng() * 9999));
    for (const p of fragPos) drawFloatingFragment(scene, p.x, p.y - 20, sinColor, 5 + rng() * 4);
  }

  // ── Devil ─────────────────────────────────────────────────────────────

  private static devilRoom(scene: Phaser.Scene, theme: LayerColors, rng: () => number): void {
    const devilRed = 0xcc1122;

    // Massive pillars
    const corners = cornerPositions(Math.floor(rng() * 9999));
    for (const c of corners) drawPillar(scene, c.x, c.y, theme, 55, true);

    // Obelisks
    const obeliskPos = edgePositions(6, Math.floor(rng() * 9999));
    for (const p of obeliskPos) drawObelisk(scene, p.x, p.y, devilRed, 40 + rng() * 20);

    // Crystals
    const crystalPos = edgePositions(4, Math.floor(rng() * 9999));
    for (const p of crystalPos) drawCrystal(scene, p.x, p.y, devilRed, 10 + rng() * 5, 3);

    // Many candles
    const candlePos = edgePositions(6, Math.floor(rng() * 9999));
    for (const p of candlePos) drawCandle(scene, p.x, p.y, devilRed, 0.8);

    // Many floating fragments
    const fragPos = edgePositions(6, Math.floor(rng() * 9999));
    for (const p of fragPos) drawFloatingFragment(scene, p.x, p.y - 25, devilRed, 6 + rng() * 5);
  }

  // ── Shop / Rest ───────────────────────────────────────────────────────

  private static shopRoom(scene: Phaser.Scene, theme: LayerColors, rng: () => number): void {
    const warmGold = 0xccaa55;

    // Small pillars
    const corners = cornerPositions(Math.floor(rng() * 9999));
    for (let i = 0; i < 2; i++) drawPillar(scene, corners[i].x, corners[i].y, theme, 25, false);

    // Candles (warm lighting)
    const candlePos = edgePositions(5, Math.floor(rng() * 9999));
    for (const p of candlePos) drawCandle(scene, p.x, p.y, warmGold, 0.3 + rng() * 0.4);

    // Crystals (calmer colors)
    const crystalPos = edgePositions(2, Math.floor(rng() * 9999));
    for (const p of crystalPos) drawCrystal(scene, p.x, p.y, 0x44aa88, 5 + rng() * 3, 0);

    // Rune stones
    const runePos = edgePositions(2, Math.floor(rng() * 9999));
    for (const p of runePos) drawRuneStone(scene, p.x, p.y, warmGold, 0.12);
  }

  // ── Shrine ────────────────────────────────────────────────────────────

  private static shrineRoom(scene: Phaser.Scene, theme: LayerColors, runeCol: number, rng: () => number): void {
    const c = centerPos();

    // Central obelisk
    drawObelisk(scene, c.x, c.y + 20, runeCol, 50);

    // Altar base
    drawAltar(scene, c.x, c.y + 30, runeCol, theme);

    // Flanking crystals
    drawCrystal(scene, c.x - 50, c.y + 10, runeCol, 7, 0);
    drawCrystal(scene, c.x + 50, c.y + 10, runeCol, 7, 0);

    // Candles around shrine
    const offsets = [{ dx: -35, dy: 25 }, { dx: 35, dy: 25 }, { dx: -25, dy: -15 }, { dx: 25, dy: -15 }];
    for (const o of offsets) drawCandle(scene, c.x + o.dx, c.y + o.dy, runeCol, 0.4);

    // Corner rune stones
    const corners = cornerPositions(Math.floor(rng() * 9999));
    for (const p of corners) drawRuneStone(scene, p.x, p.y, runeCol, 0.15);
  }

  // ── Sacrifice ─────────────────────────────────────────────────────────

  private static sacrificeRoom(scene: Phaser.Scene, theme: LayerColors, rng: () => number): void {
    const crimson = 0xcc2233;
    const c = centerPos();

    // Central altar
    drawAltar(scene, c.x, c.y + 20, crimson, theme);

    // Surrounding candles in circle
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 55;
      drawCandle(scene, c.x + Math.cos(angle) * r, c.y + Math.sin(angle) * r + 10, crimson, 0.5);
    }

    // Corner obelisks
    const corners = cornerPositions(Math.floor(rng() * 9999));
    for (let i = 0; i < 2; i++) drawObelisk(scene, corners[i].x, corners[i].y, crimson, 30);

    // Rubble/bones
    const rubblePos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of rubblePos) drawRubble(scene, p.x, p.y, theme, 3 + Math.floor(rng() * 3));

    // Rune stones
    const runePos = edgePositions(2, Math.floor(rng() * 9999));
    for (const p of runePos) drawRuneStone(scene, p.x, p.y, crimson, 0.2);
  }

  // ── Vault ─────────────────────────────────────────────────────────────

  private static vaultRoom(scene: Phaser.Scene, theme: LayerColors, rng: () => number): void {
    const gold = 0xccaa44;
    const c = centerPos();

    // Central altar (vault mechanism)
    drawAltar(scene, c.x, c.y + 15, gold, theme);

    // Grand pillars
    const corners = cornerPositions(Math.floor(rng() * 9999));
    for (const p of corners) drawPillar(scene, p.x, p.y, theme, 40, false);

    // Gold crystals
    const crystalPos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of crystalPos) drawCrystal(scene, p.x, p.y, gold, 7 + rng() * 4, 0);

    // Candles
    const candlePos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of candlePos) drawCandle(scene, p.x, p.y, gold, 0.4);

    // Floating fragments (relic energy)
    const fragPos = edgePositions(3, Math.floor(rng() * 9999));
    for (const p of fragPos) drawFloatingFragment(scene, p.x, p.y - 20, gold, 4 + rng() * 3);
  }
}
