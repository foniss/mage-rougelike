// src/systems/BuildupSystem.ts
//
// Unified per-enemy, per-core buildup tracking.
// Each Core hit increments that Core's buildup on the target enemy.
// When buildup reaches threshold → status activates → buildup resets.
// Buildup decays over time if not refreshed.

import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { CoreId } from '../config/spellComponents';
import { BalanceManager } from './BalanceManager';
import { CombatFX } from '../visuals/CombatFX';
import { getCoreTheme } from '../visuals/CoreVisualTheme';
import { UI_FONT } from '../config/uiStyles';

/** Per-core buildup state on a single enemy. */
interface CoreBuildup {
  current: number;
  threshold: number;
  decayTimerMs: number;
  lastHitTime: number;
}

/** All buildup state for one enemy. */
interface EnemyBuildupState {
  cores: Map<CoreId, CoreBuildup>;
}

/** Callback when buildup completes — the caller applies the actual status. */
export type BuildupActivationCallback = (
  scene: Phaser.Scene,
  enemy: Enemy,
  coreId: CoreId,
  sourceX: number,
  sourceY: number,
  enemies: Enemy[],
  castId: number,
) => void;

// Core display config
const CORE_DISPLAY: Record<string, { icon: string; label: string; color: number }> = {
  FIRE:   { icon: '🔥', label: 'BURN',    color: 0xff6600 },
  ICE:    { icon: '❄',  label: 'FREEZE',  color: 0x44ccff },
  WIND:   { icon: '💨', label: 'WIND',    color: 0x88ffbb },
  STORM:  { icon: '⚡', label: 'SHOCK',   color: 0xaa88ff },
  COSMIC: { icon: '🌀', label: 'GRAVITY', color: 0xdd66ff },
};

export class BuildupSystem {
  private scene: Phaser.Scene;
  private state: Map<Enemy, EnemyBuildupState> = new Map();
  private onActivation: BuildupActivationCallback;

  constructor(scene: Phaser.Scene, onActivation: BuildupActivationCallback) {
    this.scene = scene;
    this.onActivation = onActivation;
  }

  /**
   * Increment buildup for a Core on an enemy.
   * Returns true if this hit triggered activation.
   */
  addBuildup(
    enemy: Enemy,
    coreId: CoreId,
    sourceX: number,
    sourceY: number,
    enemies: Enemy[],
    castId: number,
  ): boolean {
    if (!enemy.alive) return false;

    const bal = BalanceManager.core(coreId);
    const threshold = bal.buildupThreshold ?? 4;

    let es = this.state.get(enemy);
    if (!es) {
      es = { cores: new Map() };
      this.state.set(enemy, es);
    }

    let cb = es.cores.get(coreId);
    if (!cb) {
      cb = { current: 0, threshold, decayTimerMs: (bal.buildupDecaySec ?? 5) * 1000, lastHitTime: this.scene.time.now };
      es.cores.set(coreId, cb);
    }

    cb.current = Math.min(cb.current + 1, cb.threshold);
    cb.lastHitTime = this.scene.time.now;

    // Show buildup indicator
    this.showBuildupIndicator(enemy, coreId, cb.current, cb.threshold);

    // Check activation
    if (cb.current >= cb.threshold) {
      cb.current = 0;

      // Strong activation VFX
      const display = CORE_DISPLAY[coreId] || { icon: '◈', label: 'STATUS', color: 0xffffff };
      CombatFX.onStatusActivation(this.scene, enemy.sprite.x, enemy.sprite.y, display.label, display.color);

      // Callback to apply the actual status effect
      this.onActivation(this.scene, enemy, coreId, sourceX, sourceY, enemies, castId);
      return true;
    }

    return false;
  }

  /** Get current buildup for debug display. */
  getBuildup(enemy: Enemy, coreId: CoreId): { current: number; threshold: number } {
    const es = this.state.get(enemy);
    if (!es) return { current: 0, threshold: BalanceManager.core(coreId).buildupThreshold ?? 4 };
    const cb = es.cores.get(coreId);
    if (!cb) return { current: 0, threshold: BalanceManager.core(coreId).buildupThreshold ?? 4 };
    return { current: cb.current, threshold: cb.threshold };
  }

  /** Get all buildups for an enemy (for debug). */
  getAllBuildups(enemy: Enemy): Map<CoreId, { current: number; threshold: number }> {
    const result = new Map<CoreId, { current: number; threshold: number }>();
    const es = this.state.get(enemy);
    if (!es) return result;
    for (const [coreId, cb] of es.cores) {
      if (cb.current > 0) {
        result.set(coreId, { current: cb.current, threshold: cb.threshold });
      }
    }
    return result;
  }

  /** Decay buildups over time. Call from scene update(). */
  update(): void {
    const now = this.scene.time.now;
    for (const [enemy, es] of this.state) {
      if (!enemy.alive) {
        this.state.delete(enemy);
        continue;
      }
      for (const [coreId, cb] of es.cores) {
        if (cb.current > 0 && now - cb.lastHitTime > cb.decayTimerMs) {
          cb.current = Math.max(0, cb.current - 1);
          cb.lastHitTime = now; // reset decay timer for next stack
        }
      }
    }
  }

  /** Remove all buildup for an enemy (on death). */
  removeEnemy(enemy: Enemy): void {
    this.state.delete(enemy);
  }

  /** Clear all state. */
  clearAll(): void {
    this.state.clear();
  }

  // ── Visual feedback ─────────────────────────────────────────────────────

  private showBuildupIndicator(enemy: Enemy, coreId: CoreId, current: number, threshold: number): void {
    const display = CORE_DISPLAY[coreId] || { icon: '◈', label: 'STATUS', color: 0xffffff };
    const hex = '#' + display.color.toString(16).padStart(6, '0');

    // Small core-colored hit particle
    const theme = getCoreTheme(coreId);
    theme.spawnAmbientParticle(this.scene, enemy.sprite.x, enemy.sprite.y, {
      color: display.color, glowColor: display.color, trailColor: display.color,
    });

    // Floating buildup text
    const txt = this.scene.add.text(
      enemy.sprite.x + 16, enemy.sprite.y - 20,
      `${display.icon} ${current}/${threshold}`,
      { fontFamily: UI_FONT, fontSize: '10px', color: hex, fontStyle: 'bold', stroke: '#000000', strokeThickness: 2 },
    ).setOrigin(0.5).setDepth(55);

    this.scene.tweens.add({
      targets: txt,
      y: txt.y - 14,
      alpha: { from: 1, to: 0 },
      duration: 800,
      delay: 300,
      onComplete: () => txt.destroy(),
    });
  }
}
