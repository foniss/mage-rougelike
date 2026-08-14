// src/systems/GrimoireSystem.ts

import { SpellDefinition } from '../config/spells';
import { parseSpellInput, getCoreNames, getFormNames } from '../config/spellFactory';

export interface PrepareResult {
  success: boolean;
  message: string;
  spell: SpellDefinition | null;
}

export class GrimoireSystem {
  private preparedSpell: SpellDefinition | null = null;

  constructor() {
    this.preparedSpell = null;
  }

  /**
   * Attempt to prepare a spell from raw text input.
   * Uses the Core+Form parser.
   */
  attemptPrepare(input: string): PrepareResult {
    const result = parseSpellInput(input);

    if (!result.success) {
      return {
        success: false,
        message: result.error,
        spell: null,
      };
    }

    this.preparedSpell = result.spell;

    return {
      success: true,
      message: 'Spell Prepared',
      spell: result.spell,
    };
  }

  getPreparedSpell(): SpellDefinition | null {
    return this.preparedSpell;
  }

  clearPreparedSpell(): void {
    this.preparedSpell = null;
  }

  getAvailableCores(): string[] {
    return getCoreNames();
  }

  getAvailableForms(): string[] {
    return getFormNames();
  }
}