// src/systems/dungeon/PlayerProgression.ts

import {
  CoreId, FormId, PrefixId, SuffixId,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
} from '../../config/spellComponents';
import { SinId, MANA_PER_NEW_COMPONENT, STARTING_GOLD, REST_HEAL_PERCENT } from '../../config/dungeonConfig';
import { BALANCE } from '../../config/balance';

export interface SinRelic {
  sinId: SinId;
  name: string;
  description: string;
}

export class PlayerProgression {
  public unlockedCores: Set<CoreId> = new Set();
  public unlockedForms: Set<FormId> = new Set();
  public unlockedPrefixes: Set<PrefixId> = new Set();
  public unlockedSuffixes: Set<SuffixId> = new Set();
  public sinRelics: SinRelic[] = [];

  public gold: number = STARTING_GOLD;

  public maxHp: number = BALANCE.player.maxHp;
  public currentHp: number = BALANCE.player.maxHp;
  public maxMana: number = BALANCE.player.maxMana;

  public defeatedSins: Set<SinId> = new Set();

  constructor() {
    this.initStartingComponents();
  }

  private initStartingComponents(): void {
    const allCores = getAllCoreIds();
    const allForms = getAllFormIds();
    const startCore = allCores[Math.floor(Math.random() * allCores.length)];
    const startForm = allForms[Math.floor(Math.random() * allForms.length)];
    this.unlockedCores.add(startCore);
    this.unlockedForms.add(startForm);
  }

  // ── Component Acquisition (with +25 Mana for Core/Form) ────────────────

  /** Returns true if the component was NEW (not a duplicate). */
  addCore(id: CoreId): boolean {
    if (this.unlockedCores.has(id)) return false;
    this.unlockedCores.add(id);
    this.maxMana += MANA_PER_NEW_COMPONENT;
    return true;
  }

  addForm(id: FormId): boolean {
    if (this.unlockedForms.has(id)) return false;
    this.unlockedForms.add(id);
    this.maxMana += MANA_PER_NEW_COMPONENT;
    return true;
  }

  addPrefix(id: PrefixId): boolean {
    if (this.unlockedPrefixes.has(id)) return false;
    this.unlockedPrefixes.add(id);
    return true;
  }

  addSuffix(id: SuffixId): boolean {
    if (this.unlockedSuffixes.has(id)) return false;
    this.unlockedSuffixes.add(id);
    return true;
  }

  addSinRelic(relic: SinRelic): void {
    this.sinRelics.push(relic);
  }

  // ── Component Removal (for Sacrifice) ──────────────────────────────────

  removeCore(id: CoreId): boolean {
    if (this.unlockedCores.size <= 1) return false;
    return this.unlockedCores.delete(id);
  }

  removeForm(id: FormId): boolean {
    if (this.unlockedForms.size <= 1) return false;
    return this.unlockedForms.delete(id);
  }

  removePrefix(id: PrefixId): boolean {
    return this.unlockedPrefixes.delete(id);
  }

  removeSuffix(id: SuffixId): boolean {
    return this.unlockedSuffixes.delete(id);
  }

  // ── Ownership Queries ──────────────────────────────────────────────────

  getAvailableCoreIds(): CoreId[] { return [...this.unlockedCores]; }
  getAvailableFormIds(): FormId[] { return [...this.unlockedForms]; }
  getAvailablePrefixIds(): PrefixId[] { return [...this.unlockedPrefixes]; }
  getAvailableSuffixIds(): SuffixId[] { return [...this.unlockedSuffixes]; }

  hasCore(id: CoreId): boolean { return this.unlockedCores.has(id); }
  hasForm(id: FormId): boolean { return this.unlockedForms.has(id); }
  hasPrefix(id: PrefixId): boolean { return this.unlockedPrefixes.has(id); }
  hasSuffix(id: SuffixId): boolean { return this.unlockedSuffixes.has(id); }

  // ── Unowned Queries (for reward generation) ────────────────────────────

