// src/config/balance.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  CENTRAL BALANCE CONFIGURATION
//
//  Every gameplay-sensitive number lives here.
//  To rebalance the game, edit ONLY this file.
//
//  Structure:
//    BALANCE.player.*       — Player stats
//    BALANCE.enemy.*        — Enemy stats
//    BALANCE.cores.*        — Core element data
//    BALANCE.forms.*        — Form delivery data
//    BALANCE.prefixes.*     — Prefix modifier data
//    BALANCE.suffixes.*     — Suffix modifier data
//    BALANCE.combat.*       — General combat values
// ═══════════════════════════════════════════════════════════════════════════

export interface BalanceData {
  player: PlayerBalance;
  enemy: EnemyBalance;
  cores: Record<string, CoreBalance>;
  forms: Record<string, FormBalance>;
  prefixes: Record<string, PrefixBalance>;
  suffixes: Record<string, SuffixBalance>;
  combat: CombatBalance;
}

// ── Player ────────────────────────────────────────────────────────────────

export interface PlayerBalance {
  maxHp: number;
  maxMana: number;
  speed: number;
  radius: number;
  manaRegenPerSecond: number;
  manaRegenTickMs: number;
  basicAttack: {
    damage: number;
    manaCost: number;
    cooldownMs: number;
    projectileSpeed: number;
    projectileRadius: number;
    projectileLifetimeMs: number;
  };
}

// ── Enemy ─────────────────────────────────────────────────────────────────

export interface EnemyBalance {
  default: {
    maxHp: number;
    speed: number;
    contactDamage: number;
    contactCooldownMs: number;
    radius: number;
  };
  tanky: {
    maxHp: number;
    speed: number;
    contactDamage: number;
  };
  spawnCount: number;
}

// ── Core Balance ──────────────────────────────────────────────────────────

export interface CoreBalance {
  manaCost: number;
  baseDamage: number;
  status: Record<string, number>;
}

// ── Form Balance ──────────────────────────────────────────────────────────

export interface FormBalance {
  manaCost: number;
  cooldownMs: number;
  damageMultiplier: number;
  values: Record<string, number>;
}

// ── Prefix Balance ────────────────────────────────────────────────────────

export interface PrefixBalance {
  manaCost: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  values: Record<string, number>;
}

// ── Suffix Balance ────────────────────────────────────────────────────────

export interface SuffixBalance {
  manaCost: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  values: Record<string, number>;
}

// ── Combat ────────────────────────────────────────────────────────────────

