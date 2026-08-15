// src/config/dungeonConfig.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  DUNGEON CONFIGURATION
//  All dungeon structure, room weights, and progression numbers.
//  Change values here to rebalance the run without touching game code.
// ═══════════════════════════════════════════════════════════════════════════

// ── Room Types ────────────────────────────────────────────────────────────

export enum RoomType {
  NORMAL = 'NORMAL',
  ELITE = 'ELITE',
  SHRINE = 'SHRINE',
  VAULT = 'VAULT',
  SACRIFICE = 'SACRIFICE',
  SHOP_REST = 'SHOP_REST',
  SIN_BOSS = 'SIN_BOSS',
  DEVIL = 'DEVIL',
}

// ── Layer Structure ───────────────────────────────────────────────────────

export const TOTAL_LAYERS = 4;
export const ROOMS_PER_LAYER = 7;

/** Rooms 2-5 are random choice (0-indexed: indices 1-4) */
export const CHOICE_ROOM_INDICES = [1, 2, 3, 4];

/** Room structure per layer (0-indexed) */
export interface LayerTemplate {
  rooms: RoomSlot[];
}

export interface RoomSlot {
  type: 'fixed' | 'choice';
  fixedType?: RoomType;
}

export function getLayerTemplate(layerIndex: number): LayerTemplate {
  const isFinalLayer = layerIndex === TOTAL_LAYERS - 1;
  return {
    rooms: [
      { type: 'fixed', fixedType: RoomType.NORMAL },       // Room 1
      { type: 'choice' },                                    // Room 2
      { type: 'choice' },                                    // Room 3
      { type: 'choice' },                                    // Room 4
      { type: 'choice' },                                    // Room 5
      { type: 'fixed', fixedType: RoomType.SHOP_REST },     // Room 6
      { type: 'fixed', fixedType: isFinalLayer ? RoomType.DEVIL : RoomType.SIN_BOSS }, // Room 7
    ],
  };
}

// ── Room Weights ──────────────────────────────────────────────────────────

export interface RoomWeights {
  [RoomType.NORMAL]: number;
  [RoomType.ELITE]: number;
  [RoomType.SHRINE]: number;
  [RoomType.VAULT]: number;
  [RoomType.SACRIFICE]: number;
}

export const LAYER_1_WEIGHTS: RoomWeights = {
  [RoomType.NORMAL]: 35,
  [RoomType.ELITE]: 25,
  [RoomType.SHRINE]: 15,
  [RoomType.VAULT]: 25,
  [RoomType.SACRIFICE]: 0, // Not available in Layer 1
};

export const LAYER_2_PLUS_WEIGHTS: RoomWeights = {
  [RoomType.NORMAL]: 25,
  [RoomType.ELITE]: 25,
  [RoomType.SHRINE]: 15,
  [RoomType.VAULT]: 20,
  [RoomType.SACRIFICE]: 15,
};

export function getWeightsForLayer(layerIndex: number): RoomWeights {
  return layerIndex === 0 ? { ...LAYER_1_WEIGHTS } : { ...LAYER_2_PLUS_WEIGHTS };
}

// ── Room Pool ─────────────────────────────────────────────────────────────

export function getRoomPool(layerIndex: number): RoomType[] {
  if (layerIndex === 0) {
    return [RoomType.NORMAL, RoomType.ELITE, RoomType.SHRINE, RoomType.VAULT];
  }
  return [RoomType.NORMAL, RoomType.ELITE, RoomType.SHRINE, RoomType.VAULT, RoomType.SACRIFICE];
}

// ── Constraint Requirements ───────────────────────────────────────────────

export interface LayerConstraints {
  /** At least one Normal must appear across rooms 2-5 */
  requireNormal: boolean;
  /** At least one Elite must appear */
  requireElite: boolean;
  /** At least one Vault must appear */
  requireVault: boolean;
  /** At least one Shrine OR Sacrifice must appear (Layer 2+) */
  requireShrineOrSacrifice: boolean;
}

export function getLayerConstraints(layerIndex: number): LayerConstraints {
  return {
    requireNormal: true,
    requireElite: true,
    requireVault: true,
    requireShrineOrSacrifice: layerIndex >= 1,
  };
}

/** Max regeneration attempts before accepting whatever we have */
export const MAX_GENERATION_ATTEMPTS = 50;

// ── Combat Difficulty ─────────────────────────────────────────────────────

export interface RoomCombatConfig {
  enemyCount: number;
  enemyHpMultiplier: number;
  enemySpeedMultiplier: number;
  enemyDamageMultiplier: number;
}

