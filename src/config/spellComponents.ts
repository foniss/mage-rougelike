// src/config/spellComponents.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  CENTRALIZED SPELL COMPONENT REGISTRY
//
//  Spell grammar:  [Prefix] + Core + Form + [Suffix]
//
//  To add a new component:
//    1. Add a new entry to the appropriate registry (CORES, FORMS, etc.)
//    2. The rest of the engine picks it up automatically.
//
//  To modify balance:
//    Change numbers here. Nothing else needs to change.
// ═══════════════════════════════════════════════════════════════════════════

// ── Enums ─────────────────────────────────────────────────────────────────

export enum CoreId {
  FIRE = 'FIRE',
  ICE = 'ICE',
  LIGHTNING = 'LIGHTNING',
}

export enum FormId {
  BOLT = 'BOLT',
  NOVA = 'NOVA',
  BEAM = 'BEAM',
}

export enum PrefixId {
  GREATER = 'GREATER',
  SWIFT = 'SWIFT',
}

export enum SuffixId {
  SEEKING = 'SEEKING',
  PIERCING = 'PIERCING',
}

export type TargetingType = 'projectile' | 'aoe' | 'line';

export type StatusEffectType = 'burn' | 'slow' | 'chain' | 'none';

// ── Status Effect Config ──────────────────────────────────────────────────

export interface BurnConfig {
  type: 'burn';
  damagePerSecond: number;
  duration: number;
}

export interface SlowConfig {
  type: 'slow';
  slowPercent: number;
  duration: number;
}

export interface ChainConfig {
  type: 'chain';
  maxTargets: number;
  chainRange: number;
}

export interface NoEffectConfig {
  type: 'none';
}

export type StatusEffectConfig = BurnConfig | SlowConfig | ChainConfig | NoEffectConfig;

// ── Visual Config ─────────────────────────────────────────────────────────

export interface VisualConfig {
  color: number;
  glowColor: number;
  trailColor: number;
}

// ── Audio Config (placeholder for future) ─────────────────────────────────

export interface AudioConfig {
  castSound?: string;
  hitSound?: string;
  loopSound?: string;
}

// ── Component Interfaces ──────────────────────────────────────────────────

export interface CoreComponent {
  id: CoreId;
  displayName: string;
  description: string;
  manaCost: number;
  baseDamage: number;
  statusEffect: StatusEffectConfig;
  visual: VisualConfig;
  audio: AudioConfig;
}

export interface FormComponent {
  id: FormId;
  displayName: string;
  description: string;
  manaCost: number;
  cooldown: number;
  targetingType: TargetingType;
  damageMultiplier: number;
  visual: {
    scale: number;
    duration: number;
  };
  audio: AudioConfig;
  compatiblePrefixes: PrefixId[] | 'all';
  compatibleSuffixes: SuffixId[] | 'all';
}

export interface PrefixComponent {
  id: PrefixId;
  displayName: string;
  description: string;
  manaCost: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  compatibleForms: FormId[] | 'all';
  behavior: PrefixBehavior;
  visual: Partial<VisualConfig>;
  audio: AudioConfig;
}

export interface SuffixComponent {
  id: SuffixId;
  displayName: string;
  description: string;
  manaCost: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  compatibleForms: FormId[] | 'all';
  behavior: SuffixBehavior;
  visual: Partial<VisualConfig>;
  audio: AudioConfig;
}

// ── Behavior Configs ──────────────────────────────────────────────────────

export interface GreaterBehavior {
  type: 'greater';
  sizeMultiplier: number;
  extraDamageFlat: number;
}

export interface SwiftBehavior {
  type: 'swift';
  speedMultiplier: number;
  cooldownReduction: number;
}

export type PrefixBehavior = GreaterBehavior | SwiftBehavior;

export interface SeekingBehavior {
  type: 'seeking';
  turnRate: number;
  trackingRange: number;
}

export interface PiercingBehavior {
  type: 'piercing';
  maxPierceTargets: number;
  damageRetainPercent: number;
}

export type SuffixBehavior = SeekingBehavior | PiercingBehavior;

// ═══════════════════════════════════════════════════════════════════════════
//  REGISTRIES
// ═══════════════════════════════════════════════════════════════════════════

// ── CORES ─────────────────────────────────────────────────────────────────

export const CORE_REGISTRY: Record<CoreId, CoreComponent> = {
  [CoreId.FIRE]: {
    id: CoreId.FIRE,
    displayName: 'Fire',
    description: 'Burns enemies over time.',
    manaCost: 4,
    baseDamage: 25,
    statusEffect: {
      type: 'burn',
      damagePerSecond: 5,
      duration: 3,
    },
    visual: {
      color: 0xff6600,
      glowColor: 0xff9944,
      trailColor: 0xff3300,
    },
    audio: {},
  },

  [CoreId.ICE]: {
    id: CoreId.ICE,
    displayName: 'Ice',
    description: 'Slows enemies by 40%.',
    manaCost: 3,
    baseDamage: 20,
    statusEffect: {
      type: 'slow',
      slowPercent: 0.4,
      duration: 2,
    },
    visual: {
      color: 0x44ccff,
      glowColor: 0x88ddff,
      trailColor: 0x2299cc,
    },
    audio: {},
  },

  [CoreId.LIGHTNING]: {
    id: CoreId.LIGHTNING,
    displayName: 'Lightning',
    description: 'Chains between enemies.',
    manaCost: 5,
    baseDamage: 22,
    statusEffect: {
      type: 'chain',
      maxTargets: 3,
      chainRange: 150,
    },
    visual: {
      color: 0xffff00,
      glowColor: 0xffffaa,
      trailColor: 0xcccc00,
    },
    audio: {},
  },
};

