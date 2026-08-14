// src/config/forms.ts

export enum FormType {
  BOLT = 'BOLT',
  NOVA = 'NOVA',
  BEAM = 'BEAM',
}

export interface FormDefinition {
  type: FormType;
  displayName: string;
  manaCostMultiplier: number;  // multiplied with base to get final mana cost
  baseManaCost: number;        // added flat mana cost
  description: string;
}

export const FORMS: Record<FormType, FormDefinition> = {
  [FormType.BOLT]: {
    type: FormType.BOLT,
    displayName: 'Bolt',
    manaCostMultiplier: 1.0,
    baseManaCost: 8,
    description: 'Projectile toward target.',
  },
  [FormType.NOVA]: {
    type: FormType.NOVA,
    displayName: 'Nova',
    manaCostMultiplier: 1.0,
    baseManaCost: 14,
    description: 'AoE burst around target.',
  },
  [FormType.BEAM]: {
    type: FormType.BEAM,
    displayName: 'Beam',
    manaCostMultiplier: 1.0,
    baseManaCost: 11,
    description: 'Instant line attack.',
  },
};

export function getForm(type: FormType): FormDefinition {
  return FORMS[type];
}

export function isValidForm(name: string): boolean {
  return name.toUpperCase() in FormType;
}

export function parseFormType(name: string): FormType | null {
  const upper = name.toUpperCase();
  if (upper in FormType) {
    return upper as FormType;
  }
  return null;
}

export function getAllFormTypes(): FormType[] {
  return [FormType.BOLT, FormType.NOVA, FormType.BEAM];
}