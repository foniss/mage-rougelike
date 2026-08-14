// src/visuals/cores/IceTheme.ts

import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';

const ICE_COLORS = [0x44ccff, 0x88ddff, 0xaaeeff, 0x66bbee, 0xffffff, 0x99ddff];

export class IceTheme implements CoreVisualTheme {

  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void {
    const color = Phaser.Utils.Array.GetRandom(ICE_COLORS);
    const size = 1 + Math.random() * 2.5;
    const ox = (Math.random() - 0.5) * 18;
    const oy = (Math.random() - 0.5) * 18;

    // Snowflake-like: doesn't rise, drifts sideways and fades
    const p = scene.add.circle(x + ox, y + oy, size, color, 0.5).setDepth(22);

    scene.tweens.add({
      targets: p,
      x: p.x + (Math.random() - 0.5) * 12,
      y: p.y + Math.random() * 6,
      alpha: 0,
      duration: 400 + Math.random() * 300,
      onComplete: () => p.destroy(),
    });
  }

  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void {
    const color = Phaser.Utils.Array.GetRandom(ICE_COLORS);
    const size = 1 + Math.random() * 2;

    // Ice crystal shard shape (small diamond)
    const p = scene.add.rectangle(
      x + (Math.random() - 0.5) * 6,
      y + (Math.random() - 0.5) * 6,
      size, size * 1.5, color, 0.6
    ).setDepth(7).setAngle(Math.random() * 360);

    scene.tweens.add({
      targets: p,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      angle: p.angle + (Math.random() - 0.5) * 90,
      duration: 250 + Math.random() * 150,
      onComplete: () => p.destroy(),
    });
  }

  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void {
    // Frost ring
    const ring = scene.add.circle(x, y, 5, 0x000000, 0).setDepth(25);
    ring.setStrokeStyle(2, 0x88ddff, 0.8);
    scene.tweens.add({
      targets: ring, scaleX: radius / 5, scaleY: radius / 5, alpha: 0,
      duration: 300, ease: 'Power2', onComplete: () => ring.destroy(),
    });

    // White flash
    const flash = scene.add.circle(x, y, 6, 0xffffff, 0.6).setDepth(26);
    scene.tweens.add({
      targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0,
      duration: 150, onComplete: () => flash.destroy(),
    });

    // Ice crystal shards flying outward
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const dist = radius * (0.4 + Math.random() * 0.6);
      const color = Phaser.Utils.Array.GetRandom(ICE_COLORS);
      const shard = scene.add.rectangle(x, y, 2, 4 + Math.random() * 4, color, 0.7)
        .setDepth(25).setAngle(Phaser.Math.RadToDeg(angle));

      scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        angle: shard.angle + (Math.random() - 0.5) * 120,
        duration: 250 + Math.random() * 150,
        onComplete: () => shard.destroy(),
      });
    }

    // Ground frost patch
    const frost = scene.add.circle(x, y, radius * 0.7, 0x44ccff, 0.08).setDepth(3);
    scene.tweens.add({
      targets: frost, alpha: 0, duration: 1500, delay: 200,
      onComplete: () => frost.destroy(),
    });
  }

  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void {
    // Frost crystal drifting off enemy — intensity = number of chill stacks
    const color = intensity >= 4 ? 0xffffff : Phaser.Utils.Array.GetRandom(ICE_COLORS);
    const size = 1 + Math.random() * 2 * intensity;
    const ox = (Math.random() - 0.5) * 16;
    const oy = (Math.random() - 0.5) * 16;

    const crystal = scene.add.rectangle(ex + ox, ey + oy, size, size * 1.5, color, 0.5)
      .setDepth(22).setAngle(Math.random() * 360);

    scene.tweens.add({
      targets: crystal,
      y: crystal.y + 4 + Math.random() * 4,
      x: crystal.x + (Math.random() - 0.5) * 8,
      alpha: 0,
      angle: crystal.angle + 45,
      duration: 400 + Math.random() * 200,
      onComplete: () => crystal.destroy(),
    });
  }

  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void {
    const line = scene.add.line(0, 0, x1, y1, x2, y2, 0x88ddff, 0.4)
      .setOrigin(0, 0).setLineWidth(1.5).setDepth(20);
    scene.tweens.add({
      targets: line, alpha: 0, duration: 400,
      onComplete: () => line.destroy(),
    });
  }

  getBeamParticleConfig() {
    return { colors: ICE_COLORS, sizes: [1, 3] as [number, number], speed: 5, alpha: 0.5 };
  }

  getGlowConfig() {
    return { color: 0x44ccff, alpha: 0.12, radius: 8, pulseSpeed: 600 };
  }
}