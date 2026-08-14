// src/visuals/BladeVisuals.ts

import Phaser from 'phaser';
import { VisualConfig, CoreId } from '../config/spellComponents';
import { getCoreTheme } from './CoreVisualTheme';

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
  coreId: CoreId;
}

export class BladeVisuals {

  static render(params: BladeVisualParams): void {
    const { scene, x, y, aimAngle, visual, swingDuration, coreId } = params;
    const range = params.range * params.sizeMultiplier;
    const arcAngleDeg = params.arcAngleDeg * params.sizeMultiplier;
    const halfArc = Phaser.Math.DegToRad(arcAngleDeg / 2);
    const theme = getCoreTheme(coreId);

    // Animated sweep
    const totalFrames = 6;
    const frameDelay = swingDuration / totalFrames;

    for (let i = 0; i < totalFrames; i++) {
      scene.time.delayedCall(i * frameDelay, () => {
        const progress = i / (totalFrames - 1);
        const sweepAngle = aimAngle - halfArc + (halfArc * 2) * progress;
        const endX = x + Math.cos(sweepAngle) * range;
        const endY = y + Math.sin(sweepAngle) * range;

        const slashLine = scene.add.line(0, 0, x, y, endX, endY, visual.color, 0.7 - progress * 0.3)
          .setOrigin(0, 0).setLineWidth(3).setDepth(25);
        scene.tweens.add({ targets: slashLine, alpha: 0, duration: 120, onComplete: () => slashLine.destroy() });

        const spark = scene.add.circle(endX, endY, 4 - progress * 2, visual.glowColor, 0.8).setDepth(26);
        scene.tweens.add({ targets: spark, alpha: 0, scaleX: 2, scaleY: 2, duration: 150, onComplete: () => spark.destroy() });

        // Core-themed particles at tip
        theme.spawnTrailParticle(scene, endX, endY, visual);
        if (Math.random() > 0.4) theme.spawnAmbientParticle(scene, endX, endY, visual);
      });
    }

    // Arc fill
    const arcGfx = scene.add.graphics().setDepth(23);
    arcGfx.fillStyle(visual.color, 0.12);
    arcGfx.beginPath(); arcGfx.moveTo(x, y);
    arcGfx.arc(x, y, range + 8, aimAngle - halfArc, aimAngle + halfArc, false);
    arcGfx.closePath(); arcGfx.fillPath();

    arcGfx.fillStyle(visual.color, 0.25);
    arcGfx.beginPath(); arcGfx.moveTo(x, y);
    arcGfx.arc(x, y, range, aimAngle - halfArc, aimAngle + halfArc, false);
    arcGfx.closePath(); arcGfx.fillPath();

    arcGfx.lineStyle(2.5, visual.glowColor, 0.8);
    arcGfx.beginPath();
    arcGfx.arc(x, y, range, aimAngle - halfArc, aimAngle + halfArc, false);
    arcGfx.strokePath();

    arcGfx.lineStyle(1, 0xffffff, 0.4);
    arcGfx.beginPath();
    arcGfx.arc(x, y, range - 3, aimAngle - halfArc * 0.8, aimAngle + halfArc * 0.8, false);
    arcGfx.strokePath();

    const trailGfx = scene.add.graphics().setDepth(24);
    for (let i = 0; i < 5; i++) {
      const angle = aimAngle - halfArc + ((halfArc * 2) / 4) * i;
      const innerR = range * 0.3;
      const outerR = range * (0.85 + Math.random() * 0.15);
      trailGfx.lineStyle(1.5, visual.glowColor, 0.5 + Math.random() * 0.3);
      trailGfx.lineBetween(
        x + Math.cos(angle) * innerR, y + Math.sin(angle) * innerR,
        x + Math.cos(angle) * outerR, y + Math.sin(angle) * outerR,
      );
    }

    scene.tweens.add({
      targets: [arcGfx, trailGfx], alpha: 0, duration: swingDuration + 80, ease: 'Power2',
      onComplete: () => { arcGfx.destroy(); trailGfx.destroy(); },
    });

    // Impact particles with core theme
    for (let i = 0; i < 8; i++) {
      const angle = aimAngle - halfArc + Math.random() * halfArc * 2;
      const dist = range * (0.7 + Math.random() * 0.3);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      theme.spawnTrailParticle(scene, px, py, visual, Math.cos(angle) * 40, Math.sin(angle) * 40);
    }
  }
}