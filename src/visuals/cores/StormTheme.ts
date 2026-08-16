import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';
const SC = [0xaa88ff, 0xccaaff, 0xddbbff, 0x9977ee, 0xeeddff, 0xffffff];
export class StormTheme implements CoreVisualTheme {
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void { const c = Phaser.Utils.Array.GetRandom(SC); const ox = (Math.random() - 0.5) * 16, oy = (Math.random() - 0.5) * 16; const s = scene.add.circle(x + ox, y + oy, 1 + Math.random() * 1.5, c, 0.8).setDepth(22); scene.tweens.add({ targets: s, alpha: 0, scaleX: 2, scaleY: 2, duration: 80 + Math.random() * 80, onComplete: () => s.destroy() }); if (Math.random() > 0.5) { const g = scene.add.graphics().setDepth(22); g.lineStyle(0.5, c, 0.6); g.lineBetween(x + ox, y + oy, x + ox + (Math.random() - 0.5) * 12, y + oy + (Math.random() - 0.5) * 12); scene.tweens.add({ targets: g, alpha: 0, duration: 100, onComplete: () => g.destroy() }); } }
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void { const s = scene.add.circle(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, 1 + Math.random() * 1.5, Phaser.Utils.Array.GetRandom(SC), 0.7).setDepth(7); scene.tweens.add({ targets: s, alpha: 0, duration: 100 + Math.random() * 80, onComplete: () => s.destroy() }); }
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void { const f = scene.add.circle(x, y, 8, 0xffffff, 0.7).setDepth(26); scene.tweens.add({ targets: f, scaleX: 3, scaleY: 3, alpha: 0, duration: 100, onComplete: () => f.destroy() }); const r = scene.add.circle(x, y, 5, 0, 0).setDepth(25).setStrokeStyle(2, 0xaa88ff, 0.8); scene.tweens.add({ targets: r, scaleX: radius / 5, scaleY: radius / 5, alpha: 0, duration: 200, onComplete: () => r.destroy() }); for (let i = 0; i < 6; i++) { const g = scene.add.graphics().setDepth(25); const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5; const d = radius * (0.5 + Math.random() * 0.5); g.lineStyle(1.5, Phaser.Utils.Array.GetRandom(SC), 0.7); g.beginPath(); g.moveTo(x, y); let cx2 = x, cy2 = y; const segs = 3 + Math.floor(Math.random() * 3); for (let s = 1; s <= segs; s++) { const t = s / segs; const po = (Math.random() - 0.5) * 10; cx2 = x + Math.cos(a) * d * t + Math.sin(a) * po; cy2 = y + Math.sin(a) * d * t - Math.cos(a) * po; g.lineTo(cx2, cy2); } g.strokePath(); scene.tweens.add({ targets: g, alpha: 0, duration: 200 + Math.random() * 100, onComplete: () => g.destroy() }); } }
  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void { const c = Phaser.Utils.Array.GetRandom(SC); const s = scene.add.circle(ex + (Math.random() - 0.5) * 18, ey + (Math.random() - 0.5) * 18, 1.5, c, 0.8).setDepth(22); scene.tweens.add({ targets: s, alpha: 0, scaleX: 2.5, scaleY: 2.5, duration: 80 + Math.random() * 60, onComplete: () => s.destroy() }); const g = scene.add.graphics().setDepth(22); g.lineStyle(0.8, c, 0.6); g.lineBetween(ex + (Math.random() - 0.5) * 14, ey + (Math.random() - 0.5) * 14, ex + (Math.random() - 0.5) * 14, ey + (Math.random() - 0.5) * 14); scene.tweens.add({ targets: g, alpha: 0, duration: 100, onComplete: () => g.destroy() }); }
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void { const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx * dx + dy * dy); const perpX = -dy / (dist || 1), perpY = dx / (dist || 1); const glow = scene.add.graphics().setDepth(20); const core = scene.add.graphics().setDepth(21); const segs = 6 + Math.floor(Math.random() * 4); const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }]; for (let i = 1; i < segs; i++) { const t = i / segs; const mf = Math.sin(t * Math.PI); const o = (Math.random() * 2 - 1) * 14 * mf; pts.push({ x: x1 + dx * t + perpX * o, y: y1 + dy * t + perpY * o }); } pts.push({ x: x2, y: y2 }); glow.lineStyle(6, 0xccaaff, 0.25); glow.beginPath(); glow.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) glow.lineTo(pts[i].x, pts[i].y); glow.strokePath(); core.lineStyle(2, 0xddbbff, 0.8); core.beginPath(); core.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) core.lineTo(pts[i].x, pts[i].y); core.strokePath(); scene.tweens.add({ targets: [glow, core], alpha: 0, duration: 300, onComplete: () => { glow.destroy(); core.destroy(); } }); }

  renderKill(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 30): void {
    // ELECTRICAL DISCHARGE — bright flash + multiple lightning arcs outward
    const flash = scene.add.circle(x, y, 12, 0xffffff, 0.95).setDepth(33);
    scene.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
    const ring = scene.add.circle(x, y, 6, 0, 0).setDepth(32).setStrokeStyle(3, 0xccaaff, 0.9);
    scene.tweens.add({ targets: ring, scaleX: radius / 6, scaleY: radius / 6, alpha: 0, duration: 250, onComplete: () => ring.destroy() });
    // Lightning arcs radiating outward
    for (let i = 0; i < 8; i++) {
      const g = scene.add.graphics().setDepth(31);
      const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4;
      const d = radius * (0.7 + Math.random() * 0.6);
      g.lineStyle(2, Phaser.Utils.Array.GetRandom(SC), 0.8);
      g.beginPath(); g.moveTo(x, y);
      let cx2 = x, cy2 = y;
      const segs = 3 + Math.floor(Math.random() * 3);
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const po = (Math.random() - 0.5) * 14;
        cx2 = x + Math.cos(a) * d * t + Math.sin(a) * po;
        cy2 = y + Math.sin(a) * d * t - Math.cos(a) * po;
        g.lineTo(cx2, cy2);
      }
      g.strokePath();
      // Spark at tip
      const spark = scene.add.circle(cx2, cy2, 2.5, 0xffffff, 0.9).setDepth(32);
      scene.tweens.add({ targets: spark, alpha: 0, scaleX: 3, scaleY: 3, duration: 120, delay: 30, onComplete: () => spark.destroy() });
      scene.tweens.add({ targets: g, alpha: 0, duration: 250 + Math.random() * 100, onComplete: () => g.destroy() });
    }
  }

  getBeamParticleConfig() { return { colors: SC, sizes: [1, 2.5] as [number, number], speed: 15, alpha: 0.7 }; }
  getGlowConfig() { return { color: 0xaa88ff, alpha: 0.12, radius: 9, pulseSpeed: 200 }; }
}
