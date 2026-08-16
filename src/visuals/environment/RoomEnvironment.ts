// src/visuals/environment/RoomEnvironment.ts
//
// Reusable environment renderer for all room types.
// Call RoomEnvironment.create() from any scene to build the full environment.
// Purely visual — creates NO physics bodies, NO collision, NO gameplay objects.

import Phaser from 'phaser';
import { ROOM_WIDTH, ROOM_HEIGHT, WALL_THICKNESS } from '../../config/constants';
import { RoomType, SinId } from '../../config/dungeonConfig';
import { getLayerTheme, getRoomAccent, LayerColors, RoomAccent } from './LayerTheme';
import { EnvironmentProps } from './EnvironmentProps';

export interface RoomEnvConfig {
  scene: Phaser.Scene;
  roomType: RoomType;
  layerIndex: number;
  sinId?: SinId | null;
  /** Set false for non-combat scenes that don't need walls. */
  drawWalls?: boolean;
}

export class RoomEnvironment {

  static create(cfg: RoomEnvConfig): void {
    const { scene, roomType, layerIndex } = cfg;
    const theme = getLayerTheme(layerIndex);
    const accent = getRoomAccent(roomType, cfg.sinId);
    const drawWalls = cfg.drawWalls !== false;
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

    // ── 1. Floor ──────────────────────────────────────────────────────
    RoomEnvironment.drawFloor(scene, theme);

    // ── 2. Floor runes / magic circles ────────────────────────────────
    RoomEnvironment.drawFloorRunes(scene, theme, accent, roomType);

    // ── 3. Walls ──────────────────────────────────────────────────────
    if (drawWalls) {
      RoomEnvironment.drawWalls(scene, theme);
    }

    // ── 4. Edge vignette / fog ────────────────────────────────────────
    RoomEnvironment.drawVignette(scene, theme);

    // ── 5. Edge glow ──────────────────────────────────────────────────
    RoomEnvironment.drawEdgeGlow(scene, theme, accent);

    // ── 6. Corner decorations ─────────────────────────────────────────
    if (drawWalls) {
      RoomEnvironment.drawCornerPillars(scene, theme, accent);
    }

    // ── 7. Ambient particles ──────────────────────────────────────────
    RoomEnvironment.spawnAmbientParticles(scene, theme, accent);

    // ── 8. Environmental props ────────────────────────────────────────
    EnvironmentProps.populate(scene, roomType, layerIndex, theme, accent, cfg.sinId);

    // ── 9. Camera fade-in ─────────────────────────────────────────────
    if (scene.cameras?.main) {
      scene.cameras.main.fadeIn(400, 0, 0, 0);
    }
  }

  // ── Floor ───────────────────────────────────────────────────────────────

  private static drawFloor(scene: Phaser.Scene, theme: LayerColors): void {
    const gfx = scene.make.graphics({ x: 0, y: 0 });

    // Base fill
    gfx.fillStyle(theme.floorBase, 1);
    gfx.fillRect(0, 0, ROOM_WIDTH, ROOM_HEIGHT);

    // Stone tile grid
    const tileSize = 48;
    gfx.lineStyle(1, theme.floorLine, theme.floorLineAlpha);
    for (let x = 0; x <= ROOM_WIDTH; x += tileSize) {
      gfx.lineBetween(x, 0, x, ROOM_HEIGHT);
    }
    for (let y = 0; y <= ROOM_HEIGHT; y += tileSize) {
      gfx.lineBetween(0, y, ROOM_WIDTH, y);
    }

    // Subtle tile variation — alternate tiles slightly lighter
    gfx.fillStyle(theme.floorLine, 0.03);
    for (let x = 0; x < ROOM_WIDTH; x += tileSize * 2) {
      for (let y = 0; y < ROOM_HEIGHT; y += tileSize * 2) {
        gfx.fillRect(x, y, tileSize, tileSize);
        gfx.fillRect(x + tileSize, y + tileSize, tileSize, tileSize);
      }
    }

    // Render to texture and display
    if (scene.textures.exists('env-floor')) scene.textures.remove('env-floor');
    gfx.generateTexture('env-floor', ROOM_WIDTH, ROOM_HEIGHT);
    gfx.destroy();

    scene.add.sprite(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 'env-floor').setDepth(0);
  }

