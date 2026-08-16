// src/systems/dungeon/RewardGenerator.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  REWARD GENERATOR
//
//  Determines rewards for completed rooms.
//  COMPLETELY SEPARATE from room generation.
//
//  KEY DESIGN:
//  - All rewards are unique unlocks (no duplicates)
//  - Core/Form probability is balanced by owned count difference
//  - Prefix/Suffix probability is balanced by owned count difference
//  - Gold amounts read from dungeonConfig
//  - All probabilities are configurable via COMPONENT_BALANCE_RATIOS
//
//  BALANCING ALGORITHM:
//  1. Count how many Cores vs Forms the player owns
//  2. Calculate the absolute difference
//  3. Look up probability from COMPONENT_BALANCE_RATIOS
//  4. The category with MORE items gets the lower probability
//  5. The category with FEWER items gets (1 - that probability)
//  6. If one category has no unowned items left, 100% goes to the other
//  7. If both are exhausted, return null
//
//  REWARD CHOICES (NEW):
//  - Normal: 2 choices from selected category (Core OR Form)
//  - Elite: 3 choices from selected category (Prefix OR Suffix)
//  - Never mix categories in a single reward
//  - Filter out already-owned components
//  - Gracefully handle insufficient unowned components
// ════════════════════════════════════════════════════════════════════════════

import {
  RoomType, RewardType,
  GOLD_REWARDS,
  SACRIFICE_TIER_WEIGHTS,
  VaultCategory, VAULT_REWARDS,
  MAX_REWARD_REROLL,
  getBalancedProbability,
} from '../../config/dungeonConfig';
import {
  CoreId, FormId, PrefixId, SuffixId,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
} from '../../config/spellComponents';
import { PlayerProgression } from './PlayerProgression';

// ── Reward Choice Object ────────────────────────────────────────────────────

/**
 * A single reward option presented to the player.
 * Contains all info needed for display and application.
 */
export interface RewardChoice {
  type: RewardType;
  id: CoreId | FormId | PrefixId | SuffixId;
  displayName: string;
  description: string;
  categoryLabel: string;  // 'CORE', 'FORM', 'PREFIX', 'SUFFIX'
  categoryColor: number;  // for UI theming
  visualConfig?: any;     // optional visual config for card rendering
}

// ── Reward Bundle ───────────────────────────────────────────────────────────

/**
 * Complete reward bundle for a room.
 * Contains gold (auto-granted) and a set of choices (player picks one).
 */
export interface RewardBundle {
  gold: Reward;           // auto-granted gold reward
  choices: RewardChoice[]; // player must pick exactly one
  category: 'core' | 'form' | 'prefix' | 'suffix' | 'none'; // which category was selected
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN API
// ═══════════════════════════════════════════════════════════════════════════

export class RewardGenerator {

  // ── Room-type reward bundles ──────────────────────────────────────────

  /**
   * Normal combat: 2 choices from Core OR Form (balanced), plus gold.
   */
  static generateNormalRewards(prog: PlayerProgression, layerIndex: number): RewardBundle {
    const gold = RewardGenerator.goldReward(GOLD_REWARDS.normal.min, GOLD_REWARDS.normal.max);
    const { choices, category } = RewardGenerator.generateCoreOrFormChoices(prog, 2);
    return { gold, choices, category };
  }

  /**
   * Elite combat: 3 choices from Prefix OR Suffix (balanced), plus gold.
   */
  static generateEliteRewards(prog: PlayerProgression, layerIndex: number): RewardBundle {
    const gold = RewardGenerator.goldReward(GOLD_REWARDS.elite.min, GOLD_REWARDS.elite.max);
    const { choices, category } = RewardGenerator.generatePrefixOrSuffixChoices(prog, 3);
    return { gold, choices, category };
  }

  /**
   * Sin Boss: gold only (Sin Relic handled separately in RewardScene).
   */
  static generateSinBossRewards(prog: PlayerProgression): RewardBundle {
    const gold = RewardGenerator.goldReward(GOLD_REWARDS.sinBoss.min, GOLD_REWARDS.sinBoss.max);
    return { gold, choices: [], category: 'none' };
  }

  /**
   * Devil: gold only (no component rewards).
   */
  static generateDevilRewards(prog: PlayerProgression): RewardBundle {
    const gold = RewardGenerator.goldReward(GOLD_REWARDS.devil.min, GOLD_REWARDS.devil.max);
    return { gold, choices: [], category: 'none' };
  }

  // ── Vault ─────────────────────────────────────────────────────────────

