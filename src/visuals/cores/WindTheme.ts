// src/visuals/cores/WindTheme.ts

import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';

const WIND_COLORS = [0x88ffbb, 0xaaffcc, 0xccffdd, 0x66ddaa, 0xbbffee, 0xddfff5];

export class WindTheme implements CoreVisualTheme {

  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void {
    // Wispy air distortion — thin, fast, directional
    const color = Phaser.Utils.Array.GetRandom(WIND_COLORS);
    const ox = (Math.random() - 0.5) * 20;
    const oy = (Math.random() - 0.5) * 14;

    // Use a very thin stretched ellipse for wind wisps
    const wisp = scene.add.ellipse(x + ox, y + oy, 8 + Math.random() * 10, 1.5, color, 0.25)
      .setDepth(22).setAngle(Math.random() * 360);

    scene.tweens.add({
      targets: wisp,
      x: wisp.x + 12 + Math.random() * 10,
      y: wisp.y + (Math.random() - 0.5) * 8,
      alpha: 0,
      scaleX: 2,
      duration: 250 + Math.random() * 200,
      onComplete: () => wisp.destroy(),
    });
  }

  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void {
    const color = Phaser.Utils.Array.GetRandom(WIND_COLORS);

    // Directional wind streak
    const streak = scene.add.ellipse(x, y, 6 + Math.random() * 8, 1, color, 0.35)
      .setDepth(7);

    if (vx !== 0 || vy !== 0) {
      streak.setAngle(Phaser.Math.RadToDeg(Math.atan2(vy, vx)));
    }

    scene.tweens.add({
      targets: streak,
      x: streak.x - vx * 0.15,
      y: streak.y - vy * 0.15,
      alpha: 0,
      scaleX: 2.5,
      duration: 200 + Math.random() * 100,
      onComplete: () => streak.destroy(),
    });
  }

  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void {
    // Concentric air rings expanding outward
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 50, () => {
        const ring = scene.add.circle(x, y, 6, 0x000000, 0).setDepth(24 - i);
        ring.setStrokeStyle(1.5 - i * 0.3, WIND_COLORS[i], 0.5 - i * 0.1);
        scene.tweens.add({
          targets: ring,
          scaleX: (radius + i * 10) / 6,
          scaleY: (radius + i * 10) / 6,
          alpha: 0,
          duration: 250 + i * 50,
          onComplete: () => ring.destroy(),
        });
      });
    }

    // Directional wind streaks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const dist = radius * (0.5 + Math.random() * 0.5);
      const color = Phaser.Utils.Array.GetRandom(WIND_COLORS);
      const streak = scene.add.ellipse(x, y, 3 + Math.random() * 6, 1, color, 0.4)
        .setDepth(25).setAngle(Phaser.Math.RadToDeg(angle));

      scene.tweens.add({
        targets: streak,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scaleX: 3,
        duration: 200 + Math.random() * 100,
        onComplete: () => streak.destroy(),
      });
    }
  }

  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void {
    // Swirling wind wisps around enemy
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * 8;
    const color = Phaser.Utils.Array.GetRandom(WIND_COLORS);
    const wisp = scene.add.ellipse(
      ex + Math.cos(angle) * dist,
      ey + Math.sin(angle) * dist,
      5, 1.5, color, 0.3
    ).setDepth(22).setAngle(Phaser.Math.RadToDeg(angle + Math.PI / 2));

    scene.tweens.add({
      targets: wisp,
      x: ex + Math.cos(angle + 1) * dist,
      y: ey + Math.sin(angle + 1) * dist,
      alpha: 0,
      duration: 300,
      onComplete: () => wisp.destroy(),
    });
  }

  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void {
    // Wind gust line with slight curve
    const gfx = scene.add.graphics().setDepth(20);
    gfx.lineStyle(2, 0x88ffbb, 0.4);
    const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 20;
    const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 20;
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    gfx.lineTo(midX, midY);
    gfx.lineTo(x2, y2);
    gfx.strokePath();

    scene.tweens.add({
      targets: gfx, alpha: 0, duration: 250,
      onComplete: () => gfx.destroy(),
    });
  }

  getBeamParticleConfig() {
    return { colors: WIND_COLORS, sizes: [1, 2] as [number, number], speed: 12, alpha: 0.35 };
  }

  getGlowConfig() {
    return { color: 0x88ffbb, alpha: 0.08, radius: 12, pulseSpeed: 300 };
  }
}