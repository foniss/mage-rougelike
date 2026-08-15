// src/systems/dungeon/PlayerProgression.ts
//
// Single source of truth for what the player has during a run.

import {
  CoreId, FormId, PrefixId, SuffixId,
  getAllCoreIds, getAllFormIds,
} from '../../config/spellComponents';
import { SinId, MANA_PER_NEW_COMPONENT, STARTING_GOLD, REST_HEAL_PERCENT } from '../../config/dungeonConfig';
import { BALANCE } from '../../config/balance';

export interface SinRelic {
  sinId: SinId;
  name: string;
  description: string;
}

export class PlayerProgression {
  // Components the player has unlocked THIS run
  public unlockedCores: Set<CoreId> = new Set();
  public unlockedForms: Set<FormId> = new Set();
  public unlockedPrefixes: Set<PrefixId> = new Set();
  public unlockedSuffixes: Set<SuffixId> = new Set();
  public sinRelics: SinRelic[] = [];

  // Resources
  public gold: number = STARTING_GOLD;

  // Stats (can be upgraded during run)
  public maxHp: number = BALANCE.player.maxHp;
  public currentHp: number = BALANCE.player.maxHp;
  public maxMana: number = BALANCE.player.maxMana;

  // Defeated sins (removed from pool)
  public defeatedSins: Set<SinId> = new Set();

  constructor() {
    this.initStartingComponents();
  }

  private initStartingComponents(): void {
    // Start with 1 random core and 1 random form
    const allCores = getAllCoreIds();
    const allForms = getAllFormIds();
    const startCore = allCores[Math.floor(Math.random() * allCores.length)];
    const startForm = allForms[Math.floor(Math.random() * allForms.length)];
    this.unlockedCores.add(startCore);
    this.unlockedForms.add(startForm);
  }

  // ── Component Acquisition ──────────────────────────────────────────────

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
    if (this.unlockedCores.size <= 1) return false; // Can't remove last
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

  // ── Queries ────────────────────────────────────────────────────────────

  getAvailableCoreIds(): CoreId[] { return [...this.unlockedCores]; }
  getAvailableFormIds(): FormId[] { return [...this.unlockedForms]; }
  getAvailablePrefixIds(): PrefixId[] { return [...this.unlockedPrefixes]; }
  getAvailableSuffixIds(): SuffixId[] { return [...this.unlockedSuffixes]; }

  hasCore(id: CoreId): boolean { return this.unlockedCores.has(id); }
  hasForm(id: FormId): boolean { return this.unlockedForms.has(id); }
  hasPrefix(id: PrefixId): boolean { return this.unlockedPrefixes.has(id); }
  hasSuffix(id: SuffixId): boolean { return this.unlockedSuffixes.has(id); }

  /** Get all removable components for sacrifice */
  getSacrificeCandidates(): { type: string; id: string; name: string }[] {
    const candidates: { type: string; id: string; name: string }[] = [];
    if (this.unlockedCores.size > 1) {
      for (const id of this.unlockedCores) candidates.push({ type: 'core', id, name: id });
    }
    if (this.unlockedForms.size > 1) {
      for (const id of this.unlockedForms) candidates.push({ type: 'form', id, name: id });
    }
    for (const id of this.unlockedPrefixes) candidates.push({ type: 'prefix', id, name: id });
    for (const id of this.unlockedSuffixes) candidates.push({ type: 'suffix', id, name: id });
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