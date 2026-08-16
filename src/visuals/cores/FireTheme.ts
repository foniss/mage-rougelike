import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';
const FC = [0xff6600, 0xff4400, 0xff8800, 0xffaa00, 0xff3300, 0xffcc22];
export class FireTheme implements CoreVisualTheme {
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void { const c = Phaser.Utils.Array.GetRandom(FC); const s = 2 + Math.random() * 3; const p = scene.add.circle(x + (Math.random() - 0.5) * 16, y + (Math.random() - 0.5) * 10, s, c, 0.6).setDepth(22); scene.tweens.add({ targets: p, y: p.y - 10 - Math.random() * 12, alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 300 + Math.random() * 200, onComplete: () => p.destroy() }); }
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void { const c = Phaser.Utils.Array.GetRandom(FC); const p = scene.add.circle(x, y, 1.5 + Math.random() * 3, c, 0.7).setDepth(7); scene.tweens.add({ targets: p, x: p.x - vx * 0.1, y: p.y - vy * 0.1 - 8, alpha: 0, scaleX: 0.1, scaleY: 0.3, duration: 200 + Math.random() * 150, onComplete: () => p.destroy() }); }
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void { const b = scene.add.circle(x, y, 8, 0xff6600, 0.6).setDepth(25); scene.tweens.add({ targets: b, scaleX: radius / 8, scaleY: radius / 8, alpha: 0, duration: 250, ease: 'Power2', onComplete: () => b.destroy() }); const f = scene.add.circle(x, y, 5, 0xffcc44, 0.7).setDepth(26); scene.tweens.add({ targets: f, scaleX: 3, scaleY: 3, alpha: 0, duration: 150, onComplete: () => f.destroy() }); for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; const d = radius * (0.3 + Math.random() * 0.7); const e = scene.add.circle(x, y, 1.5 + Math.random() * 2.5, Phaser.Utils.Array.GetRandom(FC), 0.8).setDepth(25); scene.tweens.add({ targets: e, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 200 + Math.random() * 200, onComplete: () => e.destroy() }); } }
  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void { const c = Phaser.Utils.Array.GetRandom(FC); const fl = scene.add.circle(ex + (Math.random() - 0.5) * 14, ey + 5, 2 + Math.random() * 3 * intensity, c, 0.6).setDepth(22); scene.tweens.add({ targets: fl, y: fl.y - 14 - Math.random() * 8, alpha: 0, scaleX: 0.2, scaleY: 0.4, duration: 350 + Math.random() * 150, onComplete: () => fl.destroy() }); }
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void { const l = scene.add.line(0, 0, x1, y1, x2, y2, 0xff6600, 0.5).setOrigin(0, 0).setLineWidth(2).setDepth(20); scene.tweens.add({ targets: l, alpha: 0, duration: 300, onComplete: () => l.destroy() }); }

  renderKill(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 30): void {
    // Fiery death burst — big flame flash + embers spreading outward
    const core = scene.add.circle(x, y, 10, 0xffcc44, 0.9).setDepth(32);
    scene.tweens.add({ targets: core, scaleX: 3.5, scaleY: 3.5, alpha: 0, duration: 200, onComplete: () => core.destroy() });
    const burst = scene.add.circle(x, y, 6, 0xff6600, 0.7).setDepth(31);
    scene.tweens.add({ targets: burst, scaleX: radius / 6, scaleY: radius / 6, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => burst.destroy() });
    // Embers flying outward
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const d = radius * (0.5 + Math.random() * 0.8);
      const c = Phaser.Utils.Array.GetRandom(FC);
      const sz = 2 + Math.random() * 3;
      const ember = scene.add.circle(x, y, sz, c, 0.9).setDepth(31);
      scene.tweens.add({
        targets: ember,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d - Math.random() * 15,
        alpha: 0, scaleX: 0.2, scaleY: 0.2,
        duration: 300 + Math.random() * 200,
        onComplete: () => ember.destroy(),
      });
    }
    // Brief burning glow on ground
    const scorch = scene.add.circle(x, y, radius * 0.6, 0xff4400, 0.12).setDepth(3);
    scene.tweens.add({ targets: scorch, alpha: 0, duration: 1200, onComplete: () => scorch.destroy() });
  }

  getBeamParticleConfig() { return { colors: FC, sizes: [2, 5] as [number, number], speed: 8, alpha: 0.7 }; }
  getGlowConfig() { return { color: 0xff6600, alpha: 0.15, radius: 10, pulseSpeed: 400 }; }
}