// ── FORMS ─────────────────────────────────────────────────────────────────

export const FORM_REGISTRY: Record<FormId, FormComponent> = {
  [FormId.BOLT]: {
    id: FormId.BOLT,
    displayName: 'Bolt',
    description: 'Projectile toward target.',
    manaCost: 4,
    cooldown: 400,
    targetingType: 'projectile',
    damageMultiplier: 1.0,
    visual: { scale: 1, duration: 2000 },
    audio: {},
    compatiblePrefixes: 'all',
    compatibleSuffixes: 'all',
  },

  [FormId.NOVA]: {
    id: FormId.NOVA,
    displayName: 'Nova',
    description: 'AoE burst around target.',
    manaCost: 10,
    cooldown: 600,
    targetingType: 'aoe',
    damageMultiplier: 0.9,
    visual: { scale: 1, duration: 400 },
    audio: {},
    compatiblePrefixes: 'all',
    compatibleSuffixes: [SuffixId.PIERCING],
  },

  [FormId.BEAM]: {
    id: FormId.BEAM,
    displayName: 'Beam',
    description: 'Instant line attack.',
    manaCost: 7,
    cooldown: 500,
    targetingType: 'line',
    damageMultiplier: 1.0,
    visual: { scale: 1, duration: 300 },
    audio: {},
    compatiblePrefixes: 'all',
    compatibleSuffixes: [SuffixId.PIERCING],
  },
};

// ── PREFIXES ──────────────────────────────────────────────────────────────

export const PREFIX_REGISTRY: Record<PrefixId, PrefixComponent> = {
  [PrefixId.GREATER]: {
    id: PrefixId.GREATER,
    displayName: 'Greater',
    description: 'Bigger and more powerful.',
    manaCost: 5,
    damageMultiplier: 1.4,
    cooldownMultiplier: 1.3,
    compatibleForms: 'all',
    behavior: {
      type: 'greater',
      sizeMultiplier: 1.5,
      extraDamageFlat: 5,
    },
    visual: {},
    audio: {},
  },

  [PrefixId.SWIFT]: {
    id: PrefixId.SWIFT,
    displayName: 'Swift',
    description: 'Faster with shorter cooldown.',
    manaCost: 3,
    damageMultiplier: 0.9,
    cooldownMultiplier: 0.6,
    compatibleForms: 'all',
    behavior: {
      type: 'swift',
      speedMultiplier: 1.6,
      cooldownReduction: 0.4,
    },
    visual: {},
    audio: {},
  },
};

// ── SUFFIXES ──────────────────────────────────────────────────────────────

export const SUFFIX_REGISTRY: Record<SuffixId, SuffixComponent> = {
  [SuffixId.SEEKING]: {
    id: SuffixId.SEEKING,
    displayName: 'Seeking',
    description: 'Homes toward nearest enemy.',
    manaCost: 4,
    damageMultiplier: 0.85,
    cooldownMultiplier: 1.1,
    compatibleForms: [FormId.BOLT],
    behavior: {
      type: 'seeking',
      turnRate: 3,
      trackingRange: 200,
    },
    visual: {},
    audio: {},
  },

  [SuffixId.PIERCING]: {
    id: SuffixId.PIERCING,
    displayName: 'Piercing',
    description: 'Passes through enemies.',
    manaCost: 3,
    damageMultiplier: 0.8,
    cooldownMultiplier: 1.0,
    compatibleForms: [FormId.BOLT, FormId.BEAM],
    behavior: {
      type: 'piercing',
      maxPierceTargets: 3,
      damageRetainPercent: 0.7,
    },
    visual: {},
    audio: {},
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getCore(id: CoreId): CoreComponent {
  return CORE_REGISTRY[id];
}

export function getForm(id: FormId): FormComponent {
  return FORM_REGISTRY[id];
}

export function getPrefix(id: PrefixId): PrefixComponent {
  return PREFIX_REGISTRY[id];
}

export function getSuffix(id: SuffixId): SuffixComponent {
  return SUFFIX_REGISTRY[id];
}

export function getAllCoreIds(): CoreId[] {
  return Object.keys(CORE_REGISTRY) as CoreId[];
}

export function getAllFormIds(): FormId[] {
  return Object.keys(FORM_REGISTRY) as FormId[];
}

export function getAllPrefixIds(): PrefixId[] {
  return Object.keys(PREFIX_REGISTRY) as PrefixId[];
}

export function getAllSuffixIds(): SuffixId[] {
  return Object.keys(SUFFIX_REGISTRY) as SuffixId[];
}

/**
 * Check if a word matches any component. Returns { type, id } or null.
 */
export function identifyWord(word: string): {
  type: 'core' | 'form' | 'prefix' | 'suffix';
  id: string;
} | null {
  const upper = word.toUpperCase();

  if (upper in CORE_REGISTRY) return { type: 'core', id: upper };
  if (upper in FORM_REGISTRY) return { type: 'form', id: upper };
  if (upper in PREFIX_REGISTRY) return { type: 'prefix', id: upper };
  if (upper in SUFFIX_REGISTRY) return { type: 'suffix', id: upper };

  return null;
}