// src/visuals/BeamVisuals.ts
//
// BEAM: Continuous line from caster toward target.
// - Visible pulsing beam with defined width
// - Core-colored with bright center
// - Shimmer/particle effect along the length
// - Start and end points clearly visible
// - Persists for cast duration

import Phaser from 'phaser';
import { VisualConfig } from '../config/spellComponents';

export interface BeamVisualParams {
  scene: Phaser.Scene;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  castDuration: number;
  visual: VisualConfig;
  sizeMultiplier: number;
}

export interface BeamVisualHandle {
  destroy: () => void;
}

export class BeamVisuals {

  static render(params: BeamVisualParams): BeamVisualHandle {
    const { scene, startX, startY, endX, endY, visual, castDuration } = params;
    const beamWidth = params.width * params.sizeMultiplier;

    const allObjects: Phaser.GameObjects.GameObject[] = [];
    const allTimers: Phaser.Time.TimerEvent[] = [];

    // ── Outer glow beam ─────────────────────────────────────────────────

    const outerGlow = scene.add.line(
      0, 0, startX, startY, endX, endY, visual.color, 0.15
    ).setOrigin(0, 0).setLineWidth(beamWidth * 1.8).setDepth(18);
    allObjects.push(outerGlow);

    // Pulse the outer glow
    scene.tweens.add({
      targets: outerGlow,
      alpha: { from: 0.1, to: 0.25 },
      duration: 150,
      yoyo: true,
      repeat: Math.floor(castDuration / 300),
    });

    // ── Main beam ───────────────────────────────────────────────────────

    const mainBeam = scene.add.line(
      0, 0, startX, startY, endX, endY, visual.color, 0.6
    ).setOrigin(0, 0).setLineWidth(beamWidth / 2).setDepth(20);
    allObjects.push(mainBeam);

    // ── Bright core line ────────────────────────────────────────────────

    const coreLine = scene.add.line(
      0, 0, startX, startY, endX, endY, visual.glowColor, 0.7
    ).setOrigin(0, 0).setLineWidth(beamWidth / 5).setDepth(21);
    allObjects.push(coreLine);

    // ── Ultra-bright center ─────────────────────────────────────────────

    const centerLine = scene.add.line(
      0, 0, startX, startY, endX, endY, 0xffffff, 0.35
    ).setOrigin(0, 0).setLineWidth(1.5).setDepth(22);
    allObjects.push(centerLine);

    // Flicker the center
    scene.tweens.add({
      targets: centerLine,
      alpha: { from: 0.2, to: 0.5 },
      duration: 80,
      yoyo: true,
      repeat: Math.floor(castDuration / 160),
    });

    // ── Start point (muzzle flash) ──────────────────────────────────────

    const muzzle = scene.add.circle(startX, startY, beamWidth * 0.8, visual.glowColor, 0.5);
    muzzle.setDepth(23);
    allObjects.push(muzzle);

    const muzzleInner = scene.add.circle(startX, startY, beamWidth * 0.3, 0xffffff, 0.6);
    muzzleInner.setDepth(24);
    allObjects.push(muzzleInner);

    scene.tweens.add({
      targets: [muzzle, muzzleInner],
      scaleX: { from: 0.5, to: 1.2 },
      scaleY: { from: 0.5, to: 1.2 },
      alpha: { from: 0.3, to: 0.6 },
      duration: 120,
      yoyo: true,
      repeat: Math.floor(castDuration / 240),
    });

    // ── End point (impact) ──────────────────────────────────────────────

    const endFlare = scene.add.circle(endX, endY, beamWidth * 0.6, visual.color, 0.4);
    endFlare.setDepth(23);
    allObjects.push(endFlare);

    scene.tweens.add({
      targets: endFlare,
      scaleX: { from: 0.8, to: 1.4 },
      scaleY: { from: 0.8, to: 1.4 },
      duration: 200,
      yoyo: true,
      repeat: Math.floor(castDuration / 400),
    });

    // ── Shimmer particles along the beam ────────────────────────────────

    const dx = endX - startX;
    const dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / dist;
    const perpY = dx / dist;

    const shimmerTimer = scene.time.addEvent({
      delay: 60,
      repeat: Math.floor(castDuration / 60),
      callback: () => {
        const t = Math.random();
        const px = startX + dx * t;
        const py = startY + dy * t;
        const offset = (Math.random() - 0.5) * beamWidth * 1.2;

        const particle = scene.add.circle(
          px + perpX * offset,
          py + perpY * offset,
          1 + Math.random() * 2,
          Math.random() > 0.5 ? visual.glowColor : visual.color,
          0.6
        ).setDepth(22);

        scene.tweens.add({
          targets: particle,
          x: particle.x + perpX * (Math.random() - 0.5) * 15,
          y: particle.y + perpY * (Math.random() - 0.5) * 15 - 5,
          alpha: 0,
          duration: 150 + Math.random() * 100,
          onComplete: () => particle.destroy(),
        });
      },
    });
    allTimers.push(shimmerTimer);

    // ── Fade out at end of cast ─────────────────────────────────────────

    scene.time.delayedCall(castDuration, () => {
      scene.tweens.add({
        targets: allObjects,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          for (const obj of allObjects) obj.destroy();
        },
      });
      for (const timer of allTimers) timer.destroy();
    });

    return {
      destroy: () => {
        for (const obj of allObjects) if (obj.active) obj.destroy();
        for (const timer of allTimers) timer.destroy();
      },
    };
  }
}