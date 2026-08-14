// src/systems/GrimoireSystem.ts

import { Spell, SpellBuilder } from './SpellBuilder';
import {
  getAllCoreIds, getAllFormIds, getAllPrefixIds, getAllSuffixIds,
  CORE_REGISTRY, FORM_REGISTRY, PREFIX_REGISTRY, SUFFIX_REGISTRY,
  CoreComponent, FormComponent, PrefixComponent, SuffixComponent,
} from '../config/spellComponents';

export interface PrepareResult {
  success: boolean;
  message: string;
  spell: Spell | null;
}

export class GrimoireSystem {
  private preparedSpell: Spell | null = null;

  attemptPrepare(input: string): PrepareResult {
    const result = SpellBuilder.parseAndBuild(input);
    if (!result.success) {
      return { success: false, message: result.error, spell: null };
    }
    this.preparedSpell = result.spell;
    return { success: true, message: 'Spell Prepared', spell: result.spell };
  }

  getPreparedSpell(): Spell | null { return this.preparedSpell; }
  clearPreparedSpell(): void { this.preparedSpell = null; }
  getCores(): CoreComponent[] { return getAllCoreIds().map(id => CORE_REGISTRY[id]); }
  getForms(): FormComponent[] { return getAllFormIds().map(id => FORM_REGISTRY[id]); }
  getPrefixes(): PrefixComponent[] { return getAllPrefixIds().map(id => PREFIX_REGISTRY[id]); }
  getSuffixes(): SuffixComponent[] { return getAllSuffixIds().map(id => SUFFIX_REGISTRY[id]); }
}