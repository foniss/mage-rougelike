// src/systems/dungeon/RewardGenerator.ts
//
// Determines rewards for completed rooms.
// SEPARATE from room generation.

import {
  RoomType, RewardType, GOLD_REWARDS, SACRIFICE_TIER_WEIGHTS,
  VaultCategory, VAULT_REWARDS,
} from '../../config/dungeonConfig';
import {
  CoreId, FormId, PrefixId, SuffixId,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
} from '../../config/spellComponents';
import { PlayerProgression } from './PlayerProgression';

export interface Reward {
  type: RewardType;
  id?: string;        // Component ID if applicable
  amount?: number;     // Gold amount if applicable
  displayName: string;
  description: string;
}

export class RewardGenerator {

  static generateNormalRewards(progression: PlayerProgression, layerIndex: number): Reward[] {
    const rewards: Reward[] = [];

    // Gold
    const gold = RewardGenerator.randomGold(GOLD_REWARDS.normal.min, GOLD_REWARDS.normal.max);
    rewards.push({ type: RewardType.GOLD, amount: gold, displayName: `${gold} Gold`, description: 'Currency' });

    // Core OR Form (player picks)
    const componentReward = RewardGenerator.randomCoreOrForm(progression);
    if (componentReward) rewards.push(componentReward);

    return rewards;
  }

  static generateEliteRewards(progression: PlayerProgression, layerIndex: number): Reward[] {
    const rewards: Reward[] = [];

    const gold = RewardGenerator.randomGold(GOLD_REWARDS.elite.min, GOLD_REWARDS.elite.max);
    rewards.push({ type: RewardType.GOLD, amount: gold, displayName: `${gold} Gold`, description: 'Currency' });

    // Prefix OR Suffix
    const modReward = RewardGenerator.randomPrefixOrSuffix(progression);
    if (modReward) rewards.push(modReward);

    return rewards;
  }

  static generateSinBossRewards(progression: PlayerProgression): Reward[] {
    const rewards: Reward[] = [];

    const gold = RewardGenerator.randomGold(GOLD_REWARDS.sinBoss.min, GOLD_REWARDS.sinBoss.max);
    rewards.push({ type: RewardType.GOLD, amount: gold, displayName: `${gold} Gold`, description: 'Currency' });

    // Sin Relic is awarded separately via SinGenerator
    return rewards;
  }

  static generateVaultRewards(category: VaultCategory, progression: PlayerProgression): Reward[] {
    switch (category) {
      case VaultCategory.FOUNDATION:
        return [RewardGenerator.randomCoreOrForm(progression)].filter(Boolean) as Reward[];
      case VaultCategory.ARSENAL:
        return [RewardGenerator.randomPrefixOrSuffix(progression)].filter(Boolean) as Reward[];
      case VaultCategory.FORTUNE: {
        const gold = RewardGenerator.randomGold(VAULT_REWARDS[VaultCategory.FORTUNE].goldMin, VAULT_REWARDS[VaultCategory.FORTUNE].goldMax);
        return [{ type: RewardType.GOLD, amount: gold, displayName: `${gold} Gold`, description: 'Vault fortune' }];
      }
    }
  }

  static rollSacrificeTier(): 'common' | 'rare' | 'epic' {
    const total = SACRIFICE_TIER_WEIGHTS.common + SACRIFICE_TIER_WEIGHTS.rare + SACRIFICE_TIER_WEIGHTS.epic;
    const roll = Math.random() * total;
    if (roll < SACRIFICE_TIER_WEIGHTS.common) return 'common';
    if (roll < SACRIFICE_TIER_WEIGHTS.common + SACRIFICE_TIER_WEIGHTS.rare) return 'rare';
    return 'epic';
  }

  static generateSacrificeReward(tier: 'common' | 'rare' | 'epic', progression: PlayerProgression): Reward | null {
    switch (tier) {
      case 'common': return RewardGenerator.randomCoreOrForm(progression);
      case 'rare': return RewardGenerator.randomPrefixOrSuffix(progression);
      case 'epic': return { type: RewardType.SIN_RELIC, displayName: 'Sin Relic', description: 'A powerful active ability.' };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  private static randomGold(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static randomCoreOrForm(progression: PlayerProgression): Reward | null {
    const unownedCores = getAllCoreIds().filter(id => !progression.hasCore(id));
    const unownedForms = getAllFormIds().filter(id => !progression.hasForm(id));
    const pool: Reward[] = [];

    for (const id of unownedCores) {
      pool.push({ type: RewardType.CORE, id, displayName: `Core: ${id}`, description: 'New elemental core' });
    }
    for (const id of unownedForms) {
      pool.push({ type: RewardType.FORM, id, displayName: `Form: ${id}`, description: 'New spell form' });
    }

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private static randomPrefixOrSuffix(progression: PlayerProgression): Reward | null {
    const unownedPrefixes = getAllPrefixIds().filter(id => !progression.hasPrefix(id));
    const unownedSuffixes = getAllSuffixIds().filter(id => !progression.hasSuffix(id));
    const pool: Reward[] = [];

    for (const id of unownedPrefixes) {
      pool.push({ type: RewardType.PREFIX, id, displayName: `Prefix: ${id}`, description: 'New spell modifier' });
    }
    for (const id of unownedSuffixes) {
      pool.push({ type: RewardType.SUFFIX, id, displayName: `Suffix: ${id}`, description: 'New spell suffix' });
    }

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}