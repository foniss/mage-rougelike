// src/config/spells.ts

import { CoreType, CoreDefinition, getCore, CoreEffect } from './cores';
import { FormType, FormDefinition, getForm } from './forms';

export interface SpellDefinition {
  core: CoreType;
  form: FormType;
  name: string;           // e.g. "Fire Bolt"
  displayName: string;    // same as name for now
  damage: number;
  manaCost: number;
  color: number;
  glowColor: number;
  trailColor: number;
  effect: CoreEffect;
  coreData: CoreDefinition;
  formData: FormDefinition;
}

/**
 * Build a spell from a Core + Form combination.
 * This is the single source of truth for spell stats.
 */
export function buildSpell(coreType: CoreType, formType: FormType): SpellDefinition {
  const core = getCore(coreType);
  const form = getForm(formType);

  const name = `${core.displayName} ${form.displayName}`;
  const damage = Math.round(core.baseDamage * form.manaCostMultiplier);
  const manaCost = form.baseManaCost;

  return {
    core: coreType,
    form: formType,
    name,
    displayName: name,
    damage,
    manaCost,
    color: core.color,
    glowColor: core.glowColor,
    trailColor: core.trailColor,
    effect: { ...core.effect },
    coreData: core,
    formData: form,
  };
}

/**
 * Get all possible spell combinations.
 */
export function getAllSpells(): SpellDefinition[] {
  const spells: SpellDefinition[] = [];
  const cores = [CoreType.FIRE, CoreType.ICE, CoreType.LIGHTNING];
  const forms = [FormType.BOLT, FormType.NOVA, FormType.BEAM];

  for (const core of cores) {
    for (const form of forms) {
      spells.push(buildSpell(core, form));
    }
  }

  return spells;
}