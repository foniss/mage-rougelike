// src/systems/SpellBuilder.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  SPELL BUILDER
//
//  1. Receives component IDs (prefix, core, form, suffix).
//  2. Validates compatibility.
//  3. Calculates final mana cost, cooldown, damage.
//  4. Produces a runtime Spell object.
// ═══════════════════════════════════════════════════════════════════════════

import {
  CoreId,
  FormId,
  PrefixId,
  SuffixId,
  CoreComponent,
  FormComponent,
  PrefixComponent,
  SuffixComponent,
  StatusEffectConfig,
  VisualConfig,
  TargetingType,
  getCore,
  getForm,
  getPrefix,
  getSuffix,
  identifyWord,
} from '../config/spellComponents';

// ── Runtime Spell Object ──────────────────────────────────────────────────

export interface Spell {
  // Display
  name: string;
  displayName: string;

  // Component references (not copies)
  core: CoreComponent;
  form: FormComponent;
  prefix: PrefixComponent | null;
  suffix: SuffixComponent | null;

  // Computed values
  damage: number;
  manaCost: number;
  cooldown: number;
  statusEffect: StatusEffectConfig;
  targetingType: TargetingType;

  // Computed visuals (core visual with possible overrides)
  visual: VisualConfig;
}

// ── Build Result ──────────────────────────────────────────────────────────

export interface BuildResult {
  success: boolean;
  spell: Spell | null;
  error: string;
}

// ── Parse Result ──────────────────────────────────────────────────────────

export interface ParseResult {
  success: boolean;
  spell: Spell | null;
  error: string;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDER
// ═══════════════════════════════════════════════════════════════════════════

export class SpellBuilder {

  /**
   * Build a spell from explicit component IDs.
   */
  static build(
    coreId: CoreId,
    formId: FormId,
    prefixId?: PrefixId | null,
    suffixId?: SuffixId | null
  ): BuildResult {

    const core = getCore(coreId);
    const form = getForm(formId);

    if (!core) {
      return { success: false, spell: null, error: `Unknown Core: "${coreId}"` };
    }
    if (!form) {
      return { success: false, spell: null, error: `Unknown Form: "${formId}"` };
    }

    let prefix: PrefixComponent | null = null;
    let suffix: SuffixComponent | null = null;

    // ── Validate Prefix ─────────────────────────────────────────────────
    if (prefixId) {
      prefix = getPrefix(prefixId);
      if (!prefix) {
        return { success: false, spell: null, error: `Unknown Prefix: "${prefixId}"` };
      }

      // Check prefix compatibility with form
      if (prefix.compatibleForms !== 'all') {
        if (!prefix.compatibleForms.includes(formId)) {
          return {
            success: false,
            spell: null,
            error: `${prefix.displayName} cannot be used with ${form.displayName}.`,
          };
        }
      }

      // Check form accepts this prefix
      if (form.compatiblePrefixes !== 'all') {
        if (!form.compatiblePrefixes.includes(prefixId)) {
          return {
            success: false,
            spell: null,
            error: `${form.displayName} does not support prefix ${prefix.displayName}.`,
          };
        }
      }
    }

    // ── Validate Suffix ─────────────────────────────────────────────────
    if (suffixId) {
      suffix = getSuffix(suffixId);
      if (!suffix) {
        return { success: false, spell: null, error: `Unknown Suffix: "${suffixId}"` };
      }

      // Check suffix compatibility with form
      if (suffix.compatibleForms !== 'all') {
        if (!suffix.compatibleForms.includes(formId)) {
          return {
            success: false,
            spell: null,
            error: `${suffix.displayName} cannot be used with ${form.displayName}.`,
          };
        }
      }

      // Check form accepts this suffix
      if (form.compatibleSuffixes !== 'all') {
        if (!form.compatibleSuffixes.includes(suffixId)) {
          return {
            success: false,
            spell: null,
            error: `${form.displayName} does not support suffix ${suffix.displayName}.`,
          };
        }
      }
    }

    // ── Calculate Computed Values ────────────────────────────────────────

    const spell = SpellBuilder.assemble(core, form, prefix, suffix);
    return { success: true, spell, error: '' };
  }

