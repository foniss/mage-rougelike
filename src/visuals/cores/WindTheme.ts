import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';
const WC = [0x88ffbb, 0xaaffcc, 0xccffdd, 0x66ddaa, 0xbbffee, 0xddfff5];
export class WindTheme implements CoreVisualTheme {
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void { const w = scene.add.ellipse(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 14, 8 + Math.random() * 10, 1.5, Phaser.Utils.Array.GetRandom(WC), 0.25).setDepth(22).setAngle(Math.random() * 360); scene.tweens.add({ targets: w, x: w.x + 12 + Math.random() * 10, alpha: 0, scaleX: 2, duration: 250 + Math.random() * 200, onComplete: () => w.destroy() }); }
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void { const s = scene.add.ellipse(x, y, 6 + Math.random() * 8, 1, Phaser.Utils.Array.GetRandom(WC), 0.35).setDepth(7); if (vx !== 0 || vy !== 0) s.setAngle(Phaser.Math.RadToDeg(Math.atan2(vy, vx))); scene.tweens.add({ targets: s, x: s.x - vx * 0.15, y: s.y - vy * 0.15, alpha: 0, scaleX: 2.5, duration: 200 + Math.random() * 100, onComplete: () => s.destroy() }); }
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void { for (let i = 0; i < 3; i++) { scene.time.delayedCall(i * 50, () => { const r = scene.add.circle(x, y, 6, 0, 0).setDepth(24 - i).setStrokeStyle(1.5 - i * 0.3, WC[i], 0.5 - i * 0.1); scene.tweens.add({ targets: r, scaleX: (radius + i * 10) / 6, scaleY: (radius + i * 10) / 6, alpha: 0, duration: 250 + i * 50, onComplete: () => r.destroy() }); }); } for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const d = radius * (0.5 + Math.random() * 0.5); const st = scene.add.ellipse(x, y, 3 + Math.random() * 6, 1, Phaser.Utils.Array.GetRandom(WC), 0.4).setDepth(25).setAngle(Phaser.Math.RadToDeg(a)); scene.tweens.add({ targets: st, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, scaleX: 3, duration: 200 + Math.random() * 100, onComplete: () => st.destroy() }); } }
  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void { const a = Math.random() * Math.PI * 2; const d = 12 + Math.random() * 8; const w = scene.add.ellipse(ex + Math.cos(a) * d, ey + Math.sin(a) * d, 5, 1.5, Phaser.Utils.Array.GetRandom(WC), 0.3).setDepth(22).setAngle(Phaser.Math.RadToDeg(a + Math.PI / 2)); scene.tweens.add({ targets: w, x: ex + Math.cos(a + 1) * d, y: ey + Math.sin(a + 1) * d, alpha: 0, duration: 300, onComplete: () => w.destroy() }); }
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void { const g = scene.add.graphics().setDepth(20); g.lineStyle(2, 0x88ffbb, 0.4); const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 20, my = (y1 + y2) / 2 + (Math.random() - 0.5) * 20; g.beginPath(); g.moveTo(x1, y1); g.lineTo(mx, my); g.lineTo(x2, y2); g.strokePath(); scene.tweens.add({ targets: g, alpha: 0, duration: 250, onComplete: () => g.destroy() }); }

  renderKill(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 30): void {
    // WIND BLAST — directional pressure wave + debris
    // Pressure ring
    for (let i = 0; i < 3; i++) {
      scene.time.delayedCall(i * 40, () => {
        const ring = scene.add.circle(x, y, 8, 0, 0).setDepth(31 - i).setStrokeStyle(2.5 - i * 0.6, WC[i % WC.length], 0.8 - i * 0.2);
        scene.tweens.add({ targets: ring, scaleX: (radius + i * 8) / 8, scaleY: (radius + i * 8) / 8, alpha: 0, duration: 250 + i * 40, onComplete: () => ring.destroy() });
      });
    }
    // Fast directional streaks
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + Math.random() * 0.3;
      const d = radius * (0.6 + Math.random() * 0.9);
      const streak = scene.add.ellipse(x, y, 8 + Math.random() * 12, 1.5, Phaser.Utils.Array.GetRandom(WC), 0.6).setDepth(30).setAngle(Phaser.Math.RadToDeg(a));
      scene.tweens.add({
        targets: streak,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0, scaleX: 3,
        duration: 200 + Math.random() * 150,
        onComplete: () => streak.destroy(),
      });
    }
    // White flash center
    const flash = scene.add.circle(x, y, 8, 0xffffff, 0.7).setDepth(32);
    scene.tweens.add({ targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
  }

  getBeamParticleConfig() { return { colors: WC, sizes: [1, 2] as [number, number], speed: 12, alpha: 0.35 }; }
  getGlowConfig() { return { color: 0x88ffbb, alpha: 0.08, radius: 12, pulseSpeed: 300 }; }
}
