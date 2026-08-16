import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';
const CC = [0xdd66ff, 0xee99ff, 0xbb44dd, 0xff88ff, 0x9933cc, 0xcc66ee];
const StarC = [0xffffff, 0xffffcc, 0xffccff, 0xccccff];
export class CosmicTheme implements CoreVisualTheme {
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void { const isStar = Math.random() > 0.5; const c = isStar ? Phaser.Utils.Array.GetRandom(StarC) : Phaser.Utils.Array.GetRandom(CC); const s = isStar ? 0.5 + Math.random() * 1.5 : 1 + Math.random() * 2; const ox = (Math.random() - 0.5) * 22, oy = (Math.random() - 0.5) * 22; const p = scene.add.circle(x + ox, y + oy, s, c, isStar ? 0.9 : 0.4).setDepth(22); if (isStar) { scene.tweens.add({ targets: p, alpha: 0, scaleX: 0, scaleY: 0, duration: 200 + Math.random() * 200, onComplete: () => p.destroy() }); } else { const a = Math.atan2(oy, ox); scene.tweens.add({ targets: p, x: x + Math.cos(a + 1) * (Math.abs(ox) * 0.5), y: y + Math.sin(a + 1) * (Math.abs(oy) * 0.5), alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => p.destroy() }); } }
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void { const isStar = Math.random() > 0.6; const c = isStar ? Phaser.Utils.Array.GetRandom(StarC) : Phaser.Utils.Array.GetRandom(CC); const p = scene.add.circle(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, isStar ? 0.5 + Math.random() : 1.5 + Math.random() * 2, c, isStar ? 0.8 : 0.5).setDepth(7); scene.tweens.add({ targets: p, alpha: 0, scaleX: isStar ? 0 : 0.3, scaleY: isStar ? 0 : 0.3, duration: 200 + Math.random() * 200, onComplete: () => p.destroy() }); }
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void { const v = scene.add.circle(x, y, radius * 0.4, 0x110022, 0.7).setDepth(24); scene.tweens.add({ targets: v, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 350, onComplete: () => v.destroy() }); const r = scene.add.circle(x, y, 5, 0, 0).setDepth(25).setStrokeStyle(2.5, 0xdd66ff, 0.7); scene.tweens.add({ targets: r, scaleX: radius / 5, scaleY: radius / 5, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => r.destroy() }); const f = scene.add.circle(x, y, 4, 0xffffff, 0.6).setDepth(26); scene.tweens.add({ targets: f, scaleX: 2, scaleY: 2, alpha: 0, duration: 120, onComplete: () => f.destroy() }); for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; const d = radius * (0.3 + Math.random() * 0.7); const st = scene.add.circle(x, y, 0.5 + Math.random() * 1.5, Phaser.Utils.Array.GetRandom(StarC), 0.9).setDepth(25); scene.tweens.add({ targets: st, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 200 + Math.random() * 200, onComplete: () => st.destroy() }); } }
  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void { const isStar = Math.random() > 0.4; const c = isStar ? Phaser.Utils.Array.GetRandom(StarC) : 0x110022; const a = Math.random() * Math.PI * 2; const d = 10 + Math.random() * 8; const p = scene.add.circle(ex + Math.cos(a) * d, ey + Math.sin(a) * d, isStar ? 1 : 2 + Math.random() * 2, c, isStar ? 0.8 : 0.5).setDepth(22); scene.tweens.add({ targets: p, x: ex + Math.cos(a + 1.5) * (d * 0.3), y: ey + Math.sin(a + 1.5) * (d * 0.3), alpha: 0, duration: 350, onComplete: () => p.destroy() }); }
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void { const l = scene.add.line(0, 0, x1, y1, x2, y2, 0xbb44dd, 0.35).setOrigin(0, 0).setLineWidth(1.5).setDepth(20); const dx = x2 - x1, dy = y2 - y1; for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4; const st = scene.add.circle(x1 + dx * t + (Math.random() - 0.5) * 8, y1 + dy * t + (Math.random() - 0.5) * 8, 1, 0xffffff, 0.7).setDepth(21); scene.tweens.add({ targets: st, alpha: 0, duration: 300 + i * 50, onComplete: () => st.destroy() }); } scene.tweens.add({ targets: l, alpha: 0, duration: 400, onComplete: () => l.destroy() }); }

  renderKill(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 30): void {
    // COSMIC IMPLOSION — particles pull inward, then small outward shockwave
    // Phase 1: Inward collapse
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const startDist = radius * (0.8 + Math.random() * 0.6);
      const c = Math.random() > 0.5 ? Phaser.Utils.Array.GetRandom(StarC) : Phaser.Utils.Array.GetRandom(CC);
      const p = scene.add.circle(x + Math.cos(a) * startDist, y + Math.sin(a) * startDist, 1 + Math.random() * 2.5, c, 0.8).setDepth(31);
      scene.tweens.add({
        targets: p,
        x: x, y: y,
        scaleX: 0, scaleY: 0,
        duration: 200 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => p.destroy(),
      });
    }
    // Dark void collapse
    const voidCircle = scene.add.circle(x, y, radius * 0.8, 0x110022, 0.5).setDepth(30);
    scene.tweens.add({
      targets: voidCircle,
      scaleX: 0, scaleY: 0,
      duration: 300, ease: 'Power3',
      onComplete: () => voidCircle.destroy(),
    });
    // Phase 2: Brief outward shockwave (delayed)
    scene.time.delayedCall(250, () => {
      const flash = scene.add.circle(x, y, 6, 0xdd66ff, 0.8).setDepth(33);
      scene.tweens.add({ targets: flash, scaleX: 4, scaleY: 4, alpha: 0, duration: 200, onComplete: () => flash.destroy() });
      const ring = scene.add.circle(x, y, 5, 0, 0).setDepth(32).setStrokeStyle(2, 0xee99ff, 0.7);
      scene.tweens.add({ targets: ring, scaleX: radius * 0.6 / 5, scaleY: radius * 0.6 / 5, alpha: 0, duration: 300, onComplete: () => ring.destroy() });
      // Residual stars
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 10 + Math.random() * 15;
        const st = scene.add.circle(x, y, 1, 0xffffff, 0.9).setDepth(32);
        scene.tweens.add({ targets: st, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 300, onComplete: () => st.destroy() });
      }
    });
  }

  getBeamParticleConfig() { return { colors: [...CC, ...StarC], sizes: [0.5, 2.5] as [number, number], speed: 6, alpha: 0.6 }; }
  getGlowConfig() { return { color: 0xdd66ff, alpha: 0.1, radius: 11, pulseSpeed: 500 }; }
}
