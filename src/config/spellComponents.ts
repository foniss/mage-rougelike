// src/config/spellComponents.ts

// ═══════════════════════════════════════════════════════════════════════════
//  CENTRALIZED SPELL COMPONENT REGISTRY
//  Grammar: [Prefix] + Core + Form + [Suffix]
//
//  COMPATIBILITY is defined here, not in the validator or UI.
//  The validator reads this data. To change rules, edit this file.
// ═══════════════════════════════════════════════════════════════════════════

// ── Enums ─────────────────────────────────────────────────────────────────

export enum CoreId {
  FIRE = 'FIRE',
  ICE = 'ICE',
  WIND = 'WIND',
  STORM = 'STORM',
  COSMIC = 'COSMIC',
}

export enum FormId {
  BLADE = 'BLADE',
  BEAM = 'BEAM',
  ORB = 'ORB',
  MINE = 'MINE',
  NOVA = 'NOVA',
}

export enum PrefixId {
  HOMING = 'HOMING',
  SPLITTING = 'SPLITTING',
  GREATER = 'GREATER',
  EXPANDING = 'EXPANDING',
  RETURNING = 'RETURNING',
  PIERCING = 'PIERCING',
}

export enum SuffixId {
  OF_DEVOURING = 'OF DEVOURING',
  OF_BINDING = 'OF BINDING',
  OF_REAPING = 'OF REAPING',
  OF_DETONATION = 'OF DETONATION',
  OF_ECHOES = 'OF ECHOES',
}

export type TargetingType = 'melee' | 'projectile' | 'aoe' | 'line' | 'placement';
export type StatusEffectType = 'burn' | 'chill' | 'knockback' | 'shock' | 'gravity' | 'none';

// ── Status Effect Configs ─────────────────────────────────────────────────

export interface BurnConfig { type: 'burn'; damagePerSecond: number; duration: number; }
export interface ChillConfig { type: 'chill'; slowPerStack: number; maxStacks: number; stackDuration: number; freezeDuration: number; freezeThreshold: number; }
export interface KnockbackConfig { type: 'knockback'; force: number; duration: number; deflectProjectiles: boolean; deflectRadius: number; }
export interface ShockConfig { type: 'shock'; stunChance: number; stunDuration: number; arcRange: number; arcDamagePercent: number; maxArcTargets: number; }
export interface GravityConfig { type: 'gravity'; pullRadius: number; pullForce: number; pullDuration: number; }
export interface NoEffectConfig { type: 'none'; }
export type StatusEffectConfig = BurnConfig | ChillConfig | KnockbackConfig | ShockConfig | GravityConfig | NoEffectConfig;

// ── Visual Config ─────────────────────────────────────────────────────────

export interface VisualConfig { color: number; glowColor: number; trailColor: number; }
export interface AudioConfig { castSound?: string; hitSound?: string; loopSound?: string; }

// ── Prefix Behaviors ──────────────────────────────────────────────────────

export interface HomingBehavior { type: 'homing'; turnRate: number; trackingRange: number; }
export interface SplittingBehavior { type: 'splitting'; splitCount: number; splitAtPercent: number; splitAngleSpread: number; splitDamagePercent: number; }
export interface GreaterBehavior { type: 'greater'; sizeMultiplier: number; extraDamageFlat: number; }
export interface ExpandingBehavior { type: 'expanding'; startScale: number; endScale: number; growthRate: number; }
export interface ReturningBehavior { type: 'returning'; returnSpeed: number; returnDamagePercent: number; }
export interface PiercingBehavior { type: 'piercing'; maxPierceTargets: number; damageRetainPercent: number; }
export type PrefixBehavior = HomingBehavior | SplittingBehavior | GreaterBehavior | ExpandingBehavior | ReturningBehavior | PiercingBehavior;

// ── Suffix Behaviors ──────────────────────────────────────────────────────