  // ── Floor runes ─────────────────────────────────────────────────────────

  private static drawFloorRunes(scene: Phaser.Scene, theme: LayerColors, accent: RoomAccent, roomType: RoomType): void {
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;
    const gfx = scene.add.graphics().setDepth(1);
    const runeCol = accent.extraRuneColor ?? theme.runeColor;
    const runeA = theme.runeAlpha;

    // Central magic circle
    const centerRadius = Math.min(ROOM_WIDTH, ROOM_HEIGHT) * 0.28;
    gfx.lineStyle(1.5, runeCol, runeA * 1.2);
    gfx.strokeCircle(cx, cy, centerRadius);
    gfx.lineStyle(1, runeCol, runeA * 0.8);
    gfx.strokeCircle(cx, cy, centerRadius * 0.7);
    gfx.lineStyle(0.5, runeCol, runeA * 0.5);
    gfx.strokeCircle(cx, cy, centerRadius * 1.15);

    // Cross lines through center
    gfx.lineStyle(0.5, runeCol, runeA * 0.6);
    const cr = centerRadius * 0.9;
    gfx.lineBetween(cx - cr, cy, cx + cr, cy);
    gfx.lineBetween(cx, cy - cr, cx, cy + cr);

    // Diagonal lines
    const dr = cr * 0.7;
    gfx.lineBetween(cx - dr, cy - dr, cx + dr, cy + dr);
    gfx.lineBetween(cx + dr, cy - dr, cx - dr, cy + dr);

    // Small rune marks at cardinal positions
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = cx + Math.cos(angle) * centerRadius;
      const ry = cy + Math.sin(angle) * centerRadius;

      // Small diamond at each point
      const ds = 4;
      gfx.fillStyle(runeCol, runeA * 1.5);
      gfx.fillRect(rx - ds / 2, ry - ds / 2, ds, ds);
    }

    // Room-type specific decorations
    if (roomType === RoomType.SACRIFICE || roomType === RoomType.SIN_BOSS || roomType === RoomType.DEVIL) {
      // Extra inner pentagram-like pattern
      gfx.lineStyle(1, runeCol, runeA * 1.0);
      const pr = centerRadius * 0.5;
      for (let i = 0; i < 5; i++) {
        const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
        gfx.lineBetween(cx + Math.cos(a1) * pr, cy + Math.sin(a1) * pr, cx + Math.cos(a2) * pr, cy + Math.sin(a2) * pr);
      }
    }

    if (roomType === RoomType.SHRINE || roomType === RoomType.VAULT) {
      // Concentric circles for sacred/ancient feel
      for (let r = 0.3; r <= 0.6; r += 0.15) {
        gfx.lineStyle(0.5, runeCol, runeA * 0.6);
        gfx.strokeCircle(cx, cy, centerRadius * r);
      }
    }

    // Pulse animation on central circle
    const pulseRing = scene.add.circle(cx, cy, centerRadius, 0x000000, 0).setDepth(1);
    pulseRing.setStrokeStyle(1, runeCol, runeA * 0.4);
    scene.tweens.add({
      targets: pulseRing,
      scaleX: { from: 0.95, to: 1.05 },
      scaleY: { from: 0.95, to: 1.05 },
      alpha: { from: runeA * 0.3, to: runeA * 0.8 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── Walls ───────────────────────────────────────────────────────────────

  private static drawWalls(scene: Phaser.Scene, theme: LayerColors): void {
    const wt = WALL_THICKNESS;

    // Wall rectangles with highlight strip
    const topWall = scene.add.rectangle(ROOM_WIDTH / 2, wt / 2, ROOM_WIDTH, wt, theme.wallBase, 1).setDepth(5);
    scene.add.rectangle(ROOM_WIDTH / 2, 3, ROOM_WIDTH, 6, theme.wallHighlight, 1).setDepth(5);

    const botWall = scene.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - wt / 2, ROOM_WIDTH, wt, theme.wallBase, 1).setDepth(5);
    scene.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - 3, ROOM_WIDTH, 6, theme.wallHighlight, 1).setDepth(5);

    const leftWall = scene.add.rectangle(wt / 2, ROOM_HEIGHT / 2, wt, ROOM_HEIGHT, theme.wallBase, 1).setDepth(5);
    scene.add.rectangle(3, ROOM_HEIGHT / 2, 6, ROOM_HEIGHT, theme.wallHighlight, 1).setDepth(5);

    const rightWall = scene.add.rectangle(ROOM_WIDTH - wt / 2, ROOM_HEIGHT / 2, wt, ROOM_HEIGHT, theme.wallBase, 1).setDepth(5);
    scene.add.rectangle(ROOM_WIDTH - 3, ROOM_HEIGHT / 2, 6, ROOM_HEIGHT, theme.wallHighlight, 1).setDepth(5);

    // Inner wall glow strip
    const glowAlpha = 0.04;
    scene.add.rectangle(ROOM_WIDTH / 2, wt + 4, ROOM_WIDTH, 8, theme.runeColor, glowAlpha).setDepth(4);
    scene.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - wt - 4, ROOM_WIDTH, 8, theme.runeColor, glowAlpha).setDepth(4);
    scene.add.rectangle(wt + 4, ROOM_HEIGHT / 2, 8, ROOM_HEIGHT, theme.runeColor, glowAlpha).setDepth(4);
    scene.add.rectangle(ROOM_WIDTH - wt - 4, ROOM_HEIGHT / 2, 8, ROOM_HEIGHT, theme.runeColor, glowAlpha).setDepth(4);
  }

