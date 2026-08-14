// src/config/cores.ts

export enum CoreType {
  FIRE = 'FIRE',
  ICE = 'ICE',
  LIGHTNING = 'LIGHTNING',
}

export interface StatusEffect {
  type: 'burn' | 'slow' | 'chain';
}

export interface BurnEffect extends StatusEffect {
  type: 'burn';
  damagePerSecond: number;
  duration: number; // seconds
}

export interface SlowEffect extends StatusEffect {
  type: 'slow';
  slowPercent: number; // 0 to 1 (0.4 = 40% slow)
  duration: number;    // seconds
}

export interface ChainEffect extends StatusEffect {
  type: 'chain';
  maxTargets: number;
  chainRange: number; // pixels
}

export type CoreEffect = BurnEffect | SlowEffect | ChainEffect;

export interface CoreDefinition {
  type: CoreType;
  displayName: string;
  baseDamage: number;
  color: number;
  glowColor: number;
  trailColor: number;
  effect: CoreEffect;
  description: string;
}

export const CORES: Record<CoreType, CoreDefinition> = {
  [CoreType.FIRE]: {
    type: CoreType.FIRE,
    displayName: 'Fire',
    baseDamage: 25,
    color: 0xff6600,
    glowColor: 0xff9944,
    trailColor: 0xff3300,
    effect: {
      type: 'burn',
      damagePerSecond: 5,
      duration: 3,
    },
    description: 'Burns enemies over time.',
  },
  [CoreType.ICE]: {
    type: CoreType.ICE,
    displayName: 'Ice',
    baseDamage: 20,
    color: 0x44ccff,
    glowColor: 0x88ddff,
    trailColor: 0x2299cc,
    effect: {
      type: 'slow',
      slowPercent: 0.4,
      duration: 2,
    },
    description: 'Slows enemies by 40%.',
  },
  [CoreType.LIGHTNING]: {
    type: CoreType.LIGHTNING,
    displayName: 'Lightning',
    baseDamage: 22,
    color: 0xffff00,
    glowColor: 0xffffaa,
    trailColor: 0xcccc00,
    effect: {
      type: 'chain',
      maxTargets: 3,
      chainRange: 150,
    },
    description: 'Chains between enemies.',
  },
};

export function getCore(type: CoreType): CoreDefinition {
  return CORES[type];
}

export function isValidCore(name: string): boolean {
  return name.toUpperCase() in CoreType;
}

export function parseCoreType(name: string): CoreType | null {
  const upper = name.toUpperCase();
  if (upper in CoreType) {
    return upper as CoreType;
  }
  return null;
}

export function getAllCoreTypes(): CoreType[] {
  return [CoreType.FIRE, CoreType.ICE, CoreType.LIGHTNING];
}