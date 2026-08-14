// src/config/spellFactory.ts

import { CoreType, parseCoreType, getAllCoreTypes } from './cores';
import { FormType, parseFormType, getAllFormTypes } from './forms';
import { SpellDefinition, buildSpell } from './spells';

export interface ParseResult {
  success: boolean;
  spell: SpellDefinition | null;
  error: string;
}

/**
 * Parse a raw text input into a Core + Form spell.
 *
 * Valid:   "FIRE BOLT", "ice nova", "Lightning Beam"
 * Invalid: "FIRE", "BOLT", "FIRE BOLT ICE", "FIRE LASER"
 */
export function parseSpellInput(raw: string): ParseResult {
  const cleaned = raw.toUpperCase().trim();

  if (cleaned === '') {
    return { success: false, spell: null, error: 'Enter a spell name.' };
  }

  // Split into words
  const words = cleaned.split(/\s+/);

  if (words.length < 2) {
    // Check what the single word is
    if (parseCoreType(words[0])) {
      return { success: false, spell: null, error: 'Missing Form. (e.g. BOLT, NOVA, BEAM)' };
    }
    if (parseFormType(words[0])) {
      return { success: false, spell: null, error: 'Missing Core. (e.g. FIRE, ICE, LIGHTNING)' };
    }
    return { success: false, spell: null, error: 'Unknown Spell.' };
  }

  if (words.length > 2) {
    // Check for multiple cores or forms
    const foundCores = words.filter(w => parseCoreType(w) !== null);
    const foundForms = words.filter(w => parseFormType(w) !== null);

    if (foundCores.length > 1) {
      return { success: false, spell: null, error: 'Too many Cores. Use only one.' };
    }
    if (foundForms.length > 1) {
      return { success: false, spell: null, error: 'Too many Forms. Use only one.' };
    }
    return { success: false, spell: null, error: 'Unknown Spell. Use: CORE + FORM' };
  }

  // Exactly 2 words — try CORE FORM order
  const coreType = parseCoreType(words[0]);
  const formType = parseFormType(words[1]);

  if (!coreType && !formType) {
    return { success: false, spell: null, error: 'Unknown Spell.' };
  }

  if (!coreType) {
    // First word isn't a core — maybe they put form first?
    const altCore = parseCoreType(words[1]);
    const altForm = parseFormType(words[0]);

    if (altCore && altForm) {
      // They wrote "BOLT FIRE" instead of "FIRE BOLT"
      const spell = buildSpell(altCore, altForm);
      return { success: true, spell, error: '' };
    }

    if (parseFormType(words[0])) {
      return { success: false, spell: null, error: `Unknown Core: "${words[1]}"` };
    }
    return { success: false, spell: null, error: `Unknown Core: "${words[0]}"` };
  }

  if (!formType) {
    return { success: false, spell: null, error: `Unknown Form: "${words[1]}"` };
  }

  // Both valid — build the spell
  const spell = buildSpell(coreType, formType);
  return { success: true, spell, error: '' };
}

/**
 * Get user-friendly list of all valid cores.
 */
export function getCoreNames(): string[] {
  return getAllCoreTypes().map(c => c.toString());
}

/**
 * Get user-friendly list of all valid forms.
 */
export function getFormNames(): string[] {
  return getAllFormTypes().map(f => f.toString());
}