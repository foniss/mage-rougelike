// src/systems/SpellBuilder.ts

import {
  CoreId, FormId, PrefixId, SuffixId,
  CoreComponent, FormComponent, PrefixComponent, SuffixComponent,
  StatusEffectConfig, VisualConfig, TargetingType,
  getCore, getForm, getPrefix, getSuffix,
  identifyWord, identifySuffix,
} from '../config/spellComponents';
import { SpellValidator } from './SpellValidator';

// ── Runtime Spell Object ──────────────────────────────────────────────────

export interface Spell {
  name: string;
  displayName: string;
  core: CoreComponent;
  form: FormComponent;
  prefix: PrefixComponent | null;
  suffix: SuffixComponent | null;
  damage: number;
  manaCost: number;
  cooldown: number;
  statusEffect: StatusEffectConfig;
  targetingType: TargetingType;
  visual: VisualConfig;
  isEcho?: boolean;
}

export interface BuildResult {
  success: boolean;
  spell: Spell | null;
  error: string;
  suggestion?: string;
}

export type ParseResult = BuildResult;

// ═══════════════════════════════════════════════════════════════════════════

export class SpellBuilder {

  /**
   * Build a spell from explicit component IDs.
   * Delegates validation to SpellValidator.
   */
  static build(
    coreId: CoreId,
    formId: FormId,
    prefixId?: PrefixId | null,
    suffixId?: SuffixId | null,
  ): BuildResult {
    // Validate using the dedicated validator
    const validation = SpellValidator.validate(coreId, formId, prefixId, suffixId);

    if (!validation.valid) {
      const firstError = validation.errors[0];
      return {
        success: false,
        spell: null,
        error: firstError.message,
        suggestion: firstError.suggestion,
      };
    }

    // Assemble the spell
    const spell = SpellBuilder.assemble(
      validation.core!,
      validation.form!,
      validation.prefix,
      validation.suffix,
    );

    return { success: true, spell, error: '' };
  }

  /**
   * Parse raw text input and build a spell.
   */
  static parseAndBuild(raw: string): ParseResult {
    const cleaned = raw.toUpperCase().trim();
    if (cleaned === '') return { success: false, spell: null, error: 'Enter a spell name.' };

    const words = cleaned.split(/\s+/);
    if (words.length > 6) {
      return { success: false, spell: null, error: 'Too many words.' };
    }

    // Try to find suffix (can be 2 words like "OF DEVOURING")
    let suffixId: SuffixId | null = null;
    let remainingWords = [...words];

    if (remainingWords.length >= 2) {
      const last2 = remainingWords.slice(-2).join(' ');
      const match = identifySuffix(last2);
      if (match) { suffixId = match.id as SuffixId; remainingWords = remainingWords.slice(0, -2); }
    }
    if (!suffixId && remainingWords.length >= 1) {
      const last1 = remainingWords[remainingWords.length - 1];
      const match = identifySuffix(last1);
      if (match) { suffixId = match.id as SuffixId; remainingWords = remainingWords.slice(0, -1); }
    }

    if (remainingWords.length < 2) {
      if (remainingWords.length === 1) {
        const m = identifyWord(remainingWords[0]);
        if (m?.type === 'core') return { success: false, spell: null, error: 'Missing Form.', suggestion: 'Add a Form (BLADE, BEAM, ORB, MINE, NOVA).' };
        if (m?.type === 'form') return { success: false, spell: null, error: 'Missing Core.', suggestion: 'Add a Core (FIRE, ICE, WIND, STORM, COSMIC).' };
        if (m?.type === 'prefix') return { success: false, spell: null, error: 'Missing Core and Form.' };
      }
      if (remainingWords.length === 0 && suffixId) return { success: false, spell: null, error: 'Missing Core and Form.' };
      return { success: false, spell: null, error: 'Need at least Core + Form.' };
    }

    if (remainingWords.length > 3) {
      return { success: false, spell: null, error: 'Too many words before suffix.' };
    }

    const identified = remainingWords.map(w => ({ word: w, match: identifyWord(w) }));
    for (const item of identified) {
      if (!item.match) return { success: false, spell: null, error: `Unknown word: "${item.word}".` };
    }

    const cores = identified.filter(i => i.match!.type === 'core');
    const forms = identified.filter(i => i.match!.type === 'form');
    const prefixes = identified.filter(i => i.match!.type === 'prefix');

    if (cores.length === 0) return { success: false, spell: null, error: 'Missing Core.', suggestion: 'Add a Core (FIRE, ICE, WIND, STORM, COSMIC).' };
    if (cores.length > 1) return { success: false, spell: null, error: 'Only one Core allowed.' };
    if (forms.length === 0) return { success: false, spell: null, error: 'Missing Form.', suggestion: 'Add a Form (BLADE, BEAM, ORB, MINE, NOVA).' };
    if (forms.length > 1) return { success: false, spell: null, error: 'Only one Form allowed.' };
    if (prefixes.length > 1) return { success: false, spell: null, error: 'Only one Prefix allowed.' };

    return SpellBuilder.build(
      cores[0].match!.id as CoreId,
      forms[0].match!.id as FormId,
      prefixes.length > 0 ? prefixes[0].match!.id as PrefixId : null,
      suffixId,
    );
  }

  // ═════════════════════════════════════════════════════════════════════════

  private static assemble(
    core: CoreComponent,
    form: FormComponent,
    prefix: PrefixComponent | null,
    suffix: SuffixComponent | null,
  ): Spell {
    const nameParts: string[] = [];
    if (prefix) nameParts.push(prefix.displayName);
    nameParts.push(core.displayName);
    nameParts.push(form.displayName);
    if (suffix) nameParts.push(suffix.displayName);
    const name = nameParts.join(' ');

    let damage = core.baseDamage * form.damageMultiplier;
    if (prefix) {
      damage *= prefix.damageMultiplier;
      if (prefix.behavior.type === 'greater') damage += prefix.behavior.extraDamageFlat;
    }
    if (suffix) damage *= suffix.damageMultiplier;
    damage = Math.round(damage);

    let manaCost = core.manaCost + form.manaCost;
    if (prefix) manaCost += prefix.manaCost;
    if (suffix) manaCost += suffix.manaCost;

    let cooldown = form.cooldown;
    if (prefix) cooldown *= prefix.cooldownMultiplier;
    if (suffix) cooldown *= suffix.cooldownMultiplier;
    cooldown = Math.round(cooldown);

    const visual: VisualConfig = { ...core.visual };
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

    return {
      name, displayName: name, core, form, prefix, suffix,
      damage, manaCost, cooldown,
      statusEffect: JSON.parse(JSON.stringify(core.statusEffect)),
      targetingType: form.targetingType, visual,
    };
  }
}