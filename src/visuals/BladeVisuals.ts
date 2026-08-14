// src/visuals/BladeVisuals.ts
//
// BLADE: Immediate close-range arc slash.
// - Sweeping arc trail
// - Core-colored slash edge
// - Afterimage streaks
// - Short, punchy lifespan

import Phaser from 'phaser';
import { VisualConfig } from '../config/spellComponents';

export interface BladeVisualParams {
  scene: Phaser.Scene;
  x: number;
  y: number;
  aimAngle: number;
  range: number;
  arcAngleDeg: number;
  swingDuration: number;
  visual: VisualConfig;
  sizeMultiplier: number;
}

export class BladeVisuals {

  static render(params: BladeVisualParams): void {
    const { scene, x, y, aimAngle, visual, swingDuration } = params;
    const range = params.range * params.sizeMultiplier;
    const arcAngleDeg = params.arcAngleDeg * params.sizeMultiplier;
    const halfArc = Phaser.Math.DegToRad(arcAngleDeg / 2);

    // ── Animated swing arc ──────────────────────────────────────────────

    // We draw multiple arcs over time to create a sweep animation
    const totalFrames = 6;
    const frameDelay = swingDuration / totalFrames;

    for (let i = 0; i < totalFrames; i++) {
      scene.time.delayedCall(i * frameDelay, () => {
        const progress = i / (totalFrames - 1);
        // Sweep from one side of the arc to the other
        const sweepAngle = aimAngle - halfArc + (halfArc * 2) * progress;

        // Slash line from center outward
        const endX = x + Math.cos(sweepAngle) * range;
        const endY = y + Math.sin(sweepAngle) * range;

        // Main slash line
        const slashLine = scene.add.line(
          0, 0, x, y, endX, endY, visual.color, 0.7 - progress * 0.3
        ).setOrigin(0, 0).setLineWidth(3).setDepth(25);

        scene.tweens.add({
          targets: slashLine, alpha: 0, duration: 120,
          onComplete: () => slashLine.destroy(),
        });

        // Tip spark
        const spark = scene.add.circle(endX, endY, 4 - progress * 2, visual.glowColor, 0.8);
        spark.setDepth(26);
        scene.tweens.add({
          targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: 150,
          onComplete: () => spark.destroy(),
        });
      });
    }

    // ── Main filled arc (appears immediately) ───────────────────────────

    const arcGfx = scene.add.graphics().setDepth(23);

    // Outer glow arc
    arcGfx.fillStyle(visual.color, 0.12);
    arcGfx.beginPath();
    arcGfx.moveTo(x, y);
    arcGfx.arc(x, y, range + 8, aimAngle - halfArc, aimAngle + halfArc, false);
    arcGfx.closePath();
    arcGfx.fillPath();

    // Main arc fill
    arcGfx.fillStyle(visual.color, 0.25);
    arcGfx.beginPath();
    arcGfx.moveTo(x, y);
    arcGfx.arc(x, y, range, aimAngle - halfArc, aimAngle + halfArc, false);
    arcGfx.closePath();
    arcGfx.fillPath();

    // Sharp edge along the arc
    arcGfx.lineStyle(2.5, visual.glowColor, 0.8);
    arcGfx.beginPath();
    arcGfx.arc(x, y, range, aimAngle - halfArc, aimAngle + halfArc, false);
    arcGfx.strokePath();

    // Inner bright edge
    arcGfx.lineStyle(1, 0xffffff, 0.4);
    arcGfx.beginPath();
    arcGfx.arc(x, y, range - 3, aimAngle - halfArc * 0.8, aimAngle + halfArc * 0.8, false);
    arcGfx.strokePath();

    // ── Slash trail lines (radial streaks) ──────────────────────────────

    const trailGfx = scene.add.graphics().setDepth(24);
    const streakCount = 5;
    for (let i = 0; i < streakCount; i++) {
      const angle = aimAngle - halfArc + ((halfArc * 2) / (streakCount - 1)) * i;
      const innerR = range * 0.3;
      const outerR = range * (0.85 + Math.random() * 0.15);

      const sx = x + Math.cos(angle) * innerR;
      const sy = y + Math.sin(angle) * innerR;
      const ex = x + Math.cos(angle) * outerR;
      const ey = y + Math.sin(angle) * outerR;

      trailGfx.lineStyle(1.5, visual.glowColor, 0.5 + Math.random() * 0.3);
      trailGfx.lineBetween(sx, sy, ex, ey);
    }

    // ── Fade out everything ─────────────────────────────────────────────

    scene.tweens.add({
      targets: [arcGfx, trailGfx],
      alpha: 0,
      duration: swingDuration + 80,
      ease: 'Power2',
      onComplete: () => {
        arcGfx.destroy();
        trailGfx.destroy();
      },
    });

    // ── Impact particles at the arc edge ────────────────────────────────

    for (let i = 0; i < 8; i++) {
      const angle = aimAngle - halfArc + Math.random() * halfArc * 2;
      const dist = range * (0.7 + Math.random() * 0.3);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = 2 + Math.random() * 3;

      const particle = scene.add.circle(px, py, size, visual.trailColor, 0.7);
      particle.setDepth(24);

      scene.tweens.add({
        targets: particle,
        x: px + Math.cos(angle) * (10 + Math.random() * 15),
        y: py + Math.sin(angle) * (10 + Math.random() * 15),
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: 200 + Math.random() * 150,
        onComplete: () => particle.destroy(),
      });
    }
  }
}