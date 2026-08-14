// src/visuals/PrefixVisuals.ts
//
// Visual feedback for all Prefix behaviors.
// Each method is called by Projectile or FormExecutor as needed.
// All visuals read Core colors from the spell so they work with any Core.

import Phaser from 'phaser';
import { Spell } from '../systems/SpellBuilder';
import { VisualConfig } from '../config/spellComponents';
import { getCoreTheme } from './CoreVisualTheme';

export class PrefixVisuals {

  // ═════════════════════════════════════════════════════════════════════════
  //  HOMING — targeting indicator and curved trail
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Spawn a homing indicator when the projectile locks on.
   * Call this each frame from the homing update loop when a target is found.
   */
  static renderHomingIndicator(
    scene: Phaser.Scene,
    projX: number, projY: number,
    targetX: number, targetY: number,
    visual: VisualConfig,
  ): void {
    // Faint dotted line from projectile toward target
    const dist = Phaser.Math.Distance.Between(projX, projY, targetX, targetY);
    const angle = Phaser.Math.Angle.Between(projX, projY, targetX, targetY);

    // Small diamond marker near the target
    const markerDist = Math.min(dist * 0.6, 40);
    const mx = projX + Math.cos(angle) * markerDist;
    const my = projY + Math.sin(angle) * markerDist;

    const marker = scene.add.rectangle(mx, my, 4, 4, visual.glowColor, 0.4)
      .setDepth(11).setAngle(45);
    scene.tweens.add({
      targets: marker, alpha: 0, scaleX: 0.2, scaleY: 0.2,
      duration: 150, onComplete: () => marker.destroy(),
    });
  }