export interface CombatBalance {
  spellCastGlobalCooldownMs: number;
  orbAuraDamagePercent: number;
  beamTickDamagePercent: number;
  chainDamageDecayPerHop: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DEFAULT BALANCE DATA
// ═══════════════════════════════════════════════════════════════════════════

export const BALANCE: BalanceData = {

  // ── PLAYER ──────────────────────────────────────────────────────────────

  player: {
    maxHp: 100,
    maxMana: 100,
    speed: 200,
    radius: 14,
    manaRegenPerSecond: 8,
    manaRegenTickMs: 100,
    basicAttack: {
      damage: 20,
      manaCost: 5,
      cooldownMs: 300,
      projectileSpeed: 500,
      projectileRadius: 5,
      projectileLifetimeMs: 2000,
    },
  },

  // ── ENEMY ───────────────────────────────────────────────────────────────

  enemy: {
    default: {
      maxHp: 100,
      speed: 80,
      contactDamage: 10,
      contactCooldownMs: 1000,
      radius: 16,
    },
    tanky: {
      maxHp: 300,
      speed: 60,
      contactDamage: 15,
    },
    spawnCount: 4,
  },

  // ── CORES ───────────────────────────────────────────────────────────────

  cores: {
    FIRE: {
      manaCost: 5,
      baseDamage: 25,
      status: {
        damagePerSecond: 5,
        duration: 3,
        tickIntervalMs: 500,
      },
    },
    ICE: {
      manaCost: 5,
      baseDamage: 20,
      status: {
        slowPerStack: 0.1,      // 10% per stack
        maxStacks: 4,
        stackDurationSec: 4,
        freezeDurationSec: 2,
        freezeThreshold: 4,     // stacks needed to freeze
      },
    },
    WIND: {
      manaCost: 5,
      baseDamage: 18,
      status: {
        knockbackForce: 300,
        knockbackDurationSec: 0.3,
        deflectProjectiles: 1,  // 1 = true, 0 = false
        deflectRadius: 80,
      },
    },
    STORM: {
      manaCost: 6,
      baseDamage: 22,
      status: {
        stunChance: 0.25,       // 25%
        stunDurationSec: 0.5,
        arcRange: 120,
        arcDamagePercent: 0.3,  // 30% of spell damage
        maxArcTargets: 2,
      },
    },
    COSMIC: {
      manaCost: 7,
      baseDamage: 20,
      status: {
        pullRadius: 120,
        pullForce: 150,
        pullDurationSec: 1.5,
      },
    },
  },

  // ── FORMS ───────────────────────────────────────────────────────────────

  forms: {
    BLADE: {
      manaCost: 5,
      cooldownMs: 350,
      damageMultiplier: 1.0,
      values: {
        arcAngleDeg: 90,
        range: 70,
        swingDurationMs: 200,
      },
    },
    BEAM: {
      manaCost: 8,
      cooldownMs: 1000,
      damageMultiplier: 1.0,
      values: {
        width: 14,
        range: 500,
        castDurationMs: 800,
        tickIntervalMs: 200,
      },
    },
    ORB: {
      manaCost: 7,
      cooldownMs: 550,
      damageMultiplier: 1.0,
      values: {
        radius: 12,
        speed: 180,
        lifetimeMs: 2500,
        damageTickIntervalMs: 300,
        damageRadius: 30,
      },
    },
    MINE: {
      manaCost: 7,
      cooldownMs: 700,
      damageMultiplier: 1.2,
      values: {
        visualRadius: 10,
        armDelayMs: 500,
        triggerRadius: 50,
        explosionRadius: 80,
        lifetimeMs: 8000,
      },
    },
    NOVA: {
      manaCost: 9,
      cooldownMs: 750,
      damageMultiplier: 0.9,
      values: {
        radius: 110,
        expandDurationMs: 350,
      },
    },
  },

  // ── PREFIXES ────────────────────────────────────────────────────────────

  prefixes: {
    HOMING: {
      manaCost: 5,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.0,
      values: {
        turnRate: 2.5,
        trackingRange: 200,
      },
    },
    SPLITTING: {
      manaCost: 7,
      damageMultiplier: 0.7,
      cooldownMultiplier: 1.2,
      values: {
        splitCount: 3,
        splitAtPercent: 0.5,      // split at 50% of lifetime
        splitAngleSpreadDeg: 30,
        splitDamagePercent: 0.6,  // each split does 60% damage
      },
    },
    GREATER: {
      manaCost: 4,
      damageMultiplier: 1.3,
      cooldownMultiplier: 1.2,
      values: {
        sizeMultiplier: 1.5,
        extraDamageFlat: 5,
      },
    },
    EXPANDING: {
      manaCost: 4,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.1,
      values: {
        startScale: 0.6,
        endScale: 2.0,
        growthRate: 0.8,
      },
    },
    RETURNING: {
      manaCost: 6,
      damageMultiplier: 0.9,
      cooldownMultiplier: 1.3,
      values: {
        returnSpeed: 250,
        returnDamagePercent: 0.5,
      },
    },
    PIERCING: {
      manaCost: 3,
      damageMultiplier: 0.85,
      cooldownMultiplier: 1.0,
      values: {
        maxPierceTargets: 3,
        damageRetainPercent: 0.7,
      },
    },
  },

  // ── SUFFIXES ────────────────────────────────────────────────────────────

  suffixes: {
    'OF DEVOURING': {
      manaCost: 3,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.0,
      values: {
        manaRestoreOnKill: 8,
      },
    },
    'OF BINDING': {
      manaCost: 5,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.1,
      values: {
        bindDurationSec: 1.5,
        bindRadius: 30,
      },
    },
    'OF REAPING': {
      manaCost: 6,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.15,
      values: {
        seekRange: 180,
        maxAdditionalTargets: 2,
        seekDamagePercent: 0.6,
      },
    },
    'OF DETONATION': {
      manaCost: 6,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.2,
      values: {
        explosionRadius: 70,
        explosionDamagePercent: 0.5,
        canChainDetonate: 0,      // 0 = false
      },
    },
    'OF ECHOES': {
      manaCost: 7,
      damageMultiplier: 1.0,
      cooldownMultiplier: 1.3,
      values: {
        echoDelayMs: 600,
        echoDamageMultiplier: 0.5,
        canEchoRecursively: 0,    // 0 = false
      },
    },
  },

  // ── COMBAT ──────────────────────────────────────────────────────────────

  combat: {
    spellCastGlobalCooldownMs: 300,
    orbAuraDamagePercent: 0.2,
    beamTickDamagePercent: 0.3,
    chainDamageDecayPerHop: 0.7,
  },
};