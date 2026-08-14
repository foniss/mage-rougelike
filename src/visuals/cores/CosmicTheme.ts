// src/visuals/cores/CosmicTheme.ts

import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';

const COSMIC_COLORS = [0xdd66ff, 0xee99ff, 0xbb44dd, 0xff88ff, 0x9933cc, 0xcc66ee];
const STAR_COLORS = [0xffffff, 0xffffcc, 0xffccff, 0xccccff];

export class CosmicTheme implements CoreVisualTheme {

  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void {
    // Tiny star/sparkle that fades
    const isStar = Math.random() > 0.5;
    const color = isStar ? Phaser.Utils.Array.GetRandom(STAR_COLORS) : Phaser.Utils.Array.GetRandom(COSMIC_COLORS);
    const size = isStar ? 0.5 + Math.random() * 1.5 : 1 + Math.random() * 2;
    const ox = (Math.random() - 0.5) * 22;
    const oy = (Math.random() - 0.5) * 22;

    const p = scene.add.circle(x + ox, y + oy, size, color, isStar ? 0.9 : 0.4).setDepth(22);

    // Stars twinkle, cosmic particles drift
    if (isStar) {
      scene.tweens.add({
        targets: p,
        alpha: { from: 0.9, to: 0 },
        scaleX: { from: 1, to: 0 },
        scaleY: { from: 1, to: 0 },
        duration: 200 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    } else {
      // Slow spiral inward (gravity visual)
      const angle = Math.atan2(oy, ox);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle + 1) * (Math.abs(ox) * 0.5),
        y: y + Math.sin(angle + 1) * (Math.abs(oy) * 0.5),
        alpha: 0,
        duration: 400 + Math.random() * 300,
        onComplete: () => p.destroy(),
      });
    }
  }

  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void {
    const isStar = Math.random() > 0.6;
    const color = isStar ? Phaser.Utils.Array.GetRandom(STAR_COLORS) : Phaser.Utils.Array.GetRandom(COSMIC_COLORS);
    const size = isStar ? 0.5 + Math.random() * 1 : 1.5 + Math.random() * 2;

    const p = scene.add.circle(
      x + (Math.random() - 0.5) * 8,
      y + (Math.random() - 0.5) * 8,
      size, color, isStar ? 0.8 : 0.5
    ).setDepth(7);

    scene.tweens.add({
      targets: p,
      alpha: 0,
      scaleX: isStar ? 0 : 0.3,
      scaleY: isStar ? 0 : 0.3,
      duration: 200 + Math.random() * 200,
      onComplete: () => p.destroy(),
    });
  }

  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void {
    // Dark void flash
    const voidCircle = scene.add.circle(x, y, radius * 0.4, 0x110022, 0.7).setDepth(24);
    scene.tweens.add({
      targets: voidCircle, scaleX: 2.5, scaleY: 2.5, alpha: 0,
      duration: 350, onComplete: () => voidCircle.destroy(),
    });

    // Purple energy ring
    const ring = scene.add.circle(x, y, 5, 0x000000, 0).setDepth(25);
    ring.setStrokeStyle(2.5, 0xdd66ff, 0.7);
    scene.tweens.add({
      targets: ring, scaleX: radius / 5, scaleY: radius / 5, alpha: 0,
      duration: 300, ease: 'Power2', onComplete: () => ring.destroy(),
    });

    // White flash center
    const flash = scene.add.circle(x, y, 4, 0xffffff, 0.6).setDepth(26);
    scene.tweens.add({
      targets: flash, scaleX: 2, scaleY: 2, alpha: 0,
      duration: 120, onComplete: () => flash.destroy(),
    });

    // Stars burst outward
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.3 + Math.random() * 0.7);
      const color = Phaser.Utils.Array.GetRandom(STAR_COLORS);
      const star = scene.add.circle(x, y, 0.5 + Math.random() * 1.5, color, 0.9).setDepth(25);

      scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 200 + Math.random() * 200,
        onComplete: () => star.destroy(),
      });
    }

    // Gravity distortion lines (pulling inward)
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const startDist = radius * 1.2;
      const sx = x + Math.cos(angle) * startDist;
      const sy = y + Math.sin(angle) * startDist;

      const line = scene.add.line(0, 0, sx, sy, x, y, 0xbb44dd, 0.3)
        .setOrigin(0, 0).setLineWidth(0.5).setDepth(23);

      scene.tweens.add({
        targets: line, alpha: 0, duration: 350, delay: 50,
        onComplete: () => line.destroy(),
      });
    }
  }

  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void {
    // Cosmic distortion — tiny stars and void dots orbiting
    const isStar = Math.random() > 0.4;
    const color = isStar ? Phaser.Utils.Array.GetRandom(STAR_COLORS) : 0x110022;
    const size = isStar ? 1 : 2 + Math.random() * 2;
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 8;

    const p = scene.add.circle(
      ex + Math.cos(angle) * dist,
      ey + Math.sin(angle) * dist,
      size, color, isStar ? 0.8 : 0.5
    ).setDepth(22);

    // Spiral inward
    scene.tweens.add({
      targets: p,
      x: ex + Math.cos(angle + 1.5) * (dist * 0.3),
      y: ey + Math.sin(angle + 1.5) * (dist * 0.3),
      alpha: 0,
      duration: 350,
      onComplete: () => p.destroy(),
    });
  }

  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void {
    // Cosmic pull line — curved with stars along it
    const line = scene.add.line(0, 0, x1, y1, x2, y2, 0xbb44dd, 0.35)
      .setOrigin(0, 0).setLineWidth(1.5).setDepth(20);

    // Stars along the arc
    const dx = x2 - x1, dy = y2 - y1;
    for (let i = 0; i < 4; i++) {
      const t = (i + 0.5) / 4;
      const sx = x1 + dx * t + (Math.random() - 0.5) * 8;
      const sy = y1 + dy * t + (Math.random() - 0.5) * 8;
      const star = scene.add.circle(sx, sy, 1, 0xffffff, 0.7).setDepth(21);
      scene.tweens.add({
        targets: star, alpha: 0, duration: 300 + i * 50,
        onComplete: () => star.destroy(),
      });
    }

    scene.tweens.add({
      targets: line, alpha: 0, duration: 400,
      onComplete: () => line.destroy(),
    });
  }

  getBeamParticleConfig() {
    return { colors: [...COSMIC_COLORS, ...STAR_COLORS], sizes: [0.5, 2.5] as [number, number], speed: 6, alpha: 0.6 };
  }

  getGlowConfig() {
    return { color: 0xdd66ff, alpha: 0.1, radius: 11, pulseSpeed: 500 };
  }
}