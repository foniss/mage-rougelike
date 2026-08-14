// src/visuals/cores/StormTheme.ts

import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';

const STORM_COLORS = [0xaa88ff, 0xccaaff, 0xddbbff, 0x9977ee, 0xeeddff, 0xffffff];

export class StormTheme implements CoreVisualTheme {

  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void {
    // Small electrical spark
    const color = Phaser.Utils.Array.GetRandom(STORM_COLORS);
    const ox = (Math.random() - 0.5) * 16;
    const oy = (Math.random() - 0.5) * 16;

    const spark = scene.add.circle(x + ox, y + oy, 1 + Math.random() * 1.5, color, 0.8)
      .setDepth(22);

    // Quick flash and gone
    scene.tweens.add({
      targets: spark,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 80 + Math.random() * 80,
      onComplete: () => spark.destroy(),
    });

    // Tiny arc from spark to nearby point
    if (Math.random() > 0.5) {
      const arcEnd = {
        x: x + ox + (Math.random() - 0.5) * 12,
        y: y + oy + (Math.random() - 0.5) * 12,
      };
      const arcGfx = scene.add.graphics().setDepth(22);
      arcGfx.lineStyle(0.5, color, 0.6);
      arcGfx.lineBetween(x + ox, y + oy, arcEnd.x, arcEnd.y);
      scene.tweens.add({
        targets: arcGfx, alpha: 0, duration: 100,
        onComplete: () => arcGfx.destroy(),
      });
    }
  }

  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void {
    const color = Phaser.Utils.Array.GetRandom(STORM_COLORS);

    // Electrical spark trail
    const spark = scene.add.circle(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8,
      1 + Math.random() * 1.5, color, 0.7
    ).setDepth(7);

    scene.tweens.add({
      targets: spark,
      alpha: 0,
      duration: 100 + Math.random() * 80,
      onComplete: () => spark.destroy(),
    });

    // Mini arc
    if (Math.random() > 0.6) {
      const gfx = scene.add.graphics().setDepth(7);
      gfx.lineStyle(0.5, 0xccaaff, 0.5);
      const ex = x + (Math.random() - 0.5) * 14;
      const ey = y + (Math.random() - 0.5) * 14;
      gfx.lineBetween(x, y, ex, ey);
      scene.tweens.add({
        targets: gfx, alpha: 0, duration: 80,
        onComplete: () => gfx.destroy(),
      });
    }
  }

  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void {
    // Bright electrical flash
    const flash = scene.add.circle(x, y, 8, 0xffffff, 0.7).setDepth(26);
    scene.tweens.add({
      targets: flash, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 100, onComplete: () => flash.destroy(),
    });

    // Electric burst ring
    const ring = scene.add.circle(x, y, 5, 0x000000, 0).setDepth(25);
    ring.setStrokeStyle(2, 0xaa88ff, 0.8);
    scene.tweens.add({
      targets: ring, scaleX: radius / 5, scaleY: radius / 5, alpha: 0,
      duration: 200, onComplete: () => ring.destroy(),
    });

    // Branching arcs from center
    for (let i = 0; i < 6; i++) {
      const gfx = scene.add.graphics().setDepth(25);
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const dist = radius * (0.5 + Math.random() * 0.5);

      gfx.lineStyle(1.5, Phaser.Utils.Array.GetRandom(STORM_COLORS), 0.7);
      gfx.beginPath();
      gfx.moveTo(x, y);

      // Jagged path
      let cx = x, cy = y;
      const segments = 3 + Math.floor(Math.random() * 3);
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const perpOffset = (Math.random() - 0.5) * 10;
        cx = x + Math.cos(angle) * dist * t + Math.sin(angle) * perpOffset;
        cy = y + Math.sin(angle) * dist * t - Math.cos(angle) * perpOffset;
        gfx.lineTo(cx, cy);
      }
      gfx.strokePath();

      scene.tweens.add({
        targets: gfx, alpha: 0, duration: 200 + Math.random() * 100,
        onComplete: () => gfx.destroy(),
      });
    }
  }

  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void {
    // Small sparks dancing on stunned/shocked enemy
    const color = Phaser.Utils.Array.GetRandom(STORM_COLORS);
    const ox = (Math.random() - 0.5) * 18;
    const oy = (Math.random() - 0.5) * 18;

    const spark = scene.add.circle(ex + ox, ey + oy, 1.5, color, 0.8).setDepth(22);
    scene.tweens.add({
      targets: spark, alpha: 0, scaleX: 2.5, scaleY: 2.5,
      duration: 80 + Math.random() * 60,
      onComplete: () => spark.destroy(),
    });

    // Micro arc on enemy
    const gfx = scene.add.graphics().setDepth(22);
    gfx.lineStyle(0.8, color, 0.6);
    gfx.lineBetween(
      ex + (Math.random() - 0.5) * 14,
      ey + (Math.random() - 0.5) * 14,
      ex + (Math.random() - 0.5) * 14,
      ey + (Math.random() - 0.5) * 14,
    );
    scene.tweens.add({
      targets: gfx, alpha: 0, duration: 100,
      onComplete: () => gfx.destroy(),
    });
  }

  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / (dist || 1), perpY = dx / (dist || 1);

    // Jagged lightning arc
    const glow = scene.add.graphics().setDepth(20);
    const core = scene.add.graphics().setDepth(21);

    const segments = 6 + Math.floor(Math.random() * 4);
    const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const midFactor = Math.sin(t * Math.PI);
      const offset = (Math.random() * 2 - 1) * 14 * midFactor;
      points.push({
        x: x1 + dx * t + perpX * offset,
        y: y1 + dy * t + perpY * offset,
      });
    }
    points.push({ x: x2, y: y2 });

    glow.lineStyle(6, 0xccaaff, 0.25);
    glow.beginPath(); glow.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) glow.lineTo(points[i].x, points[i].y);
    glow.strokePath();

    core.lineStyle(2, 0xddbbff, 0.8);
    core.beginPath(); core.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) core.lineTo(points[i].x, points[i].y);
    core.strokePath();

    scene.tweens.add({
      targets: [glow, core], alpha: 0, duration: 300,
      onComplete: () => { glow.destroy(); core.destroy(); },
    });
  }

  getBeamParticleConfig() {
    return { colors: STORM_COLORS, sizes: [1, 2.5] as [number, number], speed: 15, alpha: 0.7 };
  }

  getGlowConfig() {
    return { color: 0xaa88ff, alpha: 0.12, radius: 9, pulseSpeed: 200 };
  }
}