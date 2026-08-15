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
// ═══════════════════════════════════════════════════════════════════════════

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

// ── Reward Object ─────────────────────────────────────────────────────────

export interface Reward {
  type: RewardType;
  id?: string;
  amount?: number;
  displayName: string;
  description: string;
  isNew: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN API
// ═══════════════════════════════════════════════════════════════════════════

export class RewardGenerator {

  // ── Room-type reward bundles ──────────────────────────────────────────

  static generateNormalRewards(prog: PlayerProgression, layerIndex: number): Reward[] {
    const rewards: Reward[] = [];
    rewards.push(RewardGenerator.goldReward(GOLD_REWARDS.normal.min, GOLD_REWARDS.normal.max));

    const comp = RewardGenerator.balancedCoreOrForm(prog);
    if (comp) rewards.push(comp);

    return rewards;
  }

  static generateEliteRewards(prog: PlayerProgression, layerIndex: number): Reward[] {
    const rewards: Reward[] = [];
    rewards.push(RewardGenerator.goldReward(GOLD_REWARDS.elite.min, GOLD_REWARDS.elite.max));

    const comp = RewardGenerator.balancedPrefixOrSuffix(prog);
    if (comp) rewards.push(comp);

    return rewards;
  }

  static generateSinBossRewards(prog: PlayerProgression): Reward[] {
    const rewards: Reward[] = [];
    rewards.push(RewardGenerator.goldReward(GOLD_REWARDS.sinBoss.min, GOLD_REWARDS.sinBoss.max));
    // Sin Relic is awarded separately by SinGenerator in RewardScene
    return rewards;
  }

  // ── Vault ─────────────────────────────────────────────────────────────

  static generateVaultRewards(category: VaultCategory, prog: PlayerProgression): Reward[] {
    switch (category) {
      case VaultCategory.FOUNDATION: {
        const comp = RewardGenerator.balancedCoreOrForm(prog);
        return comp ? [comp] : [];
      }
      case VaultCategory.ARSENAL: {
        const comp = RewardGenerator.balancedPrefixOrSuffix(prog);
        return comp ? [comp] : [];
      }
      case VaultCategory.FORTUNE: {
        return [RewardGenerator.goldReward(
          VAULT_REWARDS[VaultCategory.FORTUNE].goldMin,
          VAULT_REWARDS[VaultCategory.FORTUNE].goldMax,
        )];
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

  static generateSacrificeReward(tier: 'common' | 'rare' | 'epic', prog: PlayerProgression): Reward | null {
    switch (tier) {
      case 'common':
        return RewardGenerator.balancedCoreOrForm(prog);
      case 'rare':
        return RewardGenerator.balancedPrefixOrSuffix(prog);
      case 'epic':
        return {
          type: RewardType.SIN_RELIC,
          displayName: 'Sin Relic',
          description: 'A powerful active ability born of sacrifice.',
          isNew: true,
        };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  BALANCED SELECTION ALGORITHMS
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Select a Core OR Form using the balanced probability system.
   *
   * Algorithm:
   * 1. Get unowned cores and forms
   * 2. If both empty → null
   * 3. If only one has items → 100% that category
   * 4. Otherwise, compare owned counts and apply balance ratios
   * 5. Roll, pick category, then pick random unowned from that category
   */
  static balancedCoreOrForm(prog: PlayerProgression): Reward | null {
    const unownedCores = prog.getUnownedCores();
    const unownedForms = prog.getUnownedForms();

    // Edge: nothing available
    if (unownedCores.length === 0 && unownedForms.length === 0) return null;

    // Edge: only one category has unowned items
    if (unownedCores.length === 0) return RewardGenerator.randomFormReward(unownedForms);
    if (unownedForms.length === 0) return RewardGenerator.randomCoreReward(unownedCores);

    // Balanced probability
    const coreCount = prog.getCoreCount();
    const formCount = prog.getFormCount();
    const diff = Math.abs(coreCount - formCount);
    const moreProbability = getBalancedProbability(diff);

    // Determine which category has MORE
    let coreProbability: number;
    if (coreCount > formCount) {
      coreProbability = moreProbability;  // Core has more → lower probability
    } else if (formCount > coreCount) {
      coreProbability = 1 - moreProbability;  // Form has more → Core gets higher probability
    } else {
      coreProbability = 0.5;  // Equal
    }

    // Roll
    if (Math.random() < coreProbability) {
      return RewardGenerator.randomCoreReward(unownedCores);
    } else {
      return RewardGenerator.randomFormReward(unownedForms);
    }
  }

  /**
   * Select a Prefix OR Suffix using the balanced probability system.
   * Same algorithm as Core/Form but for the modifier categories.
   */
  static balancedPrefixOrSuffix(prog: PlayerProgression): Reward | null {
    const unownedPrefixes = prog.getUnownedPrefixes();
    const unownedSuffixes = prog.getUnownedSuffixes();

    if (unownedPrefixes.length === 0 && unownedSuffixes.length === 0) return null;
    if (unownedPrefixes.length === 0) return RewardGenerator.randomSuffixReward(unownedSuffixes);
    if (unownedSuffixes.length === 0) return RewardGenerator.randomPrefixReward(unownedPrefixes);

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
      return RewardGenerator.randomPrefixReward(unownedPrefixes);
    } else {
      return RewardGenerator.randomSuffixReward(unownedSuffixes);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INDIVIDUAL REWARD CONSTRUCTORS
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