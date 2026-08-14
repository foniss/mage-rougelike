// src/systems/SpellValidator.ts
//
// ═══════════════════════════════════════════════════════════════════════════
//  SPELL VALIDATOR
//
//  Single source of truth for all spell compatibility checks.
//  The SpellBuilder delegates to this before assembling a spell.
//  The Grimoire UI can query this for live feedback.
//
//  To add a new restriction:
//    1. Add data to spellComponents.ts (compatibleForms, etc.)
//    2. Or add a rule to CORE_FORM_RESTRICTIONS
//    3. This validator picks it up automatically.
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
  getCore,
  getForm,
  getPrefix,
  getSuffix,
  CORE_FORM_RESTRICTIONS,
} from '../config/spellComponents';

// ── Validation Result ─────────────────────────────────────────────────────

export interface ValidationError {
  field: 'core' | 'form' | 'prefix' | 'suffix' | 'combination';
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  core: CoreComponent | null;
  form: FormComponent | null;
  prefix: PrefixComponent | null;
  suffix: SuffixComponent | null;
}

// ── Validator ─────────────────────────────────────────────────────────────

export class SpellValidator {

  /**
   * Full validation of a spell combination.
   * Returns detailed errors for each problem found.
   */
  static validate(
    coreId: CoreId | null,
    formId: FormId | null,
    prefixId?: PrefixId | null,
    suffixId?: SuffixId | null,
  ): ValidationResult {
    const errors: ValidationError[] = [];
    let core: CoreComponent | null = null;
    let form: FormComponent | null = null;
    let prefix: PrefixComponent | null = null;
    let suffix: SuffixComponent | null = null;

    // ── 1. Core exists ──────────────────────────────────────────────────
    if (!coreId) {
      errors.push({
        field: 'core',
        message: 'Missing Core.',
        suggestion: 'Add a Core element (e.g. FIRE, ICE, WIND, STORM, COSMIC).',
      });
    } else {
      core = getCore(coreId);
      if (!core) {
        errors.push({
          field: 'core',
          message: `Unknown Core: "${coreId}".`,
          suggestion: 'Valid Cores: FIRE, ICE, WIND, STORM, COSMIC.',
        });
      }
    }

    // ── 2. Form exists ──────────────────────────────────────────────────
    if (!formId) {
      errors.push({
        field: 'form',
        message: 'Missing Form.',
        suggestion: 'Add a Form (e.g. BLADE, BEAM, ORB, MINE, NOVA).',
      });
    } else {
      form = getForm(formId);
      if (!form) {
        errors.push({
          field: 'form',
          message: `Unknown Form: "${formId}".`,
          suggestion: 'Valid Forms: BLADE, BEAM, ORB, MINE, NOVA.',
        });
      }
    }

    // ── 3. Prefix exists ────────────────────────────────────────────────
    if (prefixId) {
      prefix = getPrefix(prefixId);
      if (!prefix) {
        errors.push({
          field: 'prefix',
          message: `Unknown Prefix: "${prefixId}".`,
          suggestion: 'Valid Prefixes: HOMING, SPLITTING, GREATER, EXPANDING, RETURNING, PIERCING.',
        });
      }
    }

    // ── 4. Suffix exists ────────────────────────────────────────────────
    if (suffixId) {
      suffix = getSuffix(suffixId);
      if (!suffix) {
        errors.push({
          field: 'suffix',
          message: `Unknown Suffix: "${suffixId}".`,
          suggestion: 'Valid Suffixes: OF DEVOURING, OF BINDING, OF REAPING, OF DETONATION, OF ECHOES.',
        });
      }
    }

    // Stop here if core components don't exist — can't check compatibility
    if (!core || !form) {
      return { valid: false, errors, core, form, prefix, suffix };
    }

    // ── 5. Prefix ↔ Form compatibility ──────────────────────────────────
    if (prefix && form) {
      const prefixFormError = SpellValidator.checkPrefixFormCompat(prefix, form);
      if (prefixFormError) {
        errors.push(prefixFormError);
      }
    }

    // ── 6. Suffix ↔ Form compatibility ──────────────────────────────────
    if (suffix && form) {
      const suffixFormError = SpellValidator.checkSuffixFormCompat(suffix, form);
      if (suffixFormError) {
        errors.push(suffixFormError);
      }
    }

    // ── 7. Prefix ↔ Form (from Form's side) ────────────────────────────
    if (prefix && form) {
      const formPrefixError = SpellValidator.checkFormAcceptsPrefix(form, prefix);
      if (formPrefixError) {
        errors.push(formPrefixError);
      }
    }

    // ── 8. Suffix ↔ Form (from Form's side) ────────────────────────────
    if (suffix && form) {
      const formSuffixError = SpellValidator.checkFormAcceptsSuffix(form, suffix);
      if (formSuffixError) {
        errors.push(formSuffixError);
      }
    }

    // ── 9. Core ↔ Form restrictions ─────────────────────────────────────
    if (core && form) {
      const coreFormError = SpellValidator.checkCoreFormCompat(core, form);
      if (coreFormError) {
        errors.push(coreFormError);
      }
    }

    // ── 10. Prefix ↔ Core restrictions (future-proof) ───────────────────
    if (prefix && core) {
      const prefixCoreError = SpellValidator.checkPrefixCoreCompat(prefix, core);
      if (prefixCoreError) {
        errors.push(prefixCoreError);
      }
    }

    // ── 11. Suffix ↔ Core restrictions (future-proof) ───────────────────
    if (suffix && core) {
      const suffixCoreError = SpellValidator.checkSuffixCoreCompat(suffix, core);
      if (suffixCoreError) {
        errors.push(suffixCoreError);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      core,
      form,
      prefix,
      suffix,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  INDIVIDUAL CHECKS
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Check: does the Prefix allow this Form?
   * (Reads from prefix.compatibleForms)
   */
  private static checkPrefixFormCompat(
    prefix: PrefixComponent,
    form: FormComponent,
  ): ValidationError | null {
    if (prefix.compatibleForms === 'all') return null;

    const compatible = prefix.compatibleForms as FormId[];
    if (compatible.includes(form.id)) return null;

    const compatibleNames = compatible
      .map(id => getForm(id)?.displayName || id)
      .join(', ');

    return {
      field: 'prefix',
      message: `${prefix.displayName} cannot be used with ${form.displayName}.`,
      suggestion: `${prefix.displayName} works with: ${compatibleNames}.`,
    };
  }

  /**
   * Check: does the Suffix allow this Form?
   * (Reads from suffix.compatibleForms)
   */
  private static checkSuffixFormCompat(
    suffix: SuffixComponent,
    form: FormComponent,
  ): ValidationError | null {
    if (suffix.compatibleForms === 'all') return null;

    const compatible = suffix.compatibleForms as FormId[];
    if (compatible.includes(form.id)) return null;

    const compatibleNames = compatible
      .map(id => getForm(id)?.displayName || id)
      .join(', ');

    return {
      field: 'suffix',
      message: `${suffix.displayName} cannot be used with ${form.displayName}.`,
      suggestion: `${suffix.displayName} works with: ${compatibleNames}.`,
    };
  }

  /**
   * Check: does the Form accept this Prefix?
   * (Reads from form.compatiblePrefixes)
   */
  private static checkFormAcceptsPrefix(
    form: FormComponent,
    prefix: PrefixComponent,
  ): ValidationError | null {
    if (form.compatiblePrefixes === 'all') return null;

    const accepted = form.compatiblePrefixes as PrefixId[];
    if (accepted.includes(prefix.id)) return null;

    const acceptedNames = accepted
      .map(id => getPrefix(id)?.displayName || id)
      .join(', ');

    return {
      field: 'combination',
      message: `${form.displayName} does not support the prefix ${prefix.displayName}.`,
      suggestion: `${form.displayName} accepts: ${acceptedNames || 'no prefixes'}.`,
    };
  }

  /**
   * Check: does the Form accept this Suffix?
   * (Reads from form.compatibleSuffixes)
   */
  private static checkFormAcceptsSuffix(
    form: FormComponent,
    suffix: SuffixComponent,
  ): ValidationError | null {
    if (form.compatibleSuffixes === 'all') return null;

    const accepted = form.compatibleSuffixes as SuffixId[];
    if (accepted.includes(suffix.id)) return null;

    const acceptedNames = accepted
      .map(id => getSuffix(id)?.displayName || id)
      .join(', ');

    return {
      field: 'combination',
      message: `${form.displayName} does not support the suffix ${suffix.displayName}.`,
      suggestion: `${form.displayName} accepts: ${acceptedNames || 'no suffixes'}.`,
    };
  }

  /**
   * Check: Core ↔ Form restriction table.
   * (Reads from CORE_FORM_RESTRICTIONS in spellComponents.ts)
   */
  private static checkCoreFormCompat(
    core: CoreComponent,
    form: FormComponent,
  ): ValidationError | null {
    const restriction = CORE_FORM_RESTRICTIONS.find(
      r => r.coreId === core.id && r.formId === form.id,
    );

    if (!restriction) return null; // No restriction = allowed

    return {
      field: 'combination',
      message: restriction.reason,
      suggestion: restriction.suggestion,
    };
  }

  /**
   * Check: Prefix ↔ Core restrictions (future use).
   * Reads from prefix.compatibleCores if it exists.
   */
  private static checkPrefixCoreCompat(
    prefix: PrefixComponent,
    core: CoreComponent,
  ): ValidationError | null {
    if (!prefix.compatibleCores || prefix.compatibleCores === 'all') return null;

    const compatible = prefix.compatibleCores as CoreId[];
    if (compatible.includes(core.id)) return null;

    const compatibleNames = compatible
      .map(id => getCore(id)?.displayName || id)
      .join(', ');

    return {
      field: 'prefix',
      message: `${prefix.displayName} cannot be used with ${core.displayName}.`,
      suggestion: `${prefix.displayName} works with: ${compatibleNames}.`,
    };
  }

  /**
   * Check: Suffix ↔ Core restrictions (future use).
   * Reads from suffix.compatibleCores if it exists.
   */
  private static checkSuffixCoreCompat(
    suffix: SuffixComponent,
    core: CoreComponent,
  ): ValidationError | null {
    if (!suffix.compatibleCores || suffix.compatibleCores === 'all') return null;

    const compatible = suffix.compatibleCores as CoreId[];
    if (compatible.includes(core.id)) return null;

    const compatibleNames = compatible
      .map(id => getCore(id)?.displayName || id)
      .join(', ');

    return {
      field: 'suffix',
      message: `${suffix.displayName} cannot be used with ${core.displayName}.`,
      suggestion: `${suffix.displayName} works with: ${compatibleNames}.`,
    };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  QUERY HELPERS — for the Grimoire UI to show valid options
  // ═════════════════════════════════════════════════════════════════════════

  /**
   * Get all prefixes compatible with a given form.
   */
  static getCompatiblePrefixes(formId: FormId): PrefixComponent[] {
    const form = getForm(formId);
    if (!form) return [];

    const { getAllPrefixIds, PREFIX_REGISTRY } = require('../config/spellComponents');
    const allPrefixes: PrefixId[] = getAllPrefixIds();

    return allPrefixes
      .map((id: PrefixId) => getPrefix(id)!)
      .filter((prefix: PrefixComponent) => {
        // Check prefix side
        if (prefix.compatibleForms !== 'all') {
          if (!(prefix.compatibleForms as FormId[]).includes(formId)) return false;
        }
        // Check form side
        if (form.compatiblePrefixes !== 'all') {
          if (!(form.compatiblePrefixes as PrefixId[]).includes(prefix.id)) return false;
        }
        return true;
      });
  }

  /**
   * Get all suffixes compatible with a given form.
   */
  static getCompatibleSuffixes(formId: FormId): SuffixComponent[] {
    const form = getForm(formId);
    if (!form) return [];

    const { getAllSuffixIds, SUFFIX_REGISTRY } = require('../config/spellComponents');
    const allSuffixes: SuffixId[] = getAllSuffixIds();

    return allSuffixes
      .map((id: SuffixId) => getSuffix(id)!)
      .filter((suffix: SuffixComponent) => {
        if (suffix.compatibleForms !== 'all') {
          if (!(suffix.compatibleForms as FormId[]).includes(formId)) return false;
        }
        if (form.compatibleSuffixes !== 'all') {
          if (!(form.compatibleSuffixes as SuffixId[]).includes(suffix.id)) return false;
        }
        return true;
      });
  }

  /**
   * Get all forms compatible with a given prefix.
   */
  static getFormsForPrefix(prefixId: PrefixId): FormComponent[] {
    const prefix = getPrefix(prefixId);
    if (!prefix) return [];

    const { getAllFormIds } = require('../config/spellComponents');
    const allForms: FormId[] = getAllFormIds();

    return allForms
      .map((id: FormId) => getForm(id)!)
      .filter((form: FormComponent) => {
        if (prefix.compatibleForms !== 'all') {
          if (!(prefix.compatibleForms as FormId[]).includes(form.id)) return false;
        }
        if (form.compatiblePrefixes !== 'all') {
          if (!(form.compatiblePrefixes as PrefixId[]).includes(prefixId)) return false;
        }
        return true;
      });
  }

  /**
   * Quick check: is this full combination valid? Returns true/false.
   */
  static isValid(
    coreId: CoreId | null,
    formId: FormId | null,
    prefixId?: PrefixId | null,
    suffixId?: SuffixId | null,
  ): boolean {
    if (!coreId || !formId) return false;
    return SpellValidator.validate(coreId, formId, prefixId, suffixId).valid;
  }

  /**
   * Get the first error message, or empty string if valid.
   */
  static getFirstError(
    coreId: CoreId | null,
    formId: FormId | null,
    prefixId?: PrefixId | null,
    suffixId?: SuffixId | null,
  ): string {
    const result = SpellValidator.validate(coreId, formId, prefixId, suffixId);
    if (result.valid) return '';
    return result.errors[0]?.message || 'Invalid spell.';
  }
}