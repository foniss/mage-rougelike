// src/config/balance.ts
export interface BalanceData {
  player: PlayerBalance;
  enemy: EnemyBalance;
  cores: Record<string, CoreBalance>;
  forms: Record<string, FormBalance>;
  prefixes: Record<string, PrefixBalance>;
  suffixes: Record<string, SuffixBalance>;
  combat: CombatBalance;
}

export interface PlayerBalance {
  maxHp: number; maxMana: number; speed: number; radius: number;
  manaRegenPerSecond: number; manaRegenTickMs: number;
  basicAttack: { damage: number; manaCost: number; cooldownMs: number; projectileSpeed: number; projectileRadius: number; projectileLifetimeMs: number; };
}

export interface EnemyBalance {
  default: { maxHp: number; speed: number; contactDamage: number; contactCooldownMs: number; radius: number; };
  tanky: { maxHp: number; speed: number; contactDamage: number; };
  spawnCount: number;
}

export interface CoreBalance {
  manaCost: number;
  baseDamage: number;
  /** Hits needed to activate the Core's status effect. */
  buildupThreshold: number;
  /** Seconds before buildup decays by 1 if not refreshed. */
  buildupDecaySec: number;
  status: Record<string, number>;
}

export interface FormBalance { manaCost: number; cooldownMs: number; damageMultiplier: number; values: Record<string, number>; }
export interface PrefixBalance { manaCost: number; damageMultiplier: number; cooldownMultiplier: number; values: Record<string, number>; }
export interface SuffixBalance { manaCost: number; damageMultiplier: number; cooldownMultiplier: number; values: Record<string, number>; }
export interface CombatBalance { spellCastGlobalCooldownMs: number; orbAuraDamagePercent: number; beamTickDamagePercent: number; chainDamageDecayPerHop: number; }

export const BALANCE: BalanceData = {
  player: { maxHp: 100, maxMana: 100, speed: 200, radius: 14, manaRegenPerSecond: 8, manaRegenTickMs: 100, basicAttack: { damage: 20, manaCost: 5, cooldownMs: 300, projectileSpeed: 500, projectileRadius: 5, projectileLifetimeMs: 2000 } },
  enemy: { default: { maxHp: 100, speed: 80, contactDamage: 10, contactCooldownMs: 1000, radius: 16 }, tanky: { maxHp: 300, speed: 60, contactDamage: 15 }, spawnCount: 4 },
  cores: {
    FIRE:   { manaCost: 5, baseDamage: 25, buildupThreshold: 4, buildupDecaySec: 5, status: { damagePerSecond: 8, durationSec: 3 } },
    ICE:    { manaCost: 5, baseDamage: 20, buildupThreshold: 4, buildupDecaySec: 5, status: { freezeDurationSec: 2 } },
    WIND:   { manaCost: 5, baseDamage: 18, buildupThreshold: 3, buildupDecaySec: 4, status: { knockbackForce: 350, knockbackDurationSec: 0.4 } },
    STORM:  { manaCost: 6, baseDamage: 22, buildupThreshold: 4, buildupDecaySec: 5, status: { stunDurationSec: 1.0, arcRange: 120, arcDamagePercent: 0.3, maxArcTargets: 2 } },
    COSMIC: { manaCost: 7, baseDamage: 20, buildupThreshold: 4, buildupDecaySec: 6, status: { pullRadius: 120, pullForce: 150, pullDurationSec: 2.0 } },
  },
  forms: {
    BLADE: { manaCost: 5, cooldownMs: 350, damageMultiplier: 1.0, values: { arcAngleDeg: 90, range: 70, swingDurationMs: 200 } },
    BEAM: { manaCost: 8, cooldownMs: 1000, damageMultiplier: 1.0, values: { width: 14, range: 500, castDurationMs: 800, tickIntervalMs: 200 } },
    ORB: { manaCost: 7, cooldownMs: 550, damageMultiplier: 1.0, values: { radius: 12, speed: 180, lifetimeMs: 2500, damageTickIntervalMs: 300, damageRadius: 30 } },
    MINE: { manaCost: 7, cooldownMs: 700, damageMultiplier: 1.2, values: { visualRadius: 10, armDelayMs: 500, triggerRadius: 50, explosionRadius: 80, lifetimeMs: 8000 } },
    NOVA: { manaCost: 9, cooldownMs: 750, damageMultiplier: 0.9, values: { radius: 110, expandDurationMs: 350 } },
  },
  prefixes: {
    HOMING: { manaCost: 5, damageMultiplier: 1.0, cooldownMultiplier: 1.0, values: { turnRate: 2.5, trackingRange: 200 } },
    SPLITTING: { manaCost: 7, damageMultiplier: 0.7, cooldownMultiplier: 1.2, values: { splitCount: 3, splitAtPercent: 0.5, splitAngleSpreadDeg: 30, splitDamagePercent: 0.6 } },
    GREATER: { manaCost: 4, damageMultiplier: 1.3, cooldownMultiplier: 1.2, values: { sizeMultiplier: 1.5, extraDamageFlat: 5 } },
    EXPANDING: { manaCost: 4, damageMultiplier: 1.0, cooldownMultiplier: 1.1, values: { startScale: 0.6, endScale: 2.0, growthRate: 0.8 } },
    RETURNING: { manaCost: 6, damageMultiplier: 0.9, cooldownMultiplier: 1.3, values: { returnSpeed: 250, returnDamagePercent: 0.5 } },
    PIERCING: { manaCost: 3, damageMultiplier: 0.85, cooldownMultiplier: 1.0, values: { maxPierceTargets: 3, damageRetainPercent: 0.7 } },
  },
  suffixes: {
    'OF DEVOURING': { manaCost: 3, damageMultiplier: 1.0, cooldownMultiplier: 1.0, values: { manaRestoreOnKill: 8 } },
    'OF BINDING': { manaCost: 5, damageMultiplier: 1.0, cooldownMultiplier: 1.1, values: { bindDurationSec: 1.5, bindRadius: 30 } },
    'OF REAPING': { manaCost: 6, damageMultiplier: 1.0, cooldownMultiplier: 1.15, values: { seekRange: 180, maxAdditionalTargets: 2, seekDamagePercent: 0.6 } },
    'OF DETONATION': { manaCost: 6, damageMultiplier: 1.0, cooldownMultiplier: 1.2, values: { explosionRadius: 70, explosionDamagePercent: 0.5, canChainDetonate: 0 } },
    'OF ECHOES': { manaCost: 7, damageMultiplier: 1.0, cooldownMultiplier: 1.3, values: { echoDelayMs: 600, echoDamageMultiplier: 0.5, canEchoRecursively: 0 } },
  },
  combat: { spellCastGlobalCooldownMs: 300, orbAuraDamagePercent: 0.2, beamTickDamagePercent: 0.3, chainDamageDecayPerHop: 0.7 },
};
