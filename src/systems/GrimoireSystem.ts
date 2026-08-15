// src/systems/GrimoireSystem.ts

import { Spell, SpellBuilder } from './SpellBuilder';
import {
  CoreId, FormId, PrefixId, SuffixId,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
  CoreComponent, FormComponent, PrefixComponent, SuffixComponent,
} from '../config/spellComponents';
import { SPELL_SLOT_COUNT, SPELL_HISTORY_MAX } from '../config/constants';
import { PlayerProgression } from './dungeon/PlayerProgression';

export interface SpellSlot {
  spell: Spell | null;
  label: string;
}

export interface HistoryEntry {
  spell: Spell;
  prefixId: PrefixId | null;
  coreId: CoreId;
  formId: FormId;
  suffixId: SuffixId | null;
}

export class GrimoireSystem {
  public slots: SpellSlot[] = [];
  public activeSlotIndex: number = 0;
  public history: HistoryEntry[] = [];

  /** When set, component availability is filtered by progression */
  public progression: PlayerProgression | null = null;

  constructor() {
    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      this.slots.push({ spell: null, label: `Slot ${i + 1}` });
    }
  }

  setProgression(prog: PlayerProgression): void {
    this.progression = prog;
  }

  assignToSlot(
    slotIndex: number, coreId: CoreId, formId: FormId,
    prefixId: PrefixId | null, suffixId: SuffixId | null,
  ): Spell | null {
    const result = SpellBuilder.build(coreId, formId, prefixId, suffixId);
    if (!result.success || !result.spell) return null;
    this.slots[slotIndex] = { spell: result.spell, label: result.spell.name };
    this.addToHistory(result.spell, prefixId, coreId, formId, suffixId);
    return result.spell;
  }

  getActiveSpell(): Spell | null {
    return this.slots[this.activeSlotIndex]?.spell ?? null;
  }

  setActiveSlot(index: number): void {
    if (index >= 0 && index < this.slots.length) this.activeSlotIndex = index;
  }

  private addToHistory(
    spell: Spell, prefixId: PrefixId | null, coreId: CoreId, formId: FormId, suffixId: SuffixId | null,
  ): void {
    if (this.history.length > 0 && this.history[0].spell.name === spell.name) return;
    this.history.unshift({ spell, prefixId, coreId, formId, suffixId });
    if (this.history.length > SPELL_HISTORY_MAX) this.history.pop();
  }

  // ── Component Availability ──────────────────────────────────────────────
  // GrimoireScene calls these. When progression exists, filter by unlocked.

  getAvailableCoreIds(): CoreId[] {
    if (this.progression) return this.progression.getAvailableCoreIds();
    return getAllCoreIds();
  }

  getAvailableFormIds(): FormId[] {
    if (this.progression) return this.progression.getAvailableFormIds();
    return getAllFormIds();
  }

  getAvailablePrefixIds(): PrefixId[] {
    if (this.progression) return this.progression.getAvailablePrefixIds();
    return getAllPrefixIds();
  }

  getAvailableSuffixIds(): SuffixId[] {
    if (this.progression) return this.progression.getAvailableSuffixIds();
    return getAllSuffixIds();
  }

  getCores(): CoreComponent[] { return this.getAvailableCoreIds().map(id => CORE_REGISTRY[id]); }
  getForms(): FormComponent[] { return this.getAvailableFormIds().map(id => FORM_REGISTRY[id]); }
  getPrefixes(): PrefixComponent[] { return this.getAvailablePrefixIds().map(id => PREFIX_REGISTRY[id]); }
  getSuffixes(): SuffixComponent[] { return this.getAvailableSuffixIds().map(id => SUFFIX_REGISTRY[id]); }
}