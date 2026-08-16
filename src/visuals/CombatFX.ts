// src/visuals/CombatFX.ts
//
// Central combat feedback utility.
// Handles: damage numbers, hit flash, screen shake, hit-stop, kill VFX.
// Called by CombatSystem and FormExecutor on every hit.

import Phaser from 'phaser';
import { Spell } from '../systems/SpellBuilder';
import { CoreId, VisualConfig } from '../config/spellComponents';
import { getCoreTheme } from './CoreVisualTheme';
import { UI_FONT } from '../config/uiStyles';

// ── Spell Tier ──────────────────────────────────────────────────────────

export type SpellTier = 0 | 1 | 2 | 3;

/** Determine the visual intensity tier of a spell. */
export function getSpellTier(spell: Spell | null): SpellTier {
  if (!spell) return 0; // basic attack
  const hasPrefix = spell.prefix !== null;
  const hasSuffix = spell.suffix !== null;
  if (hasPrefix || hasSuffix) return 3; // core + form + modifier(s)
  return 2; // core + form only
}

// ── Tier Config ─────────────────────────────────────────────────────────

interface TierConfig {
  impactRadius: number;
  particleCount: number;
  shakeIntensity: number;
  shakeDuration: number;
  hitStopMs: number;
  dmgFontSize: number;
  dmgScale: number;
  flashAlpha: number;
  flashRadius: number;
  enemyKnockScale: number;
}

const TIER_CONFIG: Record<SpellTier, TierConfig> = {
  0: { impactRadius: 8, particleCount: 3, shakeIntensity: 0, shakeDuration: 0, hitStopMs: 0, dmgFontSize: 12, dmgScale: 1.0, flashAlpha: 0.4, flashRadius: 10, enemyKnockScale: 0 },
  1: { impactRadius: 8, particleCount: 3, shakeIntensity: 0, shakeDuration: 0, hitStopMs: 0, dmgFontSize: 12, dmgScale: 1.0, flashAlpha: 0.4, flashRadius: 10, enemyKnockScale: 0 },
  2: { impactRadius: 18, particleCount: 6, shakeIntensity: 0.8, shakeDuration: 60, hitStopMs: 30, dmgFontSize: 16, dmgScale: 1.15, flashAlpha: 0.6, flashRadius: 16, enemyKnockScale: 1.5 },
  3: { impactRadius: 28, particleCount: 10, shakeIntensity: 1.5, shakeDuration: 80, hitStopMs: 50, dmgFontSize: 20, dmgScale: 1.3, flashAlpha: 0.8, flashRadius: 22, enemyKnockScale: 3.0 },
};

// ── Hit Feedback ────────────────────────────────────────────────────────

export class CombatFX {

  /** Main entry point — call on every damage event. */
  static onHit(
    scene: Phaser.Scene,
    x: number, y: number,
    damage: number,
    spell: Spell | null,
    tier: SpellTier,
  ): void {
    const cfg = TIER_CONFIG[tier];
    const color = spell ? spell.visual.color : 0x00d4ff;
    const glowColor = spell ? spell.visual.glowColor : 0x66e8ff;

    // 1. Impact flash
    CombatFX.impactFlash(scene, x, y, cfg, color, glowColor, tier);

    // 2. Core-specific impact particles (tier 2+)
    if (spell && tier >= 2) {
      const theme = getCoreTheme(spell.core.id);
      theme.renderImpact(scene, x, y, spell.visual, cfg.impactRadius);
    }

    // 3. Generic impact particles (tier 0-1)
    if (tier <= 1) {
      CombatFX.basicImpactParticles(scene, x, y, cfg, color);
    }

    // 4. Damage number
    CombatFX.damageNumber(scene, x, y, damage, cfg, color);

    // 5. Screen shake
    if (cfg.shakeIntensity > 0) {
      CombatFX.screenShake(scene, cfg.shakeIntensity, cfg.shakeDuration);
    }

    // 6. Hit-stop
    if (cfg.hitStopMs > 0) {
      CombatFX.hitStop(scene, cfg.hitStopMs);
    }
  }

  /** Called when an enemy hit reaction should play. */
  static enemyHitReaction(
    scene: Phaser.Scene,
    enemySprite: Phaser.Physics.Arcade.Sprite,
    sourceX: number, sourceY: number,
    tier: SpellTier,
    color: number,
  ): void {
    if (!enemySprite.active) return;
    const cfg = TIER_CONFIG[tier];

    // White flash (all tiers)
    enemySprite.setTint(0xffffff);

    // Scale punch for tier 2+
    if (tier >= 2) {
      scene.tweens.add({
        targets: enemySprite,
        scaleX: 1.0 + cfg.enemyKnockScale * 0.05,
        scaleY: 1.0 - cfg.enemyKnockScale * 0.03,
        duration: 40,
        yoyo: true,
        ease: 'Sine.Out',
      });
    }

    // No micro-displacement — knockback is exclusively a Wind status effect

    // Tint restore — flash with spell color briefly, then clear
    const flashDuration = tier >= 2 ? 120 : 80;
    scene.time.delayedCall(40, () => {
      if (enemySprite.active) enemySprite.setTint(color);
    });
    scene.time.delayedCall(flashDuration, () => {
      if (enemySprite.active) enemySprite.clearTint();
    });
  }

  /** Status activation feedback — stronger than a regular hit. */
  static onStatusActivation(
    scene: Phaser.Scene,
    x: number, y: number,
    statusName: string,
    color: number,
  ): void {
    // Status text popup
    const txt = scene.add.text(x, y - 24, statusName, {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: '#' + color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    scene.tweens.add({
      targets: txt,
      alpha: 1,
      y: y - 36,
      scaleX: { from: 0.5, to: 1.1 },
      scaleY: { from: 0.5, to: 1.1 },
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: txt,
          alpha: 0,
          y: txt.y - 14,
          duration: 600,
          delay: 400,
          onComplete: () => txt.destroy(),
        });
      },
    });