export function getCombatConfig(roomType: RoomType, layerIndex: number): RoomCombatConfig {
  const layerScale = 1 + layerIndex * 0.25;

  switch (roomType) {
    case RoomType.NORMAL:
      return {
        enemyCount: 3 + layerIndex,
        enemyHpMultiplier: 1.0 * layerScale,
        enemySpeedMultiplier: 1.0,
        enemyDamageMultiplier: 1.0 * layerScale,
      };
    case RoomType.ELITE:
      return {
        enemyCount: 2 + layerIndex,
        enemyHpMultiplier: 2.0 * layerScale,
        enemySpeedMultiplier: 1.15,
        enemyDamageMultiplier: 1.5 * layerScale,
      };
    case RoomType.SIN_BOSS:
    case RoomType.DEVIL:
      return {
        enemyCount: 1,
        enemyHpMultiplier: 5.0 * layerScale,
        enemySpeedMultiplier: 1.1,
        enemyDamageMultiplier: 2.0 * layerScale,
      };
    default:
      return {
        enemyCount: 3,
        enemyHpMultiplier: 1.0,
        enemySpeedMultiplier: 1.0,
        enemyDamageMultiplier: 1.0,
      };
  }
}

// ── Rewards ───────────────────────────────────────────────────────────────

export enum RewardType {
  GOLD = 'GOLD',
  CORE = 'CORE',
  FORM = 'FORM',
  PREFIX = 'PREFIX',
  SUFFIX = 'SUFFIX',
  SIN_RELIC = 'SIN_RELIC',
  MAX_HP = 'MAX_HP',
  MAX_MANA = 'MAX_MANA',
  CONSUMABLE = 'CONSUMABLE',
}

export interface GoldRewardConfig {
  normal: { min: number; max: number };
  elite: { min: number; max: number };
  sinBoss: { min: number; max: number };
  devil: { min: number; max: number };
}

export const GOLD_REWARDS: GoldRewardConfig = {
  normal: { min: 15, max: 30 },
  elite: { min: 30, max: 55 },
  sinBoss: { min: 50, max: 80 },
  devil: { min: 0, max: 0 },
};

// ── Sacrifice Tier Chances ────────────────────────────────────────────────

export interface SacrificeTierWeights {
  common: number;   // Core/Form
  rare: number;     // Prefix/Suffix
  epic: number;     // Sin Relic
}

export const SACRIFICE_TIER_WEIGHTS: SacrificeTierWeights = {
  common: 3,  // 3/6
  rare: 2,    // 2/6
  epic: 1,    // 1/6
};

// ── Vault Categories ──────────────────────────────────────────────────────

export enum VaultCategory {
  FOUNDATION = 'FOUNDATION',  // Core/Form
  ARSENAL = 'ARSENAL',        // Prefix/Suffix
  FORTUNE = 'FORTUNE',        // Gold/resources
}

export interface VaultRewardConfig {
  [VaultCategory.FOUNDATION]: { types: RewardType[] };
  [VaultCategory.ARSENAL]: { types: RewardType[] };
  [VaultCategory.FORTUNE]: { goldMin: number; goldMax: number };
}

export const VAULT_REWARDS: VaultRewardConfig = {
  [VaultCategory.FOUNDATION]: { types: [RewardType.CORE, RewardType.FORM] },
  [VaultCategory.ARSENAL]: { types: [RewardType.PREFIX, RewardType.SUFFIX] },
  [VaultCategory.FORTUNE]: { goldMin: 40, goldMax: 75 },
};

// ── Shop Prices ───────────────────────────────────────────────────────────

export interface ShopPriceConfig {
  maxHpUpgrade: number;
  maxManaUpgrade: number;
  component: number;
  consumable: number;
}

export const SHOP_PRICES: ShopPriceConfig = {
  maxHpUpgrade: 40,
  maxManaUpgrade: 35,
  component: 50,
  consumable: 20,
};

// ── Rest ──────────────────────────────────────────────────────────────────

export const REST_HEAL_PERCENT = 0.30;

// ── Progression ───────────────────────────────────────────────────────────

export const MANA_PER_NEW_COMPONENT = 25;

export const STARTING_GOLD = 0;

export const STARTING_COMPONENTS = {
  cores: 1,
  forms: 1,
  prefixes: 0,
  suffixes: 0,
  sinRelics: 0,
};

export const TARGET_COMPONENTS = {
  cores: { min: 3, max: 5 },
  forms: { min: 3, max: 5 },
  prefixes: { min: 3, max: 5 },
  suffixes: { min: 3, max: 5 },
  sinRelics: 3,
};

// ── Sins ──────────────────────────────────────────────────────────────────

export enum SinId {
  PRIDE = 'PRIDE',
  GREED = 'GREED',
  LUST = 'LUST',
  ENVY = 'ENVY',
  GLUTTONY = 'GLUTTONY',
  WRATH = 'WRATH',
  SLOTH = 'SLOTH',
}

export interface SinDefinition {
  id: SinId;
  displayName: string;
  description: string;
  color: number;
  relicName: string;
  relicDescription: string;
}