  static generateVaultRewards(category: VaultCategory, prog: PlayerProgression): RewardBundle {
    switch (category) {
      case VaultCategory.FOUNDATION: {
        const { choices, category: cat } = RewardGenerator.generateCoreOrFormChoices(prog, 2);
        const gold = RewardGenerator.goldReward(0, 0); // no gold for vault foundation
        return { gold, choices, category: cat };
      }
      case VaultCategory.ARSENAL: {
        const { choices, category: cat } = RewardGenerator.generatePrefixOrSuffixChoices(prog, 3);
        const gold = RewardGenerator.goldReward(0, 0);
        return { gold, choices, category: cat };
      }
      case VaultCategory.FORTUNE: {
        const gold = RewardGenerator.goldReward(
          VAULT_REWARDS[VaultCategory.FORTUNE].goldMin,
          VAULT_REWARDS[VaultCategory.FORTUNE].goldMax,
        );
        return { gold, choices: [], category: 'none' };
      }
    }
  }

  // ── Sacrifice ─────────────────────────────────────────────────────────

  static rollSacrificeTier(): 'common' | 'rare' | 'epic' {
    const total = SACRIFICE_TIER_WEIGHTS.common + SACRIFICE_TIER_WEIGHTS.rare + SACRIFICE_TIER_WEIGHTS.epic;
    const roll = Math.random() * total;
    if (roll < SACRIFICE_TIER_WEIGHTS.common) return 'common';
    if (roll < SACRIFICE_TIER_WEIGHTS.common + SACRIFICE_TIER_WEIGHTS.rare) return 'rare';
    return 'epic';
  }

