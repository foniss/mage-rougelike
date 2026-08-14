// src/systems/SpellBuilder.ts

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
  identifySuffix,
  SUFFIX_REGISTRY,
} from '../config/spellComponents';

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
}

export type ParseResult = BuildResult;

// ═══════════════════════════════════════════════════════════════════════════

export class SpellBuilder {

  static build(
    coreId: CoreId,
    formId: FormId,
    prefixId?: PrefixId | null,
    suffixId?: SuffixId | null
  ): BuildResult {
    const core = getCore(coreId);
    const form = getForm(formId);
    if (!core) return { success: false, spell: null, error: `Unknown Core: "${coreId}"` };
    if (!form) return { success: false, spell: null, error: `Unknown Form: "${formId}"` };

    let prefix: PrefixComponent | null = null;
    let suffix: SuffixComponent | null = null;

    if (prefixId) {
      prefix = getPrefix(prefixId);
      if (!prefix) return { success: false, spell: null, error: `Unknown Prefix: "${prefixId}"` };
      if (prefix.compatibleForms !== 'all' && !prefix.compatibleForms.includes(formId)) {
        return { success: false, spell: null, error: `${prefix.displayName} can't be used with ${form.displayName}.` };
      }
      if (form.compatiblePrefixes !== 'all' && !form.compatiblePrefixes.includes(prefixId)) {
        return { success: false, spell: null, error: `${form.displayName} doesn't support ${prefix.displayName}.` };
      }
    }

    if (suffixId) {
      suffix = getSuffix(suffixId);
      if (!suffix) return { success: false, spell: null, error: `Unknown Suffix: "${suffixId}"` };
      if (suffix.compatibleForms !== 'all' && !suffix.compatibleForms.includes(formId)) {
        return { success: false, spell: null, error: `${suffix.displayName} can't be used with ${form.displayName}.` };
      }
      if (form.compatibleSuffixes !== 'all' && !form.compatibleSuffixes.includes(suffixId)) {
        return { success: false, spell: null, error: `${form.displayName} doesn't support ${suffix.displayName}.` };
      }
    }

    return { success: true, spell: SpellBuilder.assemble(core, form, prefix, suffix), error: '' };
  }

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

    // Check last 2 words for suffix
    if (remainingWords.length >= 2) {
      const last2 = remainingWords.slice(-2).join(' ');
      const suffixMatch = identifySuffix(last2);
      if (suffixMatch) {
        suffixId = suffixMatch.id as SuffixId;
        remainingWords = remainingWords.slice(0, -2);
      }
    }

    // Check last 1 word for suffix if no 2-word suffix found
    if (!suffixId && remainingWords.length >= 1) {
      const last1 = remainingWords[remainingWords.length - 1];
      const suffixMatch = identifySuffix(last1);
      if (suffixMatch) {
        suffixId = suffixMatch.id as SuffixId;
        remainingWords = remainingWords.slice(0, -1);
      }
    }

    if (remainingWords.length < 2) {
      if (remainingWords.length === 1) {
        const m = identifyWord(remainingWords[0]);
        if (m?.type === 'core') return { success: false, spell: null, error: 'Missing Form.' };
        if (m?.type === 'form') return { success: false, spell: null, error: 'Missing Core.' };
        if (m?.type === 'prefix') return { success: false, spell: null, error: 'Missing Core and Form.' };
      }
      if (remainingWords.length === 0 && suffixId) {
        return { success: false, spell: null, error: 'Missing Core and Form.' };
      }
      return { success: false, spell: null, error: 'Need at least Core + Form.' };
    }

    if (remainingWords.length > 3) {
      return { success: false, spell: null, error: 'Too many words before suffix.' };
    }

    // Identify remaining words
    const identified = remainingWords.map(w => ({ word: w, match: identifyWord(w) }));

    for (const item of identified) {
      if (!item.match) {
        return { success: false, spell: null, error: `Unknown word: "${item.word}"` };
      }
    }

    const cores = identified.filter(i => i.match!.type === 'core');
    const forms = identified.filter(i => i.match!.type === 'form');
    const prefixes = identified.filter(i => i.match!.type === 'prefix');

    if (cores.length === 0) return { success: false, spell: null, error: 'Missing Core.' };
    if (cores.length > 1) return { success: false, spell: null, error: 'Only one Core allowed.' };
    if (forms.length === 0) return { success: false, spell: null, error: 'Missing Form.' };
    if (forms.length > 1) return { success: false, spell: null, error: 'Only one Form allowed.' };
    if (prefixes.length > 1) return { success: false, spell: null, error: 'Only one Prefix allowed.' };

    const coreId = cores[0].match!.id as CoreId;
    const formId = forms[0].match!.id as FormId;
    const prefixId = prefixes.length > 0 ? prefixes[0].match!.id as PrefixId : null;

    return SpellBuilder.build(coreId, formId, prefixId, suffixId);
  }

  private static assemble(
    core: CoreComponent,
    form: FormComponent,
    prefix: PrefixComponent | null,
    suffix: SuffixComponent | null
  ): Spell {
    const nameParts: string[] = [];
    if (prefix) nameParts.push(prefix.displayName);
    nameParts.push(core.displayName);
    nameParts.push(form.displayName);
    if (suffix) nameParts.push(suffix.displayName);
    const name = nameParts.join(' ');

    let damage = core.baseDamage;
    damage *= form.damageMultiplier;
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

    const statusEffect: StatusEffectConfig = JSON.parse(JSON.stringify(core.statusEffect));

    return {
      name, displayName: name, core, form, prefix, suffix,
      damage, manaCost, cooldown, statusEffect,
      targetingType: form.targetingType, visual,
    };
  }
}