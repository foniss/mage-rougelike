// src/systems/GrimoireSystem.ts

import { Spell, SpellBuilder } from './SpellBuilder';
import {
  CoreId, FormId, PrefixId, SuffixId,
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
  CoreComponent, FormComponent, PrefixComponent, SuffixComponent,
} from '../config/spellComponents';
import { SPELL_SLOT_COUNT, SPELL_HISTORY_MAX } from '../config/constants';

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

  constructor() {
    for (let i = 0; i < SPELL_SLOT_COUNT; i++) {
      this.slots.push({ spell: null, label: `Slot ${i + 1}` });
    }
  }

  /** Build and assign a spell to a slot. Returns the built spell or null. */
  assignToSlot(
    slotIndex: number,
    coreId: CoreId,
    formId: FormId,
    prefixId: PrefixId | null,
    suffixId: SuffixId | null,
  ): Spell | null {
    const result = SpellBuilder.build(coreId, formId, prefixId, suffixId);
    if (!result.success || !result.spell) return null;

    this.slots[slotIndex] = { spell: result.spell, label: result.spell.name };
    this.addToHistory(result.spell, prefixId, coreId, formId, suffixId);
    return result.spell;
  }

  /** Get the active spell slot's spell. */
  getActiveSpell(): Spell | null {
    return this.slots[this.activeSlotIndex]?.spell ?? null;
  }

  /** Set active slot by index. */
  setActiveSlot(index: number): void {
    if (index >= 0 && index < this.slots.length) {
      this.activeSlotIndex = index;
    }
  }

  /** Add to spell history. */
  private addToHistory(
    spell: Spell,
    prefixId: PrefixId | null,
    coreId: CoreId,
    formId: FormId,
    suffixId: SuffixId | null,
  ): void {
    // Don't add duplicates at the top
    if (this.history.length > 0 && this.history[0].spell.name === spell.name) return;

    this.history.unshift({ spell, prefixId, coreId, formId, suffixId });
    if (this.history.length > SPELL_HISTORY_MAX) {
      this.history.pop();
    }
  }

  getCores(): CoreComponent[] { return getAllCoreIds().map(id => CORE_REGISTRY[id]); }
  getForms(): FormComponent[] { return getAllFormIds().map(id => FORM_REGISTRY[id]); }
  getPrefixes(): PrefixComponent[] { return getAllPrefixIds().map(id => PREFIX_REGISTRY[id]); }
  getSuffixes(): SuffixComponent[] { return getAllSuffixIds().map(id => SUFFIX_REGISTRY[id]); }
}