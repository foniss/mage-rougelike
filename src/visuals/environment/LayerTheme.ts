// src/visuals/environment/LayerTheme.ts
//
// Layer-based environmental color progression.
// Each layer has a distinct visual atmosphere that gets darker/more corrupted.

import { RoomType, SinId, SIN_DEFINITIONS } from '../../config/dungeonConfig';

export interface LayerColors {
  /** Deep floor base color */
  floorBase: number;
  /** Floor tile line color */
  floorLine: number;
  floorLineAlpha: number;
  /** Wall color */
  wallBase: number;
  wallHighlight: number;
  /** Rune/magic accent color */
  runeColor: number;
  runeAlpha: number;
  /** Ambient particle color */
  ambientColor: number;
  ambientAltColor: number;
  /** Vignette/fog intensity 0-1 */
  fogIntensity: number;
  /** Edge glow color */
  edgeGlow: number;
  edgeGlowAlpha: number;
}

// ── Layer palettes ──────────────────────────────────────────────────────

const LAYER_THEMES: LayerColors[] = [
  // Layer 1: Ancient Arcana — deep purple/blue, clean magical ruins
  {
    floorBase: 0x0f0d1a, floorLine: 0x1a1833, floorLineAlpha: 0.18,
    wallBase: 0x12102a, wallHighlight: 0x1a1540,
    runeColor: 0x6a5a9a, runeAlpha: 0.08,
    ambientColor: 0x6666aa, ambientAltColor: 0x8866cc,
    fogIntensity: 0.15, edgeGlow: 0x4a3a7a, edgeGlowAlpha: 0.06,
  },
  // Layer 2: Corruption — darker, crimson influence
  {
    floorBase: 0x0d0a12, floorLine: 0x1a1425, floorLineAlpha: 0.15,
    wallBase: 0x140d1a, wallHighlight: 0x1f1228,
    runeColor: 0x9c4a5a, runeAlpha: 0.10,
    ambientColor: 0x884466, ambientAltColor: 0xaa4455,
    fogIntensity: 0.22, edgeGlow: 0x6a2a3a, edgeGlowAlpha: 0.08,
  },
  // Layer 3: Abyss — cosmic void, deep blacks, star particles
  {
    floorBase: 0x08060e, floorLine: 0x141028, floorLineAlpha: 0.12,
    wallBase: 0x0a0818, wallHighlight: 0x140e28,
    runeColor: 0x7744aa, runeAlpha: 0.12,
    ambientColor: 0x9966dd, ambientAltColor: 0xcc88ff,
    fogIntensity: 0.28, edgeGlow: 0x5522aa, edgeGlowAlpha: 0.10,
  },
  // Layer 4: Final Convergence — occult + cosmic + corruption
  {
    floorBase: 0x060408, floorLine: 0x120a1a, floorLineAlpha: 0.10,
    wallBase: 0x0a0610, wallHighlight: 0x160c20,
    runeColor: 0xaa4466, runeAlpha: 0.14,
    ambientColor: 0xdd66aa, ambientAltColor: 0xff4466,
    fogIntensity: 0.35, edgeGlow: 0x881144, edgeGlowAlpha: 0.12,
  },
];

export function getLayerTheme(layerIndex: number): LayerColors {
  return LAYER_THEMES[Math.min(layerIndex, LAYER_THEMES.length - 1)];
}

// ── Room-type accent overrides ──────────────────────────────────────────

export interface RoomAccent {
  accentColor: number;
  accentAlpha: number;
  extraRuneColor?: number;
  atmosphereIntensity: number; // multiplier on ambient particles
}

export function getRoomAccent(roomType: RoomType, sinId?: SinId | null): RoomAccent {
  switch (roomType) {
    case RoomType.ELITE:
      return { accentColor: 0xff6633, accentAlpha: 0.06, atmosphereIntensity: 1.5, extraRuneColor: 0xcc4422 };
    case RoomType.SIN_BOSS:
      const sinColor = sinId ? SIN_DEFINITIONS[sinId].color : 0xff4444;
      return { accentColor: sinColor, accentAlpha: 0.08, atmosphereIntensity: 2.0, extraRuneColor: sinColor };
    case RoomType.DEVIL:
      return { accentColor: 0xff0000, accentAlpha: 0.10, atmosphereIntensity: 2.5, extraRuneColor: 0xcc0000 };
    case RoomType.SHOP_REST:
      return { accentColor: 0x44aa66, accentAlpha: 0.04, atmosphereIntensity: 0.6 };
    case RoomType.SHRINE:
      return { accentColor: 0xaa88ff, accentAlpha: 0.06, atmosphereIntensity: 0.8, extraRuneColor: 0x8866dd };
    case RoomType.SACRIFICE:
      return { accentColor: 0xcc3344, accentAlpha: 0.07, atmosphereIntensity: 1.3, extraRuneColor: 0xaa2233 };
    case RoomType.VAULT:
      return { accentColor: 0xccaa44, accentAlpha: 0.05, atmosphereIntensity: 0.7, extraRuneColor: 0xaa8833 };
    default:
      return { accentColor: 0x6a5a9a, accentAlpha: 0.04, atmosphereIntensity: 1.0 };
  }
}