export interface DevouringBehavior { type: 'devouring'; manaRestoreOnKill: number; }
export interface BindingBehavior { type: 'binding'; bindDuration: number; bindRadius: number; }
export interface ReapingBehavior { type: 'reaping'; seekRange: number; maxAdditionalTargets: number; seekDamagePercent: number; }
export interface DetonationBehavior { type: 'detonation'; explosionRadius: number; explosionDamagePercent: number; canChainDetonate: boolean; }
export interface EchoesBehavior { type: 'echoes'; echoDelay: number; echoDamageMultiplier: number; canEchoRecursively: boolean; }
export type SuffixBehavior = DevouringBehavior | BindingBehavior | ReapingBehavior | DetonationBehavior | EchoesBehavior;

// ── Form Visual Configs ───────────────────────────────────────────────────

export interface BladeVisual { arcAngle: number; range: number; swingDuration: number; }
export interface BeamVisual { width: number; range: number; castDuration: number; tickInterval: number; }
export interface OrbVisual { radius: number; speed: number; lifetime: number; damageTickInterval: number; damageRadius: number; }
export interface MineVisual { radius: number; armDelay: number; triggerRadius: number; explosionRadius: number; lifetime: number; }
export interface NovaVisual { radius: number; expandDuration: number; }
export type FormVisualConfig = BladeVisual | BeamVisual | OrbVisual | MineVisual | NovaVisual;

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
  formVisual: FormVisualConfig;
  audio: AudioConfig;
  /** Which prefixes this form accepts. 'all' = no restriction from form side. */
  compatiblePrefixes: PrefixId[] | 'all';
  /** Which suffixes this form accepts. 'all' = no restriction from form side. */
  compatibleSuffixes: SuffixId[] | 'all';
}