  /**
   * Curved trail particle showing the homing path.
   */
  static renderHomingTrail(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
  ): void {
    const dot = scene.add.circle(x, y, 1.5, visual.glowColor, 0.5).setDepth(7);
    scene.tweens.add({
      targets: dot, alpha: 0, duration: 300,
      onComplete: () => dot.destroy(),
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  SPLITTING — split moment flash and sub-projectile spawn effect
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Render the moment the orb splits into sub-projectiles.
   */
  static renderSplitMoment(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
    splitCount: number,
    baseAngle: number,
    spreadDeg: number,
  ): void {
    // Central burst flash
    const flash = scene.add.circle(x, y, 8, 0xffffff, 0.7).setDepth(26);
    scene.tweens.add({
      targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0,
      duration: 180, onComplete: () => flash.destroy(),
    });

    // Expanding ring at split point
    const ring = scene.add.circle(x, y, 5, 0x000000, 0).setDepth(25);
    ring.setStrokeStyle(2, visual.color, 0.6);
    scene.tweens.add({
      targets: ring, scaleX: 4, scaleY: 4, alpha: 0,
      duration: 250, onComplete: () => ring.destroy(),
    });

    // Directional arrows showing split paths
    const spreadRad = Phaser.Math.DegToRad(spreadDeg);
    for (let i = 0; i < splitCount; i++) {
      const fraction = splitCount === 1 ? 0 : (i / (splitCount - 1)) - 0.5;
      const angle = baseAngle + fraction * spreadRad * 2;

      // Line showing split direction
      const lineLen = 25;
      const ex = x + Math.cos(angle) * lineLen;
      const ey = y + Math.sin(angle) * lineLen;

      const splitLine = scene.add.line(0, 0, x, y, ex, ey, visual.glowColor, 0.5)
        .setOrigin(0, 0).setLineWidth(1.5).setDepth(25);
      scene.tweens.add({
        targets: splitLine, alpha: 0, duration: 200, delay: 50,
        onComplete: () => splitLine.destroy(),
      });

      // Small dot at end of each split line
      const dot = scene.add.circle(ex, ey, 3, visual.color, 0.7).setDepth(25);
      scene.tweens.add({
        targets: dot,
        x: x + Math.cos(angle) * lineLen * 1.5,
        y: y + Math.sin(angle) * lineLen * 1.5,
        alpha: 0, duration: 200,
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  GREATER — size aura indicating enhanced scale
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Render a subtle size-enhancement aura around the spell origin.
   * Called once when the spell is cast.
   */
  static renderGreaterCastEffect(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
    radius: number,
  ): void {
    // Expanding power ring
    const powerRing = scene.add.circle(x, y, radius * 0.3, 0x000000, 0).setDepth(24);
    powerRing.setStrokeStyle(2.5, visual.glowColor, 0.5);
    scene.tweens.add({
      targets: powerRing, scaleX: 3, scaleY: 3, alpha: 0,
      duration: 400, ease: 'Power2', onComplete: () => powerRing.destroy(),
    });

    // Inner bright flash
    const flash = scene.add.circle(x, y, radius * 0.15, 0xffffff, 0.4).setDepth(25);
    scene.tweens.add({
      targets: flash, scaleX: 4, scaleY: 4, alpha: 0,
      duration: 250, onComplete: () => flash.destroy(),
    });

    // "Greater" text indicator
    const txt = scene.add.text(x, y - radius - 10, '▲ GREATER', {
      fontFamily: '"Courier New", monospace', fontSize: '9px',
      color: '#' + visual.glowColor.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(30).setAlpha(0.7);

    scene.tweens.add({
      targets: txt, y: txt.y - 12, alpha: 0,
      duration: 800, onComplete: () => txt.destroy(),
    });
  }

  /**
   * Ongoing greater aura on an orb projectile — subtle size ring.
   */
  static renderGreaterOrbAura(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
    radius: number,
  ): Phaser.GameObjects.Arc {
    const aura = scene.add.circle(x, y, radius + 4, visual.color, 0.06).setDepth(6);
    aura.setStrokeStyle(0.5, visual.glowColor, 0.15);
    return aura;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  EXPANDING — growth trail particles showing size increase
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Spawn a growth particle at the orb's expanding edge.
   */
  static renderExpandingParticle(
    scene: Phaser.Scene,
    x: number, y: number,
    currentScale: number,
    visual: VisualConfig,
  ): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = currentScale * 12;
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;

    // Outward-expanding particle
    const particle = scene.add.circle(px, py, 1.5, visual.glowColor, 0.4).setDepth(7);
    scene.tweens.add({
      targets: particle,
      x: px + Math.cos(angle) * 8,
      y: py + Math.sin(angle) * 8,
      alpha: 0, scaleX: 2, scaleY: 2,
      duration: 200,
      onComplete: () => particle.destroy(),
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  RETURNING — reverse direction visual
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Render the moment the orb reverses direction.
   */
  static renderReturnMoment(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
    returnAngle: number,
  ): void {
    // Reversal flash
    const flash = scene.add.circle(x, y, 10, visual.glowColor, 0.6).setDepth(25);
    scene.tweens.add({
      targets: flash, scaleX: 2, scaleY: 2, alpha: 0,
      duration: 200, onComplete: () => flash.destroy(),
    });

    // Curved arrow indicating return direction
    const arrowLen = 20;
    const ax = x + Math.cos(returnAngle) * arrowLen;
    const ay = y + Math.sin(returnAngle) * arrowLen;

    const arrow = scene.add.line(0, 0, x, y, ax, ay, visual.color, 0.6)
      .setOrigin(0, 0).setLineWidth(2).setDepth(25);
    scene.tweens.add({
      targets: arrow, alpha: 0, duration: 400,
      onComplete: () => arrow.destroy(),
    });

    // Arrowhead
    const headAngle1 = returnAngle + Math.PI * 0.8;
    const headAngle2 = returnAngle - Math.PI * 0.8;
    const headLen = 8;
    const h1 = scene.add.line(0, 0,
      ax, ay,
      ax + Math.cos(headAngle1) * headLen, ay + Math.sin(headAngle1) * headLen,
      visual.color, 0.6
    ).setOrigin(0, 0).setLineWidth(2).setDepth(25);
    const h2 = scene.add.line(0, 0,
      ax, ay,
      ax + Math.cos(headAngle2) * headLen, ay + Math.sin(headAngle2) * headLen,
      visual.color, 0.6
    ).setOrigin(0, 0).setLineWidth(2).setDepth(25);

    scene.tweens.add({
      targets: [h1, h2], alpha: 0, duration: 400,
      onComplete: () => { h1.destroy(); h2.destroy(); },
    });

    // "Return" text
    const txt = scene.add.text(x, y - 18, '↩ RETURN', {
      fontFamily: '"Courier New", monospace', fontSize: '8px',
      color: '#' + visual.glowColor.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(30).setAlpha(0.6);
    scene.tweens.add({
      targets: txt, y: txt.y - 10, alpha: 0,
      duration: 600, onComplete: () => txt.destroy(),
    });
  }

  /**
   * Trail particle during return phase — different from outgoing trail.
   */
  static renderReturnTrail(
    scene: Phaser.Scene,
    x: number, y: number,
    visual: VisualConfig,
  ): void {
    // Double-dot trail for return phase
    for (let i = 0; i < 2; i++) {
      const ox = (Math.random() - 0.5) * 6;
      const oy = (Math.random() - 0.5) * 6;
      const dot = scene.add.circle(x + ox, y + oy, 2, visual.trailColor, 0.4).setDepth(7);
      scene.tweens.add({
        targets: dot, alpha: 0, scaleX: 0.5, scaleY: 0.5,
        duration: 250 + Math.random() * 100,
        onComplete: () => dot.destroy(),
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  PIERCING — pass-through visual
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Render the moment the orb pierces through an enemy.
   */
  static renderPierceMoment(
    scene: Phaser.Scene,
    projX: number, projY: number,
    enemyX: number, enemyY: number,
    visual: VisualConfig,
    pierceCount: number,
    maxPierce: number,
  ): void {
    // Through-strike flash on the enemy
    const angle = Phaser.Math.Angle.Between(projX, projY, enemyX, enemyY);

    // Entry flash
    const entryX = enemyX - Math.cos(angle) * 12;
    const entryY = enemyY - Math.sin(angle) * 12;
    const entry = scene.add.circle(entryX, entryY, 4, visual.glowColor, 0.6).setDepth(25);
    scene.tweens.add({
      targets: entry, alpha: 0, scaleX: 2, scaleY: 2,
      duration: 150, onComplete: () => entry.destroy(),
    });

    // Exit flash (opposite side)
    const exitX = enemyX + Math.cos(angle) * 12;
    const exitY = enemyY + Math.sin(angle) * 12;
    const exit = scene.add.circle(exitX, exitY, 4, visual.glowColor, 0.6).setDepth(25);
    scene.tweens.add({
      targets: exit, alpha: 0, scaleX: 2, scaleY: 2,
      duration: 150, delay: 30, onComplete: () => exit.destroy(),
    });

    // Through-line
    const throughLine = scene.add.line(0, 0,
      entryX, entryY, exitX, exitY,
      visual.color, 0.5
    ).setOrigin(0, 0).setLineWidth(1.5).setDepth(25);
    scene.tweens.add({
      targets: throughLine, alpha: 0, duration: 250,
      onComplete: () => throughLine.destroy(),
    });

    // Pierce counter text
    const remaining = maxPierce - pierceCount;
    if (remaining >= 0) {
      const txt = scene.add.text(enemyX, enemyY - 16, `⟫ ${remaining}`, {
        fontFamily: '"Courier New", monospace', fontSize: '8px',
        color: '#' + visual.glowColor.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(30).setAlpha(0.6);
      scene.tweens.add({
        targets: txt, y: txt.y - 8, alpha: 0,
        duration: 500, onComplete: () => txt.destroy(),
      });
    }
  }

  /**
   * Enhanced trail for a piercing projectile — shows continued momentum.
   */
  static renderPiercingTrail(
    scene: Phaser.Scene,
    x: number, y: number,
    vx: number, vy: number,
    visual: VisualConfig,
  ): void {
    // Elongated trail dot showing momentum
    const angle = Math.atan2(vy, vx);
    const trail = scene.add.ellipse(x, y, 6, 2, visual.trailColor, 0.5)
      .setDepth(7).setAngle(Phaser.Math.RadToDeg(angle));
    scene.tweens.add({
      targets: trail, alpha: 0, scaleX: 2, scaleY: 0.5,
      duration: 200,
      onComplete: () => trail.destroy(),
    });
  }
}