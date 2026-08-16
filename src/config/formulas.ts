import { BalanceManager } from '../systems/BalanceManager';
export function calcManaCost(coreManaCost: number, formManaCost: number, prefixManaCost: number, suffixManaCost: number): number { return coreManaCost + formManaCost + prefixManaCost + suffixManaCost; }
export function calcCooldown(formCooldownMs: number, prefixCooldownMult: number, suffixCooldownMult: number): number { return Math.round(formCooldownMs * prefixCooldownMult * suffixCooldownMult); }
export function calcDamage(coreDamage: number, formDamageMult: number, prefixDamageMult: number, prefixExtraDamageFlat: number, suffixDamageMult: number): number { let damage = coreDamage; damage *= formDamageMult; damage *= prefixDamageMult; damage += prefixExtraDamageFlat; damage *= suffixDamageMult; return Math.round(damage); }
export function calcOrbAuraDamage(spellDamage: number): number { const bal = BalanceManager.get(); return Math.round(spellDamage * bal.combat.orbAuraDamagePercent); }
export function calcBeamTickDamage(spellDamage: number): number { const bal = BalanceManager.get(); return Math.round(spellDamage * bal.combat.beamTickDamagePercent); }
export function calcChainHopDamage(spellDamage: number, hopIndex: number): number { const bal = BalanceManager.get(); return Math.round(spellDamage * Math.pow(bal.combat.chainDamageDecayPerHop, hopIndex)); }
export function calcSplitDamage(spellDamage: number, splitDamagePercent: number): number { return Math.round(spellDamage * splitDamagePercent); }
export function calcReapDamage(spellDamage: number, seekDamagePercent: number): number { return Math.round(spellDamage * seekDamagePercent); }
export function calcDetonationDamage(spellDamage: number, explosionDamagePercent: number): number { return Math.round(spellDamage * explosionDamagePercent); }
export function calcReturnDamage(currentDamage: number, returnDamagePercent: number): number { return Math.round(currentDamage * returnDamagePercent); }