    // Activation flash ring
    const ring = scene.add.circle(x, y, 8, 0x000000, 0).setDepth(55);
    ring.setStrokeStyle(3, color, 0.9);
    scene.tweens.add({
      targets: ring,
      scaleX: 4,
      scaleY: 4,
      alpha: 0,
      duration: 350,
      ease: 'Power2',
      onComplete: () => ring.destroy(),
    });

    // Screen shake for status
    CombatFX.screenShake(scene, 2.0, 100);

    // Brief hit-stop
    CombatFX.hitStop(scene, 60);
  }

  /** Core-themed kill effect. */
  static onKill(
    scene: Phaser.Scene,
    x: number, y: number,
    spell: Spell | null,
    tier: SpellTier,
  ): void {
    const cfg = TIER_CONFIG[Math.max(tier, 1) as SpellTier];

    if (spell) {
      const theme = getCoreTheme(spell.core.id);
      theme.renderKill(scene, x, y, spell.visual, cfg.impactRadius * 1.5);
    } else {
      // Basic attack kill — simple white burst
      const flash = scene.add.circle(x, y, 12, 0xffffff, 0.6).setDepth(30);
      scene.tweens.add({
        targets: flash, scaleX: 2.5, scaleY: 2.5, alpha: 0,
        duration: 200, onComplete: () => flash.destroy(),
      });
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const p = scene.add.circle(x, y, 2, 0xcccccc, 0.7).setDepth(29);
        scene.tweens.add({
          targets: p,
          x: x + Math.cos(angle) * 25,
          y: y + Math.sin(angle) * 25,
          alpha: 0, duration: 250,
          onComplete: () => p.destroy(),
        });
      }
    }

    // Kill screen shake (brief, satisfying)
    CombatFX.screenShake(scene, tier >= 2 ? 2.0 : 1.0, 80);
  }

  // ── Internal helpers ──────────────────────────────────────────────────

  private static impactFlash(
    scene: Phaser.Scene, x: number, y: number,
    cfg: TierConfig, color: number, glowColor: number, tier: SpellTier,
  ): void {
    // White core flash
    const core = scene.add.circle(x, y, cfg.flashRadius * 0.4, 0xffffff, cfg.flashAlpha).setDepth(30);
    scene.tweens.add({
      targets: core, scaleX: 2, scaleY: 2, alpha: 0,
      duration: 100, onComplete: () => core.destroy(),
    });

    // Colored outer flash (tier 1+)
    if (tier >= 1) {
      const outer = scene.add.circle(x, y, cfg.flashRadius * 0.6, color, cfg.flashAlpha * 0.5).setDepth(29);
      scene.tweens.add({
        targets: outer, scaleX: 2.5, scaleY: 2.5, alpha: 0,
        duration: 150, onComplete: () => outer.destroy(),
      });
    }

    // Expanding ring (tier 2+)
    if (tier >= 2) {
      const ring = scene.add.circle(x, y, 5, 0x000000, 0).setDepth(28);
      ring.setStrokeStyle(tier >= 3 ? 2.5 : 1.5, glowColor, 0.7);
      scene.tweens.add({
        targets: ring,
        scaleX: cfg.impactRadius / 5,
        scaleY: cfg.impactRadius / 5,
        alpha: 0,
        duration: 250,
        ease: 'Power2',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private static basicImpactParticles(
    scene: Phaser.Scene, x: number, y: number,
    cfg: TierConfig, color: number,
  ): void {
    for (let i = 0; i < cfg.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = cfg.impactRadius * (0.3 + Math.random() * 0.7);
      const size = 1 + Math.random() * 2;
      const p = scene.add.circle(x, y, size, color, 0.7).setDepth(28);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 150 + Math.random() * 100,
        onComplete: () => p.destroy(),
      });
    }
  }

  static damageNumber(
    scene: Phaser.Scene, x: number, y: number,
    damage: number, cfg: TierConfig, color: number,
  ): void {
    const hex = '#' + color.toString(16).padStart(6, '0');
    const txt = scene.add.text(
      x + (Math.random() - 0.5) * 12,
      y - 10,
      String(Math.round(damage)),
      {
        fontFamily: UI_FONT,
        fontSize: `${cfg.dmgFontSize}px`,
        color: hex,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: cfg.dmgFontSize >= 16 ? 3 : 2,
      },
    ).setOrigin(0.5).setDepth(50).setAlpha(0);

    // Pop-in
    scene.tweens.add({
      targets: txt,
      alpha: 1,
      scaleX: { from: cfg.dmgScale * 1.3, to: cfg.dmgScale },
      scaleY: { from: cfg.dmgScale * 1.3, to: cfg.dmgScale },
      y: txt.y - 6,
      duration: 120,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Float up and fade
        scene.tweens.add({
          targets: txt,
          y: txt.y - 18,
          alpha: 0,
          duration: 500,
          delay: 150,
          ease: 'Power2',
          onComplete: () => txt.destroy(),
        });
      },
    });
  }

  static screenShake(scene: Phaser.Scene, intensity: number, durationMs: number): void {
    if (!scene.cameras?.main) return;
    scene.cameras.main.shake(durationMs, intensity * 0.001);
  }

  static hitStop(scene: Phaser.Scene, ms: number): void {
    if (ms <= 0) return;
    scene.time.timeScale = 0.05;
    scene.physics.world.timeScale = 1 / 0.05;
    scene.time.delayedCall(ms * 0.05, () => {
      scene.time.timeScale = 1;
      scene.physics.world.timeScale = 1;
    });
  }
}
