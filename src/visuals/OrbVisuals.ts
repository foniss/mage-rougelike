// src/visuals/OrbVisuals.ts
//
// ORB: Clearly visible moving sphere.
// - Layered circle: outer glow, main body, inner highlight
// - Core-colored with element-specific details
// - Visible trail of fading particles
// - Subtle pulsing/rotation animation

import Phaser from 'phaser';
import { VisualConfig } from '../config/spellComponents';

export interface OrbVisualAttachment {
  outerGlow: Phaser.GameObjects.Arc;
  mainBody: Phaser.GameObjects.Arc;
  innerHighlight: Phaser.GameObjects.Arc;
  coreSparkle: Phaser.GameObjects.Arc;
  update: () => void;
  destroy: () => void;
}

export class OrbVisuals {

  /**
   * Create the orb visual layers and attach them to a sprite.
   * Returns an attachment that must be updated each frame and destroyed when done.
   */
  static attach(
    scene: Phaser.Scene,
    sprite: Phaser.Physics.Arcade.Sprite,
    visual: VisualConfig,
    radius: number,
    sizeMultiplier: number,
  ): OrbVisualAttachment {
    const r = radius * sizeMultiplier;
    const objects: Phaser.GameObjects.GameObject[] = [];

    // Outer glow
    const outerGlow = scene.add.circle(sprite.x, sprite.y, r + 8, visual.color, 0.12);
    outerGlow.setDepth(7);
    objects.push(outerGlow);

    // Main body
    const mainBody = scene.add.circle(sprite.x, sprite.y, r, visual.color, 0.6);
    mainBody.setDepth(8);
    mainBody.setStrokeStyle(1.5, visual.glowColor, 0.5);
    objects.push(mainBody);

    // Inner highlight (offset for 3D effect)
    const innerHighlight = scene.add.circle(sprite.x - r * 0.25, sprite.y - r * 0.25, r * 0.45, visual.glowColor, 0.4);
    innerHighlight.setDepth(9);
    objects.push(innerHighlight);

    // Core sparkle (tiny bright center)
    const coreSparkle = scene.add.circle(sprite.x, sprite.y, r * 0.2, 0xffffff, 0.5);
    coreSparkle.setDepth(10);
    objects.push(coreSparkle);

    // Pulse animation on the outer glow
    scene.tweens.add({
      targets: outerGlow,
      scaleX: { from: 0.9, to: 1.15 },
      scaleY: { from: 0.9, to: 1.15 },
      alpha: { from: 0.08, to: 0.18 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sparkle twinkle
    scene.tweens.add({
      targets: coreSparkle,
      alpha: { from: 0.3, to: 0.7 },
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    // Trail particle emitter
    const trailTimer = scene.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (!sprite.active) return;

        const trailDot = scene.add.circle(
          sprite.x + (Math.random() - 0.5) * r,
          sprite.y + (Math.random() - 0.5) * r,
          2 + Math.random() * 3,
          visual.trailColor,
          0.5
        ).setDepth(6);

        scene.tweens.add({
          targets: trailDot,
          alpha: 0,
          scaleX: 0.1,
          scaleY: 0.1,
          duration: 250 + Math.random() * 150,
          onComplete: () => trailDot.destroy(),
        });
      },
    });

    // Ambient ring particles (orbiting)
    const ringParticles: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i++) {
      const ringDot = scene.add.circle(sprite.x, sprite.y, 1.5, visual.glowColor, 0.4);
      ringDot.setDepth(9);
      ringParticles.push(ringDot);
      objects.push(ringDot);
    }

    let orbitAngle = 0;

    const update = () => {
      if (!sprite.active) return;

      const sx = sprite.x;
      const sy = sprite.y;

      outerGlow.setPosition(sx, sy);
      mainBody.setPosition(sx, sy);
      innerHighlight.setPosition(sx - r * 0.25, sy - r * 0.25);
      coreSparkle.setPosition(sx, sy);

      // Orbit ring particles
      orbitAngle += 0.08;
      for (let i = 0; i < ringParticles.length; i++) {
        const a = orbitAngle + (i / ringParticles.length) * Math.PI * 2;
        ringParticles[i].setPosition(
          sx + Math.cos(a) * (r + 4),
          sy + Math.sin(a) * (r + 4)
        );
      }
    };

    const destroy = () => {
      trailTimer.destroy();
      scene.tweens.killTweensOf(outerGlow);
      scene.tweens.killTweensOf(coreSparkle);
      for (const obj of objects) {
        if (obj.active) {
          scene.tweens.add({
            targets: obj, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 150,
            onComplete: () => obj.destroy(),
          });
        }
      }
    };

    return { outerGlow, mainBody, innerHighlight, coreSparkle, update, destroy };
  }
}