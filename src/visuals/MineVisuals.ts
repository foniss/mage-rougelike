// src/visuals/MineVisuals.ts
//
// MINE: Stationary magical trap.
// - Rune circle with inner pattern
// - Visible arming transition
// - Pulsing when armed
// - Distinct detonation explosion

import Phaser from 'phaser';
import { VisualConfig } from '../config/spellComponents';

export interface MineVisualHandle {
  setArmed: () => void;
  detonate: (radius: number) => void;
  expire: () => void;
  container: Phaser.GameObjects.Container;
}

export class MineVisuals {

  static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    triggerRadius: number,
    visual: VisualConfig,
    sizeMultiplier: number,
  ): MineVisualHandle {
    const container = scene.add.container(x, y).setDepth(6);

    const scaledTrigger = triggerRadius * sizeMultiplier;

    // ── Trigger radius ring (faint) ─────────────────────────────────────

    const triggerRing = scene.add.circle(0, 0, scaledTrigger, visual.color, 0.03);
    triggerRing.setStrokeStyle(1, visual.color, 0.1);
    container.add(triggerRing);

    // ── Outer rune circle ───────────────────────────────────────────────

    const outerRune = scene.add.circle(0, 0, 18 * sizeMultiplier, 0x000000, 0);
    outerRune.setStrokeStyle(1.5, visual.color, 0.5);
    container.add(outerRune);

    // ── Inner rune pattern (cross + diagonals) ──────────────────────────

    const runeGfx = scene.add.graphics().setDepth(6);
    const runeSize = 12 * sizeMultiplier;

    runeGfx.lineStyle(1, visual.color, 0.3);
    // Cross
    runeGfx.lineBetween(x - runeSize, y, x + runeSize, y);
    runeGfx.lineBetween(x, y - runeSize, x, y + runeSize);
    // Diagonals
    const d = runeSize * 0.7;
    runeGfx.lineBetween(x - d, y - d, x + d, y + d);
    runeGfx.lineBetween(x + d, y - d, x - d, y + d);

    // Inner circle
    runeGfx.lineStyle(1, visual.glowColor, 0.2);
    runeGfx.strokeCircle(x, y, 8 * sizeMultiplier);

    // ── Center gem ──────────────────────────────────────────────────────

    const gem = scene.add.circle(0, 0, 4 * sizeMultiplier, visual.color, 0.6);
    container.add(gem);

    const gemGlow = scene.add.circle(0, 0, 6 * sizeMultiplier, visual.glowColor, 0.15);
    container.add(gemGlow);

    // ── Unarmed state: dim, no pulse ────────────────────────────────────

    container.setAlpha(0.5);

    // Placement animation
    scene.tweens.add({
      targets: container,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      alpha: { from: 0, to: 0.5 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    // ── Slow rotation ───────────────────────────────────────────────────

    scene.tweens.add({
      targets: outerRune,
      angle: 360,
      duration: 8000,
      repeat: -1,
    });

    let armPulse: Phaser.Tweens.Tween | null = null;

    const setArmed = () => {
      // Flash bright
      scene.tweens.add({
        targets: container,
        alpha: 1,
        duration: 200,
      });

      scene.tweens.add({
        targets: gem,
        fillColor: visual.glowColor,
        alpha: { from: 0.4, to: 0.9 },
        duration: 300,
      });

      // Start pulsing
      armPulse = scene.tweens.add({
        targets: gemGlow,
        scaleX: { from: 1, to: 1.8 },
        scaleY: { from: 1, to: 1.8 },
        alpha: { from: 0.1, to: 0.35 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Rune brightens
      outerRune.setStrokeStyle(2, visual.glowColor, 0.7);
    };

    const detonate = (explosionRadius: number) => {
      if (armPulse) armPulse.destroy();

      const scaledExplosion = explosionRadius * sizeMultiplier;

      // Bright flash
      const flash = scene.add.circle(x, y, 15, 0xffffff, 0.8).setDepth(25);
      scene.tweens.add({
        targets: flash,
        scaleX: scaledExplosion / 15,
        scaleY: scaledExplosion / 15,
        alpha: 0,
        duration: 150,
        onComplete: () => flash.destroy(),
      });

      // Expanding ring
      const ring = scene.add.circle(x, y, 10, 0x000000, 0).setDepth(25);
      ring.setStrokeStyle(3, visual.color, 0.8);
      scene.tweens.add({
        targets: ring,
        scaleX: scaledExplosion / 10,
        scaleY: scaledExplosion / 10,
        alpha: 0,
        duration: 350,
        ease: 'Power2',
        onComplete: () => ring.destroy(),
      });

      // Second ring (delayed)
      scene.time.delayedCall(80, () => {
        const ring2 = scene.add.circle(x, y, 10, 0x000000, 0).setDepth(25);
        ring2.setStrokeStyle(2, visual.glowColor, 0.5);
        scene.tweens.add({
          targets: ring2,
          scaleX: (scaledExplosion * 0.7) / 10,
          scaleY: (scaledExplosion * 0.7) / 10,
          alpha: 0,
          duration: 300,
          onComplete: () => ring2.destroy(),
        });
      });

      // Fill flash
      const fillFlash = scene.add.circle(x, y, scaledExplosion * 0.3, visual.color, 0.3).setDepth(24);
      scene.tweens.add({
        targets: fillFlash,
        scaleX: 3,
        scaleY: 3,
        alpha: 0,
        duration: 300,
        onComplete: () => fillFlash.destroy(),
      });

      // Explosion particles
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const dist = scaledExplosion * (0.3 + Math.random() * 0.7);
        const particle = scene.add.circle(x, y, 2 + Math.random() * 3, visual.trailColor, 0.7).setDepth(25);

        scene.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          alpha: 0,
          duration: 200 + Math.random() * 200,
          onComplete: () => particle.destroy(),
        });
      }

      // Destroy the mine
      container.destroy();
      runeGfx.destroy();
    };

    const expire = () => {
      if (armPulse) armPulse.destroy();
      scene.tweens.add({
        targets: [container],
        alpha: 0, scaleX: 0.3, scaleY: 0.3,
        duration: 400,
        onComplete: () => { container.destroy(); runeGfx.destroy(); },
      });
    };

    return { setArmed, detonate, expire, container };
  }
}