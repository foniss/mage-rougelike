// src/visuals/SuffixVisuals.ts
//
// Visual feedback for all Suffix effects.
// Called by SpellCaster when suffix triggers activate.

import Phaser from 'phaser';
import { VisualConfig } from '../config/spellComponents';

export class SuffixVisuals {

  // ═════════════════════════════════════════════════════════════════════════
  //  OF DEVOURING — mana restoration on kill
  // ═════════════════════════════════════════════════════════════════════════

  static renderDevouringEffect(
    scene: Phaser.Scene,
    enemyX: number, enemyY: number,
    playerX: number, playerY: number,
    manaAmount: number,
    visual: VisualConfig,
  ): void {
    // Mana orbs flying from dead enemy to player
    const orbCount = 3;
    for (let i = 0; i < orbCount; i++) {
      const delay = i * 80;
      scene.time.delayedCall(delay, () => {
        const ox = enemyX + (Math.random() - 0.5) * 16;
        const oy = enemyY + (Math.random() - 0.5) * 16;
        const orb = scene.add.circle(ox, oy, 3, 0x4488ff, 0.8).setDepth(28);
        const glow = scene.add.circle(ox, oy, 6, 0x4488ff, 0.2).setDepth(27);

        scene.tweens.add({
          targets: [orb, glow],
          x: playerX + (Math.random() - 0.5) * 8,
          y: playerY + (Math.random() - 0.5) * 8,
          duration: 350 + i * 50,
          ease: 'Power2',
          onComplete: () => {
            orb.destroy();
            glow.destroy();

            // Absorption flash on player
            if (i === orbCount - 1) {
              const absorbFlash = scene.add.circle(playerX, playerY, 12, 0x4488ff, 0.3).setDepth(28);
              scene.tweens.add({
                targets: absorbFlash, scaleX: 2, scaleY: 2, alpha: 0,
                duration: 200, onComplete: () => absorbFlash.destroy(),
              });
            }
          },
        });
      });
    }

    // Floating mana text
    const txt = scene.add.text(playerX, playerY - 25, `+${manaAmount} MP`, {
      fontFamily: '"Courier New", monospace', fontSize: '12px',
      color: '#66aaff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50).setAlpha(0.9);

    scene.tweens.add({
      targets: txt, y: txt.y - 20, alpha: 0,
      duration: 1000, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  OF BINDING — root visual on enemies
  // ═════════════════════════════════════════════════════════════════════════

  static createBindingVisual(
    scene: Phaser.Scene,
    enemyX: number, enemyY: number,
    bindRadius: number,
    bindDuration: number,
    visual: VisualConfig,
  ): { update: (ex: number, ey: number) => void; destroy: () => void } {
    const objects: Phaser.GameObjects.GameObject[] = [];

    // Anchor circle on ground
    const anchor = scene.add.circle(enemyX, enemyY, bindRadius, visual.color, 0.08).setDepth(5);
    anchor.setStrokeStyle(1.5, visual.color, 0.3);
    objects.push(anchor);

    // Inner rune pattern
    const runeGfx = scene.add.graphics().setDepth(5);
    runeGfx.lineStyle(1, visual.color, 0.25);
    runeGfx.strokeCircle(enemyX, enemyY, bindRadius * 0.5);
    // Cross pattern
    const cr = bindRadius * 0.6;
    runeGfx.lineBetween(enemyX - cr, enemyY, enemyX + cr, enemyY);
    runeGfx.lineBetween(enemyX, enemyY - cr, enemyX, enemyY + cr);
    objects.push(runeGfx);

    // Chain lines from anchor to enemy (4 chains)
    const chains: Phaser.GameObjects.Line[] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const sx = enemyX + Math.cos(angle) * bindRadius * 0.8;
      const sy = enemyY + Math.sin(angle) * bindRadius * 0.8;
      const chain = scene.add.line(0, 0, sx, sy, enemyX, enemyY, visual.glowColor, 0.35)
        .setOrigin(0, 0).setLineWidth(1).setDepth(6);
      chains.push(chain);
      objects.push(chain);
    }

    // Binding indicator text
    const bindText = scene.add.text(enemyX, enemyY - bindRadius - 8, '⚓ BOUND', {
      fontFamily: '"Courier New", monospace', fontSize: '7px',
      color: '#' + visual.color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(30).setAlpha(0.5);
    objects.push(bindText);

    // Pulse animation on anchor
    scene.tweens.add({
      targets: anchor,
      alpha: { from: 0.05, to: 0.12 },
      duration: 500, yoyo: true, repeat: -1,
    });

    // Appear animation
    scene.tweens.add({
      targets: objects,
      alpha: { from: 0, to: undefined },
      duration: 200,
    });

    const anchorX = enemyX;
    const anchorY = enemyY;

    const update = (ex: number, ey: number) => {
      // Update chain endpoints to follow enemy
      for (let i = 0; i < chains.length; i++) {
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const sx = anchorX + Math.cos(angle) * bindRadius * 0.8;
        const sy = anchorY + Math.sin(angle) * bindRadius * 0.8;
        chains[i].setTo(sx, sy, ex, ey);
      }
      bindText.setPosition(anchorX, anchorY - bindRadius - 8);
    };

    const destroy = () => {
      // Break free effect
      for (const chain of chains) {
        if (chain.active) {
          scene.tweens.add({
            targets: chain, alpha: 0, duration: 150,
          });
        }
      }

      scene.tweens.add({
        targets: objects, alpha: 0, duration: 200,
        onComplete: () => {
          for (const obj of objects) if (obj.active) obj.destroy();
          runeGfx.destroy();
        },
      });

      // Break flash
      const breakFlash = scene.add.circle(anchorX, anchorY, bindRadius * 0.5, visual.color, 0.3).setDepth(25);
      scene.tweens.add({
        targets: breakFlash, scaleX: 2, scaleY: 2, alpha: 0,
        duration: 250, onComplete: () => breakFlash.destroy(),
      });
    };

    return { update, destroy };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  OF REAPING — seek line to next target
  // ═════════════════════════════════════════════════════════════════════════

  static renderReapingSeek(
    scene: Phaser.Scene,
    fromX: number, fromY: number,
    toX: number, toY: number,
    visual: VisualConfig,
    damagePercent: number,
  ): void {
    // Soul/energy orb traveling from dead enemy to next target
    const orb = scene.add.circle(fromX, fromY, 5, visual.color, 0.7).setDepth(26);
    const orbGlow = scene.add.circle(fromX, fromY, 10, visual.color, 0.2).setDepth(25);

    scene.tweens.add({
      targets: [orb, orbGlow],
      x: toX, y: toY,
      duration: 250,
      ease: 'Power2',
      onComplete: () => {
        // Impact on new target
        const impact = scene.add.circle(toX, toY, 8, visual.glowColor, 0.5).setDepth(26);
        scene.tweens.add({
          targets: impact, scaleX: 2, scaleY: 2, alpha: 0,
          duration: 200, onComplete: () => impact.destroy(),
        });
        orb.destroy();
        orbGlow.destroy();
      },
    });

    // Trail from source to target
    const trailGfx = scene.add.graphics().setDepth(24);
    trailGfx.lineStyle(1.5, visual.trailColor, 0.3);
    trailGfx.lineBetween(fromX, fromY, toX, toY);
    scene.tweens.add({
      targets: trailGfx, alpha: 0, duration: 400,
      onComplete: () => trailGfx.destroy(),
    });

    // "REAP" indicator
    const mx = (fromX + toX) / 2;
    const my = (fromY + toY) / 2;
    const txt = scene.add.text(mx, my - 10, '⚔ REAP', {
      fontFamily: '"Courier New", monospace', fontSize: '8px',
      color: '#' + visual.color.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(30).setAlpha(0.6);
    scene.tweens.add({
      targets: txt, y: txt.y - 10, alpha: 0,
      duration: 600, onComplete: () => txt.destroy(),
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  OF DETONATION — secondary explosion on kill
  // ═════════════════════════════════════════════════════════════════════════

  static renderDetonationExplosion(
    scene: Phaser.Scene,
    x: number, y: number,
    radius: number,
    visual: VisualConfig,
  ): void {
    // Distinct from the spell's own impact — uses white/orange secondary colors

    // White core flash
    const coreFlash = scene.add.circle(x, y, 6, 0xffffff, 0.9).setDepth(27);
    scene.tweens.add({
      targets: coreFlash, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 120, onComplete: () => coreFlash.destroy(),
    });

    // Orange-tinted explosion fill
    const fill = scene.add.circle(x, y, radius * 0.3, 0xff8844, 0.35).setDepth(24);
    scene.tweens.add({
      targets: fill, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 300, ease: 'Power2', onComplete: () => fill.destroy(),
    });

    // Primary detonation ring (thick, bright)
    const ring1 = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(26);
    ring1.setStrokeStyle(3, 0xffaa44, 0.8);
    scene.tweens.add({
      targets: ring1, scaleX: radius / 8, scaleY: radius / 8, alpha: 0,
      duration: 300, ease: 'Power2', onComplete: () => ring1.destroy(),
    });

    // Secondary ring (spell-colored)
    scene.time.delayedCall(50, () => {
      const ring2 = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(25);
      ring2.setStrokeStyle(2, visual.color, 0.5);
      scene.tweens.add({
        targets: ring2, scaleX: (radius * 0.8) / 8, scaleY: (radius * 0.8) / 8, alpha: 0,
        duration: 280, onComplete: () => ring2.destroy(),
      });
    });

    // Shrapnel particles
    const shrapnelCount = 12;
    for (let i = 0; i < shrapnelCount; i++) {
      const angle = (i / shrapnelCount) * Math.PI * 2 + Math.random() * 0.4;
      const dist = radius * (0.4 + Math.random() * 0.6);
      const color = Math.random() > 0.5 ? 0xffaa44 : visual.trailColor;
      const size = 1.5 + Math.random() * 2.5;

      const shard = scene.add.circle(x, y, size, color, 0.7).setDepth(26);
      scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 200 + Math.random() * 150,
        onComplete: () => shard.destroy(),
      });
    }

    // "DETONATE" text
    const txt = scene.add.text(x, y - radius * 0.5 - 10, '💥 DETONATE', {
      fontFamily: '"Courier New", monospace', fontSize: '8px',
      color: '#ffaa44', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30).setAlpha(0.7);
    scene.tweens.add({
      targets: txt, y: txt.y - 12, alpha: 0,
      duration: 800, onComplete: () => txt.destroy(),
    });

    // Ground scorch
    const scorch = scene.add.circle(x, y, radius * 0.6, 0x442200, 0.1).setDepth(3);
    scene.tweens.add({
      targets: scorch, alpha: 0, duration: 2000, delay: 300,
      onComplete: () => scorch.destroy(),
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  OF ECHOES — ghostly echo cast visual
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Render the echo activation — ghostly ripple before the echo fires.
   */
  static renderEchoActivation(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
  ): void {
    // Ghostly expanding ring
    const ghostRing = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(24);
    ghostRing.setStrokeStyle(1.5, visual.color, 0.3);
    scene.tweens.add({
      targets: ghostRing, scaleX: 5, scaleY: 5, alpha: 0,
      duration: 400, ease: 'Power1', onComplete: () => ghostRing.destroy(),
    });

    // Ghostly flash — translucent, dimmer than original
    const ghostFlash = scene.add.circle(x, y, 12, visual.glowColor, 0.15).setDepth(23);
    scene.tweens.add({
      targets: ghostFlash, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 350, onComplete: () => ghostFlash.destroy(),
    });

    // "ECHO" text
    const txt = scene.add.text(x, y - 20, '◊ ECHO ◊', {
      fontFamily: '"Courier New", monospace', fontSize: '9px',
      color: '#' + visual.glowColor.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30).setAlpha(0.5);
    scene.tweens.add({
      targets: txt, y: txt.y - 14, alpha: 0,
      duration: 700, onComplete: () => txt.destroy(),
    });

    // Ghostly particles
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 15;
      const p = scene.add.circle(x, y, 2, visual.color, 0.25).setDepth(23);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        onComplete: () => p.destroy(),
      });
    }
  }
}