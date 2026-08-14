// src/config/formulas.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  CENTRALIZED SPELL FORMULAS
//
//  Every damage/mana/cooldown calculation lives here.
//  Game code calls these functions instead of doing math inline.
//
//  FORMULA DOCUMENTATION:
//
//  ── Mana Cost ──────────────────────────────────────────────────────────
//  Final Mana = Core.manaCost + Form.manaCost + Prefix.manaCost + Suffix.manaCost
//  Simple additive. Each component contributes a flat mana amount.
//
//  ── Cooldown ───────────────────────────────────────────────────────────
//  Final Cooldown = Form.cooldownMs × Prefix.cooldownMultiplier × Suffix.cooldownMultiplier
//  Multiplicative. Base cooldown comes from the Form. Modifiers scale it.
//
//  ── Damage ─────────────────────────────────────────────────────────────
//  Base Damage = Core.baseDamage
//  After Form  = Base × Form.damageMultiplier
//  After Prefix = (After Form × Prefix.damageMultiplier) + Prefix.extraDamageFlat
//  After Suffix = After Prefix × Suffix.damageMultiplier
//  Final Damage = round(After Suffix)
//
//  ── Status Effect Values ───────────────────────────────────────────────
//  All status values come directly from Core balance data.
//  No scaling is applied to status effects by Form/Prefix/Suffix
//  (this can be changed later by adding status multipliers).
//
//  ── Orb Aura Damage ────────────────────────────────────────────────────
//  Aura Tick Damage = round(Spell.damage × combat.orbAuraDamagePercent)
//
//  ── Beam Tick Damage ───────────────────────────────────────────────────
//  Beam Tick Damage = round(Spell.damage × combat.beamTickDamagePercent)
//
//  ── Chain Damage Decay ─────────────────────────────────────────────────
//  Hop N Damage = round(Spell.damage × (combat.chainDamageDecayPerHop ^ N))
//
// ═══════════════════════════════════════════════════════════════════════════

import { BalanceManager } from '../systems/BalanceManager';

/**
 * Calculate final mana cost for a spell.
 */
export function calcManaCost(
  coreManaCost: number,
  formManaCost: number,
  prefixManaCost: number,
  suffixManaCost: number,
): number {
  return coreManaCost + formManaCost + prefixManaCost + suffixManaCost;
}

/**
 * Calculate final cooldown for a spell (in ms).
 */
export function calcCooldown(
  formCooldownMs: number,
  prefixCooldownMult: number,
  suffixCooldownMult: number,
): number {
  return Math.round(formCooldownMs * prefixCooldownMult * suffixCooldownMult);
}

/**
 * Calculate final damage for a spell.
 */
export function calcDamage(
  coreDamage: number,
  formDamageMult: number,
  prefixDamageMult: number,
  prefixExtraDamageFlat: number,
  suffixDamageMult: number,
): number {
  let damage = coreDamage;
  damage *= formDamageMult;
  damage *= prefixDamageMult;
  damage += prefixExtraDamageFlat;
  damage *= suffixDamageMult;
  return Math.round(damage);
}

/**
 * Calculate orb aura tick damage.
 */
export function calcOrbAuraDamage(spellDamage: number): number {
  const bal = BalanceManager.get();
  return Math.round(spellDamage * bal.combat.orbAuraDamagePercent);
}

/**
 * Calculate beam tick damage.
 */
export function calcBeamTickDamage(spellDamage: number): number {
  const bal = BalanceManager.get();
  return Math.round(spellDamage * bal.combat.beamTickDamagePercent);
}

/**
 * Calculate chain hop damage.
 */
export function calcChainHopDamage(spellDamage: number, hopIndex: number): number {
  const bal = BalanceManager.get();
  return Math.round(spellDamage * Math.pow(bal.combat.chainDamageDecayPerHop, hopIndex));
}

/**
 * Calculate split sub-projectile damage.
 */
export function calcSplitDamage(spellDamage: number, splitDamagePercent: number): number {
  return Math.round(spellDamage * splitDamagePercent);
}

/**
 * Calculate reaping seek damage.
 */
export function calcReapDamage(spellDamage: number, seekDamagePercent: number): number {
  return Math.round(spellDamage * seekDamagePercent);
}

/**
 * Calculate detonation explosion damage.
 */
export function calcDetonationDamage(spellDamage: number, explosionDamagePercent: number): number {
  return Math.round(spellDamage * explosionDamagePercent);
}

/**
 * Calculate return phase damage.
 */
export function calcReturnDamage(currentDamage: number, returnDamagePercent: number): number {
  return Math.round(currentDamage * returnDamagePercent);
}