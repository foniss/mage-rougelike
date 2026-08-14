// src/systems/LightningChainSystem.ts
//
// Handles the Lightning chain effect:
// When a Lightning spell hits an enemy, it chains to nearby enemies.
// Each chain hop draws a visible lightning arc between targets.
//
// Reusable — works with Bolt, Nova, and Beam forms.

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import {
  CHAIN_ARC_SEGMENTS,
  CHAIN_ARC_OFFSET,
  CHAIN_ARC_COLOR,
  CHAIN_ARC_GLOW_COLOR,
  CHAIN_ARC_WIDTH,
  CHAIN_ARC_GLOW_WIDTH,
  CHAIN_ARC_DURATION,
  CHAIN_DELAY_BETWEEN,
  CHAIN_HIT_FLASH_COLOR,
  CHAIN_HIT_FLASH_RADIUS,
} from '../config/constants';

export class LightningChainSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Execute a lightning chain starting from a source enemy.
   *
   * @param source       The first enemy that was hit (already damaged by the spell).
   * @param allEnemies   All alive enemies in the room.
   * @param maxTargets   Maximum total enemies to hit (including the source).
   * @param chainRange   Maximum pixel distance for a chain hop.
   * @param baseDamage   The spell's base damage — chains deal reduced damage.
   */
  executeChain(
    source: Enemy,
    allEnemies: Enemy[],
    maxTargets: number,
    chainRange: number,
    baseDamage: number
  ): void {
    const hitSet: Set<Enemy> = new Set();
    hitSet.add(source);

    // Show hit flash on the source
    this.showHitFlash(source);

    let chainsRemaining = maxTargets - 1; // Source already hit
    this.chainStep(source, allEnemies, hitSet, chainsRemaining, chainRange, baseDamage, 0);
  }

  /**
   * Recursive chain step — finds the next target and schedules the chain.
   */
  private chainStep(
    current: Enemy,
    allEnemies: Enemy[],
    hitSet: Set<Enemy>,
    chainsRemaining: number,
    chainRange: number,
    baseDamage: number,
    hopIndex: number
  ): void {
    if (chainsRemaining <= 0) return;

    // Find closest unhit enemy in range
    let closest: Enemy | null = null;
    let closestDist = Infinity;

    for (const enemy of allEnemies) {
      if (!enemy.alive) continue;
      if (hitSet.has(enemy)) continue;

      const dist = Phaser.Math.Distance.Between(
        current.sprite.x, current.sprite.y,
        enemy.sprite.x, enemy.sprite.y
      );

      if (dist <= chainRange && dist < closestDist) {
        closestDist = dist;
        closest = enemy;
      }
    }

    if (!closest) return; // No valid target found

    hitSet.add(closest);

    const nextTarget = closest;
    const delay = CHAIN_DELAY_BETWEEN * (hopIndex + 1);

    this.scene.time.delayedCall(delay, () => {
      if (!nextTarget.alive) return;
      if (!current.alive && !current.sprite.active) return;

      // Draw the lightning arc
      this.drawLightningArc(
        current.sprite.x, current.sprite.y,
        nextTarget.sprite.x, nextTarget.sprite.y
      );

      // Show hit flash on the target
      this.showHitFlash(nextTarget);

      // Deal reduced damage (70% per hop, compounding)
      const damageMultiplier = Math.pow(0.7, hopIndex + 1);
      const chainDamage = Math.round(baseDamage * damageMultiplier);
      nextTarget.takeDamage(chainDamage);

      // Continue chaining
      this.chainStep(
        nextTarget,
        allEnemies,
        hitSet,
        chainsRemaining - 1,
        chainRange,
        baseDamage,
        hopIndex + 1
      );
    });
  }

  /**
   * Draw a jagged lightning arc between two points.
   * Uses multiple line segments with random perpendicular offsets.
   */
  private drawLightningArc(
    x1: number, y1: number,
    x2: number, y2: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Direction and perpendicular vectors
    const dirX = dx / dist;
    const dirY = dy / dist;
    const perpX = -dirY;
    const perpY = dirX;

    // Generate jagged points along the line
    const points: { x: number; y: number }[] = [];
    points.push({ x: x1, y: y1 });

    for (let i = 1; i < CHAIN_ARC_SEGMENTS; i++) {
      const t = i / CHAIN_ARC_SEGMENTS;
      const baseX = x1 + dx * t;
      const baseY = y1 + dy * t;

      // Random perpendicular offset — larger in the middle, smaller at ends
      const midFactor = Math.sin(t * Math.PI); // peaks at t=0.5
      const offset = (Math.random() * 2 - 1) * CHAIN_ARC_OFFSET * midFactor;

      points.push({
        x: baseX + perpX * offset,
        y: baseY + perpY * offset,
      });
    }

    points.push({ x: x2, y: y2 });

    // Draw the glow (thicker, semi-transparent)
    const glowGraphics = this.scene.add.graphics();
    glowGraphics.setDepth(20);
    glowGraphics.lineStyle(CHAIN_ARC_GLOW_WIDTH, CHAIN_ARC_GLOW_COLOR, 0.3);
    glowGraphics.beginPath();
    glowGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      glowGraphics.lineTo(points[i].x, points[i].y);
    }
    glowGraphics.strokePath();

    // Draw the core arc (thinner, bright)
    const coreGraphics = this.scene.add.graphics();
    coreGraphics.setDepth(21);
    coreGraphics.lineStyle(CHAIN_ARC_WIDTH, CHAIN_ARC_COLOR, 0.9);
    coreGraphics.beginPath();
    coreGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      coreGraphics.lineTo(points[i].x, points[i].y);
    }
    coreGraphics.strokePath();

    // Draw a second offset arc for a "forked" effect
    const forkGraphics = this.scene.add.graphics();
    forkGraphics.setDepth(20);
    forkGraphics.lineStyle(1, CHAIN_ARC_COLOR, 0.4);
    forkGraphics.beginPath();
    forkGraphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const forkOffset = (Math.random() * 2 - 1) * 6;
      forkGraphics.lineTo(
        points[i].x + perpX * forkOffset,
        points[i].y + perpY * forkOffset
      );
    }
    forkGraphics.strokePath();

    // Fade out and destroy
    this.scene.tweens.add({
      targets: [glowGraphics, coreGraphics, forkGraphics],
      alpha: 0,
      duration: CHAIN_ARC_DURATION,
      ease: 'Power2',
      onComplete: () => {
        glowGraphics.destroy();
        coreGraphics.destroy();
        forkGraphics.destroy();
      },
    });
  }

  /**
   * Show a bright flash on an enemy when hit by a chain.
   */
  private showHitFlash(enemy: Enemy): void {
    if (!enemy.sprite.active) return;

    // Bright circle flash
    const flash = this.scene.add.circle(
      enemy.sprite.x,
      enemy.sprite.y,
      CHAIN_HIT_FLASH_RADIUS,
      CHAIN_HIT_FLASH_COLOR,
      0.7
    );
    flash.setDepth(23);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 250,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Smaller bright core
    const core = this.scene.add.circle(
      enemy.sprite.x,
      enemy.sprite.y,
      6,
      0xffffff,
      0.8
    );
    core.setDepth(24);

    this.scene.tweens.add({
      targets: core,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 180,
      ease: 'Power3',
      onComplete: () => core.destroy(),
    });

    // Brief tint on the enemy
    enemy.sprite.setTint(CHAIN_ARC_COLOR);
    this.scene.time.delayedCall(120, () => {
      if (enemy.sprite.active) {
        enemy.sprite.clearTint();
      }
    });
  }
}