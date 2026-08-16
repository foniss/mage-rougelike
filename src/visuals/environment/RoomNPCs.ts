// src/visuals/environment/RoomNPCs.ts
//
// Procedural NPC visuals for non-combat rooms.
// Purely visual — NO physics, NO collision.
// Structured so art can later replace these with sprites.

import Phaser from 'phaser';
import { OC } from '../../config/uiStyles';

/** Draw an occult merchant NPC. Returns the container for positioning. */
export function drawMerchant(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(8);

  // Shadow
  c.add(scene.add.ellipse(0, 18, 30, 8, 0x000000, 0.3));

  // Robe body
  c.add(scene.add.triangle(0, 0, -12, 16, 12, 16, 0, -14, 0x1a1530, 0.9));
  c.add(scene.add.triangle(0, 1, -10, 15, 10, 15, 0, -12, 0x241a3a, 0.7));

  // Hood
  c.add(scene.add.circle(0, -10, 8, 0x1a1530, 0.95));
  c.add(scene.add.circle(0, -10, 6, 0x0e0a18, 0.9));

  // Face glow (eyes)
  const eye1 = scene.add.circle(-3, -11, 1.5, 0xccaa44, 0.7);
  const eye2 = scene.add.circle(3, -11, 1.5, 0xccaa44, 0.7);
  c.add(eye1); c.add(eye2);

  // Gold accent on robe
  c.add(scene.add.rectangle(0, 4, 4, 8, 0xccaa44, 0.25));

  // Staff
  c.add(scene.add.rectangle(14, -4, 2, 30, 0x2a2040, 0.8));
  const staffGem = scene.add.circle(14, -18, 3, 0xccaa44, 0.6);
  c.add(staffGem);

  // Ambient glow around merchant
  const glow = scene.add.circle(0, 0, 35, 0xccaa44, 0.04);
  c.add(glow);

  // Idle animation
  scene.tweens.add({ targets: [eye1, eye2], alpha: { from: 0.5, to: 0.9 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: staffGem, alpha: { from: 0.4, to: 0.8 }, scaleX: { from: 0.9, to: 1.1 }, scaleY: { from: 0.9, to: 1.1 }, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: glow, alpha: { from: 0.02, to: 0.06 }, duration: 2500, yoyo: true, repeat: -1 });

  return c;
}

/** Draw a resting shrine / healing altar. */
export function drawRestShrine(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(8);

  // Base platform
  c.add(scene.add.rectangle(0, 12, 40, 8, 0x1a1830, 0.8));
  c.add(scene.add.rectangle(0, 12, 40, 3, 0x2a2040, 0.5));

  // Altar body
  c.add(scene.add.rectangle(0, 0, 28, 16, 0x151020, 0.9));
  c.add(scene.add.rectangle(0, -6, 28, 3, 0x2a2040, 0.4));

  // Healing crystal on top
  const crystal = scene.add.triangle(0, -14, -5, 0, 5, 0, 0, -12, 0x44cc88, 0.5);
  c.add(crystal);
  c.add(scene.add.triangle(0, -14, -3, 0, 3, 0, 1, -10, 0x88ffbb, 0.25));

  // Glow
  const glow = scene.add.circle(0, -14, 18, 0x44cc88, 0.06);
  c.add(glow);

  // Small side candles
  for (const dx of [-16, 16]) {
    c.add(scene.add.rectangle(dx, 6, 3, 8, 0x2a2030, 0.7));
    const flame = scene.add.circle(dx, 1, 2, 0x88ffbb, 0.5);
    c.add(flame);
    scene.tweens.add({ targets: flame, alpha: { from: 0.3, to: 0.7 }, scaleY: { from: 0.8, to: 1.2 }, duration: 500 + Math.random() * 300, yoyo: true, repeat: -1 });
  }

  // Idle animation
  scene.tweens.add({ targets: crystal, y: crystal.y - 2, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: glow, alpha: { from: 0.03, to: 0.08 }, scaleX: { from: 0.9, to: 1.1 }, scaleY: { from: 0.9, to: 1.1 }, duration: 2500, yoyo: true, repeat: -1 });

  return c;
}

/** Draw a vault keeper NPC. */
export function drawVaultKeeper(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(8);

  // Shadow
  c.add(scene.add.ellipse(0, 18, 28, 8, 0x000000, 0.3));

  // Robe — taller and more imposing
  c.add(scene.add.triangle(0, 2, -14, 16, 14, 16, 0, -18, 0x14102a, 0.9));
  c.add(scene.add.triangle(0, 3, -12, 15, 12, 15, 0, -16, 0x1e1640, 0.7));

  // Hood — deeper
  c.add(scene.add.circle(0, -12, 9, 0x14102a, 0.95));
  c.add(scene.add.circle(0, -12, 7, 0x0a0614, 0.9));

  // Eyes — violet/gold
  const eye1 = scene.add.circle(-3, -13, 1.5, 0xaa88ff, 0.7);
  const eye2 = scene.add.circle(3, -13, 1.5, 0xccaa44, 0.7);
  c.add(eye1); c.add(eye2);

  // Floating key/relic in front
  const key = scene.add.rectangle(0, -2, 3, 8, 0xccaa44, 0.5).setAngle(15);
  c.add(key);

  // Accent rune on robe
  c.add(scene.add.rectangle(0, 6, 6, 6, 0xccaa44, 0.12).setAngle(45));

  // Glow
  const glow = scene.add.circle(0, 0, 30, 0xaa88ff, 0.04);
  c.add(glow);

  scene.tweens.add({ targets: [eye1, eye2], alpha: { from: 0.4, to: 0.8 }, duration: 1800, yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: key, y: key.y - 3, angle: { from: 10, to: 20 }, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: glow, alpha: { from: 0.02, to: 0.06 }, duration: 3000, yoyo: true, repeat: -1 });

  return c;
}

/** Draw a sacrifice ritualist NPC + altar. */
export function drawRitualist(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(8);

  // Altar base
  c.add(scene.add.rectangle(0, 14, 44, 10, 0x1a1018, 0.8));
  c.add(scene.add.rectangle(0, 14, 44, 3, 0x2a1828, 0.5));

  // Altar body
  c.add(scene.add.rectangle(0, 2, 32, 16, 0x120a14, 0.9));
  c.add(scene.add.rectangle(0, -4, 32, 3, 0x2a1828, 0.4));

  // Crimson rune on altar
  const runeGlow = scene.add.circle(0, 2, 5, 0xcc2233, 0.15);
  c.add(runeGlow);
  c.add(scene.add.rectangle(0, 2, 4, 4, 0xcc2233, 0.25).setAngle(45));

  // Ritualist figure — behind altar
  c.add(scene.add.triangle(0, -18, -10, 0, 10, 0, 0, -20, 0x18080e, 0.9));
  c.add(scene.add.triangle(0, -17, -8, 0, 8, 0, 0, -18, 0x220e18, 0.7));

  // Hood
  c.add(scene.add.circle(0, -30, 7, 0x18080e, 0.95));
  c.add(scene.add.circle(0, -30, 5, 0x0a0408, 0.9));

  // Eyes — crimson
  const eye1 = scene.add.circle(-2, -31, 1.5, 0xcc3344, 0.7);
  const eye2 = scene.add.circle(2, -31, 1.5, 0xcc3344, 0.7);
  c.add(eye1); c.add(eye2);

  // Side candles
  for (const dx of [-22, 22]) {
    c.add(scene.add.rectangle(dx, 8, 3, 10, 0x1a1018, 0.7));
    const flame = scene.add.circle(dx, 2, 2.5, 0xcc4444, 0.6);
    c.add(flame);
    scene.tweens.add({ targets: flame, alpha: { from: 0.4, to: 0.8 }, scaleY: { from: 0.8, to: 1.3 }, duration: 400 + Math.random() * 300, yoyo: true, repeat: -1 });
  }

  // Ambient glow
  const glow = scene.add.circle(0, 0, 40, 0xcc2233, 0.04);
  c.add(glow);

  scene.tweens.add({ targets: [eye1, eye2], alpha: { from: 0.5, to: 0.9 }, duration: 1200, yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: runeGlow, alpha: { from: 0.08, to: 0.2 }, scaleX: { from: 0.8, to: 1.2 }, scaleY: { from: 0.8, to: 1.2 }, duration: 2000, yoyo: true, repeat: -1 });
  scene.tweens.add({ targets: glow, alpha: { from: 0.02, to: 0.05 }, duration: 2500, yoyo: true, repeat: -1 });

  return c;
}
