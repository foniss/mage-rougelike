// src/visuals/cores/FireTheme.ts

import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';

const FLAME_COLORS = [0xff6600, 0xff4400, 0xff8800, 0xffaa00, 0xff3300, 0xffcc22];

export class FireTheme implements CoreVisualTheme {

  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void {
    const color = Phaser.Utils.Array.GetRandom(FLAME_COLORS);
    const size = 2 + Math.random() * 3;
    const ox = (Math.random() - 0.5) * 16;
    const oy = (Math.random() - 0.5) * 10;

    const p = scene.add.circle(x + ox, y + oy, size, color, 0.6).setDepth(22);

    scene.tweens.add({
      targets: p,
      y: p.y - 10 - Math.random() * 12,
      x: p.x + (Math.random() - 0.5) * 8,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 300 + Math.random() * 200,
      onComplete: () => p.destroy(),
    });
  }

  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void {
    const color = Phaser.Utils.Array.GetRandom(FLAME_COLORS);
    const size = 1.5 + Math.random() * 3;

    const p = scene.add.circle(x, y, size, color, 0.7).setDepth(7);

    scene.tweens.add({
      targets: p,
      x: p.x - vx * 0.1 + (Math.random() - 0.5) * 6,
      y: p.y - vy * 0.1 - 8 - Math.random() * 6,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.3,
      duration: 200 + Math.random() * 150,
      onComplete: () => p.destroy(),
    });
  }

  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void {
    // Central flame burst
    const burst = scene.add.circle(x, y, 8, 0xff6600, 0.6).setDepth(25);
    scene.tweens.add({
      targets: burst, scaleX: radius / 8, scaleY: radius / 8, alpha: 0,
      duration: 250, ease: 'Power2', onComplete: () => burst.destroy(),
    });

    // Inner bright flash
    const flash = scene.add.circle(x, y, 5, 0xffcc44, 0.7).setDepth(26);
    scene.tweens.add({
      targets: flash, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 150, onComplete: () => flash.destroy(),
    });

    // Fire embers
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.3 + Math.random() * 0.7);
      const color = Phaser.Utils.Array.GetRandom(FLAME_COLORS);
      const ember = scene.add.circle(x, y, 1.5 + Math.random() * 2.5, color, 0.8).setDepth(25);

      scene.tweens.add({
        targets: ember,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - Math.random() * 10,
        alpha: 0,
        duration: 200 + Math.random() * 200,
        onComplete: () => ember.destroy(),
      });
    }
  }

  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void {
    // Rising flame particle on burning enemy
    const color = Phaser.Utils.Array.GetRandom(FLAME_COLORS);
    const size = 2 + Math.random() * 3 * intensity;
    const ox = (Math.random() - 0.5) * 14;

    const flame = scene.add.circle(ex + ox, ey + 5, size, color, 0.6).setDepth(22);

    scene.tweens.add({
      targets: flame,
      y: flame.y - 14 - Math.random() * 8,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.4,
      duration: 350 + Math.random() * 150,
      onComplete: () => flame.destroy(),
    });
  }

  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void {
    const line = scene.add.line(0, 0, x1, y1, x2, y2, 0xff6600, 0.5)
      .setOrigin(0, 0).setLineWidth(2).setDepth(20);
    scene.tweens.add({
      targets: line, alpha: 0, duration: 300,
      onComplete: () => line.destroy(),
    });
  }

  getBeamParticleConfig() {
    return { colors: FLAME_COLORS, sizes: [2, 5] as [number, number], speed: 8, alpha: 0.7 };
  }

  getGlowConfig() {
    return { color: 0xff6600, alpha: 0.15, radius: 10, pulseSpeed: 400 };
  }
}