  /**
   * Parse a raw text input and build a spell.
   * Accepts formats like:
   *   "FIRE BOLT"
   *   "GREATER FIRE BOLT"
   *   "FIRE BOLT SEEKING"
   *   "GREATER FIRE BOLT SEEKING"
   */
  static parseAndBuild(raw: string): ParseResult {
    const cleaned = raw.toUpperCase().trim();

    if (cleaned === '') {
      return { success: false, spell: null, error: 'Enter a spell name.' };
    }

    const words = cleaned.split(/\s+/);

    if (words.length < 2 || words.length > 4) {
      if (words.length === 1) {
        const identified = identifyWord(words[0]);
        if (identified) {
          switch (identified.type) {
            case 'core':
              return { success: false, spell: null, error: 'Missing Form. (e.g. BOLT, NOVA, BEAM)' };
            case 'form':
              return { success: false, spell: null, error: 'Missing Core. (e.g. FIRE, ICE, LIGHTNING)' };
            case 'prefix':
              return { success: false, spell: null, error: 'Missing Core and Form.' };
            case 'suffix':
              return { success: false, spell: null, error: 'Missing Core and Form.' };
          }
        }
        return { success: false, spell: null, error: 'Unknown Spell.' };
      }
      if (words.length > 4) {
        return { success: false, spell: null, error: 'Too many words. Max: PREFIX CORE FORM SUFFIX' };
      }
    }

    // Identify each word
    const identified = words.map(w => ({ word: w, match: identifyWord(w) }));

    // Check for unknown words
    for (const item of identified) {
      if (!item.match) {
        return { success: false, spell: null, error: `Unknown word: "${item.word}"` };
      }
    }

    // Categorize
    const cores    = identified.filter(i => i.match!.type === 'core');
    const forms    = identified.filter(i => i.match!.type === 'form');
    const prefixes = identified.filter(i => i.match!.type === 'prefix');
    const suffixes = identified.filter(i => i.match!.type === 'suffix');

    // Validate counts
    if (cores.length === 0) {
      return { success: false, spell: null, error: 'Missing Core. (e.g. FIRE, ICE, LIGHTNING)' };
    }
    if (cores.length > 1) {
      return { success: false, spell: null, error: 'Only one Core allowed.' };
    }
    if (forms.length === 0) {
      return { success: false, spell: null, error: 'Missing Form. (e.g. BOLT, NOVA, BEAM)' };
    }
    if (forms.length > 1) {
      return { success: false, spell: null, error: 'Only one Form allowed.' };
    }
    if (prefixes.length > 1) {
      return { success: false, spell: null, error: 'Only one Prefix allowed.' };
    }
    if (suffixes.length > 1) {
      return { success: false, spell: null, error: 'Only one Suffix allowed.' };
    }

    const coreId   = cores[0].match!.id as CoreId;
    const formId   = forms[0].match!.id as FormId;
    const prefixId = prefixes.length > 0 ? prefixes[0].match!.id as PrefixId : null;
    const suffixId = suffixes.length > 0 ? suffixes[0].match!.id as SuffixId : null;

    return SpellBuilder.build(coreId, formId, prefixId, suffixId);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  ASSEMBLY — computes final values from components
  // ═════════════════════════════════════════════════════════════════════════

  private static assemble(
    core: CoreComponent,
    form: FormComponent,
    prefix: PrefixComponent | null,
    suffix: SuffixComponent | null
  ): Spell {

    // ── Name ──────────────────────────────────────────────────────────
    const nameParts: string[] = [];
    if (prefix) nameParts.push(prefix.displayName);
    nameParts.push(core.displayName);
    nameParts.push(form.displayName);
    if (suffix) nameParts.push(suffix.displayName);
    const name = nameParts.join(' ');

    // ── Damage ────────────────────────────────────────────────────────
    let damage = core.baseDamage;
    damage *= form.damageMultiplier;
    if (prefix) {
      damage *= prefix.damageMultiplier;
      // Apply flat extra damage from behavior if applicable
      if (prefix.behavior.type === 'greater') {
        damage += prefix.behavior.extraDamageFlat;
      }
    }
    if (suffix) {
      damage *= suffix.damageMultiplier;
    }
    damage = Math.round(damage);

    // ── Mana Cost ─────────────────────────────────────────────────────
    let manaCost = core.manaCost + form.manaCost;
    if (prefix) manaCost += prefix.manaCost;
    if (suffix) manaCost += suffix.manaCost;

    // ── Cooldown ──────────────────────────────────────────────────────
    let cooldown = form.cooldown;
    if (prefix) cooldown *= prefix.cooldownMultiplier;
    if (suffix) cooldown *= suffix.cooldownMultiplier;
    cooldown = Math.round(cooldown);

    // ── Visuals ───────────────────────────────────────────────────────
    const visual: VisualConfig = { ...core.visual };
    // Prefix/suffix can override specific visual properties
    if (prefix?.visual) {
      if (prefix.visual.color !== undefined) visual.color = prefix.visual.color;
      if (prefix.visual.glowColor !== undefined) visual.glowColor = prefix.visual.glowColor;
      if (prefix.visual.trailColor !== undefined) visual.trailColor = prefix.visual.trailColor;
    }
    if (suffix?.visual) {
      if (suffix.visual.color !== undefined) visual.color = suffix.visual.color;
      if (suffix.visual.glowColor !== undefined) visual.glowColor = suffix.visual.glowColor;
      if (suffix.visual.trailColor !== undefined) visual.trailColor = suffix.visual.trailColor;
    }

    // ── Status Effect ─────────────────────────────────────────────────
    // Deep copy so modifications don't affect the registry
    const statusEffect: StatusEffectConfig = JSON.parse(
      JSON.stringify(core.statusEffect)
    );

    return {
      name,
      displayName: name,
      core,
      form,
      prefix,
      suffix,
      damage,
      manaCost,
      cooldown,
      statusEffect,
      targetingType: form.targetingType,
      visual,
    };
  }
}