  // ── Vignette ────────────────────────────────────────────────────────────

  private static drawVignette(scene: Phaser.Scene, theme: LayerColors): void {
    const intensity = theme.fogIntensity;
    if (intensity <= 0) return;

    // Edge darkening rectangles (cheap vignette approximation)
    const edgeW = Math.max(60, ROOM_WIDTH * 0.08);
    const edgeH = Math.max(60, ROOM_HEIGHT * 0.08);

    scene.add.rectangle(edgeW / 2, ROOM_HEIGHT / 2, edgeW, ROOM_HEIGHT, 0x000000, intensity * 0.6).setDepth(3);
    scene.add.rectangle(ROOM_WIDTH - edgeW / 2, ROOM_HEIGHT / 2, edgeW, ROOM_HEIGHT, 0x000000, intensity * 0.6).setDepth(3);
    scene.add.rectangle(ROOM_WIDTH / 2, edgeH / 2, ROOM_WIDTH, edgeH, 0x000000, intensity * 0.5).setDepth(3);
    scene.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - edgeH / 2, ROOM_WIDTH, edgeH, 0x000000, intensity * 0.5).setDepth(3);

    // Corner darkness
    const cornerR = 80;
    const cornerAlpha = intensity * 0.4;
    scene.add.circle(0, 0, cornerR, 0x000000, cornerAlpha).setDepth(3);
    scene.add.circle(ROOM_WIDTH, 0, cornerR, 0x000000, cornerAlpha).setDepth(3);
    scene.add.circle(0, ROOM_HEIGHT, cornerR, 0x000000, cornerAlpha).setDepth(3);
    scene.add.circle(ROOM_WIDTH, ROOM_HEIGHT, cornerR, 0x000000, cornerAlpha).setDepth(3);
  }

  // ── Edge glow ───────────────────────────────────────────────────────────

  private static drawEdgeGlow(scene: Phaser.Scene, theme: LayerColors, accent: RoomAccent): void {
    const color = accent.accentColor;
    const alpha = accent.accentAlpha;
    if (alpha <= 0) return;

    // Subtle colored glow along wall inner edges
    const glowW = 30;
    scene.add.rectangle(ROOM_WIDTH / 2, WALL_THICKNESS + glowW / 2, ROOM_WIDTH, glowW, color, alpha * 0.5).setDepth(2);
    scene.add.rectangle(ROOM_WIDTH / 2, ROOM_HEIGHT - WALL_THICKNESS - glowW / 2, ROOM_WIDTH, glowW, color, alpha * 0.5).setDepth(2);
    scene.add.rectangle(WALL_THICKNESS + glowW / 2, ROOM_HEIGHT / 2, glowW, ROOM_HEIGHT, color, alpha * 0.4).setDepth(2);
    scene.add.rectangle(ROOM_WIDTH - WALL_THICKNESS - glowW / 2, ROOM_HEIGHT / 2, glowW, ROOM_HEIGHT, color, alpha * 0.4).setDepth(2);
  }

  // ── Corner pillars ──────────────────────────────────────────────────────

  private static drawCornerPillars(scene: Phaser.Scene, theme: LayerColors, accent: RoomAccent): void {
    const inset = WALL_THICKNESS + 24;
    const corners = [
      { x: inset, y: inset },
      { x: ROOM_WIDTH - inset, y: inset },
      { x: inset, y: ROOM_HEIGHT - inset },
      { x: ROOM_WIDTH - inset, y: ROOM_HEIGHT - inset },
    ];

    for (const c of corners) {
      // Pillar base
      scene.add.rectangle(c.x, c.y, 16, 16, theme.wallHighlight, 0.5).setDepth(4).setAngle(45);
      // Pillar glow dot
      const dot = scene.add.circle(c.x, c.y, 3, theme.runeColor, 0.3).setDepth(4);
      scene.tweens.add({
        targets: dot,
        alpha: { from: 0.15, to: 0.4 },
        duration: 2000 + Math.random() * 1000,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // ── Ambient particles ───────────────────────────────────────────────────

  private static spawnAmbientParticles(scene: Phaser.Scene, theme: LayerColors, accent: RoomAccent): void {
    const count = Math.round(12 * accent.atmosphereIntensity);
    const minX = WALL_THICKNESS + 30;
    const maxX = ROOM_WIDTH - WALL_THICKNESS - 30;
    const minY = WALL_THICKNESS + 30;
    const maxY = ROOM_HEIGHT - WALL_THICKNESS - 30;

    for (let i = 0; i < count; i++) {
      const x = Phaser.Math.Between(minX, maxX);
      const y = Phaser.Math.Between(minY, maxY);
      const color = Math.random() > 0.5 ? theme.ambientColor : theme.ambientAltColor;
      const size = 1 + Math.random() * 1.5;

      const mote = scene.add.circle(x, y, size, color, 0).setDepth(2);

      // Gentle floating drift
      scene.tweens.add({
        targets: mote,
        x: x + Phaser.Math.Between(-40, 40),
        y: y + Phaser.Math.Between(-40, 40),
        alpha: { from: 0, to: 0.15 + Math.random() * 0.2 },
        duration: 4000 + Math.random() * 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 3000,
      });
    }
  }

  // ── Non-combat room background ──────────────────────────────────────────

  /** Simplified environment for non-combat scenes (shrine, vault, etc.) */
  static createBackground(scene: Phaser.Scene, roomType: RoomType, layerIndex: number, sinId?: SinId | null): void {
    const theme = getLayerTheme(layerIndex);
    const accent = getRoomAccent(roomType, sinId);
    const cx = ROOM_WIDTH / 2, cy = ROOM_HEIGHT / 2;

    // Dark base
    scene.add.rectangle(cx, cy, ROOM_WIDTH, ROOM_HEIGHT, theme.floorBase, 1).setDepth(0);

    // Subtle tile pattern
    const gfx = scene.add.graphics().setDepth(1);
    gfx.lineStyle(0.5, theme.floorLine, theme.floorLineAlpha * 0.5);
    for (let x = 0; x <= ROOM_WIDTH; x += 48) gfx.lineBetween(x, 0, x, ROOM_HEIGHT);
    for (let y = 0; y <= ROOM_HEIGHT; y += 48) gfx.lineBetween(0, y, ROOM_WIDTH, y);

    // Central circle motif
    const runeCol = accent.extraRuneColor ?? theme.runeColor;
    gfx.lineStyle(1, runeCol, theme.runeAlpha);
    gfx.strokeCircle(cx, cy, 120);
    gfx.lineStyle(0.5, runeCol, theme.runeAlpha * 0.6);
    gfx.strokeCircle(cx, cy, 80);
    gfx.strokeCircle(cx, cy, 150);

    // Vignette
    RoomEnvironment.drawVignette(scene, theme);

    // Ambient particles (fewer for non-combat)
    const reducedAccent = { ...accent, atmosphereIntensity: accent.atmosphereIntensity * 0.5 };
    RoomEnvironment.spawnAmbientParticles(scene, theme, reducedAccent);

    // Environmental props
    EnvironmentProps.populate(scene, roomType, layerIndex, theme, accent, sinId);

    // Camera fade-in
    if (scene.cameras?.main) {
      scene.cameras.main.fadeIn(300, 0, 0, 0);
    }
  }
}
