import Phaser from 'phaser';
import { CoreVisualTheme } from '../CoreVisualTheme';
import { VisualConfig } from '../../config/spellComponents';
const IC = [0x44ccff, 0x88ddff, 0xaaeeff, 0x66bbee, 0xffffff, 0x99ddff];
export class IceTheme implements CoreVisualTheme {
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void { const p = scene.add.circle(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 18, 1 + Math.random() * 2.5, Phaser.Utils.Array.GetRandom(IC), 0.5).setDepth(22); scene.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 12, y: p.y + Math.random() * 6, alpha: 0, duration: 400 + Math.random() * 300, onComplete: () => p.destroy() }); }
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, vx = 0, vy = 0): void { const s = 1 + Math.random() * 2; const p = scene.add.rectangle(x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, s, s * 1.5, Phaser.Utils.Array.GetRandom(IC), 0.6).setDepth(7).setAngle(Math.random() * 360); scene.tweens.add({ targets: p, alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 250 + Math.random() * 150, onComplete: () => p.destroy() }); }
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 20): void { const r = scene.add.circle(x, y, 5, 0, 0).setDepth(25).setStrokeStyle(2, 0x88ddff, 0.8); scene.tweens.add({ targets: r, scaleX: radius / 5, scaleY: radius / 5, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => r.destroy() }); const f = scene.add.circle(x, y, 6, 0xffffff, 0.6).setDepth(26); scene.tweens.add({ targets: f, scaleX: 2.5, scaleY: 2.5, alpha: 0, duration: 150, onComplete: () => f.destroy() }); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.random() * 0.4; const d = radius * (0.4 + Math.random() * 0.6); const sh = scene.add.rectangle(x, y, 2, 4 + Math.random() * 4, Phaser.Utils.Array.GetRandom(IC), 0.7).setDepth(25).setAngle(Phaser.Math.RadToDeg(a)); scene.tweens.add({ targets: sh, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, alpha: 0, duration: 250 + Math.random() * 150, onComplete: () => sh.destroy() }); } }
  renderStatusOnEnemy(scene: Phaser.Scene, ex: number, ey: number, visual: VisualConfig, intensity = 1): void { const cr = scene.add.rectangle(ex + (Math.random() - 0.5) * 16, ey + (Math.random() - 0.5) * 16, 1 + Math.random() * 2 * intensity, (1 + Math.random() * 2 * intensity) * 1.5, intensity >= 4 ? 0xffffff : Phaser.Utils.Array.GetRandom(IC), 0.5).setDepth(22).setAngle(Math.random() * 360); scene.tweens.add({ targets: cr, y: cr.y + 4, alpha: 0, angle: cr.angle + 45, duration: 400 + Math.random() * 200, onComplete: () => cr.destroy() }); }
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void { const l = scene.add.line(0, 0, x1, y1, x2, y2, 0x88ddff, 0.4).setOrigin(0, 0).setLineWidth(1.5).setDepth(20); scene.tweens.add({ targets: l, alpha: 0, duration: 400, onComplete: () => l.destroy() }); }

  renderKill(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius = 30): void {
    // ICE SHATTER — ice fragments bursting outward
    const flash = scene.add.circle(x, y, 10, 0xffffff, 0.9).setDepth(32);
    scene.tweens.add({ targets: flash, scaleX: 3, scaleY: 3, alpha: 0, duration: 120, onComplete: () => flash.destroy() });
    // Frost ring
    const ring = scene.add.circle(x, y, 6, 0, 0).setDepth(31).setStrokeStyle(3, 0x88ddff, 0.9);
    scene.tweens.add({ targets: ring, scaleX: radius / 6, scaleY: radius / 6, alpha: 0, duration: 300, ease: 'Power2', onComplete: () => ring.destroy() });
    // Ice shard fragments flying outward
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const d = radius * (0.6 + Math.random() * 0.8);
      const c = Phaser.Utils.Array.GetRandom(IC);
      const w = 2 + Math.random() * 3;
      const h = 5 + Math.random() * 8;
      const shard = scene.add.rectangle(x, y, w, h, c, 0.9).setDepth(31).setAngle(Phaser.Math.RadToDeg(a) + Math.random() * 40);
      scene.tweens.add({
        targets: shard,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        angle: shard.angle + (Math.random() - 0.5) * 180,
        alpha: 0,
        duration: 350 + Math.random() * 200,
        onComplete: () => shard.destroy(),
      });
    }
    // Frost patch on ground
    const frost = scene.add.circle(x, y, radius * 0.7, 0x44ccff, 0.1).setDepth(3);
    scene.tweens.add({ targets: frost, alpha: 0, duration: 1500, onComplete: () => frost.destroy() });
  }

  getBeamParticleConfig() { return { colors: IC, sizes: [1, 3] as [number, number], speed: 5, alpha: 0.5 }; }
  getGlowConfig() { return { color: 0x44ccff, alpha: 0.12, radius: 8, pulseSpeed: 600 }; }
}
