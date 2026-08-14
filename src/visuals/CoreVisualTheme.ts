// src/visuals/CoreVisualTheme.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  CORE VISUAL THEME INTERFACE
//
//  Every Core implements this interface. Forms call these methods to
//  get Core-specific particles, trails, and impacts without knowing
//  which Core they're rendering.
//
//  To add a new Core's visuals:
//    1. Create a new file in src/visuals/cores/
//    2. Implement CoreVisualTheme
//    3. Register it in CORE_THEME_REGISTRY below
// ═══════════════════════════════════════════════════════════════════════════

import Phaser from 'phaser';
import { CoreId, VisualConfig } from '../config/spellComponents';

/**
 * Core visual theme interface.
 * Every Core provides these visual behaviors.
 */
export interface CoreVisualTheme {
  /** Spawn ambient particles around a point (used by Orb, Mine idle) */
  spawnAmbientParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig): void;

  /** Spawn trail particles behind a moving spell (used by Orb, Blade edge) */
  spawnTrailParticle(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, velocityX?: number, velocityY?: number): void;

  /** Render impact effect when spell hits an enemy */
  renderImpact(scene: Phaser.Scene, x: number, y: number, visual: VisualConfig, radius?: number): void;

  /** Render the status effect on an enemy (burn flames, chill frost, etc.) */
  renderStatusOnEnemy(scene: Phaser.Scene, enemyX: number, enemyY: number, visual: VisualConfig, intensity?: number): void;

  /** Render a connecting arc/line between two points (used by Storm chain, Cosmic pull) */
  renderArc(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number, visual: VisualConfig): void;

  /** Get additional tint/overlay for the beam core line */
  getBeamParticleConfig(): { colors: number[]; sizes: [number, number]; speed: number; alpha: number };

  /** Get the glow parameters for this core */
  getGlowConfig(): { color: number; alpha: number; radius: number; pulseSpeed: number };
}

// ═══════════════════════════════════════════════════════════════════════════
//  REGISTRY — import and register all core themes here
// ═══════════════════════════════════════════════════════════════════════════

import { FireTheme } from './cores/FireTheme';
import { IceTheme } from './cores/IceTheme';
import { WindTheme } from './cores/WindTheme';
import { StormTheme } from './cores/StormTheme';
import { CosmicTheme } from './cores/CosmicTheme';

const CORE_THEME_REGISTRY: Record<CoreId, CoreVisualTheme> = {
  [CoreId.FIRE]: new FireTheme(),
  [CoreId.ICE]: new IceTheme(),
  [CoreId.WIND]: new WindTheme(),
  [CoreId.STORM]: new StormTheme(),
  [CoreId.COSMIC]: new CosmicTheme(),
};

/**
 * Get the visual theme for a Core.
 */
export function getCoreTheme(coreId: CoreId): CoreVisualTheme {
  return CORE_THEME_REGISTRY[coreId];
}