  getUnownedCores(): CoreId[] {
    return getAllCoreIds().filter(id => !this.unlockedCores.has(id));
  }

  getUnownedForms(): FormId[] {
    return getAllFormIds().filter(id => !this.unlockedForms.has(id));
  }

  getUnownedPrefixes(): PrefixId[] {
    return getAllPrefixIds().filter(id => !this.unlockedPrefixes.has(id));
  }

  getUnownedSuffixes(): SuffixId[] {
    return getAllSuffixIds().filter(id => !this.unlockedSuffixes.has(id));
  }

  /** Returns true if there are any unowned cores OR forms */
  hasUnownedCoreOrForm(): boolean {
    return this.getUnownedCores().length > 0 || this.getUnownedForms().length > 0;
  }

  /** Returns true if there are any unowned prefixes OR suffixes */
  hasUnownedPrefixOrSuffix(): boolean {
    return this.getUnownedPrefixes().length > 0 || this.getUnownedSuffixes().length > 0;
  }

  // ── Count Queries (for balance ratios) ─────────────────────────────────

  getCoreCount(): number { return this.unlockedCores.size; }
  getFormCount(): number { return this.unlockedForms.size; }
  getPrefixCount(): number { return this.unlockedPrefixes.size; }
  getSuffixCount(): number { return this.unlockedSuffixes.size; }

  // ── Sacrifice Candidates ───────────────────────────────────────────────

  getSacrificeCandidates(): { type: 'core' | 'form' | 'prefix' | 'suffix'; id: string; name: string }[] {
    const candidates: { type: 'core' | 'form' | 'prefix' | 'suffix'; id: string; name: string }[] = [];
    if (this.unlockedCores.size > 1) {
      for (const id of this.unlockedCores) {
        const reg = CORE_REGISTRY[id];
        candidates.push({ type: 'core', id, name: reg?.displayName || id });
      }
    }
    if (this.unlockedForms.size > 1) {
      for (const id of this.unlockedForms) {
        const reg = FORM_REGISTRY[id];
        candidates.push({ type: 'form', id, name: reg?.displayName || id });
      }
    }
    for (const id of this.unlockedPrefixes) {
      const reg = PREFIX_REGISTRY[id];
      candidates.push({ type: 'prefix', id, name: reg?.displayName || id });
    }
    for (const id of this.unlockedSuffixes) {
      const reg = SUFFIX_REGISTRY[id];
      candidates.push({ type: 'suffix', id, name: reg?.displayName || id });
    }
    return candidates;
  }

  // ── Gold ────────────────────────────────────────────────────────────────

  addGold(amount: number): void { this.gold += amount; }
  spendGold(amount: number): boolean {
    if (this.gold < amount) return false;
    this.gold -= amount;
    return true;
  }

  // ── Health ──────────────────────────────────────────────────────────────

  heal(amount: number): void {
    this.currentHp = Math.min(this.maxHp, this.currentHp + amount);
  }

  rest(): number {
    const healAmount = Math.floor(this.maxHp * REST_HEAL_PERCENT);
    const before = this.currentHp;
    this.heal(healAmount);
    return this.currentHp - before;
  }

  takeDamage(amount: number): void {
    this.currentHp = Math.max(0, this.currentHp - amount);
  }

  isDead(): boolean { return this.currentHp <= 0; }

  // ── Stat Upgrades ──────────────────────────────────────────────────────

  upgradeMaxHp(amount: number): void {
    this.maxHp += amount;
    this.currentHp += amount;
  }

  upgradeMaxMana(amount: number): void {
    this.maxMana += amount;
  }

  // ── Sin tracking ───────────────────────────────────────────────────────

  defeatSin(sinId: SinId): void {
    this.defeatedSins.add(sinId);
  }

  getAvailableSins(): SinId[] {
    const all = Object.values(SinId);
    return all.filter(s => !this.defeatedSins.has(s));
  }
}