  static generateSacrificeReward(tier: 'common' | 'rare' | 'epic', prog: PlayerProgression): RewardBundle | null {
    switch (tier) {
      case 'common': {
        const { choices, category } = RewardGenerator.generateCoreOrFormChoices(prog, 2);
        const gold = RewardGenerator.goldReward(0, 0);
        return { gold, choices, category };
      }
      case 'rare': {
        const { choices, category } = RewardGenerator.generatePrefixOrSuffixChoices(prog, 3);
        const gold = RewardGenerator.goldReward(0, 0);
        return { gold, choices, category };
      }
      case 'epic': {
        const gold = RewardGenerator.goldReward(0, 0);
        return {
          gold,
          choices: [{
            type: RewardType.SIN_RELIC,
            id: 'SIN_RELIC' as any,
            displayName: 'Sin Relic',
            description: 'A powerful active ability born of sacrifice.',
            categoryLabel: 'SIN RELIC',
            categoryColor: 0xff4466,
          }],
          category: 'none',
        };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CHOICE GENERATION (NEW)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Generate N choices from Core OR Form using balanced probability.
   * Returns the choices and which category was selected.
   */
  static generateCoreOrFormChoices(prog: PlayerProgression, count: number): { choices: RewardChoice[]; category: 'core' | 'form' } {
    const unownedCores = prog.getUnownedCores();
    const unownedForms = prog.getUnownedForms();

    // Edge: nothing available
    if (unownedCores.length === 0 && unownedForms.length === 0) {
      return { choices: [], category: 'core' };
    }

    // Edge: only one category has unowned items
    if (unownedCores.length === 0) {
      return { choices: RewardGenerator.buildFormChoices(unownedForms, count), category: 'form' };
    }
    if (unownedForms.length === 0) {
      return { choices: RewardGenerator.buildCoreChoices(unownedCores, count), category: 'core' };
    }

    // Balanced probability (PRESERVES EXISTING LOGIC)
    const coreCount = prog.getCoreCount();
    const formCount = prog.getFormCount();
    const diff = Math.abs(coreCount - formCount);
    const moreProbability = getBalancedProbability(diff);

    let coreProbability: number;
    if (coreCount > formCount) {
      coreProbability = moreProbability;  // Core has more → lower probability
    } else if (formCount > coreCount) {
      coreProbability = 1 - moreProbability;  // Form has more → Core gets higher probability
    } else {
      coreProbability = 0.5;  // Equal
    }

    // Roll category
    if (Math.random() < coreProbability) {
      return { choices: RewardGenerator.buildCoreChoices(unownedCores, count), category: 'core' };
    } else {
      return { choices: RewardGenerator.buildFormChoices(unownedForms, count), category: 'form' };
    }
  }

  /**
   * Generate N choices from Prefix OR Suffix using balanced probability.
   * Returns the choices and which category was selected.
   */
  static generatePrefixOrSuffixChoices(prog: PlayerProgression, count: number): { choices: RewardChoice[]; category: 'prefix' | 'suffix' } {
    const unownedPrefixes = prog.getUnownedPrefixes();
    const unownedSuffixes = prog.getUnownedSuffixes();

    if (unownedPrefixes.length === 0 && unownedSuffixes.length === 0) {
      return { choices: [], category: 'prefix' };
    }
    if (unownedPrefixes.length === 0) {
      return { choices: RewardGenerator.buildSuffixChoices(unownedSuffixes, count), category: 'suffix' };
    }
    if (unownedSuffixes.length === 0) {
      return { choices: RewardGenerator.buildPrefixChoices(unownedPrefixes, count), category: 'prefix' };
    }

    const prefixCount = prog.getPrefixCount();
    const suffixCount = prog.getSuffixCount();
    const diff = Math.abs(prefixCount - suffixCount);
    const moreProbability = getBalancedProbability(diff);

    let prefixProbability: number;
    if (prefixCount > suffixCount) {
      prefixProbability = moreProbability;
    } else if (suffixCount > prefixCount) {
      prefixProbability = 1 - moreProbability;
    } else {
      prefixProbability = 0.5;
    }

    if (Math.random() < prefixProbability) {
      return { choices: RewardGenerator.buildPrefixChoices(unownedPrefixes, count), category: 'prefix' };
    } else {
      return { choices: RewardGenerator.buildSuffixChoices(unownedSuffixes, count), category: 'suffix' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CHOICE BUILDERS
  // ═══════════════════════════════════════════════════════════════════════

  private static buildCoreChoices(unowned: CoreId[], count: number): RewardChoice[] {
    const shuffled = [...unowned].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    return selected.map(id => {
      const reg = CORE_REGISTRY[id];
      return {
        type: RewardType.CORE,
        id,
        displayName: reg?.displayName || id,
        description: reg?.description || 'A new elemental core.',
        categoryLabel: 'CORE',
        categoryColor: 0xff8844,
        visualConfig: reg?.visual,
      };
    });
  }

  private static buildFormChoices(unowned: FormId[], count: number): RewardChoice[] {
    const shuffled = [...unowned].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    return selected.map(id => {
      const reg = FORM_REGISTRY[id];
      return {
        type: RewardType.FORM,
        id,
        displayName: reg?.displayName || id,
        description: reg?.description || 'A new spell form.',
        categoryLabel: 'FORM',
        categoryColor: 0x8888ff,
        visualConfig: reg?.formVisual,
      };
    });
  }

  private static buildPrefixChoices(unowned: PrefixId[], count: number): RewardChoice[] {
    const shuffled = [...unowned].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    return selected.map(id => {
      const reg = PREFIX_REGISTRY[id];
      return {
        type: RewardType.PREFIX,
        id,
        displayName: reg?.displayName || id,
        description: reg?.description || 'A new spell modifier.',
        categoryLabel: 'PREFIX',
        categoryColor: 0x88cc88,
        visualConfig: reg?.visual,
      };
    });
  }

  private static buildSuffixChoices(unowned: SuffixId[], count: number): RewardChoice[] {
    const shuffled = [...unowned].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    return selected.map(id => {
      const reg = SUFFIX_REGISTRY[id];
      return {
        type: RewardType.SUFFIX,
        id,
        displayName: reg?.displayName || id,
        description: reg?.description || 'A new spell suffix.',
        categoryLabel: 'SUFFIX',
        categoryColor: 0xccaa66,
        visualConfig: reg?.visual,
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INDIVIDUAL REWARD CONSTRUCTORS (legacy - kept for compatibility)
  // ═══════════════════════════════════════════════════════════════════════

  static goldReward(min: number, max: number): Reward {
    const amount = Math.floor(Math.random() * (max - min + 1)) + min;
    return {
      type: RewardType.GOLD,
      amount,
      displayName: `${amount} Gold`,
      description: 'Currency for the shop.',
      isNew: false,
    };
  }

  // Legacy single-reward methods (kept for any existing callers)
  private static randomCoreReward(unowned: CoreId[]): Reward {
    const id = unowned[Math.floor(Math.random() * unowned.length)];
    const reg = CORE_REGISTRY[id];
    return {
      type: RewardType.CORE,
      id,
      displayName: reg?.displayName || id,
      description: reg?.description || 'A new elemental core.',
      isNew: true,
    };
  }

  private static randomFormReward(unowned: FormId[]): Reward {
    const id = unowned[Math.floor(Math.random() * unowned.length)];
    const reg = FORM_REGISTRY[id];
    return {
      type: RewardType.FORM,
      id,
      displayName: reg?.displayName || id,
      description: reg?.description || 'A new spell form.',
      isNew: true,
    };
  }

  private static randomPrefixReward(unowned: PrefixId[]): Reward {
    const id = unowned[Math.floor(Math.random() * unowned.length)];
    const reg = PREFIX_REGISTRY[id];
    return {
      type: RewardType.PREFIX,
      id,
      displayName: reg?.displayName || id,
      description: reg?.description || 'A new spell modifier.',
      isNew: true,
    };
  }

  private static randomSuffixReward(unowned: SuffixId[]): Reward {
    const id = unowned[Math.floor(Math.random() * unowned.length)];
    const reg = SUFFIX_REGISTRY[id];
    return {
      type: RewardType.SUFFIX,
      id,
      displayName: reg?.displayName || id,
      description: reg?.description || 'A new spell suffix.',
      isNew: true,
    };
  }
}

// ── Legacy Reward interface (for backward compatibility) ────────────────────

export interface Reward {
  type: RewardType;
  id?: string;
  amount?: number;
  displayName: string;
  description: string;
  isNew: boolean;
}