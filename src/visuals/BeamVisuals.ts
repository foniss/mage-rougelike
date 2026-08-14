// src/visuals/BeamVisuals.ts

import Phaser from 'phaser';
import { VisualConfig, CoreId } from '../config/spellComponents';
import { getCoreTheme } from './CoreVisualTheme';

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
  coreId: CoreId;
}

export interface BeamVisualHandle { destroy: () => void; }

export class BeamVisuals {

  static render(params: BeamVisualParams): BeamVisualHandle {
    const { scene, startX, startY, endX, endY, visual, castDuration, coreId } = params;
    const beamWidth = params.width * params.sizeMultiplier;
    const theme = getCoreTheme(coreId);
    const particleCfg = theme.getBeamParticleConfig();

    const allObjects: Phaser.GameObjects.GameObject[] = [];
    const allTimers: Phaser.Time.TimerEvent[] = [];

    const outerGlow = scene.add.line(0, 0, startX, startY, endX, endY, visual.color, 0.15)
      .setOrigin(0, 0).setLineWidth(beamWidth * 1.8).setDepth(18);
    allObjects.push(outerGlow);
    scene.tweens.add({ targets: outerGlow, alpha: { from: 0.1, to: 0.25 }, duration: 150, yoyo: true, repeat: Math.floor(castDuration / 300) });

    const mainBeam = scene.add.line(0, 0, startX, startY, endX, endY, visual.color, 0.6)
      .setOrigin(0, 0).setLineWidth(beamWidth / 2).setDepth(20);
    allObjects.push(mainBeam);

    const coreLine = scene.add.line(0, 0, startX, startY, endX, endY, visual.glowColor, 0.7)
      .setOrigin(0, 0).setLineWidth(beamWidth / 5).setDepth(21);
    allObjects.push(coreLine);

    const centerLine = scene.add.line(0, 0, startX, startY, endX, endY, 0xffffff, 0.35)
      .setOrigin(0, 0).setLineWidth(1.5).setDepth(22);
    allObjects.push(centerLine);
    scene.tweens.add({ targets: centerLine, alpha: { from: 0.2, to: 0.5 }, duration: 80, yoyo: true, repeat: Math.floor(castDuration / 160) });

    const muzzle = scene.add.circle(startX, startY, beamWidth * 0.8, visual.glowColor, 0.5).setDepth(23);
    allObjects.push(muzzle);
    const muzzleInner = scene.add.circle(startX, startY, beamWidth * 0.3, 0xffffff, 0.6).setDepth(24);
    allObjects.push(muzzleInner);
    scene.tweens.add({ targets: [muzzle, muzzleInner], scaleX: { from: 0.5, to: 1.2 }, scaleY: { from: 0.5, to: 1.2 }, alpha: { from: 0.3, to: 0.6 }, duration: 120, yoyo: true, repeat: Math.floor(castDuration / 240) });

    const endFlare = scene.add.circle(endX, endY, beamWidth * 0.6, visual.color, 0.4).setDepth(23);
    allObjects.push(endFlare);
    scene.tweens.add({ targets: endFlare, scaleX: { from: 0.8, to: 1.4 }, scaleY: { from: 0.8, to: 1.4 }, duration: 200, yoyo: true, repeat: Math.floor(castDuration / 400) });

    const dx = endX - startX, dy = endY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const perpX = -dy / (dist || 1), perpY = dx / (dist || 1);

    // Core-themed shimmer particles
    const shimmerTimer = scene.time.addEvent({
      delay: 50, repeat: Math.floor(castDuration / 50),
      callback: () => {
        const t = Math.random();
        const px = startX + dx * t;
        const py = startY + dy * t;
        const offset = (Math.random() - 0.5) * beamWidth * 1.2;
        theme.spawnTrailParticle(scene, px + perpX * offset, py + perpY * offset, visual, perpX * particleCfg.speed, perpY * particleCfg.speed);
      },
    });
    allTimers.push(shimmerTimer);

    // Core ambient particles at muzzle and end
    const ambientTimer = scene.time.addEvent({
      delay: 100, repeat: Math.floor(castDuration / 100),
      callback: () => {
        theme.spawnAmbientParticle(scene, startX, startY, visual);
        theme.spawnAmbientParticle(scene, endX, endY, visual);
      },
    });
    allTimers.push(ambientTimer);

    scene.time.delayedCall(castDuration, () => {
      // Impact at end
      theme.renderImpact(scene, endX, endY, visual, beamWidth * 2);

      scene.tweens.add({
        targets: allObjects, alpha: 0, duration: 200, ease: 'Power2',
        onComplete: () => { for (const obj of allObjects) obj.destroy(); },
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