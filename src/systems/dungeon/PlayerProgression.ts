import { CoreId, FormId, PrefixId, SuffixId, getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds, CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY } from '../../config/spellComponents';
import { SinId, MANA_PER_NEW_COMPONENT, STARTING_GOLD, REST_HEAL_PERCENT } from '../../config/dungeonConfig';
import { BALANCE } from '../../config/balance';
export interface SinRelic { sinId: SinId; name: string; description: string; }
export class PlayerProgression {
  public unlockedCores: Set<CoreId> = new Set(); public unlockedForms: Set<FormId> = new Set(); public unlockedPrefixes: Set<PrefixId> = new Set(); public unlockedSuffixes: Set<SuffixId> = new Set(); public sinRelics: SinRelic[] = []; public gold: number = STARTING_GOLD; public maxHp: number = BALANCE.player.maxHp; public currentHp: number = BALANCE.player.maxHp; public maxMana: number = BALANCE.player.maxMana; public defeatedSins: Set<SinId> = new Set();
  constructor() { this.initStartingComponents(); }
  private initStartingComponents(): void { const ac = getAllCoreIds(); const af = getAllFormIds(); this.unlockedCores.add(ac[Math.floor(Math.random() * ac.length)]); this.unlockedForms.add(af[Math.floor(Math.random() * af.length)]); }
  addCore(id: CoreId): boolean { if (this.unlockedCores.has(id)) return false; this.unlockedCores.add(id); this.maxMana += MANA_PER_NEW_COMPONENT; return true; }
  addForm(id: FormId): boolean { if (this.unlockedForms.has(id)) return false; this.unlockedForms.add(id); this.maxMana += MANA_PER_NEW_COMPONENT; return true; }
  addPrefix(id: PrefixId): boolean { if (this.unlockedPrefixes.has(id)) return false; this.unlockedPrefixes.add(id); return true; }
  addSuffix(id: SuffixId): boolean { if (this.unlockedSuffixes.has(id)) return false; this.unlockedSuffixes.add(id); return true; }
  addSinRelic(relic: SinRelic): void { this.sinRelics.push(relic); }
  removeCore(id: CoreId): boolean { if (this.unlockedCores.size <= 1) return false; return this.unlockedCores.delete(id); }
  removeForm(id: FormId): boolean { if (this.unlockedForms.size <= 1) return false; return this.unlockedForms.delete(id); }
  removePrefix(id: PrefixId): boolean { return this.unlockedPrefixes.delete(id); }
  removeSuffix(id: SuffixId): boolean { return this.unlockedSuffixes.delete(id); }
  getAvailableCoreIds(): CoreId[] { return [...this.unlockedCores]; } getAvailableFormIds(): FormId[] { return [...this.unlockedForms]; } getAvailablePrefixIds(): PrefixId[] { return [...this.unlockedPrefixes]; } getAvailableSuffixIds(): SuffixId[] { return [...this.unlockedSuffixes]; }
  hasCore(id: CoreId): boolean { return this.unlockedCores.has(id); } hasForm(id: FormId): boolean { return this.unlockedForms.has(id); } hasPrefix(id: PrefixId): boolean { return this.unlockedPrefixes.has(id); } hasSuffix(id: SuffixId): boolean { return this.unlockedSuffixes.has(id); }
  getUnownedCores(): CoreId[] { return getAllCoreIds().filter(id => !this.unlockedCores.has(id)); } getUnownedForms(): FormId[] { return getAllFormIds().filter(id => !this.unlockedForms.has(id)); } getUnownedPrefixes(): PrefixId[] { return getAllPrefixIds().filter(id => !this.unlockedPrefixes.has(id)); } getUnownedSuffixes(): SuffixId[] { return getAllSuffixIds().filter(id => !this.unlockedSuffixes.has(id)); }
  hasUnownedCoreOrForm(): boolean { return this.getUnownedCores().length > 0 || this.getUnownedForms().length > 0; }
  hasUnownedPrefixOrSuffix(): boolean { return this.getUnownedPrefixes().length > 0 || this.getUnownedSuffixes().length > 0; }
  getCoreCount(): number { return this.unlockedCores.size; } getFormCount(): number { return this.unlockedForms.size; } getPrefixCount(): number { return this.unlockedPrefixes.size; } getSuffixCount(): number { return this.unlockedSuffixes.size; }
  getSacrificeCandidates(): { type: 'core' | 'form' | 'prefix' | 'suffix'; id: string; name: string }[] { const c: { type: 'core' | 'form' | 'prefix' | 'suffix'; id: string; name: string }[] = []; if (this.unlockedCores.size > 1) for (const id of this.unlockedCores) { const r = CORE_REGISTRY[id]; c.push({ type: 'core', id, name: r?.displayName || id }); } if (this.unlockedForms.size > 1) for (const id of this.unlockedForms) { const r = FORM_REGISTRY[id]; c.push({ type: 'form', id, name: r?.displayName || id }); } for (const id of this.unlockedPrefixes) { const r = PREFIX_REGISTRY[id]; c.push({ type: 'prefix', id, name: r?.displayName || id }); } for (const id of this.unlockedSuffixes) { const r = SUFFIX_REGISTRY[id]; c.push({ type: 'suffix', id, name: r?.displayName || id }); } return c; }
  addGold(amount: number): void { this.gold += amount; } spendGold(amount: number): boolean { if (this.gold < amount) return false; this.gold -= amount; return true; }
  heal(amount: number): void { this.currentHp = Math.min(this.maxHp, this.currentHp + amount); }
  rest(): number { const ha = Math.floor(this.maxHp * REST_HEAL_PERCENT); const before = this.currentHp; this.heal(ha); return this.currentHp - before; }
  takeDamage(amount: number): void { this.currentHp = Math.max(0, this.currentHp - amount); } isDead(): boolean { return this.currentHp <= 0; }
  upgradeMaxHp(amount: number): void { this.maxHp += amount; this.currentHp += amount; } upgradeMaxMana(amount: number): void { this.maxMana += amount; }
  defeatSin(sinId: SinId): void { this.defeatedSins.add(sinId); }
  getAvailableSins(): SinId[] { const all = Object.values(SinId); return all.filter(s => !this.defeatedSins.has(s)); }
}
