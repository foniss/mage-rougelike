// src/visuals/NovaVisuals.ts

import Phaser from 'phaser';
import { VisualConfig, CoreId } from '../config/spellComponents';
import { getCoreTheme } from './CoreVisualTheme';

export interface NovaVisualParams {
  scene: Phaser.Scene;
  x: number;
  y: number;
  radius: number;
  expandDuration: number;
  visual: VisualConfig;
  sizeMultiplier: number;
  coreId: CoreId;
}

export class NovaVisuals {

  static render(params: NovaVisualParams): void {
    const { scene, x, y, visual, expandDuration, coreId } = params;
    const radius = params.radius * params.sizeMultiplier;
    const theme = getCoreTheme(coreId);

    // ── Center flash (bright, immediate) ────────────────────────────────

    const centerFlash = scene.add.circle(x, y, 12, 0xffffff, 0.8).setDepth(26);
    scene.tweens.add({
      targets: centerFlash,
      scaleX: 3, scaleY: 3, alpha: 0,
      duration: expandDuration * 0.6,
      ease: 'Power3',
      onComplete: () => centerFlash.destroy(),
    });

    // ── Inner fill pulse ────────────────────────────────────────────────

    const innerFill = scene.add.circle(x, y, radius * 0.2, visual.glowColor, 0.4).setDepth(23);
    scene.tweens.add({
      targets: innerFill,
      scaleX: radius / (radius * 0.2) * 0.6,
      scaleY: radius / (radius * 0.2) * 0.6,
      alpha: 0,
      duration: expandDuration * 0.8,
      ease: 'Power2',
      onComplete: () => innerFill.destroy(),
    });

    // ── Main expanding ring ─────────────────────────────────────────────

    const mainRing = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(25);
    mainRing.setStrokeStyle(3, visual.color, 0.9);
    scene.tweens.add({
      targets: mainRing,
      scaleX: radius / 8,
      scaleY: radius / 8,
      alpha: 0,
      duration: expandDuration,
      ease: 'Power2',
      onComplete: () => mainRing.destroy(),
    });

    // ── Secondary ring (slightly delayed) ───────────────────────────────

    scene.time.delayedCall(40, () => {
      const secondRing = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(24);
      secondRing.setStrokeStyle(2, visual.glowColor, 0.6);
      scene.tweens.add({
        targets: secondRing,
        scaleX: radius * 0.85 / 8,
        scaleY: radius * 0.85 / 8,
        alpha: 0,
        duration: expandDuration * 0.9,
        ease: 'Power2',
        onComplete: () => secondRing.destroy(),
      });
    });

    // ── Tertiary ring (faint, large) ────────────────────────────────────

    scene.time.delayedCall(80, () => {
      const thirdRing = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(22);
      thirdRing.setStrokeStyle(1, visual.color, 0.3);
      scene.tweens.add({
        targets: thirdRing,
        scaleX: radius * 1.15 / 8,
        scaleY: radius * 1.15 / 8,
        alpha: 0,
        duration: expandDuration * 1.2,
        onComplete: () => thirdRing.destroy(),
      });
    });

    // ── Core-themed impact at center ────────────────────────────────────

    theme.renderImpact(scene, x, y, visual, radius * 0.5);

    // ── Core-themed radial particle burst ───────────────────────────────

    const particleCount = 20 + Math.floor(radius / 10);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const dist = radius * (0.5 + Math.random() * 0.5);
      const speed = 0.4 + Math.random() * 0.6;

      // Use core-themed trail particles instead of generic circles
      const px = x + Math.cos(angle) * dist * 0.15;
      const py = y + Math.sin(angle) * dist * 0.15;

      scene.time.delayedCall(Math.random() * expandDuration * 0.5, () => {
        theme.spawnTrailParticle(
          scene, px, py, visual,
          Math.cos(angle) * 50 * speed,
          Math.sin(angle) * 50 * speed,
        );
      });
    }

    // ── Core-themed ambient particles at edges ──────────────────────────

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      scene.time.delayedCall(expandDuration * 0.3 + Math.random() * expandDuration * 0.4, () => {
        const edgeX = x + Math.cos(angle) * radius * 0.8;
        const edgeY = y + Math.sin(angle) * radius * 0.8;
        theme.spawnAmbientParticle(scene, edgeX, edgeY, visual);
      });
    }

    // ── Ground scorch mark (fades slowly) ───────────────────────────────

    const scorch = scene.add.circle(x, y, radius * 0.8, visual.color, 0.06).setDepth(3);
    scene.tweens.add({
      targets: scorch,
      alpha: 0,
      duration: 2000,
      delay: expandDuration,
      onComplete: () => scorch.destroy(),
    });
  }
}