export const SIN_DEFINITIONS: Record<SinId, SinDefinition> = {
  [SinId.PRIDE]: {
    id: SinId.PRIDE, displayName: 'Pride', description: 'The Sin of Pride',
    color: 0xffcc00, relicName: 'Crown of Pride', relicDescription: 'Active ability from Pride.',
  },
  [SinId.GREED]: {
    id: SinId.GREED, displayName: 'Greed', description: 'The Sin of Greed',
    color: 0x44cc44, relicName: 'Coin of Greed', relicDescription: 'Active ability from Greed.',
  },
  [SinId.LUST]: {
    id: SinId.LUST, displayName: 'Lust', description: 'The Sin of Lust',
    color: 0xff44aa, relicName: 'Heart of Lust', relicDescription: 'Active ability from Lust.',
  },
  [SinId.ENVY]: {
    id: SinId.ENVY, displayName: 'Envy', description: 'The Sin of Envy',
    color: 0x44aaff, relicName: 'Eye of Envy', relicDescription: 'Active ability from Envy.',
  },
  [SinId.GLUTTONY]: {
    id: SinId.GLUTTONY, displayName: 'Gluttony', description: 'The Sin of Gluttony',
    color: 0xaa6622, relicName: 'Maw of Gluttony', relicDescription: 'Active ability from Gluttony.',
  },
  [SinId.WRATH]: {
    id: SinId.WRATH, displayName: 'Wrath', description: 'The Sin of Wrath',
    color: 0xff2222, relicName: 'Fist of Wrath', relicDescription: 'Active ability from Wrath.',
  },
  [SinId.SLOTH]: {
    id: SinId.SLOTH, displayName: 'Sloth', description: 'The Sin of Sloth',
    color: 0x8866cc, relicName: 'Chains of Sloth', relicDescription: 'Active ability from Sloth.',
  },
};

export function getAllSinIds(): SinId[] {
  return Object.keys(SIN_DEFINITIONS) as SinId[];
}

// ═══════════════════════════════════════════════════════════════════════════
//  COMPONENT BALANCE RATIOS
//
//  When rewarding Core OR Form (or Prefix OR Suffix), the system
//  compares how many the player owns in each category and biases
//  toward the category with fewer.
//
//  Key = absolute difference in count between the two categories.
//  Value = probability for the category with MORE items.
//  The category with FEWER gets (1 - value).
//
//  Example: player has 3 Cores and 1 Form → difference = 2
//  → moreProbability = 0.05 → 5% Core, 95% Form
// ═══════════════════════════════════════════════════════════════════════════

export interface BalanceRatioEntry {
  difference: number;
  moreProbability: number;
}

/**
 * Probability table for Core/Form and Prefix/Suffix balancing.
 * Sorted by ascending difference. The last entry applies to all
 * differences >= its value.
 */
export const COMPONENT_BALANCE_RATIOS: BalanceRatioEntry[] = [
  { difference: 0, moreProbability: 0.50 },  // Equal: 50/50
  { difference: 1, moreProbability: 0.30 },  // 1 more: 30/70
  { difference: 2, moreProbability: 0.05 },  // 2 more: 5/95
  { difference: 3, moreProbability: 0.00 },  // 3+ more: 0/100
];

/**
 * Look up the probability for the category that has MORE items.
 */
export function getBalancedProbability(difference: number): number {
  // Find the matching or highest applicable entry
  let result = COMPONENT_BALANCE_RATIOS[0].moreProbability;
  for (const entry of COMPONENT_BALANCE_RATIOS) {
    if (difference >= entry.difference) {
      result = entry.moreProbability;
    }
  }
  return result;
}

// ── Reward Display Names ──────────────────────────────────────────────────

export const REWARD_DISPLAY: Record<RewardType, { label: string; color: number }> = {
  [RewardType.GOLD]: { label: 'Gold', color: 0xffcc44 },
  [RewardType.CORE]: { label: 'Core', color: 0xff8844 },
  [RewardType.FORM]: { label: 'Form', color: 0x8888ff },
  [RewardType.PREFIX]: { label: 'Prefix', color: 0x88cc88 },
  [RewardType.SUFFIX]: { label: 'Suffix', color: 0xccaa66 },
  [RewardType.SIN_RELIC]: { label: 'Sin Relic', color: 0xff4466 },
  [RewardType.MAX_HP]: { label: 'Max HP', color: 0x44cc66 },
  [RewardType.MAX_MANA]: { label: 'Max Mana', color: 0x4488ff },
  [RewardType.CONSUMABLE]: { label: 'Consumable', color: 0xaa88cc },
};

// ── Max Reroll Attempts ───────────────────────────────────────────────────

/** When a reward rolls a duplicate, reroll up to this many times */
export const MAX_REWARD_REROLL = 20;