export interface PrefixComponent {
  id: PrefixId;
  displayName: string;
  description: string;
  manaCost: number;
  damageMultiplier: number;
  cooldownMultiplier: number;
  /** Which forms this prefix can be used with. 'all' = works with everything. */
  compatibleForms: FormId[] | 'all';
  /** Which cores this prefix can be used with. 'all' = works with everything. */
  compatibleCores: CoreId[] | 'all';
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
  /** Which forms this suffix can be used with. 'all' = works with everything. */
  compatibleForms: FormId[] | 'all';
  /** Which cores this suffix can be used with. 'all' = works with everything. */
  compatibleCores: CoreId[] | 'all';
  behavior: SuffixBehavior;
  visual: Partial<VisualConfig>;
  audio: AudioConfig;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CORE ↔ FORM RESTRICTION TABLE
//
//  Use this to block specific Core+Form combinations.
//  If a pair is NOT listed here, it is allowed.
//
//  Example:
//    { coreId: CoreId.WIND, formId: FormId.MINE,
//      reason: 'Wind cannot be placed as a Mine.',
//      suggestion: 'Try Wind Blade or Wind Nova.' }
// ═══════════════════════════════════════════════════════════════════════════

export interface CoreFormRestriction {
  coreId: CoreId;
  formId: FormId;
  reason: string;
  suggestion?: string;
}

export const CORE_FORM_RESTRICTIONS: CoreFormRestriction[] = [
  // Currently no restrictions — all Core+Form combos are valid.
  // Add entries here to block specific combinations:
  //
  // {
  //   coreId: CoreId.WIND,
  //   formId: FormId.MINE,
  //   reason: 'Wind cannot be contained in a Mine.',
  //   suggestion: 'Try Wind Blade or Wind Nova instead.',
  // },
];

// ═══════════════════════════════════════════════════════════════════════════
//  REGISTRIES
// ═══════════════════════════════════════════════════════════════════════════

export const CORE_REGISTRY: Record<CoreId, CoreComponent> = {
  [CoreId.FIRE]: {
    id: CoreId.FIRE,
    displayName: 'Fire',
    description: 'Burns enemies over time.',
    manaCost: 5,
    baseDamage: 25,
    statusEffect: { type: 'burn', damagePerSecond: 5, duration: 3 },
    visual: { color: 0xff6600, glowColor: 0xff9944, trailColor: 0xff3300 },
    audio: {},
  },
  [CoreId.ICE]: {
    id: CoreId.ICE,
    displayName: 'Ice',
    description: 'Stacking Chill. Max stacks = Freeze.',
    manaCost: 5,
    baseDamage: 20,
    statusEffect: { type: 'chill', slowPerStack: 0.1, maxStacks: 4, stackDuration: 4, freezeDuration: 2, freezeThreshold: 4 },
    visual: { color: 0x44ccff, glowColor: 0x88ddff, trailColor: 0x2299cc },
    audio: {},
  },
  [CoreId.WIND]: {
    id: CoreId.WIND,
    displayName: 'Wind',
    description: 'Pushes enemies back.',
    manaCost: 5,
    baseDamage: 18,
    statusEffect: { type: 'knockback', force: 300, duration: 0.3, deflectProjectiles: true, deflectRadius: 80 },
    visual: { color: 0x88ffbb, glowColor: 0xbbffdd, trailColor: 0x55cc88 },
    audio: {},
  },
  [CoreId.STORM]: {
    id: CoreId.STORM,
    displayName: 'Storm',
    description: 'Chance to stun + arc to nearby.',
    manaCost: 6,
    baseDamage: 22,
    statusEffect: { type: 'shock', stunChance: 0.25, stunDuration: 0.5, arcRange: 120, arcDamagePercent: 0.3, maxArcTargets: 2 },
    visual: { color: 0xaa88ff, glowColor: 0xccaaff, trailColor: 0x8866dd },
    audio: {},
  },
  [CoreId.COSMIC]: {
    id: CoreId.COSMIC,
    displayName: 'Cosmic',
    description: 'Gravity pulls enemies inward.',
    manaCost: 7,
    baseDamage: 20,
    statusEffect: { type: 'gravity', pullRadius: 120, pullForce: 150, pullDuration: 1.5 },
    visual: { color: 0xdd66ff, glowColor: 0xee99ff, trailColor: 0xbb44dd },
    audio: {},
  },
};

export const FORM_REGISTRY: Record<FormId, FormComponent> = {
  [FormId.BLADE]: {
    id: FormId.BLADE,
    displayName: 'Blade',
    description: 'Wide close-range melee slash.',
    manaCost: 5,
    cooldown: 350,
    targetingType: 'melee',
    damageMultiplier: 1.0,
    formVisual: { arcAngle: 90, range: 70, swingDuration: 200 } as BladeVisual,
    audio: {},
    compatiblePrefixes: [PrefixId.GREATER],
    compatibleSuffixes: 'all',
  },
  [FormId.BEAM]: {
    id: FormId.BEAM,
    displayName: 'Beam',
    description: 'Continuous line attack.',
    manaCost: 8,
    cooldown: 1000,
    targetingType: 'line',
    damageMultiplier: 1.0,
    formVisual: { width: 14, range: 500, castDuration: 800, tickInterval: 200 } as BeamVisual,
    audio: {},
    compatiblePrefixes: [PrefixId.GREATER],
    compatibleSuffixes: 'all',
  },
  [FormId.ORB]: {
    id: FormId.ORB,
    displayName: 'Orb',
    description: 'Slow-moving damaging sphere.',
    manaCost: 7,
    cooldown: 550,
    targetingType: 'projectile',
    damageMultiplier: 1.0,
    formVisual: { radius: 12, speed: 180, lifetime: 2500, damageTickInterval: 300, damageRadius: 30 } as OrbVisual,
    audio: {},
    compatiblePrefixes: 'all',
    compatibleSuffixes: 'all',
  },
  [FormId.MINE]: {
    id: FormId.MINE,
    displayName: 'Mine',
    description: 'Trap that detonates near enemies.',
    manaCost: 7,
    cooldown: 700,
    targetingType: 'placement',
    damageMultiplier: 1.2,
    formVisual: { radius: 10, armDelay: 500, triggerRadius: 50, explosionRadius: 80, lifetime: 8000 } as MineVisual,
    audio: {},
    compatiblePrefixes: [PrefixId.GREATER],
    compatibleSuffixes: 'all',
  },
  [FormId.NOVA]: {
    id: FormId.NOVA,
    displayName: 'Nova',
    description: 'Radial AoE explosion.',
    manaCost: 9,
    cooldown: 750,
    targetingType: 'aoe',
    damageMultiplier: 0.9,
    formVisual: { radius: 110, expandDuration: 350 } as NovaVisual,
    audio: {},
    compatiblePrefixes: [PrefixId.GREATER],
    compatibleSuffixes: 'all',
  },
};

export const PREFIX_REGISTRY: Record<PrefixId, PrefixComponent> = {
  [PrefixId.HOMING]: {
    id: PrefixId.HOMING,
    displayName: 'Homing',
    description: 'Tracks nearby enemies.',
    manaCost: 5,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    compatibleForms: [FormId.ORB],
    compatibleCores: 'all',
    behavior: { type: 'homing', turnRate: 2.5, trackingRange: 200 },
    visual: {},
    audio: {},
  },
  [PrefixId.SPLITTING]: {
    id: PrefixId.SPLITTING,
    displayName: 'Splitting',
    description: 'Splits into 3 mid-flight.',
    manaCost: 7,
    damageMultiplier: 0.7,
    cooldownMultiplier: 1.2,
    compatibleForms: [FormId.ORB],
    compatibleCores: 'all',
    behavior: { type: 'splitting', splitCount: 3, splitAtPercent: 0.5, splitAngleSpread: 30, splitDamagePercent: 0.6 },
    visual: {},
    audio: {},
  },
  [PrefixId.GREATER]: {
    id: PrefixId.GREATER,
    displayName: 'Greater',
    description: 'Increases size & AoE by 50%.',
    manaCost: 4,
    damageMultiplier: 1.3,
    cooldownMultiplier: 1.2,
    compatibleForms: [FormId.BLADE, FormId.BEAM, FormId.ORB, FormId.MINE, FormId.NOVA],
    compatibleCores: 'all',
    behavior: { type: 'greater', sizeMultiplier: 1.5, extraDamageFlat: 5 },
    visual: {},
    audio: {},
  },
  [PrefixId.EXPANDING]: {
    id: PrefixId.EXPANDING,
    displayName: 'Expanding',
    description: 'Grows as it travels.',
    manaCost: 4,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.1,
    compatibleForms: [FormId.ORB],
    compatibleCores: 'all',
    behavior: { type: 'expanding', startScale: 0.6, endScale: 2.0, growthRate: 0.8 },
    visual: {},
    audio: {},
  },
  [PrefixId.RETURNING]: {
    id: PrefixId.RETURNING,
    displayName: 'Returning',
    description: 'Returns to caster after travel.',
    manaCost: 6,
    damageMultiplier: 0.9,
    cooldownMultiplier: 1.3,
    compatibleForms: [FormId.ORB],
    compatibleCores: 'all',
    behavior: { type: 'returning', returnSpeed: 250, returnDamagePercent: 0.5 },
    visual: {},
    audio: {},
  },
  [PrefixId.PIERCING]: {
    id: PrefixId.PIERCING,
    displayName: 'Piercing',
    description: 'Passes through enemies.',
    manaCost: 3,
    damageMultiplier: 0.85,
    cooldownMultiplier: 1.0,
    compatibleForms: [FormId.ORB],
    compatibleCores: 'all',
    behavior: { type: 'piercing', maxPierceTargets: 3, damageRetainPercent: 0.7 },
    visual: {},
    audio: {},
  },
};

export const SUFFIX_REGISTRY: Record<SuffixId, SuffixComponent> = {
  [SuffixId.OF_DEVOURING]: {
    id: SuffixId.OF_DEVOURING,
    displayName: 'of Devouring',
    description: 'Kills restore mana.',
    manaCost: 3,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.0,
    compatibleForms: 'all',
    compatibleCores: 'all',
    behavior: { type: 'devouring', manaRestoreOnKill: 8 },
    visual: {},
    audio: {},
  },
  [SuffixId.OF_BINDING]: {
    id: SuffixId.OF_BINDING,
    displayName: 'of Binding',
    description: 'Roots enemies in place.',
    manaCost: 5,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.1,
    compatibleForms: 'all',
    compatibleCores: 'all',
    behavior: { type: 'binding', bindDuration: 1.5, bindRadius: 30 },
    visual: {},
    audio: {},
  },
  [SuffixId.OF_REAPING]: {
    id: SuffixId.OF_REAPING,
    displayName: 'of Reaping',
    description: 'Kill triggers seek to next enemy.',
    manaCost: 6,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.15,
    compatibleForms: 'all',
    compatibleCores: 'all',
    behavior: { type: 'reaping', seekRange: 180, maxAdditionalTargets: 2, seekDamagePercent: 0.6 },
    visual: {},
    audio: {},
  },
  [SuffixId.OF_DETONATION]: {
    id: SuffixId.OF_DETONATION,
    displayName: 'of Detonation',
    description: 'Killed enemies explode.',
    manaCost: 6,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.2,
    compatibleForms: 'all',
    compatibleCores: 'all',
    behavior: { type: 'detonation', explosionRadius: 70, explosionDamagePercent: 0.5, canChainDetonate: false },
    visual: {},
    audio: {},
  },
  [SuffixId.OF_ECHOES]: {
    id: SuffixId.OF_ECHOES,
    displayName: 'of Echoes',
    description: 'Spell repeats at reduced power.',
    manaCost: 7,
    damageMultiplier: 1.0,
    cooldownMultiplier: 1.3,
    compatibleForms: 'all',
    compatibleCores: 'all',
    behavior: { type: 'echoes', echoDelay: 600, echoDamageMultiplier: 0.5, canEchoRecursively: false },
    visual: {},
    audio: {},
  },
};

// ═══════════════════════════════════════════════════════════════════════════
//  LOOKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getCore(id: CoreId): CoreComponent { return CORE_REGISTRY[id]; }
export function getForm(id: FormId): FormComponent { return FORM_REGISTRY[id]; }
export function getPrefix(id: PrefixId): PrefixComponent { return PREFIX_REGISTRY[id]; }
export function getSuffix(id: SuffixId): SuffixComponent { return SUFFIX_REGISTRY[id]; }

export function getAllCoreIds(): CoreId[] { return Object.keys(CORE_REGISTRY) as CoreId[]; }
export function getAllFormIds(): FormId[] { return Object.keys(FORM_REGISTRY) as FormId[]; }
export function getAllPrefixIds(): PrefixId[] { return Object.keys(PREFIX_REGISTRY) as PrefixId[]; }
export function getAllSuffixIds(): SuffixId[] { return Object.keys(SUFFIX_REGISTRY) as SuffixId[]; }

export function identifyWord(word: string): {
  type: 'core' | 'form' | 'prefix' | 'suffix';
  id: string;
} | null {
  const upper = word.toUpperCase();
  if (upper in CORE_REGISTRY) return { type: 'core', id: upper };
  if (upper in FORM_REGISTRY) return { type: 'form', id: upper };
  if (upper in PREFIX_REGISTRY) return { type: 'prefix', id: upper };
  return null;
}

export function identifySuffix(words: string): {
  type: 'suffix';
  id: string;
} | null {
  const upper = words.toUpperCase();
  if (upper in SUFFIX_REGISTRY) return { type: 'suffix', id: upper };
  return null;
}